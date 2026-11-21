package br.com.doapps.grauelive;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * LouveApp partner token stored only on this Android device.
 * Never put the token in a WebView, saved repertoire JSON, backup, log,
 * clipboard, URL, GitHub Actions or external synchronization service.
 */
public final class LouveTokenVault {
 private static final String ALIAS="graue_louveapp_partner_token_v1";
 private static final String PREFS="graue_louveapp_local_secret";
 private static final String ENCRYPTED="token_cipher";
 private static final String IV="token_nonce";
 private final SharedPreferences prefs;

 public LouveTokenVault(Context context) {
  prefs=context.getApplicationContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
 }
 private static KeyStore keyStore() throws Exception {
  KeyStore ks=KeyStore.getInstance("AndroidKeyStore");
  ks.load(null);
  return ks;
 }
 private static SecretKey key() throws Exception {
  KeyStore ks=keyStore();
  if(ks.containsAlias(ALIAS)) {
   java.security.Key loaded=ks.getKey(ALIAS,null);
   if(loaded instanceof SecretKey)return (SecretKey)loaded;
   throw new IllegalStateException("Invalid Android key alias");
  }
  KeyGenerator generator=KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore");
  generator.init(new KeyGenParameterSpec.Builder(ALIAS,
      KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT)
    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
    .setRandomizedEncryptionRequired(true)
    .setKeySize(256)
    .build());
  return generator.generateKey();
 }
 /** Save a fresh token only after explicit user action in a native Android dialog. */
 public synchronized void save(String token) throws Exception {
  if(token==null||!token.matches("lvapp_[A-Za-z0-9_-]{16,180}"))
   throw new IllegalArgumentException("Token LouveApp inválido");
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
  cipher.init(Cipher.ENCRYPT_MODE,key());
  byte[] ciphertext=cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
  byte[] iv=cipher.getIV();
  if(iv.length!=12)throw new IllegalStateException("GCM nonce length");
  if(!prefs.edit().putString(ENCRYPTED,Base64.encodeToString(ciphertext,Base64.NO_WRAP))
    .putString(IV,Base64.encodeToString(iv,Base64.NO_WRAP)).commit())
    throw new IllegalStateException("Não foi possível guardar o token no dispositivo");
 }
 /** Future approved API adapter may decrypt in native code, never JS. */
 synchronized String readForOfficialApiOnly() throws Exception {
  String ciphertext=prefs.getString(ENCRYPTED,null);
  String iv=prefs.getString(IV,null);
  if(ciphertext==null||iv==null)return null;
  byte[] nonce=Base64.decode(iv,Base64.NO_WRAP);
  if(nonce.length!=12)throw new IllegalStateException("Invalid stored nonce");
  Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
  cipher.init(Cipher.DECRYPT_MODE,key(),new GCMParameterSpec(128,nonce));
  return new String(cipher.doFinal(Base64.decode(ciphertext,Base64.NO_WRAP)),StandardCharsets.UTF_8);
 }
 public synchronized boolean configured() {
  if(!prefs.contains(ENCRYPTED)||!prefs.contains(IV))return false;
  try{return readForOfficialApiOnly()!=null;}catch(Exception ignored){return false;}
 }
 public synchronized void clear() {
  prefs.edit().remove(ENCRYPTED).remove(IV).commit();
  try{KeyStore ks=keyStore();if(ks.containsAlias(ALIAS))ks.deleteEntry(ALIAS);}
  catch(Exception ignored){ /* Ciphertext already removed, token not recoverable from preferences. */ }
 }
}
