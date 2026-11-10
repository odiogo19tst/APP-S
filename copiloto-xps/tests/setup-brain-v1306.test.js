'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const brain=require('../app/src/main/assets/setup-brain.js');
const rig=require('../app/src/main/assets/song-rig.js');
const src=name=>fs.readFileSync(path.join(__dirname,'../app/src/main/assets',name),'utf8');
const sample=()=>{
 const h={'setup:0':[1],readAt:Date.now()+1000,validSysexPackets:8,source:'midi-live'};
 for(let i=0;i<16;i++){const p=Array(49).fill(64);p[0]=i;p[7]=90-i;p[17]=63;p[18]=64;p[19]=70;p[20]=80;p[32]=i%3;p[33]=75;h['part:'+i]=p;}
 return h;
};
const hw=sample(),parts=brain.capture(hw);
assert.equal(parts.length,16,'All 16 real parts captured');
assert.equal(parts[0].values[7],90);
assert.equal(parts[15].values[32],0);
assert.deepEqual(brain.diff(hw,parts),[],'Unchanged setup must send no MIDI');
const updated=parts.map(v=>({part:v.part,values:{...v.values}}));
updated[0].values[7]=85;updated[4].values[19]=88;
assert.deepEqual(brain.diff(hw,updated),[
 {section:'part',index:0,offset:7,value:85},
 {section:'part',index:4,offset:19,value:88}
 ]);
const bad0={...hw,'setup:0':[0]};
assert.throws(()=>brain.capture(bad0),/Performance/);
assert.throws(()=>brain.diff({...hw,validSysexPackets:0},parts),/verificada/);
const missing=sample();delete missing['part:8'];
assert.throws(()=>brain.diff(missing,parts),/Parte 9/,'Partial re-read must abort all writes');
assert.equal(brain.cleanParts([{part:0,values:{7:200}}]),null,'Invalid MIDI byte rejected');
assert.equal(brain.cleanParts([{part:0,values:{100:2}}]),null,'Unknown offset rejected');
assert.equal(brain.cleanParts([{part:0,values:{7:3}},{part:0,values:{7:7}}]),null,'Duplicated part rejected');
assert.equal(brain.cleanParts([{part:0,values:{32:3}}]),null,'MFX cannot be >2');
assert.equal(brain.cleanParts([{part:16,values:{7:20}}]),null);
const music=rig.assign({title:'Um Chamado',chords:['C'],keyboardSetup:{type:'user',number:6,auto:true}},
 {type:'user',number:6,auto:true,parts:updated});
assert.equal(music.keyboardSetup.parts.length,16);
assert.equal(rig.assign(music,{type:'user',number:6,auto:true}).keyboardSetup.parts.length,16,'Saving same rig must retain part snapshots');
assert.equal(rig.assign(music,{type:'preset',number:3,auto:true}).keyboardSetup.parts,undefined,'Changing bank must drop stale parts');
assert.equal(rig.assign(music,null).keyboardSetup,null);
const asked=brain.suggest('Quero pad mais suave',0,hw);
assert(asked.supported&&asked.commands.length>0);
assert(asked.commands.every(c=>brain.PARAMETERS[Object.keys(brain.PARAMETERS).find(k=>brain.PARAMETERS[k].offset===c.offset)]),'Only known parameter offsets');
assert(brain.suggest('brilhante',0,hw).commands.some(x=>x.offset===17));
assert.equal(brain.suggest('instalar novo firmware',0,hw).supported,false,'Unknown hardware requests never generate MIDI');
assert.throws(()=>brain.suggest('suave',16,hw),/parte/);
const issued=[];const runner=brain.createRunner(commands=>issued.push(commands));
const rigWithOne={type:'user',number:6,auto:true,parts:[{part:0,values:{7:85}}]};
assert.equal(runner.prepare(rigWithOne,'Um Chamado'),true);
runner.receive('hardware',{...hw},hw,'Um Chamado');
assert.equal(issued.length,0,'Cannot apply before bank selection acknowledgement');
runner.receive('performanceSelected',{index:6,user:true},hw,'Um Chamado');
runner.receive('hardware',hw,hw,'Um Chamado');
assert.equal(issued.length,0,'Cannot apply before a post-selection read');
runner.receive('hardwareBusy',true,hw,'Um Chamado');
const ready=runner.receive('hardware',hw,hw,'Um Chamado');
assert.equal(ready.status,'requested');assert.equal(ready.count,1);
assert.deepEqual(issued[0],[{section:'part',index:0,offset:7,value:85}]);
assert.equal(runner.isPending(),false,'Never reapply the same musical setup');
runner.prepare(rigWithOne,'Um Chamado');
runner.receive('performanceSelected',{index:6,user:true},hw,'Um Chamado');
runner.receive('hardwareBusy',true,hw,'Um Chamado');
const cancelled=runner.receive('hardware',hw,hw,'Outra Música');
assert.equal(cancelled.status,'cancelled');
assert.equal(issued.length,1,'Song switch must cancel old MIDI requests');
runner.prepare(rigWithOne,'Um Chamado');
assert.equal(runner.receive('xpsConnection',false,hw,'Um Chamado').status,'disconnected');
assert.equal(issued.length,1);
const html=src('index.html'),ui=src('ux-v2.js');
assert(html.indexOf('setup-brain.js')<html.indexOf('app.js'),'Brain must load before data normalization');
for(const id of ['gx-song-rig-capture','gx-song-brain-plan','gx-song-brain-apply','gx-song-brain-preview'])
 assert(ui.includes('id="'+id+'"'),'Missing UI '+id);
assert(ui.includes('rigRunner?.prepare(planned,entry.title)'),'One-touch setup must register readback task');
assert(ui.includes("rigRunner?.receive(kind,data,hw,song?.title)"),'MIDI return must be used to trigger setup');
assert(ui.includes('brainApi.capture(hw)'),'Capture must use observed MIDI snapshot');
assert(ui.includes('brainApi.diff(hw,'),'Manual brain suggestions must be validated before editing');
const app=src('app.js');assert(app.includes('GraueSetupBrain.cleanParts(c.parts)'),'App must retain saved snapshots in normalized repertoire');
console.log('Grauê brain 1.30.6: complete snapshots, 16 parts, MIDI validation, cancellation, guided planning and UI integration PASS');
