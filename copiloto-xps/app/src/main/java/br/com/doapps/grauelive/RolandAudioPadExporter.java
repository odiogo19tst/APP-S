package br.com.doapps.grauelive;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.*;
import java.util.zip.*;

/** Offline export for XPS-10's six USB-memory AUDIO PADs; not a USB-MIDI audio sender. */
public final class RolandAudioPadExporter {
 private RolandAudioPadExporter(){}
 private static final int RATE=44100;
 private static final long MAX_FILE=12L*1024*1024;
 private static final long MAX_TOTAL=70L*1024*1024;

 public static int export(File[] pads,OutputStream destination)throws IOException {
  if(pads==null||pads.length!=8||destination==null)throw new IOException("Oito posições e destino são necessários.");
  int real=0;long total=0;
  // Validate everything before writing; never silently reorder pads or truncate audio.
  for(int i=0;i<pads.length;i++){
   File file=pads[i];if(file==null)continue;
   if(!file.isFile()||file.length()<64||file.length()>MAX_FILE)throw new IOException("Pad "+(i+1)+": arquivo inválido ou maior que 12 MB.");
   String name=file.getName().toLowerCase(Locale.ROOT);
   if(!name.endsWith(".wav")&&!name.endsWith(".mp3"))throw new IOException("Pad "+(i+1)+": apenas WAV ou MP3 são aceitos pelo XPS-10. Converta OGG antes.");
   if(name.endsWith(".wav"))toRolandWave(file); // Check PCM header/sample rate/size before creating output.
   total+=file.length();
   if(total>MAX_TOTAL)throw new IOException("O banco excede 70 MB. Reduza os samples.");
   real++;
  }
  if(real==0)throw new IOException("Este banco está vazio. Importe um sample antes de exportar.");
  ZipOutputStream zip=new ZipOutputStream(new BufferedOutputStream(destination));
  try{
   zip.putNextEntry(new ZipEntry("COMO_USAR.txt"));
   byte[] help=("XPS-10 AUDIO PAD: extraia a pasta SONG LIST para a raiz de um pendrive formatado no Roland.\n"+
      "No teclado: AUDIO PAD > LIST > GRAUE1 ou GRAUE2 > ENTER. Os pads fisicos 1-6 tocam esses arquivos.\n"+
      "GRAUE1 recebe as posicoes 1-6 do Grauê. GRAUE2 recebe as posicoes 7-8.\n"+
      "Os espacos vazios viram WAVs silenciosos para preservar a posicao.\n"+
      "A conexao USB COMPUTER e somente MIDI: arquivos e audio nao sao transmitidos ao teclado.\n"+
      "O XPS-10 nao reproduz dois arquivos dos Audio Pads simultaneamente.\n").getBytes(StandardCharsets.UTF_8);
   zip.write(help);zip.closeEntry();
   byte[] buffer=new byte[16384];
   for(int i=0;i<pads.length;i++){
    File file=pads[i];
    String ext=file!=null&&file.getName().toLowerCase(Locale.ROOT).endsWith(".mp3")?"mp3":"wav";
    String folder=i<6?"GRAUE1":"GRAUE2";
    String entry=String.format(Locale.ROOT,"SONG LIST/%s/%02d.%s",folder,i<6?i+1:i-5,ext);
    zip.putNextEntry(new ZipEntry(entry));
    if(file==null||ext.equals("wav")){
     byte[] wave=file==null?silentWave():toRolandWave(file);
     zip.write(wave);
    }else{
     try(InputStream in=new BufferedInputStream(new FileInputStream(file))){
      int n;while((n=in.read(buffer))!=-1)zip.write(buffer,0,n);
     }
    }
    zip.closeEntry();
   }
   zip.finish();
  }finally{zip.close();}
  return real;
 }
 private static int u16(byte[] a,int p){return (a[p]&255)|((a[p+1]&255)<<8);}
 private static long u32(byte[] a,int p){return ((long)(a[p]&255))|((long)(a[p+1]&255)<<8)|((long)(a[p+2]&255)<<16)|((long)(a[p+3]&255)<<24);}
 private static void put16(OutputStream out,int v)throws IOException{out.write(v&255);out.write((v>>>8)&255);}
 private static void put32(OutputStream out,long v)throws IOException{put16(out,(int)(v&65535));put16(out,(int)((v>>>16)&65535));}
 private static void ascii(OutputStream out,String v)throws IOException{out.write(v.getBytes(StandardCharsets.US_ASCII));}
 private static void header(OutputStream out,int channels,int frames)throws IOException{
  long data=(long)frames*channels*2;
  ascii(out,"RIFF");put32(out,36+data);ascii(out,"WAVEfmt ");
  put32(out,16);put16(out,1);put16(out,channels);put32(out,RATE);
  put32(out,RATE*channels*2);put16(out,channels*2);put16(out,16);
  ascii(out,"data");put32(out,data);
 }
 private static byte[] silentWave()throws IOException{
  ByteArrayOutputStream out=new ByteArrayOutputStream();
  header(out,1,2205);
  out.write(new byte[2205*2]);
  return out.toByteArray();
 }
 /** Decode 16-bit PCM RIFF/WAV into canonical 44.1 kHz, 16-bit WAV for the XPS-10. */
 public static byte[] toRolandWave(File input)throws IOException{
  if(input.length()>MAX_FILE)throw new IOException("WAV excede 12 MB.");
  byte[] data=Files.readAllBytes(input.toPath());
  if(data.length<44||!new String(data,0,4,StandardCharsets.US_ASCII).equals("RIFF")||
     !new String(data,8,4,StandardCharsets.US_ASCII).equals("WAVE"))
   throw new IOException("WAV invalido: RIFF/WAVE esperado.");
  int format=-1,ch=0,rate=0,bits=0,blockAlign=0,offset=-1,size=-1;
  int p=12;
  while(p+8<=data.length){
   long chunkSize=u32(data,p+4);
   long end=(long)p+8+chunkSize;
   if(end>data.length)throw new IOException("WAV com dados incompletos.");
   String kind=new String(data,p,4,StandardCharsets.US_ASCII);
   if("fmt ".equals(kind)){
    if(chunkSize<16)throw new IOException("Cabecalho WAV incompleto.");
    format=u16(data,p+8);ch=u16(data,p+10);rate=(int)u32(data,p+12);
    blockAlign=u16(data,p+20);bits=u16(data,p+22);
   }else if("data".equals(kind)&&offset<0){offset=p+8;size=(int)chunkSize;}
   if(end+1>=Integer.MAX_VALUE)throw new IOException("WAV muito grande.");
   p=(int)(end+(chunkSize&1));
  }
  if(format!=1||!(ch==1||ch==2)||bits!=16||rate<8000||rate>96000||blockAlign!=ch*2||offset<0||size<2)
   throw new IOException("Use WAV PCM 16-bit mono/estereo, 8–96 kHz, ou MP3 44.1 kHz.");
  int frames=size/blockAlign;
  int target=(int)Math.round((double)frames*RATE/rate);
  if(target<1||(long)target*ch*2>32L*1024*1024)throw new IOException("WAV convertido excede 32 MB.");
  ByteArrayOutputStream out=new ByteArrayOutputStream(44+target*ch*2);
  header(out,ch,target);
  for(int i=0;i<target;i++){
   double pos=(double)i*rate/RATE;
   int at=Math.min(frames-1,(int)pos),next=Math.min(frames-1,at+1);
   double fraction=Math.max(0,Math.min(1,pos-at));
   for(int c=0;c<ch;c++){
    int offA=offset+(at*ch+c)*2,offB=offset+(next*ch+c)*2;
    short a=(short)u16(data,offA),b=(short)u16(data,offB);
    int mixed=(int)Math.round(a+(b-a)*fraction);
    put16(out,mixed);
   }
  }
  return out.toByteArray();
 }
}
