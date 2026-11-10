'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const lab=require('../app/src/main/assets/synthesis-lab.js');
const brain=require('../app/src/main/assets/setup-brain.js');
const patch=require('../app/src/main/assets/patch-four-tones.js');
const root=path.resolve(__dirname,'../app/src/main/assets');
const read=n=>fs.readFileSync(path.join(root,n),'utf8');
const java=n=>fs.readFileSync(path.resolve(__dirname,'../app/src/main/java/br/com/doapps/grauelive',n),'utf8');
const hw={'setup:0':[1],validSysexPackets:100,source:'midi-live',readAt:10000};
for(let i=0;i<16;i++){const p=Array(49).fill(64);p[0]=i;p[1]=1;p[4]=87;p[5]=0;p[6]=3;p[7]=90;p[17]=64;p[18]=64;p[19]=65;p[20]=70;p[32]=0;p[33]=64;hw['part:'+i]=p;}
assert.deepEqual(Object.keys(lab.GROUPS),['PCH','WG','TVA','TVF','Vel/Key','LFO','MTX','Ctrl','MFX']);
const probe=lab.createProbe();
const base=0x11<<21;
const packet=(offset,values,overrides={})=>({source:'roland-dt1-checksum-valid',address:base+offset,
  hex:'11 00 00 '+offset.toString(16).padStart(2,'0').toUpperCase(),values,...overrides});
assert.equal(probe.ingest(packet(25,[32,64,70])),true);
assert.equal(probe.markBefore(),3);
assert.equal(probe.ingest(packet(25,[32,50,70])),true);
const diffs=probe.markAfter();
assert.deepEqual(diffs,[{hex:'11 00 00 1A',before:64,after:50}]);
assert.equal(probe.state().differences,1);
for(const bad of [packet(0,[128]),packet(0,[]),packet(0,Array(33).fill(0)),
  packet(0,[1],{source:'fabricated'}),packet(0,[1],{address:0x30<<21}),null]){
 assert.equal(probe.ingest(bad),false,'Reject untrusted or unrelated sysex');
}
probe.reset();assert.equal(probe.state().count,0);assert.equal(probe.state().baseline,0);
let t=lab.parsePlan(JSON.stringify({operations:[{kind:'part',part:0,field:'cutoff',value:80}]}),
  hw,true,false,brain,patch);
assert.deepEqual(t.partEdits,[{section:'part',index:0,offset:17,value:80}]);assert.equal(t.toneEdits.length,0);
t=lab.parsePlan(''+'```json\n'+JSON.stringify({operations:[{kind:'tone',part:1,tone:3,level:55}]})+'\n```',
  hw,true,false,brain,patch);
