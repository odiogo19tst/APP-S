package br.com.doapps.grauelive;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Arrays;
import javax.crypto.*;
import javax.crypto.spec.GCMParameterSpec;
import org.json.*;

/** Single-user BYOK alternative. Key is encrypted at rest via Android Keystore.
 * Important: direct-device keys carry more exposure risk than a secure gateway. */
public final class JarvisDirectOpenAI {
 private static final String ALIAS="graue_openai_direct_2026";
 private final SharedPreferences prefs;
 public JarvisDirectOpenAI(Context context){prefs=context.getApplicationContext().getSharedPreferences("graue_openai_byok_v1",Context.MODE_PRIVATE);}
 private SecretKey secret() throws Exception {
  KeyStore store=KeyStore.getInstance("AndroidKeyStore");store.load(null);
  KeyStore.Entry existing=store.getEntry(ALIAS,null);
  if(existing instanceof KeyStore.SecretKeyEntry)return ((KeyStore.SecretKeyEntry)existing).getSecretKey();
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(ALIAS,KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
     .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
     .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).setKeySize(256).build());
  return generator.generateKey();
 }
 private String encrypt(String key) throws Exception {
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,secret());
  byte[] iv=c.getIV(),ciphertext=c.doFinal(key.getBytes(StandardCharsets.UTF_8));
  byte[] out=new byte[iv.length+ciphertext.length];
  System.arraycopy(iv,0,out,0,iv.length);System.arraycopy(ciphertext,0,out,iv.length,ciphertext.length);
  return Base64.encodeToString(out,Base64.NO_WRAP);
 }
 private String decrypt(String token) throws Exception {
  byte[] b=Base64.decode(token,Base64.NO_WRAP);
  if(b.length<29)throw new IOException("Chave cifrada inválida");
  Cipher c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,secret(),new GCMParameterSpec(128,Arrays.copyOfRange(b,0,12)));
  return new String(c.doFinal(b,12,b.length-12),StandardCharsets.UTF_8);
 }
 private static boolean isMode(String value){return "offline".equals(value)||"online".equals(value)||"automatico".equals(value);}
 private static boolean isModel(String value){return "gpt-6-luna".equals(value)||"gpt-6.1-sol".equals(value);}
 public synchronized void configure(String key,String mode,String model) throws Exception {
  if(!isMode(mode)||!isModel(model))throw new IOException("Modo ou modelo inválido");
  SharedPreferences.Editor edit=prefs.edit().putString("mode",mode).putString("model",model);
  if(key!=null&&!key.isEmpty()){
   if(!key.startsWith("sk-")||key.length()<30||key.length()>500||key.matches(".*\\s+.*"))
    throw new IOException("Chave OpenAI inválida. Informe uma chave de projeto sem espaços.");
   edit.putString("sealed_key",encrypt(key));
  }
  if(!edit.commit())throw new IOException("Não foi possível salvar configuração protegida");
 }
 public synchronized void clear(){
  prefs.edit().remove("sealed_key").putString("mode","offline").commit();
 }
 public synchronized boolean selected(){return prefs.contains("mode");}
 public synchronized boolean ready(){return !prefs.getString("sealed_key","").isEmpty();}
 public synchronized String mode(){return prefs.getString("mode","offline");}
 public synchronized JSONObject state() throws Exception {
  return new JSONObject().put("configured",ready()).put("mode",mode())
    .put("model",prefs.getString("model","gpt-6-luna"));
 }
 public JarvisCloudGateway.Answer request(String prompt) throws Exception {
  if(prompt==null||prompt.isBlank()||prompt.length()>4600)throw new IOException("Pergunta muito longa");
  String key,model;
  synchronized(this){
   String sealed=prefs.getString("sealed_key","");
   if(sealed.isEmpty())throw new IOException("Chave OpenAI não configurada");
   key=decrypt(sealed);model=prefs.getString("model","gpt-6-luna");
  }
  if(!isModel(model))throw new IOException("Modelo fora da lista de segurança");
  HttpURLConnection c=(HttpURLConnection)new URL("https://api.openai.com/v1/responses").openConnection();
  c.setInstanceFollowRedirects(false);c.setRequestMethod("POST");
  c.setConnectTimeout(9000);c.setReadTimeout(25000);
  c.setRequestProperty("Authorization","Bearer "+key);
  c.setRequestProperty("Content-Type","application/json; charset=utf-8");
  c.setRequestProperty("Accept","application/json");c.setDoOutput(true);
  JSONObject payload=new JSONObject().put("model",model).put("input",prompt)
      .put("max_output_tokens",300).put("store",false);
  byte[] data=payload.toString().getBytes(StandardCharsets.UTF_8);
  if(data.length>11000)throw new IOException("Contexto acima do limite");
  try {
   try(OutputStream out=c.getOutputStream()){out.write(data);}
   int status=c.getResponseCode();
   InputStream stream=status>=200&&status<300?c.getInputStream():c.getErrorStream();
   if(stream==null)throw new IOException("API não respondeu (HTTP "+status+")");
   ByteArrayOutputStream out=new ByteArrayOutputStream();
   try(InputStream in=stream){byte[] buf=new byte[2048];int n;while((n=in.read(buf))!=-1){
    if(out.size()+n>32000)throw new IOException("Resposta maior que o limite");out.write(buf,0,n);
   }}
   if(status==401)throw new IOException("Chave inválida/revogada (401). Verifique em OpenAI Platform.");
   if(status==429){
    String code="";
    try {
     JSONObject error=new JSONObject(out.toString("UTF-8")).optJSONObject("error");
     if(error!=null)code=error.optString("code",error.optString("type",""));
    }catch(Exception ignored){}
    if("insufficient_quota".equals(code))throw new IOException("Sem créditos ou limite financeiro atingido na API OpenAI. Confira Billing na OpenAI Platform. A assinatura ChatGPT não cobre a API.");
    throw new IOException("API 429: limite temporário de requisições/tokens, ou saldo insuficiente. Confira Billing e Limits; use Gemma offline.");
   }
   if(status<200||status>=300)throw new IOException("API não disponível (HTTP "+status+"). Veja saldo e permissões da chave.");
   JSONObject result=new JSONObject(out.toString("UTF-8"));
   JSONArray items=result.optJSONArray("output");StringBuilder response=new StringBuilder();
   if(items!=null)for(int i=0;i<items.length();i++){
    JSONArray contents=items.optJSONObject(i)==null?null:items.optJSONObject(i).optJSONArray("content");
    if(contents!=null)for(int j=0;j<contents.length();j++){
     JSONObject block=contents.optJSONObject(j);
     if(block!=null&&"output_text".equals(block.optString("type")))response.append(block.optString("text")).append('\n');
    }
   }
   if(response.length()==0)throw new IOException("Sem resposta textual. Verifique saldo ou limite de saída.");
   return new JarvisCloudGateway.Answer(response.toString().trim().substring(0,Math.min(2400,response.toString().trim().length())),model);
  }finally{c.disconnect();}
 }
}
