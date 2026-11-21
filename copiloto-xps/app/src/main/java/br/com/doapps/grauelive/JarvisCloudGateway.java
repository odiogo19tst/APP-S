package br.com.doapps.grauelive;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;

/** HTTPS gateway; stores only a separate device token, never the OPENAI_API_KEY. */
public final class JarvisCloudGateway {
 private static final String PREF="jarvis_cloud_v1";
 private static final String ALIAS="graue_jarvis_device_auth";
 private final SharedPreferences prefs;
 public JarvisCloudGateway(Context context){prefs=context.getApplicationContext().getSharedPreferences(PREF,Context.MODE_PRIVATE);}
 private SecretKey deviceKey() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  KeyStore.Entry entry=store.getEntry(ALIAS,null);
  if(entry instanceof KeyStore.SecretKeyEntry)return ((KeyStore.SecretKeyEntry)entry).getSecretKey();
  KeyGenerator gen=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  gen.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
   .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
  return gen.generateKey();
 }
 private String protect(String secret)throws Exception {
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.ENCRYPT_MODE,deviceKey());
  byte[] iv=cipher.getIV(),encrypted=cipher.doFinal(secret.getBytes(StandardCharsets.UTF_8));
  byte[] packet=new byte[iv.length+encrypted.length];
  System.arraycopy(iv,0,packet,0,iv.length);System.arraycopy(encrypted,0,packet,iv.length,encrypted.length);
  return Base64.encodeToString(packet,Base64.NO_WRAP);
 }
 private String unprotect(String encoded)throws Exception {
  if(encoded==null||encoded.isEmpty())return "";
  byte[] bytes=Base64.decode(encoded,Base64.NO_WRAP);
  if(bytes.length<29)throw new IOException("Credencial protegida corrompida");
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");cipher.init(Cipher.DECRYPT_MODE,deviceKey(),new GCMParameterSpec(128,Arrays.copyOfRange(bytes,0,12)));
  return new String(cipher.doFinal(bytes,12,bytes.length-12),StandardCharsets.UTF_8);
 }
 private static String cleanUrl(String input)throws Exception {
  String value=input==null?"":input.trim();
  if(value.isEmpty())return "";
  if(value.length()>220)throw new IOException("Endereço grande demais");
  URI uri=new URI(value);
  if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null
   ||uri.getPort()!=-1||uri.getQuery()!=null||uri.getFragment()!=null||(uri.getPath()!=null&&!uri.getPath().isEmpty()&&!uri.getPath().equals("/")))
   throw new IOException("Use somente a raiz HTTPS do seu Worker, sem senha ou caminho");
  return uri.getScheme()+"://"+uri.getHost().toLowerCase(java.util.Locale.ROOT);
 }
 public synchronized void configure(String url,String token,String mode,String model)throws Exception {
  if(!Arrays.asList("automatico","offline","online").contains(mode))throw new IOException("Modo inválido");
  if(!Arrays.asList("gpt-6-luna","gpt-6.1-sol").contains(model))throw new IOException("Modelo não permitido");
  String endpoint=cleanUrl(url);
  if(("online".equals(mode)||"automatico".equals(mode))&&!endpoint.isEmpty()&&token!=null&&!token.isBlank()&&token.length()<20)
   throw new IOException("Token do dispositivo deve ter pelo menos 20 caracteres");
  SharedPreferences.Editor edit=prefs.edit().putString("url",endpoint).putString("mode",mode).putString("model",model);
  if(token!=null&&!token.isBlank()){
   if(endpoint.isEmpty())throw new IOException("Configure o endereço do Worker antes do token");
   edit.putString("device_secret",protect(token));
  }
  edit.apply();
 }
 public synchronized JSONObject state()throws Exception {
  boolean configured=!prefs.getString("url","").isEmpty()&&!prefs.getString("device_secret","").isEmpty();
  return new JSONObject().put("endpoint",prefs.getString("url",""))
   .put("configured",configured).put("mode",prefs.getString("mode","offline"))
   .put("model",prefs.getString("model","gpt-6-luna"));
 }
 public synchronized String mode(){return prefs.getString("mode","offline");}
 public synchronized boolean ready(){return !prefs.getString("url","").isEmpty()&&!prefs.getString("device_secret","").isEmpty();}
 public static final class Answer {
  public final String text,model;
  Answer(String text,String model){this.text=text;this.model=model;}
 }
 public Answer request(String prompt)throws Exception {
  if(prompt==null||prompt.length()>4500)throw new IOException("Texto longo demais para o Jarvis online");
  String url,model,token;
  synchronized(this){
   url=prefs.getString("url","");
   model=prefs.getString("model","gpt-6-luna");
   token=unprotect(prefs.getString("device_secret",""));
  }
  if(url.isEmpty()||token.isEmpty())throw new IOException("Servidor Jarvis ainda não configurado em Ajustes");
  HttpURLConnection c=(HttpURLConnection)new URL(url+"/ask").openConnection();
  c.setInstanceFollowRedirects(false);
  c.setRequestMethod("POST");c.setConnectTimeout(8500);c.setReadTimeout(27000);
  c.setRequestProperty("Authorization","Bearer "+token);
  c.setRequestProperty("Content-Type","application/json; charset=utf-8");
  c.setRequestProperty("Accept","application/json");
  c.setDoOutput(true);
  byte[] payload=new JSONObject().put("model",model).put("prompt",prompt).toString().getBytes(StandardCharsets.UTF_8);
  if(payload.length>8000)throw new IOException("Solicitação acima do limite seguro");
  try{
   try(OutputStream out=c.getOutputStream()){out.write(payload);}
   int status=c.getResponseCode();
   InputStream input=status>=200&&status<300?c.getInputStream():c.getErrorStream();
   if(input==null)throw new IOException("Servidor sem resposta HTTP "+status);
   ByteArrayOutputStream buffer=new ByteArrayOutputStream();byte[] bytes=new byte[2048];int n;
   try(InputStream in=input){while((n=in.read(bytes))!=-1){if(buffer.size()+n>16000)throw new IOException("Resposta excessiva");buffer.write(bytes,0,n);}}
   JSONObject result=new JSONObject(buffer.toString("UTF-8"));
   if(status<200||status>=300)throw new IOException(result.optString("error","Servidor respondeu HTTP "+status).substring(0,Math.min(220,result.optString("error","").length())));
   String response=result.optString("answer","");
   if(response.isBlank())throw new IOException("O modelo respondeu sem texto");
   return new Answer(response,result.optString("model",model));
  }finally{c.disconnect();}
 }
}
