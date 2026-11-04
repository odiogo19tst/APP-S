package io.github.odiogo19tst.jarvis.phone;

import android.Manifest;
import android.app.*;
import android.os.*;
import android.bluetooth.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.speech.RecognizerIntent;
import android.speech.tts.TextToSpeech;
import android.widget.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import io.github.odiogo19tst.jarvis.*;

/** Phone-side offline command grammar + Android recognizer + TTS + ELM327 classic Bluetooth. */
public final class PhoneActivity extends Activity {
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ScheduledExecutorService obdWorker=Executors.newSingleThreadScheduledExecutor();
    private final ExecutorService writes=Executors.newSingleThreadExecutor();
    private volatile BluetoothSocket head;
    private volatile ElmConnection elm;
    private ScheduledFuture<?> poll;
    private TextView status;
    private EditText headMac,obdMac;
    private CheckBox preferOffline;
    private TextToSpeech tts;
    private boolean ttsReady,recognizing,resumed;
    private volatile boolean connecting;
    private volatile boolean destroyed;
    private volatile int obdGeneration;
    private volatile int lastSpeed=-1;
    private volatile long speedAt=-1;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout l=new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); l.setPadding(24,24,24,24);
        status=new TextView(this); status.setText("CarLink • Celular Samsung\nVersão de teste. Configure estacionado. Deixe este app aberto durante o protótipo."); l.addView(status);
        headMac=new EditText(this); headMac.setHint("MAC Bluetooth da multimídia pareada"); l.addView(headMac);
        obdMac=new EditText(this); obdMac.setHint("MAC do ELM327 Bluetooth clássico pareado"); l.addView(obdMac);
        preferOffline=new CheckBox(this); preferOffline.setText(io.github.odiogo19tst.jarvis.phone.R.string.prefer_offline); preferOffline.setChecked(true); l.addView(preferOffline);
        button(l,"Permitir Bluetooth",()->{ if(Build.VERSION.SDK_INT>=31) requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT},1); });
        button(l,"Escolher multimídia pareada",()->choose(headMac));
        button(l,"Escolher ELM pareado",()->choose(obdMac));
        button(l,"Conectar multimídia",this::connectHead);
        button(l,"Conectar OBD • somente leitura",this::connectObd);
        button(l,"Falar",this::listen);
        button(l,"Ler falhas",()->obdCommand("DTC"));
        button(l,"PARAR",this::stopRemote);
        TextView help=new TextView(this); help.setText("Instale este app no celular; o APK Central Multimídia pertence ao aparelho do carro.\nComandos: abrir mapas, abrir spotify, rotação, temperatura, velocidade, falhas, parar. Sem leitura ou cliques de tela.\nÁudio: selecione a saída do carro no Android. Fonte e créditos: github.com/odiogo19tst/APP-S • AGPL-3.0"); l.addView(help);
        ScrollView scroll=new ScrollView(this); scroll.addView(l); setContentView(scroll);
        tts=new TextToSpeech(this,result->{ ttsReady=result==TextToSpeech.SUCCESS; if(ttsReady) {
            tts.setLanguage(new Locale("pt","BR"));
            tts.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
        }});
    }
    private void button(LinearLayout l,String text,Runnable action) { Button b=new Button(this); b.setText(text); b.setOnClickListener(v->action.run()); l.addView(b); }
    private void say(String s) { main.post(()->{ if(destroyed) return; status.setText(s); if(ttsReady) tts.speak(s,TextToSpeech.QUEUE_FLUSH,null,"jarvis"); }); }
    private void choose(EditText field) {
        if(Build.VERSION.SDK_INT>=31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)!=PackageManager.PERMISSION_GRANTED) { say("Conceda Bluetooth primeiro."); return; }
        BluetoothAdapter adapter=getSystemService(BluetoothManager.class).getAdapter();
        if(adapter==null || !adapter.isEnabled()) { say("Ative Bluetooth nas configurações."); return; }
        List<BluetoothDevice> devices=new ArrayList<>(adapter.getBondedDevices());
        String[] labels=new String[devices.size()];
        for(int i=0;i<labels.length;i++) labels[i]=devices.get(i).getName()+" • "+devices.get(i).getAddress();
        new AlertDialog.Builder(this).setTitle("Dispositivo já pareado").setItems(labels,(dialog,which)->field.setText(devices.get(which).getAddress())).setNegativeButton("Cancelar",null).show();
    }
    private BluetoothDevice bonded(String address) {
        if(Build.VERSION.SDK_INT>=31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)!=PackageManager.PERMISSION_GRANTED) throw new IllegalStateException("Conceda Bluetooth primeiro");
        String mac=address.trim().toUpperCase(Locale.ROOT);
        if(!BluetoothAdapter.checkBluetoothAddress(mac)) throw new IllegalArgumentException("MAC inválido");
        BluetoothAdapter a=getSystemService(BluetoothManager.class).getAdapter();
        if(a==null || !a.isEnabled()) throw new IllegalStateException("Ative Bluetooth nas configurações");
        for(BluetoothDevice d:a.getBondedDevices()) if(d.getAddress().equals(mac)) return d;
        throw new IllegalStateException("Pareie nas configurações Android primeiro");
    }
    private void connectHead() {
        if(connecting || head!=null) { say("Sessão já iniciada."); return; }
        final BluetoothDevice d;
        try { d=bonded(headMac.getText().toString()); } catch(RuntimeException e) { say(e.getMessage()); return; }
        connecting=true;
        new Thread(()->{
            BluetoothSocket socket=null;
            ScheduledExecutorService watchdog=Executors.newSingleThreadScheduledExecutor();
            try {
                socket=d.createRfcommSocketToServiceRecord(Protocol.SERVICE);
                head=socket;
                final BluetoothSocket timedSocket=socket;
                ScheduledFuture<?> timeout=watchdog.schedule(()->{ try { timedSocket.close(); } catch(IOException ignored) {} },10,TimeUnit.SECONDS);
                try { socket.connect(); } finally { timeout.cancel(false); watchdog.shutdownNow(); }
                connecting=false;
                while(!destroyed && head==socket) {
                    String line=Protocol.read(socket.getInputStream());
                    if(line.equals("LISTEN")) main.post(this::listen);
                    else if(line.startsWith("SAY ")) say(line.substring(4));
                    else if(line.matches("POLL [0-9]{1,18}")) {
                        int speed=SystemClock.elapsedRealtime()-speedAt<=1500 ? lastSpeed : -1;
                        send("VELOCITY "+line.substring(5)+" "+speed);
                    }
                }
            } catch(Exception e) { say("Multimídia desconectada. Reabra a sessão e tente novamente."); }
            finally {
                watchdog.shutdownNow();
                if(socket!=null) try { socket.close(); } catch(IOException ignored) {}
                if(head==socket) head=null;
                connecting=false;
            }
        },"jarvis-phone-link").start();
    }
    private void send(String line) {
        BluetoothSocket socket=head; if(socket==null) { say("Conecte a multimídia primeiro."); return; }
        writes.execute(()->{ try { Protocol.write(socket.getOutputStream(),line); } catch(IOException e) { try { socket.close(); } catch(IOException ignored) {} } });
    }
    private void listen() {
        if(!resumed || recognizing) { say("Deixe Jarvis aberto no Samsung para falar."); return; }
        Intent intent=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE,"pt-BR");
        intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE,preferOffline.isChecked());
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
        try { if(ttsReady) tts.stop(); recognizing=true; startActivityForResult(intent,20); }
        catch(ActivityNotFoundException e) { recognizing=false; say("Instale e configure um reconhecedor de voz e o pacote português offline."); }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request!=20) return; recognizing=false;
        if(result!=RESULT_OK || data==null) return;
        ArrayList<String> words=data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
        if(words==null || words.isEmpty()) return;
        String cmd=Protocol.command(words.get(0));
        if(cmd.equals("UNKNOWN")) say("Comando básico não reconhecido.");
        else if(Arrays.asList("RPM","TEMP","SPEED","DTC").contains(cmd)) obdCommand(cmd);
        else if(cmd.equals("STOP")) stopRemote();
        else send(cmd);
    }
    private void connectObd() {
        final BluetoothDevice d;
        try { d=bonded(obdMac.getText().toString()); } catch(RuntimeException e) { say(e.getMessage()); return; }
        if(poll!=null) poll.cancel(false);
        final int epoch=++obdGeneration;
        lastSpeed=-1; speedAt=-1;
        obdWorker.execute(()->{
            if(epoch!=obdGeneration) return;
            if(elm!=null) elm.close();
            try {
                ElmConnection current=new ElmConnection(d);
                if(epoch!=obdGeneration) { current.close(); return; }
                elm=current; current.initialize();
                if(epoch!=obdGeneration) { current.close(); return; }
                say("OBD conectado. Leitura de velocidade a cada segundo.");
                poll=obdWorker.scheduleWithFixedDelay(()->{
                    if(epoch!=obdGeneration) return;
                    try { int v=(int)Obd.pid(current.query("010D"),0x0d); if(epoch==obdGeneration) { lastSpeed=v; speedAt=SystemClock.elapsedRealtime(); } }
                    catch(Exception e) { if(epoch==obdGeneration) { lastSpeed=-1; speedAt=-1; current.close(); if(poll!=null) poll.cancel(false); say("Velocidade OBD indisponível. Interface bloqueada."); } }
                },0,1,TimeUnit.SECONDS);
            } catch(Exception e) { if(epoch==obdGeneration) { if(elm!=null) elm.close(); elm=null; lastSpeed=-1; speedAt=-1; say("ELM incompatível ou conexão recusada."); } }
        });
    }
    private void obdCommand(String command) {
        obdWorker.execute(()->{
            ElmConnection current=elm;
            if(current==null) { say("Conecte um adaptador OBD compatível primeiro."); return; }
            try {
                switch(command) {
                    case "RPM": say("Rotação: "+Obd.pid(current.query("010C"),0x0c)+" rotações por minuto."); break;
                    case "TEMP": say("Temperatura do líquido de arrefecimento: "+Obd.pid(current.query("0105"),0x05)+" graus Celsius."); break;
                    case "SPEED": say("Velocidade: "+Obd.pid(current.query("010D"),0x0d)+" quilômetros por hora."); break;
                    case "DTC": say("Códigos de falha armazenados: "+Obd.dtc(current.query("03"))+". Consulte um profissional para diagnóstico."); break;
                }
            } catch(Exception e) { say("Leitura não suportada ou resposta OBD inválida."); }
        });
    }
    private void disconnect() {
        obdGeneration++;
        lastSpeed=-1; speedAt=-1;
        if(poll!=null) poll.cancel(false); poll=null;
        if(elm!=null) elm.close(); elm=null;
        BluetoothSocket socket=head; head=null;
        if(socket!=null) try { socket.close(); } catch(IOException ignored) {}
        say("Jarvis parado.");
    }
    private void stopRemote() {
        BluetoothSocket socket=head;
        writes.execute(()->{
            try { if(socket!=null) Protocol.write(socket.getOutputStream(),"STOP"); } catch(IOException ignored) {}
            main.post(this::disconnect);
        });
    }
    @Override protected void onResume() { super.onResume(); resumed=true; }
    @Override protected void onPause() { resumed=false; super.onPause(); }
    @Override protected void onDestroy() {
        destroyed=true; disconnect(); obdWorker.shutdownNow(); writes.shutdownNow();
        if(tts!=null) { tts.stop(); tts.shutdown(); } super.onDestroy();
    }
}
