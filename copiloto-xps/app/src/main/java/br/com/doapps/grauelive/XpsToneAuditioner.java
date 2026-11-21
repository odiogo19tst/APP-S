package br.com.doapps.grauelive;

import android.os.Handler;
import android.os.Looper;
import java.io.File;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import org.json.JSONObject;

/**
 * A reversible, temporary .XPS audition for the XPS-10, NEVER a USER WRITE or
 * SVD restore. Requires real model-3A SysEx readback of ALL nine source
 * addresses before sending ANY DT1 bytes, then verifies every applied block.
 *
 * WARNING: with hardware disconnected in the middle of a DT1 write the
 * software cannot guarantee rollback. The previous USER banks are untouched.
 */
public final class XpsToneAuditioner {
    public interface Port {
        boolean send(byte[] packet);
        boolean connected();
        int deviceId();
        void status(JSONObject status);
    }

    private enum Phase { IDLE, SNAPSHOT, APPLY, VERIFY, READY, RESTORE, RESTORE_VERIFY }
    private static final String[] ADDRESS = {
        "1F-00-00-00","1F-00-02-00","1F-00-04-00",
        "1F-00-06-00","1F-00-10-00","1F-00-20-00",
        "1F-00-22-00","1F-00-24-00","1F-00-26-00"
    };
    private static final int[] FULL = {80,145,84,83,41,154,154,154,154};
    private static final int[] MIN = {80,125,84,83,41,128,128,128,128};
    private static final String[] PART = {
        "Common","MFX","Chorus","Reverb","TMT",
        "Tone 1","Tone 2","Tone 3","Tone 4"
    };
    private static final int READ_TIMEOUT_MS = 2600, WRITE_PACE_MS = 110;
    private final Port port;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final List<Block> blocks=new ArrayList<>();
    private Phase phase=Phase.IDLE;
    private String name="",sha="";
    private int connectedDevice=-1,index,token;
    private int[] waiting;
    private boolean[] received;
    private boolean wroteAny=false;

    static final class Block {
        final int address;
        final String label;
        final int[] source;
        final int fullLength;
        int[] before;
        int[] desired;
        Block(int addr,String label,int[] data,int full){
            address=addr;this.label=label;source=data;fullLength=full;
        }
    }

    public XpsToneAuditioner(Port port){this.port=port;}

    /**
     * Strictly allowlist addresses; variants with missing/incompatible blocks
     * cannot be sent. Original Base64/JSON is kept in the immutable library.
     */
    public static List<Block> parse(File source) throws Exception {
        if(source==null||!source.isFile()||
           source.length()<=0||source.length()>XpsJsonToneInspector.MAX_JSON_BYTES)
            throw new IllegalArgumentException("Arquivo .XPS inacessível ou excedeu 64 KB");
        byte[] bytes=Files.readAllBytes(source.toPath());
        JSONObject inspected=XpsJsonToneInspector.inspect(bytes,bytes.length);
        if(!inspected.optBoolean("recognized"))
            throw new IllegalArgumentException("Não é um timbre .XPS reconhecido");
        String json=new String(bytes,java.nio.charset.StandardCharsets.UTF_8);
        JSONObject raw=new JSONObject(json);
        if(raw.length()!=9)throw new IllegalArgumentException("A prévia exige os nove blocos Roland");
        ArrayList<Block> result=new ArrayList<>();
        for(int i=0;i<ADDRESS.length;i++){
            String key=ADDRESS[i];
            String encoded=raw.optString(key,null);
            if(encoded==null)
                throw new IllegalArgumentException("Bloco obrigatório ausente: "+key);
            byte[] data=Base64.getDecoder().decode(encoded);
            int size=data.length-1;
            if(size<MIN[i]||size>FULL[i])
                throw new IllegalArgumentException("Tamanho do bloco "+PART[i]+": "+size+
                    " (necessário "+MIN[i]+" a "+FULL[i]+")");
            int[] value=new int[size];
            int checksum=0;
            String[] addressParts=key.split("-");
            for(String part:addressParts)checksum+=Integer.parseInt(part,16);
            for(int j=0;j<size;j++){
                int v=data[j]&255;
                if(v>127)throw new IllegalArgumentException("Byte MIDI inválido em "+key);
                value[j]=v;checksum+=v;
            }
            checksum+=(data[size]&255);
            if((checksum&127)!=0)
                throw new IllegalArgumentException("Checksum Roland inválido em "+key);
            int addr=XpsProtocol.address(
                Integer.parseInt(addressParts[0],16),Integer.parseInt(addressParts[1],16),
                Integer.parseInt(addressParts[2],16),Integer.parseInt(addressParts[3],16));
            result.add(new Block(addr,PART[i],value,FULL[i]));
        }
        return result;
    }

