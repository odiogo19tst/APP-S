// Integration smoke test: native MIDI events -> screen, sustain, repertoire and CC output.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(){this.value='';this.textContent='';this.children=[];this.dataset={};this.clientWidth=360;this.classes=new Set();this.classList={add:c=>this.classes.add(c),remove:c=>this.classes.delete(c),contains:c=>this.classes.has(c),toggle:c=>this.classes.has(c)?this.classes.delete(c):this.classes.add(c)};}
 append(...a){this.children.push(...a);for(const x of a)if(x.id)els[x.id]=x;}
 showModal(){this.open=true;}
 close(){this.open=false;}
 setAttribute(){}
 replaceChildren(){this.children=[];}
 getContext(){return {scale(){},fillRect(){}};}
}
const els={},html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');for(const m of html.matchAll(/id="([^"]+)"/g))els[m[1]]=new Element();
const calls=[],document={getElementById:id=>els[id],createElement:()=>new Element(),createTextNode:text=>({text}),body:new Element(),querySelectorAll:s=>s==='.key'?els.piano.children:[]};
const native={load:()=>'{"songs":[],"scenes":[]}',save:s=>calls.push(['save',JSON.parse(s)]),editHardware:s=>calls.push(['edit',JSON.parse(s)]),readUserTones:()=>calls.push(['readUserTones']),cc:(...a)=>calls.push(['cc',...a])};
const ctx={parseSharedCifra:require('../app/src/main/assets/import-text.js'),document,window:{Native:native},Music:require('../app/src/main/assets/music.js'),performance:{now:()=>1000},devicePixelRatio:1,getComputedStyle:()=>({getPropertyValue:()=>''}),setInterval(){},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/src/main/assets/app.js','utf8'),ctx);
const event=a=>ctx.window.receive('midi',a);
event([144,60,90]);event([144,64,80]);event([144,67,85]);assert.equal(els.chord.textContent,'C');assert.match(els.feedback.textContent,/pertencem/);
event([176,64,127]);event([128,60,0]);assert.equal(els.chord.textContent,'C');event([176,64,0]);assert.equal(els.chord.textContent,'E · G');ctx.window.receive('clear','');assert.equal(els.chord.textContent,'—');
ctx.window.receive('import',JSON.stringify({songs:[{title:'Teste',chords:['D','Bm','G','A'],root:2,bpm:90,beats:4}]}));assert.equal(els.songList.children.length,1);els.songList.children[0].children[0].onclick();assert.equal(els.current.textContent,'D');els.up.onclick();assert.equal(els.current.textContent,'Eb');
els.arm.checked=false;els.apply.onclick();assert.equal(calls.filter(c=>c[0]==='cc').length,0);els.arm.checked=true;els.channel.value='2';els.apply.onclick();assert.equal(calls.filter(c=>c[0]==='cc').length,9);assert(calls.filter(c=>c[0]==='cc').every(c=>c[1]===2));
ctx.window.receive('import','{title: ChordPro}\n[C]Linha [Am]outra');assert.equal(els.songList.children.length,2); // Braced metadata is ChordPro, not JSON.
console.log('Interface: MIDI, sustain, chord comparison, repertoire, transpose and CC passed');

els.hardwarePart.value='0';els.mfxUnit.value='0';
for(const file of ['effects-data.js','hardware.js','tones-data.js','tones.js'])vm.runInContext(fs.readFileSync(__dirname+'/../app/src/main/assets/'+file,'utf8'),ctx);
assert.equal(els.applyTone.disabled,true);
const part=Array(49).fill(0),zone=Array(27).fill(0);part[4]=87;part[5]=64;part[6]=0;part[7]=100;part[21]=64;zone[13]=127;
ctx.window.receive('hardware',{'setup:0':[1],'part:0':part,'zone:0':zone,readAt:Date.now()});
assert.equal(els.applyTone.disabled,false);assert.match(els.selectedTone.textContent,/88StageGrand/);
els.toneSearch.value='piano';els.toneSearch.oninput();assert(els.toneResults.children.length>0);
els.toneResults.children[0].children[0].onclick();els.applyTone.onclick();let edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert.equal(edit.length,3);assert.equal(JSON.stringify(edit.map(x=>x.offset)),'[4,5,6]');
els.toneResults.children[0].children[1].onclick();assert(calls.filter(c=>c[0]==='save').at(-1)[1].toneFavorites.length===1);
ctx.window.receive('userTones',[{code:'USER001',name:'Meu Pad Igreja',category:'USER',msb:87,lsb:0,program:1}]);els.toneSearch.value='';els.toneSearch.oninput();assert.equal(els.toneResults.children.length,1);assert.match(els.toneResults.children[0].children[0].textContent,/Meu Pad/);
els.toneResults.children[0].children[0].onclick();els.applyTone.onclick();edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert.equal(edit[1].value,0);assert.equal(edit[2].value,0);
ctx.window.receive('hardwareReset',true);assert.equal(els.applyTone.disabled,true);assert.equal(els.toneResults.children.length,0);
assert.equal(ctx.window.XPS_TONES.length,1564);assert.equal(new Set(ctx.window.XPS_TONES.map(t=>t.code)).size,1564);
assert.equal(ctx.window.XPS_TONES.find(t=>t.code==='Dr020').name,'GM2 STANDARD');
console.log('Hardware UI: read gating, patch-only write, favorites, user patches and disconnect reset passed');

const parser=require('../app/src/main/assets/import-text.js'),parseChord=ctx.Music.parse;
assert.equal(parser('C Am7 F G7\nUma linha de letra',parseChord).chords.join(' '),'C Am7 F G7');
assert.equal(parser('{title: Teste}\n[C7M]linha [Dm7(b5)]outra',parseChord).chords[0],'C7M');
assert.throws(()=>parser('https://example.com/cifra',parseChord),/apenas um link/);
assert.equal(ctx.window.XPS_EFFECTS[21],'Rotary');assert.equal(ctx.window.XPS_EFFECTS.length,79);
console.log('Share: plain chords, ChordPro, link-only rejection and effect catalog passed');

vm.runInContext(fs.readFileSync(__dirname+'/../app/src/main/assets/live.js','utf8'),ctx);
// Grauê XPS: painel de palco deve respeitar permissões de envio MIDI.
assert.equal(els.livePartsGrid.children.length,16);
assert.equal(els.liveConnection.textContent,'Aguardando leitura MIDI');
const quick=els.liveQuickFavorites;
assert(quick.children.length>=1);
const qCount=calls.filter(c=>c[0]==='edit').length;
if(quick.children[0].onclick)quick.children[0].onclick();
assert.equal(calls.filter(c=>c[0]==='edit').length,qCount); // Sem leitura, não transmite.

native.padHit=(...a)=>calls.push(['pad',...a]);native.stopPads=()=>calls.push(['stopPads']);
assert.equal(els.toneFamilies.children.length,9);
assert.equal(els.drumPads.children.length,8);
els.drumVelocity.value='100';els.drumPads.children[0].onpointerdown({preventDefault(){}});
assert.deepEqual(calls.at(-1),['pad',10,36,100]);
let padInput=els.padNotes.children[0].children[0];padInput.value='40';padInput.onchange();
assert.equal(calls.filter(c=>c[0]==='save').at(-1)[1].padNotes[0],40);
els.drumPads.children[0].onpointerdown({preventDefault(){}});assert.equal(calls.at(-1)[2],40);
part[0]=9;ctx.window.receive('hardware',{'setup:0':[1],'part:0':part,'zone:9':zone,readAt:Date.now()});
els.liveDrums.onclick();assert.equal(els.toneDrawer.open,true);assert.equal(els.drumChannel.value,'10');
assert(els.liveToneList.children.length>0);assert(els.liveToneList.children.every(b=>b.textContent.startsWith('Dr')));
els.liveToneList.children[0].onclick();els.liveApplyTone.onclick();assert.equal(els.toneDrawer.open,false);
edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert.equal(JSON.stringify(edit.map(x=>x.offset)),'[4,5,6]');
els.liveVolume.value='85';els.liveApplyVolume.onclick();assert.deepEqual(calls.at(-1),['cc',10,7,85]);
els.songCategory.value='Adoração';els.saveSong.onclick();els.songFilter.value='Adoração';els.songFilter.onchange();assert.equal(els.songList.children.length,1);
assert(calls.filter(c=>c[0]==='save').at(-1)[1].songs.some(s=>s.category==='Adoração'));
ctx.window.receive('hardwareReset',true);const before=calls.length;els.liveApplyVolume.onclick();assert.equal(calls.length,before);
console.log('Live: category persistence, drum filter, patch selection, pad mapping and actual part channel passed');

for(const method of ['openCifra','showMode','panic','undoHardware'])native[method]=(...a)=>calls.push([method,...a]);
els.liveCifra.onclick();assert.deepEqual(calls.at(-1),['openCifra']);
els.liveFocus.onclick();assert.deepEqual(calls.at(-1),['showMode',true]);
els.liveFocus.onclick();assert.deepEqual(calls.at(-1),['showMode',false]);
els.livePanic.onclick();assert.deepEqual(calls.at(-1),['panic']);
els.liveEffects.onclick();assert.equal(els.effectsDrawer.open,true);
ctx.window.receive('hardware',{'setup:0':[1],'part:0':part,'zone:9':zone,readAt:Date.now()});
els.liveCC.value='74';els.liveCCValue.value='64';els.liveSendCC.onclick();assert.deepEqual(calls.at(-1),['cc',10,74,64]);
console.log('Show: landscape toggle, embedded browser entry, panic and effect control channel passed');

// Dados lidos habilitam seleção local de parte, sem transmissão imediata.
ctx.window.receive('hardware',{'setup:0':[1],'part:0':part,'zone:9':zone,readAt:Date.now()});
assert.equal(els.liveConnection.textContent,'Performance lida');
const countBeforeSelect=calls.filter(c=>c[0]==='edit').length;
els.livePartsGrid.children[1].onclick();
assert.equal(els.livePart.value,'1');
assert.equal(calls.filter(c=>c[0]==='edit').length,countBeforeSelect);
els.livePartsGrid.children[0].onclick();
assert.equal(els.livePart.value,'0');
els.arm.checked=true; // Apenas simula autorização; envio real não ocorre nos testes.
if(els.liveQuickFavorites.children[0].onclick)els.liveQuickFavorites.children[0].onclick();
assert.equal(calls.filter(c=>c[0]==='edit').length,countBeforeSelect+1);
console.log('Grauê XPS: 16 partes, leitura, favoritos e segurança de envio passaram');

for(const file of ['mfx-params.js','advanced.js','sequencer.js'])vm.runInContext(fs.readFileSync(__dirname+'/../app/src/main/assets/'+file,'utf8'),ctx);
assert.equal(ctx.window.XPS_MFX_PARAMS.length,79);assert.equal(ctx.window.XPS_MFX_PARAMS[1][0].id,'equalizer-loFreq');assert(ctx.window.XPS_MFX_PARAMS[21][0].id.startsWith('rotary-'));assert(ctx.window.XPS_MFX_PARAMS[78][0].id.startsWith('sympatheticResonance-'));
for(const params of ctx.window.XPS_MFX_PARAMS){assert.equal(new Set(params.map(p=>p.parameter)).size,params.length);for(const p of params){assert(p.parameter>=0&&p.parameter<32);assert(p.min>=12768&&p.max<=52768);if(p.labels)assert.equal(p.labels.length,p.max-p.min+1);}}
const fx=Array(145).fill(0);fx[0]=1;for(let i=17;i<145;i+=4)fx[i]=8;
const setup=Array(52).fill(0);setup[0]=1;setup[29]=64;setup[40]=100;
const group=Array(115).fill(0);for(let i=0;i<6;i++)group[21+i*6]=100;
ctx.window.receive('hardware',{'setup:0':setup,'part:0':part,'zone:9':zone,'mfx:0':fx,'rhythmGroup:0':group,readAt:Date.now()});
assert.equal(els.mfxParameters.children.length,11);
const gain=els.mfxParameters.children[1],gainInput=gain.children[0];gainInput.value='32783';gain.children[1].onclick();edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert.equal(edit[0].section,'mfxparam');assert.equal(edit[0].effect,1);assert.equal(edit[0].value,32783);
els.physicalPattern0.value='256';els.applyPhysicalPads.onclick();edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert.equal(edit[1].value,15);assert.equal(edit[2].value,15);assert.equal(edit.length,18);
els.applyArp.onclick();edit=calls.filter(c=>c[0]==='edit').at(-1)[1];assert(edit.some(e=>e.offset===29&&e.value===64));
for(const method of ['startSequence','stopSequence'])native[method]=(...a)=>calls.push([method,...a]);
els.sequencePreset.onclick();assert.equal(els.sequenceGrid.children.length,136);els.sequenceBpm.value='90';els.sequenceStart.onclick();let pattern=JSON.parse(calls.at(-1)[1]);assert.equal(pattern.grid[0][0],110);assert.equal(pattern.grid[1][4],100);assert.equal(pattern.channel,10);
ctx.window.receive('webCifra',{title:'Minha cifra',text:'C Am F G\nTexto de exemplo'});assert.equal(els.songTitle.textContent,'Minha cifra');assert.equal(els.songCategory.value,'Cifra Club');
console.log('Advanced: 78 MFX mappings, internal effect writes, six pad assignments, arp, sequence and browser import passed');
