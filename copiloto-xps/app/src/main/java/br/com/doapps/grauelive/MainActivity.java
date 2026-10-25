package br.com.doapps.grauelive;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.media.midi.MidiDeviceInfo;
import android.os.*;
import android.webkit.*;
import android.view.View;
import org.json.*;
import java.io.*;
import java.util.concurrent.*;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;

public class MainActivity extends Activity {
 private android.widget.LinearLayout rootLayout; private CifraPanel cifraPanel; private DrumSequencer sequencer;
 private boolean autoUserRead=false;
 private final java.util.Map<Integer,Integer> assistNotes=new java.util.HashMap<>();
 private int assistSerial=0;
 private void stopAssist(){
  for(Integer key:assistNotes.keySet())if(midi!=null)midi.send(0x80+(key/128),key%128,0);
  assistNotes.clear();assistSerial++;
 }

 private void emitCachedUsers(){
  String stored=getPreferences(MODE_PRIVATE).getString("xpsUserCache","");
  if(!stored.isEmpty())try{emit("userTones",new JSONArray(stored));emit("status","Timbres USER recuperados do cache local. Não é necessário ler novamente.");}
  catch(Exception ignored){}
 }
 private boolean hasCachedUsers(){return !getPreferences(MODE_PRIVATE).getString("xpsUserCache","").isEmpty();}
 private boolean pageReady=false; private String pendingShare=""; private final java.util.Map<Integer,Integer> padTokens=new java.util.HashMap<>();private final Handler padHandler=new Handler(Looper.getMainLooper());private int padSerial=0; private XpsController xps; private WebView web; private UsbMidi midi; private AudioAnalyzer audio; private boolean armed=false;
 private final ExecutorService worker=Executors.newSingleThreadExecutor(); private LlmInference llm; private String exportText="";
 private BackupArchive backupArchive; private String backupExportSha=""; private JarvisCloudGateway jarvisGateway; private JarvisDirectOpenAI directApi;

 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().addFlags(128);
  backupArchive=new BackupArchive(this);jarvisGateway=new JarvisCloudGateway(this);directApi=new JarvisDirectOpenAI(this);
  getWindow().setStatusBarColor(android.graphics.Color.rgb(7,17,28));
  getWindow().setNavigationBarColor(android.graphics.Color.rgb(7,17,28));
  getWindow().getDecorView().setSystemUiVisibility(0);
  rootLayout=new android.widget.LinearLayout(this);rootLayout.setOrientation(android.widget.LinearLayout.VERTICAL);setContentView(rootLayout);web=new WebView(this);rootLayout.addView(web,new android.widget.LinearLayout.LayoutParams(-1,0,1));rootLayout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);s.setBlockNetworkLoads(true);
  web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,android.webkit.WebResourceRequest req){return true;}public void onPageFinished(WebView v,String url){pageReady=true;if(!pendingShare.isEmpty()){emit("sharedText",pendingShare);pendingShare="";}modelInfo();emit("jarvisMemory",getPreferences(MODE_PRIVATE).getString("jarvisMusicalNotes",""));gatewayInfo();directInfo();emitCachedUsers();}});
  web.addJavascriptInterface(new Bridge(),"Native");
  xps=new XpsController(new XpsController.IO(){public boolean send(byte[] b){return midi!=null&&midi.send(b);}public void emit(String k,Object d){
  MainActivity.this.emit(k,d);
  if("hardware".equals(k)&&autoUserRead){
   autoUserRead=false;
   if(hasCachedUsers())emitCachedUsers();
   else new Handler(Looper.getMainLooper()).postDelayed(()->xps.readUsers(),120);
  }
  if("userTones".equals(k)&&d instanceof JSONArray){
   JSONArray entries=(JSONArray)d;
   if(entries.length()>0)getPreferences(MODE_PRIVATE).edit().putString("xpsUserCache",entries.toString()).apply();
  }
 }});
  midi=new UsbMidi(this,new UsbMidi.Listener(){public void sysex(byte[] p){xps.accept(p);}public void status(String t){
 emit("status",t);
 if(t!=null&&t.startsWith("USB conectado")&&midi.isConnected()){
  stopAssist();padTokens.clear();if(sequencer!=null)sequencer.stop();xps.reset();
  armed=true;emit("armed",true);emit("xpsConnection",true);
  autoUserRead=!hasCachedUsers();
  emitCachedUsers();
  new Handler(Looper.getMainLooper()).postDelayed(()->{if(midi!=null&&midi.isConnected())xps.read();},300);
 }else if(t!=null&&(t.startsWith("USB desconectado")||t.startsWith("Porta MIDI indisponível")||t.startsWith("Entrada ou saída USB-MIDI indisponível")||t.startsWith("Não foi possível abrir"))){
  stopAssist();padTokens.clear();if(sequencer!=null)sequencer.stop();xps.reset();
  armed=false;autoUserRead=false;
  emit("armed",false);emit("xpsConnection",false);emit("clear","");
 }
}public void event(int s,int a,int b){try{emit("midi",new JSONArray(new int[]{s,a,b}));}catch(Exception ignored){}}});
  sequencer=new DrumSequencer(new DrumSequencer.Output(){public void hit(int c,int n,int v){new Bridge().padHit(c,n,v);}public void state(int step){emit("sequenceStep",step);}});
  audio=new AudioAnalyzer(new AudioAnalyzer.Callback(){public void onError(String t){emit("status",t);}public void onResult(PitchDetector.Result p,MusicBrain.Harmony h){try{JSONObject o=new JSONObject();o.put("root",h.root);o.put("mode",h.mode);o.put("confidence",h.confidence);o.put("midi",h.midi);o.put("rms",p.rms);o.put("degree",h.degree);o.put("heardChord",h.heardChord);o.put("heardQuality",h.heardQuality);o.put("chord1",h.chord1);o.put("quality1",h.quality1);o.put("chord2",h.chord2);o.put("quality2",h.quality2);emit("audio",o);}catch(Exception ignored){}}});
  captureShare(getIntent());
  layoutPanels();web.loadUrl("file:///android_asset/index.html");
  // Passive discovery only. Auto-connect when there is exactly one MIDI USB device.
  // The OS still owns USB access permissions; never choose among multiple devices silently.
  new Handler(Looper.getMainLooper()).postDelayed(()->autoConnectUsb(),1100);
 }
 private void autoConnectUsb(){
  if(midi==null||midi.isConnected())return;
  MidiDeviceInfo[] list=midi.devices();
  if(list.length==1)midi.connect(list[0]);
  else if(list.length==0)new Handler(Looper.getMainLooper()).postDelayed(()->{
   if(midi!=null&&!midi.isConnected()){MidiDeviceInfo[] retry=midi.devices();if(retry.length==1)midi.connect(retry[0]);}
  },2000);
  else if(list.length>1)emit("status","Mais de um dispositivo USB-MIDI detectado. Selecione o XPS-10 em Conectar USB.");
 }
 private void layoutPanels(){boolean wide=getResources().getConfiguration().orientation==android.content.res.Configuration.ORIENTATION_LANDSCAPE;rootLayout.setOrientation(wide?android.widget.LinearLayout.HORIZONTAL:android.widget.LinearLayout.VERTICAL);web.setLayoutParams(new android.widget.LinearLayout.LayoutParams(wide?0:-1,wide?-1:0,1));if(cifraPanel!=null)cifraPanel.setLayoutParams(new android.widget.LinearLayout.LayoutParams(wide?0:-1,wide?-1:0,wide?1.15f:1));}
 private void showCifra(){if(cifraPanel==null){cifraPanel=new CifraPanel(this,(title,text)->{try{JSONObject data=new JSONObject();data.put("title",title);data.put("text",text);emit("webCifra",data);}catch(JSONException ignored){}},()->{rootLayout.removeView(cifraPanel);cifraPanel.destroy();cifraPanel=null;layoutPanels();});rootLayout.addView(cifraPanel);}layoutPanels();}
 @Override public void onConfigurationChanged(android.content.res.Configuration config){super.onConfigurationChanged(config);layoutPanels();web.invalidate();}
 @Override protected void onResume(){super.onResume();if(cifraPanel!=null)cifraPanel.resume();}
 private void emit(String type,Object data){runOnUiThread(()->{try{if(web!=null)web.evaluateJavascript("window.receive&&window.receive("+JSONObject.quote(type)+","+(new JSONArray().put(data).toString()+"[0]")+")",null);}catch(Exception ignored){} });}
 private void captureShare(Intent intent){if(Intent.ACTION_SEND.equals(intent.getAction())&&"text/plain".equals(intent.getType())){String text=intent.getStringExtra(Intent.EXTRA_TEXT);if(text!=null)pendingShare=text.substring(0,Math.min(text.length(),200000));}}
 @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);captureShare(intent);if(pageReady&&!pendingShare.isEmpty()){emit("sharedText",pendingShare);pendingShare="";}}
 private void directInfo(){
  try{emit("directApiState",directApi.state());}
  catch(Exception ignored){emit("status","Preferências de API indisponíveis.");}
 }
 private void gatewayInfo(){
  try{emit("jarvisGateway",jarvisGateway.state());}
  catch(Exception e){emit("status","Configuração online indisponível.");}
 }
 private void modelInfo(){
  File f=new File(getFilesDir(),"model.task");
  boolean ready=f.exists();
  boolean gemma=ready&&getPreferences(MODE_PRIVATE).getBoolean("gemma270",false);
  emit("modelInfo",ready?(gemma?"Gemma 3 270M":"Modelo local")+" instalado: "+(f.length()/1048576)+" MB. Use Testar IA.":"Nenhum modelo instalado. Instale a Gemma 3 270M pelo Grauê ou importe um .task compatível.");
  try{
   org.json.JSONObject d=new org.json.JSONObject().put("installed",ready).put("gemma270",gemma).put("size",ready?f.length():0);
   emit("gemmaState",d);
  }catch(Exception ignored){}
 }
 private LlmInference openModel(File f){return LlmInference.createFromOptions(MainActivity.this,LlmInference.LlmInferenceOptions.builder().setModelPath(f.getAbsolutePath()).setMaxTokens(1024).build());}
 private void stopPadNotes(){stopAssist();for(int key:padTokens.keySet())midi.send(0x80+(key/128),key%128,0);padTokens.clear();}
 public class Bridge {
  @JavascriptInterface public void startSequence(String json){if(json.length()>20000)return;runOnUiThread(()->{if(!armed){emit("status","Ative envio MIDI antes de iniciar a batida.");return;}try{sequencer.start(json);}catch(Exception e){emit("status",e.getMessage());}});}
  @JavascriptInterface public void stopSequence(){runOnUiThread(()->{sequencer.stop();stopPadNotes();});}
  @JavascriptInterface public void openCifra(){runOnUiThread(()->showCifra());}
  @JavascriptInterface public void importCifra(){runOnUiThread(()->{if(cifraPanel==null){showCifra();emit("status","Abra uma música no Cifra Club e toque Importar novamente.");}else cifraPanel.importCurrent();});}
  @JavascriptInterface public void showMode(boolean on){runOnUiThread(()->setRequestedOrientation(on?android.content.pm.ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE:android.content.pm.ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR));}
  @JavascriptInterface public void panic(){runOnUiThread(()->{sequencer.stop();stopPadNotes();for(int c=0;c<16;c++){midi.send(0xB0+c,64,0);midi.send(0xB0+c,123,0);}emit("status","Sustain e notas MIDI liberados em todos os canais.");});}
  /** One explicitly requested chord, bounded duration, user-selected MIDI channel. Never automatic. */
  @JavascriptInterface public void playAssistChord(String json){
   if(json==null||json.length()>200)return;
   runOnUiThread(()->{
    if(!armed){emit("status","Ative o envio MIDI para tocar o acorde de apoio.");return;}
    if(midi==null||!midi.isConnected()){emit("status","Conecte o teclado via USB-MIDI.");return;}
    try{
     JSONObject v=new JSONObject(json);
     int channel=v.optInt("channel",1),velocity=v.optInt("velocity",65),duration=v.optInt("duration",900);
     JSONArray notes=v.getJSONArray("notes");
     if(channel<1||channel>16||velocity<1||velocity>100||duration<150||duration>3000||notes.length()<1||notes.length()>5)
       throw new Exception("Limites MIDI excedidos");
     for(int i=0;i<notes.length();i++)if(notes.getInt(i)<36||notes.getInt(i)>96)throw new Exception("Nota fora da faixa segura");
     stopAssist();
     int token=++assistSerial;
     for(int i=0;i<notes.length();i++){
      int note=notes.getInt(i),key=(channel-1)*128+note;
      if(midi.send(0x90+channel-1,note,velocity))assistNotes.put(key,token);
     }
     if(assistNotes.isEmpty()){emit("status","Não foi possível transmitir o acorde MIDI.");return;}
     padHandler.postDelayed(()->{if(token==assistSerial)stopAssist();},duration);
     emit("status","Acorde MIDI enviado à parte/canal "+channel+" por até "+duration+" ms. Confira o som no teclado.");
    }catch(Exception e){stopAssist();emit("status","Acorde não enviado: "+e.getMessage());}
   });
  }
  @JavascriptInterface public void stopAssistChord(){runOnUiThread(()->stopAssist());}
  @JavascriptInterface public void padHit(int channel,int note,int velocity){runOnUiThread(()->{if(!armed){emit("status","Ative envio MIDI para tocar os pads.");return;}if(channel<1||channel>16||note<0||note>127||velocity<1||velocity>127)return;int key=(channel-1)*128+note,token=++padSerial;if(!midi.send(0x90+channel-1,note,velocity)){sequencer.stop();emit("status","Sem saída MIDI conectada.");return;}padTokens.put(key,token);padHandler.postDelayed(()->{if(Integer.valueOf(token).equals(padTokens.get(key))){midi.send(0x80+channel-1,note,0);padTokens.remove(key);}},120);});}
  @JavascriptInterface public void stopPads(){runOnUiThread(()->stopPadNotes());}

  @JavascriptInterface public void openReference(String name){runOnUiThread(()->{String url=null;if(name.equals("model"))url="https://huggingface.co/litert-community/Gemma3-1B-IT/tree/main";if(name.equals("gemmaTerms"))url="https://ai.google.dev/gemma/terms";if(name.equals("gemmaSource"))url="https://huggingface.co/72fstudio/gemma-3-270m-it";if(name.equals("effects"))url="https://static.roland.com/assets/media/pdf/XPS-10_EffectList_e01.pdf";if(name.equals("louve"))url="https://louveapp.com.br/";if(name.equals("cifra"))url="https://www.cifraclub.com.br/";if(url!=null)try{startActivity(new Intent(Intent.ACTION_VIEW,android.net.Uri.parse(url)));}catch(Exception e){emit("status","Não foi possível abrir o navegador.");}});}
  @JavascriptInterface public void testModel(){ask("Responda em português: qual a diferença entre ataque e release de um pad? Use no máximo três frases.");}

  @JavascriptInterface public void readUserTones(){runOnUiThread(()->{autoUserRead=false;xps.readUsers();});}
  @JavascriptInterface public void restoreCachedTones(){runOnUiThread(()->emitCachedUsers());}
  @JavascriptInterface public void selectToneWithVolume(int msb,int lsb,int program,int part,int volume){
   runOnUiThread(()->{
    if(volume<0||volume>127||msb<0||msb>127||lsb<0||lsb>127||program<1||program>128||part<0||part>15){emit("status","Dados inválidos para testar timbre.");return;}
    if(xps.hasPerformancePart(part))xps.auditionToneConfig(part,msb,lsb,program,volume);
    else emit("status","Para testar volume e timbre juntos, primeiro leia uma Performance válida. Não alterei a configuração.");
   });
  }
  @JavascriptInterface public void selectPerformance(int number,boolean user){
    runOnUiThread(()->{
      if(number<1||number>(user?128:16)){emit("status","Número de Performance fora da faixa.");return;}
      if(midi==null||!midi.isConnected()){emit("status","Conecte o teclado para selecionar a Performance.");return;}
      // Roland XPS-10 MIDI Implementation: USER MSB 85 / LSB 0, preset MSB 85 / LSB 64.
      boolean sent=midi.send(0xb0,0,85);
      if(sent)sent=midi.send(0xb0,32,user?0:64);
      if(sent)sent=midi.sendProgram(1,number-1);
      if(sent){
        try{emit("performanceSelected",new JSONObject().put("index",number).put("user",user));}catch(Exception ignored){}
        emit("status","Performance "+(user?"USER ":"Preset ")+number+" solicitada no canal MIDI 1.");
        new Handler(Looper.getMainLooper()).postDelayed(()->{if(midi.isConnected())xps.read();},650);
      }else emit("status","Não foi possível transmitir a seleção de Performance ao XPS-10.");
    });
  }
  @JavascriptInterface public void selectTone(int msb,int lsb,int program,int part){
   runOnUiThread(()->{
    if(msb<0||msb>127||lsb<0||lsb>127||program<1||program>128||part<0||part>=16){
     emit("status","Dados de timbre inválidos.");return;
    }
    if(xps.hasPerformancePart(part)){xps.auditionTone(part,msb,lsb,program);return;}
    // Patch mode / unverified performance: transmit a standard bank+program change
    // to the keyboard's receiving MIDI channel. This may not switch the local panel sound.
    int channel=0;
    boolean ok=midi.send(0xb0+channel,0,msb);
    if(ok)ok=midi.send(0xb0+channel,32,lsb);
    if(ok)ok=midi.sendProgram(channel+1,program-1);
    emit("status",ok?"Bank/Program enviado via canal 1. Confira o som no teclado; modo Patch pode ignorar a troca.":"Sem porta USB-MIDI de saída. Conecte o XPS-10.");
   });
  }

  @JavascriptInterface public void cancelHardware(){runOnUiThread(()->xps.cancelWrites());}
  @JavascriptInterface public void readHardware(){runOnUiThread(()->xps.read());}
  @JavascriptInterface public void editHardware(String json){if(json.length()<40000)runOnUiThread(()->xps.write(json,armed));}
  @JavascriptInterface public void undoHardware(){runOnUiThread(()->xps.undo(armed));}
  @JavascriptInterface public void connect(){runOnUiThread(()->{MidiDeviceInfo[] ds=midi.devices();if(ds.length==0){emit("status","Nenhum MIDI USB encontrado. Conecte o teclado e confira o modo USB MIDI.");return;}String[] names=new String[ds.length];for(int i=0;i<ds.length;i++)names[i]=ds[i].getProperties().getString(MidiDeviceInfo.PROPERTY_NAME,"MIDI USB");new AlertDialog.Builder(MainActivity.this).setTitle("Entrada e saída MIDI").setItems(names,(d,n)->midi.connect(ds[n])).show();});}
  @JavascriptInterface public void microphone(boolean on){runOnUiThread(()->{if(!on){audio.stop();emit("mic",false);}else if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);else{audio.start();emit("mic",audio.isRunning());}});}
  @JavascriptInterface public void arm(boolean value){runOnUiThread(()->{
  // Compatibility: connection is the only switch; no separate MIDI activation.
  armed=midi!=null&&midi.isConnected();emit("armed",armed);
 });}
  @JavascriptInterface public void cc(int channel,int controller,int value){runOnUiThread(()->{if(!armed){emit("status","Ative o envio MIDI antes de aplicar controles.");return;}if(channel<1||channel>16||value<0||value>127)return;if(controller!=7&&controller!=10&&controller!=11&&controller!=71&&controller!=72&&controller!=73&&controller!=74&&controller!=91&&controller!=93)return;emit("status",midi.send(0xB0+channel-1,controller,value)?"Controle enviado; confira o resultado no teclado.":"Sem porta MIDI de saída conectada.");});}
  @JavascriptInterface public void save(String value){if(value.length()<1000000)getPreferences(0).edit().putString("state",value).apply();}
  @JavascriptInterface public String load(){return getPreferences(0).getString("state", "{}");}
  @JavascriptInterface public void listBackups(){worker.execute(()->{try{emit("backups",backupArchive.list());}catch(Exception e){emit("status","Biblioteca: "+e.getMessage());}});}
  @JavascriptInterface public void importXpsBackups(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(i,5);});}
  @JavascriptInterface public void exportXpsBackup(String sha){worker.execute(()->{try{File file=backupArchive.fileFor(sha);backupExportSha=sha;runOnUiThread(()->startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/octet-stream").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"xps-backup-"+sha.substring(0,10)+".bin"),6));}catch(Exception e){emit("status",e.getMessage());}});}
  @JavascriptInterface public void deleteXpsBackup(String sha){worker.execute(()->{try{if(backupArchive.delete(sha)){emit("backups",backupArchive.list());emit("status","Copia local excluida. Nenhuma alteração foi feita no XPS-10.");}}catch(Exception e){emit("status",e.getMessage());}});}
  private final java.util.concurrent.atomic.AtomicBoolean gemmaBusy=new java.util.concurrent.atomic.AtomicBoolean(false);
  private final java.util.concurrent.atomic.AtomicBoolean gemmaCancel=new java.util.concurrent.atomic.AtomicBoolean(false);
  @JavascriptInterface public void installGemma(boolean accepted){
   if(!accepted){emit("status","Leia e aceite os Termos Gemma antes de instalar.");return;}
   if(!gemmaBusy.compareAndSet(false,true)){emit("status","Instalação da Gemma em andamento.");return;}
   gemmaCancel.set(false);
   worker.execute(()->{
    try{
     Gemma270Installer.install(getFilesDir(),gemmaCancel,(percent,message)->{
      try{emit("gemmaProgress",new org.json.JSONObject().put("progress",percent).put("message",message).put("busy",true));}
      catch(Exception ignored){}
     },candidate->{try(LlmInference check=openModel(candidate)){}});
     if(llm!=null){llm.close();llm=null;}
     getPreferences(MODE_PRIVATE).edit().putBoolean("gemma270",true).apply();
     modelInfo();
     emit("status","Gemma instalada. Abra o Copiloto e teste uma pergunta offline.");
     emit("gemmaProgress",new org.json.JSONObject().put("progress",100).put("busy",false).put("message","IA pronta para conversar sem internet."));
    }catch(Exception e){
     emit("status","Gemma: "+e.getMessage());
     try{emit("gemmaProgress",new org.json.JSONObject().put("progress",-1).put("busy",false).put("message",e.getMessage()));}catch(Exception ignored){}
    }finally{gemmaBusy.set(false);}
   });
  }
  @JavascriptInterface public void cancelGemma(){gemmaCancel.set(true);}
  @JavascriptInterface public void importFile(boolean model){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);if(!model)i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(i,model?3:2);});}
  @JavascriptInterface public void exportFile(String text){if(text.length()>1000000)return;runOnUiThread(()->{exportText=text;startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"copiloto-repertorio.json"),4);});}
  @JavascriptInterface public void getJarvisMemory(){
   emit("jarvisMemory",getPreferences(MODE_PRIVATE).getString("jarvisMusicalNotes",""));
  }
  @JavascriptInterface public void saveJarvisMemory(String notes){
   if(notes==null||notes.length()>JarvisMusicalProfile.MAX_NOTES){
    emit("status","As preferências do Jarvis devem ter no máximo 550 caracteres.");return;
   }
   String cleaned=JarvisMusicalProfile.cleanNotes(notes);
   getPreferences(MODE_PRIVATE).edit().putString("jarvisMusicalNotes",cleaned).apply();
   emit("jarvisMemory",cleaned);
   emit("status",cleaned.isEmpty()?"Preferências locais limpas.":"Preferências do Jarvis salvas somente neste celular.");
  }
  @JavascriptInterface public void clearJarvisMemory(){saveJarvisMemory("");}
  @JavascriptInterface public void configureDirectApi(String key,String mode,String model){
   try{
    directApi.configure(key==null?"":key,mode,model);
    directInfo();
    emit("status","Jarvis: modo de IA atualizado. Chave guardada criptografada neste aparelho.");
   }catch(Exception e){emit("status","Chave da API: "+e.getMessage());}
  }
  @JavascriptInterface public void forgetDirectApi(){directApi.clear();directInfo();emit("status","Chave local revogada do aplicativo. Revogue também em OpenAI Platform se necessário.");}
  @JavascriptInterface public void getDirectApiState(){directInfo();}
  @JavascriptInterface public void testDirectApi(){
   if(!directApi.ready()){emit("answer","Cadastre sua chave OpenAI em Ajustes para fazer o teste.");return;}
   worker.execute(()->{
    try{
     JarvisCloudGateway.Answer r=directApi.request("Você é Jarvis Musical, responda em até 12 palavras: conexão com a OpenAI funcionando.");
     emit("aiSource","OpenAI direta · "+r.model);emit("answer",r.text);
    }catch(Exception e){emit("answer","API direta: "+e.getMessage());}
   });
  }
  @JavascriptInterface public void configureJarvisOnline(String endpoint,String deviceToken,String mode,String model){
   try{
    if(deviceToken!=null&&(deviceToken.trim().startsWith("sk-")||deviceToken.trim().startsWith("sk_")))
     throw new IllegalArgumentException("Não cole a chave OpenAI no celular. Insira apenas o token próprio do seu Worker.");
    jarvisGateway.configure(endpoint,deviceToken,mode,model);
    gatewayInfo();
    emit("status","Configuração Jarvis salva no celular. A chave OpenAI permanece exclusivamente no servidor.");
   }catch(Exception e){emit("status","Configuração online: "+e.getMessage());}
  }
  @JavascriptInterface public void getJarvisOnlineStatus(){gatewayInfo();}
  @JavascriptInterface public void testJarvisOnline(){
   if(!jarvisGateway.ready()){emit("answer","Configure o endereço e o token do Worker em Ajustes.");return;}
   worker.execute(()->{
    try{
     JarvisCloudGateway.Answer result=jarvisGateway.request("Responda apenas: Jarvis online conectado.");
     emit("aiSource","Online · "+result.model);
     emit("answer",result.text);
    }catch(Exception e){emit("answer","Teste Jarvis online falhou: "+e.getMessage());}
   });
  }
  @JavascriptInterface public void ask(String prompt){
   if(prompt==null||prompt.length()>JarvisMusicalProfile.MAX_REQUEST){
    emit("answer","Encurte a pergunta para até 2400 caracteres.");return;
   }
   String notes=getPreferences(MODE_PRIVATE).getString("jarvisMusicalNotes","");
   final String prepared=JarvisMusicalProfile.buildPrompt(prompt,notes);
   worker.execute(()->{
    String directMode=directApi.mode();
    if(!"offline".equals(directMode)){
     if(directApi.ready()){
      try{
       JarvisCloudGateway.Answer answer=directApi.request(prepared);
       emit("aiSource","OpenAI direta · "+answer.model);
       emit("answer",answer.text);return;
      }catch(Exception e){
       if("online".equals(directMode)){emit("answer","API direta indisponível: "+e.getMessage()+". Altere para Automático ou Offline em Ajustes.");return;}
       emit("status","OpenAI indisponível; usando Gemma offline.");
       try{
        if(llm==null){File model=new File(getFilesDir(),"model.task");if(!model.exists())throw new IOException("Gemma não instalada.");llm=openModel(model);}
        emit("aiSource","Gemma · Offline");emit("answer",llm.generateResponse(prepared));return;
       }catch(Exception local){emit("answer","Falha na API e na Gemma: "+local.getMessage());return;}
      }
     }else if("online".equals(directMode)){emit("answer","Cadastre sua chave OpenAI em Ajustes.");return;}
    }
    // An explicit preference in the app always overrides a legacy server configuration.
    String mode=directApi.selected()?"offline":jarvisGateway.mode();
    if(!"offline".equals(mode)&&jarvisGateway.ready()){
     try{
      JarvisCloudGateway.Answer result=jarvisGateway.request(prepared);
      emit("aiSource","Online · "+result.model);
      emit("answer",result.text);return;
     }catch(Exception e){
      if("online".equals(mode)){
       emit("answer","Jarvis online indisponível: "+e.getMessage()+". Troque para Automático ou Offline em Ajustes.");
       return;
      }
      emit("status","Rede/API indisponível. Tentando Gemma local.");
     }
    }else if("online".equals(mode)){
     emit("answer","Configure o endereço seguro do Worker e o token do dispositivo antes de usar Jarvis Online.");
     return;
    }
    try{
     if(llm==null){
      File model=new File(getFilesDir(),"model.task");
      if(!model.exists()){
       emit("answer","Gemma offline ainda não instalada. Instale-a em Ajustes; o guia de cifras e favoritos continua disponível.");return;
      }
      llm=openModel(model);
     }
     emit("aiSource","Gemma · Offline");
     emit("answer",llm.generateResponse(prepared));
    }catch(Exception e){emit("answer","A IA local não respondeu: "+e.getMessage());}
   });
  }
 }
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==1&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED){audio.start();emit("mic",audio.isRunning());}else emit("status","Microfone não autorizado.");}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(result!=RESULT_OK||data==null)return;worker.execute(()->{try{
 if(req==5){java.util.List<android.net.Uri> uris=new java.util.ArrayList<>();if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}else if(data.getData()!=null)uris.add(data.getData());emit("backups",backupArchive.importFiles(uris));emit("status","Backups copiados para a biblioteca. Originais preservados; formato ainda não interpretado.");return;}
 if(req==6){File source=backupArchive.fileFor(backupExportSha);try(InputStream in=new FileInputStream(source);OutputStream out=getContentResolver().openOutputStream(data.getData())){if(out==null)throw new IOException("Arquivo de destino indisponivel");byte[] buf=new byte[16384];int n;while((n=in.read(buf))!=-1)out.write(buf,0,n);}emit("status","Backup original exportado sem modificações.");return;}
 if(req==4){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(exportText.getBytes(java.nio.charset.StandardCharsets.UTF_8));}emit("status","Repertório exportado.");return;}if(req==3){if(llm!=null){llm.close();llm=null;}ModelImport.install(getContentResolver().openInputStream(data.getData()),getFilesDir(),candidate->{emit("modelInfo","Pacote .task verificado. Carregando a IA no aparelho…");try(LlmInference check=openModel(candidate)){}},total->emit("modelInfo","Copiando modelo: "+(total/1048576)+" MB…"));File oldTemp=new File(getFilesDir(),"model.tmp");if(oldTemp.exists())oldTemp.delete();getPreferences(MODE_PRIVATE).edit().putBoolean("gemma270",false).apply();modelInfo();emit("status","Modelo carregado com sucesso na verificação. Use Testar IA para testar uma resposta.");}else{java.util.List<android.net.Uri> uris=new java.util.ArrayList<>();if(data.getClipData()!=null){if(data.getClipData().getItemCount()>100)throw new IOException("Selecione até 100 arquivos por lote");for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}else uris.add(data.getData());for(android.net.Uri uri:uris){try(InputStream in=getContentResolver().openInputStream(uri);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(out.size()+n>1000000)throw new IOException("Arquivo maior que 1 MB");out.write(b,0,n);}emit("import",out.toString("UTF-8"));}catch(Exception error){emit("status","Um arquivo do lote falhou: "+error.getMessage());}}}}catch(Exception e){emit("status","Falha no arquivo: "+e.getMessage());if(req==3){String detail=String.valueOf(e.getMessage());emit("modelInfo","Importação não concluída. "+(detail.contains("Error building tflite model")?"O pacote passou na verificação, mas o runtime não conseguiu carregar o modelo. Informe o nome exato do arquivo e esta mensagem.":detail)+" O modelo anterior, se havia, foi preservado.");}}});}
 @Override protected void onStop(){super.onStop();if(cifraPanel!=null)cifraPanel.pause();sequencer.stop();stopPadNotes();audio.stop();xps.cancelWrites();armed=false;emit("armed",false);emit("mic",false);emit("pause","");emit("clear","");}
 @Override protected void onDestroy(){if(cifraPanel!=null)cifraPanel.destroy();midi.close();audio.stop();worker.execute(()->{if(llm!=null)llm.close();});worker.shutdown();web.destroy();web=null;xps.reset();super.onDestroy();}
}
