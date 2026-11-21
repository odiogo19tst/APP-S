'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const main=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const store=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/ToneStoreActivity.java'),'utf8');
const xml=fs.readFileSync(path.join(__dirname,'../app/src/main/AndroidManifest.xml'),'utf8');
const ux=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/ux-v2.js'),'utf8');
const layout=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/layout-v3.js'),'utf8');
assert(store.includes('https://www.synthxps.com.br/?modelo=xps10'),'Exact official URL chosen by user');
for(const token of [
 'extends Activity','new WebView(this)','settings.setJavaScriptEnabled(true)',
 'settings.setDomStorageEnabled(true)','settings.setAllowFileAccess(false)',
 'settings.setAllowContentAccess(false)','settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW)',
 'settings.setSafeBrowsingEnabled(true)','settings.setCacheMode(WebSettings.LOAD_NO_CACHE)',
 'isStorePage(request.getUrl())','openExternal(request.getUrl())',
 'browser.setDownloadListener','new DownloadManager.Request(uri)',
 'manager.enqueue(req)','download(String url','if (!isHttps(uri))',
 'onReceivedError(WebView view','if (request.isForMainFrame())'
])assert(store.includes(token),'Missing shop isolation/behavior: '+token);
assert(!store.includes('addJavascriptInterface('),'Untrusted shop must never get access to Grauê Java/MIDI bridge');
assert(!store.includes('xps.write(')&&!store.includes('midi.send('),'Shop cannot perform any keyboard write');
assert(xml.includes('android:name=".ToneStoreActivity" android:exported="false"'));
assert(xml.includes('android.permission.INTERNET'));
assert(main.includes('public void openToneStore()'));
assert(main.includes('new Intent(MainActivity.this,ToneStoreActivity.class)'));
assert(main.includes('public void openToneStoreDownloads()'));
assert(main.includes('if(name.equals("toneStore"))url=ToneStoreActivity.STORE_URL'));
assert(ux.includes('data-gx-tab="store"'));
assert(ux.includes('data-gx-screen="store"'));
assert(ux.includes("if(name==='store'&&typeof window.Native?.openToneStore==='function')window.Native.openToneStore();"));
assert(ux.includes("window.Native.openReference('toneStore')"));
assert(ux.includes("window.Native.openToneStoreDownloads()"));
assert(layout.includes("['store','Loja de Timbres']"));
assert(layout.includes("['store','coach','backups','settings']"));
console.log('SynthXPS store: live XPS10 URL, More menu, isolated WebView, downloads, no MIDI bridge or auto-write PASS');
