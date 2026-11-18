'use strict';
const assert=require('node:assert/strict'),model=require('../app/src/main/assets/control-center-model.js');
const hw={'setup:0':Array(52).fill(0),'common:0':Array(56).fill(32),validSysexPackets:40};hw['setup:0'][0]=1;hw['setup:0'][18]=64;hw['setup:0'][19]=64;
for(let i=0;i<16;i++){const p=Array(49).fill(64);p[32]=0;hw['part:'+i]=p;}
const scene=model.capture(hw,'Verso','song-a');assert.equal(scene.edits.length,119);assert.equal(model.prepare(scene,hw).length,119);assert.equal(scene.songId,'song-a');
assert.throws(()=>model.capture({...hw,validSysexPackets:0},'Verso',''));
assert.throws(()=>model.capture({...hw,'part:15':null},'Verso',''));
assert.throws(()=>model.prepare(scene,{...hw,'common:0':Array(56).fill(33)}),/outra Performance/);
assert.throws(()=>model.command('power',0,0,1));assert.throws(()=>model.command('setup',0,18,71));assert.throws(()=>model.command('part',0,32,3));
assert.throws(()=>model.scene({...scene,edits:Array(119).fill(scene.edits[0])}));
// A partial SysEx response must be savable without inventing missing part values.
const partialHw={...hw,'part:15':undefined,'part:14':Array(49).fill(null)};
const partialScene=model.capture(partialHw,'Refrão parcial','song-a');
assert(partialScene.edits.length>0&&partialScene.edits.length<119);
assert.equal(model.scene(partialScene).edits.length,partialScene.edits.length);
assert.equal(model.prepare(partialScene,partialHw).length,partialScene.edits.length);
assert(partialScene.edits.every(e=>Number.isInteger(e.value)),'Only verified values are persisted');
assert.throws(()=>model.scene({...partialScene,edits:[]}),/Cena inválida/);
assert.throws(()=>model.scene({...partialScene,edits:[partialScene.edits[0],partialScene.edits[0]]}),/repetidos/);

for(const steps of [16,32,64]){const p=model.emptyPattern();p.steps=steps;p.tracks[0].notes[0]=72;p.tracks[0].velocities[0]=100;const data=model.payload(p);assert.equal(data.tracks.length,8);assert.equal(data.tracks[0].notes.length,steps);assert.equal(data.tracks[0].notes[0],72);p.tracks[0].notes[0]=0;assert.equal(data.tracks[0].notes[0],72);}
assert.throws(()=>model.pattern({...model.emptyPattern(),steps:24}));let p=model.emptyPattern();p.tracks[0].notes[0]=128;assert.throws(()=>model.pattern(p));
console.log('Control center model PASS: 119 validated scene parameters, Performance identity, MIDI-only allowlist, 8 tracks and bounded 16/32/64-step payloads');
// Global hardware controls follow the System map, including four-nibble tuning.
{
 const hw={'setup:0':[0],validSysexPackets:2,'system:0':Array(30).fill(0),'systemController:0':Array(78).fill(0)};
 hw['system:0'].splice(0,4,0,4,0,0);hw['system:0'][4]=64;hw['systemController:0'][3]=2;
 assert.equal(model.systemFields.length,32);
 assert.equal(model.systemValue(hw,{section:'masterTune'}),1024);
 assert.equal(model.toRaw(model.systemFields[0],12.3),1147);
 assert.throws(()=>model.toRaw(model.systemFields[0],12.34));
 assert.throws(()=>model.toRaw(model.systemFields[0],''));
 for(const f of model.systemFields){for(const display of [f.min,f.max]){const value=model.toRaw(f,display),e=model.command(f.section,0,f.offset,value);assert.equal(e.value,value);assert(model.isGlobal(e));}assert.throws(()=>model.command(f.section,1,f.offset,0));}
 const tune=model.command('masterTune',0,0,1024);assert(model.canApply([tune],hw),'Globals available in Patch mode');assert.equal(model.editSource([tune],hw),'system');assert(model.editsMatch([tune],hw));
 hw['system:0'][3]=1;assert(!model.editsMatch([tune],hw),'Unconfirmed hardware value may not pass');
 hw['system:0'][1]=20;assert.equal(model.systemValue(hw,tune),undefined);assert(!model.canApply([tune],hw));
 assert.throws(()=>model.command('system',0,8,1),'Reserved byte');assert.throws(()=>model.command('systemController',0,4,1),'Reserved controller byte');
 assert(!model.canApply([model.command('part',0,7,90)],hw),'Part edits still require Performance');
 assert(!model.canApply([tune],{}),'No writes without readback');
 const injected={...scene,edits:[...scene.edits]};injected.edits[0]=model.command('system',0,5,127);assert.throws(()=>model.scene(injected),'Scenes may not inject global settings');
}
// Per-part expansion uses the same staged edits and observed values.
{
 const hw={'setup:0':[1],validSysexPackets:3,'part:0':Array(49).fill(64)};
 hw['part:0'].splice(15,2,8,0);
 assert.equal(model.partFields.length,35);
 assert.equal(model.partValue(hw,{section:'partPortamento',index:0}),128);
 for(const f of model.partFields){
  for(const display of [f.min,f.max]){const raw=model.partRaw(f,display),e=model.command(f.section,15,f.offset,raw);assert.equal(e.index,15);assert.equal(e.value,raw);}
  assert.throws(()=>model.partRaw(f,''));assert.throws(()=>model.partRaw(f,f.min-1));assert.throws(()=>model.partRaw(f,f.max+1));assert.throws(()=>model.partRaw(f,0.5));
 }
 const request=model.command('partPortamento',0,15,128);assert(model.canApply([request],hw));assert(model.editsMatch([request],hw));
 hw['part:0'][15]=7;assert(!model.editsMatch([request],hw));hw['part:0'][16]=16;assert.equal(model.partValue(hw,request),undefined);assert(!model.canApply([request],hw));
 assert.throws(()=>model.command('partPortamento',0,16,64));assert.throws(()=>model.command('partPortamento',16,15,64));
 for(const offset of [2,3,15,16,23,24,25,26])assert.throws(()=>model.command('part',0,offset,64),'Reserved/packed bytes cannot be written separately');
 assert(!model.canApply([model.command('part',0,9,64)],{...hw,'part:0':undefined}));
 assert(!model.canApply([model.command('part',0,9,64)],{...hw,'part:0':Array(49).fill(0)}),'Out-of-range readback may not enable writes');
}
console.log('35 per-part fields: limits, reserved bytes, missing readback, portamento nibble decoding PASS');

{const edits=Array.from({length:150},(_,i)=>({value:i})),batch=model.pendingBatch(edits);assert.equal(batch.length,128);assert.equal(edits.length,150);assert.deepEqual(batch.at(-1),edits[127]);}
