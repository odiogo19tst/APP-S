package br.com.doapps.grauelive;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/** Deterministic MIDI note looper. Time is supplied by the caller in nanoseconds. */
public final class MidiLooper {
 public interface Output { boolean send(int status, int note, int velocity); }
 public static final class Event {
  public final long offsetNs; public final int status,note,velocity;
  Event(long t,int s,int n,int v){offsetNs=t;status=s;note=n;velocity=v;}
 }
 private final List<Event> events=new ArrayList<>();
 private final boolean[][] sounding=new boolean[16][128];
 private final Output output;
 private long startNs,loopNs,lastTickNs;
 private boolean recording,playing;
 public MidiLooper(Output output){if(output==null)throw new IllegalArgumentException("output");this.output=output;}
 public void record(long nowNs,long durationNs){
  if(durationNs<=0)throw new IllegalArgumentException("duration");
  stop();events.clear();startNs=nowNs;loopNs=durationNs;lastTickNs=nowNs;recording=true;
 }
 /** Record only channel voice note events; never echo input to avoid MIDI feedback. */
 public void input(long nowNs,int status,int note,int velocity){
  int kind=status&0xf0;
  if(!recording||nowNs<startNs||nowNs>=startNs+loopNs||note<0||note>127||velocity<0||velocity>127)return;
  if(kind!=0x80&&kind!=0x90)return;
  events.add(new Event(nowNs-startNs,status,note,velocity));
 }
 public void play(long nowNs){
  if(loopNs<=0||events.isEmpty())return;
  silence();recording=false;playing=true;startNs=nowNs;lastTickNs=nowNs-1;
  Collections.sort(events,Comparator.comparingLong(e->e.offsetNs));
 }
 /** Call regularly on a worker scheduler; no Android dependencies. */
 public void tick(long nowNs){
  if(!playing||nowNs<lastTickNs)return;
  long from=lastTickNs-startNs,to=nowNs-startNs;
  long first=Math.max(0,Math.floorDiv(from,loopNs));
  long last=Math.floorDiv(to,loopNs);
  // Bound catch-up after app suspension: silence rather than flood old notes.
  if(last-first>2){silence();lastTickNs=nowNs;return;}
  for(long cycle=first;cycle<=last;cycle++){
   for(Event e:events){long at=cycle*loopNs+e.offsetNs;
    if(at>from&&at<=to)sendTracked(e.status,e.note,e.velocity);
   }
  }
  lastTickNs=nowNs;
 }
 private void sendTracked(int status,int note,int velocity){
  if(!output.send(status,note,velocity))return;
  int channel=status&15,kind=status&0xf0;
  if(kind==0x90&&velocity>0)sounding[channel][note]=true;
  else if(kind==0x80||(kind==0x90&&velocity==0))sounding[channel][note]=false;
 }
 private void silence(){
  for(int c=0;c<16;c++)for(int n=0;n<128;n++)if(sounding[c][n]){
   output.send(0x80|c,n,0);sounding[c][n]=false;
  }
 }
 public void stop(){silence();recording=false;playing=false;}
 public boolean isPlaying(){return playing;}
 public boolean isRecording(){return recording;}
 public int eventCount(){return events.size();}
 public List<Event> snapshot(){return Collections.unmodifiableList(new ArrayList<>(events));}
}
