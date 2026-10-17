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
 private WebView web; private UsbMidi midi; private AudioAnalyzer audio; private boolean armed=false;
 private final ExecutorService worker=Executors.newSingleThreadExecutor(); private LlmInference llm; private String exportText="";
 @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().addFlags(128);
  web=new WebView(this);setContentView(web);web.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});WebSettings s=web.getSettings();s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);s.setAllowFileAccess(false);s.setAllowContentAccess(false);
  web.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,android.webkit.WebResourceRequest req){return true;}});
  web.addJavascriptInterface(new Bridge(),"Native");
  midi=new UsbMidi(this,new UsbMidi.Listener(){public void status(String t){emit("status",t);emit("clear","");armed=false;emit("armed",false);}public void event(int s,int a,int b){try{emit("midi",new JSONArray(new int[]{s,a,b}));}catch(Exception ignored){}}});
  audio=new AudioAnalyzer(new AudioAnalyzer.Callback(){public void onError(String t){emit("status",t);}public void onResult(PitchDetector.Result p,MusicBrain.Harmony h){try{JSONObject o=new JSONObject();o.put("root",h.root);o.put("mode",h.mode);o.put("confidence",h.confidence);o.put("midi",p.midi);o.put("rms",p.rms);emit("audio",o);}catch(Exception ignored){}}});
  web.loadUrl("file:///android_asset/index.html");
 }
 private void emit(String type,Object data){runOnUiThread(()->{try{if(web!=null)web.evaluateJavascript("window.receive&&window.receive("+JSONObject.quote(type)+","+JSONObject.valueToString(data)+")",null);}catch(Exception ignored){} });}
 public class Bridge {
  @JavascriptInterface public void connect(){runOnUiThread(()->{MidiDeviceInfo[] ds=midi.devices();if(ds.length==0){emit("status","Nenhum MIDI USB encontrado. Conecte o teclado e confira o modo USB MIDI.");return;}String[] names=new String[ds.length];for(int i=0;i<ds.length;i++)names[i]=ds[i].getProperties().getString(MidiDeviceInfo.PROPERTY_NAME,"MIDI USB");new AlertDialog.Builder(MainActivity.this).setTitle("Entrada e saída MIDI").setItems(names,(d,n)->midi.connect(ds[n])).show();});}
  @JavascriptInterface public void microphone(boolean on){runOnUiThread(()->{if(!on){audio.stop();emit("mic",false);}else if(checkSelfPermission(Manifest.permission.RECORD_AUDIO)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO},1);else{audio.start();emit("mic",audio.isRunning());}});}
  @JavascriptInterface public void arm(boolean value){runOnUiThread(()->{armed=value;emit("armed",armed);});}
  @JavascriptInterface public void cc(int channel,int controller,int value){runOnUiThread(()->{if(!armed){emit("status","Ative o envio MIDI antes de aplicar controles.");return;}if(channel<1||channel>16||value<0||value>127)return;if(controller!=7&&controller!=10&&controller!=11&&controller!=71&&controller!=72&&controller!=73&&controller!=74&&controller!=91&&controller!=93)return;emit("status",midi.send(0xB0+channel-1,controller,value)?"Controle enviado; confira o resultado no teclado.":"Sem porta MIDI de saída conectada.");});}
  @JavascriptInterface public void save(String value){if(value.length()<1000000)getPreferences(0).edit().putString("state",value).apply();}
  @JavascriptInterface public String load(){return getPreferences(0).getString("state", "{}");}
  @JavascriptInterface public void importFile(boolean model){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,model?3:2);});}
  @JavascriptInterface public void exportFile(String text){if(text.length()>1000000)return;runOnUiThread(()->{exportText=text;startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,"copiloto-repertorio.json"),4);});}
  @JavascriptInterface public void ask(String prompt){if(prompt.length()>6000)return;worker.execute(()->{try{if(llm==null){File model=new File(getFilesDir(),"model.task");if(!model.exists()){emit("answer","Importe um modelo compatível .task em Ajustes para conversar com a IA neural offline. O guia musical funciona sem modelo.");return;}emit("answer","Carregando IA no aparelho…");llm=LlmInference.createFromOptions(MainActivity.this,LlmInference.LlmInferenceOptions.builder().setModelPath(model.getAbsolutePath()).setMaxTokens(2048).build());}emit("answer",llm.generateResponse("Você é um assistente musical em português. Dê sugestões curtas e explique incertezas. Não afirme ter aplicado comandos. XPS-10: CC74 cutoff, CC71 ressonância, CC73 attack, CC72 release (64 neutro), CC91 reverb, CC93 chorus. Não invente endereços SysEx. Contexto e pergunta: "+prompt));}catch(Exception e){emit("answer","Não foi possível executar o modelo: "+e.getMessage());}});}
 }
 @Override public void onRequestPermissionsResult(int r,String[] p,int[] g){super.onRequestPermissionsResult(r,p,g);if(r==1&&g.length>0&&g[0]==PackageManager.PERMISSION_GRANTED){audio.start();emit("mic",audio.isRunning());}else emit("status","Microfone não autorizado.");}
 @Override protected void onActivityResult(int req,int result,Intent data){super.onActivityResult(req,result,data);if(result!=RESULT_OK||data==null)return;worker.execute(()->{try{if(req==4){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(exportText.getBytes(java.nio.charset.StandardCharsets.UTF_8));}emit("status","Repertório exportado.");return;}if(req==3){if(llm!=null){llm.close();llm=null;}File temp=new File(getFilesDir(),"model.tmp");try(InputStream in=getContentResolver().openInputStream(data.getData());OutputStream out=new FileOutputStream(temp)){byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);}File dest=new File(getFilesDir(),"model.task");if(!temp.renameTo(dest))throw new IOException("Falha ao salvar modelo");emit("status","Modelo importado. A compatibilidade será verificada na primeira pergunta.");}else{try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[4096];int n;while((n=in.read(b))!=-1){if(out.size()+n>1000000)throw new IOException("Arquivo maior que 1 MB");out.write(b,0,n);}emit("import",out.toString("UTF-8"));}}}catch(Exception e){emit("status","Falha no arquivo: "+e.getMessage());}});}
 @Override protected void onStop(){super.onStop();audio.stop();armed=false;emit("armed",false);emit("mic",false);emit("pause","");emit("clear","");}
 @Override protected void onDestroy(){midi.close();audio.stop();worker.execute(()->{if(llm!=null)llm.close();});worker.shutdown();web.destroy();web=null;super.onDestroy();}
}
