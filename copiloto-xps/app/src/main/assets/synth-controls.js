'use strict';
/* Instrument-style controls over the same reviewed numeric fields. No MIDI transport. */
(function(scope){
 const booleanLabel=d=>d.min===0&&d.max===1&&(/Switch|Retrigger|Tempo Sync/.test(d.label)||/Tone Receive (Bender|Expression|Hold-1)$/.test(d.label));
 function kind(d){if(d.choices||d.allowed||d.width>1&&d.max>1024)return 'number';if(booleanLabel(d))return 'switch';if(/Pan|Coarse|Fine Tune|Analog Feel|Portamento Time|LFO[12] (Rate|Offset|Detune)/.test(d.label))return 'knob';return 'fader';}
 function decorate(input,d){
  if(!input||input.type!=='number'||!input.parentNode||input.dataset?.synthDecorated)return null;
  const mode=kind(d);if(mode==='number')return null;
  const doc=input.ownerDocument,card=input.parentNode,root=doc.createElement('div');root.className='gx-instrument-control gx-instrument-'+mode;root.setAttribute('data-control-kind',mode);
  if(input.dataset)input.dataset.synthDecorated='true';input.classList.add('gx-midi-number');card.classList.add('gx-instrument-card');card.setAttribute('data-instrument-kind',mode);
  const original=input.onchange;let control,indicator=null;
  if(mode==='switch'){
   control=doc.createElement('button');control.type='button';control.className='gx-synth-switch';control.setAttribute('role','switch');control.setAttribute('aria-label',d.label);root.append(control);
   control.onclick=()=>{if(control.disabled)return;input.value=Number(input.value)===1?'0':'1';input.onchange();};
  }else{
   if(mode==='knob'){
    const ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 80 80');svg.setAttribute('aria-hidden','true');svg.classList.add('gx-knob-face');
    const arc=doc.createElementNS(ns,'path');arc.setAttribute('d','M16 61 A32 32 0 1 1 64 61');arc.setAttribute('fill','none');arc.setAttribute('stroke','#50545c');arc.setAttribute('stroke-width','2');svg.append(arc);
    for(const [r,fill,stroke] of [[27,'#17191d','#0b0c0e'],[24,'#34373c','#545861'],[19,'#282b30','#222429']]){const c=doc.createElementNS(ns,'circle');c.setAttribute('cx','40');c.setAttribute('cy','40');c.setAttribute('r',String(r));c.setAttribute('fill',fill);c.setAttribute('stroke',stroke);c.setAttribute('stroke-width','1');svg.append(c);}
    indicator=doc.createElementNS(ns,'line');indicator.setAttribute('x1','40');indicator.setAttribute('y1','19');indicator.setAttribute('x2','40');indicator.setAttribute('y2','30');indicator.setAttribute('stroke','#f2607d');indicator.setAttribute('stroke-width','3');indicator.setAttribute('stroke-linecap','round');svg.append(indicator);root.append(svg);
   }
   control=doc.createElement('input');control.type='range';control.min=String(d.min);control.max=String(d.max);control.step='1';control.className=mode==='knob'?'gx-knob-input':'gx-fader-input';control.setAttribute('aria-label',d.label+(mode==='knob'?' · knob':' · fader'));root.append(control);
   control.oninput=()=>{if(control.disabled)return;input.value=String(control.value);input.onchange();};
  }
  const readout=doc.createElement('output');readout.className='gx-control-readout';readout.setAttribute('aria-hidden','true');root.append(readout);
  function sync(){
   const v=Number(input.value),known=input.value!==''&&Number.isInteger(v)&&v>=d.min&&v<=d.max;
   control.disabled=!!input.disabled||!known;root.classList.toggle('gx-control-unread',!known);readout.textContent=known?(mode==='switch'?(v===1?'ON':'OFF'):String(v)):'—';
   if(mode==='switch'){control.textContent=known?(v===1?'ON':'OFF'):'—';control.setAttribute('aria-checked',String(known&&v===1));}
   else{control.value=known?String(v):String(d.min);if(indicator){indicator.setAttribute('visibility',known?'visible':'hidden');indicator.setAttribute('transform','rotate('+(known?(-135+270*(v-d.min)/(d.max-d.min)):0)+' 40 40)');}}
  }
  input.onchange=function(...args){sync();if(original)original.apply(this,args);};
  card.append(root);sync();return {control,sync,mode,root};
 }
 const api={kind,decorate};if(typeof module!=='undefined')module.exports=api;if(scope)scope.GraueSynthControls=api;
})(typeof window!=='undefined'?window:null);
