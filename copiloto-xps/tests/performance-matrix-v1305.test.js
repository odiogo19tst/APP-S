'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../app/src/main/assets/performance-matrix.js');
const src=n=>fs.readFileSync(path.join(__dirname,'../app/src/main/assets',n),'utf8');
const native=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/XpsProtocol.java'),'utf8');
assert.equal(Object.keys(api.FIELDS).length,7);
assert.deepEqual(Object.values(api.FIELDS).map(x=>x.offset),[7,17,18,19,20,33,32]);
assert(native.includes('0x20')&&native.includes('0x21'),'Native whitelist for 32,33 missing');
const makeState=()=>{const part=Array(49).fill(64);part[0]=0;part[7]=84;part[17]=55;part[18]=64;part[19]=75;part[20]=69;part[33]=70;part[32]=2;return {'setup:0':[1],'part:0':part};};
const hw=makeState();
assert.equal(api.observed(hw,0,'level'),84);
assert.equal(api.observed(hw,1,'level'),null);
assert.equal(api.observed(hw,0,'mfx'),2);
assert.deepEqual(api.edit(hw,0,'attack',99,true,false),[{section:'part',index:0,offset:19,value:99}]);
assert.deepEqual(api.edit(hw,0,'mfx',0,true,false),[{section:'part',index:0,offset:32,value:0}]);
assert.equal(api.edit(hw,0,'level',84,true,false),null);
for(const args of [[hw,0,'level',40,false,false],[hw,0,'level',40,true,true],[{},0,'level',40,true,false],[hw,1,'level',40,true,false],[hw,0,'mfx',3,true,false],[hw,0,'level',-1,true,false],[hw,0,'attack',128,true,false],[hw,16,'level',40,true,false]])assert.throws(()=>api.edit(...args));
assert.throws(()=>api.edit({'setup:0':[0],'part:0':hw['part:0']},0,'level',40,true,false));
class Fake {
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.style={};this.disabled=false;this.value='';this.textContent='';this.classes=new Set();this.classList={toggle:(name,on)=>{if(on)this.classes.add(name);else this.classes.delete(name);}};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(name,value){this.attrs[name]=value;}
}
const doc={createElement(tag){return new Fake(tag,doc);}};
const container=new Fake('section',doc);
const sent=[],device={read:()=>sent.push(['read']),undo:()=>sent.push(['undo']),apply:instructions=>sent.push(['apply',instructions])};
const mounted=api.build(container,device);
let [header,toolbar,hint,grid,status]=container.children;
assert.equal(grid.children.length,8,'Initial page displays eight parts');
assert(grid.children[0].children[3].disabled,'Cannot edit without observed parts');
mounted.receive('xpsConnection',true);
mounted.receive('hardware',hw);
assert.equal(grid.children[0].children[2].textContent,'84');
assert.equal(grid.children[0].children[3].disabled,false,'Observed part must be enabled');
assert.equal(grid.children[1].children[3].disabled,true,'Unobserved part must stay disabled');
const control=grid.children[0].children[3];control.value='96';control.onchange();
assert.deepEqual(sent.at(-1),['apply',[{section:'part',index:0,offset:7,value:96}]]);
assert.equal(control.disabled,true,'Block repeated commands until hardware feedback');
mounted.receive('hardwareBusy',true);
assert(grid.children[0].children[3].disabled);
mounted.receive('hardwareBusy',false);
mounted.receive('hardware',makeState());
const toolbarSelect=toolbar.children[0].children[0];toolbarSelect.value='mfx';toolbarSelect.onchange();
assert.equal(grid.children[0].children[2].textContent,'3','Human-facing MFX numbers are 1–3');
header.children[1].onclick();header.children[2].onclick();
assert.deepEqual(sent.slice(-2),[['read'],['undo']]);
toolbar.children[1].children[1].onclick();
assert.equal(mounted.getState().page,1);
assert(grid.children.every(c=>c.children[3].disabled),'Unobserved page has no active sliders');
mounted.receive('hardwareReset',true);
assert(grid.children.every(c=>c.children[3].disabled));
const ux=src('ux-v2.js'),index=src('index.html');
assert(ux.includes('id="gx-performance-matrix"'));
assert(ux.includes('data-gx-sound="matrix"'));
assert(index.indexOf('performance-matrix.js')>index.indexOf('ux-v2.js'));
assert(src('ux-v2.css').includes('gx-matrix-grid'));
console.log('Grauê Performance Matrix: 7 verified fields, 16 parts, safe SysEx gating, redraw and undo PASS');
