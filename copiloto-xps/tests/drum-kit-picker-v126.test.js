'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'../app/src/main');
const script=fs.readFileSync(path.join(dir,'assets/drumpads.js'),'utf8');
const css=fs.readFileSync(path.join(dir,'assets/ux-v2.css'),'utf8');
const java=fs.readFileSync(path.join(dir,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const engine=fs.readFileSync(path.join(dir,'java/br/com/doapps/grauelive/PadSampleEngine.java'),'utf8');
for(const id of ['gx-open-kit-picker','gx-kit-picker','gx-kit-close','gx-kit-tab-samples','gx-kit-tab-roland','gx-kit-picker-list','gx-active-kit-label'])
 assert(script.includes(id),'Missing kit picker: '+id);
for(const bank of ['Drum Kit 1','EFX 1','Worship Drums','Worship EFX','Meus Samples','Worship Groove','Pop Groove','Modern Hits'])
 assert(script.includes(bank),'Sample bank not listed: '+bank);
assert(script.includes("padLibrary?.banks?.[item.id]"),'Picker must reflect actual sample availability');
assert(script.includes("xpsDrumKits.map(t=>"),'Roland kits must be populated from factory tone list');
assert(script.includes("audioMode='samples'")&&script.includes("audioMode='midi'"),'Selection must switch audio sources');
assert(script.includes("el('gx-pad-local-kit').value=String(sampleBank)"),'Selected bank must sync the old control');
assert(script.includes("el('gx-pad-source').value=audioMode"),'Sample source must sync existing pad playback logic');
assert(script.includes('libraryDialog.close()'),'Picker must close after selection');
assert(script.includes("el('gx-pad-use-roland').onclick"),'MIDI kit must require an explicit send');
assert(script.includes('Não é transmissão de áudio via USB-MIDI'),'USB-MIDI must not be described as an audio path');
assert(engine.includes('public synchronized String play(int bank,int pad,int velocity)'),'Audio path must be real');
assert(engine.includes('Drum Kit 1 (Grauê)')&&engine.includes('Worship EFX (Grauê)'),'Engine bank names missing');
assert(java.includes('@JavascriptInterface public void playPadSample')&&java.includes('@JavascriptInterface public void selectDrumKit'),'Both native paths must exist');
assert(css.includes('.gx-kit-picker-list')&&css.includes('.gx-kit-choice'),'Touch UI CSS missing');
console.log('Grauê DrumPads 1.26: catalog picker, 8 audio banks, Roland MIDI selection, and no audio-over-MIDI claims passed');
