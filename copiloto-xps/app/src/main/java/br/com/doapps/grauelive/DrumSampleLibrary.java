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
 private final Runnable onSampleLoaded;
 private final int[] soundIds=new int[16];
 private final boolean[] loaded=new boolean[16];
 private static final String[] EXTENSIONS={".wav",".mp3",".ogg"};
 private int pos(int bank,int slot){if(bank<2||bank>3||slot<0||slot>7)throw new IllegalArgumentException("Banco de samples inválido");return (bank-2)*8+slot;}
 private File findFile(int index){for(String ext:EXTENSIONS){File f=new File(directory,index+ext);if(f.isFile())return f;}return null;}
 public DrumSampleLibrary(Context owner,Runnable onLoaded){
  onSampleLoaded=onLoaded;
  context=owner.getApplicationContext();
  directory=new File(context.getFilesDir(),"drum-samples");directory.mkdirs();
  prefs=context.getSharedPreferences("graue-drums-audio",Context.MODE_PRIVATE);
  AudioAttributes attrs=new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build();
  sounds=new SoundPool.Builder().setMaxStreams(8).setAudioAttributes(attrs).build();
  sounds.setOnLoadCompleteListener((pool,sampleId,status)->{
   for(int i=0;i<16;i++)if(soundIds[i]==sampleId)loaded[i]=(status==0);
   if(onSampleLoaded!=null)onSampleLoaded.run();
  });
  for(int i=0;i<16;i++)if(findFile(i)!=null)load(i);
 }
 private void load(int slot){
  if(soundIds[slot]!=0)sounds.unload(soundIds[slot]);
  loaded[slot]=false;
  File f=findFile(slot);
  soundIds[slot]=f!=null?sounds.load(f.getAbsolutePath(),1):0;
 }
 public JSONArray list(int bank) throws Exception {
  JSONArray list=new JSONArray();
  for(int slot=0;slot<8;slot++){
   int index=pos(bank,slot);File file=findFile(index);
   list.put(new JSONObject().put("index",slot).put("bank",bank).put("exists",file!=null)
     .put("name",prefs.getString("slot-"+index,"")).put("ready",loaded[index])
     .put("bytes",file!=null?file.length():0));
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
 public void importFile(int bank,int slot,Uri uri) throws Exception {
  int index=pos(bank,slot);
  if(uri==null)throw new IOException("Pad inválido");
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
  String ext=lower.substring(lower.lastIndexOf('.'));
  File target=new File(directory,index+ext);
  for(String other:EXTENSIONS){File previous=new File(directory,index+other);
   if(previous.exists()&&!previous.delete()){tmp.delete();throw new IOException("Não foi possível atualizar o sample anterior");}
  }
  if(!tmp.renameTo(target)){tmp.delete();throw new IOException("Não foi possível salvar o áudio");}
  prefs.edit().putString("slot-"+index,name).apply();
  load(index);
 }
 public boolean play(int bank,int slot){
  int index=pos(bank,slot);
  if(!loaded[index]||soundIds[index]==0)return false;
  return sounds.play(soundIds[index],1f,1f,1,0,1f)!=0;
 }
 public void stop(){sounds.autoPause();}
 public void close(){sounds.release();}
}
