'use strict';
(function(scope){
 const partOffsets=[7,17,18,19,20,32,33],setupOffsets=[10,11,12,13,14,18,19];
 const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
 const copy=x=>JSON.parse(JSON.stringify(x));
 function ready(hw){return !!hw&&Array.isArray(hw['setup:0'])&&hw['setup:0'][0]===1&&Number(hw.validSysexPackets)>0;}
 function fingerprint(hw){if(!ready(hw))throw Error('Leia o XPS-10 em modo Performance.');const s=hw['setup:0'];if(![1,2,3].every(k=>integer(s[k],0,127)))throw Error('Identidade da Performance não recebida.');const common=hw['common:0'];if(!Array.isArray(common)||common.length<12)throw Error('Nome da Performance não recebido.');return s.slice(1,4).join(':')+':'+common.slice(0,12).join(',');}

 // Roland XPS-10 MIDI Implementation e01 pp.11–12. Reserved bytes excluded.
 const systemFields=[];
 const addSystem=(section,offset,label,min,max,group,extra={})=>systemFields.push({section,index:0,offset,label,min,max,group,...extra});
 const onOff=['Desligado','Ligado'];
 addSystem('masterTune',0,'Afinação geral (cents)',-100,100,'Som geral',{step:0.1,scale:10,bias:1024});
 addSystem('system',4,'Transposição geral (semitons)',-24,24,'Som geral',{bias:64});
 addSystem('system',5,'Volume geral',0,127,'Som geral');
 addSystem('system',6,'Microafinação ativa',0,1,'Som geral',{options:onOff});
 addSystem('system',7,'Manter som na troca (Patch Remain)',0,1,'Som geral',{options:onOff});
 addSystem('systemController',2,'Velocidade fixa (0 = toque real)',0,127,'Teclas e pedal');
 addSystem('systemController',3,'Curva de resposta das teclas',1,3,'Teclas e pedal',{options:['Leve','Média','Pesada']});
 addSystem('systemController',5,'Polaridade do pedal',0,1,'Teclas e pedal',{options:['Padrão','Invertida']});
 addSystem('systemController',6,'Meio pedal contínuo',0,1,'Teclas e pedal',{options:onOff});
 addSystem('systemController',7,'Função do pedal',0,24,'Teclas e pedal',{options:['Modulação','Tempo portamento','Volume','Pan','Expressão','Sustain','Portamento','Sostenuto','Ressonância','Release','Attack','Cutoff','Decay','Velocidade vibrato','Profundidade vibrato','Atraso vibrato','Chorus send','Reverb send','Aftertouch','Start/Stop','Tap tempo','Programa +','Programa −','Favorito +','Favorito −']});
 addSystem('system',9,'Canal de controle da Performance',0,16,'MIDI',{options:[...Array.from({length:16},(_,i)=>'Canal '+(i+1)),'Desligado']});
 addSystem('system',10,'Canal Rx/Tx no modo Patch',1,16,'MIDI',{bias:-1});
 for(const [section,offset,label] of [['system',28,'Receber Program Change'],['system',29,'Receber Bank Select'],['systemController',0,'Transmitir Program Change'],['systemController',1,'Transmitir Bank Select']])addSystem(section,offset,label,0,1,'MIDI',{options:onOff});
 for(let i=0;i<4;i++)addSystem('system',24+i,'Fonte System Control '+(i+1)+' (código MIDI)',0,97,'MIDI');
 for(const [i,note] of ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].entries())addSystem('system',12+i,'Afinação de '+note+' (cents)',-64,63,'Microafinação por nota',{bias:64});
 // XPS-10 MIDI Implementation e01, Performance Part, pp.15–16.
 const partFields=[];
 const addPart=(offset,label,min,max,group,extra={})=>partFields.push({section:'part',offset,label,min,max,group,...extra});
 addPart(8,'Panorama',-64,63,'Som',{bias:64});
 addPart(9,'Afinação em semitons',-48,48,'Som',{bias:64});
 addPart(10,'Afinação fina (cents)',-50,50,'Som',{bias:64});
 addPart(11,'Modo de execução',0,2,'Execução',{options:['Mono','Poly','Do timbre']});
 addPart(12,'Legato',0,2,'Execução',{options:['Desligado','Ligado','Do timbre']});
 addPart(13,'Alcance do pitch bend',0,25,'Execução',{options:[...Array.from({length:25},(_,i)=>i+' semitons'),'Do timbre']});
 addPart(14,'Portamento',0,2,'Execução',{options:['Desligado','Ligado','Do timbre']});
 partFields.push({section:'partPortamento',offset:15,label:'Tempo do portamento',min:0,max:128,group:'Execução',hint:'0–127; 128 = usar o valor do timbre'});
 for(const [offset,label] of [[17,'Brilho / filtro'],[18,'Ressonância'],[19,'Ataque'],[20,'Release'],[33,'Decay'],[34,'Velocidade do vibrato'],[35,'Profundidade do vibrato'],[36,'Atraso do vibrato']])addPart(offset,label,-64,63,'Expressão',{bias:64});
 addPart(21,'Oitava',-3,3,'Som',{bias:64});
 addPart(22,'Sensibilidade à intensidade',-63,63,'Execução',{bias:64});
 addPart(27,'Silenciar parte',0,1,'Som',{options:onOff});
 for(const [offset,label] of [[28,'Sinal direto'],[29,'Envio ao chorus'],[30,'Envio ao reverb']])addPart(offset,label,0,127,'Efeitos');
 addPart(32,'Unidade MFX',0,2,'Efeitos',{options:['MFX 1','MFX 2','MFX 3']});
 for(const [i,note] of ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].entries())addPart(37+i,'Afinação de '+note+' (cents)',-64,63,'Microafinação desta parte',{bias:64});
 function partValue(hw,e){const p=hw?.['part:'+e.index];if(e.section!=='partPortamento')return p?.[e.offset];const v=p?.slice(15,17);if(!v||v.length!==2||!v.every(n=>integer(n,0,15)))return undefined;const raw=v[0]*16+v[1];return integer(raw,0,128)?raw:undefined;}
 function partCommand(section,index,offset,value){const f=partFields.find(f=>f.section===section&&f.offset===offset);if(!f||!integer(index,0,15)||!integer(value,f.min+(f.bias||0),f.max+(f.bias||0)))throw Error('Parâmetro da parte fora da faixa documentada.');return {section,index,offset,value};}
 function partRaw(f,display){if(display===''||!Number.isFinite(Number(display)))throw Error('Preencha '+f.label+'.');return partCommand(f.section,0,f.offset,Number(display)+(f.bias||0)).value;}
 function partKnown(hw,e){const f=partFields.find(f=>f.section===e.section&&f.offset===e.offset),v=partValue(hw,e);return f&&integer(v,f.min+(f.bias||0),f.max+(f.bias||0));}
 const isGlobal=e=>['system','systemController','masterTune'].includes(e.section);
 function globalReady(hw){return !!hw&&Number(hw.validSysexPackets)>0;}
 function systemCommand(section,index,offset,value){const f=systemFields.find(f=>f.section===section&&f.index===index&&f.offset===offset);const rawMin=f?f.min*(f.scale||1)+(f.bias||0):0,rawMax=f?f.max*(f.scale||1)+(f.bias||0):0;if(!f||!integer(value,rawMin,rawMax))throw Error('Parâmetro global fora da faixa documentada.');return {section,index,offset,value};}
 function systemValue(hw,e){if(e.section==='masterTune'){const v=hw?.['system:0']?.slice(0,4);if(!v||v.length!==4||!v.every(n=>integer(n,0,15)))return undefined;const raw=v.reduce((sum,n)=>sum*16+n,0);return integer(raw,24,2024)?raw:undefined;}return hw?.[e.section+':'+e.index]?.[e.offset];}
 function toRaw(f,display){if(display===''||!Number.isFinite(Number(display)))throw Error('Preencha '+f.label+'.');const n=Number(display)*(f.scale||1)+(f.bias||0),raw=Math.round(n);if(Math.abs(n-raw)>1e-7)throw Error('Use o passo indicado para '+f.label+'.');return systemCommand(f.section,0,f.offset,raw).value;}
 function pendingBatch(edits){return edits.slice(0,128);}
 function canApply(edits,hw){return edits.length>0&&edits.every(e=>isGlobal(e)?globalReady(hw)&&Number.isInteger(systemValue(hw,e)):ready(hw)&&(e.section==='partPortamento'||partFields.some(f=>f.section===e.section&&f.offset===e.offset)?partKnown(hw,e):Number.isInteger(hw?.[e.section+':'+e.index]?.[e.offset])));}
 function editSource(edits,hw){return edits.every(isGlobal)?'system':fingerprint(hw);}
 function editsMatch(edits,hw){return edits.every(e=>(isGlobal(e)?systemValue(hw,e):e.section==='partPortamento'?partValue(hw,e):hw?.[e.section+':'+e.index]?.[e.offset])===e.value);}

 function command(section,index,offset,value){
  if(isGlobal({section}))return systemCommand(section,index,offset,value);
  if(section==='partPortamento'||section==='part'&&partFields.some(f=>f.offset===offset))return partCommand(section,index,offset,value);
  if(section==='part'&&integer(index,0,15)&&partOffsets.includes(offset)&&integer(value,0,offset===32?2:127))return {section,index,offset,value};
  if(section==='setup'&&index===0&&setupOffsets.includes(offset)&&integer(value,offset===18?59:offset===19?61:0,offset===18?70:offset===19?67:1))return {section,index,offset,value};
  throw Error('Ajuste fora dos parâmetros suportados.');
 }
 function capture(hw,name,songId){
  const source=fingerprint(hw);name=String(name||'').trim().slice(0,40);if(!name)throw Error('Dê um nome à cena.');
  const edits=[];for(let index=0;index<16;index++){const p=hw['part:'+index];if(!Array.isArray(p))continue;for(const offset of partOffsets){try{edits.push(command('part',index,offset,p[offset]));}catch(_){/* Skip parameters that have not been validated. */}}}
  for(const offset of setupOffsets){try{edits.push(command('setup',0,offset,hw['setup:0'][offset]));}catch(_){/* Unread bytes cannot be captured. */}}
  if(!edits.length)throw Error('Não há parâmetros validados para salvar. Leia a Performance pelo USB e tente novamente.');
  return {name,songId:String(songId||'').slice(0,160),source,edits};
 }
 function scene(raw){if(!raw||typeof raw.name!=='string'||!raw.name.trim()||typeof raw.source!=='string'||!Array.isArray(raw.edits)||raw.edits.length<1||raw.edits.length>119)throw Error('Cena inválida.');
  if(raw.edits.some(e=>!((e.section==='part'&&partOffsets.includes(e.offset))||(e.section==='setup'&&e.index===0&&setupOffsets.includes(e.offset)))))throw Error('A cena contém parâmetros externos à Performance.');
  const edits=raw.edits.map(e=>command(e.section,e.index,e.offset,e.value)),keys=new Set(edits.map(e=>[e.section,e.index,e.offset].join(':')));if(keys.size!==edits.length)throw Error('Cena com parâmetros repetidos.');return {...raw,name:raw.name.slice(0,40),edits};
 }
 function prepare(raw,hw){const s=scene(raw);if(s.source!==fingerprint(hw))throw Error('Esta cena pertence a outra Performance. Carregue a Performance original e leia o teclado.');return copy(s.edits);}
 function emptyPattern(){const names=['Piano','Pad','Baixo','Arpejo','Bumbo','Caixa','Chimbal','Percussão'];return {bpm:72,steps:16,tracks:names.map((name,i)=>({name,channel:i<4?i+1:10,gate:i===1?8:i===0?4:1,note:[60,60,36,64,36,38,42,46][i],velocity:100,notes:Array(64).fill([60,60,36,64,36,38,42,46][i]),velocities:Array(64).fill(0)}))};}
 function pattern(raw){if(!raw||!integer(raw.bpm,40,240)||![16,32,64].includes(raw.steps)||!Array.isArray(raw.tracks)||raw.tracks.length!==8)throw Error('Padrão inválido.');
  const tracks=raw.tracks.map((t,i)=>{if(!t||!integer(t.channel,1,16)||!integer(t.gate,1,16)||!integer(t.note,0,127)||!integer(t.velocity,1,127)||!Array.isArray(t.notes)||!Array.isArray(t.velocities)||t.notes.length!==64||t.velocities.length!==64||!t.notes.every(n=>integer(n,0,127))||!t.velocities.every(n=>integer(n,0,127)))throw Error('Pista inválida.');return {...copy(t),name:String(t.name||'Pista '+(i+1)).slice(0,24)};});return {bpm:raw.bpm,steps:raw.steps,tracks};
 }
 function payload(raw){const p=pattern(raw);return {...p,tracks:p.tracks.map(t=>({channel:t.channel,gate:t.gate,notes:t.notes.slice(0,p.steps),velocities:t.velocities.slice(0,p.steps)}))};}
 const api={pendingBatch,partFields,partValue,partRaw,partKnown,systemFields,isGlobal,globalReady,systemValue,toRaw,canApply,editSource,editsMatch,ready,fingerprint,command,capture,scene,prepare,emptyPattern,pattern,payload};if(typeof module!=='undefined')module.exports=api;if(scope)scope.GraueControlCenterModel=api;
})(typeof window!=='undefined'?window:null);
