'use strict';
/* Grauê XPS-10 — first real four-Tone control: TVA level, via documented CC80–83.
 * Raw Tone level is NOT yet part of the existing 0x50-byte Patch Common SysEx
 * snapshot. Never fabricate a readback value or expose speculative SysEx offsets.
 */
(function(global){
 const isByte=v=>Number.isInteger(v)&&v>=0&&v<=127;
 const GROUPS=Object.freeze(['PCH','WG','TVA','TVF','Vel/Key','LFO','MTX','Ctrl','MFX']);
 function safeChannel(hw,part,connected,busy){
  if(!connected)return {enabled:false,reason:'USB-MIDI desconectado'};
  if(busy)return {enabled:false,reason:'Aguarde a leitura ou a edição MIDI'};
  if(!hw||!Array.isArray(hw['setup:0'])||hw['setup:0'][0]!==1||!Number(hw.validSysexPackets))
   return {enabled:false,reason:'Leia uma Performance real do XPS-10 por SysEx'};
  if(!Number.isInteger(part)||part<0||part>15)return {enabled:false,reason:'Parte inválida'};
  const p=hw['part:'+part];
  if(!Array.isArray(p)||p.length<7||!isByte(p[0])||p[0]>15||p[1]!==1)
   return {enabled:false,reason:'A parte não está habilitada ou não foi lida'};
  if(!isByte(p[4])||!isByte(p[5])||!isByte(p[6]))
   return {enabled:false,reason:'Identidade do timbre ainda não foi lida'};
  for(let i=0;i<16;i++){
   if(i===part)continue;
   const other=hw['part:'+i];
   if(!Array.isArray(other)||other.length<2||!isByte(other[0])||other[0]>15||!isByte(other[1]))
    return {enabled:false,reason:'Todos os 16 canais precisam ser lidos antes do envio'};
   if(other[0]===p[0]&&other[1]===1)
    return {enabled:false,reason:'Canal compartilhado com outra parte: CC pode modificar mais de um Patch'};
  }
  return {enabled:true,channel:p[0]+1};
 }
 function command(hw,part,tone,value,connected,busy){
  const r=safeChannel(hw,part,connected,busy);
  if(!r.enabled)throw Error(r.reason);
  if(!Number.isInteger(tone)||tone<1||tone>4)throw Error('Tone inválido (1–4)');
  if(!isByte(value))throw Error('Nível deve ser um inteiro de 0 a 127');
  return {part,tone,value,channel:r.channel,controller:79+tone};
 }
 function build(container,transport){
  if(!container)return null;
  const doc=container.ownerDocument;
  const make=(tag,cls,text)=>{
   const node=doc.createElement(tag);
   if(cls)node.className=cls;
   if(text!==undefined)node.textContent=text;
   return node;
  };
  let hw={},connected=false,busy=false,part=0;
  const header=make('div','gx-patch-four-header');
  const intro=make('div');
  intro.append(make('h3',null,'Editor do Patch · 4 Tones'),
   make('small',null,'TVA • nível independente dos Tones 1–4 (CC80–83)'));
  const reread=make('button',null,'↻ Ler Performance');reread.type='button';
  reread.onclick=()=>transport.read?.();
  header.append(intro,reread);
  const pickerRow=make('div','gx-patch-part-picker');
  const pickerLabel=make('label',null,'Parte do XPS-10');
  const picker=make('select');picker.setAttribute('aria-label','Parte de Performance dos quatro tones');
  for(let i=0;i<16;i++){
   const op=make('option',null,'Parte '+(i+1));op.value=String(i);picker.append(op);
  }
  picker.onchange=()=>{part=Number(picker.value);render();};
  pickerLabel.append(picker);
  const patchName=make('small','gx-patch-name');
  pickerRow.append(pickerLabel,patchName);
  const status=make('p','gx-patch-four-status');status.setAttribute('role','status');
  const grid=make('div','gx-patch-tone-grid');
  const note=make('p','gx-patch-four-note',
   'CC80–83 ajustam o nível de cada tone, mas o valor inicial NÃO é lido por esta versão. Digite o valor desejado e confira o som no Roland. O envio não equivale a confirmação nem a gravação USER.');
  const future=make('details','gx-patch-future');
  future.append(make('summary',null,'Outras seções do Editor de Síntese · em validação'),
   make('p',null,'PCH, WG, TVA Envelopes, TVF, Vel/Key, LFO, MTX, Ctrl e MFX. Esses editores serão liberados somente após validar endereços, limites e leitura SysEx do XPS-10 original.'));
  container.replaceChildren(header,pickerRow,status,grid,note,future);
  function render(){
   const gate=safeChannel(hw,part,connected,busy);
   reread.disabled=busy||!connected;
   const p=hw['part:'+part],patch=hw['patch:'+part];
   const name=Array.isArray(patch)?patch.slice(0,12).filter(isByte).map(c=>c>=32&&c<=126?String.fromCharCode(c):' ').join('').trim():'';
   patchName.textContent=gate.enabled?'Canal exclusivo '+gate.channel+(name?' · Patch: '+name:' · Nome não confirmado'):'Nenhuma leitura de Patch confirmada para esta seleção';
   status.textContent=gate.enabled?'Pronto para editar TVA Level. Digite um valor por tone.':'Bloqueado: '+gate.reason;
   grid.replaceChildren();
   for(let tone=1;tone<=4;tone++){
    const card=make('section','gx-patch-tone-card');
    const title=make('strong',null,'Tone '+tone);
    const label=make('small',null,'Nível TVA · CC'+(79+tone));
    const inputLabel=make('label',null,'Novo nível (0–127)');
    const input=make('input');input.type='number';input.min='0';input.max='127';input.step='1';input.placeholder='—';input.value='';
    input.setAttribute('aria-label','Nível do Tone '+tone);
    inputLabel.append(input);
    const apply=make('button',null,'Aplicar Tone '+tone);apply.type='button';
    apply.disabled=!gate.enabled;
    const feedback=make('small','gx-patch-tone-feedback','Valor atual não lido');
    apply.onclick=()=>{
     try{
      if(input.value===''||!/^(?:\d{1,3})$/.test(input.value))throw Error('Informe um número inteiro de 0 a 127');
      const sent=command(hw,part,tone,Number(input.value),connected,busy);
      if(typeof transport.send!=='function')throw Error('Atualize o APK para ativar o envio CC80–83');
      apply.disabled=true;
      feedback.textContent='Enviando ao Roland…';
      transport.send(sent);
     }catch(e){feedback.textContent=e.message;}
    };
    card.append(title,label,inputLabel,apply,feedback);
    grid.append(card);
   }
  }
  function receive(kind,data){
   if(kind==='xpsConnection'){connected=!!data;if(!connected)hw={};render();}
   if(kind==='hardwareBusy'){busy=!!data;render();}
   if(kind==='hardware'){hw=data||{};render();}
   if(kind==='hardwareReset'){hw={};busy=false;render();}
   if(kind==='toneLevelSent'){
    if(!data||data.part!==part||data.tone<1||data.tone>4)return;
    const card=grid.children[data.tone-1];
    if(card){
     card.children[4].textContent='CC'+data.controller+' enviado no canal '+data.channel+'; som não confirmado';
     card.children[3].disabled=false;
    }
   }
  }
  render();
  return {receive,render,getState:()=>({part,connected,busy})};
 }
 const api={GROUPS,safeChannel,command,build};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global){
  global.GrauePatchFourTones=api;
  const container=global.document?.getElementById('gx-patch-four-tones');
  if(container){
   const transport={
    read:()=>global.Native?.readHardware?.(),
    send:cmd=>global.Native?.toneLevel?.(cmd.part,cmd.tone,cmd.value)
   };
   const mounted=build(container,transport);
   const previous=global.receive;
   global.receive=(kind,data)=>{if(typeof previous==='function')previous(kind,data);mounted.receive(kind,data);};
  }
 }
})(typeof window!=='undefined'?window:null);
