'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class El{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.classList={add:()=>{}};this.ownerDocument=doc;this.events={};this.textContent='';this.isConnected=true;}
 append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n);}}
 insertBefore(n,ref){this.append(n);this.children.pop();const at=this.children.indexOf(ref);this.children.splice(at<0?this.children.length:at,0,n);}
 prepend(n){this.insertBefore(n,this.firstChild);}
 before(n){this.parentNode.insertBefore(n,this);}
 get firstChild(){return this.children[0];}get nextSibling(){const a=this.parentNode?.children||[];return a[a.indexOf(this)+1]||null;}
 setAttribute(k,v){this.attrs[k]=v;}hasAttribute(k){return k in this.attrs;}
 contains(n){return n===this||this.children.some(c=>c.contains(n));}
 closest(tag){return this.tagName===tag?this:this.parentNode?.closest(tag);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
 matches(s){return s.split(',').some(s=>s[0]==='.'?this.className?.split(' ').includes(s.slice(1)):s==='input[type="number"]'?this.tagName==='input'&&this.type==='number':this.tagName===s);}
 querySelectorAll(s){return this.children.flatMap(n=>[...(n.matches(s)?[n]:[]),...n.querySelectorAll(s)]);}
 scrollIntoView(){this.scrolled=true;}
 addEventListener(k,f){this.events[k]=f;}focus(){this.focused=true;}
}
const ids={},doc={createElement:t=>new El(t),getElementById:k=>ids[k]||find(body,k),querySelector:s=>s==='body > nav'?nav:null};
function find(n,k){if(n.id===k)return n;for(const c of n.children){const found=find(c,k);if(found)return found;}return null;}
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
assert.equal(tone.parentNode,panels[0]);assert.equal(layer.parentNode,panels[1]);assert.equal(mix.parentNode,panels[1]);assert.equal(params.parentNode,panels[2]);assert.equal(arp.parentNode,panels[3]);assert.equal(ideas.parentNode,panels[4]);assert.equal(ids.applyPart.closest('article').id,'sound-part-settings','Part settings follow the adjustment step');
tabs.children[3].onclick();assert.equal(panels[3].hidden,false);assert.equal(panels[0].hidden,true);assert.equal(midi,0);tabs.children[3].onkeydown({key:'Home',preventDefault(){}});assert.equal(panels[0].hidden,false);assert(tabs.children[0].focused);
window.receive('hardware',{});assert.equal(received,1);assert.equal(decorated,1,'Readback does not decorate twice');assert.equal(syncs,2);assert.equal(midi,0,'Readback synchronization is passive');
ids.applyTone.onclick();assert.equal(midi,1,'Original apply callback survives reparenting');assert.equal(body.children[0],back,'Back button precedes nav rather than overlapping fields');
console.log('Sound workspace PASS: existing handlers, five panels, keyboard tabs, passive readbacks and reachable return');
// Exercise the actual workflow with the same controls, not a parallel UI model.
const partLabel=make('label',null,tone);partLabel.append(ids.hardwarePart);
for(const key of ['readHardware','performanceMode','undoHardware','hardwareStatus','partSummary'])make('button',key,tone);
const ambience=make('article','ambienceCard',panels[2]);ambience.append(ids.applyAmbience);
make('div','status',body);
assert(window.GraueSoundWorkspace.open('effects'));assert.equal(panels[2].hidden,false);
assert.equal(window.GraueSoundWorkspace.open('unknown'),false);assert.equal(panels[2].hidden,false);
vm.runInNewContext(fs.readFileSync('copiloto-xps/app/src/main/assets/sound-flow.js','utf8'),{document:doc,window});
assert.equal(midi,1,'Organizing the workflow never transmits MIDI');
assert.equal(ids.hardwarePart.closest('article').id,'sound-flow-context','Part selector stays above every step');
assert.equal(ids.readHardware.closest('article').id,'sound-flow-context');
assert.equal(ambience.parentNode,panels[2]);assert.equal(params.parentNode.tagName,'details','Internal MFX parameters start collapsed');
assert.equal(params.parentNode.open,undefined);
const stepButtons=panels[2].querySelector('.sound-flow-step-actions').children;
stepButtons[1].onclick();assert.equal(panels[3].hidden,false);assert.equal(midi,1);
sound.events.input({target:input});const note=input.closest('article').querySelector('.sound-flow-prepared');assert.match(note.textContent,/preparados/);assert.equal(midi,1);
window.receive('status','Não foi possível confirmar todos os valores enviados.');
assert.match(doc.getElementById('sound-flow-response').textContent,/Não foi possível/,'Do not turn unconfirmed sends into success');
window.receive('hardware',{});assert.match(note.textContent,/leitura/);assert(!/confirmad/.test(note.textContent));assert.equal(midi,1);
assert.equal(ids.saveScene.textContent,'Salvar cena de controles no celular');
console.log('Sound flow PASS: shared target, direct effects route, collapsed parameters, passive navigation, prepared values and actual error feedback');
