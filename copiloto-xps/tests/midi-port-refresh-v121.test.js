const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../app/src/main');
const ui=fs.readFileSync(path.join(root,'assets/ux-v2.js'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/ux-v2.css'),'utf8');
const native=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const usb=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/UsbMidi.java'),'utf8');
assert.equal((ui.match(/id="gx-midi-refresh"/g)||[]).length,1,'One visible MIDI refresh button in shared header');
assert(ui.includes('aria-label="Atualizar entradas e saídas MIDI"'),'Accessible refresh control required');
assert(ui.includes('window.Native.refreshMidiPorts()'),'Refresh must reach the real native MIDI manager');
assert(ui.includes("if(kind==='midiPorts')"),'Report input/output port counts to musician');
assert(css.includes('#gx-shell .gx-midi-refresh')&&css.includes('@media(max-width:700px)'),'Responsive button is required');
assert(usb.includes('public int connectedDeviceId()'),'USB refresh must preserve the active device');
const body=native.slice(native.indexOf('@JavascriptInterface public void refreshMidiPorts()'),native.indexOf('@JavascriptInterface public void microphone('));
assert(body.length>600,'Native MIDI refresh method missing');
for(const term of ['MidiDeviceInfo[] found=midi.devices()','midi.connectedDeviceId()','getOutputPortCount()','getInputPortCount()','stopPadNotes()','midi.connect(selected)','emit("midiPorts",detail)','emit("xpsConnection",false)','new Bridge().connect()']){
 assert(body.includes(term),'Native refresh missing: '+term);
}
assert(body.indexOf('stopPadNotes()')<body.lastIndexOf('midi.connect(selected)'),'Release sustained notes before reopening USB ports');
assert(!body.includes('readUsers()')&&!body.includes('saved.songs')&&!body.includes('favoriteBanks'),'Refreshing ports must not destroy or reimport favorites');
assert(native.includes('xps.initialSync()'),'Successful connection must still initiate XPS readback');
console.log('Grauê MIDI port refresh: button, re-enumeration, safe reconnection and preserved local data OK');
