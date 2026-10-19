package br.com.doapps.grauelive;
import java.io.*;
import java.nio.file.*;
import java.util.zip.*;

/** Validate a task bundle before replacing the installed model. Never load a .tmp path. */
public final class ModelImport {
 public interface Validator {void validate(File file)throws Exception;}
 public interface Progress {void copied(long bytes);}
 public static void checkBundle(File file)throws IOException {
  if(!file.getName().endsWith(".task"))throw new IOException("O arquivo de trabalho precisa manter a extensão .task.");
  try(ZipFile zip=new ZipFile(file)){
   for(String name:new String[]{"TF_LITE_PREFILL_DECODE","TOKENIZER_MODEL","METADATA"}){
    ZipEntry entry=zip.getEntry(name);if(entry==null||entry.getSize()<=0)throw new IOException("Pacote sem "+name+". Use o modelo Android .task indicado em Ajustes.");if(entry.getMethod()!=ZipEntry.STORED)throw new IOException("O pacote foi recomprimido. Selecione o arquivo .task original do fornecedor.");
   }
   try(InputStream in=zip.getInputStream(zip.getEntry("TF_LITE_PREFILL_DECODE"))){byte[] header=new byte[8];int n=0,r;while(n<8&&(r=in.read(header,n,8-n))>0)n+=r;if(n!=8||header[4]!='T'||header[5]!='F'||header[6]!='L'||header[7]!='3')throw new IOException("O pacote não contém um modelo TensorFlow Lite válido.");}
  }catch(ZipException e){throw new IOException("Arquivo incompleto ou formato incompatível. Selecione o .task baixado, não uma página HTML, GGUF ou .litertlm.",e);}
 }
 public static long install(InputStream source,File directory,Validator validator,Progress progress)throws Exception {
  File candidate=File.createTempFile("model-import-",".task",directory);long total=0,last=0;
  try{
   try(InputStream in=source;FileOutputStream out=new FileOutputStream(candidate)){
    byte[] buffer=new byte[65536];int n;while((n=in.read(buffer))!=-1){out.write(buffer,0,n);total+=n;if(total-last>=33554432){progress.copied(total);last=total;}}out.getFD().sync();
   }
   progress.copied(total);checkBundle(candidate);validator.validate(candidate);
   Files.move(candidate.toPath(),new File(directory,"model.task").toPath(),StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
   return total;
  }finally{Files.deleteIfExists(candidate.toPath());}
 }
}
