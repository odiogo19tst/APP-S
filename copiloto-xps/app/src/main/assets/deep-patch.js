'use strict';
(function(scope){
 const defs=scope?.GrauePatchParameters||(typeof require==='function'?require('./patch-parameters.js'):[]),byId=new Map(defs.map(d=>[d.id,d]));
 const allowed=(d,v)=>Number.isInteger(v)&&v>=d.min&&v<=d.max&&(!d.allowed||d.allowed.includes(v))&&(!d.excluded||!d.excluded.includes(v));
 function decode(d,bytes){if(!Array.isArray(bytes)||d.offset+d.width>bytes.length)throw Error('Leitura incompleta');let v=0;for(let i=0;i<d.width;i++){const b=bytes[d.offset+i];if(!Number.isInteger(b)||b<0||b>(d.width===1?127:15))throw Error('Bytes inválidos');v=d.width===1?b:(v<<4)|b;}if(!allowed(d,v))throw Error('Valor não documentado');return v;}
 const bytesFor=(state,d,tone)=>state?.[d.section==='tone'?'tone'+tone:d.section];
 function prepare(state,operations,part){
  if(!state?.ready||state.source!=='midi-live'||state.part!==part||!Number.isInteger(state.revision))throw Error('Leia o Patch real da parte selecionada.');
  if(!Array.isArray(operations)||!operations.length||operations.length>64)throw Error('Proposta interna inválida.');
  const seen=new Set(),validated=[];
  for(const op of operations){
   if(!op||Object.keys(op).sort().join(',')!=='field,tone,value')throw Error('Campos internos não autorizados.');
   const d=byId.get(op.field);if(!d||!Number.isInteger(op.tone)||op.tone<1||op.tone>4||!allowed(d,op.value))throw Error('Parâmetro ou valor fora do mapa original.');
   const key=d.section+':'+(d.section==='tone'?op.tone:0)+':'+d.offset;if(seen.has(key))throw Error('Parâmetro duplicado.');seen.add(key);
   const before=decode(d,bytesFor(state,d,op.tone));if(before!==op.value)validated.push({...op});
  }
  const tmt=state.tmt?.slice();
  for(const op of validated){const d=byId.get(op.field);if(d.section==='tmt')tmt[d.offset]=op.value;}
  if(tmt)for(let tone=0;tone<4;tone++)for(const low of [6+9*tone,10+9*tone])if(tmt[low]>tmt[low+1])throw Error('Faixa inicial maior que a final.');
  if(!validated.length)throw Error('Os valores já correspondem à leitura.');
  return {part,revision:state.revision,operations:validated};
 }
 function create(transport){
  let state=null,connected=false,busy=false,part=0,tone=1,group='TVA',host=null,draft=new Map(),invalid=new Set(),lastRevision=-1;
  const mk=(tag,text)=>{const n=host.ownerDocument.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
  function render(container,nextGroup,nextPart){host=container;group=nextGroup;part=nextPart;if(!host||group==='MFX')return;
   const area=mk('section');area.className='gx-deep-editor';
   const header=mk('div');header.className='gx-deep-toolbar';header.append(mk('h4','Parâmetros internos · XPS-10'));
   const read=mk('button','Ler Patch completo desta parte');read.type='button';read.disabled=!connected||busy;read.onclick=()=>transport.readDeep?.(part);
   const undo=mk('button','Desfazer última edição interna');undo.type='button';undo.disabled=!connected||busy||!state?.ready||state.part!==part;undo.onclick=()=>transport.undoDeep?.();header.append(read,undo);
   const pick=mk('select');pick.setAttribute('aria-label','Tone interno selecionado');for(let i=1;i<=4;i++){const o=mk('option','Tone '+i);o.value=String(i);pick.append(o);}pick.value=String(tone);pick.onchange=()=>{tone=Number(pick.value);refresh();};header.append(pick);area.append(header);
   const ready=connected&&!busy&&state?.ready&&state.part===part;
   const info=mk('p',ready?'Leitura real recebida. Alterações são temporárias e confirmadas por releitura.':'Conecte, leia a Performance e toque Ler Patch completo. Nenhum valor é presumido.');info.className='gx-deep-info';area.append(info);
   const grid=mk('div');grid.className='gx-deep-grid';
   const fields=defs.filter(d=>d.group===group);
   for(const d of fields){
    const label=mk('label',d.label);let value=null;try{if(ready)value=decode(d,bytesFor(state,d,tone));}catch(_){}
    const key=d.id+':'+(d.section==='tone'?tone:1),pending=draft.get(key),current=pending?.value??value;
    const input=mk(d.choices||d.allowed?'select':'input');input.setAttribute('aria-label',d.label+(d.section==='tone'?' Tone '+tone:''));
    if(d.choices||d.allowed){const unknown=mk('option','— sem leitura —');unknown.value='';input.append(unknown);for(let n=d.min;n<=d.max;n++)if(allowed(d,n)){const o=mk('option',d.choices?.[n]||String(n));o.value=String(n);input.append(o);}input.value=current===null?'':String(current);}
    else{input.type='number';input.min=String(d.min);input.max=String(d.max);input.step='1';input.value=current===null?'':String(current);}
    input.disabled=value===null;
    const hint=mk('small',d.center?'MIDI '+d.min+'–'+d.max+' · neutro '+d.center:'MIDI '+d.min+'–'+d.max);label.append(input,hint);
    input.onchange=()=>{const v=Number(input.value);if(input.value===''||!allowed(d,v)){invalid.add(key);status.textContent='Valor inválido: '+d.label;apply.disabled=true;return;}invalid.delete(key);if(v===value)draft.delete(key);else draft.set(key,{field:d.id,tone:d.section==='tone'?tone:1,value:v});review();};
    grid.append(label);
   }
   area.append(grid);
   const status=mk('p');status.className='gx-deep-review';status.setAttribute('role','status');
   const apply=mk('button','Aplicar alterações temporárias');apply.type='button';apply.disabled=true;
   const review=()=>{status.textContent=[...draft.values()].map(op=>byId.get(op.field).label+' (Tone '+op.tone+') → MIDI '+op.value).join('; ')||'Nenhuma alteração preparada.';apply.disabled=!ready||!draft.size||invalid.size>0;};
   apply.onclick=()=>{try{const request=prepare(state,[...draft.values()],part);transport.editDeep?.(request);draft.clear();apply.disabled=true;status.textContent='Comandos solicitados. Aguarde a confirmação SysEx do Roland.';}catch(e){status.textContent=e.message;}};
   review();area.append(status,apply,mk('small','Valores numéricos são os valores MIDI originais. IDs de Wave selecionam ondas já existentes no teclado. Não grava memória USER.'));
   host.append(area);
  }
  function refresh(){if(!host)return;const old=host.querySelector?.('.gx-deep-editor');if(old)old.remove();render(host,group,part);}
  function receive(kind,data){if(kind==='xpsConnection'){connected=!!data;if(!connected){state=null;draft.clear();}}if(kind==='hardwareReset'){state=null;draft.clear();}if(kind==='hardwareBusy')busy=!!data;
   if(kind==='deepPatch'){if(data?.revision!==lastRevision){draft.clear();invalid.clear();lastRevision=data?.revision;}state=data;}
   if(['xpsConnection','hardwareReset','hardwareBusy','deepPatch'].includes(kind))refresh();
  }
  function context(){if(!state?.ready||state.part!==part)return '';return 'Editor interno: kind=patch, part='+part+', tone='+tone+'. Campos válidos (valores MIDI): '+defs.filter(d=>d.group===group).slice(0,14).map(d=>{let v='?';try{v=decode(d,bytesFor(state,d,tone));}catch(_){}return d.id+' ['+d.min+'..'+d.max+'] atual='+v;}).join('; ');}
  return {render,receive,context,prepare:ops=>prepare(state,ops,part),state:()=>state,tone:()=>tone};
 }
 const api={defs,decode,prepare,create};if(typeof module!=='undefined')module.exports=api;if(scope)scope.GraueDeepPatch=api;
})(typeof window!=='undefined'?window:null);
