package com.carlink.app.jarvis;

import android.Manifest;
import android.app.*;
import android.os.*;
import android.bluetooth.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.session.*;
import android.view.KeyEvent;
import android.widget.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import io.github.odiogo19tst.jarvis.Protocol;

/** Explicit, activity-scoped development session. No auto-start or hidden always-on capture. */
public final class JarvisActivity extends Activity {
    private volatile BluetoothServerSocket server;
    private volatile BluetoothSocket socket;
    private volatile boolean running;
    private MediaSession media;
    private TextView status;
    private EditText peer;
    private long lastPlay;
    private volatile int generation;
    private long pendingPoll=-1, pollSentAt;
    private final Runnable telemetry=new Runnable() {
        @Override public void run() {
            if(!running || socket==null) return;
            pendingPoll=JarvisState.now(); pollSentAt=pendingPoll;
            send("POLL "+pendingPoll); main.postDelayed(this,1000);
        }
    };
    private final Handler main=new Handler(Looper.getMainLooper());
    private final ExecutorService writes=new ThreadPoolExecutor(1,1,0,TimeUnit.MILLISECONDS,
        new ArrayBlockingQueue<>(8),r->new Thread(r,"jarvis-send"));
    @Override public void onCreate(Bundle b) {
        super.onCreate(b);
        LinearLayout layout=new LinearLayout(this); layout.setOrientation(LinearLayout.VERTICAL); layout.setPadding(24,24,24,24);
        status=new TextView(this); status.setText("Jarvis • Central Multimídia\nVersão de teste. Pare o carro para configurar. Voz e OBD no Samsung; sem leitura ou cliques de tela."); layout.addView(status);
        peer=new EditText(this); peer.setHint("MAC Bluetooth do Samsung pareado"); layout.addView(peer);
        button(layout,"Permissões Bluetooth",()->{ if(Build.VERSION.SDK_INT>=31) requestPermissions(new String[]{Manifest.permission.BLUETOOTH_CONNECT},1); });
        button(layout,"Escolher Samsung já pareado",this::choosePeer);
        button(layout,"Iniciar sessão com Samsung",()->start());
        button(layout,"Estou estacionado • liberar por 2 minutos",()->{
            if(running) { JarvisState.GATE.approveParked(JarvisState.now()); show("Aprovação temporária. Ainda exige velocidade OBD zero recente."); }
        });
        button(layout,"Ouvir no Samsung",()->listen());
        button(layout,"PARAR e revogar sessão",()->stop());
        ScrollView scroll=new ScrollView(this); scroll.addView(layout); setContentView(scroll);
    }
    private void button(LinearLayout l,String text,Runnable action) { Button b=new Button(this); b.setText(text); b.setOnClickListener(v->action.run()); l.addView(b); }
    private void show(String s) { main.post(()->status.setText(s)); }
    private void choosePeer() {
        if(Build.VERSION.SDK_INT>=31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)!=PackageManager.PERMISSION_GRANTED) { show("Conceda Bluetooth primeiro."); return; }
        BluetoothAdapter adapter=getSystemService(BluetoothManager.class).getAdapter();
        if(adapter==null || !adapter.isEnabled()) { show("Ative Bluetooth nas configurações."); return; }
        List<BluetoothDevice> devices=new ArrayList<>(adapter.getBondedDevices());
        String[] labels=new String[devices.size()];
        for(int i=0;i<labels.length;i++) labels[i]=devices.get(i).getName()+" • "+devices.get(i).getAddress();
        new AlertDialog.Builder(this).setTitle("Samsung pareado").setItems(labels,(dialog,which)->peer.setText(devices.get(which).getAddress())).setNegativeButton("Cancelar",null).show();
    }
    private void start() {
        if(running) return;
        if(Build.VERSION.SDK_INT>=31 && checkSelfPermission(Manifest.permission.BLUETOOTH_CONNECT)!=PackageManager.PERMISSION_GRANTED) { show("Conceda Bluetooth primeiro."); return; }
        final String mac=peer.getText().toString().trim().toUpperCase(Locale.ROOT);
        if(!BluetoothAdapter.checkBluetoothAddress(mac)) { show("Informe o MAC pareado do Samsung."); return; }
        BluetoothManager manager=getSystemService(BluetoothManager.class);
        BluetoothAdapter adapter=manager.getAdapter();
        if(adapter==null || !adapter.isEnabled()) { show("Ative o Bluetooth nas configurações Android."); return; }
        boolean bonded=false;
        for(BluetoothDevice d:adapter.getBondedDevices()) if(d.getAddress().equals(mac)) bonded=true;
        if(!bonded) { show("Pareie o Samsung nas configurações Android primeiro."); return; }
        running=true; JarvisState.GATE.stop();
        final int epoch=++generation;
        media=new MediaSession(this,"Jarvis explicit session");
        media.setCallback(new MediaSession.Callback() {
            @Override public boolean onMediaButtonEvent(Intent intent) {
                KeyEvent k=intent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
                if(k!=null && (k.getKeyCode()==KeyEvent.KEYCODE_MEDIA_PLAY || k.getKeyCode()==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)) {
                    if(k.getAction()==KeyEvent.ACTION_DOWN && k.getRepeatCount()==0) listen(); return true;
                }
                return false;
            }
            @Override public void onPlay() { listen(); }
        },main);
        media.setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS | MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS);
        media.setPlaybackState(new PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY|PlaybackState.ACTION_PLAY_PAUSE).setState(PlaybackState.STATE_PAUSED,0,0).build());
        media.setActive(true);
        new Thread(()->{
            try {
                BluetoothServerSocket listener=adapter.listenUsingRfcommWithServiceRecord("CarLink Jarvis",Protocol.SERVICE);
                if(epoch!=generation) { listener.close(); return; }
                server=listener;
                show("Aguardando Samsung pareado. Sessão expira em 15 minutos.");
                BluetoothSocket candidate=listener.accept();
                if(!running || epoch!=generation || !candidate.getRemoteDevice().getAddress().equals(mac)) { candidate.close(); throw new IOException("Dispositivo não autorizado"); }
                socket=candidate; listener.close();
                main.post(()->{ if(epoch==generation) telemetry.run(); });
                send("SAY Jarvis conectado. Voz e OBD no Samsung.");
                while(running && epoch==generation) {
                    String cmd=Protocol.read(candidate.getInputStream());
                    main.post(()->{ if(epoch==generation) handle(cmd); });
                }
            } catch(Exception e) { main.post(()->{ if(epoch==generation) stop(); }); }
        },"jarvis-rfcomm").start();
        main.postDelayed(expire,900_000);
    }
    private final Runnable expire=this::stop;
    private void handle(String cmd) {
        if(!running) return;
        if(cmd.startsWith("VELOCITY ")) {
            try {
                String[] parts=cmd.split(" ");
                long nonce=Long.parseLong(parts[1]);
                if(parts.length!=3 || nonce!=pendingPoll || JarvisState.now()-pollSentAt>900) return;
                pendingPoll=-1;
                JarvisState.GATE.speed(Integer.parseInt(parts[2]),JarvisState.now());
            }
            catch(RuntimeException e) { JarvisState.GATE.stop(); } return;
        }
        if(cmd.equals("STOP")) { stop(); return; }
        if(!JarvisState.GATE.allowsUi(JarvisState.now())) { send("SAY Interface bloqueada: estacionamento e velocidade OBD zero recente são necessários."); return; }
        if(cmd.equals("MAPS") || cmd.equals("SPOTIFY")) {
            String pkg=cmd.equals("MAPS")?"com.google.android.apps.maps":"com.spotify.music";
            Intent i=getPackageManager().getLaunchIntentForPackage(pkg);
            if(i==null) { send("SAY Aplicativo não instalado na multimídia."); return; }
            try { startActivity(i); send("SAY Aplicativo aberto."); } catch(RuntimeException e) { send("SAY Android recusou abrir o aplicativo."); }
            return;
        }
        send("SAY Comando não permitido. Esta edição não lê nem controla outras telas.");
    }
    private void listen() {
        long now=JarvisState.now(); if(now-lastPlay<1000) return; lastPlay=now;
        send("LISTEN");
    }
    private void send(String msg) {
        BluetoothSocket s=socket; if(s==null) { show("Samsung ainda não conectado."); return; }
        final int epoch=generation;
        try {
            writes.execute(()->{
                if(epoch!=generation) return;
                try { Protocol.write(s.getOutputStream(),msg); }
                catch(IOException e) { main.post(()->{ if(epoch==generation) stop(); }); }
            });
        } catch(RejectedExecutionException e) { stop(); }
    }
    private void stop() {
        generation++; running=false; main.removeCallbacks(expire); main.removeCallbacks(telemetry); pendingPoll=-1; JarvisState.GATE.stop();
        try { if(socket!=null) socket.close(); } catch(IOException ignored) {} socket=null;
        try { if(server!=null) server.close(); } catch(IOException ignored) {} server=null;
        if(media!=null) { media.release(); media=null; }
        show("Sessão parada.");
    }
    @Override public boolean dispatchKeyEvent(KeyEvent k) {
        if(running && (k.getKeyCode()==KeyEvent.KEYCODE_MEDIA_PLAY || k.getKeyCode()==KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE)) {
            if(k.getAction()==KeyEvent.ACTION_DOWN && k.getRepeatCount()==0) listen(); return true;
        }
        return super.dispatchKeyEvent(k);
    }
    @Override protected void onDestroy() { stop(); writes.shutdownNow(); super.onDestroy(); }
}
