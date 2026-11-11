'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.classList={add:()=>{}};this.ownerDocument=doc;this.events={};this.textContent='';this.isConnected=true;}
 append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n);}}
 insertBefore(n,ref){this.append(n);this.children.pop();const at=this.children.indexOf(ref);this.children.splice(at<0?this.children.length:at,0,n);}
 before(n){this.parentNode.insertBefore(n,this);}
 get firstChild(){return this.children[0];}get nextSibling(){const a=this.parentNode?.children||[];return a[a.indexOf(this)+1]||null;}
 setAttribute(k,v){this.attrs[k]=v;}hasAttribute(k){return k in this.attrs;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 closest(tag){return this.tagName===tag?this:this.parentNode?.closest(tag);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 querySelectorAll(s){return this.children.flatMap(n=>[...((s==='input[type="number"]'?n.tagName==='input'&&n.type==='number':n.tagName===s)?[n]:[]),...n.querySelectorAll(s)]);}
 addEventListener(k,f){this.events[k]=f;}focus(){this.focused=true;}
}
const ids={},doc={createElement:t=>new El(t),getElementById:k=>ids[k],querySelector:()=>nav};
const make=(tag,id,parent)=>{const n=new El(tag);if(id){n.id=id;ids[id]=n;}parent?.append(n);return n;};
const body=make('body'),nav=make('nav','nav',body),back=make('button','gx-return',body),sound=make('section','sound',body);make('h2',null,sound);
let midi=0;function article(names){const a=make('article',null,sound);for(const name of names){const b=make('button',name,a);b.onclick=()=>midi++;}return a;}
const tone=article(['applyTone']);const bank=make('details',null,tone);make('button','applyPart',tone);const layer=article(['layerParts']);const mix=article(['apply']);const shape=article(['applyShape']);const effects=article(['applyMfx','applyAmbience']);const params=article(['mfxParameters']);const arp=article(['applyArp']);const rhythm=article(['applyRhythm']);const scenes=article(['saveScene']);const ideas=article(['pad']);
const input=make('input','partLevel',make('label',null,tone));input.type='number';input.min='0';input.max='127';input.attrs.min=0;input.attrs.max=127;input.value='';
make('select','hardwarePart',tone);make('select','mfxUnit',effects);
let received=0,syncs=0,decorated=0;
const window={GraueSynthControls:{decorate(n){decorated++;return {sync(){syncs++;assert.equal(n.value,received?'73':'');}};}},receive(type){received++;input.value='73';}};
vm.runInNewContext(fs.readFileSync('copiloto-xps/app/src/main/assets/sound-workspace.js','utf8'),{document:doc,window});
const tabs=sound.children.find(n=>n.className==='sound-workspace-tabs'),panels=sound.children.filter(n=>n.className==='sound-workspace-page');
assert.equal(tabs.children.length,5);assert.equal(panels.length,5);assert.equal(panels.filter(p=>!p.hidden).length,1);assert.equal(midi,0,'Opening editor must never send MIDI');
assert.equal(tone.parentNode,panels[0]);assert.equal(layer.parentNode,panels[0]);assert.equal(mix.parentNode,panels[1]);assert.equal(params.parentNode,panels[2]);assert.equal(arp.parentNode,panels[3]);assert.equal(ideas.parentNode,panels[4]);assert.equal(ids.applyPart.closest('article'),tone,'Existing callbacks stay on original controls');
tabs.children[3].onclick();assert.equal(panels[3].hidden,false);assert.equal(panels[0].hidden,true);assert.equal(midi,0);tabs.children[3].onkeydown({key:'Home',preventDefault(){}});assert.equal(panels[0].hidden,false);assert(tabs.children[0].focused);
window.receive('hardware',{});assert.equal(received,1);assert.equal(decorated,1,'Readback does not decorate twice');assert.equal(syncs,2);assert.equal(midi,0,'Readback synchronization is passive');
ids.applyTone.onclick();assert.equal(midi,1,'Original apply callback survives reparenting');assert.equal(body.children[0],back,'Back button precedes nav rather than overlapping fields');
console.log('Sound workspace PASS: existing handlers, five panels, keyboard tabs, passive readbacks and reachable return');
