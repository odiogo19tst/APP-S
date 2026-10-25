package br.com.doapps.grauelive;

import android.content.Context;
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.net.Uri;
import android.provider.OpenableColumns;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
/** Custom sample pads played by the Android audio output, never by MIDI. */
public final class LocalPadLibrary implements AutoCloseable {
 public interface Listener {void status(String msg);}
 private final Context context;private final Listener events;private final File folder,index;
 private final SoundPool pool;
 private final Map<String,Integer> sounds=new HashMap<>();
 private final Set<Integer> ready=new HashSet<>(),pending=new HashSet<>();
 private static final Set<String> BANKS=new HashSet<>(Arrays.asList("drums","efx","worship-drums","worship-efx"));
 private static final int MAX=10*1024*1024;
 public LocalPadLibrary(Context ctx,Listener listener){
  context=ctx.getApplicationContext();events=listener;
  folder=new File(context.getFilesDir(),"graue-pad-library");folder.mkdirs();index=new File(folder,"pads.json");
  AudioAttributes a=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
  pool=new SoundPool.Builder().setMaxStreams(8).setAudioAttributes(a).build();
  pool.setOnLoadCompleteListener((p,id,status)->{
   synchronized(LocalPadLibrary.this){
    if(status==0){ready.add(id);if(pending.remove(id))pool.play(id,1f,1f,1,0,1f);}
    else{pending.remove(id);events.status("Amostra não pôde ser carregada. Use WAV/MP3 curto.");}
   }
  });
 }
 private static void validate(String bank,int slot){if(!BANKS.contains(bank)||slot<0||slot>7)throw new IllegalArgumentException("Banco ou pad inválido");}
 private JSONObject load()throws Exception {
  if(!index.isFile())return new JSONObject();
  try(InputStream in=new FileInputStream(index)){
   byte[] b=new byte[(int)Math.min(index.length(),120000)];int n=in.read(b);return new JSONObject(new String(b,0,Math.max(0,n),StandardCharsets.UTF_8));
  }
 }
 private void persist(JSONObject o)throws Exception {
  File tmp=new File(folder,"pads.json.tmp");
  try(OutputStream out=new FileOutputStream(tmp)){out.write(o.toString().getBytes(StandardCharsets.UTF_8));}
  if(index.exists()&&!index.delete())throw new IOException("Índice ocupado");
  if(!tmp.renameTo(index))throw new IOException("Não foi possível salvar os pads");
 }
 public synchronized JSONObject library() throws Exception {return load();}
 private String fileName(Uri uri) throws Exception {
  try(Cursor c=context.getContentResolver().query(uri,null,null,null,null)){
   if(c!=null&&c.moveToFirst()){int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(i>=0)return c.getString(i);}
  }
  return "amostra";
 }
 public synchronized JSONObject importAudio(Uri uri,String bank,int slot)throws Exception {
  validate(bank,slot);
  String original=fileName(uri);
  if(original==null)original="amostra";
  String lower=original.toLowerCase(java.util.Locale.ROOT);
  String suffix=lower.endsWith(".wav")?".wav":lower.endsWith(".mp3")?".mp3":lower.endsWith(".ogg")?".ogg":null;
  if(suffix==null)throw new IOException("Use WAV, MP3 ou OGG para os samples do Android.");
  File temp=File.createTempFile("pad-",".tmp",folder);
  int size=0;try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temp)){
   if(in==null)throw new IOException("Arquivo não acessível");
   byte[] buffer=new byte[16384];int n;
   while((n=in.read(buffer))!=-1){size+=n;if(size>MAX)throw new IOException("Amostra acima de 10 MB");out.write(buffer,0,n);}
  }catch(Exception e){temp.delete();throw e;}
  if(size==0){temp.delete();throw new IOException("Amostra vazia");}
  String key=bank+"-"+slot;
  File dest=new File(folder,key+suffix);
  JSONObject catalog=load();
  JSONObject old=catalog.optJSONObject(key);
  int oldSound=sounds.containsKey(key)?sounds.remove(key):0;
  if(oldSound!=0){ready.remove(oldSound);pending.remove(oldSound);pool.unload(oldSound);}
  if(dest.exists()&&!dest.delete()){temp.delete();throw new IOException("Não foi possível substituir sample");}
  if(!temp.renameTo(dest)){temp.delete();throw new IOException("Falha ao guardar o áudio");}
  JSONObject entry=new JSONObject().put("name",original.substring(0,Math.min(85,original.length()))).put("file",dest.getName()).put("bytes",size);
  catalog.put(key,entry);persist(catalog);
  if(old!=null&&!old.optString("file").equals(dest.getName()))new File(folder,old.optString("file")).delete();
  events.status("Sample salvo em "+bank+" / pad "+(slot+1)+". O som tocará no celular, não no XPS-10 via MIDI.");
  return catalog;
 }
 public synchronized void play(String bank,int slot)throws Exception {
  validate(bank,slot);String key=bank+"-"+slot;
  JSONObject entry=load().optJSONObject(key);
  if(entry==null){events.status("Pad vazio. Toque em Importar e escolha um áudio próprio.");return;}
  File f=new File(folder,entry.optString("file"));
  if(!f.isFile()||!f.getCanonicalPath().startsWith(folder.getCanonicalPath()+File.separator))throw new IOException("Arquivo do pad não encontrado.");
  Integer id=sounds.get(key);
  if(id==null){
   id=pool.load(f.getAbsolutePath(),1);
   if(id==0)throw new IOException("Arquivo de áudio não suportado");
   sounds.put(key,id);pending.add(id);
   return;
  }
  if(ready.contains(id))pool.play(id,1f,1f,1,0,1f);else pending.add(id);
 }
 @Override public synchronized void close(){pool.release();ready.clear();pending.clear();sounds.clear();}
}
