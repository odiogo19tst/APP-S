'use strict';
/* Graue Synthesis Lab — observe real Roland SysEx, never guess unknown Patch offsets.
 * Supported operations: verified Performance-part SysEx, safe four-tone CC80..83
 * and documented CC vibrato. AI replies are untrusted JSON suggestions only.
 */
(function(scope){
 const GROUPS=Object.freeze({
  PCH:{title:'Patch Common',desc:'Identificação e organização do Patch a partir da leitura recebida. Alterações profundas aguardam mapeamento.'},
  WG:{title:'Wave Generator',desc:'Ondas L/R, FXM, afinação e Pitch Envelope: observar alterações SysEx no teclado; escrita não autorizada sem mapa verificado.'},
  TVA:{title:'Amplificador',desc:'Níveis independentes de Tone 1–4 por CC80–83. Envelopes e BIAS ainda aguardam endereços confirmados.'},
  TVF:{title:'Filtro',desc:'Ajustes temporários de cutoff e ressonância da Performance. NÃO representam parâmetros internos de cada Tone.'},
  'Vel/Key':{title:'Velocity / Key Range',desc:'Zonas por canal da Performance observadas. O mapa de velocidade e teclado por Tone continua em validação.'},
  LFO:{title:'LFO / Vibrato',desc:'Vibrato global por parte através dos CC76–78 documentados. LFO1/LFO2 internos ainda exigem SysEx.'},
  MTX:{title:'Matrix Control',desc:'Fontes e destinos da matriz dos Tones exigem o mapa original. Captura observações sem escrever em endereços inferidos.'},
  Ctrl:{title:'Recepção e modulação',desc:'Sustain, Expression, Redamper e Pitch Bend variam por Tone. Recepção individual será liberada após validação do SysEx.'},
  MFX:{title:'Efeitos e roteamento',desc:'O editor de MFX, Chorus e Reverb já existe no Grauê. Abra o editor avançado para usar parâmetros validados.'}
 });
 function createProbe(){
  const map=new Map();let before=null;let after=null;let count=0;let events=[];
  function ingest(packet){
   if(!packet||packet.source!=='roland-dt1-checksum-valid'||!Number.isInteger(packet.address)||packet.address<0||
      !Array.isArray(packet.values)||packet.values.length<1||packet.values.length>32||
      packet.values.some(x=>!Number.isInteger(x)||x<0||x>127))return false;
   const msb=(packet.address>>>21)&127;
   if(msb<0x11||msb>0x1f)return false;
   for(let i=0;i<packet.values.length;i++)map.set(packet.address+i,packet.values[i]);
   count++;events=[{hex:String(packet.hex||''),bytes:packet.values.length,count},...events].slice(0,12);
   return true;
  }
  function snapshot(){return new Map(map);}
  function markBefore(){before=snapshot();after=null;return before.size;}
  function markAfter(){after=snapshot();return before?compare():[];}
  function compare(){
   if(!before||!after)return [];
   const diffs=[];
   for(const [address,value] of after.entries()){
    if(!before.has(address)||before.get(address)===value)continue;
    const d=[(address>>>21)&127,(address>>>14)&127,(address>>>7)&127,address&127];
    diffs.push({hex:d.map(n=>n.toString(16).padStart(2,'0').toUpperCase()).join(' '),before:before.get(address),after:value});
   }
   return diffs.sort((a,b)=>a.hex.localeCompare(b.hex)).slice(0,128);
  }
  function reset(){map.clear();before=null;after=null;events=[];count=0;}
  return {ingest,markBefore,markAfter,compare,snapshot,reset,events:()=>events.slice(),state:()=>({count,observed:map.size,baseline:before?.size||0,differences:compare().length})};
 }
 function parsePlan(reply,hw,connected,busy,brain,patch){
  if(typeof reply!=='string'||reply.length>5000)throw Error('Resposta da IA inválida ou longa demais.');
  const cleaned=reply.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
  let data;try{data=JSON.parse(cleaned);}catch(_){throw Error('A IA não devolveu JSON válido. Nenhum comando será enviado.');}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.operations)||
      data.operations.length<1||data.operations.length>6)throw Error('A IA não propôs operações válidas (1–6).');
  if(!connected||busy)throw Error('Conecte o teclado e aguarde a leitura terminar.');
  const partial=new Map(),toneEdits=[],unique=new Set();
  for(const op of data.operations){
   if(!op||typeof op!=='object'||Array.isArray(op)||!Number.isInteger(op.part)||op.part<0||op.part>=16)
    throw Error('A IA propôs uma parte inválida.');
   const allowedKeys=op.kind==='part'?['kind','part','field','value']:op.kind==='tone'?['kind','part','tone','level']:[];
   if(Object.keys(op).some(k=>!allowedKeys.includes(k)))throw Error('A IA incluiu campos não autorizados na proposta.');
   if(op.kind==='part'){
    if(typeof op.field!=='string'||!Object.prototype.hasOwnProperty.call(brain.PARAMETERS,op.field))
      throw Error('A IA tentou usar um parâmetro desconhecido.');
    const def=brain.PARAMETERS[op.field];
    if(!Number.isInteger(op.value)||op.value<def.min||op.value>def.max)
      throw Error('Valor de parte fora dos limites do XPS-10.');
    const key='p:'+op.part+':'+def.offset;
    if(unique.has(key))throw Error('Parâmetro duplicado na proposta da IA.');
    unique.add(key);
    if(!partial.has(op.part))partial.set(op.part,{part:op.part,values:{}});
    partial.get(op.part).values[def.offset]=op.value;
   }else if(op.kind==='tone'){
    const c=patch.command(hw,op.part,op.tone,op.level,connected,busy);
    const key='t:'+op.part+':'+op.tone;
    if(unique.has(key))throw Error('Tone duplicado na proposta da IA.');
    unique.add(key);toneEdits.push(c);
   }else throw Error('A IA propôs uma operação não permitida.');
  }
  if(partial.size&&toneEdits.length)throw Error('Divida a proposta em ajustes de Performance e de Tone; a execução mista exige releitura intermediária.');
  if(toneEdits.length>1)throw Error('Faça um Tone de cada vez para conferir o som antes de continuar.');
  const partEdits=partial.size?brain.diff(hw,[...partial.values()]):[];
  if(!partEdits.length&&!toneEdits.length)throw Error('O estado atual já corresponde à proposta.');
  return {partEdits,toneEdits,description:partEdits.length+' parâmetro(s) de Performance e '+toneEdits.length+' de Tone',observedAt:hw.readAt||0};
 }
 function build(container,transport){
  if(!container)return null;
  const doc=container.ownerDocument;
  const mk=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const original=[...container.children],brain=scope.GraueSetupBrain,patch=scope.GrauePatchFourTones;
  let hw={},connected=false,busy=false,liveSeen=false,observing=false,group='TVA',part=0,awaiting=false,proposal='',prepared=null;
  const probe=createProbe();
  const tabs=mk('nav','gx-synth-tabs');tabs.setAttribute('aria-label','Módulos internos do Patch');
  for(const key of Object.keys(GROUPS)){
   const b=mk('button',null,key);b.type='button';b.dataset.synthGroup=key;
   b.onclick=()=>{group=key;render();};tabs.append(b);
  }
  const selection=mk('label','gx-synth-part-select','Parte analisada');
  const partSelect=mk('select');partSelect.setAttribute('aria-label','Parte a preparar no laboratório de síntese');
  for(let i=0;i<16;i++){const op=mk('option',null,'Parte '+(i+1));op.value=String(i);partSelect.append(op);}
  partSelect.onchange=()=>{
   part=Number(partSelect.value);
   const other=doc.querySelector?.('#gx-patch-four-tones select[aria-label="Parte de Performance dos quatro tones"]');
   if(other){other.value=String(part);other.onchange?.();}
   render();
  };
  selection.append(partSelect);
  const detail=mk('section','gx-synth-detail'),probePanel=mk('details','gx-synth-capture');
  const captureSummary=mk('summary',null,'Diagnóstico SysEx · descobrir parâmetros com o Roland');
  const lead=mk('p',null,'Somente captura de mensagens DT1 válidas enviadas pelo XPS-10. Para comparar, observe um valor, marque “Antes”, mude apenas um controle no teclado, e marque “Depois”. Sem leitura anterior do mesmo endereço, não há diferença demonstrável.');
  const captureActions=mk('div','gx-synth-actions');
  const start=mk('button',null,'Iniciar observação'),stop=mk('button',null,'Parar observação');
  const before=mk('button',null,'Marcar antes'),after=mk('button',null,'Marcar depois');
  start.type=stop.type=before.type=after.type='button';
  start.onclick=()=>{if(!connected){observation.textContent='Conecte o Roland antes da captura.';return;}transport.observe?.(true);};
  stop.onclick=()=>transport.observe?.(false);
  before.onclick=()=>{probe.markBefore();renderProbe();};
  after.onclick=()=>{probe.markAfter();renderProbe();};
  captureActions.append(start,stop,before,after);
  const observation=mk('p','gx-synth-observe-state','Observação desligada');
  const raw=mk('textarea','gx-synth-raw');raw.rows=6;raw.readOnly=true;raw.setAttribute('aria-label','Diferenças SysEx observadas');
  probePanel.append(captureSummary,lead,captureActions,observation,raw);
  const ai=mk('section','gx-synth-ai');
  const aiTitle=mk('h3',null,'Jarvis · planejar ajustes no XPS-10');
  const aiInfo=mk('p',null,'Gemma offline propõe JSON. O motor do Grauê valida cada comando e só o envia após você aprovar. Sem emissão direta de SysEx pela IA.');
  const aiRequest=mk('textarea');aiRequest.rows=2;aiRequest.maxLength=260;aiRequest.placeholder='Ex.: deixe o pad da parte 1 mais suave';
  const ask=mk('button',null,'Pedir proposta à Gemma local'),apply=mk('button',null,'Aplicar proposta verificada');
  ask.type=apply.type='button';apply.disabled=true;
  const aiStatus=mk('p','gx-synth-ai-status','Nenhuma proposta recebida');
  ask.onclick=()=>{
   const q=aiRequest.value.trim();
   if(!q){aiStatus.textContent='Descreva a mudança musical desejada.';return;}
   if(!transport.plan){aiStatus.textContent='Ponte Gemma indisponível no APK.';return;}
   awaiting=true;proposal='';prepared=null;apply.disabled=true;ask.disabled=true;
   const snapshot=hw['part:'+part];
   const context='Parte '+part+' (zero-based), modo Performance. Valores observados: '+
     (Array.isArray(snapshot)?Object.entries(brain.PARAMETERS).map(([k,d])=>k+'='+snapshot[d.offset]).join(', '):'não lidos')+
     '. Pedido: '+q.slice(0,260);
   transport.plan(context);
   aiStatus.textContent='Consultando modelo local; nenhum MIDI será enviado sem aprovação…';
  };
  apply.onclick=()=>{
   if(!prepared||!proposal){aiStatus.textContent='Nenhuma proposta validada.';return;}
   try{
    if(hw.readAt!==prepared.observedAt)throw Error('Estado MIDI mudou. Peça outra proposta antes de aplicar.');
    const now=parsePlan(proposal,hw,connected&&liveSeen,busy,brain,patch);
    if(now.partEdits.length){transport.edit?.(now.partEdits);aiStatus.textContent='Edição de Performance solicitada; aguarde SysEx de retorno.';}
    else if(now.toneEdits.length){const c=now.toneEdits[0];transport.tone?.(c);aiStatus.textContent='CC'+c.controller+' enviado; confirme o som no Roland.';}
    prepared=null;proposal='';apply.disabled=true;
   }catch(e){prepared=null;apply.disabled=true;aiStatus.textContent=e.message;}
  };
  ai.append(aiTitle,aiInfo,aiRequest,ask,aiStatus,apply);
  container.prepend(tabs,selection);container.append(detail,probePanel,ai);
  function renderProbe(){
   const state=probe.state();start.disabled=!connected||observing;stop.disabled=!observing;
   before.disabled=!state.observed;after.disabled=!state.baseline;
   observation.textContent=(observing?'Observando mensagens reais':'Observação desligada')+' · '+state.count+' pacotes · '+state.observed+' endereços observados · '+state.differences+' mudanças comparáveis';
   const differences=probe.compare();
   raw.value=differences.length?differences.map(d=>d.hex+' : '+d.before+' → '+d.after).join('\n'):
     probe.events().map(e=>e.hex+' · '+e.bytes+' bytes (sem comparação)').join('\n');
  }
  function render(){
   tabs.children.forEach(b=>b.classList.toggle('on',b.dataset.synthGroup===group));
   original.forEach(el=>{el.hidden=group!=='TVA';});
   detail.replaceChildren();
   if(group!=='TVA'){
    const entry=GROUPS[group];
    detail.append(mk('h3',null,entry.title),mk('p',null,entry.desc));
    if(group==='PCH'){
     const p=hw['patch:'+part];
     const name=Array.isArray(p)?p.slice(0,12).map(v=>v>=32&&v<=126?String.fromCharCode(v):' ').join('').trim():'';
     detail.append(mk('strong',null,name?'Patch lido: '+name:'Patch ainda sem nome confirmado pelo Roland'));
    }else if(group==='TVF'){
     detail.append(mk('h4',null,'Offsets de filtro da Performance'));
     const p=hw['part:'+part],row=mk('div','gx-synth-quick');
     for(const key of ['cutoff','resonance']){
      const def=brain.PARAMETERS[key],val=Array.isArray(p)?p[def.offset]:null;
      const label=mk('label',null,def.label);
      const input=mk('input');input.type='number';input.min='0';input.max='127';input.value=Number.isInteger(val)?String(val):'';input.placeholder='—';
      const button=mk('button',null,'Aplicar');button.disabled=!connected||!liveSeen||busy||!Number.isInteger(val);
      button.onclick=()=>{
       try{
        if(input.value===''||!/^[0-9]{1,3}$/.test(input.value))throw Error('Digite 0 a 127.');
        const ops=brain.diff(hw,[{part,values:{[def.offset]:Number(input.value)}}]);
        if(!ops.length){aiStatus.textContent='Valor já corresponde à leitura.';return;}
        transport.edit?.(ops);aiStatus.textContent=def.label+' enviado; aguarde retorno SysEx.';
       }catch(e){aiStatus.textContent=e.message;}
      };
      label.append(input,button);row.append(label);
     }
     detail.append(row);
    }else if(group==='Vel/Key'){
     const p=hw['part:'+part],chan=Array.isArray(p)?p[0]:null,zone=hw['zone:'+chan];
     if(Array.isArray(zone)&&zone.length>=14)
       detail.append(mk('p',null,'Zona da Performance (não do Tone): '+zone[12]+' até '+zone[13]+' · '+(zone[1]?'ativa':'inativa')));
     else detail.append(mk('p',null,'Zona não lida. Não será inventada.'));
    }else if(group==='MFX'){
     const b=mk('button',null,'Abrir Editor avançado de efeitos');b.onclick=()=>doc.getElementById('gx-advanced')?.click();detail.append(b);
    }else if(group==='LFO'){
     detail.append(mk('p',null,'Vibrato por parte (CC76–78) pode ser controlado no módulo de Performance; edição de LFO1/LFO2 do Tone aguarda confirmação do mapa SysEx.'));
    }
   }
   renderProbe();
  }
  function receive(kind,data){
   if(kind==='xpsConnection'){connected=!!data;if(!connected){hw={};liveSeen=false;observing=false;probe.reset();prepared=null;apply.disabled=true;}render();}
   if(kind==='hardwareReset'){hw={};liveSeen=false;observing=false;probe.reset();prepared=null;apply.disabled=true;render();}
   if(kind==='hardwareBusy'){busy=!!data;render();}
   if(kind==='hardware'){hw=data||{};liveSeen=connected&&Number(hw.validSysexPackets)>0;render();}
   if(kind==='patchObserveState'){observing=!!data;renderProbe();}
   if(kind==='patchProbe'){if(probe.ingest(data))renderProbe();}
   if(kind==='patchPlanAnswer'&&awaiting){
    awaiting=false;ask.disabled=false;proposal=String(data||'');prepared=null;
    try{
     prepared=parsePlan(proposal,hw,connected&&liveSeen,busy,brain,patch);
     apply.disabled=false;
     const ops=JSON.parse(proposal.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'')).operations;
     const details=ops.map(o=>o.kind==='tone'
      ?'Parte '+(o.part+1)+' / Tone '+o.tone+' / TVA Level = '+o.level
      :'Parte '+(o.part+1)+' / '+o.field+' = '+o.value).join('; ');
     aiStatus.textContent='Proposta validada: '+details+'. '+prepared.description+'. Confira os valores antes de aplicar.';
    }catch(e){apply.disabled=true;aiStatus.textContent=e.message;}
   }
  }
  render();return {receive,getState:()=>({group,part,connected,liveSeen,observing}),probe};
 }
 const api={GROUPS,createProbe,parsePlan,build};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(scope){
  scope.GraueSynthesisLab=api;
  const target=scope.document?.getElementById('gx-patch-four-tones');
  if(target&&scope.GraueSetupBrain&&scope.GrauePatchFourTones){
   const transport={
    observe:enabled=>scope.Native?.observePatch?.(enabled),
    plan:text=>scope.Native?.planPatch?.(text),
    edit:commands=>scope.Native?.editHardware?.(JSON.stringify(commands)),
    tone:c=>scope.Native?.toneLevel?.(c.part,c.tone,c.value)
   };
   const instance=build(target,transport);
   const prev=scope.receive;
   scope.receive=(kind,data)=>{if(typeof prev==='function')prev(kind,data);instance.receive(kind,data);};
  }
 }
})(typeof window!=='undefined'?window:null);
