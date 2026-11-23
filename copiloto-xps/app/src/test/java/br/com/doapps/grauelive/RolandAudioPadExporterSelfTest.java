package br.com.doapps.grauelive;
import java.io.*;
import java.nio.file.*;
import java.util.*;
import java.util.zip.*;
public class RolandAudioPadExporterSelfTest{
 static void ok(boolean good,String why){if(!good)throw new AssertionError(why);}
 static int u16(byte[] b,int at){return (b[at]&255)|((b[at+1]&255)<<8);}
 static long u32(byte[] b,int at){return (b[at]&255)|((b[at+1]&255)<<8)|((b[at+2]&255)<<16)|((long)(b[at+3]&255)<<24);}
 static void little(OutputStream o,int v,int size)throws IOException{for(int i=0;i<size;i++)o.write(v>>>8*i&255);}
 static File sample(Path dir,int index)throws Exception{
  File f=dir.resolve("sample"+index+".wav").toFile();
  try(OutputStream o=new FileOutputStream(f)){
   o.write("RIFF".getBytes("US-ASCII"));little(o,36+2205*2,4);o.write("WAVEfmt ".getBytes("US-ASCII"));
   little(o,16,4);little(o,1,2);little(o,1,2);little(o,22050,4);little(o,44100,4);
   little(o,2,2);little(o,16,2);o.write("data".getBytes("US-ASCII"));little(o,2205*2,4);
   for(int i=0;i<2205;i++)little(o,(short)(Math.sin(2*Math.PI*i/100)*12000),2);
  }
  return f;
 }
 public static void main(String[] args)throws Exception{
  Path dir=Files.createTempDirectory("roland-pads-test");
  try{
   File[] pads=new File[8];
   pads[0]=sample(dir,0);pads[6]=sample(dir,6);
   byte[] converted=RolandAudioPadExporter.toRolandWave(pads[0]);
   ok(new String(converted,0,4,"US-ASCII").equals("RIFF"),"Not WAV");
   ok(u32(converted,24)==44100,"WAV must be 44.1 kHz");
   ok(u16(converted,34)==16,"16-bit WAV required");
   ByteArrayOutputStream out=new ByteArrayOutputStream();
   ok(RolandAudioPadExporter.export(pads,out)==2,"Only 2 slots contain sound");
   Map<String,byte[]> entries=new HashMap<>();
   try(ZipInputStream input=new ZipInputStream(new ByteArrayInputStream(out.toByteArray()))){
    ZipEntry e;while((e=input.getNextEntry())!=null)entries.put(e.getName(),input.readAllBytes());
   }
   ok(entries.containsKey("SONG LIST/GRAUE1/01.wav"),"Pad 1 missing");
   ok(entries.containsKey("SONG LIST/GRAUE1/06.wav"),"Pad 6 placeholder missing");
   ok(entries.containsKey("SONG LIST/GRAUE2/01.wav"),"Pad 7 missing");
   ok(entries.containsKey("SONG LIST/GRAUE2/02.wav"),"Pad 8 placeholder missing");
   ok(entries.get("SONG LIST/GRAUE1/06.wav").length>44,"Silent placeholder must be valid WAV");
   ok(u32(entries.get("SONG LIST/GRAUE2/01.wav"),24)==44100,"Pad 7 format invalid");
   boolean emptyRejected=false;
   try{RolandAudioPadExporter.export(new File[8],new ByteArrayOutputStream());}catch(IOException expected){emptyRejected=true;}
   ok(emptyRejected,"Do not export empty banks");
   System.out.println("Roland XPS-10 export: 44.1kHz conversion, 6-pad grouping and safe placeholders PASS");
  }finally{try(java.util.stream.Stream<Path> stream=Files.walk(dir)){stream.sorted(Comparator.reverseOrder()).forEach(p->{try{Files.deleteIfExists(p);}catch(IOException ignored){}});}}
 }
}
