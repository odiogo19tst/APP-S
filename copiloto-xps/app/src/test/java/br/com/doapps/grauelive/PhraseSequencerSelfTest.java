package br.com.doapps.grauelive;
import java.util.*;
public final class PhraseSequencerSelfTest {
 static final long MS=1_000_000L;static void check(boolean x,String why){if(!x)throw new AssertionError(why);}
 static PhraseSequencer.Pattern pattern(int steps,boolean shared){List<PhraseSequencer.Track> tracks=new ArrayList<>();for(int i=0;i<8;i++){int[] n=new int[steps],v=new int[steps];Arrays.fill(n,60+i);if(i<2){v[0]=100;n[0]=60;if(i==0){n[steps-1]=62;v[steps-1]=90;}}tracks.add(new PhraseSequencer.Track(shared?1:i+1,1,n,v));}return new PhraseSequencer.Pattern(120,steps,tracks);}
 public static void main(String[] args){
  List<String> out=new ArrayList<>();boolean[] available={true};PhraseSequencer s=new PhraseSequencer((a,b,c)->{if(!available[0])return false;out.add(a+":"+b+":"+c);return true;});
  for(int steps:new int[]{16,32,64}){out.clear();s.start(pattern(steps,false),0);s.tick(0);check(out.equals(List.of("144:60:100","145:60:100")),"Starts exact first beat/channel");s.tick(50*MS);check(out.size()==2,"Does not repeat within step");for(long t=125*MS;t<=steps*125*MS;t+=125*MS)s.tick(t);check(s.step()==0,"Wraps 16/32/64 steps");check(out.stream().filter(x->x.equals("144:60:100")).count()==2,"No duplicated first beat");s.stop();check(!s.playing()&&s.step()==-1,"Stop resets transport");}
  out.clear();s.start(pattern(16,true),0);s.tick(0);check(out.equals(List.of("144:60:100")),"Shared tracks do not stack duplicate Note Ons");s.mute(0,true);check(out.stream().noneMatch(x->x.equals("128:60:0")),"Muting preserves other track on shared note/channel");s.mute(1,true);check(out.getLast().equals("128:60:0")&&out.size()==2,"Last owner balances the shared Note On with one Note Off");s.stop();
  out.clear();s.start(pattern(16,false),0);s.tick(0);s.tick(260*MS);check(!s.playing()&&s.message().contains("interrompido"),"Stall stops instead of catchup burst");
  s.start(pattern(16,false),0);s.tick(0);s.tick(250*MS);check(!s.playing()&&s.message().contains("atrasado"),"Skipped step stops without a note burst");
  s.start(pattern(16,false),0);available[0]=false;s.tick(0);check(!s.playing(),"Output failure stops playback");available[0]=true;s.stop();s.start(pattern(16,false),0);check(s.playing(),"Can restart after connection recovery");s.stop();
  int bad=0;try{new PhraseSequencer.Track(0,1,new int[16],new int[16]);}catch(IllegalArgumentException e){bad++;}try{new PhraseSequencer.Pattern(120,17,List.of());}catch(IllegalArgumentException e){bad++;}try{int[] v=new int[16];v[0]=128;new PhraseSequencer.Track(1,1,v,new int[16]);}catch(IllegalArgumentException e){bad++;}check(bad==3,"Bounds rejected");
  System.out.println("Phrase sequencer PASS: 8 tracks, 16/32/64 steps, exact boundaries, note ownership, mute, stop, late clock, MIDI failure and bounds");
 }
}
