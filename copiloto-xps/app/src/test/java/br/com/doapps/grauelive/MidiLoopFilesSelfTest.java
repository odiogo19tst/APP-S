package br.com.doapps.grauelive;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import javax.sound.midi.*;
public final class MidiLoopFilesSelfTest {
 static void check(boolean ok,String message){if(!ok)throw new AssertionError(message);}
 static MidiLooper.Session sample(){List<List<MidiLooper.Event>> t=new ArrayList<>();for(int i=0;i<4;i++)t.add(new ArrayList<>());t.get(0).add(new MidiLooper.Event(100_000_000,0x90,60,100));t.get(0).add(new MidiLooper.Event(300_000_000,0x80,60,0));t.get(2).add(new MidiLooper.Event(500_000_000,0xb2,64,127));t.get(2).add(new MidiLooper.Event(500_000_000,0x92,67,90));return new MidiLooper.Session(120,4,2,t,new boolean[]{false,false,true,false});}
 static void invalid(byte[] bytes)throws Exception{try{MidiLoopSmf.decode(bytes);throw new AssertionError("Invalid MIDI accepted");}catch(IOException expected){}}
 public static void main(String[] args)throws Exception{
  File dir=Files.createTempDirectory("graue-loops-").toFile();MidiLoopFiles files=new MidiLoopFiles(dir);MidiLooper.Session s=sample();
  MidiLoopFiles.Entry one=files.save("Base", "song-a", "Mesmo título",s),two=files.save("Outra", "song-b", "Mesmo título",s);
  check(!one.id.equals(two.id)&&files.list().size()==2,"Saved loops never overwrite by name or song title");
  files.checkpoint(s);MidiLoopFiles reopened=new MidiLoopFiles(dir);check(reopened.checkpoint().session.tracks.get(2).size()==2,"Last session survives a new store instance");
  check(reopened.load(one.id).songId.equals("song-a")&&reopened.load(two.id).songId.equals("song-b"),"Song IDs distinguish duplicate titles");
  byte[] bytes=MidiLoopFiles.encode(one);check(MidiLoopFiles.decode(bytes).session.muted(2),"Library retains muted flags");bytes[20]^=1;try{MidiLoopFiles.decode(bytes);throw new AssertionError("Corruption accepted");}catch(IOException expected){}
  try{files.load("../../other");throw new AssertionError("Traversal accepted");}catch(IOException expected){}
  reopened.delete(one.id);check(reopened.list().size()==1&&reopened.checkpoint()!=null,"Deleting library item preserves other loops and checkpoint");
  MidiLooper player=new MidiLooper((status,a,b)->{throw new AssertionError("Loading/restoring must never play MIDI");});player.restore(s);check(!player.isActive()&&player.snapshot(0).size()==2,"Restoring never starts playback");
  boolean[] flags={false,false,false,false};List<List<MidiLooper.Event>> copy=new ArrayList<>();for(int i=0;i<4;i++)copy.add(new ArrayList<>());copy.get(0).add(new MidiLooper.Event(0,0x90,60,90));MidiLooper.Session immutable=new MidiLooper.Session(120,4,1,copy,flags);copy.get(0).clear();flags[0]=true;check(immutable.tracks.get(0).size()==1&&!immutable.muted(0),"Snapshots are independent of caller mutation");
  List<List<MidiLooper.Event>> bad=new ArrayList<>();for(int i=0;i<4;i++)bad.add(new ArrayList<>());bad.get(0).add(new MidiLooper.Event(0,0xc0,5,0));try{new MidiLooper.Session(120,4,1,bad,flags);throw new AssertionError("Patch change persisted");}catch(IllegalArgumentException expected){}
  player.clearAll();reopened.checkpoint(player.session());check(new MidiLoopFiles(dir).checkpoint().session.tracks.stream().allMatch(List::isEmpty),"Clearing all persists an empty checkpoint rather than reviving old notes");
  byte[] midi=MidiLoopSmf.encode(s);Sequence decodedByJdk=MidiSystem.getSequence(new ByteArrayInputStream(midi));check(decodedByJdk.getTracks().length==5&&decodedByJdk.getResolution()==480,"Independent JDK MIDI reader accepts exported SMF");
  MidiLooper.Session imported=MidiLoopSmf.decode(midi);check(imported.bpm==120&&imported.beats==4&&imported.bars==2&&imported.tracks.get(0).size()==2,"SMF roundtrip preserves tempo, meter, length and events");
  check(imported.tracks.get(2).stream().anyMatch(e->e.status==0x82&&e.note==67)&&imported.tracks.get(2).stream().anyMatch(e->e.status==0xb2&&e.note==64&&e.velocity==0),"Export closes held notes and sustain");
  Sequence fixture=new Sequence(Sequence.PPQ,96);javax.sound.midi.Track track=fixture.createTrack();ShortMessage program=new ShortMessage();program.setMessage(0xc0,5,0);track.add(new MidiEvent(program,0));ShortMessage on=new ShortMessage();on.setMessage(0x90,65,110);track.add(new MidiEvent(on,0));ShortMessage off=new ShortMessage();off.setMessage(0x80,65,0);track.add(new MidiEvent(off,192));ByteArrayOutputStream out=new ByteArrayOutputStream();MidiSystem.write(fixture,0,out);MidiLooper.Session standard=MidiLoopSmf.decode(out.toByteArray());check(standard.tracks.get(0).size()==2,"Format 0 import filters program changes");
  invalid(Arrays.copyOf(midi,20));invalid(new byte[30]);byte[] smpte=midi.clone();smpte[12]=(byte)0x80;invalid(smpte);
  for(int i=0;i<100;i++){byte[] fuzz=midi.clone();fuzz[i%fuzz.length]^=(byte)(1+i);try{MidiLooper.Session got=MidiLoopSmf.decode(fuzz);check(got.tracks.size()==4,"Accepted input must still validate");}catch(IOException expected){}}
  System.out.println("Loop library PASS: reopen, distinct songs, CRC, atomic writes, safe restore, SMF interoperability and malformed input");
 }
}
