package br.com.doapps.grauelive;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;

/** Tonal hypotheses explicitly use both melody and sustained chord observations.
 *  A relative major/minor ambiguity never becomes an asserted key on melody alone.
 */
public final class MusicBrain {
    public static final String[] NOTE={"C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"};
    private static final double[] MAJOR={6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88};
    private static final double[] MINOR={6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17};
    private final Deque<Integer> melody=new ArrayDeque<>();
    private final Deque<Integer> chordEvents=new ArrayDeque<>();
    private final Deque<Integer> phraseEnds=new ArrayDeque<>();
    private int lastSungPc=-1,unvoicedFrames=0;
    private boolean endRecorded=false;
    private final double[] histogram=new double[12];
    private int keyRoot=-1,keyMode=-1,lastChord=-1,stableChord=0;
    private int proposedRoot=-1,proposedMode=-1,proposedCount=0;
    private int degree=0;
    private int manualMode=-1; // -1 auto; 0 major; 1 minor
    private boolean locked=false;
    public static final class Harmony {
        public final int midi,root,mode,degree,confidence,chord1,quality1,chord2,quality2;
        public final int heardChord,heardQuality;
        public final boolean locked;
        Harmony(int midi,int root,int mode,int degree,int conf,int a,int qa,int b,int qb,int heard,int hq,boolean locked){
            this.midi=midi;this.root=root;this.mode=mode;this.degree=degree;confidence=conf;
            chord1=a;quality1=qa;chord2=b;quality2=qb;heardChord=heard;heardQuality=hq;this.locked=locked;
        }
        public boolean knownKey(){return root>=0;}
    }
    public synchronized void reset(){melody.clear();chordEvents.clear();phraseEnds.clear();lastSungPc=-1;unvoicedFrames=0;endRecorded=false;Arrays.fill(histogram,0);keyRoot=-1;keyMode=-1;lastChord=-1;stableChord=0;proposedRoot=-1;proposedMode=-1;proposedCount=0;locked=false;manualMode=-1;}
    public synchronized void setManualMode(int mode){if(mode<-1||mode>1)throw new IllegalArgumentException();manualMode=mode;locked=false;keyRoot=-1;keyMode=-1;proposedRoot=-1;proposedMode=-1;proposedCount=0;}
    public synchronized int manualMode(){return manualMode;}
    public synchronized boolean confirmKey(){if(keyRoot<0)return false;locked=true;return true;}
    public synchronized void unlockKey(){locked=false;}
    public synchronized Harmony accept(int midi){return accept(midi,null);}
    public synchronized Harmony accept(int midi,ChromaAnalyzer.Chord chord){
        if(midi>=0&&midi<=127){
            int pc=midi%12;
            lastSungPc=pc;unvoicedFrames=0;endRecorded=false;
            if(melody.isEmpty()||melody.peekLast()!=pc){
                melody.addLast(pc);histogram[pc]++;
                if(melody.size()>96){int old=melody.removeFirst();histogram[old]--;}
            }
        }
        else if((chord==null||!chord.found())&&lastSungPc>=0){
            unvoicedFrames++;
            if(unvoicedFrames>=3&&!endRecorded){
                phraseEnds.addLast(lastSungPc);if(phraseEnds.size()>12)phraseEnds.removeFirst();
                endRecorded=true;
            }
        }
        int heard=-1,hQuality=-1;
        if(chord!=null&&chord.found()){
            heard=chord.root;hQuality=chord.quality;
            int signature=heard+12*hQuality;
            if(signature==lastChord)stableChord++;else {lastChord=signature;stableChord=1;}
            if(stableChord==3){
                chordEvents.addLast(signature);
                if(chordEvents.size()>30)chordEvents.removeFirst();
            }
        }else{stableChord=0;lastChord=-1;}
        int distinct=0;for(double h:histogram)if(h>0.1)distinct++;
        if(!locked && ((melody.size()>=6 && distinct>=3)||chordEvents.size()>=3)){
            double best=-999,runner=-999;int root=-1,mode=-1;
            for(int m=0;m<=1;m++)for(int r=0;r<12;r++){
                if(manualMode!=-1 && m!=manualMode)continue;
                double score=score(r,m);
                if(score>best){runner=best;best=score;root=r;mode=m;}
                else if(score>runner)runner=score;
            }
            // Confidence floor + stable margin; melody only is intrinsically relative-key ambiguous.
            boolean enoughChords=chordEvents.size()>=2;
            boolean enoughCadences=phraseEnds.size()>=2;
            double margin=enoughChords?0.045:enoughCadences?0.10:0.11;
            if(best>=0.38 && best-runner>=margin && (enoughChords || manualMode!=-1 || enoughCadences)){
                if(root==keyRoot&&mode==keyMode){proposedCount=0;}
                else if(root==proposedRoot&&mode==proposedMode)proposedCount++;
                else{proposedRoot=root;proposedMode=mode;proposedCount=1;}
                if(proposedCount>=3 || keyRoot==-1&&proposedCount>=2){keyRoot=root;keyMode=mode;proposedCount=0;}
            }
        }
        if(keyRoot<0)return new Harmony(midi,-1,-1,0,0,-1,-1,-1,-1,heard,hQuality,locked);
        int[] scale=keyMode==0?new int[]{0,2,4,5,7,9,11}:new int[]{0,2,3,5,7,8,10};
        degree=0;
        if(midi>=0)for(int i=0;i<7;i++)if((keyRoot+scale[i])%12==midi%12){degree=i+1;break;}
        int[] quality=keyMode==0?new int[]{0,1,1,0,0,1,2}:new int[]{1,2,0,1,1,0,0};
        int[] order={0,3,4,5,1,2,6};
        int a=-1,b=-1,qa=-1,qb=-1;
        // Suggestions for a vocal note. Never label them as detected harmony.
        if(midi>=0)for(int i:order){
            int cr=(keyRoot+scale[i])%12,third=(cr+(quality[i]==0?4:3))%12,fifth=(cr+(quality[i]==2?6:7))%12;
            if(midi%12==cr||midi%12==third||midi%12==fifth){
                if(a<0){a=cr;qa=quality[i];}else{b=cr;qb=quality[i];break;}
            }
        }
        int conf=locked?99:Math.min(85,35+melody.size()/2+chordEvents.size()*3);
        return new Harmony(midi,keyRoot,keyMode,degree,conf,a,qa,b,qb,heard,hQuality,locked);
    }
    private double score(int root,int mode){
        double[] profile=mode==0?MAJOR:MINOR;
        double xmean=0,ymean=0;
        for(int i=0;i<12;i++){xmean+=histogram[i];ymean+=profile[i];}
        xmean/=12;ymean/=12;
        double top=0,dx=0,dy=0;
        for(int i=0;i<12;i++){
            double a=histogram[i]-xmean,b=profile[(i-root+12)%12]-ymean;
            top+=a*b;dx+=a*a;dy+=b*b;
        }
        double melodic=dx*dy>0?top/Math.sqrt(dx*dy):0;
        if(chordEvents.isEmpty()){
            // Phrase-final notes provide weak tonic evidence for unaccompanied singers.
            if(phraseEnds.size()<2)return melodic*0.8+(mode==0?0.015:0);
            int endsOnTonic=0;
            for(int pc:phraseEnds)if(pc==root)endsOnTonic++;
            double cadence=(double)endsOnTonic/phraseEnds.size();
            return melodic*0.66+cadence*0.34;
        }
        double chordScore=0,total=0;
        for(int signature:chordEvents){
            int cr=signature%12,q=signature/12;
            int diff=(cr-root+12)%12;
            // Diatonic I/i, IV/iv and V have more tonal evidential weight.
            double support=-0.35;
            if(diff==0&&q==mode)support=2.3;
            else if(diff==5&&q==(mode==0?0:1))support=1.15;
            else if(diff==7&&q==0)support=1.45;
            else if(mode==0&&diff==9&&q==1)support=0.35;
            else if(mode==1&&diff==3&&q==0)support=0.35;
            else if(mode==1&&diff==8&&q==0)support=0.15;
            chordScore+=support;total++;
        }
        return 0.55*melodic+0.45*(chordScore/Math.max(1,total)/2.3);
    }
}
