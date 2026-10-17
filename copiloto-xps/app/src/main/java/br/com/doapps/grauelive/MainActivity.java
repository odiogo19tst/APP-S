package br.com.doapps.grauelive;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.Locale;

/** Visible foreground-only prototype: microphone stays active while app is open. */
public final class MainActivity extends Activity {
    private static final int BG=0xFF0C1727,CARD=0xFF192C43,WHITE=0xFFF2F6FF,MINT=0xFF68E0AB,MUTED=0xFFABC0D8;
    private TextView note,key,degree,chords,detectedChord,bleStatus,audioStatus,subtitle;
    private Button start,bluetooth,demo,modeButton,confirmButton,newSongButton;
    private AudioAnalyzer audio;private UsbMidi midi;
    private TextView midiNotes,midiState;private Button connectMidi;
    private final boolean[][] held=new boolean[16][128];
    private int keyRoot=-1;
    private void showMidi(){StringBuilder out=new StringBuilder();
      for(int n=0;n<128;n++){boolean down=false;for(int c=0;c<16;c++)down|=held[c][n];
       if(down){out.append(MusicBrain.NOTE[n%12]).append(n/12-1);
        if(keyRoot>=0){String[] degrees={"1","♭2","2","♭3","3","4","♯4/♭5","5","♭6","6","♭7","7"};out.append(" [").append(degrees[(n-keyRoot+120)%12]).append("]");}out.append("  ");}}
      midiNotes.setText(out.length()==0?"Nenhuma tecla pressionada":out.toString());}

