package br.com.doapps.grauelive;
public final class Harmony04SelfTest {
 public static void main(String[] args){
  int n=0; ChromaAnalyzer s=new ChromaAnalyzer(16000,4096);
  for(int[] chord:new int[][]{{60,64,67},{69,72,76},{62,65,69}}){
   short[] pcm=triad(chord);
   ChromaAnalyzer.Chord got=s.detect(pcm,pcm.length);
   if(!got.found() || got.root!=chord[0]%12 || got.quality!=(chord[1]-chord[0]==3?1:0))
      throw new AssertionError("expected "+chord[0]%12+" quality "+(chord[1]-chord[0])+", got "+got.root+"/"+got.quality+" conf "+got.confidence);
   n++;
  }
  if(s.detect(new short[4096],4096).found())throw new AssertionError("silence recognized");n++;
  short[] solo=new short[4096];for(int i=0;i<solo.length;i++){
   double t=i/16000.0,f=440*Math.pow(2,(60-69)/12.0);
   solo[i]=(short)(32767*0.42*(Math.sin(2*Math.PI*f*t)+0.23*Math.sin(4*Math.PI*f*t)));
  }
  if(s.detect(solo,solo.length).found())throw new AssertionError("monophonic voice cannot count as chord");n++;
  MusicBrain key=new MusicBrain();
  for(int i=0;i<3;i++) for(int midi:new int[]{60,64,67,71,72,67,64,62,60}) key.accept(midi);
  MusicBrain.Harmony h=key.accept(60);
  if(h.root==9 && h.mode==1)throw new AssertionError("must not falsely force A minor from C major notes"); n++;
  key.reset();
  for(int i=0;i<3;i++){
   for(int pitch:new int[]{60,64,67,72,71,67,64,62})key.accept(pitch);
   for(int j=0;j<3;j++)key.accept(60,new ChromaAnalyzer.Chord(0,0,0.9));
   for(int j=0;j<3;j++)key.accept(65,new ChromaAnalyzer.Chord(5,0,0.9));
   for(int j=0;j<3;j++)key.accept(67,new ChromaAnalyzer.Chord(7,0,0.9));
   for(int j=0;j<3;j++)key.accept(60,new ChromaAnalyzer.Chord(0,0,0.9));
  }
  h=key.accept(60);
  if(h.root!=0||h.mode!=0)throw new AssertionError("C major progression detected as "+h.root+" / "+h.mode);n++;
  key.confirmKey();if(!key.accept(60).locked)throw new AssertionError("key lock");n++;
  key.reset();
  for(int i=0;i<3;i++){
   for(int pitch:new int[]{69,72,76,79,76,72,71,69})key.accept(pitch);
   for(int j=0;j<3;j++)key.accept(69,new ChromaAnalyzer.Chord(9,1,0.9));
   for(int j=0;j<3;j++)key.accept(74,new ChromaAnalyzer.Chord(2,1,0.9));
   for(int j=0;j<3;j++)key.accept(76,new ChromaAnalyzer.Chord(4,0,0.9));
   for(int j=0;j<3;j++)key.accept(69,new ChromaAnalyzer.Chord(9,1,0.9));
  }
  h=key.accept(69);
  if(h.root!=9||h.mode!=1)throw new AssertionError("A minor progression detected as "+h.root+" / "+h.mode);n++;
  key.reset();
  for(int i=0;i<3;i++){
    for(int pitch:new int[]{60,64,67,71,72,67,64,62,60})key.accept(pitch);
    for(int k=0;k<4;k++)h=key.accept(-1);
  }
  if(h.root!=0||h.mode!=0)throw new AssertionError("unaccompanied C major phrasing detected as "+h.root+"/"+h.mode);n++;
  key.reset();key.setManualMode(0);
  for(int i=0;i<4;i++)for(int pitch:new int[]{60,64,67,71,72,67,64,62})h=key.accept(pitch);
  h=key.accept(60);
  if(h.knownKey() && h.mode!=0)throw new AssertionError("manual major produced minor key");n++;
  System.out.println("OK: "+n+" extra tests");
 }
 static short[] triad(int[] midis){short[] a=new short[4096];for(int i=0;i<a.length;i++){double t=i/16000.;double s=0;
  for(int m:midis){double hz=440*Math.pow(2,(m-69)/12.);s+=Math.sin(2*Math.PI*hz*t)+0.12*Math.sin(2*Math.PI*hz*2*t);}
  a[i]=(short)(s*32767/4.8); }return a;}
}
