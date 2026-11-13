package br.com.doapps.grauelive;

/** YIN fundamental-frequency estimator on a mono PCM frame (no cloud). */
public final class PitchDetector {
    public static final class Result {
        public final double hz, clarity, rms;
        public final int midi;
        Result(double hz, double clarity, double rms, int midi) {
            this.hz=hz; this.clarity=clarity; this.rms=rms; this.midi=midi;
        }
        public boolean voiced() { return midi>=0; }
    }
    private static final Result SILENCE = new Result(0,0,0,-1);
    private final double[] diff = new double[320];
    private final double[] cmnd = new double[320];
    private final int sr;
    public PitchDetector(int sampleRate) { sr = sampleRate; }
    public Result detect(short[] pcm, int count) {
        if (count < 1024) return SILENCE;
        double mean=0, sq=0;
        for(int i=0;i<count;i++) mean += pcm[i];
        mean/=count;
        for(int i=0;i<count;i++){ double v=(pcm[i]-mean)/32768.0; sq += v*v; }
        double rms = Math.sqrt(sq/count);
        if(rms < 0.008) return new Result(0,0,rms,-1);
        int maxTau=Math.min(Math.min(diff.length-1, sr/70), count/2);
        int minTau=Math.max(2,sr/1000);
        // Finite-difference formulation; sufficient for ~80-1000Hz singing.
        for(int tau=1;tau<=maxTau;tau++) {
            double sum=0;
            for(int i=0;i<count-maxTau;i++) {
                double delta=(pcm[i]-pcm[i+tau])/32768.0;
                sum+=delta*delta;
            }
            diff[tau]=sum;
        }
        cmnd[0]=1;
        double running=0;
        for(int tau=1;tau<=maxTau;tau++) {
            running+=diff[tau];
            cmnd[tau]=running>1e-10 ? diff[tau]*tau/running : 1;
        }
        int best=-1;
        for(int t=minTau;t<maxTau-1;t++) {
            if(cmnd[t]<0.15) {
                while(t+1<maxTau && cmnd[t+1]<cmnd[t]) t++;
                best=t;break;
            }
        }
        if(best<0) {
            double min=1;
            for(int t=minTau;t<maxTau;t++) if(cmnd[t]<min){min=cmnd[t];best=t;}
            if(min>0.22) return new Result(0, Math.max(0,1-min),rms,-1);
        }
        double refined=best;
        if(best>1 && best<maxTau-1) {
            double a=cmnd[best-1],b=cmnd[best],c=cmnd[best+1];
            double denom=a-2*b+c;
            if(Math.abs(denom)>1e-9) refined+=0.5*(a-c)/denom;
        }
        double hz=sr/refined;
        double confidence=Math.max(0, Math.min(1, 1-cmnd[best]));
        int midi=(int)Math.round(69+12*Math.log(hz/440.0)/Math.log(2));
        if(hz<70 || hz>1000 || confidence<0.78 || midi<25 || midi>100) return new Result(0,confidence,rms,-1);
        return new Result(hz,confidence,rms,midi);
    }
}
