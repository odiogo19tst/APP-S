'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../app/src/main/assets/patch-four-tones.js');
const root=path.join(__dirname,'../app/src/main/assets');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const ctrl=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/XpsController.java'),'utf8');
const hw=()=>{
 const h={'setup:0':[1],validSysexPackets:64};
 for(let i=0;i<16;i++){
  let p=Array(49).fill(0);p[0]=i;p[1]=1;p[4]=87;p[5]=0;p[6]=10;
  h['part:'+i]=p;
 }
 return h;
};
assert.equal(api.GROUPS.length,9,'Preserve the deeper Patch editor taxonomy');
const state=hw();
assert.deepEqual(api.safeChannel(state,0,true,false),{enabled:true,channel:1});
assert.deepEqual(api.command(state,0,1,100,true,false),{part:0,tone:1,value:100,channel:1,controller:80});
assert.deepEqual(api.command(state,15,4,0,true,false),{part:15,tone:4,value:0,channel:16,controller:83});
for(let tone=1;tone<=4;tone++){
 const sent=api.command(state,2,tone,75,true,false);
 assert.equal(sent.controller,79+tone);
}
for(let invalid of [-1,128,2.2,NaN])assert.throws(()=>api.command(state,0,1,invalid,true,false),/0 a 127/);
for(let tone of [0,5,19])assert.throws(()=>api.command(state,0,tone,20,true,false),/Tone inválido/);
assert.equal(api.safeChannel(state,0,false,false).enabled,false);
assert.equal(api.safeChannel(state,0,true,true).enabled,false);
assert.equal(api.safeChannel({},0,true,false).enabled,false);
const shared=hw();shared['part:7'][0]=0;
assert.match(api.safeChannel(shared,0,true,false).reason,/compartilhado/);
assert.throws(()=>api.command(shared,0,2,64,true,false),/compartilhado/);
const missing=hw();delete missing['part:7'];
assert.match(api.safeChannel(missing,0,true,false).reason,/16 canais/);
const inactive=hw();inactive['part:0'][1]=0;
assert.equal(api.safeChannel(inactive,0,true,false).enabled,false);
class Fake{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.disabled=false;this.type='';this.value='';this.placeholder='';this.textContent='';}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(k,v){this.attrs[k]=v;}
}
const doc={createElement(tag){return new Fake(tag,doc);}};
const container=new Fake('section',doc);
const sent=[],device={read:()=>sent.push(['read']),send:cmd=>sent.push(['send',cmd])};
const ui=api.build(container,device);
assert.equal(ui.getState().connected,false);
assert.equal(container.children.length,6);
let [header,pickerRow,status,grid,note,future]=container.children;
assert.equal(grid.children.length,4);
assert.equal(grid.children[0].children[3].disabled,true,'Do not enable before observed hardware');
ui.receive('xpsConnection',true);ui.receive('hardware',state);
assert.equal(ui.getState().connected,true);
assert.equal(grid.children[0].children[3].disabled,false);
assert.equal(grid.children[0].children[2].children[0].value,'','Unknown Tone Level cannot have fake initial readback');
const first=grid.children[0];
first.children[2].children[0].value='73';first.children[3].onclick();
assert.equal(sent.length,1);
assert.deepEqual(sent[0],['send',{part:0,tone:1,value:73,channel:1,controller:80}]);
assert.equal(first.children[3].disabled,true);
ui.receive('toneLevelSent',{part:0,tone:1,channel:1,controller:80,value:73});
assert.match(first.children[4].textContent,/não confirmado/);
assert.equal(first.children[3].disabled,false);
ui.receive('hardwareBusy',true);assert.equal(grid.children[0].children[3].disabled,true);
ui.receive('hardwareBusy',false);ui.receive('hardware',shared);assert.equal(grid.children[0].children[3].disabled,true);
ui.receive('hardwareReset',true);assert.equal(grid.children[0].children[3].disabled,true);
assert.equal(native.includes('public void toneLevel(int part,int tone,int value)'),true,'Native four-tone bridge missing');
assert(native.includes('int controller=79+tone'),'Tone MIDI CC must be 80..83');
assert(native.includes('xps.isolatedToneChannel(part)'),'Never send tone CC without exclusive validated channel');
assert(ctrl.includes('public int isolatedToneChannel(int part)'),'Controller must validate readback');
assert(ctrl.includes('if(otherChannel==null||otherEnabled==null)return -1;'),'Never infer channels from partial SysEx');
assert(read('ux-v2.js').includes('data-gx-sound="patch"'));
assert(read('ux-v2.js').includes('id="gx-patch-four-tones"'));
const index=read('index.html');
assert(index.indexOf('patch-four-tones.js')>index.indexOf('ux-v2.js'));
assert(!read('patch-four-tones.js').includes('editHardware('),'Avoid fabricated Patch SysEx writes');
console.log('Grauê 4 Tones 1.30.7: CC80–83, unique channel guard, true unknown readback, UI and Java bridge PASS');