    private int sequence=0;private long lastPacket=0;
    private boolean keyIsLocked=false;
    private final MusicBrain demoBrain=new MusicBrain();
    @Override public void onCreate(Bundle b){super.onCreate(b);buildUi();
        midi=new UsbMidi(this,new UsbMidi.Listener(){
 public void status(String s){midiState.setText(s);if(s.contains("desconectado")){for(boolean[] row:held)java.util.Arrays.fill(row,false);showMidi();}}
 public void event(int s,int a,int b){int kind=s&240,ch=s&15;
  if(kind==144||kind==128){held[ch][a]=kind==144&&b>0;showMidi();}
  if(kind==176&&(a==120||a==123)){java.util.Arrays.fill(held[ch],false);showMidi();}}
 });
 connectMidi.setOnClickListener(v->{android.media.midi.MidiDeviceInfo[] devices=midi.devices();
 if(devices.length==0){midiState.setText("Nenhum MIDI USB encontrado. Confira cabo e configuração USB do teclado.");return;}
 String[] names=new String[devices.length];for(int i=0;i<names.length;i++)names[i]=devices[i].getProperties().getString(android.media.midi.MidiDeviceInfo.PROPERTY_NAME,"USB MIDI "+i);
 new android.app.AlertDialog.Builder(this).setTitle("Selecione o teclado").setItems(names,(d,i)->midi.connect(devices[i])).show();});
        audio=new AudioAnalyzer(new AudioAnalyzer.Callback(){
            @Override public void onResult(PitchDetector.Result p,MusicBrain.Harmony h){
                long now=SystemClock.elapsedRealtime();
                // Bluetooth deliberately disabled until the Bip 6 reboot defect is diagnosed.
                runOnUiThread(()->render(p,h));
            }
            @Override public void onError(String s){runOnUiThread(()->audioStatus.setText(s));}
        });
        start.setOnClickListener(v->{if(audio.isRunning()){audio.stop();start.setText("Iniciar escuta");audioStatus.setText("Microfone parado");}
            else if(checkPermission(Manifest.permission.RECORD_AUDIO))startAudio();else requestAllPermissions();});
        bluetooth.setVisibility(View.GONE); // Bip 6 has rebooted on BLE connect; inhibit until on-device diagnosis.
        modeButton.setOnClickListener(v->{int next=audio.manualMode()==-1?0:(audio.manualMode()==0?1:-1);audio.setManualMode(next);
            modeButton.setText(next==-1?"Modo: automático":next==0?"Modo: priorizar MAIOR":"Modo: priorizar MENOR");
            keyIsLocked=false;confirmButton.setText("Confirmar tom sugerido");
            key.setText("Reavaliando o tom...");});
        newSongButton.setOnClickListener(v->{audio.resetAnalysis();keyIsLocked=false;confirmButton.setText("Confirmar tom sugerido");
            key.setText("Tom: recomeçando análise");degree.setText("Grau: —");chords.setText("Aguardando novas frases");
            detectedChord.setText("Acorde detectado: aguardando");});
        confirmButton.setOnClickListener(v->{
            if(!keyIsLocked){if(audio.confirmKey()){keyIsLocked=true;confirmButton.setText("Liberar tom confirmado");}else{audioStatus.setText("Aguarde melodia ou acordes para confirmar o tom");}}
            else{audio.unlockKey();keyIsLocked=false;confirmButton.setText("Confirmar tom sugerido");}
        });
        demo.setOnClickListener(v->{
            // Synthetic melody tests the BLE path independently from microphone.
            int[] melody={67,69,71,72,74,76,74,71,69,67,71,74};
            demoBrain.reset();MusicBrain.Harmony h=null;
            for(int m:melody)h=demoBrain.accept(m);
            if(h!=null)render(new PitchDetector.Result(0,1,0,h.midi),h);
            audioStatus.setText("Exemplo calculado no celular (sem áudio real, sem Bluetooth)");
        });
        // Request microphone only when the user starts listening.
    }
    private boolean checkPermission(String p){return Build.VERSION.SDK_INT<31&& !p.equals(Manifest.permission.RECORD_AUDIO)||checkSelfPermission(p)==PackageManager.PERMISSION_GRANTED;}
    private void requestAllPermissions(){
        if(Build.VERSION.SDK_INT>=31)requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},101);
        else requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},101);
    }
    private void startAudio(){audio.start();if(audio.isRunning()){start.setText("Parar escuta");audioStatus.setText("Analisando áudio local: voz e acordes prováveis");}}
    private void buildUi(){
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
        LinearLayout root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(24,42,24,28);scroll.addView(root);
        TextView title=txt("♫  COPILOTO XPS",28,WHITE,true);root.addView(title);
        subtitle=txt("USB MIDI + áudio • laboratório 0.1",14,MUTED,false);root.addView(subtitle);
        root.addView(space(24));
        LinearLayout midiCard=card(root);midiCard.addView(txt("SUAS TECLAS • MIDI USB",13,MUTED,true));
        midiNotes=txt("Conecte o teclado",25,WHITE,true);midiCard.addView(midiNotes);
        midiState=txt("Desconectado",13,MUTED,false);midiCard.addView(midiState);
        midiCard.addView(txt("Graus relativos ao tom estimado pelo áudio. Apenas teclas pressionadas; sustain não prolonga a indicação.",12,MUTED,false));
        connectMidi=action(root,"Conectar teclado USB",0xFF345FE8);

        LinearLayout hero=card(root);hero.addView(txt("NOTA PREDOMINANTE (ESTIMADA)",13,MUTED,true));
        note=txt("—",72,WHITE,true);note.setGravity(Gravity.CENTER);hero.addView(note);
        key=txt("Tom: analisando melodia",20,MINT,true);key.setGravity(Gravity.CENTER);hero.addView(key);
        degree=txt("Grau: —",16,MUTED,false);degree.setGravity(Gravity.CENTER);hero.addView(degree);
        root.addView(space(16));
        LinearLayout suggestions=card(root);suggestions.addView(txt("ACOMPANHAMENTO POSSÍVEL",13,MUTED,true));
        chords=txt("Aguardando notas suficientes",25,WHITE,true);suggestions.addView(chords);
        detectedChord=txt("Acorde detectado: aguardando",15,MINT,false);suggestions.addView(detectedChord);
        suggestions.addView(txt("Sugestões, não acordes identificados na gravação",12,MUTED,false));
        root.addView(space(18));
        start=action(root,"Iniciar escuta",0xFF297A5D);
        modeButton=action(root,"Modo: automático",0xFF214C80);
        newSongButton=action(root,"Nova música: zerar análise",0xFF37465C);
        confirmButton=action(root,"Confirmar tom sugerido",0xFF37465C);
        bluetooth=action(root,"Bluetooth suspenso: reinício do Bip 6",0xFF444454);
        demo=action(root,"Exemplo musical (sem Bluetooth)",0xFF37465C);
        root.addView(space(20));
        root.addView(txt("STATUS DO ÁUDIO",12,MUTED,true));audioStatus=txt("Aguardando permissão de microfone",15,WHITE,false);root.addView(audioStatus);
        root.addView(space(13));
        root.addView(space(22));
        root.addView(txt("Versão experimental 0.1 • MIDI e análise de áudio local. Sem IA generativa, integração LouveApp ou envio de efeitos nesta versão. Não grava nem envia áudio. O PA permanece independente.",12,MUTED,false));
        setContentView(scroll);
    }
    private LinearLayout card(LinearLayout root){LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(22,20,22,20);
        GradientDrawable bg=new GradientDrawable();bg.setColor(CARD);bg.setCornerRadius(22);box.setBackground(bg);root.addView(box,new LinearLayout.LayoutParams(-1,-2));return box;}
    private Button action(LinearLayout root,String name,int color){Button b=new Button(this);b.setAllCaps(false);b.setText(name);b.setTextSize(16);b.setTextColor(WHITE);
        GradientDrawable bg=new GradientDrawable();bg.setColor(color);bg.setCornerRadius(16);b.setBackground(bg);
        LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,dp(56));lp.bottomMargin=dp(12);root.addView(b,lp);return b;}
    private int dp(int value){return (int)(value*getResources().getDisplayMetrics().density+0.5f);}
    private TextView txt(String value,int size,int color,boolean bold){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);
        t.setTypeface(Typeface.DEFAULT,bold?Typeface.BOLD:Typeface.NORMAL);t.setPadding(0,2,0,4);return t;}
    private View space(int dp){View v=new View(this);v.setLayoutParams(new LinearLayout.LayoutParams(1,dp));return v;}
    private void render(PitchDetector.Result p,MusicBrain.Harmony h){
        keyRoot=h.knownKey()?h.root:-1;showMidi();
        note.setText(h.midi<0?"—":MusicBrain.NOTE[h.midi%12]+(h.midi/12-1));
        detectedChord.setText("Acorde detectado: "+(h.heardChord<0?"indefinido":MusicBrain.NOTE[h.heardChord]+suffix(h.heardQuality)));
        if(!h.knownKey()){key.setText("Tom: indefinido (maior/menor ambíguos)");degree.setText("Cante frases ou toque acordes");chords.setText("Aguardando contexto harmônico");return;}
        key.setText((h.locked?"Tom confirmado: ":"Tom provável: ")+MusicBrain.NOTE[h.root]+(h.mode==0?" maior":" menor")+" · "+h.confidence+"% estimado");
        degree.setText("Grau melódico: "+(h.degree>0?h.degree+"º":"cromático"));
        String a=h.chord1<0?"—":MusicBrain.NOTE[h.chord1]+suffix(h.quality1);
        String b=h.chord2<0?"—":MusicBrain.NOTE[h.chord2]+suffix(h.quality2);
        chords.setText(a+"    ou    "+b);
    }
    private String suffix(int q){return q==1?"m":q==2?"dim":"";}
    @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==101&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED)startAudio();else audioStatus.setText("Permissão de microfone negada");}
    @Override protected void onStop(){audio.stop();start.setText("Iniciar escuta");audioStatus.setText("Microfone parado");super.onStop();}
    @Override protected void onDestroy(){audio.stop();midi.close();super.onDestroy();}
}
