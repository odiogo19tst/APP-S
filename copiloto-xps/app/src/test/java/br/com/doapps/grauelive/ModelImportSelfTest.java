package br.com.doapps.grauelive;
import java.io.*;import java.nio.file.*;import java.util.*;import java.util.zip.*;
public class ModelImportSelfTest {
 static void check(boolean b){if(!b)throw new AssertionError();}
 static byte[] bundle(boolean alternate)throws Exception{ByteArrayOutputStream out=new ByteArrayOutputStream();try(ZipOutputStream zip=new ZipOutputStream(out)){for(String name:(alternate?new String[]{"model.tflite","tokenizer.model","metadata.pb"}:new String[]{"TF_LITE_PREFILL_DECODE","TOKENIZER_MODEL","METADATA"})){byte[] bytes={0,0,0,0,'T','F','L','3'};ZipEntry entry=new ZipEntry(name);entry.setMethod(alternate?ZipEntry.DEFLATED:ZipEntry.STORED);entry.setSize(bytes.length);CRC32 crc=new CRC32();crc.update(bytes);entry.setCrc(crc.getValue());zip.putNextEntry(entry);zip.write(bytes);zip.closeEntry();}}return out.toByteArray();}
 public static void main(String[] args)throws Exception{
  File dir=Files.createTempDirectory("model-test").toFile();File installed=new File(dir,"model.task");byte[] previous={1,2,3};Files.write(installed.toPath(),previous);byte[] valid=bundle(false);
  boolean[] called={false};try{ModelImport.install(new ByteArrayInputStream(valid),dir,f->{check(f.getName().endsWith(".task"));called[0]=true;throw new IOException("runtime rejection");},n->{});throw new AssertionError();}catch(IOException expected){}check(called[0]);check(Arrays.equals(Files.readAllBytes(installed.toPath()),previous));check(dir.list().length==1);
  called[0]=false;try{ModelImport.install(new ByteArrayInputStream("<html>login</html>".getBytes()),dir,f->called[0]=true,n->{});throw new AssertionError();}catch(IOException expected){}check(!called[0]);check(Arrays.equals(Files.readAllBytes(installed.toPath()),previous));
  // Alternate names/compression must reach the runtime; this is not a neural model.
  called[0]=false;byte[] alternate=bundle(true);
  try{ModelImport.install(new ByteArrayInputStream(alternate),dir,f->{called[0]=true;throw new IOException("runtime rejection");},n->{});throw new AssertionError();}catch(IOException expected){}
  check(called[0]);check(Arrays.equals(Files.readAllBytes(installed.toPath()),previous));check(dir.list().length==1);
  ByteArrayOutputStream empty=new ByteArrayOutputStream();try(ZipOutputStream zip=new ZipOutputStream(empty)){}
  called[0]=false;try{ModelImport.install(new ByteArrayInputStream(empty.toByteArray()),dir,f->called[0]=true,n->{});throw new AssertionError();}catch(IOException expected){}check(!called[0]);check(Arrays.equals(Files.readAllBytes(installed.toPath()),previous));check(dir.list().length==1);
  long size=ModelImport.install(new ByteArrayInputStream(valid),dir,f->{check(f.getName().endsWith(".task"));ModelImport.checkBundle(f);},n->{});check(size==valid.length);check(Arrays.equals(Files.readAllBytes(installed.toPath()),valid));check(dir.list().length==1);Files.delete(installed.toPath());Files.delete(dir.toPath());
  System.out.println("Model import: .task path, alternate schemas reach runtime, empty/invalid download rejection, rollback, cleanup and promotion passed (fixture; no neural inference).");
 }
}
