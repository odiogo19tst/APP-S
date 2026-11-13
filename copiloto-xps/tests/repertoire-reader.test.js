'use strict';
const assert=require('node:assert/strict'),reader=require('../app/src/main/assets/repertoire-reader');
assert.equal(reader.fontSize('bad'),18);assert.equal(reader.fontSize(13),14);assert.equal(reader.fontSize(500),30);assert.equal(reader.fontSize(21.4),21);
class Node{
 constructor(name){this.name=name;this.children=[];this.attrs={};this.classes=new Set();this.classList={toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};this.values={};this.style={setProperty:(k,v)=>this.values[k]=v};this.textContent='';}
 append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n);}}
 insertBefore(node,ref){this.append(node);this.children.pop();const at=this.children.indexOf(ref);this.children.splice(at<0?this.children.length:at,0,node);}
 setAttribute(k,v){this.attrs[k]=v;}focus(){this.focused=true;}
}
const root=new Node('root'),shell=new Node('shell'),screen=new Node('screen'),layout=new Node('layout'),library=new Node('library'),view=new Node('view'),paper=new Node('paper'),main=new Node('main'),copy=new Node('copy'),pre=new Node('pre'),actions=new Node('actions'),shift=new Node('shift'),scroll=new Node('scroll');
root.append(shell);shell.append(screen);screen.append(layout);layout.append(library,view);view.append(paper);paper.append(main);main.append(copy,actions);copy.append(pre);actions.append(shift,scroll);
pre.textContent='C          G\nMinha canção';pre.scrollTop=120;
let nativeCalls=0;shift.onclick=()=>nativeCalls++;scroll.onclick=()=>nativeCalls++;
const map={'.gx-rep-view':view,'.gx-paper':paper,'.gx-paper-actions':actions,'.gx-rep-library':library,'.gx-cifra-shift':shift,'.gx-scroll-controls':scroll};screen.querySelector=s=>map[s];shell.querySelector=()=>screen;
const events={},doc={getElementById:k=>k==='gx-shell'?shell:null,createElement:t=>new Node(t),addEventListener:(k,f)=>events[k]=f},saved=[];
const ui=reader.mount(doc,{size:22,save:n=>saved.push(n)});
assert.equal(screen.values['--gx-repertoire-font'],'22px');assert.equal(view.children[1],scroll,'Original scroll controls remain available above score');assert.equal(main.children[0],copy);assert.equal(pre.textContent,'C          G\nMinha canção','Chord spacing remains exact');assert.equal(pre.scrollTop,120,'Reader keeps current scroll position');
ui.larger.onclick();assert.equal(screen.values['--gx-repertoire-font'],'24px');assert.deepEqual(saved,[24]);assert.equal(nativeCalls,0,'Font changes never send MIDI');
ui.resize(999,false);assert(ui.larger.disabled);ui.smaller.onclick();assert.equal(ui.output.textContent,'28 px');ui.resize(0,false);assert(ui.smaller.disabled);
ui.focus.onclick();assert(screen.classes.has('gx-reader-focused'));assert.equal(ui.focus.attrs['aria-pressed'],'true');events.keydown({key:'Escape'});assert(!screen.classes.has('gx-reader-focused'));assert(ui.focus.focused);
shift.onclick();scroll.onclick();assert.equal(nativeCalls,2,'Existing transpose and autoscroll handlers survive moving');assert.equal(nativeCalls,2);assert(ui.libraryDetails.open);assert.equal(actions.parentNode.name,'details');
assert.equal(reader.mount({getElementById:()=>null}),undefined);
console.log('Repertoire reader PASS: font preferences and bounds, chord spacing, retained scrolling, original controls, focus/escape and passive presentation');
