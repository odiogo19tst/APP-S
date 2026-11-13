package br.com.doapps.grauelive;
import java.util.*;

/** Tests the actual MIDI output, using a virtual monotonic clock (no sleeping/hardware). */
public final class MidiLooperSelfTest {
 static final long MS=1_000_000L,SECOND=1000*MS;
 static final class Rig {
  final List<String> out=new ArrayList<>();boolean available=true;long now=SECOND;
  final MidiLooper looper=new MidiLooper((s,a,b)->{if(!available)return false;out.add(s+":"+a+":"+b);return true;});
  Rig(){looper.configure(120,2,1);}
  void advance(long target){while(now<target){now=Math.min(target,now+10*MS);looper.tick(now);}}
  void input(int s,int a,int b){looper.input(now,s,a,b);}
  void take(int track,int note){looper.record(now,track);advance(now+100*MS);input(0x90,note,100);advance(now+200*MS);input(0x80,note,0);}
 }
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 static long count(List<String> out,String e){return out.stream().filter(e::equals).count();}
 public static void main(String[] args){
  Rig r=new Rig();r.take(0,60);check(r.out.isEmpty(),"Input must not echo and create MIDI feedback");
  r.input(0xc0,4,0);r.input(0xb0,0,85);r.input(0xf8,0,0);r.input(0x90,200,90);
  check(r.looper.snapshot(0).isEmpty(),"Unfinished take stays separate");
  r.advance(2*SECOND);check(r.looper.state(r.now).playing,"Record automatically starts PLAY at loop end");
  r.advance(2100*MS);check(r.out.equals(List.of("144:60:100")),"First loop sends original note and channel");
  r.advance(2300*MS);check(r.out.equals(List.of("144:60:100","128:60:0")),"Note off follows recorded timing");
  r.advance(3100*MS);check(count(r.out,"144:60:100")==2,"Loop repeats");r.looper.stop();check(r.out.getLast().equals("128:60:0"),"STOP releases active note");
  check(r.looper.snapshot(0).size()==2,"Program/bank/realtime/invalid data excluded");

  r=new Rig();r.looper.record(r.now,0);r.input(0xb0,64,127);r.input(0x90,64,110);r.input(0xe0,0,72);r.input(0xb0,1,90);r.input(0xb0,11,85);
  r.advance(2*SECOND);check(r.out.contains("176:64:127"),"Sustain recorded");check(r.out.contains("224:0:72"),"Pitch bend recorded");
  r.looper.stop();check(r.out.contains("128:64:0")&&r.out.contains("176:64:0")&&r.out.contains("224:0:64")&&r.out.contains("176:1:0"),"STOP releases notes, pedal, bend and modulation");

  r=new Rig();r.take(0,60);r.advance(2200*MS);r.looper.record(r.now,1);check(r.looper.state(r.now).queued,"Overdub waits for next boundary");
  r.input(0x90,80,100); // Before armed boundary: must not enter the take.
  r.advance(3100*MS);r.input(0x91,67,90);r.advance(3300*MS);r.input(0x81,67,0);r.advance(4100*MS);
  check(r.looper.snapshot(1).size()==2,"Overdub preserves channel and excludes queued notes");
  check(count(r.out,"145:67:90")==1,"New take starts next cycle, not replayed in its recording cycle");
  r.looper.mute(1,true);check(r.out.getLast().equals("129:67:0"),"Mute releases only selected track");
  long before=count(r.out,"145:67:90");r.advance(5100*MS);check(count(r.out,"145:67:90")==before,"Muted track remains silent");
  check(count(r.out,"144:60:100")>=4,"Other track continues");r.looper.mute(1,false);r.advance(6100*MS);check(count(r.out,"145:67:90")>before,"Unmute resumes next events");
  r.looper.clear(1);check(r.looper.snapshot(1).isEmpty()&&r.looper.snapshot(0).size()==2,"Clear retains other tracks");

  // Four independent tracks and overdub within an existing track.
  r=new Rig();r.take(0,60);r.advance(2*SECOND);
  for(int track=1;track<4;track++){
   r.looper.record(r.now+1,track);long boundary=((r.now-2*SECOND)/SECOND+1)*SECOND+2*SECOND;
   r.advance(boundary+100*MS);r.input(0x90|track,60+track,90);r.advance(boundary+300*MS);r.input(0x80|track,60+track,0);r.advance(boundary+SECOND);
  }
  for(int i=0;i<4;i++)check(r.looper.snapshot(i).size()==2,"Pista "+i+" recorded");
  r.looper.record(r.now+1,0);long edge=r.now+SECOND;r.advance(edge+400*MS);r.input(0x90,72,100);r.advance(edge+500*MS);r.input(0x80,72,0);r.advance(edge+SECOND);
  check(r.looper.snapshot(0).size()==4,"Overdub adds without replacing existing take");

  // Clear all stops four tracks and cancels a queued overdub without restarting.
  r.looper.mute(1,true);r.looper.record(r.now+1,2);r.looper.clearAll();
  MidiLooper.State empty=r.looper.state(r.now);
  check(!empty.playing&&!empty.recording&&!empty.queued&&empty.position==0,"Clear all resets active state");
  for(int i=0;i<4;i++)check(empty.counts[i]==0&&!empty.muted[i],"Clear all empties and unmutes every track");
  int sent=r.out.size();r.advance(r.now+2*SECOND);check(r.out.size()==sent,"Queued take cannot reappear after clear all");
  check(!r.looper.play(r.now),"Cleared session cannot play");

  r=new Rig();r.looper.record(r.now,0);r.input(0xb0,64,127);r.input(0x90,64,100);r.advance(2*SECOND);
  r.looper.clearAll();check(r.out.contains("128:64:0")&&r.out.contains("176:64:0"),"Clear all releases active notes and sustain");
  r=new Rig();r.looper.record(r.now,0);r.input(0x90,60,100);r.looper.clearAll();r.advance(2*SECOND);
  check(r.looper.snapshot(0).isEmpty()&&!r.looper.isActive(),"Clear all discards a first unfinished take");
  r=new Rig();r.take(0,60);r.advance(2100*MS);r.available=false;r.looper.clearAll();
  check(r.looper.snapshot(0).isEmpty(),"MIDI send failure cannot prevent deletion");
  r.available=true;r.looper.retrySilence();check(r.out.getLast().equals("128:60:0")&&!r.looper.isActive(),"Retry releases pending note without restoring erased loop");

  r=new Rig();r.looper.record(r.now,0);r.input(0x90,60,100);r.looper.stop();check(r.looper.snapshot(0).size()==1,"Early STOP preserves partial take");
  r.looper.play(r.now);r.looper.tick(r.now);r.out.clear();r.looper.tick(r.now+SECOND);check(!r.looper.isActive(),"Clock suspension stops rather than floods old notes");check(r.out.equals(List.of("128:60:0")),"Suspension silences active notes");

  r=new Rig();r.take(0,60);r.advance(2100*MS);r.available=false;r.advance(2300*MS);check(!r.looper.isActive(),"Send failure stops session");
  r.looper.disconnected();r.available=true;r.looper.retrySilence();check(r.out.getLast().equals("128:60:0"),"Reconnect retries outstanding note release");check(!r.looper.isActive(),"Reconnect must not restart music");
  check(r.looper.snapshot(0).size()==2,"Disconnected session retains recording");

  r=new Rig();r.take(0,60);r.advance(2*SECOND);r.looper.stop();r.looper.configure(60,2,1);
  check(r.looper.snapshot(0).getFirst().offsetNs==200*MS,"Tempo rescales recordings while stopped");
  try{r.looper.configure(0,4,1);throw new AssertionError("Invalid tempo accepted");}catch(IllegalArgumentException expected){}
  r.looper.play(r.now);try{r.looper.configure(120,4,1);throw new AssertionError("Live reconfigure accepted");}catch(IllegalStateException expected){}
  try{r.looper.clear(4);throw new AssertionError("Invalid track accepted");}catch(IllegalArgumentException expected){}

  // A scheduling pause must not cancel a first take: there is no loop output to catch up yet.
  r=new Rig();r.looper.record(r.now,0);r.now+=600*MS;r.looper.tick(r.now);
  r.input(0x90,60,100);r.now+=100*MS;r.input(0x80,60,0);r.advance(2*SECOND);
  check(r.looper.snapshot(0).size()==2,"A delayed first recording tick must not discard later input");
  check(r.looper.state(r.now).receivedNotes==1&&r.looper.state(r.now).capturedNotes==1,"Input counters distinguish actual note-ons from other events");

  // A late end-of-take tick starts playback now, without replaying missed cycles in a burst.
  r=new Rig();r.take(0,60);r.now=3500*MS;r.looper.tick(r.now);
  check(r.looper.snapshot(0).size()==2&&r.looper.isActive(),"Late completion keeps the recorded take");
  check(r.out.isEmpty(),"Late completion must not flood old notes");
  r.advance(3600*MS);check(count(r.out,"144:60:100")==1,"Late completion restarts the playback clock at the current time");

  r=new Rig();r.looper.record(r.now,0);r.looper.input(r.now-100*MS,0x90,60,100);
  check(r.looper.state(r.now).receivedNotes==1&&r.looper.state(r.now).capturedNotes==0,"Late MIDI timestamps are visible in diagnostics without entering the wrong cycle");
  r.advance(2*SECOND);check(r.looper.state(r.now).message.contains("fora do intervalo"),"Out-of-window input differs from missing USB input");
  r.looper.clearAll();check(r.looper.state(r.now).receivedNotes==0&&r.looper.state(r.now).capturedNotes==0,"Erase resets diagnostics");

  r=new Rig();r.looper.record(r.now,0,true);check(r.looper.state(r.now).countInBeats==2,"Optional count-in uses the current meter");r.input(0x90,80,100);r.advance(2*SECOND);r.input(0x90,60,90);r.advance(2100*MS);r.input(0x80,60,0);r.advance(3*SECOND);check(r.looper.snapshot(0).size()==2&&r.looper.snapshot(0).getFirst().note==60,"Count-in excludes early notes and records the first beat");

  r=new Rig();r.looper.record(r.now,0);r.advance(2*SECOND);check(!r.looper.isActive(),"Empty recording must not pretend to play");
  r.looper.record(r.now,0);for(int i=0;i<MidiLooper.MAX_EVENTS+10;i++)r.input(0x90,60,90);check(!r.looper.state(r.now).recording,"Unbounded recording rejected");
  System.out.println("MIDI Looper PASS: automatic playback, timing, four tracks, overdub, MIDI filters, sustain, mute, clear, BPM, send failure, reconnect and clock suspension");
 }
}
