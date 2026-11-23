'use strict';
/* Grauê XPS live tone editor: direct MIDI CC in Patch/Performance, and verified
 * temporary Roland SysEx for Performance zones, MFX and melodic Patch internals.
 * Never substitutes Mono/Poly for stereo output, never writes USER memory.
 */
(()=>{
 const shell=document.getElementById('gx-shell'),stage=shell?.querySelector('[data-gx-screen="stage"]');
 const quick=stage?.querySelector('.gx-live-quick'),api=window.GraueStageUX;
 if(!shell||!quick||!api)return;
 const doc=shell.ownerDocument;
 const el=(tag,text,cls)=>{const e=doc.createElement(tag);if(text!==undefined&&text!==null)e.textContent=text;if(cls)e.className=cls;return e;};
 const button=el('button','Editar timbre','gx-stage-edit-launch');
 button.id='gx-stage-edit';button.type='button';button.title='Ganho, panorama, efeitos, região, Mono/Poly e síntese';
 quick.insertBefore(button,quick.querySelector('#gx-stage-scenes')||null);
 const modal=el('dialog',null,'gx-live-dialog gx-stage-editor-dialog');modal.id='gx-stage-editor-dialog';
 modal.setAttribute('aria-labelledby','gx-stage-editor-title');
 const header=el('div',null,'gx-live-dialog-head');
 const title=el('h2','Editor do timbre');title.id='gx-stage-editor-title';
 const close=el('button','Fechar ✕');close.type='button';close.onclick=()=>modal.close();
 header.append(title,close);modal.append(header);
 const descriptor=el('p','Altere o som temporariamente. MIDI USB não envia áudio nem grava na memória USER.','gx-stage-edit-help');
 const meta=el('div',null,'gx-stage-edit-meta');
 const partLabel=el('label','Parte da Performance'),part=el('select');part.id='gx-stage-edit-part';
 for(let i=0;i<16;i++){const o=el('option','Parte '+(i+1));o.value=String(i);part.append(o);}
 partLabel.append(part);
 const read=el('button','Ler XPS-10');read.type='button';read.id='gx-stage-edit-read';
 read.onclick=()=>{if(!connected())return message('Conecte o USB-MIDI antes de ler.');window.Native?.readHardware?.();message('Leitura SysEx solicitada. Aguarde os dados do Roland.');};
 meta.append(partLabel,read);
 const status=el('p','Sem leitura do XPS-10.','gx-stage-edit-status');
 status.id='gx-stage-edit-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 modal.append(descriptor,meta,status);
 const tabs=el('div',null,'gx-stage-edit-tabs');tabs.setAttribute('role','tablist');
 const panes=el('div',null,'gx-stage-edit-panes'),tabButtons=new Map(),sections=new Map();
 let active='som',busy=false,deep=null,readHW=null;
 const state=()=>api.state(),hw=()=>state().hw||{},connected=()=>!!state().connected;
 const selected=()=>Number(part.value)||0,mode=()=>hw()['setup:0']?.[0];
 function message(text){status.textContent=text;}
 function panel(name,label){
  const t=el('button',label);t.type='button';t.setAttribute('role','tab');t.setAttribute('aria-selected',String(name===active));
  t.onclick=()=>show(name);tabButtons.set(name,t);tabs.append(t);
  const s=el('section',null,'gx-stage-edit-pane');s.dataset.editorPane=name;
  s.setAttribute('role','tabpanel');s.hidden=name!==active;sections.set(name,s);panes.append(s);return s;
 }
 function show(name){active=name;for(const [k,t]of tabButtons)t.setAttribute('aria-selected',String(k===name));for(const [k,s]of sections)s.hidden=k!==name;sync();}
 const som=panel('som','Som ao vivo'),effects=panel('efeitos','Efeitos'),region=panel('regiao','Região'),synthesis=panel('sintese','Síntese');
 modal.append(tabs,panes);shell.append(modal);
 const noteName=n=>{const names=['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];return names[n%12]+(Math.floor(n/12)-1);};
 const allowCC=new Set([7,10,11,71,72,73,74,91,93]);
 const controls=[
  [7,'Ganho / volume',100,'Nível de saída por MIDI CC7; não é amplificador físico'],
  [10,'Panorama L ↔ R',64,'CC10, centro 64; efeitos estéreo podem continuar nos dois canais'],
  [11,'Expressão',100,'CC11; ajuste musical sem mexer no volume master'],
  [74,'Filtro / Cutoff',64,'CC74, valor 64 é referência'],
  [71,'Ressonância',64,'CC71, valor 64 é referência'],
  [73,'Ataque',64,'CC73, valor 64 é referência'],
  [72,'Release',64,'CC72, valor 64 é referência'],
  [91,'Reverb (envio)',40,'CC91, intensidade depende do timbre/roteamento'],
  [93,'Chorus (envio)',40,'CC93, intensidade depende do timbre/roteamento']
 ];
 som.append(el('h3','Controles em tempo real'));
 som.append(el('p','Arraste para transmitir CC MIDI, sem entrar em Performance. O som só muda se o Roland receber o canal e o controle. Valores exibidos sem SysEx são apenas pontos de partida.','gx-stage-edit-caption'));
 const sliders=new Map();
 for(const [cc,label,defaultValue,hint] of controls){
  const wrap=el('label',null,'gx-stage-edit-control');
  const top=el('div',null,'gx-stage-edit-control-top'),name=el('strong',label),out=el('output','—');
  out.id='gx-stage-live-cc-'+cc;top.append(name,out);
  const input=el('input');input.type='range';input.min='0';input.max='127';input.value=String(defaultValue);
  input.dataset.liveCc=String(cc);input.setAttribute('aria-label',label);input.title=hint;
  const caption=el('small',hint);wrap.append(top,input,caption);som.append(wrap);
  let timer=null,last=-1,pendingPart=null;
  const dispatch=()=>{if(timer){clearTimeout(timer);timer=null;}const v=Number(input.value);if(!modal.open||v===last||!connected()||busy||pendingPart!==selected())return;last=v;
   if(!window.Native?.liveEffectCc){message('Atualize o APK: envio contínuo seguro não disponível.');return;}
   window.Native.liveEffectCc(selected(),cc,v);
   message(label+': CC'+cc+' solicitado. Confirme ouvindo o Roland.');
  };
  input.oninput=()=>{pendingPart=selected();out.textContent=input.value+' · solicitado';if(timer)clearTimeout(timer);timer=setTimeout(dispatch,90);};
  input.onchange=()=>{if(pendingPart===null)pendingPart=selected();dispatch();};
  sliders.set(cc,{input,out,defaultValue,reset:()=>{last=-1;pendingPart=null;if(timer){clearTimeout(timer);timer=null;}}});
 }
 const stereo=el('aside',null,'gx-stage-stereo-note');
 stereo.append(el('strong','Mono / Estéreo não é Mono / Poly.'));
 stereo.append(el('p','Panorama L/R é ajustado acima. Para áudio estéreo real, use as saídas físicas L/MONO e R; uma única saída L/MONO é mono. O processamento interno de efeitos pode ser estéreo. O modo de notas Mono/Poly fica em Região e Síntese.'));
 som.append(stereo);

 effects.append(el('h3','Envios e processadores do Roland'));
 effects.append(el('p','Reverb e Chorus por CC91/CC93 estão em Som ao vivo. MFX 1–3, algoritmo e roteamento abaixo exigem Performance ativa e leitura SysEx; a mudança é temporária.','gx-stage-edit-caption'));
 const unitRow=el('label','Unidade MFX'),unit=el('select');unit.id='gx-stage-edit-mfx-unit';
 for(let i=0;i<3;i++){const o=el('option','MFX '+(i+1));o.value=String(i);unit.append(o);}unitRow.append(unit);
 const typeRow=el('label','Tipo do efeito'),fxType=el('select');fxType.id='gx-stage-edit-fx-type';
 (window.XPS_EFFECTS||[]).forEach((x,i)=>{const o=el('option',i+' · '+x);o.value=String(i);fxType.append(o);});
 typeRow.append(fxType);
 const fxValues=new Map(),fxGrid=el('div',null,'gx-stage-edit-grid');
 for(const [k,label] of [['dry','Ganho direto MFX'],['chorus','MFX → Chorus'],['reverb','MFX → Reverb']]){
  const row=el('label',label),field=el('input');field.type='number';field.min='0';field.max='127';field.placeholder='Aguarde leitura';row.append(field);fxGrid.append(row);fxValues.set(k,field);
 }
 const applyFX=el('button','Aplicar algoritmo MFX');applyFX.type='button';applyFX.id='gx-stage-edit-fx-apply';
 effects.append(unitRow,typeRow,fxGrid,applyFX,el('small','O algoritmo pode mudar radicalmente o som em execução. Confirme antes de aplicar. Releitura SysEx necessária após trocar o tipo.'));

 region.append(el('h3','Mixagem e região do teclado'));
 region.append(el('p','Edição de parte, zona de notas, Mono/Poly, nível, pan, envio de efeitos e roteamento MFX. Exige Performance real lida por SysEx. No modo Patch, use Som ao vivo.','gx-stage-edit-caption'));
 const perfGrid=el('div',null,'gx-stage-edit-grid'),partFields=new Map();
 const perfDefs=[
  ['level','Ganho / nível da parte',7,0,127,0],
  ['pan','Pan L/R (−64 a +63)',8,-64,63,64],
  ['mono','Execução de notas',11,0,2,0],
  ['octave','Oitava (−3 a +3)',21,-3,3,64],
  ['direct','Saída direta',28,0,127,0],
  ['chorus','Envio ao Chorus',29,0,127,0],
  ['reverb','Envio ao Reverb',30,0,127,0],
  ['mfx','Unidade MFX',32,0,2,0]
 ];
 for(const [key,label,offset,min,max,bias] of perfDefs){
  const row=el('label',label),input=key==='mono'||key==='mfx'?el('select'):el('input');
  if(key==='mono'){for(const [value,name]of [[0,'Mono'],[1,'Poly'],[2,'Seguir Patch']]){const o=el('option',name);o.value=String(value);input.append(o);}}
  else if(key==='mfx'){for(let i=0;i<3;i++){const o=el('option','MFX '+(i+1));o.value=String(i);input.append(o);}}
  else{input.type='number';input.min=String(min);input.max=String(max);input.step='1';}
  input.placeholder='Ler teclado';input.dataset.perfField=key;row.append(input);perfGrid.append(row);partFields.set(key,{input,offset,min,max,bias});
 }
 const zoneBox=el('div',null,'gx-stage-edit-zone');
 const zoneTitle=el('h4','Zona física do teclado (Split/Layer)');
 const zoneRow=el('div',null,'gx-stage-edit-grid');
 const zoneLow=el('input'),zoneHigh=el('input');
 for(const [input,lab]of [[zoneLow,'Nota inicial MIDI'],[zoneHigh,'Nota final MIDI']]){
  input.type='number';input.min='0';input.max='127';input.step='1';const label=el('label',lab);label.append(input);zoneRow.append(label);
 }
 const rangeLabel=el('strong','Zona: sem leitura');
 const meter=el('div',null,'gx-stage-edit-range'),meterFill=el('span');meter.append(meterFill);
 const zoneEnable=el('input');zoneEnable.type='checkbox';const enabled=el('label','Zona ativa (KBD)');enabled.prepend(zoneEnable);
 const updateRange=()=>{const low=Number(zoneLow.value),high=Number(zoneHigh.value);if(zoneLow.value===''||zoneHigh.value===''||low<0||high>127||low>high){rangeLabel.textContent='Faixa inválida';meterFill.style.width='0';return;}rangeLabel.textContent=noteName(low)+' até '+noteName(high);meterFill.style.left=(low/128*100)+'%';meterFill.style.width=((high-low+1)/128*100)+'%';};
 zoneLow.oninput=zoneHigh.oninput=updateRange;
 zoneBox.append(zoneTitle,zoneRow,rangeLabel,meter,enabled);
 const applyPart=el('button','Aplicar região e mixagem'),undo=el('button','Desfazer última edição SysEx');
 applyPart.id='gx-stage-edit-part-apply';undo.id='gx-stage-edit-undo';applyPart.type=undo.type='button';
 region.append(perfGrid,zoneBox,applyPart,undo);

 synthesis.append(el('h3','Parâmetros internos do Patch'));
 synthesis.append(el('p','Ganho interno, panorama, Mono/Poly, filtros e regiões de cada um dos quatro Tones. Leitura completa da parte melódica, SysEx com validação. Neste XPS-10 a leitura profunda do Patch requer Performance ativa.','gx-stage-edit-caption'));
 const readPatch=el('button','Ler Patch completo'),undoPatch=el('button','Desfazer edição interna');readPatch.type=undoPatch.type='button';
 readPatch.id='gx-stage-edit-patch-read';readPatch.onclick=()=>{if(!performanceReady())return message('Para ler o Patch interno, ative Performance e leia a parte. O modo Patch continua disponível para CC ao vivo.');window.Native?.readDeepPatch?.(selected());message('Leitura profunda solicitada. Aguarde confirmação SysEx.');};
 undoPatch.id='gx-stage-edit-patch-undo';undoPatch.onclick=()=>window.Native?.undoDeepPatch?.();
 const deepToneLabel=el('label','Tone interno'),deepTone=el('select');
 for(let i=1;i<=4;i++){const o=el('option','Tone '+i);o.value=String(i);deepTone.append(o);}deepToneLabel.append(deepTone);
 const deepGrid=el('div',null,'gx-stage-edit-grid'),deepFields=new Map();
 const deepDefs=[
  ['common_patch_level','Ganho do Patch',false],
  ['common_patch_pan','Panorama interno',false],
  ['common_mono_poly','Mono / Poly do Patch',false],
  ['common_portamento_switch','Portamento',false],
  ['common_cutoff_offset','Cutoff interno',false],
  ['common_resonance_offset','Ressonância interna',false],
  ['common_attack_time_offset','Attack interno',false],
  ['common_release_time_offset','Release interno',false],
  ['tmt_tmt1_keyboard_range_lower','Região inicial do Tone',true],
  ['tmt_tmt1_keyboard_range_upper','Região final do Tone',true]
 ];
 const defs=window.GrauePatchParameters||[],findDef=id=>defs.find(d=>d.id===id);
 function toneField(base,tone){return base.replace(/^tmt_tmt1_/,'tmt_tmt'+tone+'_');}
 for(const [field,label,isTone]of deepDefs){
  const row=el('label',label),input=(field==='common_mono_poly'||field==='common_portamento_switch')?el('select'):el('input');
  if(input.tagName==='SELECT'){
   const choices=field==='common_mono_poly'?[[0,'Mono · uma nota'],[1,'Poly · várias notas']]:[[0,'Portamento desligado'],[1,'Portamento ligado']];
   for(const [value,text]of choices){const o=el('option',text);o.value=String(value);input.append(o);}
  }else{input.type='number';input.placeholder='Ler Patch';}
  input.dataset.deepField=field;row.append(input);deepGrid.append(row);deepFields.set(field,{input,isTone});
 }
 const applyDeep=el('button','Aplicar parâmetros internos do Patch');applyDeep.id='gx-stage-edit-deep-apply';applyDeep.type='button';
 synthesis.append(readPatch,undoPatch,deepToneLabel,deepGrid,applyDeep,el('small','A gravação aqui é temporária. Não executa WRITE USER, não restaura backup e não altera outros timbres sem seleção.'));

 function performanceReady(){const h=hw(),p=h['part:'+selected()];return connected()&&!busy&&h['setup:0']?.[0]===1&&Number(h.validSysexPackets)>0&&Array.isArray(p);}
 function currentZone(){const p=hw()['part:'+selected()];return p?hw()['zone:'+p[0]]:null;}
 const numeric=(input,min,max)=>{const v=Number(input.value);if(input.value===''||!Number.isInteger(v)||v<min||v>max)throw Error('Valor fora da faixa '+min+'–'+max);return v;};
 function sendSysEx(edits,label){
  if(!performanceReady())throw Error('Conecte, ative Performance e leia o XPS-10 antes de editar esta parte.');
  if(!edits.length){message('Nenhuma alteração: os valores já coincidem com a leitura.');return;}
  if(edits.length>40)throw Error('Muitas edições numa operação.');
  if(!window.Native?.editHardware)throw Error('Ponte SysEx indisponível.');
  window.Native.editHardware(JSON.stringify(edits));
  message(label+' solicitado · aguardando releitura SysEx. Não é WRITE USER.');
 }
 applyPart.onclick=()=>{
  try{
   const p=hw()['part:'+selected()],z=currentZone();
   if(!performanceReady()||!Array.isArray(z))throw Error('Leia uma Performance completa e a zona da parte escolhida.');
   const ops=[];
   for(const [key,o]of partFields){const value=numeric(o.input,o.min,o.max)+o.bias;if(value!==p[o.offset])ops.push({section:'part',index:selected(),offset:o.offset,value});}
   const low=numeric(zoneLow,0,127),high=numeric(zoneHigh,0,127);
   if(low>high)throw Error('A nota inicial não pode superar a nota final.');
   const channel=p[0];if(!Number.isInteger(channel)||channel<0||channel>15)throw Error('Canal da zona desconhecido.');
   for(const [off,v]of [[1,zoneEnable.checked?1:0],[12,low],[13,high]]){
    if(v!==z[off])ops.push({section:'zone',index:channel,offset:off,value:v});
   }
   sendSysEx(ops,'Parte e região');
  }catch(e){message(e.message);}
 };
 undo.onclick=()=>{if(!performanceReady())return message('Leia a Performance antes de desfazer.');window.Native?.undoHardware?.();message('Desfazer solicitado; confira a releitura SysEx.');};
 applyFX.onclick=()=>{
  try{
   const h=hw(),i=Number(unit.value),fx=h['mfx:'+i];
   if(!performanceReady()||!Array.isArray(fx)||!Array.isArray(h['common:0']))throw Error('Leia MFX e Performance por SysEx primeiro.');
   const type=numeric(fxType,0,78),values=[numeric(fxValues.get('dry'),0,127),numeric(fxValues.get('chorus'),0,127),numeric(fxValues.get('reverb'),0,127)];
   const edits=[{section:'common',index:0,offset:48+i,value:0}];
   for(const [off,v]of [[0,type],[1,values[0]],[2,values[1]],[3,values[2]]])if(v!==fx[off])edits.push({section:'mfx',index:i,offset:off,value:v});
   if(!edits.length)throw Error('Não há parâmetros novos.');
   if(type!==fx[0]&&!window.confirm('Trocar o algoritmo de MFX pode alterar abruptamente o som durante o louvor. Continuar?'))return;
   sendSysEx(edits,'MFX '+(i+1));
  }catch(e){message(e.message);}
 };
 function renderFX(){const fx=hw()['mfx:'+unit.value],ready=performanceReady()&&Array.isArray(fx)&&Array.isArray(hw()['common:0']);fxType.disabled=!ready;applyFX.disabled=!ready;for(const inp of fxValues.values())inp.disabled=!ready;if(!ready){fxType.value='0';for(const inp of fxValues.values())inp.value='';return;}fxType.value=String(fx[0]);fxValues.get('dry').value=String(fx[1]);fxValues.get('chorus').value=String(fx[2]);fxValues.get('reverb').value=String(fx[3]);}
 unit.onchange=renderFX;part.onchange=()=>{const source=doc.getElementById('gx-stage-tone-part')||doc.getElementById('gx-tone-part');if(source){source.value=part.value;source.onchange?.();}deep=null;sync(true);};
 deepTone.onchange=()=>renderDeep();
 function renderDeep(){
  const ready=performanceReady()&&deep?.ready&&deep.part===selected()&&deep.source==='midi-live';
  readPatch.disabled=!performanceReady();undoPatch.disabled=!ready;applyDeep.disabled=!ready;
  for(const [field,entry]of deepFields){
   const key=entry.isTone?toneField(field,Number(deepTone.value)):field;
   const d=findDef(key);entry.input.disabled=!ready||!d;
   if(!ready||!d){entry.input.value='';continue;}
   try{const value=window.GraueDeepPatch.decode(d,deep[d.section==='common'?'common':'tmt']);entry.input.min=String(d.min);entry.input.max=String(d.max);entry.input.value=String(value);}
   catch(_){entry.input.value='';entry.input.disabled=true;}
  }
 }
 applyDeep.onclick=()=>{
  try{
   if(!performanceReady()||!deep?.ready||deep.part!==selected())throw Error('Leia o Patch melódico real desta parte primeiro.');
   const ops=[];
   for(const [field,entry]of deepFields){
    if(entry.input.disabled)continue;
    const name=entry.isTone?toneField(field,Number(deepTone.value)):field,d=findDef(name),v=numeric(entry.input,d.min,d.max);
    ops.push({field:name,tone:entry.isTone?Number(deepTone.value):1,value:v});
   }
   const request=window.GraueDeepPatch.prepare(deep,ops,selected());
   if(!window.Native?.editDeepPatch)throw Error('Editor profundo indisponível no APK.');
   window.Native.editDeepPatch(JSON.stringify(request));
   message('Edição profunda solicitada. Aguardando confirmação SysEx do XPS-10.');
  }catch(e){message(e.message);}
 };
 function sync(reset=false){
  const h=hw(),perf=h['setup:0']?.[0]===1,ready=performanceReady(),p=h['part:'+selected()];
  part.disabled=!connected()||busy;read.disabled=!connected()||busy;
  const source=doc.getElementById('gx-stage-tone-part')||doc.getElementById('gx-tone-part');
  if(reset&&source&&Number.isInteger(Number(source.value)))part.value=source.value;
  for(const [cc,o]of sliders){o.input.disabled=!connected()||busy;if(reset){
   let v=o.defaultValue;
   if(ready&&p){if(cc===7)v=p[7];if(cc===10)v=p[8];if(cc===91)v=p[30];if(cc===93)v=p[29];}
   o.input.value=String(Number.isInteger(v)&&v>=0&&v<=127?v:o.defaultValue);
   o.out.textContent=ready&&[7,10,91,93].includes(cc)?o.input.value+' · leitura':o.input.value+' · início (não lido)';
   o.reset();
  }}
  for(const [,o]of partFields){o.input.disabled=!ready;if(reset)o.input.value=ready&&Number.isInteger(p[o.offset])?String(p[o.offset]-o.bias):'';}
  const z=currentZone();for(const e of [zoneLow,zoneHigh,zoneEnable])e.disabled=!ready||!z;
  if(reset){zoneLow.value=ready&&z?String(z[12]):'';zoneHigh.value=ready&&z?String(z[13]):'';zoneEnable.checked=ready&&!!z?.[1];updateRange();}
  applyPart.disabled=!ready||!z;undo.disabled=!ready;
  if(reset)renderFX();else{fxType.disabled=!ready;applyFX.disabled=!ready;}
  if(reset)renderDeep();else{readPatch.disabled=!ready;applyDeep.disabled=!ready||!deep?.ready;}
  if(!connected())message('USB desconectado. Você pode consultar o módulo, mas não enviar efeitos.');
  else if(busy)message('Leitura/edição MIDI em andamento. Não envie comandos até concluir.');
  else if(!perf)message('Modo Patch: Som ao vivo funciona sem Performance. Região, MFX detalhado e síntese interna exigem leitura em Performance.');
  else if(!ready)message('Performance detectada; leia as partes por SysEx para habilitar edição de região e MFX.');
  else if(reset)message('Performance lida. Edições só serão enviadas ao tocar ou aplicar. Não há gravação USER automática.');
 }
 button.onclick=()=>{part.value=doc.getElementById('gx-stage-tone-part')?.value||doc.getElementById('gx-tone-part')?.value||'0';sync(true);modal.showModal();};
 modal.addEventListener('close',()=>{for(const entry of sliders.values())entry.reset();button.focus();});
 const prior=window.receive;
 window.receive=(kind,data)=>{
  if(prior)prior(kind,data);
  if(kind==='hardwareBusy')busy=!!data;
  if(kind==='deepPatch'){deep=data;if(modal.open)renderDeep();}
  if(kind==='hardwareReset'||kind==='xpsConnection'&&data===false){deep=null;busy=false;}
  if(kind==='liveEffectCcResult'&&modal.open)message(data?.ok?'CC'+data.cc+' enviado no canal MIDI '+data.channel+'. Confira o som no Roland.':String(data?.reason||'Controle CC não confirmado.'));
  if(kind==='hardwareOperation'&&modal.open&&data?.status){const state=String(data.status);if(state==='confirmed')message('SysEx confirmado pelo Roland (leitura de retorno). Toque e confira o som.');else if(['failed','unconfirmed','cancelled'].includes(state))message('Edição não confirmada. Releia o XPS antes de continuar.');}
  if(modal.open&&['xpsConnection','hardwareReset','hardwareBusy','hardware','hardwarePhysical'].includes(kind))sync(kind==='hardware'||kind==='hardwarePhysical');
 };
 for(const tab of shell.querySelectorAll('[data-gx-tab]'))tab.addEventListener('click',()=>{if(modal.open)modal.close();});
 window.GraueStageToneEditor={open:()=>button.click(),active:()=>modal.open,selected:()=>selected()};
})();