    private void publish(String stage,String message) {
        try {
            port.status(new JSONObject().put("stage",stage).put("message",message)
                .put("sha256",sha).put("patchName",name)
                .put("processed",Math.min(index,9)).put("total",9)
                .put("deviceId",connectedDevice)
                .put("temporaryOnly",true).put("userWritten",false)
                .put("performanceWritten",false).put("backupModified",false));
        }catch(Exception ignored){}
    }

    public boolean busy(){
        return phase!=Phase.IDLE&&phase!=Phase.READY;
    }

    public boolean ready(){return phase==Phase.READY;}

    public void start(String sha,String patchName,List<Block> source) {
        if(phase!=Phase.IDLE){
            publish("blocked",phase==Phase.READY
                ?"Há outro timbre carregado. Restaure a prévia anterior antes de trocar."
                :"Uma operação MIDI já está em andamento.");
            return;
        }
        if(!port.connected()){publish("blocked","Conecte o XPS-10 via USB-MIDI.");return;}
        if(source==null||source.size()!=9){publish("blocked","Arquivo XPS incompleto.");return;}
        blocks.clear();blocks.addAll(source);
        this.sha=sha;name=patchName;
        connectedDevice=port.deviceId();
        token++;phase=Phase.SNAPSHOT;index=0;wroteAny=false;
        publish("checking","Lendo os nove blocos originais do Roland para permitir recuperação.");
        requestBlock();
    }

    private boolean sameDevice(){
        return connectedDevice>=0&&port.connected()&&port.deviceId()==connectedDevice;
    }

    private void requestBlock(){
        if(!sameDevice()){disconnect();return;}
        if(index>=blocks.size()){finishReads();return;}
        Block b=blocks.get(index);
        waiting=new int[b.fullLength];Arrays.fill(waiting,-1);
        received=new boolean[b.fullLength];
        final int expectedToken=++token,expectedIndex=index;
        if(!port.send(XpsProtocol.packet(0x11,b.address,XpsProtocol.digits(b.fullLength)))){
            fail("A porta USB não enviou RQ1 para "+b.label);return;
        }
        handler.postDelayed(()->{
            if(token!=expectedToken||index!=expectedIndex||waiting==null)return;
            fail("O teclado não confirmou a leitura completa de "+b.label+
                " (endereço "+ADDRESS[expectedIndex]+").");
        },READ_TIMEOUT_MS);
    }

    /** Accept only a valid model 0x3A / Device 0x10 / checksum Roland DT1. */
    public void accept(byte[] packet){
        if(phase!=Phase.SNAPSHOT&&phase!=Phase.VERIFY&&phase!=Phase.RESTORE_VERIFY)return;
        if(!sameDevice())return;
        XpsProtocol.Data receivedData=XpsProtocol.decode(packet);
        if(receivedData==null||index<0||index>=blocks.size())return;
        Block b=blocks.get(index);
        long start=receivedData.start&0xffffffffL,offset=start-(b.address&0xffffffffL);
        if(offset<0||offset>=b.fullLength)return;
        int n=Math.min(receivedData.values.length,b.fullLength-(int)offset);
        if(n<=0)return;
        for(int j=0;j<n;j++){
            waiting[(int)offset+j]=receivedData.values[j];
            received[(int)offset+j]=true;
        }
        for(boolean bit:received)if(!bit)return;
        token++; // invalidates outstanding per-section timeout
        int[] complete=Arrays.copyOf(waiting,waiting.length);
        waiting=null;received=null;
        if(phase==Phase.SNAPSHOT){
            b.before=complete;
            b.desired=Arrays.copyOf(complete,complete.length);
            System.arraycopy(b.source,0,b.desired,0,b.source.length);
        }else if(phase==Phase.VERIFY){
            if(!Arrays.equals(complete,b.desired)){
                fail("O XPS-10 retornou parâmetros diferentes para "+b.label);
                return;
            }
        }else if(phase==Phase.RESTORE_VERIFY&&!Arrays.equals(complete,b.before)){
            publish("rollback-warning","A recuperação não foi confirmada em "+b.label+
                ". Não salve o estado atual do teclado; restaure seu backup original se necessário.");
            reset();return;
        }
        index++;requestBlock();
    }

