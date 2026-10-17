// Integration smoke test: native MIDI events -> screen, sustain, repertoire and CC output.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element {
 constructor(){this.value='';this.textContent='';this.children=[];this.dataset={};this.clientWidth=360;this.classList={add(){},remove(){},contains(){return false;},toggle(){}};}
 append(...a){this.children.push(...a);for(const x of a)if(x.id)els[x.id]=x;}
 replaceChildren(){this.children=[];}
 getContext(){return {scale(){},fillRect(){}};}
}
const els={},html=fs.readFileSync(__dirname+'/../app/src/main/assets/index.html','utf8');for(const m of html.matchAll(/id="([^"]+)"/g))els[m[1]]=new Element();
const calls=[],document={getElementById:id=>els[id],createElement:()=>new Element(),createTextNode:text=>({text}),body:new Element(),querySelectorAll:s=>s==='.key'?els.piano.children:[]};
const native={load:()=>'{"songs":[],"scenes":[]}',save:s=>calls.push(['save',JSON.parse(s)]),cc:(...a)=>calls.push(['cc',...a])};
const ctx={document,window:{Native:native},Music:require('../app/src/main/assets/music.js'),performance:{now:()=>1000},devicePixelRatio:1,getComputedStyle:()=>({getPropertyValue:()=>''}),setInterval(){},console};
vm.createContext(ctx);vm.runInContext(fs.readFileSync(__dirname+'/../app/src/main/assets/app.js','utf8'),ctx);
const event=a=>ctx.window.receive('midi',a);
event([144,60,90]);event([144,64,80]);event([144,67,85]);assert.equal(els.chord.textContent,'C');assert.match(els.feedback.textContent,/pertencem/);
event([176,64,127]);event([128,60,0]);assert.equal(els.chord.textContent,'C');event([176,64,0]);assert.equal(els.chord.textContent,'E · G');ctx.window.receive('clear','');assert.equal(els.chord.textContent,'—');
ctx.window.receive('import',JSON.stringify({songs:[{title:'Teste',chords:['D','Bm','G','A'],root:2,bpm:90,beats:4}]}));assert.equal(els.songList.children.length,1);els.songList.children[0].children[0].onclick();assert.equal(els.current.textContent,'D');els.up.onclick();assert.equal(els.current.textContent,'Eb');
els.arm.checked=false;els.apply.onclick();assert.equal(calls.filter(c=>c[0]==='cc').length,0);els.arm.checked=true;els.channel.value='2';els.apply.onclick();assert.equal(calls.filter(c=>c[0]==='cc').length,9);assert(calls.filter(c=>c[0]==='cc').every(c=>c[1]===2));
ctx.window.receive('import','{title: ChordPro}\n[C]Linha [Am]outra');assert.equal(els.songList.children.length,2); // Braced metadata is ChordPro, not JSON.
console.log('Interface: MIDI, sustain, chord comparison, repertoire, transpose and CC passed');
