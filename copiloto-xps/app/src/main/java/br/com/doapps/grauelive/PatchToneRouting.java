package br.com.doapps.grauelive;

/** Stateless, read-only routing of a single Patch-mode bank/program selection. */
public final class PatchToneRouting {
 private PatchToneRouting(){}
 /** Setup: 0=Patch, 1=Performance, -1=not yet confirmed. */
 public static int channel(int soundMode,int sysExChannel,int noteOnChannel){
  if(soundMode==1)return -1; // Never write a Performance part through Patch fallback.
  if(noteOnChannel>=1&&noteOnChannel<=16)return noteOnChannel;
  if(soundMode==0&&sysExChannel>=1&&sysExChannel<=16)return sysExChannel;
  return -1;
 }
 public static boolean validTone(int msb,int lsb,int program,int part,int volume){
  return msb>=0&&msb<=127&&lsb>=0&&lsb<=127&&program>=1&&program<=128
   &&part>=0&&part<16&&volume>=-1&&volume<=127;
 }
 /** Returns MIDI status + two data bytes for CC0, CC32, CC7 (optional) and PC.
  * The program byte is deliberately one less than the 1-based display program. */
 public static int[][] commands(int channel,int msb,int lsb,int program,int volume){
  if(channel<1||channel>16||!validTone(msb,lsb,program,0,volume))
   throw new IllegalArgumentException("Patch MIDI channel or tone out of range");
  int status=0xb0+channel-1;
  if(volume<0)return new int[][]{
   {status,0,msb},{status,32,lsb},{0xc0+channel-1,program-1}};
  return new int[][]{
   {status,0,msb},{status,32,lsb},{0xc0+channel-1,program-1},
   {status,7,volume}};
 }
}
