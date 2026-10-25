package br.com.doapps.grauelive;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;

/** Read-only, bounded identification of original Roland backups.
 * A file inventory is not decoding Favorites. Never synthesizes bank contents.
 */
public final class RolandBackupInspector {
 private RolandBackupInspector(){}
 public static JSONObject inspect(File file,String name)throws Exception {
  if(file==null||!file.isFile()||file.length()<1)throw new IOException("Arquivo de backup indisponível");
  JSONObject out=new JSONObject();
  out.put("name",name==null?"original":name);
  out.put("bytes",file.length());
  out.put("readOnly",true).put("favoritesDecoded",false).put("favoritesCount",0);
  byte[] header=new byte[64];int length;
  try(InputStream in=new BufferedInputStream(new FileInputStream(file))){length=in.read(header);}
  if(length<0)throw new IOException("Backup vazio");
  StringBuilder hex=new StringBuilder();
  for(int i=0;i<length;i++)hex.append(String.format(Locale.ROOT,"%02X",header[i]&255));
  out.put("headerHex",hex.toString());
  boolean isZip=length>=4&&(header[0]&255)==0x50&&(header[1]&255)==0x4B&&((header[2]&255)==3||(header[2]&255)==5||(header[2]&255)==7);
  out.put("container",isZip?"ZIP":"Binary/unknown");
  JSONArray members=new JSONArray();
  if(isZip) {
   long totalDeclared=0;
   try(ZipFile zip=new ZipFile(file)){
    Enumeration<? extends ZipEntry> entries=zip.entries();int count=0;
    while(entries.hasMoreElements()&&count<120){
     ZipEntry entry=entries.nextElement();
     count++;
     if(entry.getSize()>0){totalDeclared+=entry.getSize();if(totalDeclared>500L*1024*1024)throw new IOException("ZIP maior que o limite de inspeção");}
     String entryName=entry.getName();
     JSONObject info=new JSONObject().put("path",entryName.length()>180?entryName.substring(0,180):entryName)
       .put("bytes",entry.getSize()).put("directory",entry.isDirectory());
     members.put(info);
    }
    out.put("entryListTruncated",entries.hasMoreElements());
   }catch(ZipException e){out.put("container","ZIP inválido/criptografado");}
  }
  out.put("files",members);
  out.put("interpretation","Estrutura original identificada apenas para diagnóstico. Nenhum favorito foi extraído ou alterado. Para mapear as 100 posições, precisamos validar o formato real do arquivo.");
  return out;
 }
}
