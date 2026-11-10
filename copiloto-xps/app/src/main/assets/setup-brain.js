'use strict';
/*
 * Grauê Setup Brain v1.30.6 — strictly deterministic command planner.
 * A language model can propose intents, but MUST NOT invent SysEx addresses.
 * The only writable part offsets here are whitelisted in XpsProtocol.java.
 * No memory USER/WRITE, firmware, Test Mode or audio sample writes.
 */
(function(scope){
 const PARAMETERS=Object.freeze({
  level: {offset:7, label:'Volume',min:0,max:127},
  cutoff:{offset:17,label:'Filtro / Cutoff',min:0,max:127},
  resonance:{offset:18,label:'Ressonância',min:0,max:127},
  attack:{offset:19,label:'Ataque',min:0,max:127},
  release:{offset:20,label:'Release',min:0,max:127},
  mfx:{offset:32,label:'Saída MFX',min:0,max:2},
  decay:{offset:33,label:'Decay',min:0,max:127}
 });
 const byOffset=Object.fromEntries(Object.values(PARAMETERS).map(p=>[p.offset,p]));
 const isNum=x=>Number.isInteger(x);
 const validValue=(offset,val)=>!!byOffset[offset]&&isNum(val)&&val>=byOffset[offset].min&&val<=byOffset[offset].max;
 function cleanParts(input){
  if(!Array.isArray(input)||input.length>16)return null;
  const out=[],seen=new Set();
  for(const entry of input){
   if(!entry||!isNum(entry.part)||entry.part<0||entry.part>15||seen.has(entry.part))return null;
   seen.add(entry.part);
   if(!entry.values||typeof entry.values!=='object'||Array.isArray(entry.values))return null;
   const values={};
   for(const [raw,val] of Object.entries(entry.values)){
    if(!/^(7|17|18|19|20|32|33)$/.test(raw)||!validValue(Number(raw),val))return null;
    values[raw]=val;
   }
   if(!Object.keys(values).length)return null;
   out.push({part:entry.part,values});
  }
  return out.sort((a,b)=>a.part-b.part);
 }
 /**
  * Four Tone levels per one Performance Part, explicitly entered at rehearsal.
  * These CC80..83 values have no Tone SysEx readback in the current app.
  * No more than four commands per one-touch song selection.
  */
 function cleanTonePreset(raw){
  if(raw===null)return null;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     !isNum(raw.part)||raw.part<0||raw.part>15||
     !raw.levels||typeof raw.levels!=='object'||Array.isArray(raw.levels))return null;
  const levels={};
  for(const [tone,value] of Object.entries(raw.levels)){
   if(!/^[1-4]$/.test(tone)||!isNum(value)||value<0||value>127)return null;
   levels[tone]=value;
  }
  if(!Object.keys(levels).length)return null;
  return {part:raw.part,levels};
 }
 function isPerformance(hw){
  return !!hw&&Array.isArray(hw['setup:0'])&&hw['setup:0'][0]===1&&Number(hw.validSysexPackets)>0;
 }
 function capture(hw){
  if(!isPerformance(hw))throw Error('Faça uma leitura SysEx real em modo Performance antes de salvar o setup.');
  const parts=[];
  for(let i=0;i<16;i++){
   const row=hw['part:'+i];if(!Array.isArray(row)||row.length<49)continue;
   const values={};
   for(const def of Object.values(PARAMETERS)){
    const value=row[def.offset];
    if(validValue(def.offset,value))values[def.offset]=value;
   }
   if(Object.keys(values).length)parts.push({part:i,values});
  }
  if(!parts.length)throw Error('Nenhuma parte do Roland respondeu com parâmetros completos.');
  return cleanParts(parts);
 }
 function diff(hw,partSnapshot){
  if(!isPerformance(hw))throw Error('Sem leitura atual verificada para aplicar o setup.');
  const parts=cleanParts(partSnapshot);if(parts===null||!parts.length)throw Error('Setup de partes inválido ou vazio.');
  const commands=[];
  for(const item of parts){
   const observed=hw['part:'+item.part];
   if(!Array.isArray(observed)||observed.length<49)throw Error('Parte '+(item.part+1)+' não foi lida; nenhuma alteração foi enviada.');
   for(const [offset,value] of Object.entries(item.values)){
    if(!validValue(Number(offset),observed[Number(offset)]))throw Error('Parâmetro '+offset+' da parte '+(item.part+1)+' não foi confirmado no teclado.');
    if(observed[Number(offset)]!==value)commands.push({section:'part',index:item.part,offset:Number(offset),value});
   }
  }
  if(commands.length>128)throw Error('Configuração excede o limite de operações MIDI.');
  return commands;
 }
 function suggest(request,part,hw){
  if(!isNum(part)||part<0||part>15)throw Error('Escolha uma parte de 1 a 16.');
  if(!isPerformance(hw)||!Array.isArray(hw['part:'+part]))throw Error('Leia a Performance antes de pedir um ajuste.');
  const q=String(request||'').toLocaleLowerCase('pt-BR');
  const row=hw['part:'+part],targets=[];
  const proposed=(name,val)=>{
   const spec=PARAMETERS[name],old=row[spec.offset];
   if(!validValue(spec.offset,old))throw Error('Parâmetro '+spec.label+' não foi lido.');
   const next=Math.max(spec.min,Math.min(spec.max,Math.round(val)));
   if(next!==old)targets.push({section:'part',index:part,offset:spec.offset,value:next});
  };
  let description='';
  if(/(suav|macio|oração|oracao|pad leve|strings leve)/.test(q)){
   proposed('attack',Math.max(77,row[19]));proposed('cutoff',Math.min(62,row[17]));
   proposed('resonance',Math.min(64,row[18]));proposed('level',Math.min(92,row[7]));
   description='Sugestão local: suavizar ataque, filtro e volume desta parte';
  }else if(/(brilh|mais aberto|abrir filtro)/.test(q)){
   proposed('cutoff',Math.max(79,row[17]));
   description='Sugestão local: abrir o filtro desta parte';
  }else if(/(menos volume|baixar volume|diminuir volume)/.test(q)){
   proposed('level',row[7]-12);
   description='Sugestão local: reduzir volume desta parte';
  }else if(/(mais volume|aumentar volume|subir volume)/.test(q)){
   proposed('level',row[7]+12);
   description='Sugestão local: aumentar volume desta parte';
  }else{
   return {description:'Pedido não mapeado com segurança. Consulte o Jarvis Musical para orientação textual.',commands:[],supported:false};
  }
  return {description,commands:targets,supported:true};
 }
 function createRunner(sendEdits,sendTones){
  let pending=null;
  function prepare(rig,title){
   pending=null;
   if(!rig||rig.auto===false)return false;
   const parts=Array.isArray(rig.parts)?cleanParts(rig.parts):[];
   const tones=rig.tones===undefined?null:cleanTonePreset(rig.tones);
   if((!parts||!parts.length)&&!tones)return false;
   if(rig.tones!==undefined&&!tones)return false;
   pending={type:rig.type,number:rig.number,parts:parts||[],tones,
     title:String(title||''),phase:'select',ack:false,busyAfterAck:false,started:Date.now(),expected:null};
   return true;
  }
  function startTones(task,hw){
   if(!task.tones)return {status:'unchanged',count:0};
   if(!isPerformance(hw))return {status:'blocked',message:'Performance não confirmada no Roland.'};
   if(typeof sendTones!=='function')return {status:'unsupported'};
   const plans=Object.entries(task.tones.levels).map(([tone,value])=>({
    part:task.tones.part,tone:Number(tone),value}));
   // The injected implementation must validate channel exclusivity for ALL
   // proposed tone CCs before sending any. Native also rechecks each send.
   sendTones(plans,hw);
   return {status:'tones-requested',count:plans.length};
  }
  function receive(kind,data,hw,currentTitle){
   if(!pending)return null;
   if(currentTitle!==pending.title){pending=null;return {status:'cancelled'};}
   if(kind==='xpsConnection'&&!data){pending=null;return {status:'disconnected'};}
   if(kind==='hardwareReset'){pending=null;return {status:'reset'};}
   if(kind==='performanceSelected'&&pending.phase==='select'){
    if(data&&data.index===pending.number&&!!data.user===(pending.type==='user'))pending.ack=true;
    return null;
   }
   if(kind==='hardwareBusy'&&data===true&&pending.ack){
    pending.busyAfterAck=true;return null;
   }
   if(kind!=='hardware'||!pending.ack||!pending.busyAfterAck)return null;
   const task=pending;
   if(!hw||!Number.isFinite(hw.readAt)||hw.readAt<task.started){
    pending=null;return {status:'stale'};
   }
   try{
    if(task.phase==='await-part-readback'){
     pending=null;
     const remaining=diff(hw,task.parts);
     if(remaining.length)return {status:'blocked',message:'Alterações das partes não confirmadas. Tons não enviados.'};
     return startTones(task,hw);
    }
    const commands=task.parts.length?diff(hw,task.parts):[];
    if(commands.length){
     if(typeof sendEdits!=='function'){pending=null;return {status:'unsupported'};}
     task.phase='await-part-readback';
     task.busyAfterAck=false;
     sendEdits(commands);
     return {status:'parts-requested',count:commands.length};
    }
    pending=null;
    return startTones(task,hw);
   }catch(e){pending=null;return {status:'blocked',message:e.message};}
  }
  return {prepare,receive,cancel:()=>{pending=null;},isPending:()=>!!pending};
 }
 const api={PARAMETERS,cleanParts,cleanTonePreset,isPerformance,capture,diff,suggest,createRunner};
 if(scope)scope.GraueSetupBrain=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
