package br.com.doapps.grauelive;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.SoundPool;
import java.io.*;

/**
 * Twelve independently playable, original synthesized notes C4..B4.
 * The phone makes the audio itself: not Roland samples and not USB-MIDI audio.
 * PCM/WAV generated on the device, no third-party audio assets or network required.
 */
public final class ChromaticPadEngine {
 private static final int COUNT=12, RATE=22050;
 private final SoundPool pool;
 private final File folder;
 private final int[] sounds=new int[COUNT],streams=new int[COUNT];
 private final boolean[] loaded=new boolean[COUNT];
 private boolean prepared=false;

 public ChromaticPadEngine(Context ctx){
  folder=new File(ctx.getFilesDir(),"graue-chromatic");folder.mkdirs();
  pool=new SoundPool.Builder().setMaxStreams(COUNT)
   .setAudioAttributes(new AudioAttributes.Builder()
    .setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()).build();
  pool.setOnLoadCompleteListener((sp,id,status)->{
   synchronized(ChromaticPadEngine.this){
    for(int i=0;i<COUNT;i++)if(sounds[i]==id)loaded[i]=status==0;
   }
  });
 }
 private static void le16(OutputStream o,int v)throws IOException{o.write(v&255);o.write((v>>>8)&255);}
 private static void le32(OutputStream o,int v)throws IOException{le16(o,v);le16(o,v>>>16);}
 private static void wav(File output,int semitone)throws IOException{
  int frames=RATE*2;
  double hz=261.6255653*Math.pow(2,semitone/12.0);
  try(OutputStream o=new BufferedOutputStream(new FileOutputStream(output))){
   o.write(new byte[]{'R','I','F','F'});le32(o,36+frames*2);
   o.write(new byte[]{'W','A','V','E','f','m','t',' '});
   le32(o,16);le16(o,1);le16(o,1);le32(o,RATE);le32(o,RATE*2);le16(o,2);le16(o,16);
   o.write(new byte[]{'d','a','t','a'});le32(o,frames*2);
   for(int i=0;i<frames;i++){
    double time=i/(double)RATE;
    double attack=Math.min(1,time/0.018);
    double fade=Math.min(1,(frames-i)/(double)(RATE*0.32));
    double envelope=attack*fade;
    // Original warm organ-pad, fundamental + low harmonics. No sampled/copyright audio.
    double wave=.68*Math.sin(2*Math.PI*hz*time)
      +.22*Math.sin(2*Math.PI*hz*2*time)+.10*Math.sin(2*Math.PI*hz*3*time);
    int pcm=(int)Math.round(Math.max(-1,Math.min(1,wave*envelope*.53))*32767);
    le16(o,pcm);
   }
  }
 }
 public synchronized void prepare() throws Exception {
  for(int i=0;i<COUNT;i++){
   File f=new File(folder,"graue_note_"+i+".wav");
   if(!f.exists()||f.length()<RATE*2)wav(f,i);
   sounds[i]=pool.load(f.getAbsolutePath(),1);
  }
  prepared=true;
 }
 public synchronized String noteOn(int semitone,int velocity){
  if(semitone<0||semitone>=COUNT||velocity<1||velocity>127)return "Nota ou intensidade inválida.";
  if(!prepared||sounds[semitone]==0||!loaded[semitone])return "Notas do celular ainda carregando. Tente novamente.";
  if(streams[semitone]!=0)pool.stop(streams[semitone]);
  float gain=Math.min(1f,velocity/127f);
  streams[semitone]=pool.play(sounds[semitone],gain,gain,1,0,1f);
  return streams[semitone]==0?"Falha na saída de áudio do celular.":"";
 }
 public synchronized void noteOff(int semitone){
  if(semitone<0||semitone>=COUNT)return;
  if(streams[semitone]!=0)pool.stop(streams[semitone]);
  streams[semitone]=0;
 }
 public synchronized void stop(){for(int i=0;i<COUNT;i++)noteOff(i);}
 public synchronized void release(){stop();pool.release();}
}
