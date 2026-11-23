package br.com.doapps.grauelive;
/** MIDI 1.0 stream parser: running status, split packets, realtime and SysEx. */
public final class MidiStream {
 public interface Listener { void message(int status,int a,int b); }
 private final Listener listener; private int status=0,count=0,first=0,needed=0;
 public MidiStream(Listener l){listener=l;}
 public void reset(){status=0;count=0;needed=0;}
 public void feed(byte[] data,int offset,int length){
  for(int i=offset;i<offset+length;i++){int v=data[i]&255;
   if(v>=248)continue;
   if(v>=128){count=0;if(v>=240){status=0;needed=0;continue;}
    status=v;needed=((v&240)==192||(v&240)==208)?1:2;continue;}
   if(status==0)continue;
   if(count++==0)first=v;
   if(count==needed){listener.message(status,first,needed==2?v:0);count=0;}
  }
 }
}
