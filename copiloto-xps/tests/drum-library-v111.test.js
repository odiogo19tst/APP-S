const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'../app/src/main');
const js=fs.readFileSync(path.join(root,'assets/drumpads.js'),'utf8');
const html=fs.readFileSync(path.join(root,'assets/ux-v2.js'),'utf8');
const native=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const engine=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/PadSampleEngine.java'),'utf8');
const tones=fs.readFileSync(path.join(root,'assets/tones-data.js'),'utf8');
const ctx={window:{}};
vm.runInNewContext(tones,ctx);
const roland=ctx.window.XPS_TONES.filter(x=>/^Dr0(0[1-9]|1[0-9]|2[0-8])$/.test(x.code)&&x.category==='DRM');
assert.equal(roland.length,28,'Roland XPS must expose exactly 19 main + 9 GM2 kits');
assert.equal(roland[0].name,'Pop Kit 1');assert.equal(roland[19].name,'GM2 STANDARD');
assert(js.includes('xpsDrumKits.forEach'),'Roland kits should appear as real options');
for(const id of ['gx-pad-source','gx-pad-roland-kit','gx-pad-local-kit','gx-pad-import','gx-pad-import-slot','gx-pad-use-roland','gx-pad-stop-audio','gx-pad-library-status'])
 assert(js.includes('id="'+id+'"'),'Missing pad library UI: '+id);
for(const name of ['Drum Kit 1','EFX 1','Worship Drums','Worship EFX','Meus Samples'])
 assert(js.includes(name),'Missing editable sample bank '+name);
assert(js.includes("audioMode==='samples'")&&js.includes("native('playPadSample'"),'Sample mode must play audio on phone');
assert(js.includes("native('padHit',drumChannel"),'Roland mode must remain real MIDI');
assert(js.includes("native('selectDrumKit',drumChannel,tone.msb,tone.lsb,tone.program)"),'Roland kits require exact bank/program mapping');
assert(js.includes("native('importPadSample',sampleBank,selectedPad)"),'Sample picker must use chosen bank and pad');
assert(js.includes("native('importPadKit',sampleBank)"),'Whole kit must be importable in one operation');
assert(native.includes('@JavascriptInterface public void importPadKit')&&native.includes('if(req==8)'),'Native bulk kit picker missing');
assert(native.includes('getClipData().getItemCount()>8'),'Import must cap sample count to 8');
assert(js.includes("if(audioMode==='samples')"),'Looper must not transmit MIDI in samples mode');
for(const method of ['getPadSampleLibrary','playPadSample','stopPadSamples','importPadSample','selectDrumKit'])
 assert(native.includes('@JavascriptInterface public void '+method),'Native method missing: '+method);
assert(native.includes('if(req==7)')&&native.includes('padSamples.importSample'),'Selected audio must be copied privately');
assert(engine.includes('SoundPool')&&engine.includes('MediaPlayer'),'Audio output must be real short+long sample playback');
assert(engine.includes('ACTION_OPEN_DOCUMENT')===false,'File picker should remain in MainActivity');
assert(engine.includes('createWave('),'Include working original generated drum samples');
assert(engine.includes('getFilesDir()'),'Keep samples local and usable offline');
assert(engine.includes('12L*1024*1024'),'Cap imported audio size');
assert(engine.includes('sampleIds[bank][pad]')&&engine.includes('pool.play('),'Do not fake pad playback');
assert(html.includes('data-gx-screen="drums"'),'Drums screen still accessible');
console.log('DrumPads: 28 Roland kits, 4 original + 1 custom audio banks, native audio sampler and MIDI commands verified');
