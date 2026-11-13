package br.com.doapps.grauelive;

import java.util.*;

/** Eight programmed MIDI tracks; 16/32/64 sixteenth-note steps. No audio or SysEx. */
public final class PhraseSequencer {
 public interface Output {boolean send(int status,int a,int b);}
 public static final int TRACKS=8;
 public static final class Track {
  public final int channel,gate;private final int[] notes,velocities;
  public Track(int channel,int gate,int[] notes,int[] velocities){
   if(channel<1||channel>16||gate<1||gate>16||notes==null||velocities==null||notes.length!=velocities.length||(notes.length!=16&&notes.length!=32&&notes.length!=64))throw new IllegalArgumentException("Pista MIDI inválida");
   this.channel=channel;this.gate=gate;this.notes=notes.clone();this.velocities=velocities.clone();
   for(int i=0;i<notes.length;i++)if(notes[i]<0||notes[i]>127||velocities[i]<0||velocities[i]>127)throw new IllegalArgumentException("Nota ou intensidade inválida");
  }
 }
 public static final class Pattern {
  public final int bpm,steps;private final List<Track> tracks;
  public Pattern(int bpm,int steps,List<Track> tracks){
   if(bpm<40||bpm>240||(steps!=16&&steps!=32&&steps!=64)||tracks==null||tracks.size()!=TRACKS)throw new IllegalArgumentException("Use 8 pistas, 16/32/64 passos e BPM 40–240");
   for(Track t:tracks)if(t==null||t.notes.length!=steps)throw new IllegalArgumentException("Tamanho da pista inválido");
   this.bpm=bpm;this.steps=steps;this.tracks=List.copyOf(tracks);
  }
 }
 private final Output output;private Pattern pattern;private boolean playing,failed;
 private final boolean[] muted=new boolean[TRACKS];private final long[][] ends=new long[TRACKS][128];
 private long origin,lastTick,nextStep,interval;private int step=-1;private String message="Sequenciador parado";
 public PhraseSequencer(Output output){this.output=Objects.requireNonNull(output);}
 private boolean send(int s,int a,int b){boolean ok=output.send(s,a,b);if(!ok)failed=true;return ok;}
 private void release(int track,int note){
  if(ends[track][note]==0||pattern==null)return;
  int channel=pattern.tracks.get(track).channel;boolean shared=false;
  for(int i=0;i<TRACKS;i++)if(i!=track&&ends[i][note]!=0&&pattern.tracks.get(i).channel==channel)shared=true;
  if(shared||send(0x80+channel-1,note,0))ends[track][note]=0;
 }
 private void silence(){for(int i=0;i<TRACKS;i++)for(int n=0;n<128;n++)release(i,n);}
 public synchronized void start(Pattern next,long now){
  failed=false;silence();if(failed)throw new IllegalStateException("Falha ao liberar notas. Reconecte o MIDI.");
  pattern=Objects.requireNonNull(next);Arrays.fill(muted,false);interval=15_000_000_000L/next.bpm;
  origin=now;lastTick=now;nextStep=0;step=-1;playing=true;message="Sequenciador MIDI tocando";
 }
 public synchronized void tick(long now){
  if(!playing)return;if(now<lastTick)return;
  if(now-lastTick>250_000_000L){stop();message="Sequenciador parado: relógio interrompido";return;}
  lastTick=now;
  for(int t=0;t<TRACKS;t++)for(int n=0;n<128;n++)if(ends[t][n]!=0&&ends[t][n]<=now)release(t,n);
  long current=(now-origin)/interval;
  if(current>=nextStep&&!failed){
   if(current>nextStep){stop();message="Sequenciador parado: passo atrasado";return;}
   step=(int)(current%pattern.steps);nextStep=current+1;
   for(int t=0;t<TRACKS&&!failed;t++)if(!muted[t]){
    Track track=pattern.tracks.get(t);int note=track.notes[step],velocity=track.velocities[step];
    if(velocity>0){release(t,note);if(!failed&&send(0x90+track.channel-1,note,velocity))ends[t][note]=now+interval*track.gate;}
   }
  }
  if(failed){playing=false;silence();message="Falha MIDI. Sequenciador parado; reconecte o USB.";}
 }
 public synchronized void stop(){playing=false;silence();step=-1;message=failed?"Falha ao liberar notas; reconecte o USB.":"Sequenciador parado";}
 public synchronized void mute(int track,boolean value){if(track<0||track>=TRACKS)throw new IllegalArgumentException("Pista inválida");muted[track]=value;if(value)for(int n=0;n<128;n++)release(track,n);}
 public synchronized boolean playing(){return playing;}
 public synchronized int step(){return step;}
 public synchronized boolean muted(int track){return muted[track];}
 public synchronized String message(){return message;}
}
