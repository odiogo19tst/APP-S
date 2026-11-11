'use strict';
/* Graue Synthesis Lab — observe real Roland SysEx, never guess unknown Patch offsets.
 * Supported operations: verified Performance-part SysEx, safe four-tone CC80..83
 * and documented CC vibrato. AI replies are untrusted JSON suggestions only.
 */
(function(scope){
 const GROUPS=Object.freeze({
  PCH:{title:'Patch Common',desc:'Identificação e organização do Patch a partir da leitura recebida. Alterações profundas aguardam mapeamento.'},
  WG:{title:'Wave Generator',desc:'Ondas L/R, FXM, afinação e Pitch Envelope por Tone, conforme o mapa original. Leia o Patch para editar.'},
  TVA:{title:'Amplificador',desc:'Nível, pan, env. TVA e BIAS por Tone, com leitura e edição temporária SysEx.'},
  TVF:{title:'Filtro',desc:'Ajustes temporários de cutoff e ressonância da Performance. NÃO representam parâmetros internos de cada Tone.'},
  'Vel/Key':{title:'Velocity / Key Range',desc:'Zonas por canal da Performance observadas. O mapa de velocidade e teclado por Tone continua em validação.'},
  LFO:{title:'LFO / Vibrato',desc:'Vibrato global por parte através dos CC76–78 documentados. LFO1/LFO2 internos estão disponíveis abaixo após Ler Patch completo.'},
  MTX:{title:'Matrix Control',desc:'Quatro fontes e quatro destinos por fonte no Patch Common, com switches independentes nos Tones.'},
  Ctrl:{title:'Recepção e modulação',desc:'Sustain, Expression, Redamper e Pitch Bend variam por Tone. Recepção individual disponível abaixo após leitura do Patch.'},
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
 function parsePlan(reply,hw,connected,busy,brain,patch,deepState){
  if(typeof reply!=='string'||reply.length>5000)throw Error('Resposta da IA inválida ou longa demais.');
  const cleaned=reply.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'');
  let data;try{data=JSON.parse(cleaned);}catch(_){throw Error('A IA não devolveu JSON válido. Nenhum comando será enviado.');}
  if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.operations)||
      data.operations.length<1||data.operations.length>6)throw Error('A IA não propôs operações válidas (1–6).');
  if(!connected||busy)throw Error('Conecte o teclado e aguarde a leitura terminar.');
  const partial=new Map(),toneEdits=[],deepEdits=[],unique=new Set();
  for(const op of data.operations){
   if(!op||typeof op!=='object'||Array.isArray(op)||!Number.isInteger(op.part)||op.part<0||op.part>=16)
    throw Error('A IA propôs uma parte inválida.');
   const allowedKeys=op.kind==='part'?['kind','part','field','value']:op.kind==='tone'?['kind','part','tone','level']:op.kind==='patch'?['kind','part','tone','field','value']:[];
   if(Object.keys(op).some(k=>!allowedKeys.includes(k)))throw Error('A IA incluiu campos não autorizados na proposta.');
   if(op.kind==='patch'){deepEdits.push(op);continue;}
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
  let deepRequest=null;
  if(deepEdits.length){
   if(partial.size||toneEdits.length||deepEdits.some(o=>o.part!==deepEdits[0].part))throw Error('A proposta interna precisa editar um Patch por vez.');
   const deep=scope?.GraueDeepPatch||(typeof require==='function'?require('./deep-patch.js'):null);
   deepRequest=deep.prepare(deepState,deepEdits.map(({field,tone,value})=>({field,tone,value})),deepEdits[0].part);
  }
  if(partial.size&&toneEdits.length)throw Error('Divida a proposta em ajustes de Performance e de Tone; a execução mista exige releitura intermediária.');
  if(toneEdits.length>1)throw Error('Faça um Tone de cada vez para conferir o som antes de continuar.');
  const partEdits=partial.size?brain.diff(hw,[...partial.values()]):[];
  if(!partEdits.length&&!toneEdits.length&&!deepRequest)throw Error('O estado atual já corresponde à proposta.');
  return {partEdits,toneEdits,deepRequest,description:partEdits.length+' parâmetro(s) de Performance e '+toneEdits.length+' de Tone'+(deepRequest?' e '+deepRequest.operations.length+' internos':''),observedAt:hw.readAt||0};
 }
 function build(container,transport){
  if(!container)return null;
  const doc=container.ownerDocument;
  const mk=(tag,cls,text)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const original=[...container.children],brain=scope?.GraueSetupBrain||(typeof require==='function'?require('./setup-brain.js'):null),patch=scope?.GrauePatchFourTones||(typeof require==='function'?require('./patch-four-tones.js'):null);
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
  const deepUi=scope?.GraueDeepPatch?.create(transport);
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
   transport.plan((context+" "+(deepUi?.context()||"")).slice(0,3000));
   aiStatus.textContent='Consultando modelo local; nenhum MIDI será enviado sem aprovação…';
  };
  apply.onclick=()=>{
   if(!prepared||!proposal){aiStatus.textContent='Nenhuma proposta validada.';return;}
   try{
    if(hw.readAt!==prepared.observedAt)throw Error('Estado MIDI mudou. Peça outra proposta antes de aplicar.');
    const now=parsePlan(proposal,hw,connected&&liveSeen,busy,brain,patch,deepUi?.state());
    if(prepared.deepRequest&&now.deepRequest?.revision!==prepared.deepRequest.revision)throw Error('O Patch mudou após a proposta. Peça outra.');
    if(now.deepRequest){transport.editDeep?.(now.deepRequest);aiStatus.textContent='Ajustes internos solicitados; aguardando confirmação SysEx.';}
    else if(now.partEdits.length){transport.edit?.(now.partEdits);aiStatus.textContent='Edição de Performance solicitada; aguarde SysEx de retorno.';}
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
   [...tabs.children].forEach(b=>b.classList.toggle('on',b.dataset.synthGroup===group));
   original.forEach(el=>{el.hidden=group!=='TVA'||!!deepUi;});
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
     const ready=connected&&liveSeen&&!busy&&brain.isPerformance(hw)&&
       Number.isInteger(chan)&&chan>=0&&chan<16&&Array.isArray(zone)&&zone.length>=14;
     if(!ready)detail.append(mk('p',null,'Zona da Performance ainda não lida. Não será inventada.'));
     else{
      detail.append(mk('p',null,'Zona da Performance (canal '+(chan+1)+'), diferente de Vel/Key interno dos Tones.'));
      const row=mk('div','gx-synth-quick');
      const makeInput=(labelText,current)=>{
       const label=mk('label',null,labelText),input=mk('input');input.type='number';input.min='0';input.max='127';
       input.value=String(current);label.append(input);row.append(label);return input;
      };
      const low=makeInput('Nota inicial (0–127)',zone[12]),high=makeInput('Nota final (0–127)',zone[13]);
      const button=mk('button',null,'Aplicar faixa de teclas temporária');
      button.onclick=()=>{
       try{
        const latest=hw['zone:'+chan];
        if(!connected||!liveSeen||busy||!Array.isArray(latest)||latest.length<14)throw Error('Leia novamente o teclado antes de alterar.');
        if(!/^[0-9]{1,3}$/.test(low.value)||!/^[0-9]{1,3}$/.test(high.value))throw Error('Notas devem ser inteiros de 0 a 127.');
        const lo=Number(low.value),hi=Number(high.value);
        if(lo<0||hi>127||lo>hi)throw Error('A nota inicial precisa ser menor ou igual à final.');
        const edits=[];
        if(latest[12]!==lo)edits.push({section:'zone',index:chan,offset:12,value:lo});
        if(latest[13]!==hi)edits.push({section:'zone',index:chan,offset:13,value:hi});
        if(!edits.length){aiStatus.textContent='A faixa já corresponde à leitura real.';return;}
        transport.edit?.(edits);aiStatus.textContent='Faixa enviada temporariamente; aguardando confirmação SysEx.';
       }catch(e){aiStatus.textContent=e.message;}
      };
      detail.append(row,button);
     }
    }else if(group==='MFX'){
     const b=mk('button',null,'Abrir Editor avançado de efeitos');b.onclick=()=>doc.getElementById('gx-advanced')?.click();detail.append(b);
    }else if(group==='LFO'){
     detail.append(mk('p',null,'Vibrato da Performance (CC76–78), diferente dos LFO1/LFO2 individuais dos Tones. Só enviar com canal exclusivo e leitura do teclado.'));
     const gate=patch.safeChannel(hw,part,connected&&liveSeen,busy);
     const row=mk('div','gx-synth-quick'),p=hw['part:'+part];
     for(const [cc,labelText,offset] of [[76,'Velocidade do vibrato',34],[77,'Intensidade do vibrato',35],[78,'Atraso do vibrato',36]]){
      const label=mk('label',null,labelText+' · CC'+cc);
      const input=mk('input');input.type='number';input.min='0';input.max='127';input.placeholder='—';
      const observed=Array.isArray(p)&&Number.isInteger(p[offset])&&p[offset]>=0&&p[offset]<=127;
      input.value=observed?String(p[offset]):'';
      const button=mk('button',null,'Enviar CC'+cc);button.disabled=!gate.enabled||!observed;
      button.onclick=()=>{
       try{
        const fresh=patch.safeChannel(hw,part,connected&&liveSeen,busy);
        if(!fresh.enabled)throw Error(fresh.reason);
        if(!/^[0-9]{1,3}$/.test(input.value)||Number(input.value)>127)throw Error('Use valor de 0 a 127.');
        button.disabled=true;
        transport.vibrato?.({part,cc,value:Number(input.value)});
        aiStatus.textContent='Vibrato CC'+cc+' enviado; aguardando leitura. A alteração é por parte, não por Tone.';
       }catch(e){aiStatus.textContent=e.message;}
      };
      label.append(input,button);row.append(label);
     }
     detail.append(row);
    }
   }
   deepUi?.render(detail,group,part);
   renderProbe();
  }
  function receive(kind,data){
   if(kind==='xpsConnection'){connected=!!data;if(!connected){hw={};liveSeen=false;observing=false;probe.reset();prepared=null;apply.disabled=true;}render();}
   if(kind==='hardwareReset'){hw={};liveSeen=false;observing=false;probe.reset();prepared=null;apply.disabled=true;render();}
   if(kind==='hardwareBusy'){busy=!!data;render();}
   if(kind==='hardware'||kind==='hardwarePhysical'){hw=data||{};liveSeen=connected&&Number(hw.validSysexPackets)>0;render();}
   if(kind==='patchObserveState'){observing=!!data;renderProbe();}
   if(kind==='patchProbe'){if(probe.ingest(data))renderProbe();}
   if(kind==='patchPlanAnswer'&&awaiting){
    awaiting=false;ask.disabled=false;proposal=String(data||'');prepared=null;
    try{
     prepared=parsePlan(proposal,hw,connected&&liveSeen,busy,brain,patch,deepUi?.state());
     apply.disabled=false;
     const ops=JSON.parse(proposal.trim().replace(/^\x60\x60\x60(?:json)?\s*/i,'').replace(/\s*\x60\x60\x60$/,'')).operations;
     const details=ops.map(o=>o.kind==='tone'
      ?'Parte '+(o.part+1)+' / Tone '+o.tone+' / TVA Level = '+o.level
      :'Parte '+(o.part+1)+' / '+o.field+' = '+o.value).join('; ');
     aiStatus.textContent='Proposta validada: '+details+'. '+prepared.description+'. Confira os valores antes de aplicar.';
    }catch(e){apply.disabled=true;aiStatus.textContent=e.message;}
   }
   deepUi?.receive(kind,data);
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
    readDeep:part=>scope.Native?.readDeepPatch?.(part),
    editDeep:request=>scope.Native?.editDeepPatch?.(JSON.stringify(request)),
    undoDeep:()=>scope.Native?.undoDeepPatch?.(),
    observe:enabled=>scope.Native?.observePatch?.(enabled),
    plan:text=>scope.Native?.planPatch?.(text),
    edit:commands=>scope.Native?.editHardware?.(JSON.stringify(commands)),
    tone:c=>scope.Native?.toneLevel?.(c.part,c.tone,c.value),
    vibrato:c=>scope.Native?.partVibrato?.(c.part,c.cc,c.value)
   };
   const instance=build(target,transport);
   const prev=scope.receive;
   scope.receive=(kind,data)=>{if(typeof prev==='function')prev(kind,data);instance.receive(kind,data);};
  }
 }
})(typeof window!=='undefined'?window:null);
