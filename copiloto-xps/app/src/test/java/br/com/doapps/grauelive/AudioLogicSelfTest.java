package br.com.doapps.grauelive;
/** Dependency-free signal-processing tests runnable with local JDK. */
public final class AudioLogicSelfTest {
    public static void main(String[] args){
        int checks=0;
        PitchDetector d=new PitchDetector(16000);
        for(int midi:new int[]{45,57,60,64,69,72,76,81}){
            double hz=440*Math.pow(2,(midi-69)/12.0);
            short[] data=generate(hz,16000,4096,0.64);
            PitchDetector.Result r=d.detect(data,data.length);
            if(r.midi!=midi)throw new AssertionError("pitch midi="+midi+", got="+r.midi+" freq="+r.hz+" clarity="+r.clarity);
            checks++;
        }
        short[] zeros=new short[4096];
        if(d.detect(zeros,zeros.length).voiced())throw new AssertionError("silence voiced");checks++;
        MusicBrain m=new MusicBrain();
        for(int i=0;i<6;i++)for(int pitch:new int[]{60,64,67,71,72,74,67,64})m.accept(pitch);
        MusicBrain.Harmony h=m.accept(71);
        if(h.root==9 && h.mode==1)throw new AssertionError("relative A minor cannot be asserted from C major melody alone");checks++;
        if(!GrauePacket.verify(GrauePacket.encode(5,h)))throw new AssertionError("checksum failed");checks++;
        byte[] broken=GrauePacket.encode(6,h);broken[7]^=13;
        if(GrauePacket.verify(broken))throw new AssertionError("corrupt frame accepted");checks++;
        m.reset();
        if(m.accept(60).knownKey())throw new AssertionError("one note cannot establish key");checks++;
        System.out.println("OK: "+checks+" Java logic checks (pitch, silence, harmony, packet)");
    }
    private static short[] generate(double hz,int sr,int n,double gain){
        short[] out=new short[n];
        for(int i=0;i<n;i++){
            double t=(double)i/sr;
            // Strong first harmonic and some overtone, as in real voice.
            double sample=(Math.sin(2*Math.PI*hz*t)+0.28*Math.sin(4*Math.PI*hz*t))*gain/1.28;
            out[i]=(short)Math.round(32767*sample);
        }
        return out;
    }
}
