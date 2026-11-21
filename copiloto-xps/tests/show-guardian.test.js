'use strict';
const assert=require('node:assert/strict'),model=require('../app/src/main/assets/show-guardian-model.js');
const now=Date.now();
function hardware(){
 const hw={validSysexPackets:21,readAt:now,'setup:0':Array(54).fill(0),'common:0':Array(56).fill(32)};
 hw['setup:0'][0]=1;hw['setup:0'][1]=1;hw['setup:0'][2]=3;hw['setup:0'][3]=5;
 const name='Louvor USER';for(let i=0;i<name.length;i++)hw['common:0'][i]=name.charCodeAt(i);
 for(let i=0;i<16;i++){const part=Array(49).fill(64);part[7]=100;part[17]=64;part[18]=64;part[19]=64;part[20]=64;part[32]=1;part[33]=64;hw['part:'+i]=part;}
 return hw;
}
const hw=hardware();
assert(model.fresh(hw,now));assert.equal(model.name(hw),'Louvor USER');
const snapshot=model.snapshot(hw,'Versão do Ensaio',now);
assert.equal(snapshot.version,1);assert.equal(snapshot.kind,'parts-temporary-only');assert.equal(snapshot.partCount,16);
assert.equal(snapshot.parts.length,16);
const original=JSON.stringify(hw);
assert.equal(model.compare(snapshot,hw,now).changed,0);
assert.equal(JSON.stringify(hw),original,'Neither saving nor comparing can alter MIDI readback');
const adjusted=hardware();adjusted['part:0'][7]=86;adjusted['part:0'][17]=45;
let diff=model.compare(snapshot,adjusted,now);
assert.equal(diff.changed,2);assert(diff.safe);
assert.deepEqual(diff.commands,[{section:'part',index:0,offset:7,value:100},{section:'part',index:0,offset:17,value:64}]);
assert.throws(()=>model.compare(snapshot,{...adjusted,'setup:0':[1,8,3,5]},now),/outra Performance/);
assert.throws(()=>model.compare(snapshot,{...adjusted,readAt:now-360000},now),/leia o teclado novamente/);
assert.throws(()=>model.snapshot({...hw,validSysexPackets:0},'Falso',now),/Leia agora/);
assert.throws(()=>model.normalizeSnapshot({...snapshot,parts:[{part:18,values:{7:100}}]}),/inválidos/);
let vault=[];for(let i=0;i<9;i++)vault=model.appendVault(vault,{...snapshot,id:'vault-'+(now+i)+'-'+i,createdAt:now+i},8);
assert.equal(vault.length,8,'Limits storage without overwriting newest version');
assert.equal(vault[0].createdAt,now+8);assert.equal(vault.at(-1).createdAt,now+1);
assert.throws(()=>model.appendVault(vault,vault[0]),/já foi salva/);
const songs=[
 {loopId:'s1',title:'A Boa Parte',bpm:144,chords:['E','B'],keyboardSetup:{type:'user',number:3}},
 {loopId:'s2',title:'Oração',bpm:68,chords:['D','G']}
];
const setlist={title:'Culto',items:[{title:'A Boa Parte',status:'done'},{title:'Oração',status:'pending'}]};
const audit=model.audit({connected:true,hw,song:songs[0],songs,setlist},now);
assert.equal(audit.pending,1);assert.equal(audit.withoutSetup,1);assert.equal(audit.ready,false);
assert.equal(audit.current,'A Boa Parte');
const disconnected=model.audit({connected:false,hw,songs},now);
assert.equal(disconnected.checks[0].pass,false);
const tones=[
 {code:'Pf001',name:'Grand Piano',msb:0,lsb:0,program:1,category:'PNO'},
 {code:'St001',name:'Warm Strings',msb:0,lsb:0,program:3,category:'STR'},
 {code:'Or001',name:'Hammond Organ',msb:0,lsb:0,program:17,category:'ORG'},
 {code:'Bd001',name:'Wide Pad',msb:0,lsb:0,program:89,category:'SPD'}
];
const advice=model.recommend(songs[1],tones);
assert(advice.rig,'Local Dual proposal must contain two real catalog tones');
assert.equal(advice.rig.main.code,'Pf001');
assert(['St001','Bd001'].includes(advice.rig.second.code));
assert.deepEqual(model.recommend({title:'No instruments'},[]).options,[]);
assert.equal(Object.keys(model).some(k=>/send|write|transmit/i.test(k)),false,'Model never sends MIDI');
console.log('Show Guardian: original fingerprint, safe params diff, stale lock, vault cap, preflight and tone proposals PASS');
