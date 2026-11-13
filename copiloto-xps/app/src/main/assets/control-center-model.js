'use strict';
(function(scope){
 const partOffsets=[7,17,18,19,20,32,33],setupOffsets=[10,11,12,13,14,18,19];
 const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 const copy=x=>JSON.parse(JSON.stringify(x));
 function ready(hw){return !!hw&&Array.isArray(hw['setup:0'])&&hw['setup:0'][0]===1&&Number(hw.validSysexPackets)>0;}
 function fingerprint(hw){if(!ready(hw))throw Error('Leia o XPS-10 em modo Performance.');const s=hw['setup:0'];if(![1,2,3].every(k=>integer(s[k],0,127)))throw Error('Identidade da Performance não recebida.');const common=hw['common:0'];if(!Array.isArray(common)||common.length<12)throw Error('Nome da Performance não recebido.');return s.slice(1,4).join(':')+':'+common.slice(0,12).join(',');}
 function command(section,index,offset,value){
  if(section==='part'&&integer(index,0,15)&&partOffsets.includes(offset)&&integer(value,0,offset===32?2:127))return {section,index,offset,value};
  if(section==='setup'&&index===0&&setupOffsets.includes(offset)&&integer(value,offset===18?59:offset===19?61:0,offset===18?70:offset===19?67:1))return {section,index,offset,value};
  throw Error('Ajuste fora dos parâmetros suportados.');
 }
 function capture(hw,name,songId){
  const source=fingerprint(hw);name=String(name||'').trim().slice(0,40);if(!name)throw Error('Dê um nome à cena.');
  const edits=[];for(let index=0;index<16;index++){const p=hw['part:'+index];if(!Array.isArray(p))throw Error('Leia todas as 16 partes antes de guardar a cena.');for(const offset of partOffsets)edits.push(command('part',index,offset,p[offset]));}
  for(const offset of setupOffsets)edits.push(command('setup',0,offset,hw['setup:0'][offset]));
  return {name,songId:String(songId||'').slice(0,160),source,edits};
 }
 function scene(raw){if(!raw||typeof raw.name!=='string'||!raw.name.trim()||typeof raw.source!=='string'||!Array.isArray(raw.edits)||raw.edits.length!==119)throw Error('Cena inválida.');
  const edits=raw.edits.map(e=>command(e.section,e.index,e.offset,e.value)),keys=new Set(edits.map(e=>[e.section,e.index,e.offset].join(':')));if(keys.size!==119)throw Error('Cena com parâmetros repetidos.');return {...raw,name:raw.name.slice(0,40),edits};
 }
 function prepare(raw,hw){const s=scene(raw);if(s.source!==fingerprint(hw))throw Error('Esta cena pertence a outra Performance. Carregue a Performance original e leia o teclado.');return copy(s.edits);}
 function emptyPattern(){const names=['Piano','Pad','Baixo','Arpejo','Bumbo','Caixa','Chimbal','Percussão'];return {bpm:72,steps:16,tracks:names.map((name,i)=>({name,channel:i<4?i+1:10,gate:i===1?8:i===0?4:1,note:[60,60,36,64,36,38,42,46][i],velocity:100,notes:Array(64).fill([60,60,36,64,36,38,42,46][i]),velocities:Array(64).fill(0)}))};}
 function pattern(raw){if(!raw||!integer(raw.bpm,40,240)||![16,32,64].includes(raw.steps)||!Array.isArray(raw.tracks)||raw.tracks.length!==8)throw Error('Padrão inválido.');
  const tracks=raw.tracks.map((t,i)=>{if(!t||!integer(t.channel,1,16)||!integer(t.gate,1,16)||!integer(t.note,0,127)||!integer(t.velocity,1,127)||!Array.isArray(t.notes)||!Array.isArray(t.velocities)||t.notes.length!==64||t.velocities.length!==64||!t.notes.every(n=>integer(n,0,127))||!t.velocities.every(n=>integer(n,0,127)))throw Error('Pista inválida.');return {...copy(t),name:String(t.name||'Pista '+(i+1)).slice(0,24)};});return {bpm:raw.bpm,steps:raw.steps,tracks};
 }
 function payload(raw){const p=pattern(raw);return {...p,tracks:p.tracks.map(t=>({channel:t.channel,gate:t.gate,notes:t.notes.slice(0,p.steps),velocities:t.velocities.slice(0,p.steps)}))};}
 const api={ready,fingerprint,command,capture,scene,prepare,emptyPattern,pattern,payload};if(typeof module!=='undefined')module.exports=api;if(scope)scope.GraueControlCenterModel=api;
})(typeof window!=='undefined'?window:null);