    private void finishReads(){
        if(phase==Phase.SNAPSHOT){
            phase=Phase.APPLY;index=0;
            publish("transferring","Todos os blocos foram lidos do teclado. Enviando o timbre somente à memória temporária.");
            writeNext();
        }else if(phase==Phase.VERIFY){
            phase=Phase.READY;index=9;
            publish("playing","Timbre temporário confirmado por SysEx. Experimente tocar no XPS-10. Para manter o som, salve PATCH USER e depois PERFORMANCE no painel do Roland.");
        }else if(phase==Phase.RESTORE_VERIFY){
            publish("restored","Timbre original recuperado e confirmado pelo Roland. Nenhum banco USER alterado.");
            reset();
        }
    }

    private void writeNext(){
        if(!sameDevice()){disconnect();return;}
        if(index>=blocks.size()){
            phase=phase==Phase.RESTORE?Phase.RESTORE_VERIFY:Phase.VERIFY;
            index=0;publish(phase==Phase.VERIFY?"verifying":"restoring",
                "Conferindo os dados recebidos no XPS-10.");
            handler.postDelayed(this::requestBlock,WRITE_PACE_MS*2);
            return;
        }
        Block b=blocks.get(index);
        if(b.before==null||b.before.length!=b.fullLength){
            fail("O estado original do instrumento está incompleto.");return;
        }
        int[] payload=phase==Phase.RESTORE?b.before:b.desired;
        if(payload==null||payload.length!=b.fullLength){
            fail("Payload do "+b.label+" incompleto");return;
        }
        if(!port.send(XpsProtocol.packet(0x12,b.address,payload))){
            fail("Não foi possível transmitir "+b.label+" pelo USB.");return;
        }
        wroteAny=true;index++;
        final int sentToken=token;
        handler.postDelayed(()->{if(sentToken==token)writeNext();},WRITE_PACE_MS);
    }

    public void restore(){
        if(phase==Phase.IDLE){publish("idle","Nenhuma prévia MIDI carregada.");return;}
        if(phase==Phase.RESTORE||phase==Phase.RESTORE_VERIFY){
            publish("restoring","Recuperação já iniciada.");return;
        }
        token++;
        if(!wroteAny){
            publish("restored","Nenhum dado foi enviado ao teclado. Estado preservado.");
            reset();return;
        }
        if(!sameDevice()){disconnect();return;}
        phase=Phase.RESTORE;index=0;
        publish("restoring","Restaurando os nove blocos temporários originais.");
        writeNext();
    }

    private void fail(String detail){
        if(wroteAny&&sameDevice()&&phase!=Phase.RESTORE&&phase!=Phase.RESTORE_VERIFY){
            publish("rollback-warning",detail+" Recuperação automática iniciada.");
            restore();
        }else{
            publish("blocked",detail+(wroteAny?
                " Confira o teclado antes de salvar qualquer Performance.":" Nenhum dado foi gravado no teclado."));
            reset();
        }
    }

    public void disconnect(){
        if(phase!=Phase.IDLE)
            publish("disconnected",wroteAny
                ?"USB desconectado durante/após a prévia. Não é possível confirmar a recuperação; não salve a Performance sem verificar o teclado."
                :"USB desconectado antes de transmitir o timbre. Nenhum bloco foi gravado.");
        reset();
    }

    public void reset(){
        token++;phase=Phase.IDLE;index=0;waiting=null;received=null;
        blocks.clear();name="";sha="";connectedDevice=-1;wroteAny=false;
    }
}
