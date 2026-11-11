'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.parentNode=null;this.dataset={};this.attrs={};this.listeners={};this._text='';this._class='';this.ownerDocument=doc;this.classList={add:c=>this._set(c,true),contains:c=>this._class.split(' ').includes(c),toggle:(c,on)=>this._set(c,on??!this.classList.contains(c))};}
 _set(c,on){const values=new Set(this._class.split(' ').filter(Boolean));on?values.add(c):values.delete(c);this._class=[...values].join(' ');}
 set className(s){this._class=s;}get className(){return this._class;}
 set textContent(s){this._text=s;this.children=[];}get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
 append(...nodes){for(const n of nodes){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);this.children.push(n);n.parentNode=this;}}
 prepend(n){this.insertBefore(n,this.children[0]);}
 insertBefore(n,ref){if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);const i=ref?this.children.indexOf(ref):-1;this.children.splice(i<0?this.children.length:i,0,n);n.parentNode=this;}
 replaceChildren(...n){for(const c of this.children)c.parentNode=null;this.children=[];this._text='';this.append(...n);}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
 click(){this.onclick?.({target:this});for(const f of this.listeners.click||[])f({target:this});}
 contains(n){return this===n||this.children.some(c=>c.contains(n));}
 scrollIntoView(){this.scrolled=true;}
 focus(){this.focused=true;}
 matches(s){
  const not=s.match(/:not\(([^)]+)\)/);if(not){if(this.matches(not[1]))return false;s=s.replace(not[0],'');}
  const parts=s.split(' ');if(parts.length>1){if(!this.matches(parts.pop()))return false;let parent=this.parentNode;while(parent){if(parent.matches(parts.join(' ')))return true;parent=parent.parentNode;}return false;}
  const a=s.match(/\[([^=\]]+)(?:="([^"]+)")?\]/);if(a){let value=a[1].startsWith('data-')?this.dataset[a[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:this.attrs[a[1]];if(value===undefined||a[2]!==undefined&&value!==a[2])return false;s=s.replace(a[0],'');}
  const tag=s.match(/^[a-z]+/);if(tag&&tag[0]!==this.tagName)return false;
  for(const m of s.matchAll(/\.([a-z0-9-]+)/g))if(!this.classList.contains(m[1]))return false;
  return true;
 }
 querySelectorAll(s){if(s===':scope>small')return this.children.filter(n=>n.tagName==='small');const all=[];for(const c of this.children){if(c.matches(s))all.push(c);all.push(...c.querySelectorAll(s));}return all;}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}
}
const doc={events:{},createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t),addEventListener(k,f){this.events[k]=f;},getElementById(k){return nodes[k]||null;}};
const nodes={},make=(tag,cls,id,parent)=>{const n=new Node(tag);n.className=cls||'';if(id){n.id=id;nodes[id]=n;}parent?.append(n);return n;};
const shell=make('div','','gx-shell'),header=make('header','gx-header','',shell),brand=make('div','gx-brand','',header);make('small','','',brand);
for(const id of ['gx-open-settings','gx-unified-usb','gx-midi-refresh'])make('button','',id,header);
const nav=make('nav','gx-nav','',shell),calls=[];
for(const key of ['stage','repertoire','sound','drums','coach','backups','settings']){const n=make('button',key==='stage'?'on':'','tab-'+key,nav);n.dataset.gxTab=key;n.onclick=()=>{for(const b of nav.querySelectorAll('[data-gx-tab]'))b.classList.toggle('on',b===n);calls.push(key);};}
const stage=make('div','','',shell);stage.dataset.gxScreen='stage';const current=make('div','gx-current','',stage);
for(const id of ['gx-stage-rig-info','gx-stage-health','gx-stage-reapply-rig'])make('small','',id,current);
for(const id of ['gx-start','gx-pause','gx-next','gx-panic','gx-show-favorites']){const n=make('button','',id,stage);n.onclick=()=>calls.push(id);}
for(const cls of ['gx-zone','graue-metronome','gx-silent-advisor','gx-assist','gx-played-feedback'])make('section',cls,'',stage);
const looper=make('section','gx-midi-looper','',stage),settings=make('div','loop-settings','',looper),actions=make('div','loop-actions','',looper);make('small','','',looper);
for(const key of ['loop-rec','loop-play','loop-stop','loop-mute','loop-clear']){const n=make('button','',key,actions);n.onclick=()=>calls.push(key);}
const sound=make('div','','',shell);sound.dataset.gxScreen='sound';const soundLayout=make('div','gx-sound-layout','',sound),soundNav=make('aside','gx-sound-nav','',soundLayout);
for(const key of ['Timbres','Editor 4 Tones']){const n=make('button',key==='Timbres'?'on':'','',soundNav);n.textContent=key;n.onclick=()=>{for(const b of soundNav.children)b.classList.toggle('on',b===n);calls.push(key);};}
let priorCalls=0;const window={matchMedia:()=>({matches:false}),receive:()=>priorCalls++};
const originalButtons=Object.fromEntries(Object.entries(nodes).filter(([,n])=>n.tagName==='button'));
vm.runInNewContext(fs.readFileSync(__dirname+'/../app/src/main/assets/layout-v3.js','utf8'),{document:doc,window,console});
assert.equal(nav.children.length,5,'Four primary pages and More');
assert.equal(nodes['tab-settings'],originalButtons['tab-settings']);nodes['tab-settings'].click();assert.equal(calls.at(-1),'settings');assert.equal(nodes['tab-settings'].attrs['aria-current'],'page');assert(nav.children[4].classList.contains('gx-more-active'));
nodes['tab-stage'].click();assert.equal(calls.at(-1),'stage');assert(!nav.children[4].classList.contains('gx-more-active'));
for(const id of ['gx-start','gx-next','gx-panic','loop-rec','loop-mute','loop-clear']){assert.equal(nodes[id],originalButtons[id]);nodes[id].click();assert.equal(calls.at(-1),id,'Original command handler retained');}
assert.equal(nodes['loop-mute'].parentNode.className,'gx-loop-secondary');assert.equal(settings.parentNode.className,'gx-loop-options');
nodes['gx-show-favorites'].click();const favorites=stage.children.find(c=>c.classList.contains('gx-favorites-disclosure'));assert(favorites.open&&favorites.scrolled,'Favorites shortcut expands before scrolling');
soundNav.children[1].click();assert.equal(calls.at(-1),'Editor 4 Tones');assert(!soundNav.parentNode.open,'Mobile sound chooser closes after selection');
window.receive('xpsConnection',true);assert.equal(shell.dataset.connection,'midi');window.receive('hardware',{validSysexPackets:5});assert.equal(shell.dataset.connection,'verified');window.receive('xpsConnection',false);assert.equal(shell.dataset.connection,'offline');assert.equal(priorCalls,3,'Native receiver chain preserved');
nav.children[4].open=true;doc.events.keydown({key:'Escape'});assert(!nav.children[4].open);
console.log('Layout v3 PASS: all original controls/handlers preserved, More navigation, disclosure shortcuts, sound selection and real USB/SysEx state');
