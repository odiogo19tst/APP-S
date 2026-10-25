package br.com.doapps.grauelive;

import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.security.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Verified, resumable one-time Gemma 3 270M download.
 * Attribution / Terms: https://ai.google.dev/gemma/terms
 * Community mirror is NOT an official Google-hosted download.
 */
public final class Gemma270Installer {
 public static final String MODEL_PAGE="https://huggingface.co/72fstudio/gemma-3-270m-it/blob/main/gemma3-270m-it-q8.task";
 public static final String MODEL_URL="https://huggingface.co/72fstudio/gemma-3-270m-it/resolve/main/gemma3-270m-it-q8.task";
 public static final String TERMS_URL="https://ai.google.dev/gemma/terms";
 public static final String SHA256="0f7147f1c22eaf758b819bbf7841793e4c90096c9352cde7fbe5c631f2265ef5";
 public static final long EXPECTED_BYTES=303950933L; // Exact LFS size from the pinned Hugging Face SHA-256
 private static final long HARD_LIMIT=380L*1024*1024;
 public interface Progress {void update(int percent,String message);}
 public interface Validator {void validate(File candidate)throws Exception;}
 private Gemma270Installer(){}
 public static boolean isVerified(File model)throws Exception{return model.isFile()&&digest(model).equals(SHA256);}
 public static String digest(File f)throws Exception{
  MessageDigest md=MessageDigest.getInstance("SHA-256");
  try(InputStream in=new BufferedInputStream(new FileInputStream(f))){
   byte[] b=new byte[131072];int n;while((n=in.read(b))!=-1)md.update(b,0,n);
  }
  StringBuilder out=new StringBuilder();
  for(byte b:md.digest())out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));
  return out.toString();
 }
 public static void install(File folder,AtomicBoolean cancelled,Progress progress,Validator validator)throws Exception{
  if(folder==null||!folder.isDirectory())throw new IOException("Diretório local indisponível");
  File installed=new File(folder,"model.task");
  if(isVerified(installed)){progress.update(100,"Gemma já está instalada e verificada.");return;}
  File downloading=new File(folder,"gemma-270m-download.task");
  long offset=downloading.exists()?downloading.length():0;
  if(offset<0||offset>EXPECTED_BYTES){downloading.delete();offset=0;}
  if(folder.getUsableSpace()<Math.max(80L*1024*1024,EXPECTED_BYTES-offset+80L*1024*1024))
    throw new IOException("Sem espaço para a IA: libere cerca de 420 MB no armazenamento do celular.");
  if(offset<EXPECTED_BYTES){
   URL url=new URL(MODEL_URL);
   if(!"https".equals(url.getProtocol()))throw new IOException("Apenas download seguro HTTPS é permitido");
   HttpURLConnection connection=(HttpURLConnection)url.openConnection();
   connection.setInstanceFollowRedirects(true);
   connection.setConnectTimeout(25000);connection.setReadTimeout(30000);
   connection.setRequestProperty("User-Agent","GraueXPS-Gemma270/1.0");
   if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
   long done=offset;
   try{
    int status=connection.getResponseCode();
    if(status!=200&&status!=206)throw new IOException("Servidor do modelo respondeu "+status+". Confira rede ou página da licença.");
    // Some servers ignore Range. Restart instead of appending a full file.
    if(status==200)done=0;
    if(done>0&&status==206){
     String range=connection.getHeaderField("Content-Range");
     if(range==null||!range.startsWith("bytes "+done+"-"))throw new IOException("Servidor não confirmou a retomada do download.");
    }
    if(!"https".equalsIgnoreCase(connection.getURL().getProtocol()))throw new IOException("Redirecionamento inseguro bloqueado");
    try(InputStream in=new BufferedInputStream(connection.getInputStream());
        OutputStream out=new BufferedOutputStream(new FileOutputStream(downloading,done>0))){
     byte[] buf=new byte[131072];int n;long lastReport=0;
     while((n=in.read(buf))!=-1){
      if(cancelled.get())throw new InterruptedIOException("Download pausado. Você poderá continuar depois.");
      done+=n;if(done>HARD_LIMIT)throw new IOException("Arquivo ultrapassa o limite seguro do modelo.");
      out.write(buf,0,n);
      if(done-lastReport>3L*1024*1024){
       lastReport=done;
       progress.update((int)Math.min(99,done*100L/EXPECTED_BYTES),"Baixando Gemma: "+(done/1048576)+" de aproximadamente 304 MB");
      }
     }
    }
   }finally{connection.disconnect();}
  }
  if(cancelled.get())throw new InterruptedIOException("Download pausado.");
  if(downloading.length()!=EXPECTED_BYTES)throw new IOException("Arquivo ainda incompleto ("+downloading.length()+" / "+EXPECTED_BYTES+" bytes). Toque novamente para retomar.");
  progress.update(99,"Verificando integridade SHA-256...");
  if(!SHA256.equals(digest(downloading))){downloading.delete();throw new IOException("Hash inválido: arquivo descartado. Nenhuma IA foi substituída.");}
  ModelImport.checkBundle(downloading);
  progress.update(99,"Testando se a Gemma carrega neste aparelho...");
  validator.validate(downloading);
  // Keep user's previous custom model safe until the full new model is validated.
  Path destination=installed.toPath();
  try{Files.move(downloading.toPath(),destination,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
  catch(AtomicMoveNotSupportedException ex){Files.move(downloading.toPath(),destination,StandardCopyOption.REPLACE_EXISTING);}
  progress.update(100,"Gemma 3 270M instalada e verificada. IA offline disponível.");
 }
}