package br.com.doapps.grauelive;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.database.Cursor;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.util.Locale;

/** Eight user-owned audio pads: playback is through the Android audio output, NOT USB MIDI. */
public final class DrumSampleLibrary {
 private final Context context;
 private final File directory;
 private final android.content.SharedPreferences prefs;
 private final SoundPool sounds;
 private final int[] soundIds=new int[8];
 private final boolean[] loaded=new boolean[8];
 public DrumSampleLibrary(Context owner){
  context=owner.getApplicationContext();
  directory=new File(context.getFilesDir(),"drum-samples");directory.mkdirs();
  prefs=context.getSharedPreferences("graue-drums-audio",Context.MODE_PRIVATE);
  AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
  sounds=new SoundPool.Builder().setMaxStreams(8).setAudioAttributes(attrs).build();
  sounds.setOnLoadCompleteListener((pool,sampleId,status)->{
   for(int i=0;i<8;i++)if(soundIds[i]==sampleId)loaded[i]=(status==0);
  });
  for(int i=0;i<8;i++)if(new File(directory,i+".audio").isFile())load(i);
 }
 private void load(int slot){
  if(soundIds[slot]!=0)sounds.unload(soundIds[slot]);
  loaded[slot]=false;
  File f=new File(directory,slot+".audio");
  soundIds[slot]=f.exists()?sounds.load(f.getAbsolutePath(),1):0;
 }
 public JSONArray list() throws Exception {
  JSONArray list=new JSONArray();
  for(int i=0;i<8;i++){
   File file=new File(directory,i+".audio");
   list.put(new JSONObject().put("index",i).put("exists",file.isFile())
     .put("name",prefs.getString("slot-"+i,"")).put("ready",loaded[i])
     .put("bytes",file.isFile()?file.length():0));
  }
  return list;
 }
 private static String filename(Context ctx,Uri uri) {
  String name="Sample de áudio";
  try(Cursor cursor=ctx.getContentResolver().query(uri,null,null,null,null)){
   if(cursor!=null&&cursor.moveToFirst()){
    int col=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
    if(col>=0){String given=cursor.getString(col);if(given!=null&&!given.isBlank())name=given;}
   }
  }catch(Exception ignored){}
  StringBuilder safe=new StringBuilder();
  for(int i=0;i<name.length()&&safe.length()<96;i++){
   char c=name.charAt(i);safe.append(Character.isISOControl(c)||c=='/'||c=='\\'?'_':c);
  }
  return safe.toString();
 }
 public void importFile(int slot,Uri uri) throws Exception {
  if(slot<0||slot>=8||uri==null)throw new IOException("Pad inválido");
  String name=filename(context,uri),lower=name.toLowerCase(Locale.ROOT);
  if(!(lower.endsWith(".mp3")||lower.endsWith(".wav")||lower.endsWith(".ogg")))
   throw new IOException("Escolha um áudio MP3, WAV ou OGG. Não aceita projetos de outros aplicativos.");
  File tmp=File.createTempFile("sample-",".tmp",directory);
  long total=0;
  try(InputStream in=context.getContentResolver().openInputStream(uri);
      OutputStream out=new BufferedOutputStream(new FileOutputStream(tmp))){
   if(in==null)throw new IOException("O arquivo selecionado não está acessível");
   byte[] buf=new byte[16384];int n;
   while((n=in.read(buf))!=-1){total+=n;if(total>12L*1024*1024)throw new IOException("Limite de 12 MB por sample");out.write(buf,0,n);}
  }catch(Exception e){tmp.delete();throw e;}
  if(total==0){tmp.delete();throw new IOException("Sample vazio");}
  File target=new File(directory,slot+".audio");
  if(target.exists()&&!target.delete()){tmp.delete();throw new IOException("Não foi possível substituir a cópia antiga");}
  if(!tmp.renameTo(target)){tmp.delete();throw new IOException("Não foi possível salvar o áudio");}
  prefs.edit().putString("slot-"+slot,name).apply();
  load(slot);
 }
 public boolean play(int slot){
  if(slot<0||slot>=8||!loaded[slot]||soundIds[slot]==0)return false;
  return sounds.play(soundIds[slot],1f,1f,1,0,1f)!=0;
 }
 public void stop(){sounds.autoPause();}
 public void close(){sounds.release();}
}
