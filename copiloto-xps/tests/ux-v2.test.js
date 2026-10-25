// Interface Grauê XPS — regression tests for the four approved screens.
const fs=require('node:fs'),assert=require('node:assert/strict');
const path=require('node:path');
const dir=path.join(__dirname,'../app/src/main/assets');
const ux=fs.readFileSync(path.join(dir,'ux-v2.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'ux-v2.css'),'utf8');
const index=fs.readFileSync(path.join(dir,'index.html'),'utf8');
assert.match(index,/ux-v2\.css/);
assert.match(index,/<script src="ux-v2\.js"><\/script>/);
assert(index.indexOf('ux-v2.js')>index.indexOf('sequencer.js'),'Dashboard must load after native bridges');
for(const [screen,title] of [['stage','Palco'],['repertoire','Repertório'],['sound','Sons'],['coach','Copiloto']]){
 assert(ux.includes('data-gx-screen="'+screen+'"'),title+' screen missing');
}
const ids=new Set([...ux.matchAll(/id="(gx-[a-z0-9-]+)"/g)].map(x=>x[1]));
const referenced=[...ux.matchAll(/\$x\('(gx-[a-z0-9-]+)'\)/g)].map(x=>x[1]);
for(const id of referenced)assert(ids.has(id),'Referenced element not in redesigned HTML: '+id);
for(const id of ['gx-start','gx-next','gx-panic','gx-down','gx-up','gx-import-cifra','gx-save-cifra','gx-mic','gx-mixer-parts','gx-songs','gx-sound-favorites','gx-note-history']){
 assert(ids.has(id),'Missing approved UX feature: '+id);
}
for(const key of ['window.Native.importCifra','window.Native.editHardware','window.ToneLibrary','const prior=window.receive']){
 assert(ux.includes(key),'Missing real action binding: '+key);
}
assert(ux.includes("if(!usbConnected){notify('Conecte USB-MIDI.');return;}"),'Mixer deve bloquear edição sem USB conectado');
assert(ux.includes("if(confirm("),'Panic must request confirmation');
assert(!ux.includes('login mantido')&&!ux.includes('92%'),'No simulated session or confidence');
assert(css.includes('@media(max-width:700px)'),'Portrait layout not adapted');
assert(css.includes('.gx-stage-summary')&&css.includes('.gx-rep-layout')&&css.includes('.gx-sound-layout')&&css.includes('.gx-coach-layout'));
assert(css.includes('min-height:44px'),'Buttons must remain touchable');

assert.match(ux,/MutationObserver/, 'Deve exibir erros e mensagens do núcleo');
assert.match(ux,/window.Native.editHardware/, 'Mixer deve editar a parte, não o canal compartilhado');
assert(!ux.includes('window.Native.cc(p[0]+1,7'), 'Mixer não pode aplicar CC7 em canais possivelmente compartilhados');
assert.match(ux,/setInterval\(\(\)=>\{if\(active==='stage'/, 'Palco deve acompanhar o BPM real');
assert.match(ux,/window.Native.importCifra/, 'Ação Importar deve chamar o navegador existente');
console.log('Grauê 0.9 redesign: 4 screens, real commands, safety gates and responsive CSS passed');

for(const name of ['backups','stage','repertoire','sound','coach','settings'])assert(ux.includes('data-gx-screen="'+name+'"'),'Tela ausente: '+name);
for(const id of ['gx-backup-import','gx-backup-refresh','gx-backup-export-index','gx-backup-merge','gx-backup-list','gx-user-patches'])assert(ux.includes('id="'+id+'"'),'Controle não criado: '+id);
assert(ux.includes('window.Native.importXpsBackups'),'Importar backup deve acionar o Android');
assert(ux.includes('window.Native.exportXpsBackup'),'Exportar backup deve preservar arquivo');
assert(ux.includes('window.Native?.readUserTones?.()')&&ux.includes('window.Native.restoreCachedTones()'),'USER precisa de cache e leitura manual quando necessário');
assert(ux.includes('gx-backup-merge')&&ux.includes('disabled'),'Mesclagem proprietária não deve estar habilitada sem validação');
