package br.com.doapps.grauelive;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
/** Standard MIDI files 0/1, PPQ, constant tempo and quarter-note meter. Never imports SysEx or patch changes. */
public final class MidiLoopSmf {
 private static final int PPQ=480;
 private static final class At {long tick;int s,a,b;At(long t,int s,int a,int b){tick=t;this.s=s;this.a=a;this.b=b;}}
 private static void vlq(DataOutputStream out,long value)throws IOException{if(value<0||value>0x0fffffff)throw new IOException("Tempo MIDI inválido");int shift=21;while(shift>0&&((value>>shift)&127)==0)shift-=7;for(;shift>0;shift-=7)out.writeByte((int)((value>>shift)&127)|128);out.writeByte((int)value&127);}
 private static void meta(DataOutputStream out,long delta,int type,byte[] data)throws IOException{vlq(out,delta);out.writeByte(255);out.writeByte(type);vlq(out,data.length);out.write(data);}
 private static void chunk(DataOutputStream file,byte[] track)throws IOException{file.writeInt(0x4d54726b);file.writeInt(track.length);file.write(track);}
 public static byte[] encode(MidiLooper.Session session)throws IOException{
  long end=(long)PPQ*session.beats*session.bars,duration=session.durationNs();ByteArrayOutputStream bytes=new ByteArrayOutputStream();DataOutputStream file=new DataOutputStream(bytes);file.writeInt(0x4d546864);file.writeInt(6);file.writeShort(1);file.writeShort(5);file.writeShort(PPQ);
  ByteArrayOutputStream conductor=new ByteArrayOutputStream();DataOutputStream c=new DataOutputStream(conductor);int tempo=60_000_000/session.bpm;meta(c,0,0x51,new byte[]{(byte)(tempo>>16),(byte)(tempo>>8),(byte)tempo});meta(c,0,0x58,new byte[]{(byte)session.beats,2,24,8});meta(c,end,0x2f,new byte[0]);chunk(file,conductor.toByteArray());
  for(int i=0;i<4;i++){
   ByteArrayOutputStream data=new ByteArrayOutputStream();DataOutputStream out=new DataOutputStream(data);meta(out,0,3,("GRAUE_TRACK_"+i).getBytes(StandardCharsets.US_ASCII));long previous=0;boolean[][] notes=new boolean[16][128];boolean[] sustain=new boolean[16],bend=new boolean[16],mod=new boolean[16];
   for(MidiLooper.Event e:session.tracks.get(i)){long tick=Math.min(end-1,Math.round((double)e.offsetNs*end/duration));vlq(out,tick-previous);previous=tick;out.writeByte(e.status);out.writeByte(e.note);out.writeByte(e.velocity);int k=e.status&240,ch=e.status&15;if(k==0x90)notes[ch][e.note]=e.velocity>0;else if(k==0x80)notes[ch][e.note]=false;else if(k==0xe0)bend[ch]=e.note!=0||e.velocity!=64;else if(k==0xb0&&e.note==64)sustain[ch]=e.velocity>=64;else if(k==0xb0&&e.note==1)mod[ch]=e.velocity>0;}
   List<At> cleanup=new ArrayList<>();for(int ch=0;ch<16;ch++){for(int note=0;note<128;note++)if(notes[ch][note])cleanup.add(new At(end,0x80|ch,note,0));if(sustain[ch])cleanup.add(new At(end,0xb0|ch,64,0));if(bend[ch])cleanup.add(new At(end,0xe0|ch,0,64));if(mod[ch])cleanup.add(new At(end,0xb0|ch,1,0));}
   for(At e:cleanup){vlq(out,end-previous);previous=end;out.writeByte(e.s);out.writeByte(e.a);out.writeByte(e.b);}meta(out,end-previous,0x2f,new byte[0]);chunk(file,data.toByteArray());
  }
  if(bytes.size()>MidiLoopFiles.MAX_BYTES)throw new IOException("MIDI maior que 1 MB");return bytes.toByteArray();
 }
 private static final class Cursor {
  final byte[] b;int at,end;Cursor(byte[] b,int start,int end){this.b=b;this.at=start;this.end=end;}
  int u8()throws IOException{if(at>=end)throw new IOException("MIDI truncado");return b[at++]&255;}
  int u16()throws IOException{return (u8()<<8)|u8();}int i32()throws IOException{return (u8()<<24)|(u8()<<16)|(u8()<<8)|u8();}
  long variable()throws IOException{long v=0;for(int i=0;i<4;i++){int x=u8();v=(v<<7)|(x&127);if(x<128)return v;}throw new IOException("Delta MIDI inválido");}
  byte[] block(int n)throws IOException{if(n<0||n>end-at)throw new IOException("Bloco MIDI inválido");byte[] data=Arrays.copyOfRange(b,at,at+n);at+=n;return data;}
 }
 public static MidiLooper.Session decode(byte[] bytes)throws IOException{
  if(bytes==null||bytes.length>MidiLoopFiles.MAX_BYTES)throw new IOException("MIDI maior que 1 MB");Cursor file=new Cursor(bytes,0,bytes.length);if(file.i32()!=0x4d546864)throw new IOException("Não é um arquivo MIDI");int header=file.i32();if(header<6)throw new IOException("Cabeçalho MIDI inválido");int format=file.u16(),trackCount=file.u16(),ppq=file.u16();file.block(header-6);
  if((format!=0&&format!=1)||trackCount<1||trackCount>32||(format==0&&trackCount!=1)||ppq<1||(ppq&0x8000)!=0)throw new IOException("Use MIDI formato 0 ou 1 com resolução PPQ");
  List<List<At>> raw=new ArrayList<>();int[] preferred=new int[trackCount];Arrays.fill(preferred,-1);int tempo=500000,beats=4;boolean seenTempo=false,seenMeter=false;long max=0;int totalEvents=0;
  for(int t=0;t<trackCount;t++){
   if(file.i32()!=0x4d54726b)throw new IOException("Trilha MIDI ausente");int length=file.i32();byte[] data=file.block(length);Cursor in=new Cursor(data,0,data.length);List<At> events=new ArrayList<>();long tick=0;int running=0;boolean ended=false;
   while(in.at<in.end){tick+=in.variable();if(tick>(long)ppq*12*32)throw new IOException("MIDI excede 32 compassos");int s=in.u8();int first=-1;if(s<128){if(running==0)throw new IOException("Running status MIDI inválido");first=s;s=running;}
    if(s==255){running=0;int type=in.u8();int n=(int)in.variable();byte[] value=in.block(n);
     if(type==0x51){if(n!=3)throw new IOException("BPM MIDI inválido");int next=((value[0]&255)<<16)|((value[1]&255)<<8)|(value[2]&255);if(next<=0||(seenTempo&&next!=tempo)||(!seenTempo&&tick>0&&next!=500000))throw new IOException("MIDI com mudanças de BPM não é suportado");tempo=next;seenTempo=true;}
     else if(type==0x58){if(n!=4||value[1]!=2||(seenMeter&&(value[0]&255)!=beats)||(!seenMeter&&tick>0&&(value[0]&255)!=4))throw new IOException("Use compasso constante com denominador 4");beats=value[0]&255;seenMeter=true;}
     else if(type==3){String name=new String(value,StandardCharsets.UTF_8);if(name.matches("GRAUE_TRACK_[0-3]"))preferred[t]=name.charAt(name.length()-1)-'0';}
     else if(type==0x2f){if(n!=0)throw new IOException("Fim de trilha inválido");ended=true;if(in.at!=in.end)throw new IOException("Dados depois do fim da trilha");break;}
    }else if(s==0xf0||s==0xf7){running=0;in.block((int)in.variable());}
    else {if(s<0x80||s>0xef)throw new IOException("Evento MIDI não suportado");running=s;int a=first>=0?first:in.u8(),k=s&240,b=(k==0xc0||k==0xd0)?0:in.u8();if(a>127||b>127)throw new IOException("Dados MIDI inválidos");if(MidiLooper.musical(s,a,b)){events.add(new At(tick,s,a,b));if(++totalEvents>MidiLooper.TRACKS*MidiLooper.MAX_EVENTS)throw new IOException("Muitos eventos MIDI");}}
   }
   if(!ended)throw new IOException("Trilha MIDI incompleta");max=Math.max(max,tick);raw.add(events);
  }
  if(file.at!=file.end)throw new IOException("Dados extras no MIDI");int bpm=(int)Math.round(60_000_000.0/tempo);if(bpm<40||bpm>240||beats<1||beats>12)throw new IOException("BPM ou compasso fora dos limites do looper");int bars=(int)Math.max(1,(max+(long)ppq*beats-1)/((long)ppq*beats));if(bars>32)throw new IOException("MIDI excede 32 compassos");
  long duration=60_000_000_000L*beats*bars/bpm;List<List<MidiLooper.Event>> tracks=new ArrayList<>();for(int i=0;i<4;i++)tracks.add(new ArrayList<>());boolean[] used=new boolean[4];int noteOns=0;
  for(int t=0;t<raw.size();t++){List<At> events=raw.get(t);int target=preferred[t];if(events.isEmpty()&&target<0)continue;if(target<0){for(int i=0;i<4;i++)if(!used[i]){target=i;break;}}if(target<0||used[target])throw new IOException("Use no máximo quatro pistas musicais");used[target]=true;
   List<MidiLooper.Event> result=tracks.get(target);for(At e:events){long at=Math.min(duration-1,Math.round((double)e.tick*60_000_000_000L/((double)ppq*bpm)));result.add(new MidiLooper.Event(at,e.s,e.a,e.b));if((e.s&240)==0x90&&e.b>0)noteOns++;}if(result.size()>MidiLooper.MAX_EVENTS)throw new IOException("Pista MIDI excede o limite de eventos");
  }
  if(noteOns==0)throw new IOException("MIDI sem notas musicais");try{return new MidiLooper.Session(bpm,beats,bars,tracks,new boolean[4]);}catch(IllegalArgumentException e){throw new IOException(e.getMessage(),e);}
 }
}
