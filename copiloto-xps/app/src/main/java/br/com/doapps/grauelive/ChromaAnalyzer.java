package br.com.doapps.grauelive;

/** Lightweight spectral chord *hypotheses* for mixed instrument audio.
 *  This is not voice separation, nor neural polyphonic transcription.
 *  A chord is accepted only when three independently supported pitches occur.
 */
public final class ChromaAnalyzer {
    public static final class Chord {
        public final int root, quality;
        public final double confidence;
        Chord(int root,int quality,double confidence){this.root=root;this.quality=quality;this.confidence=confidence;}
        public boolean found(){return root>=0;}
    }
    private final int sr, fftSize;
    private final double[] re,im,mag;
    public ChromaAnalyzer(int sampleRate,int fftSize){
        if(Integer.bitCount(fftSize)!=1)throw new IllegalArgumentException("power of 2 required");
        sr=sampleRate;this.fftSize=fftSize;re=new double[fftSize];im=new double[fftSize];mag=new double[fftSize/2];
    }
    public Chord detect(short[] pcm,int count){
        if(count<fftSize)return none();
        double avg=0,rms=0;
        for(int i=0;i<fftSize;i++)avg+=pcm[i];avg/=fftSize;
        for(int i=0;i<fftSize;i++){
            double v=(pcm[i]-avg)/32768.0;
            rms+=v*v;
            re[i]=v*(0.5-0.5*Math.cos(2*Math.PI*i/(fftSize-1)));
            im[i]=0;
        }
        if(Math.sqrt(rms/fftSize)<0.014)return none();
        fft();
        for(int i=0;i<mag.length;i++)mag[i]=Math.hypot(re[i],im[i]);
        // Work with note peaks (rather than raw chroma) to reduce harmonic false positives.
        double[] energies=new double[48]; // MIDI 48...95
        double max=0;
        for(int midi=48;midi<=95;midi++){
            double fundamental=440*Math.pow(2.0,(midi-69)/12.0);
            double p=peak(fundamental);
            // Reduce influence of overtone-dominated frames; higher notes get their own bins.
            energies[midi-48]=p;
            if(p>max)max=p;
        }
        if(max<0.4)return none();
        // Local maximum for each semitone: suppress weak neighbors due to spectral leakage.
        double[] chroma=new double[12];
        for(int midi=48;midi<=95;midi++){
            double v=energies[midi-48];
            if(v<max*0.19)continue;
            if(midi>48&&v<energies[midi-49]*0.68)continue;
            if(midi<95&&v<energies[midi-47]*0.68)continue;
            chroma[midi%12]=Math.max(chroma[midi%12],v);
        }
        double peak=0;for(double c:chroma)peak=Math.max(peak,c);
        if(peak<=0)return none();
        int bestRoot=-1,bestQuality=-1;double best=-1,runner=-1;
        for(int root=0;root<12;root++)for(int quality=0;quality<2;quality++){
            int third=(root+(quality==0?4:3))%12, fifth=(root+7)%12;
            double a=chroma[root]/peak,b=chroma[third]/peak,c=chroma[fifth]/peak;
            if(Math.min(a,Math.min(b,c))<0.22)continue;
            double score=(a+b+c)/3.0;
            // Chords with two candidate thirds simultaneously remain ambiguous.
            double competing=chroma[(root+(quality==0?3:4))%12]/peak;
            score-=competing*0.25;
            if(score>best){runner=best;best=score;bestRoot=root;bestQuality=quality;}
            else if(score>runner)runner=score;
        }
        if(bestRoot<0 || best<0.35 || (runner>=0 && best-runner<0.035))return none();
        return new Chord(bestRoot,bestQuality,Math.min(0.95,Math.max(0.35,best)));
    }
    private static Chord none(){return new Chord(-1,-1,0);}
    private double peak(double freq){
        double bin=freq*fftSize/sr;
        int ix=(int)Math.round(bin);
        if(ix<3||ix>=mag.length-3)return 0;
        double best=0;for(int d=-1;d<=1;d++)best=Math.max(best,mag[ix+d]);
        return best;
    }
    private void fft(){
        int j=0;
        for(int i=1;i<fftSize;i++){
            int bit=fftSize>>1;
            while((j&bit)!=0){j^=bit;bit>>=1;}
            j^=bit;
            if(i<j){double t=re[i];re[i]=re[j];re[j]=t;t=im[i];im[i]=im[j];im[j]=t;}
        }
        for(int len=2;len<=fftSize;len<<=1){
            double theta=-2*Math.PI/len,wr0=Math.cos(theta),wi0=Math.sin(theta);
            for(int i=0;i<fftSize;i+=len){
                double wr=1,wi=0;
                for(int k=0;k<len/2;k++){
                    int a=i+k,b=a+len/2;
                    double vr=re[b]*wr-im[b]*wi,vi=re[b]*wi+im[b]*wr;
                    re[b]=re[a]-vr;im[b]=im[a]-vi;
                    re[a]+=vr;im[a]+=vi;
                    double w2=wr*wr0-wi*wi0;wi=wr*wi0+wi*wr0;wr=w2;
                }
            }
        }
    }
}
