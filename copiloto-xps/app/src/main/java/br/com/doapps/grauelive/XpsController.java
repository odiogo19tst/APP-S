package br.com.doapps.grauelive;
import android.os.*;
import org.json.*;
import java.util.*;
/** Serialized read/write operations; no edits to user memory. Hardware readback is mandatory. */
public final class XpsController {
 public interface IO {boolean send(byte[] bytes);void emit(String kind,Object data);}
 private final List<XpsProtocol.Block> readable=XpsProtocol.readable();
 private final IO io;private final Handler h=new Handler(Looper.getMainLooper());
 private final Map<Integer,Integer> state=new HashMap<>();private Map<Integer,Integer> undo=new LinkedHashMap<>();
 private Map<Integer,Integer> expected=new LinkedHashMap<>();private int generation=0;private boolean busy=false;
 public XpsController(IO io){this.io=io;}
 private List<XpsProtocol.Block> performanceBlocks(){List<XpsProtocol.Block> b=XpsProtocol.blocks();b.addAll(XpsProtocol.patches());return b;}
 public void readUsers(){if(busy){io.emit("status","Aguarde a operação atual.");return;}busy=true;io.emit("hardwareBusy",true);int token=++generation,delay=0;for(XpsProtocol.Block b:XpsProtocol.users()){for(int i=0;i<b.size;i++)state.remove(b.start+i);h.postDelayed(()->{if(token!=generation)return;if(!io.send(XpsProtocol.request(b))){abort("Sem porta MIDI de saída.");return;}if(b.index%32==0)io.emit("status","Consultando timbres de usuário: "+(b.index+1)+" / 256…");},delay);delay+=100;}h.postDelayed(()->{if(token!=generation)return;busy=false;io.emit("hardwareBusy",false);JSONArray tones=new JSONArray();for(XpsProtocol.Block b:XpsProtocol.users()){StringBuilder name=new StringBuilder();boolean complete=true;for(int i=0;i<12;i++){Integer c=state.get(b.start+i);if(c==null){complete=false;break;}name.append(c>=32&&c<=126?(char)(int)c:' ');}if(complete)try{JSONObject t=new JSONObject();t.put("code",String.format(java.util.Locale.ROOT,"USER%03d",b.index+1));t.put("name",name.toString().trim());t.put("category","USER");t.put("msb",87);t.put("lsb",b.index/128);t.put("program",b.index%128+1);tones.put(t);}catch(JSONException ignored){}}io.emit("userTones",tones);io.emit("status",tones.length()+" de 256 posições de usuário responderam. Posições sem resposta não foram inventadas.");},delay+1500);}
 /** A tap is an explicit authorization to audition a tone, not a request to save in USER memory. */
 public boolean hasPerformancePart(int part){
  if(part<0||part>15)return false;
  XpsProtocol.Block b=XpsProtocol.block("part",part);
  return Integer.valueOf(1).equals(state.get(XpsProtocol.address(1,0,0,0)))
   &&state.containsKey(b.start+4)&&state.containsKey(b.start+5)&&state.containsKey(b.start+6);
 }
 public void auditionTone(int part,int msb,int lsb,int program){
  if(part<0||part>=16||msb<0||msb>127||lsb<0||lsb>127||program<1||program>128){
   io.emit("status","Endereço do timbre inválido.");return;
  }
  if(busy){io.emit("status","Leitura do XPS-10 em andamento. Toque novamente após concluir.");return;}
  if(!hasPerformancePart(part)){io.emit("status","Performance ainda não confirmada. Troca temporária será tentada por Program Change.");return;}
  try{
   JSONArray edits=new JSONArray()
    .put(new JSONObject().put("section","part").put("index",part).put("offset",4).put("value",msb))
    .put(new JSONObject().put("section","part").put("index",part).put("offset",5).put("value",lsb))
    .put(new JSONObject().put("section","part").put("index",part).put("offset",6).put("value",program-1));
   write(edits.toString(),true); // single explicit tap; guarded snapshot+readback, never WRITE to user memory
  }catch(JSONException e){io.emit("status","Não foi possível selecionar o timbre: "+e.getMessage());}
 }
 public void reset(){generation++;state.clear();undo.clear();expected.clear();busy=false;io.emit("hardwareReset",true);}
 public void accept(byte[] packet){XpsProtocol.Data d=XpsProtocol.decode(packet);if(d==null)return;for(int i=0;i<d.values.length;i++){int address=d.start+i;for(XpsProtocol.Block b:readable)if(address>=b.start&&address<b.start+b.size){state.put(address,d.values[i]);break;}}}
 private JSONObject snapshot(){JSONObject result=new JSONObject();try{for(XpsProtocol.Block b:performanceBlocks()){JSONArray values=new JSONArray();boolean complete=true;for(int i=0;i<b.size;i++){Integer v=state.get(b.start+i);if(v==null){complete=false;break;}values.put(v);}if(complete)result.put(b.section+":"+b.index,values);}result.put("readAt",System.currentTimeMillis());}catch(JSONException ignored){}return result;}
 public void read(){if(busy){io.emit("status","Aguarde a operação MIDI em andamento.");return;}expected.clear();readNow();}
 private void readNow(){readBlocks(performanceBlocks(),true);}
 private void readBlocks(List<XpsProtocol.Block> requested,boolean full){busy=true;if(full)state.clear();else for(XpsProtocol.Block b:requested)for(int i=0;i<b.size;i++)state.remove(b.start+i);io.emit("hardwareBusy",true);io.emit("status","Lendo XPS-10… aguarde a resposta do teclado.");int token=++generation,delay=0;for(XpsProtocol.Block b:requested){h.postDelayed(()->{if(token!=generation)return;if(!io.send(XpsProtocol.request(b))){abort("Porta MIDI indisponível para leitura.");}},delay);delay+=100;}
  h.postDelayed(()->{if(token!=generation)return;busy=false;io.emit("hardwareBusy",false);JSONObject result=snapshot();io.emit("hardware",result);boolean verified=!expected.isEmpty()&&expected.entrySet().stream().allMatch(e->e.getValue().equals(state.get(e.getKey())));String message=state.isEmpty()?"Sem resposta SysEx. Confira USB, modo MIDI e Device ID 17 (10h).":expected.isEmpty()?"Leitura recebida. Blocos ausentes permanecem indisponíveis.":verified?"Alteração confirmada pela leitura do XPS-10.":"Não foi possível confirmar todos os valores enviados. Leia novamente e confira o teclado.";io.emit("status",message);expected.clear();},delay+700);
 }
 private void abort(String message){generation++;busy=false;io.emit("hardwareBusy",false);io.emit("status",message);io.emit("hardware",snapshot());}
 public void cancelWrites(){if(busy)abort("Operação interrompida. Parte dos comandos pode ter sido enviada; leia novamente.");}
 public void write(String json,boolean armed){if(!armed){io.emit("status","Ative o envio MIDI em Sons.");return;}if(busy){io.emit("status","Aguarde a operação atual.");return;}
  try{JSONArray items=new JSONArray(json);if(items.length()<1||items.length()>128)throw new IllegalArgumentException("Quantidade inválida de parâmetros");Map<Integer,Integer> target=new LinkedHashMap<>();for(int i=0;i<items.length();i++){JSONObject o=items.getJSONObject(i);String section=o.getString("section");if(section.equals("mfxparam")){int unit=o.getInt("index"),type=o.getInt("effect");if(!Integer.valueOf(type).equals(state.get(XpsProtocol.block("mfx",unit).start)))throw new IllegalArgumentException("O tipo MFX mudou. Leia novamente.");int a=MfxParameters.address(unit,type,o.getInt("offset"),o.getInt("value"));int[] v=MfxParameters.nibbles(o.getInt("value"));for(int n=0;n<4;n++)if(target.put(a+n,v[n])!=null)throw new IllegalArgumentException("Parâmetro duplicado");}else{int a=XpsProtocol.writeAddress(section,o.getInt("index"),o.getInt("offset"),o.getInt("value"));if(target.put(a,o.getInt("value"))!=null)throw new IllegalArgumentException("Parâmetro duplicado");}}
   for(int i=0;i<3;i++){int a=XpsProtocol.block("mfx",i).start;if(target.containsKey(a))for(int k=17;k<145;k++)if(target.containsKey(a+k))throw new IllegalArgumentException("Troque o tipo MFX e leia antes de editar seus parâmetros");}
   boolean onlyMode=target.size()==1&&target.containsKey(XpsProtocol.address(1,0,0,0));if(!onlyMode&&!Integer.valueOf(1).equals(state.get(XpsProtocol.address(1,0,0,0))))throw new IllegalArgumentException("Leia o teclado e use modo Performance antes de editar");
   // Validate zone ranges against the combined target + last hardware snapshot.
   for(XpsProtocol.Block b:XpsProtocol.blocks())if(b.section.equals("zone")){Integer lo=target.getOrDefault(b.start+12,state.get(b.start+12)),hi=target.getOrDefault(b.start+13,state.get(b.start+13));if(lo!=null&&hi!=null&&lo>hi)throw new IllegalArgumentException("Nota inicial maior que final");}
   Map<Integer,Integer> before=new LinkedHashMap<>();for(int a:target.keySet()){if(!state.containsKey(a))throw new IllegalArgumentException("Faça uma leitura completa antes de editar");before.put(a,state.get(a));}undo=onlyMode?new LinkedHashMap<>():before;send(target);
  }catch(Exception e){io.emit("status",e.getMessage());}
 }
 private void send(Map<Integer,Integer> target){busy=true;io.emit("hardwareBusy",true);expected=new LinkedHashMap<>(target);int token=++generation,delay=0;
  List<Integer> keys=new ArrayList<>(target.keySet());Collections.sort(keys);
  for(int i=0;i<keys.size();){int start=keys.get(i),end=i+1;while(end<keys.size()&&keys.get(end)==keys.get(end-1)+1)end++;int[] values=new int[end-i];for(int k=i;k<end;k++)values[k-i]=target.get(keys.get(k));byte[] packet=XpsProtocol.packet(0x12,start,values);h.postDelayed(()->{if(token!=generation)return;if(!io.send(packet))abort("Falha no envio. Leia novamente antes de continuar.");},delay);delay+=35;i=end;}
  h.postDelayed(()->{if(token!=generation)return;if(target.containsKey(XpsProtocol.address(1,0,0,0))||target.containsKey(XpsProtocol.address(1,0,0,38))){readNow();return;}List<XpsProtocol.Block> touched=new ArrayList<>();for(XpsProtocol.Block b:XpsProtocol.blocks())if(target.keySet().stream().anyMatch(a->a>=b.start&&a<b.start+b.size)){touched.add(b);if(b.section.equals("part")&&(target.containsKey(b.start+4)||target.containsKey(b.start+5)||target.containsKey(b.start+6)))touched.add(XpsProtocol.patches().get(b.index));}readBlocks(touched,false);},delay+400);
 }
 public void undo(boolean armed){if(!armed||busy){io.emit("status","Ative envio e aguarde a operação atual.");return;}if(undo.isEmpty()){io.emit("status","Não há alteração com estado anterior conhecido.");return;}Map<Integer,Integer> old=undo;undo=new LinkedHashMap<>();send(old);}
}
