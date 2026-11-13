'use strict';
/* Grauê Performance Matrix — edits only known XPS-10 temporary Performance-part fields.
 * Never writes a USER bank. Every change is gated by a complete SysEx part snapshot.
 * The native XpsController still checks the whitelist, captures undo and reads back.
 */
(function(global){
 const FIELDS=Object.freeze({
  level:{name:'Volume',offset:7,min:0,max:127,tip:'Volume MIDI da parte (não é volume global)'},
  cutoff:{name:'Cutoff',offset:17,min:0,max:127,tip:'Offset de filtro, 64 é neutro'},
  resonance:{name:'Ressonância',offset:18,min:0,max:127,tip:'Offset de ressonância, 64 é neutro'},
  attack:{name:'Attack',offset:19,min:0,max:127,tip:'Offset de ataque, 64 é neutro'},
  release:{name:'Release',offset:20,min:0,max:127,tip:'Offset de release, 64 é neutro'},
  decay:{name:'Decay',offset:33,min:0,max:127,tip:'Offset de decay, 64 é neutro'},
  mfx:{name:'Saída MFX',offset:32,min:0,max:2,tip:'Seleção MFX 1, 2 ou 3 conforme resposta do teclado'}
 });
 const isByte=n=>Number.isInteger(n)&&n>=0&&n<=127;
 function observed(hw,part,field){
  const p=hw&&hw['part:'+part],definition=FIELDS[field];
  if(!definition||!Array.isArray(p)||p.length<=definition.offset)return null;
  const value=p[definition.offset];
  return isByte(value)&&value>=definition.min&&value<=definition.max?value:null;
 }
 function edit(hw,part,field,value,connected,busy){
  const def=FIELDS[field];
  if(!def||!Number.isInteger(part)||part<0||part>=16)throw Error('Campo ou parte desconhecida.');
  if(!connected)throw Error('USB-MIDI desconectado: o instrumento não será alterado.');
  if(busy)throw Error('Aguarde a leitura ou a edição MIDI anterior.');
  if(!hw||!Array.isArray(hw['setup:0'])||hw['setup:0'][0]!==1)throw Error('Leia o XPS-10 em modo Performance antes de editar.');
  if(observed(hw,part,field)===null)throw Error('Parâmetro não confirmado por SysEx. Faça uma nova leitura.');
  if(!Number.isInteger(value)||value<def.min||value>def.max)throw Error('Valor fora da faixa oficial.');
  if(observed(hw,part,field)===value)return null;
  return [{section:'part',index:part,offset:def.offset,value}];
 }
 function build(container,device){
  if(!container)return null;
  let hw={},connected=false,busy=false,pending=false,parameter='level',page=0;
  const document=container.ownerDocument;
  const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const header=make('div','gx-matrix-head');
  const title=make('div','gx-matrix-title');
  title.append(make('strong',null,'PERFORMANCE · 16 PARTES'),make('small',null,'Parâmetros temporários por parte, sem gravar USER'));
  const read=make('button',null,'↻ Ler XPS-10');read.type='button';
  const undo=make('button',null,'↶ Desfazer última edição');undo.type='button';
  read.onclick=()=>{pending=false;device.read?.();};
  undo.onclick=()=>device.undo?.();
  header.append(title,read,undo);
  const toolbar=make('div','gx-matrix-toolbar');
  const label=make('label',null,'Controle');
  const select=make('select');select.setAttribute('aria-label','Parâmetro da Performance');
  for(const [key,info] of Object.entries(FIELDS)){const op=make('option',null,info.name);op.value=key;select.append(op);}
  label.append(select);
  const pages=make('div','gx-matrix-pages'),p1=make('button',null,'Partes 1–8'),p2=make('button',null,'Partes 9–16');
  for(const b of [p1,p2])b.type='button';
  pages.append(p1,p2);toolbar.append(label,pages);
  const hint=make('p','gx-matrix-info'),status=make('small','gx-matrix-status');
  status.setAttribute('role','status');
  const grid=make('div','gx-matrix-grid');
  container.replaceChildren(header,toolbar,hint,grid,status);
  function render(){
   const def=FIELDS[parameter];
   p1.classList.toggle('on',page===0);p2.classList.toggle('on',page===1);
   read.disabled=busy||!connected;undo.disabled=busy||!connected;
   hint.textContent=def.tip+' · Só enviar quando houver leitura SysEx da parte. Ao alterar, o Grauê relê o teclado para conferir.';
   grid.replaceChildren();
   for(let part=page*8;part<page*8+8;part++){
    const p=hw['part:'+part],value=observed(hw,part,parameter),card=make('div','gx-matrix-strip');
    const name=make('strong',null,'Parte '+(part+1));
    const channel=make('small',null,Array.isArray(p)&&isByte(p[0])?'MIDI CH '+(p[0]+1):'Não lida');
    const out=make('output',null,value===null?'—':String(parameter==='mfx'?value+1:value));
    const slider=make('input');slider.type='range';slider.min=String(def.min);slider.max=String(def.max);slider.step='1';slider.value=String(value===null?def.min:value);
    slider.setAttribute('aria-label',def.name+' da parte '+(part+1));
    slider.disabled=value===null||!connected||busy||pending||hw['setup:0']?.[0]!==1;
    slider.oninput=()=>{out.textContent=String(parameter==='mfx'?Number(slider.value)+1:slider.value);};
    slider.onchange=()=>{
     try{
      const instruction=edit(hw,part,parameter,Number(slider.value),connected,busy);
      if(!instruction)return;
      if(typeof device.apply!=='function')throw Error('Ponte de edição MIDI indisponível.');
      // Prevent repeated edits until native readback updates the last observed snapshot.
      pending=true;slider.disabled=true;status.textContent='Enviando '+def.name+' da parte '+(part+1)+'; aguardando confirmação do XPS-10…';
      device.apply(instruction);
     }catch(err){pending=false;render();status.textContent=err.message;}
    };
    card.append(name,channel,out,slider);grid.append(card);
   }
   if(!connected)status.textContent='USB-MIDI desconectado — somente consulta.';
   else if(hw['setup:0']?.[0]!==1)status.textContent='Aguardando leitura em modo Performance.';
   else if(!Array.isArray(hw['part:'+page*8]))status.textContent='Parte não lida. Use “Ler XPS-10”.';
  }
  select.onchange=()=>{parameter=select.value;render();};
  p1.onclick=()=>{page=0;render();};p2.onclick=()=>{page=1;render();};
  function receive(kind,data){
   if(kind==='xpsConnection'){connected=!!data;if(!connected)pending=false;render();}
   if(kind==='hardwareBusy'){busy=!!data;render();}
   if(kind==='hardware'||kind==='hardwarePhysical'){pending=false;hw=data&&typeof data==='object'?data:{};render();}
   if(kind==='hardwareReset'){hw={};busy=false;pending=false;render();}
  }
  render();
  return {receive,render,getState:()=>({connected,busy,parameter,page})};
 }
 const api={FIELDS,observed,edit,build};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(global){global.GrauePerformanceMatrix=api;
  // ux-v2.js has already constructed the visual shell by the time this loads.
  const container=global.document?.getElementById('gx-performance-matrix');
  if(container){
   const device={
    read:()=>global.Native?.readHardware?.(),
    undo:()=>global.Native?.undoHardware?.(),
    apply:items=>global.Native?.editHardware?.(JSON.stringify(items))
   };
   const mounted=build(container,device);
   const prior=global.receive;
   global.receive=(kind,data)=>{if(typeof prior==='function')prior(kind,data);mounted.receive(kind,data);};
  }
 }
})(typeof window!=='undefined'?window:null);
