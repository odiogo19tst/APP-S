package br.com.doapps.grauelive;

import android.media.AudioFormat;
import android.media.AudioRecord;
import android.media.MediaRecorder;
import android.os.Process;

/** Collects 4096 samples at 16kHz, updates every 2048 samples (~128ms). */
public final class AudioAnalyzer {
    public interface Callback { void onResult(PitchDetector.Result pitch,MusicBrain.Harmony harmony); void onError(String message); }
    private final Callback cb;
    private final MusicBrain brain = new MusicBrain();
    public void setManualMode(int mode){brain.setManualMode(mode);}
    public int manualMode(){return brain.manualMode();}
    public boolean confirmKey(){return brain.confirmKey();}
    public void unlockKey(){brain.unlockKey();}
    public void resetAnalysis(){int mode=brain.manualMode();brain.reset();brain.setManualMode(mode);latestMidi=-1;stableCount=0;}
    private volatile boolean running;
    private AudioRecord recorder;
    private Thread worker;
    private int latestMidi=-1, stableCount=0;
    public AudioAnalyzer(Callback cb){this.cb=cb;}
    @SuppressWarnings("MissingPermission")
    public synchronized void start(){
        if(running)return;
        int sr=16000,frame=4096,hop=2048;
        int min=AudioRecord.getMinBufferSize(sr,AudioFormat.CHANNEL_IN_MONO,AudioFormat.ENCODING_PCM_16BIT);
        if(min<0){cb.onError("AudioRecord indisponível: "+min);return;}
        try{
            recorder=new AudioRecord(MediaRecorder.AudioSource.MIC,sr,AudioFormat.CHANNEL_IN_MONO,
                    AudioFormat.ENCODING_PCM_16BIT,Math.max(min,frame*4));
            if(recorder.getState()!=AudioRecord.STATE_INITIALIZED)throw new IllegalStateException("microfone não inicializado");
            recorder.startRecording();running=true; int mode=brain.manualMode(); brain.reset(); brain.setManualMode(mode);latestMidi=-1;stableCount=0;
        }catch(Exception e){cb.onError("Falha no microfone: "+e.getMessage());stop();return;}
        final AudioRecord active=recorder;
        worker=new Thread(()->{
            Process.setThreadPriority(Process.THREAD_PRIORITY_AUDIO);
            PitchDetector detector=new PitchDetector(sr);
            ChromaAnalyzer chordDetector=new ChromaAnalyzer(sr,frame);
            int lastChord=-1,chordCount=0;
            short[] buffer=new short[frame];short[] scratch=new short[hop];int have=0;
            while(running){
                int n=active.read(scratch,0,hop);
                if(n<=0){if(n<0){running=false;cb.onError("Leitura do áudio falhou: "+n);break;}continue;}
                if(have<frame){System.arraycopy(scratch,0,buffer,have,Math.min(n,frame-have));have+=n;}
                if(have<frame)continue;
                PitchDetector.Result p=detector.detect(buffer,frame);
                ChromaAnalyzer.Chord chord=chordDetector.detect(buffer,frame);
                int signature=chord.found()?chord.root+chord.quality*12:-1;
                if(signature>=0&&signature==lastChord)chordCount++;else{lastChord=signature;chordCount=1;}
                if(chordCount<2) chord=null;
                int detected=p.midi;
                // YIN is monophonic. A mixed chord can cause an unreliable apparent vocal note.
                if(chord!=null && chord.found() && p.clarity<0.92)detected=-1;
                if(detected>=0 && detected==latestMidi)stableCount++;else {latestMidi=detected;stableCount=1;}
                int filtered=stableCount>=2?detected:-1;
                MusicBrain.Harmony h=brain.accept(filtered,chord);
                cb.onResult(p,h);
                System.arraycopy(buffer,hop,buffer,0,frame-hop); have=frame-hop;
            }
        },"graue-audio");worker.start();
    }
    public synchronized void stop(){running=false;
        if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}}
        Thread old=worker;
        if(old!=null&&old!=Thread.currentThread())try{old.join(1000);}catch(InterruptedException e){Thread.currentThread().interrupt();}
        if(recorder!=null){recorder.release();recorder=null;}
        worker=null;
    }
    public boolean isRunning(){return running;}
}