assert.equal(t.toneEdits[0].controller,82);
const invalid=[
 {operations:[{kind:'part',part:0,field:'waveSysEx',value:60}]},
 {operations:[{kind:'sysex',part:0,address:0x11,value:70}]},
 {operations:[{kind:'part',part:0,field:'level',value:140}]},
 {operations:[{kind:'tone',part:0,tone:5,level:80}]},
 {operations:[{kind:'tone',part:0,tone:1,level:100},{kind:'tone',part:0,tone:2,level:40}]},
 {operations:[{kind:'part',part:0,field:'cutoff',value:70},{kind:'tone',part:0,tone:1,level:80}]},
 {operations:[{kind:'part',part:0,field:'cutoff',value:70,address:'10 00 00 00'}]},
 {operations:[{kind:'part',part:0,field:'cutoff',value:80},{kind:'part',part:0,field:'cutoff',value:70}]},
 {operations:[{kind:'part',part:18,field:'level',value:90}]},
 {operations:[]}
];
for(const payload of invalid)assert.throws(()=>lab.parsePlan(JSON.stringify(payload),hw,true,false,brain,patch));
assert.throws(()=>lab.parsePlan('{broken',hw,true,false,brain,patch),/JSON válido/);
assert.throws(()=>lab.parsePlan(JSON.stringify({operations:[{kind:'part',part:0,field:'level',value:20}]}),hw,false,false,brain,patch),/Conecte/);
assert.throws(()=>lab.parsePlan(JSON.stringify({operations:[{kind:'part',part:0,field:'level',value:20}]}),hw,true,true,brain,patch),/aguarde/);
const shared={...hw,'part:7':hw['part:7'].slice()};shared['part:7'][0]=0;
assert.throws(()=>lab.parsePlan(JSON.stringify({operations:[{kind:'tone',part:0,tone:1,level:80}]}),shared,true,false,brain,patch),/compartilhado/);
const controller=java('XpsController.java'),activity=java('MainActivity.java');
assert(controller.includes('public void observePatch(boolean enabled)'),'Observation must be opt-in');
assert(controller.includes('XpsProtocol.decode(packet)'),'Packet must validate Model ID and checksum');
assert(controller.includes('emitPatchObservation(d);'),'Valid packet must reach observer');
assert(controller.includes('msb<0x11||msb>0x1f'),'Never expose user bank packets');
assert(controller.includes('patchObserveCount>=100'),'Observation must be bounded');
assert(activity.includes('public void observePatch(boolean enabled)'),'Native toggle missing');
assert(activity.includes('public void planPatch(String context)'),'Offline Gemma bridge missing');
assert(activity.includes('public void partVibrato(int part,int controller,int value)'),'Documented CC76-78 native bridge missing');
assert(activity.includes('xps.isolatedToneChannel(part)'),'Part vibrato must not affect shared MIDI channels');
assert(read('synthesis-lab.js').includes("{section:'zone',index:chan,offset:12,value:lo}"),'Key Zone editing must be constrained to Performance zone');
assert(read('synthesis-lab.js').includes('transport.vibrato?.({part,cc,value:Number(input.value)})'),'Vibrato controls must use dedicated native bridge');
assert(activity.includes('emit("patchPlanAnswer"'),'Planning responses must be separate from normal chat');
assert(!read('synthesis-lab.js').includes('XpsProtocol.packet('),'UI must not generate raw SysEx');
assert(read('index.html').indexOf('synthesis-lab.js')>read('index.html').indexOf('patch-four-tones.js'));
const ux=read('ux-v2.js');assert(ux.includes('data-gx-sound="patch"'),'Synthesis Lab must stay in Sound tab');
class FakeElement{
 constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.dataset={};this.value='';this.textContent='';this.hidden=false;this.disabled=false;this.attrs={};this.classList={toggle:()=>{}};}
 append(...children){this.children.push(...children);}
 prepend(...children){this.children.unshift(...children);}
 replaceChildren(...children){this.children=[...children];}
 setAttribute(name,value){this.attrs[name]=value;}
}
const fakeDoc={
 createElement(tag){return new FakeElement(tag,fakeDoc);},
 querySelector(){return null;},
 getElementById(){return null;}
};
const target=new FakeElement('div',fakeDoc);
target.append(new FakeElement('section',fakeDoc));
let commands=[];
const instance=lab.build(target,{observe:active=>commands.push(['observe',active]),plan:t=>commands.push(['plan',t]),edit:t=>commands.push(['edit',t]),tone:t=>commands.push(['tone',t]),vibrato:t=>commands.push(['vibrato',t])});
assert.equal(instance.getState().group,'TVA');
const tabs=target.children[0];assert.equal(tabs.children.length,9);
tabs.children[1].onclick();assert.equal(instance.getState().group,'WG');
tabs.children[3].onclick();assert.equal(instance.getState().group,'TVF');
const zone=Array(27).fill(0);zone[12]=20;zone[13]=100;hw['zone:0']=zone;
instance.receive('xpsConnection',true);instance.receive('hardware',hw);
assert.equal(instance.getState().connected,true);
assert.equal(instance.getState().liveSeen,true);
instance.receive('patchObserveState',true);instance.receive('patchProbe',packet(10,[70]));
assert.equal(instance.probe.state().count,1);
assert.equal(commands.length,0,'A leitura e a navegação nunca enviam MIDI');
tabs.children[4].onclick();
const detail=target.children[3],zoneRow=detail.children[3],zoneApply=detail.children[4];
zoneRow.children[0].children[0].value='21';
zoneRow.children[1].children[0].value='90';
zoneApply.onclick();
assert.deepEqual(commands[0],['edit',[
 {section:'zone',index:0,offset:12,value:21},
 {section:'zone',index:0,offset:13,value:90}
]]);
tabs.children[5].onclick();
const vibratoRow=target.children[3].children[3];
vibratoRow.children[0].children[0].value='88';
vibratoRow.children[0].children[1].onclick();
assert.deepEqual(commands[1],['vibrato',{part:0,cc:76,value:88}]);
assert.equal(commands.length,2,'Only musician clicks may send MIDI');
instance.receive('hardwareReset',true);
assert.equal(instance.getState().liveSeen,false);
console.log('Grauê Synthesis Lab: 9 sections, valid packets, before/after comparison, offline LLM plans and SysEx firewall PASS');
