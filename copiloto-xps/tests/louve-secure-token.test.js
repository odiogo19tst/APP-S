'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assetDir=path.join(__dirname,'../app/src/main/assets');
const javaDir=path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive');
const ui=fs.readFileSync(path.join(assetDir,'ux-v2.js'),'utf8');
const app=fs.readFileSync(path.join(javaDir,'MainActivity.java'),'utf8');
const vault=fs.readFileSync(path.join(javaDir,'LouveTokenVault.java'),'utf8');
const manual=fs.readFileSync(path.join(assetDir,'louve-import.js'),'utf8');
const manifest=fs.readFileSync(path.join(__dirname,'../app/src/main/AndroidManifest.xml'),'utf8');
for(const marker of ['AndroidKeyStore','AES/GCM/NoPadding','GCMParameterSpec(128,nonce)',
 'KeyProperties.PURPOSE_ENCRYPT|KeyProperties.PURPOSE_DECRYPT','getSharedPreferences',
 'public synchronized void save(String token)','public synchronized void clear()'])
 assert(vault.includes(marker),'LouveApp native crypto missing: '+marker);
assert(!vault.includes('android.util.Log'),'Never log Louve credentials');
assert(!vault.includes('http://')&&!vault.includes('https://'),'Never embed undocumented API endpoints');
assert(manifest.includes('android:allowBackup="false"'),'Secrets must not be in OS cloud backup');
for(const marker of ['public void configureLouveToken()','public void louveTokenStatus()',
 'public void removeLouveToken()','louveTokenVault.save(value)','input.setText("")',
 '.put("apiReady",false)','getApplicationContext()'])
 assert(app.includes(marker)||vault.includes(marker),'Native Louve setup missing: '+marker);
assert(!app.includes('.put("token",'),'Bridge must never send a token to WebView');
for(const marker of ['id="gx-louve-api-save"','id="gx-louve-api-forget"',
 "kind==='louveTokenStatus'","window.Native.configureLouveToken()",
 "window.Native?.louveTokenStatus?.()", 'gx-louve-paste','gx-louve-start'])
 assert(ui.includes(marker),'Louve API staging UI missing: '+marker);
assert(ui.includes('documentação oficial de parceiros'),'API approval limitation must remain clear');
assert(manual.includes('function parse(')||manual.includes('parse('),'Keep existing Louve text importer available');
// Do not include credential text or claims of successful remote API import in versioned source.
assert(!ui.includes('Sincronização automática ativada'),'Cannot claim unverified API access');
console.log('LouveApp secure token preparation: AndroidKeyStore AES-GCM, zero JS exposure, explicit API pending, manual fallback PASS');
