const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main');
const ui=fs.readFileSync(path.join(root,'assets/drumpads.js'),'utf8');
const bridge=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const engine=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/PadSampleEngine.java'),'utf8');
const catalog=fs.readFileSync(path.join(root,'assets/tones-data.js'),'utf8');
const html=fs.readFileSync(path.join(root,'assets/index.html'),'utf8');
for(const name of ['Drum Kit 1','EFX 1','Worship Drums','Worship EFX','Meus Samples']){
 assert(engine.includes(name),'Missing audible bank: '+name);
}
assert(engine.includes('public static final int BANKS=8, PADS=8'),'8 banks with 8 pads expected');
assert(ui.includes('<option value="midi">Roland XPS-10 · MIDI</option>'),'MIDI source missing');
assert(ui.includes('<option value="samples">Celular · Samples de áudio</option>'),'Independent local audio source missing');
assert(ui.includes("native('playPadSample'")&&ui.includes("native('padHit'"),'Both sources should trigger native playback');
assert(ui.includes("native('importPadSample'")&&ui.includes("native('importPadKit'")&&ui.includes("native('importPadZip'"),'Local and Drive sample import missing');
assert(ui.includes('padLibrary?.banks?.[sampleBank]'),'Pad sound availability must come from actual engine state');
assert(ui.includes("Áudio gerado pelo celular")&&ui.includes('Não sai pelo USB-MIDI'),'Routing must be explicit');
assert(ui.includes('Conecte o XPS-10 via USB-MIDI'),'MIDI should reflect actual connection');
assert(ui.includes("sample?'● Samples do celular"),'Sound source must be prominent in UI');
assert(catalog.includes('["Dr001","Pop Kit 1","DRM",86,64,1]'),'Official Roland drum kit data missing');
assert(ui.includes("native('selectDrumKit'")&&bridge.includes('@JavascriptInterface public void selectDrumKit'),'MIDI bank/program selection missing');
for(const fun of ['getPadSampleLibrary','playPadSample','importPadSample','importPadKit','importPadZip','stopPadSamples'])
 assert(bridge.includes('@JavascriptInterface public void '+fun),'Android sample API missing: '+fun);
assert(html.includes('<script src="drumpads.js"></script>'),'Library UI must load at startup');
assert(engine.includes('new SoundPool.Builder()')&&engine.includes('public synchronized void prepare()'),'Real sample player required');
assert(engine.includes('importZipKit(')&&engine.includes('getContentResolver().openInputStream'),'ZIP and SAF must use Android filesystem API');
console.log('DrumPads: Roland MIDI + 8 independent Android audio libraries, local import, routing and safeguards passed');
