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
 'browser.setDownloadListener','new DownloadManager.Request(Uri.parse(request.url))',
 'manager.enqueue(download)','chooseLocationBeforeDownload(String url','if (!isHttps(uri))',
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
assert(ux.includes("if(name==='store'){window.Native?.listStoreTones?.();if(typeof window.Native?.openToneStore==='function')window.Native.openToneStore();}"));
assert(ux.includes("window.Native.openReference('toneStore')"));
assert(ux.includes("window.Native.openToneStoreDownloads()"));
assert(layout.includes("['store','Loja de Timbres']"));
assert(layout.includes("['store','coach','backups','settings']"));
console.log('SynthXPS store: live XPS10 URL, More menu, isolated WebView, downloads, no MIDI bridge or auto-write PASS');

const receiver=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/ToneDownloadReceiver.java'),'utf8');
const inbox=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/ToneImportLibrary.java'),'utf8');
for(const expected of [
 'ToneDownloadReceiver.track(this, id, chosenName, destination, label)',
 'ToneDownloadReceiver.reconcile(getApplicationContext())'
])assert(store.includes(expected),'Store must track and reconcile downloads: '+expected);
assert(xml.includes('android:name=".ToneDownloadReceiver"'),'System download receiver must be installed');
for(const expected of [
 'DownloadManager.ACTION_DOWNLOAD_COMPLETE','getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)',
 'prefs.contains("pending-" + id)','manager.openDownloadedFile(id)',
 'new ToneImportLibrary(context)','importStream(in, name, "SynthXPS · download Android")',
 'DownloadManager.STATUS_SUCCESSFUL','DownloadManager.STATUS_FAILED'
])assert(receiver.includes(expected),'Download inbox rule absent: '+expected);
for(const expected of [
 'MessageDigest.getInstance("SHA-256")','LIMIT = 120L * 1024L * 1024L',
 'readCatalog()','temp.renameTo(target)','importUri(Uri uri',
 'originalName(String sha)','file(String sha)','classify(String name',
 '"JXE_UNVERIFIED"','"XPS_JSON_UNVERIFIED"','"SVD_XPS10_BACKUP_ORIGINAL"',
 '"verifiedForKeyboard", false','"convertedToPerformance", false',
 '"writtenToKeyboard", false'
])assert(inbox.includes(expected),'Import library validation missing: '+expected);
assert(!receiver.includes('midi.send(')&&!receiver.includes('xps.write('),'Download callbacks may not alter keyboard');
assert(!inbox.includes('midi.send(')&&!inbox.includes('xps.write('),'File imports are read only for Roland');
for(const expected of [
 'listStoreTones()','importStoreToneFile()','exportStoreToneFile(String sha)',
 'deleteStoreToneFile(String sha)','if(req==15||req==16)','ToneDownloadReceiver.reconcile(getApplicationContext())'
])assert(main.includes(expected),'Android inbox bridge missing: '+expected);
for(const expected of [
 'id="gx-store-library"','id="gx-store-import-file"','id="gx-store-import-status"',
 'function renderStoreImports()',"kind==='toneImports'","kind==='toneImportStatus'",
 'window.Native?.exportStoreToneFile','window.Native?.deleteStoreToneFile'
])assert(ux.includes(expected),'New inbox UI missing: '+expected);
console.log('SynthXPS 1.35.6: download auto-import, immutable originals, checksums, UI, safe export and no MIDI writes PASS');

assert(store.includes('new Intent(Intent.ACTION_CREATE_DOCUMENT)'),'Must ask where to save before starting download');
assert(store.includes('destination.putExtra(Intent.EXTRA_TITLE, name)'),'Android picker suggests original file name');
assert(store.indexOf('startActivityForResult(destination, REQUEST_SAVE_TONE)')>0);
assert(store.includes('new LinearLayout.LayoutParams(0, dp(58), 1)'),'Bottom dock always visible and >=48dp');
assert(store.includes('Button home = button("⌂ Início"'));
assert(store.includes('Button previous = button("‹ Voltar página"'));
assert(store.includes('Button library = button("♫ Biblioteca"'));
assert(store.includes('Button folder = button("▣ Downloads"'));
assert(store.includes('home.setOnClickListener(v -> finishTo("home"))'));
assert(store.includes('previous.setOnClickListener(v -> goBackInStore())'));
assert(store.includes('library.setOnClickListener(v -> finishTo("store"))'));
assert(store.includes('onBackPressed() { finishTo("home"); }'),'Android back must exit isolated shop');
assert(main.includes('startActivityForResult(new Intent(MainActivity.this,ToneStoreActivity.class),17)'));
assert(main.includes('if(req==17)'),'MainActivity should receive store navigation result');
assert(main.includes('window.GraueNavigation && window.GraueNavigation.home()'));
assert(receiver.includes('context.getContentResolver().openOutputStream(target, "wt")'));
assert(receiver.includes('lib.file(imported.getString("sha256"))'));
assert(receiver.includes('destination-" + id'));
assert(receiver.includes('lastLocation(Context context)'));
console.log('Android destination picker, navigation dock, explicit return Home/Library and copy of chosen file PASS');

