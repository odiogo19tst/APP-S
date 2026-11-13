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
for(const steps of [16,32,64]){const p=model.emptyPattern();p.steps=steps;p.tracks[0].notes[0]=72;p.tracks[0].velocities[0]=100;const data=model.payload(p);assert.equal(data.tracks.length,8);assert.equal(data.tracks[0].notes.length,steps);assert.equal(data.tracks[0].notes[0],72);p.tracks[0].notes[0]=0;assert.equal(data.tracks[0].notes[0],72);}
assert.throws(()=>model.pattern({...model.emptyPattern(),steps:24}));let p=model.emptyPattern();p.tracks[0].notes[0]=128;assert.throws(()=>model.pattern(p));
console.log('Control center model PASS: 119 validated scene parameters, Performance identity, MIDI-only allowlist, 8 tracks and bounded 16/32/64-step payloads');
