package br.com.doapps.grauelive;

import android.content.Context;
import android.net.Uri;
import android.database.Cursor;
import android.provider.OpenableColumns;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.*;
import java.security.MessageDigest;
import java.util.*;

public final class BackupArchive {
 private static final long MAX_SIZE = 120L*1024*1024;
 private final Context context;
 private final File dir;
 private final File index;
 public BackupArchive(Context ctx) {
  context=ctx.getApplicationContext();
  dir=new File(context.getFilesDir(),"xps-backup-library");
  dir.mkdirs();
  index=new File(dir,"catalog.json");
 }
 private synchronized JSONArray read() throws Exception {
  if(!index.exists())return new JSONArray();
  try(InputStream in=new FileInputStream(index)){byte[] b=new byte[(int)Math.min(index.length(),2*1024*1024)];int n=in.read(b);return new JSONArray(new String(b,0,Math.max(0,n),java.nio.charset.StandardCharsets.UTF_8));}
 }
 private synchronized void save(JSONArray arr) throws Exception {
  File tmp=new File(dir,"catalog.tmp");
  try(OutputStream out=new FileOutputStream(tmp)){out.write(arr.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8));out.flush();}
  if(!tmp.renameTo(index))throw new IOException("Nao foi possivel salvar catalogo");
 }
 public synchronized JSONArray list() throws Exception {return read();}
 private String name(Uri uri) {
  String n="backup.bin";
  try(Cursor c=context.getContentResolver().query(uri,null,null,null,null)){
   if(c!=null&&c.moveToFirst()){int i=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(i>=0)n=c.getString(i);}
  }catch(Exception ignored){}
  if(n==null||n.isBlank())n="backup.bin";
  return n.replaceAll("[\\\\/\\\\p{Cntrl}]","_").substring(0,Math.min(120,n.length()));
 }
 private static String hex(byte[] data){StringBuilder sb=new StringBuilder();for(byte b:data)sb.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return sb.toString();}
 public synchronized JSONArray importFiles(java.util.List<Uri> uris) throws Exception {
  if(uris.size()>25)throw new IOException("Maximo 25 arquivos por lote");
  JSONArray catalog=read();
  for(Uri uri:uris){
   File temp=File.createTempFile("incoming-",".tmp",dir);
   MessageDigest md=MessageDigest.getInstance("SHA-256");
   long total=0;
   try(InputStream in=context.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temp)){
    if(in==null)throw new IOException("Arquivo nao disponivel");
    byte[] b=new byte[16384];int n;
    while((n=in.read(b))!=-1){total+=n;if(total>MAX_SIZE)throw new IOException("Backup maior que 120 MB");out.write(b,0,n);md.update(b,0,n);}
   }catch(Exception e){temp.delete();throw e;}
   if(total==0){temp.delete();throw new IOException("Arquivo vazio");}
   String sha=hex(md.digest()),fileName=sha+".bin";File target=new File(dir,fileName);
   if(!target.exists()&&!temp.renameTo(target)){temp.delete();throw new IOException("Falha ao guardar backup");}
   else temp.delete();
   boolean known=false;for(int i=0;i<catalog.length();i++)if(sha.equals(catalog.getJSONObject(i).optString("sha256")))known=true;
   if(!known){
    JSONObject item=new JSONObject();
    item.put("sha256",sha);item.put("name",name(uri));item.put("bytes",total);item.put("importedAt",System.currentTimeMillis());item.put("formatVerified",false);
    catalog.put(item);
   }
  }
  save(catalog);return catalog;
 }
 public synchronized File fileFor(String sha) throws Exception {
  if(sha==null||!sha.matches("[a-f0-9]{64}"))throw new IOException("Identificador invalido");
  boolean known=false;JSONArray cat=read();for(int i=0;i<cat.length();i++)known|=sha.equals(cat.getJSONObject(i).optString("sha256"));
  if(!known)throw new IOException("Arquivo nao pertence a biblioteca");
  File f=new File(dir,sha+".bin");if(!f.isFile())throw new IOException("Copia nao encontrada");
  return f;
 }
 public synchronized boolean delete(String sha) throws Exception {
  JSONArray cat=read(),res=new JSONArray();boolean found=false;
  for(int i=0;i<cat.length();i++){JSONObject row=cat.getJSONObject(i);if(sha.equals(row.optString("sha256")))found=true;else res.put(row);}
  if(!found)return false;
  save(res);fileDeleteOnly(sha);return true;
 }
 private void fileDeleteOnly(String sha){if(sha!=null&&sha.matches("[a-f0-9]{64}"))new File(dir,sha+".bin").delete();}
}
