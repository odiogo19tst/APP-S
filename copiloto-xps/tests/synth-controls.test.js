'use strict';
const assert=require('node:assert/strict'),controls=require('../app/src/main/assets/synth-controls.js');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attrs={};this.dataset={};this.value='';this.disabled=false;this.classes=new Set();this.classList={add:c=>this.classes.add(c),toggle:(c,on)=>on?this.classes.add(c):this.classes.delete(c)};this.ownerDocument=doc;}
 append(n){this.children.push(n);n.parentNode=this;}
 setAttribute(k,v){this.attrs[k]=v;}
}
const doc={createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t)};
function field(def,value,disabled=false){const card=new Element('label'),input=new Element('input'),changes=[];input.type='number';input.value=value;input.disabled=disabled;input.onchange=function(){assert.equal(this,input);changes.push(this.value);};card.append(input);const widget=controls.decorate(input,def);return {card,input,widget,changes};}
const level={label:'Tone Level',min:0,max:127,width:1};
let f=field(level,'64');assert.equal(f.widget.mode,'fader');assert.equal(f.widget.control.min,'0');assert.equal(f.widget.control.max,'127');assert.equal(f.widget.control.value,'64');f.widget.control.value='99';f.widget.control.oninput();assert.equal(f.input.value,'99');assert.deepEqual(f.changes,['99']);assert.equal(f.widget.root.children.at(-1).textContent,'99');
f.input.value='40';f.input.onchange();assert.equal(f.widget.control.value,'40');assert.deepEqual(f.changes,['99','40'],'Exact numeric entry still reaches original validation');
const before=f.card.children.length;assert.equal(controls.decorate(f.input,level),null);assert.equal(f.card.children.length,before,'No duplicate decorators');
f=field({label:'Tone Pan',min:0,max:127,width:1},'64');assert.equal(f.widget.mode,'knob');const indicator=f.widget.root.children[0].children.at(-1);assert.match(indicator.attrs.transform,/rotate\(/);f.widget.control.value='127';f.widget.control.oninput();assert.equal(indicator.attrs.transform,'rotate(135 40 40)');assert.deepEqual(f.changes,['127']);
f=field({label:'Tone Receive Hold-1',min:0,max:1,width:1},'0');assert.equal(f.widget.mode,'switch');assert.equal(f.widget.control.attrs.role,'switch');assert.equal(f.widget.control.attrs['aria-checked'],'false');f.widget.control.onclick();assert.equal(f.input.value,'1');assert.equal(f.widget.control.attrs['aria-checked'],'true');assert.equal(f.widget.root.children.at(-1).textContent,'ON');f.widget.control.onclick();assert.equal(f.input.value,'0');assert.deepEqual(f.changes,['1','0']);
f=field(level,'',true);assert(f.widget.control.disabled);assert(f.widget.root.classes.has('gx-control-unread'));assert.equal(f.widget.root.children.at(-1).textContent,'—','No invented readback value');f.widget.control.oninput();assert.equal(f.changes.length,0);
f=field({label:'Tone Pan',min:0,max:127,width:1},'',true);assert.equal(f.widget.root.children[0].children.at(-1).attrs.visibility,'hidden','Unknown knob has no fake position');
f=field({label:'Legato Switch',min:0,max:1,width:1},'1',true);f.widget.control.onclick();assert.equal(f.changes.length,0,'Disconnected/read-only switch cannot edit');
assert.equal(controls.kind({label:'Wave Number L',min:0,max:16384,width:4}),'number','Wave IDs keep exact numeric selection');assert.equal(controls.kind({label:'TVF Filter Type',min:0,max:6,width:1,choices:['OFF','LPF']}),'number','Documented enum remains a select');
console.log('Synth controls PASS: true MIDI values, fader/knob/numeric synchronization, switches, original callbacks, disabled/unknown readback and exact Wave IDs');
