package br.com.doapps.grauelive;

public final class PatchToneRoutingSelfTest {
 private static void eq(int expected,int actual,String message){
  if(expected!=actual)throw new AssertionError(message+" expected "+expected+" got "+actual);
 }
 private static void ok(boolean v,String m){if(!v)throw new AssertionError(m);}
 public static void main(String[] args){
  eq(1,PatchToneRouting.channel(0,1,-1),"SysEx channel 1");
  eq(12,PatchToneRouting.channel(0,12,-1),"Non-default SysEx Patch channel");
  eq(8,PatchToneRouting.channel(0,12,8),"New physical key channel overrides stale SysEx");
  eq(-1,PatchToneRouting.channel(1,12,8),"Performance must never use Patch fallback");
  eq(3,PatchToneRouting.channel(-1,-1,3),"Learn from physical MIDI note when setup not yet confirmed");
  eq(-1,PatchToneRouting.channel(-1,1,-1),"Unknown mode may not silently assume channel 1");
  eq(-1,PatchToneRouting.channel(0,0,-1),"Never accept zero channel");
  eq(-1,PatchToneRouting.channel(0,17,-1),"Never broadcast");
  ok(!PatchToneRouting.validTone(87,0,129,0,-1),"128 is last display program");
  ok(!PatchToneRouting.validTone(87,0,1,16,-1),"Part boundary");
  int[][] patch=PatchToneRouting.commands(6,87,1,128,-1);
  eq(3,patch.length,"Plain Patch has 3 messages");
  eq(0xb5,patch[0][0],"CC0 on channel 6");
  eq(87,patch[0][2],"User Patch MSB 87");
  eq(32,patch[1][1],"Bank Select LSB");
  eq(1,patch[1][2],"Second USER bank");
  eq(0xc5,patch[2][0],"Program Change channel 6");
  eq(127,patch[2][1],"Display program 128 becomes MIDI 127");
  int[][] withVolume=PatchToneRouting.commands(1,87,0,1,99);
  eq(4,withVolume.length,"Tone+volume emits both selections");
  eq(7,withVolume[3][1],"Volume controller");
  eq(99,withVolume[3][2],"Volume value");
  System.out.println("XPS-10 PATCH mode: system/physical channel, CC0/32, PC and CC7 tests PASS");
 }
}
