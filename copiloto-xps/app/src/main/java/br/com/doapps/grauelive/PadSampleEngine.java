package br.com.doapps.grauelive;

import android.content.Context;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.SoundPool;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.database.Cursor;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** Independent audio pad libraries. Built-in samples are original synthesized WAV files.
 * User audio stays private to this Android app, never transferred over USB-MIDI. */
public final class PadSampleEngine {
 public static final int BANKS=5, PADS=8;
 private static final String[] NAMES={"Drum Kit 1 (Grauê)","EFX 1 (Grauê)","Worship Drums (Grauê)","Worship EFX (Grauê)","Meus Samples"};
 private static final String[][] LABELS={
  {"Kick 1","Snare 1","Hi-Hat","Clap","Tom Low","Tom High","Crash","Ride"},
  {"Impact","Sweep Up","Sweep Down","Pulse","Spark","Hit","Riser","Sub Drop"},
  {"Worship Kick","Worship Snare","Worship Hat","Soft Clap","Worship Tom","Shaker","Soft Crash","Tambourine"},
  {"Cinematic Hit","Ambient Sweep","Reverse Sweep","Soft Pulse","Sparkle","Transition","Worship Riser","Deep Boom"},
  {"Sample 1","Sample 2","Sample 3","Sample 4","Sample 5","Sample 6","Sample 7","Sample 8"}
 };
 private final Context ctx;
 private final SharedPreferences prefs;
 private final File root;
 private final SoundPool pool;
 private final int[][] sampleIds=new int[BANKS][PADS];
 private final boolean[][] loaded=new boolean[BANKS][PADS];
 private final Set<Integer> streams=Collections.newSetFromMap(new ConcurrentHashMap<Integer,Boolean>());
 private volatile boolean ready=false;
 public PadSampleEngine(Context context){
  ctx=context.getApplicationContext();
  prefs=ctx.getSharedPreferences("graue_pad_library_1",Context.MODE_PRIVATE);
  root=new File(ctx.getFilesDir(),"graue-pad-samples");root.mkdirs();
  pool=new SoundPool.Builder().setMaxStreams(12).setAudioAttributes(new AudioAttributes.Builder()
   .setUsage(AudioAttributes.USAGE_GAME).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build()).build();
  pool.setOnLoadCompleteListener((sound,id,result)->{
   synchronized(PadSampleEngine.this){
    for(int b=0;b<BANKS;b++)for(int p=0;p<PADS;p++)if(sampleIds[b][p]==id)loaded[b][p]=result==0;
   }
  });
 }
 public synchronized void prepare()throws Exception {
  for(int b=0;b<BANKS;b++)for(int p=0;p<PADS;p++){
   File file=soundFile(b,p);
   if(file==null&&b<4){
    file=new File(root,"graue_"+b+"_"+p+".wav");
    if(!file.isFile()||file.length()<44)createWave(file,b,p);
   }
   if(file!=null&&file.isFile())load(b,p,file);
  }
  ready=true;
 }
 private File soundFile(int bank,int pad){
  String name=prefs.getString("slot_"+bank+"_"+pad,"");
  if(!name.matches("pad_[0-4]_[0-7]\\.(?:wav|mp3|ogg)"))return null;
  File f=new File(root,name);
  return f.isFile()?f:null;
 }
 private synchronized void load(int bank,int pad,File file){
  if(sampleIds[bank][pad]!=0)pool.unload(sampleIds[bank][pad]);
  loaded[bank][pad]=false;
  sampleIds[bank][pad]=pool.load(file.getAbsolutePath(),1);
 }
 public synchronized JSONObject state() throws Exception {
  JSONObject object=new JSONObject().put("ready",ready);
  JSONArray banks=new JSONArray();
  for(int b=0;b<BANKS;b++){
   JSONObject bank=new JSONObject().put("id",b).put("name",NAMES[b]);
   JSONArray pads=new JSONArray();
   for(int p=0;p<PADS;p++){
    boolean custom=soundFile(b,p)!=null;
    String display=custom?prefs.getString("label_"+b+"_"+p,"Sample personalizado"):LABELS[b][p];
    pads.put(new JSONObject().put("index",p).put("label",display)
       .put("source",custom?"importado":b<4?"original Graue":"vazio")
       .put("available",custom||b<4).put("loaded",loaded[b][p]));
   }
   bank.put("pads",pads);banks.put(bank);
  }
  return object.put("banks",banks);
 }
 public synchronized String play(int bank,int pad,int velocity) {
  if(bank<0||bank>=BANKS||pad<0||pad>=PADS||velocity<1||velocity>127)return "Pad inválido.";
  int sound=sampleIds[bank][pad];
  if(sound==0)return bank==4?"Este pad está vazio. Importe um WAV ou MP3.":"Biblioteca ainda preparando áudio.";
  if(!loaded[bank][pad])return "Sample carregando; tente novamente.";
  float gain=Math.min(1f,velocity/100f);
  int stream=pool.play(sound,gain,gain,1,0,1f);
  if(stream==0)return "Saída de áudio do celular indisponível.";
  streams.add(stream);
  return "";
 }
 public synchronized void stop(){for(int stream:streams)pool.stop(stream);streams.clear();}
 public synchronized void release(){stop();pool.release();}
 public synchronized void importSample(int bank,int pad,Uri uri)throws Exception{
  if(bank<0||bank>=BANKS||pad<0||pad>=PADS)throw new IOException("Banco ou pad inválido");
  String mime=ctx.getContentResolver().getType(uri);
  if(mime==null)throw new IOException("Tipo de arquivo desconhecido. Use WAV, MP3 ou OGG.");
  String ext=mime.contains("mpeg")||mime.contains("mp3")?"mp3":mime.contains("ogg")?"ogg":mime.contains("wav")||mime.contains("wave")?"wav":"";
  if(ext.isEmpty())throw new IOException("Formato não aceito. Use WAV, MP3 ou OGG.");
  File temp=File.createTempFile("pad_import_","."+ext,root);
  long size=0;
  try(InputStream in=ctx.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temp)){
   if(in==null)throw new IOException("Arquivo de áudio inacessível");
   byte[] buf=new byte[16384];int n;
   while((n=in.read(buf))!=-1){size+=n;if(size>12L*1024*1024)throw new IOException("Sample acima de 12 MB");out.write(buf,0,n);}
  }catch(Exception e){temp.delete();throw e;}
  if(size<64){temp.delete();throw new IOException("Áudio vazio ou muito curto");}
  String newName="pad_"+bank+"_"+pad+"."+ext;
  File dest=new File(root,newName);
  if(!temp.renameTo(dest)){
   try(InputStream in=new FileInputStream(temp);OutputStream out=new FileOutputStream(dest)){
    byte[] data=new byte[16384];int n;while((n=in.read(data))!=-1)out.write(data,0,n);
   }finally{temp.delete();}
  }
  String oldName=prefs.getString("slot_"+bank+"_"+pad,"");
  if(!oldName.isEmpty()&&!oldName.equals(newName))new File(root,oldName).delete();
  String title="Meu sample";
  try(Cursor cursor=ctx.getContentResolver().query(uri,null,null,null,null)){
   if(cursor!=null&&cursor.moveToFirst()){
    int col=cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
    if(col>=0)title=cursor.getString(col);
   }
  }catch(Exception ignored){}
  if(title==null||title.isBlank())title="Meu sample";
  if(title.length()>40)title=title.substring(0,40);
  if(!prefs.edit().putString("slot_"+bank+"_"+pad,newName).putString("label_"+bank+"_"+pad,title).commit())
    throw new IOException("Não foi possível guardar este sample");
  load(bank,pad,dest);
 }
 // Deterministic ORIGINAL generated percussion and FX (not copied Roland or 3rd-party packs).
 private void createWave(File out,int bank,int pad)throws Exception{
  final int rate=22050,frames=(int)(rate*(bank%2==0?.54:.86));
  Random random=new Random(9613+bank*100+pad*17);
  try(OutputStream file=new BufferedOutputStream(new FileOutputStream(out))){
   writeString(file,"RIFF");le32(file,36+frames*2);writeString(file,"WAVEfmt ");
   le32(file,16);le16(file,1);le16(file,1);le32(file,rate);le32(file,rate*2);le16(file,2);le16(file,16);
   writeString(file,"data");le32(file,frames*2);
   final boolean fx=(bank==1||bank==3);
   for(int i=0;i<frames;i++){
    double t=i/(double)rate,progress=i/(double)frames;
    double noise=random.nextDouble()*2-1;
    double pitch,env,x;
    if(fx){
     pitch=(pad==7?42:pad==5?220:pad==3?115:430)*(pad==1||pad==6?.45+progress*2.8:1.4-progress*.75);
     env=pad==1||pad==6?Math.min(1,progress*3)*Math.pow(1-progress,1.25):Math.exp(-progress*(pad==4?4:7));
     x=Math.sin(2*Math.PI*pitch*t)*.65+noise*(pad==4?.48:.28);
    }else{
     int family=pad;
     pitch=family==0?55+95*Math.exp(-t*28):family==4?100+120*Math.exp(-t*12):family==5?180+70*Math.exp(-t*9):190;
     env=Math.exp(-t*(family==6||family==7?7:family==2?35:family==0?14:20));
     x=family==0||family==4||family==5?Math.sin(2*Math.PI*pitch*t)*.8+noise*.2:
       family==2||family==6||family==7?noise*.8+Math.sin(2*Math.PI*710*t)*.17:
       Math.sin(2*Math.PI*180*t)*.19+noise*.76;
    }
    double value=Math.max(-1,Math.min(1,x*env*.77));
    short sample=(short)Math.round(value*32760);le16(file,sample&65535);
   }
  }
 }
 private static void writeString(OutputStream stream,String value)throws IOException{stream.write(value.getBytes("US-ASCII"));}
 private static void le16(OutputStream stream,int value)throws IOException{stream.write(value&255);stream.write((value>>>8)&255);}
 private static void le32(OutputStream stream,int value)throws IOException{le16(stream,value&65535);le16(stream,(value>>>16)&65535);}
}