const backupArchive=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/BackupArchive.java'),'utf8');
const protocol=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/XpsProtocol.java'),'utf8');
for(const marker of ['enqueueAutomatically(String url','ToneDownloadReceiver.trackAutomatic(this,id,filename)',
 'lower.endsWith(".xps")','lower.endsWith(".jxe")','lower.endsWith(".svd")'])
 assert(store.includes(marker),'One-tap automatic download absent: '+marker);
for(const marker of ['void trackAutomatic(Context context','"Biblioteca Grauê"',
 'new BackupArchive(context).importOriginal','"SVD_XPS10_BACKUP_ORIGINAL"'])
 assert(receiver.includes(marker),'Auto library/backup indexing absent: '+marker);
for(const marker of ['importOriginal(File original,String sourceName)','MessageDigest.getInstance("SHA-256")',
 '"formatVerified",false','"mergedIntoKeyboard",false'])
 assert(backupArchive.includes(marker),'Safe backup vault import absent: '+marker);
for(const marker of ['probeXpsToneKeyboard(String sha)','acceptXpsToneProbe(byte[] sysex)',
 'XpsProtocol.packet(0x11','XpsProtocol.address(0x1f,0,0,0)',
 '"canAudition",false','"wroteKeyboard",false'])
 assert(main.includes(marker),'Read-only physical compatibility probe absent: '+marker);
assert(!/XpsProtocol\.packet\s*\(0x12/.test(main),
 'Imported XPS files must not send DT1 before physical validation');
assert(protocol.includes('public static Data decode(byte[] p)'));
assert(ux.includes("probeButton.textContent='Verificar no XPS-10'"));
assert(ux.includes("kind==='toneKeyboardProbe'"));
assert(ux.includes('Planejar mesclagem incremental'));
assert(ux.includes('graue-xps-incremental-plan-v1'));
assert(ux.includes('targetMemoryWrite:false,rolandRestore:false'));
console.log('Grauê XPS 1.36.4: auto XPS download, real read-only keyboard test, backup plan without RESTORE PASS');

const aud=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/XpsToneAuditioner.java'),'utf8');
for(const marker of [
 'public final class XpsToneAuditioner','readback','private enum Phase',
 'SNAPSHOT, APPLY, VERIFY, READY, RESTORE, RESTORE_VERIFY',
 'private void requestBlock()','XpsProtocol.packet(0x11','XpsProtocol.packet(0x12',
 'XpsProtocol.decode(packet)','System.arraycopy(b.source,0,b.desired,0,b.source.length)',
 'Arrays.equals(complete,b.desired)','Arrays.equals(complete,b.before)',
 'backupModified",false','userWritten",false','performanceWritten",false',
 'public void restore()','if(!sameDevice())','USER WRITE'
])assert(aud.includes(marker),'Audition engine missing: '+marker);
assert(main.includes('new XpsToneAuditioner(new XpsToneAuditioner.Port()'));
assert(main.includes('auditionStoreXpsTone(String sha)'));
assert(main.includes('restoreAuditionXpsTone()'));
assert(main.includes('EXTRA_IMPORTED_XPS_SHA'));
assert(receiver.includes('"last-import-sha"'));
assert(store.includes('awaitingAutomaticId'));
assert(store.includes('EXTRA_IMPORTED_XPS_SHA'));
assert(ux.includes("auditionButton.textContent='Ouvir no XPS-10'"));
assert(ux.includes("kind==='toneAuditionStatus'"));
assert(ux.includes('gx-store-audition-restore'));
console.log('v1.36.5: incremental one-tap temporary XPS MIDI audition and safe restore PASS');
