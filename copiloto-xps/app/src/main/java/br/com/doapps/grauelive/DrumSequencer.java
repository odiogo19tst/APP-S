package br.com.doapps.grauelive;
import android.os.*;
import org.json.*;
/** Sixteenth-note loop; best-effort Android timing, never catch-up bursts. */
final class DrumSequencer {
 interface Output {void hit(int channel,int note,int velocity);void state(int step);}
 private final Handler handler=new Handler(Looper.getMainLooper());private final Output output;
 private int generation;private long origin;private double interval;private int[][] grid;private int[] notes;private int channel;
 DrumSequencer(Output output){this.output=output;}
 void start(String json)throws JSONException {JSONObject o=new JSONObject(json);int bpm=o.getInt("bpm"),ch=o.getInt("channel");if(bpm<30||bpm>240||ch<1||ch>16)throw new IllegalArgumentException("BPM/canal inválido");JSONArray ns=o.getJSONArray("notes"),rows=o.getJSONArray("grid");if(ns.length()!=8||rows.length()!=8)throw new IllegalArgumentException("Use oito instrumentos");int[] n=new int[8];int[][] g=new int[8][16];for(int r=0;r<8;r++){n[r]=ns.getInt(r);if(n[r]<0||n[r]>127)throw new IllegalArgumentException("Nota inválida");JSONArray row=rows.getJSONArray(r);if(row.length()!=16)throw new IllegalArgumentException("Use 16 passos");for(int c=0;c<16;c++){g[r][c]=row.getInt(c);if(g[r][c]<0||g[r][c]>127)throw new IllegalArgumentException("Intensidade inválida");}}stop();notes=n;grid=g;channel=ch;interval=15000.0/bpm;origin=SystemClock.uptimeMillis();tick(generation,0);}
 private void tick(int token,long step){if(token!=generation)return;long now=SystemClock.uptimeMillis();long current=Math.max(step,(long)((now-origin)/interval));int column=(int)(current%16);for(int row=0;row<8;row++)if(grid[row][column]>0)output.hit(channel,notes[row],grid[row][column]);output.state(column);long next=current+1;handler.postAtTime(()->tick(token,next),origin+(long)(next*interval));}
 void stop(){generation++;handler.removeCallbacksAndMessages(null);output.state(-1);}
}
