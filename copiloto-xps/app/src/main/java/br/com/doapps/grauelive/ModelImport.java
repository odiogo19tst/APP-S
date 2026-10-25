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
  // Some genuine .task artifacts use a LiteRT container rather than ZIP.
  // Reject HTML/error downloads; defer opaque runtime format validation to
  // the actual MediaPipe loader, which is always called before promotion.
  if(file.length()<128)throw new IOException("Arquivo .task incompleto.");
  byte[] header=new byte[256];int size;
  try(InputStream in=new FileInputStream(file)){size=in.read(header);}
  String begin=new String(header,0,Math.max(0,size),java.nio.charset.StandardCharsets.US_ASCII).trim().toLowerCase(java.util.Locale.ROOT);
  if(begin.startsWith("<!doctype")||begin.startsWith("<html")||begin.startsWith("{")||begin.startsWith("access denied"))
   throw new IOException("O download não é um modelo. Verifique o link e baixe o .task original.");
  boolean zip=(header[0]=='P'&&header[1]=='K');
  if(!zip){
   if(file.length()<4096)throw new IOException("Pacote .task pequeno ou incompleto.");
   return; // the neural runtime validates the non-ZIP bundle before installation
  }
  try(ZipFile zip=new ZipFile(file)){
   // Container sanity only: entry names and compression are runtime-specific.
   // MediaPipe, not this importer, decides whether the model schema is supported.
   boolean hasData=false;
   java.util.Enumeration<? extends ZipEntry> entries=zip.entries();
   while(entries.hasMoreElements()){
    ZipEntry entry=entries.nextElement();
    if(!entry.isDirectory()&&entry.getSize()>0){hasData=true;break;}
   }
   if(!hasData)throw new IOException("O pacote .task está vazio. Selecione o arquivo completo do modelo.");
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
