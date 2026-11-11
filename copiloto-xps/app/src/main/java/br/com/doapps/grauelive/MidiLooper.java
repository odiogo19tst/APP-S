package br.com.doapps.grauelive;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Four-track session looper. All entry points are synchronized across MIDI/UI/clock threads. */
public final class MidiLooper {
 public interface Output { boolean send(int status, int data1, int data2); }
 public static final int TRACKS=4, MAX_EVENTS=16000;
 private static final long MAX_GAP_NS=250_000_000L;
 public static final class Event {
  public final long offsetNs; public final int status,note,velocity;
  public Event(long offsetNs,int status,int note,int velocity){this.offsetNs=offsetNs;this.status=status;this.note=note;this.velocity=velocity;}
 }
 private static final class Track {
  final List<Event> events=new ArrayList<>();
  final boolean[][] notes=new boolean[16][128];
  final boolean[] sustain=new boolean[16],bend=new boolean[16],mod=new boolean[16];
  boolean muted;
 }
 public static final class State {
  public final boolean playing,recording,queued; public final int recordingTrack,bpm,beats,bars;
  public final double position; public final int[] counts=new int[TRACKS]; public final boolean[] muted=new boolean[TRACKS];
  public final String message;
  State(MidiLooper l,long now){playing=l.playing;recording=l.recordTrack>=0;queued=recording&&now<l.recordStart;recordingTrack=l.recordTrack;
   bpm=l.bpm;beats=l.beats;bars=l.bars;message=recording?(queued?"Overdub armado: começa na próxima volta":"Gravando MIDI na pista "+(recordingTrack+1)):l.message;
   long start=playing?l.startNs:l.recordStart;
   position=(playing||recording)&&now>=start?(double)Math.floorMod(now-start,l.loopNs)/l.loopNs:0;
   for(int i=0;i<TRACKS;i++){counts[i]=l.tracks[i].events.size();muted[i]=l.tracks[i].muted;}
  }
 }
 private final Track[] tracks=new Track[TRACKS];
 private final Output output;
 private final List<Event> take=new ArrayList<>();
 private final boolean[] inputSustain=new boolean[16],takeChannels=new boolean[16];
 private int bpm=72,beats=4,bars=2,recordTrack=-1;
 private long loopNs=60_000_000_000L*4*2/72,startNs,lastTickNs,recordStart,recordEnd;
 private boolean playing,outputFailed;
 private String message="Pronto para gravar";
 public MidiLooper(Output output){if(output==null)throw new IllegalArgumentException("output");this.output=output;for(int i=0;i<TRACKS;i++)tracks[i]=new Track();}
 private void trackIndex(int i){if(i<0||i>=TRACKS)throw new IllegalArgumentException("Pista inválida");}
 public synchronized void configure(int newBpm,int newBeats,int newBars){
  if(playing||recordTrack>=0)throw new IllegalStateException("Pare o loop para ajustar BPM e compassos");
  if(newBpm<40||newBpm>240||newBeats<1||newBeats>12||newBars<1||newBars>32)throw new IllegalArgumentException("BPM ou compassos inválidos");
  long next=60_000_000_000L*newBeats*newBars/newBpm;
  for(Track t:tracks)for(int i=0;i<t.events.size();i++){Event e=t.events.get(i);t.events.set(i,new Event(Math.min(next-1,(long)((double)e.offsetNs*next/loopNs)),e.status,e.note,e.velocity));}
  loopNs=next;bpm=newBpm;beats=newBeats;bars=newBars;
 }
 /** REC on a playing session queues an overdub at the next loop boundary. */
 public synchronized void record(long now,int index){
  trackIndex(index);if(recordTrack>=0)throw new IllegalStateException("Uma gravação já está em andamento");
  if(!playing&&hasEvents()){play(now);if(!playing)return;}
  outputFailed=false;take.clear();java.util.Arrays.fill(takeChannels,false);recordTrack=index;
  recordStart=playing?startNs+(Math.floorDiv(now-startNs,loopNs)+1)*loopNs:now;
  recordEnd=recordStart+loopNs;if(!playing)lastTickNs=now;
  message=playing?"Overdub armado: começa na próxima volta":"Gravando MIDI";
 }
 /** Capture only musical gestures. Bank/program/SysEx and clock are never recorded or echoed. */
 public synchronized void input(long now,int status,int a,int b){
  if(status<0x80||status>0xef||a<0||a>127||b<0||b>127)return;
  int kind=status&0xf0,c=status&15;
  if(kind==0xb0&&a==64)inputSustain[c]=b>=64;
  if(recordTrack<0||now<recordStart||now>=recordEnd)return;
  if(kind!=0x80&&kind!=0x90&&kind!=0xe0&&!(kind==0xb0&&(a==64||a==1||a==11)))return;
  if(take.size()+tracks[recordTrack].events.size()>=MAX_EVENTS-2){cancelRecording();message="Limite de gravação atingido. Toque REC para outra pista.";return;}
  long offset=now-recordStart;
  if(!takeChannels[c]){takeChannels[c]=true;if(inputSustain[c]&&!(kind==0xb0&&a==64))take.add(new Event(0,0xb0|c,64,127));}
  take.add(new Event(offset,status,a,b));
 }
 private boolean hasEvents(){for(Track t:tracks)if(!t.events.isEmpty())return true;return false;}
 public synchronized boolean play(long now){
  if(recordTrack>=0)finishRecording();
  if(!hasEvents()){message="Grave notas antes de tocar";return false;}
  silenceAll();if(outputFailed){playing=false;message="Falha MIDI. Reconecte o USB.";return false;}
  playing=true;startNs=now;lastTickNs=now-1;message="Reproduzindo no XPS-10";return true;
 }
 public synchronized void tick(long now){
  if(!playing&&recordTrack<0)return;
  if(now<lastTickNs)return;
  if(now-lastTickNs>MAX_GAP_NS){stop();message="Loop parado: relógio MIDI interrompido";return;}
  if(recordTrack>=0&&now>=recordEnd){
   long end=recordEnd;
   if(playing){pump(end-1);lastTickNs=end-1;}
   finishRecording();
   if(!playing&&hasEvents()){playing=true;startNs=end;lastTickNs=end-1;message="Reproduzindo no XPS-10";}
   else if(!playing)message="Nenhuma nota recebida. Confira a transmissão MIDI do teclado.";
  }
  if(playing)pump(now);
  lastTickNs=now;
 }
 private void pump(long now){
   long from=lastTickNs-startNs,to=now-startNs;
   long first=Math.max(0,Math.floorDiv(from,loopNs)),last=Math.floorDiv(to,loopNs);
   for(long cycle=first;cycle<=last&&!outputFailed;cycle++){
    long edge=cycle*loopNs;
    if(cycle>0&&edge>from&&edge<=to)silenceAll();
    // Merge by timestamp across tracks, so shared-channel sustain/notes retain ordering.
    List<Due> due=new ArrayList<>();
    for(int i=0;i<TRACKS;i++)if(!tracks[i].muted)for(Event e:tracks[i].events){long at=edge+e.offsetNs;if(at>from&&at<=to)due.add(new Due(i,e));}
    due.sort(Comparator.comparingLong(d->d.event.offsetNs));
    for(Due d:due){sendTracked(d.track,d.event);if(outputFailed)break;}
   }
   if(outputFailed){playing=false;cancelRecording();silenceAll();message="Falha no envio MIDI. Loop parado; reconecte o USB.";}
 }
 private static final class Due {final int track;final Event event;Due(int track,Event event){this.track=track;this.event=event;}}
 private boolean send(int s,int a,int b){boolean ok=output.send(s,a,b);if(!ok)outputFailed=true;return ok;}
 private void sendTracked(int index,Event e){
  Track t=tracks[index];int c=e.status&15,k=e.status&0xf0;
  if(k==0x80||(k==0x90&&e.velocity==0)){
   for(int i=0;i<TRACKS;i++)if(i!=index&&tracks[i].notes[c][e.note]){t.notes[c][e.note]=false;return;}
  }
  if(k==0xb0&&e.note==64&&e.velocity<64){
   for(int i=0;i<TRACKS;i++)if(i!=index&&tracks[i].sustain[c]){t.sustain[c]=false;return;}
  }
  if(!send(e.status,e.note,e.velocity))return;
  if(k==0x90&&e.velocity>0)t.notes[c][e.note]=true;
  else if(k==0x80||(k==0x90&&e.velocity==0))t.notes[c][e.note]=false;
  if(k==0xb0&&e.note==64)t.sustain[c]=e.velocity>=64;
  if(k==0xb0&&e.note==1)t.mod[c]=e.velocity!=0;
  if(k==0xe0)t.bend[c]=e.note!=0||e.velocity!=64;
 }
 private void silenceTrack(int index){
  Track t=tracks[index];
  for(int c=0;c<16;c++){
   for(int n=0;n<128;n++)if(t.notes[c][n]){
    boolean held=false;for(int i=0;i<TRACKS;i++)if(i!=index&&tracks[i].notes[c][n])held=true;
    if(held||send(0x80|c,n,0))t.notes[c][n]=false;
   }
   if(t.sustain[c]){boolean held=false;for(int i=0;i<TRACKS;i++)if(i!=index&&tracks[i].sustain[c])held=true;if(held||send(0xb0|c,64,0))t.sustain[c]=false;}
   if(t.bend[c]&&send(0xe0|c,0,64))t.bend[c]=false;
   if(t.mod[c]&&send(0xb0|c,1,0))t.mod[c]=false;
  }
 }
 private void silenceAll(){for(int i=0;i<TRACKS;i++)silenceTrack(i);}
 private void finishRecording(){
  if(recordTrack<0)return;
  Track t=tracks[recordTrack];t.events.addAll(take);t.events.sort(Comparator.comparingLong(e->e.offsetNs));t.muted=false;cancelRecording();
 }
 private void cancelRecording(){recordTrack=-1;take.clear();}
 public synchronized void stop(){if(recordTrack>=0)finishRecording();playing=false;silenceAll();message="Loop parado";}
 /** Clear connection input state; playback never restarts automatically on reconnection. */
 public synchronized void retrySilence(){outputFailed=false;silenceAll();message=outputFailed?"Falha MIDI. Reconecte o USB.":"Loop parado. Toque REC ou PLAY.";}
 public synchronized void disconnected(){stop();java.util.Arrays.fill(inputSustain,false);message="Sem USB. Reconecte e toque PLAY.";}
 public synchronized void mute(int index,boolean muted){trackIndex(index);tracks[index].muted=muted;if(muted)silenceTrack(index);}
 public synchronized void clear(int index){trackIndex(index);if(recordTrack==index)cancelRecording();silenceTrack(index);tracks[index].events.clear();tracks[index].muted=false;if(!hasEvents()){playing=false;message="Pronto para gravar";}}
 /** Erase the session atomically, cancelling takes and releasing loop-owned MIDI notes. */
 public synchronized void clearAll(){
  cancelRecording();playing=false;silenceAll();
  for(Track t:tracks){t.events.clear();t.muted=false;}
  message=outputFailed?"Pistas apagadas. Reconecte o USB para liberar notas pendentes.":"Todas as pistas apagadas. Pronto para gravar.";
 }
 public synchronized State state(long now){return new State(this,now);}
 public synchronized boolean isActive(){return playing||recordTrack>=0;}
 public synchronized List<Event> snapshot(int index){trackIndex(index);return new ArrayList<>(tracks[index].events);}
}
