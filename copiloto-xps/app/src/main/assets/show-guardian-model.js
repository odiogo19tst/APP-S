'use strict';
/* A deliberately conservative, offline rehearsal assistant for Roland XPS-10.
 * Sources: confirmed MIDI/SysEx readback and songs the musician stored.
 * No JXE decoder, audio recognition, USER WRITE or automatic restore.
 */
(function(scope){
 const range=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 const compact=x=>String(x==null?'':x).slice(0,120);
 const plain=x=>compact(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const brain=scope?.GraueSetupBrain||(typeof require==='function'?require('./setup-brain.js'):null);
 const central=scope?.GraueControlCenterModel||(typeof require==='function'?require('./control-center-model.js'):null);
 const rig=scope?.GraueQuickRig||(typeof require==='function'?require('./quick-rig.js'):null);
 function fresh(hw,now=Date.now(),windowMs=300000){
  return !!hw&&central?.ready(hw)&&Number.isFinite(hw.readAt)&&hw.readAt>0
   &&hw.readAt<=now+10000&&now-hw.readAt<=windowMs;
 }
 function name(hw){
  const bytes=hw?.['common:0'];if(!Array.isArray(bytes)||bytes.length<12)return '';
  return bytes.slice(0,12).map(n=>range(n,32,126)?String.fromCharCode(n):' ').join('').trim();
 }
 function snapshot(hw,title,now=Date.now()){
  if(!fresh(hw,now))throw Error('Leia agora a Performance no XPS-10 para salvar uma versão confiável.');
  const source=central.fingerprint(hw),parts=brain.capture(hw);
  if(parts.length<1)throw Error('Nenhuma parte da Performance foi lida.');
  return {version:1,id:'vault-'+now+'-'+Math.floor(Math.random()*1000000),
   title:compact(title||name(hw)||'Performance').trim().slice(0,60),
   performanceName:name(hw)||'Sem nome',source,createdAt:now,
   parts,partCount:parts.length,kind:'parts-temporary-only'};
 }
 function normalizeSnapshot(s){
  if(!s||s.version!==1||typeof s.id!=='string'||!/^vault-[0-9]+-[0-9]+$/.test(s.id)||
   typeof s.source!=='string'||s.source.length>200||!Number.isFinite(s.createdAt)||
   typeof s.title!=='string'||s.title.length>60||s.kind!=='parts-temporary-only')throw Error('Versão do cofre inválida.');
  const parts=brain.cleanParts(s.parts);
  if(!parts||!parts.length)throw Error('Parâmetros inválidos nesta versão.');
  return {...s,parts};
 }
 function compare(s,hw,now=Date.now()){
  const version=normalizeSnapshot(s);
  if(!fresh(hw,now))throw Error('Conecte e leia o teclado novamente antes de comparar.');
  if(central.fingerprint(hw)!==version.source)
   throw Error('Esta versão pertence a outra Performance. Selecione a original e releia o XPS-10.');
  const commands=brain.diff(hw,version.parts);
  return {commands,changed:commands.length,totalParts:version.parts.length,
   safe:commands.every(e=>e.section==='part'&&range(e.index,0,15))};
 }
 function audit({connected=false,hw={},song=null,songs=[],setlist=null,storeImports=[]},now=Date.now()){
  const current=Array.isArray(songs)?songs:[];
  const scale=Array.isArray(setlist?.items)?setlist.items:[];
  const currentSong=current.find(s=>s&&song&&(s.loopId&&s.loopId===song.loopId || s===song))||null;
  const pending=scale.filter(e=>e?.status!=='done');
  const withoutSetup=current.filter(s=>s&&!s.keyboardSetup);
  const checks=[
   {key:'usb',pass:!!connected,label:connected?'USB-MIDI conectado':'USB-MIDI desconectado'},
   {key:'read',pass:!!connected&&fresh(hw,now),label:connected?(fresh(hw,now)?'Performance lida recentemente':'Leitura SysEx pendente ou antiga'):'Aguardando conexão do XPS-10'},
   {key:'repertoire',pass:current.length>0,label:current.length+' música(s) no repertório'},
   {key:'setlist',pass:!scale.length||!pending.length,label:scale.length?scale.length+' na escala · '+pending.length+' importação(ões) pendente(s)':'Sem escala LouveApp ativa'},
   {key:'setups',pass:current.length>0&&!withoutSetup.length,label:withoutSetup.length+' música(s) sem Performance vinculada'}
  ];
  const unread=Array.isArray(storeImports)?storeImports.filter(t=>t?.verifiedForKeyboard===false):[];
  if(unread.length)checks.push({key:'downloads',pass:false,label:unread.length+' arquivo(s) de loja sem conversão validada (não executáveis)'});
  return {checks,ready:checks.every(c=>c.pass),songs:current.length,
    pending:pending.length,withoutSetup:withoutSetup.length,
    current:currentSong?currentSong.title:null,
    disclaimer:'Pré-voo do app: não verifica áudio, cabos de PA nem a memória USER física.'};
 }
 const categories={
  soft:['pad','string','warm','choir','ambient'],
  bright:['piano','electric','e.piano','organ','lead'],
  base:['piano','pno','ep','electric']
 };
 function recommend(song,tones,limit=4){
  const list=Array.isArray(tones)?tones.filter(t=>t&&range(t.msb,0,127)&&range(t.lsb,0,127)&&range(t.program,1,128)):[];
  if(!song||!list.length)return {label:'Escolha uma música e carregue a biblioteca de timbres.',options:[],rig:null,method:'Sugestão local por regras; sem escuta de áudio.'};
  const context=plain((song.title||'')+' '+(song.category||'')+' '+(song.bpm||''));
  const mellow=/orac|adorac|intim|paz|calm|suave|lento|worship/.test(context)||Number(song.bpm)<78;
  const search=words=>list.filter(t=>words.some(w=>plain(t.name+' '+t.category).includes(w)));
  const preferred=mellow?[...categories.soft,...categories.base]:[...categories.bright,...categories.soft];
  const ranked=[...list].map((t,i)=>({t,i,score:preferred.reduce((total,word,j)=>total+(plain(t.name+' '+t.category).includes(word)?preferred.length-j:0),0)}))
   .sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.t);
  const options=ranked.slice(0,Math.max(1,Math.min(8,limit)));
  const principal=(mellow?search(categories.base)[0]:search(categories.bright)[0])||options[0];
  const secondary=(mellow?search(categories.soft):search(['pad','string','warm'])).find(t=>t.code!==principal.code);
  let proposed=null;
  if(principal&&secondary&&rig) {
   try{proposed=rig.normalize({mode:'dual',main:principal,second:secondary,
    volumeMain:100,volumeSecond:mellow?66:58,point:60});}catch(_){}
  }
  return {label:mellow?'Arranjo suave: base com camada discreta.':'Arranjo energético: ataque definido com camada leve.',
   options,rig:proposed,method:'Sugestão local por regras de texto e BPM, sem ouvir o XPS-10.'};
 }
 function appendVault(existing,newItem,limit=8){
  const array=Array.isArray(existing)?existing.map(normalizeSnapshot):[];
  const saved=normalizeSnapshot(newItem);
  if(array.some(x=>x.id===saved.id))throw Error('Esta versão já foi salva.');
  return [saved,...array].slice(0,limit);
 }
 const api={fresh,name,snapshot,normalizeSnapshot,compare,audit,recommend,appendVault};
 if(typeof module!=='undefined')module.exports=api;
 if(scope)scope.GraueShowGuardianModel=api;
})(typeof window!=='undefined'?window:null);
