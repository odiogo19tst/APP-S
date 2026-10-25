package br.com.doapps.grauelive;
import java.util.*;
/** XPS-10 MIDI Implementation e01, pp.10-15. Addresses use base-128, not base-256. */
public final class XpsProtocol {
 public static final int DEVICE=0x10;
 public static int address(int a,int b,int c,int d){return (a<<21)|(b<<14)|(c<<7)|d;}
 public static int[] digits(int n){return new int[]{(n>>21)&127,(n>>14)&127,(n>>7)&127,n&127};}
 public static final class Block {
  public final String section; public final int index,start,size;
  Block(String s,int i,int a,int n){section=s;index=i;start=a;size=n;}
 }
 public static List<Block> blocks(){List<Block> b=new ArrayList<>();b.add(new Block("setup",0,address(1,0,0,0),0x34));b.add(new Block("rhythmGroup",0,address(0x1e,0x13,0,0),0x73));b.add(new Block("common",0,address(0x10,0,0,0),0x38));
  for(int i=0;i<16;i++){b.add(new Block("part",i,address(0x10,0,0x20+i,0),0x31));b.add(new Block("zone",i,address(0x10,0,0x50+i,0),0x1b));}
  for(int i=0;i<3;i++)b.add(new Block("mfx",i,address(0x10,0,new int[]{2,8,10}[i],0),145));
  b.add(new Block("chorus",0,address(0x10,0,4,0),0x54));b.add(new Block("reverb",0,address(0x10,0,6,0),0x53));return b;
 }
 public static List<Block> patches(){List<Block> b=new ArrayList<>();for(int i=0;i<16;i++)b.add(new Block("patch",i,address(0x11+i/4,(i%4)*32,0,0),0x50));return b;}
 public static List<Block> users(){List<Block> b=new ArrayList<>();for(int i=0;i<256;i++)b.add(new Block("user",i,address(0x30+i/128,i%128,0,0),0x50));return b;}
 public static List<Block> readable(){List<Block> b=blocks();b.addAll(patches());b.addAll(users());return b;}
 public static Block block(String section,int index){for(Block b:blocks())if(b.section.equals(section)&&b.index==index)return b;throw new IllegalArgumentException("Bloco desconhecido");}
 public static byte[] packet(int command,int address,int[] payload){int[] ds=digits(address);byte[] p=new byte[13+payload.length];int[] h={0xf0,0x41,DEVICE,0,0,0x3a,command};for(int i=0;i<h.length;i++)p[i]=(byte)h[i];int sum=0;for(int i=0;i<4;i++){p[7+i]=(byte)ds[i];sum+=ds[i];}for(int i=0;i<payload.length;i++){if(payload[i]<0||payload[i]>127)throw new IllegalArgumentException("Dado MIDI inválido");p[11+i]=(byte)payload[i];sum+=payload[i];}p[p.length-2]=(byte)((128-sum%128)%128);p[p.length-1]=(byte)0xf7;return p;}
 public static byte[] request(Block b){return packet(0x11,b.start,digits(b.size));}
 public static final class Data {public final int start;public final int[] values;Data(int s,int[] v){start=s;values=v;}}
 public static Data decode(byte[] p){if(p.length<14||p.length>1024||(p[0]&255)!=240||(p[1]&255)!=65||(p[2]&255)!=DEVICE||p[3]!=0||p[4]!=0||p[5]!=0x3a||p[6]!=0x12||(p[p.length-1]&255)!=247)return null;int sum=0;for(int i=7;i<p.length-1;i++){if((p[i]&255)>127)return null;sum+=p[i]&127;}if(sum%128!=0)return null;int start=address(p[7],p[8],p[9],p[10]);int[] v=new int[p.length-13];for(int i=0;i<v.length;i++)v[i]=p[11+i]&127;return new Data(start,v);}
 public static int writeAddress(String section,int index,int offset,int value){Block b=block(section,index);boolean ok=false;if(value<0||value>127)throw new IllegalArgumentException("Valor MIDI fora da faixa");
  switch(section){
   case "setup":ok=(offset==0&&value==1)||(offset>=10&&offset<=14&&value<=1)||(offset==18&&value>=59&&value<=70)||(offset==19&&value>=61&&value<=67)||(offset==23&&value<=8)||(offset==24&&value<=9)||((offset==25||offset==30||offset==33)&&value<=1)||(offset==27)||(offset==28&&value<=11)||(offset==29&&value>=61&&value<=67)||((offset==31||offset==39)&&value<=100)||offset==32||((offset==35||offset==36)&&value<=15)||(offset==38&&value<=23)||(offset==40&&value>=1);break;
   case "rhythmGroup":for(int pad=0;pad<6;pad++){int start=21+6*pad;if(offset==start&&value>=1)ok=true;if((offset==start+2||offset==start+3)&&value<=15)ok=true;}break;
   case "part":
    if(offset==0)ok=value<=15;else if(offset==1||offset==0x1b)ok=value<=1;
    else if(offset==0x15)ok=value>=61&&value<=67;
    else if(offset==0x1f)ok=value==0||value==1||value==13;
    else if(offset==0x20)ok=value<=2;
    else ok=Arrays.asList(4,5,6,7,8,0x11,0x12,0x13,0x14,0x1c,0x1d,0x1e,0x21).contains(offset);break;
   case "zone":ok=(offset==0&&value>=61&&value<=67)||(offset==1&&value<=1)||offset==12||offset==13;break;
   case "common":ok=(offset>=0x30&&offset<=0x34&&value<=16)||(offset==0x37&&value<=15);break;
   case "mfx":ok=(offset==0&&value<=78)||(offset>=1&&offset<=3);break;
   case "chorus":ok=(offset==0&&value<=3)||offset==1||(offset==3&&value<=2);break;
   case "reverb":ok=(offset==0&&value<=5)||offset==1;break;
  }
  if(!ok)throw new IllegalArgumentException("Parâmetro não permitido");return b.start+offset;
 }
 public static final class Stream {
  public interface Listener {void packet(byte[] p);}
  private final Listener l;private final byte[] buffer=new byte[1024];private int count=0;private boolean active=false;
  public Stream(Listener l){this.l=l;}
  public synchronized void reset(){count=0;active=false;}
  public synchronized void feed(byte[] b,int off,int size){for(int i=off;i<off+size;i++){int v=b[i]&255;if(v>=248)continue;if(v==240){active=true;count=0;buffer[count++]=b[i];continue;}if(!active)continue;if(v==247){buffer[count++]=b[i];l.packet(Arrays.copyOf(buffer,count));reset();}else if(v>=128||count>=buffer.length-1)reset();else buffer[count++]=b[i];}}
 }
}
