package br.com.doapps.grauelive;
import java.util.*;
public final class MidiLooperSelfTest {
 private static void check(boolean ok,String label){if(!ok)throw new AssertionError(label);}
 public static void main(String[] args){
  List<String> out=new ArrayList<>();
  MidiLooper l=new MidiLooper((s,n,v)->{out.add(s+":"+n+":"+v);return true;});
  l.record(1000,100);
  l.input(1010,0x90,60,100);l.input(1040,0x80,60,0);
  l.input(1030,0xb0,7,100);l.input(1090,0x90,200,100);
  check(l.eventCount()==2,"only valid notes");
  l.play(2000);l.tick(2010);l.tick(2040);l.tick(2110);
  check(out.equals(Arrays.asList("144:60:100","128:60:0","144:60:100")),"loop repeat "+out);
  l.stop();
  check(out.get(out.size()-1).equals("128:60:0"),"stop releases note");
  check(!l.isPlaying(),"stopped");
  out.clear();l.record(3000,100);l.input(3010,0x90,64,110);l.play(4000);
  l.tick(4010);l.tick(9000);
  check(out.equals(Arrays.asList("144:64:110","128:64:0")),"suspend safety "+out);
  System.out.println("MIDI looper: record, replay, repeat, filtering, stop and suspend safety OK");
 }
}
