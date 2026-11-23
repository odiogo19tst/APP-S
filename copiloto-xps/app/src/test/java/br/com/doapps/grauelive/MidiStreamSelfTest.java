package br.com.doapps.grauelive;
import java.util.*;
public class MidiStreamSelfTest {
 public static void main(String[] args){List<String> events=new ArrayList<>();MidiStream s=new MidiStream((st,a,b)->events.add(st+":"+a+":"+b));
  s.feed(new byte[]{(byte)144,60},0,2);s.feed(new byte[]{100,64,(byte)248,90,60,0},0,6);
  s.feed(new byte[]{(byte)240,1,2,3,(byte)247,65,90,(byte)128,64,0},0,10);
  if(!events.equals(Arrays.asList("144:60:100","144:64:90","144:60:0","128:64:0")))throw new AssertionError(events);
  s.reset();events.clear();s.feed(new byte[]{60,99,(byte)192,5,6},0,5);
  if(!events.equals(Arrays.asList("192:5:0","192:6:0")))throw new AssertionError(events);
  System.out.println("MIDI: running status, packets, realtime, SysEx, reset OK");
 }
}
