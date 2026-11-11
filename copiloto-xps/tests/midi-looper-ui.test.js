'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
 constructor(){this.value='';this.disabled=false;this.children=[];this.attributes={};this.classes=new Set();this.classList={toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};}
 setAttribute(k,v){this.attributes[k]=v;}
 append(e){this.children.push(e);}
 querySelector(s){return elements[s];}
 insertAdjacentElement(_,e){this.inserted=e;}
}
const elements={},calls=[],events={},anchor=new Element(),stage=new Element();
stage.querySelector=()=>anchor;
for(const id of ['output','bpm','beats','bars','rec','play','stop','mute','clear','clear-all','progress','status'])elements['#loop-'+id]=new Element();
elements['#loop-bpm'].value='90';elements['#loop-beats'].value='4';elements['#loop-bars'].value='2';elements['.loop-tracks']=new Element();
const document={hidden:false,querySelector:()=>stage,createElement:()=>new Element(),getElementById:()=>({value:'0'}),addEventListener:(name,fn)=>{events[name]=fn;}};
const native={};for(const k of ['loopState','loopRecord','loopPlay','loopStop','loopMute','loopClear','loopClearAll'])native[k]=(...args)=>calls.push([k,...args]);
let confirmations=0,priorEvents=0,approve=true;
const window={Native:native,receive:()=>priorEvents++,confirm:()=>{confirmations++;return approve;}};
vm.runInNewContext(fs.readFileSync(__dirname+'/../app/src/main/assets/midi-looper.js','utf8'),{document,window,console});
const el=id=>elements['#loop-'+id],emit=(type,data)=>window.receive(type,data);
assert(el('rec').disabled,'USB off blocks recording');assert(el('play').disabled);assert.equal(calls[0][0],'loopState');
emit('xpsConnection',true);assert(!el('rec').disabled);el('rec').onclick();assert.deepEqual(calls.at(-1),['loopRecord',0,90,4,2]);
const stopped={playing:false,recording:false,queued:false,track:-1,counts:[2,0,0,0],muted:[false,false,false,false],position:0,bpm:90,beats:4,bars:2,message:'Loop parado'};
emit('loopState',{...stopped,recording:true,track:0});assert(el('rec').disabled);assert(!el('stop').disabled);assert(el('bpm').disabled);
emit('loopState',stopped);assert(!el('play').disabled);assert.equal(el('rec').textContent,'● OVERDUB');el('play').onclick();assert.equal(calls.at(-1)[0],'loopPlay');
emit('loopState',{...stopped,playing:true,position:.5});assert.equal(el('progress').value,.5);assert(el('play').disabled);assert(!el('rec').disabled);
elements['.loop-tracks'].children[2].onclick();el('rec').onclick();assert.deepEqual(calls.at(-1),['loopRecord',2,90,4,2]);
elements['.loop-tracks'].children[0].onclick();el('mute').onclick();assert.deepEqual(calls.at(-1),['loopMute',0,true]);
el('clear').onclick();assert.equal(confirmations,1);assert.deepEqual(calls.at(-1),['loopClear',0]);
assert(!el('clear-all').disabled);approve=false;const beforeClearAll=calls.length;el('clear-all').onclick();assert.equal(calls.length,beforeClearAll,'Cancel retains all recordings');approve=true;el('clear-all').onclick();assert.deepEqual(calls.at(-1),['loopClearAll']);
events['graue:live-state']({detail:{title:'Primeira',bpm:90}});events['graue:live-state']({detail:{title:'Próxima',bpm:72}});assert.equal(calls.at(-1)[0],'loopStop','Changing music stops the loop');
document.hidden=true;events.visibilitychange();assert.equal(calls.at(-1)[0],'loopStop');
emit('armed',false);assert(el('rec').disabled&&el('play').disabled);assert.match(el('status').textContent,/desconectado/);assert(priorEvents===5,'Previous receiver remains intact');
emit('loopState',{...stopped,counts:[0,0,0,0]});assert(el('clear-all').disabled,'Empty loop has nothing to erase');emit('loopState',{...stopped,counts:[0,0,0,0],recording:true,track:2});assert(!el('clear-all').disabled,'An unfinished take can be discarded');
el('bpm').value='0';el('rec').onclick();assert.match(el('status').textContent,/40 a 240/);
const html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');assert(html.includes('src="midi-looper.js"'));assert(html.includes('href="midi-looper.css"'));
console.log('Looper UI PASS: native commands, four tracks, USB gating, authoritative recording/playback state, overdub, mute, clear and music/visibility stop');
