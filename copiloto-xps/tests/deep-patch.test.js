'use strict';
const assert=require('node:assert/strict'),deep=require('../app/src/main/assets/deep-patch.js'),lab=require('../app/src/main/assets/synthesis-lab.js'),brain=require('../app/src/main/assets/setup-brain.js'),patch=require('../app/src/main/assets/patch-four-tones.js');
const state={ready:true,source:'midi-live',part:0,revision:7,common:Array(80).fill(64),tmt:Array(41).fill(64)};
for(let i=1;i<=4;i++)state['tone'+i]=Array(154).fill(64);
state.tone1[110]=4;state.tone1[111]=0;state.tone1[44]=0;state.tone1[45]=1;state.tone1[46]=0;state.tone1[47]=0;
assert.equal(deep.defs.length,244);
const d=id=>deep.defs.find(d=>d.id===id);
assert.equal(deep.decode(d('tone_wave_number_l_mono'),state.tone1),256);
assert.equal(deep.decode(d('tone_lfo1_rate'),state.tone1),64);
assert.throws(()=>deep.decode(d('tone_lfo1_rate'),Array(1)),/incompleta/);
assert.deepEqual(deep.prepare(state,[{field:'tone_tva_env_time_1',tone:1,value:90}],0),{part:0,revision:7,operations:[{field:'tone_tva_env_time_1',tone:1,value:90}]});
for(const op of [{field:'unknown',tone:1,value:90},{field:'tone_tva_env_time_1',tone:5,value:90},{field:'tone_tva_env_time_1',tone:1,value:128},{field:'tone_tva_env_time_1',tone:1,value:90.1},{field:'common_matrix_control_1_source',tone:1,value:32},{field:'tone_tva_env_time_1',tone:1,value:90,address:123}])assert.throws(()=>deep.prepare(state,[op],0));
for(const missing of [{...state,ready:false},{...state,source:'midi-cache'},{...state,part:1},{...state,tone1:[]}])assert.throws(()=>deep.prepare(missing,[{field:'tone_tva_env_time_1',tone:1,value:90}],0));
assert.throws(()=>deep.prepare(state,[{field:'tone_tva_env_time_1',tone:1,value:90},{field:'tone_tva_env_time_1',tone:1,value:80}],0),/duplicado/);
assert.throws(()=>deep.prepare(state,[{field:'tmt_tmt1_keyboard_range_lower',tone:1,value:100}],0),/inicial/);
const hw={'setup:0':[1],source:'midi-live',validSysexPackets:5,readAt:100};
for(let i=0;i<16;i++){hw['part:'+i]=Array(49).fill(64);hw['part:'+i][0]=i;hw['part:'+i][1]=1;}
const json=JSON.stringify({operations:[{kind:'patch',part:0,tone:1,field:'tone_tva_env_time_1',value:90}]});
const plan=lab.parsePlan(json,hw,true,false,brain,patch,state);
assert.equal(plan.deepRequest.revision,7);assert.equal(plan.deepRequest.operations[0].field,'tone_tva_env_time_1');
assert.throws(()=>lab.parsePlan(json,hw,true,false,brain,patch,{...state,ready:false}));
assert.throws(()=>lab.parsePlan(JSON.stringify({operations:[{kind:'patch',part:0,tone:1,field:'tone_tva_env_time_1',value:90},{kind:'part',part:0,field:'cutoff',value:90}]}),hw,true,false,brain,patch,state),/um Patch/);
// Real UI handlers, with actual parameter state, never synthesize a MIDI readback.
class Element{constructor(tag,doc){this.tagName=tag;this.ownerDocument=doc;this.children=[];this.attrs={};this.value='';this.disabled=false;this.className='';}append(...c){this.children.push(...c);}setAttribute(k,v){this.attrs[k]=v;}querySelector(s){return this.children.find(c=>c.className===s.slice(1));}remove(){}}
const doc={createElement:t=>new Element(t,doc)},host=new Element('div',doc),calls=[];
const ui=deep.create({readDeep:p=>calls.push(['read',p]),editDeep:r=>calls.push(['edit',r]),undoDeep:()=>calls.push(['undo'])});
ui.render(host,'TVA',0);let area=host.children.at(-1);assert(area.children[0].children[1].disabled);
ui.receive('xpsConnection',true);area=host.children.at(-1);area.children[0].children[1].onclick();assert.deepEqual(calls.at(-1),['read',0]);
ui.receive('deepPatch',state);area=host.children.at(-1);const grid=area.children[2];const level=grid.children.find(e=>e.textContent==='Tone Level');assert(level&&!level.children[0].disabled);level.children[0].value='90';level.children[0].onchange();const apply=area.children[4];assert(!apply.disabled);apply.onclick();assert.equal(calls.at(-1)[0],'edit');assert.equal(calls.at(-1)[1].revision,7);assert.equal(calls.at(-1)[1].operations[0].value,90);
ui.receive('hardwareBusy',true);area=host.children.at(-1);assert(area.children[2].children.every(e=>e.children[0].disabled));
console.log('Deep Patch UI PASS: real reads, strict IDs/ranges, nibble decoding, stale/cache/duplicate rejection, AI proposals and manual review/apply');
