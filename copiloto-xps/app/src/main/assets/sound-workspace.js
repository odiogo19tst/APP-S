'use strict';
/* Presentation only. Reparent the existing controls; keep MIDI handlers and IDs. */
(()=>{
 const sound=document.getElementById('sound');if(!sound)return;
 const id=k=>document.getElementById(k),doc=sound.ownerDocument;
 sound.classList.add('sound-workspace');
 const heading=sound.querySelector('h2');if(heading)heading.textContent='Estúdio de sons';
 const groups=[['tones','1 · Timbre',['applyTone','applyPart']],['mix','2 · Ajustes',['apply','applyShape','layerParts','pad']],['effects','3 · Efeitos',['applyMfx','applyAmbience','mfxParameters']],['rhythm','4 · Ritmo',['applyArp','applyRhythm']],['scenes','5 · Guardar',['saveScene']]];
 const tabs=doc.createElement('div');tabs.className='sound-workspace-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Áreas do estúdio');
 sound.insertBefore(tabs,heading?.nextSibling||sound.firstChild);
 const panels=[],buttons=[];
 for(const [key,title,ids] of groups){
  const panel=doc.createElement('div');panel.id='sound-page-'+key;panel.className='sound-workspace-page';panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','sound-tab-'+key);sound.append(panel);panels.push(panel);
  const button=doc.createElement('button');button.type='button';button.id='sound-tab-'+key;button.textContent=title;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);tabs.append(button);buttons.push(button);
  for(const name of ids){const article=id(name)?.closest('article');if(article&&sound.contains(article)&&article.parentNode!==panel)panel.append(article);}
  button.onclick=()=>select(button);
  button.onkeydown=e=>{let n=buttons.indexOf(button);if(e.key==='ArrowRight')n=(n+1)%buttons.length;else if(e.key==='ArrowLeft')n=(n+buttons.length-1)%buttons.length;else if(e.key==='Home')n=0;else if(e.key==='End')n=buttons.length-1;else return;e.preventDefault();select(buttons[n]);buttons[n].focus();};
 }
 function select(button){buttons.forEach((b,i)=>{const on=b===button;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;panels[i].hidden=!on;});}
 window.GraueSoundWorkspace={open(key){const index=groups.findIndex(g=>g[0]===key);if(index<0)return false;select(buttons[index]);return true;}};
 select(buttons[0]);
 // Secondary part settings are available without extending the whole timbre list.
 const first=id('applyPart')?.closest('article'),bank=first?.querySelector('details');
 if(first&&bank){const details=doc.createElement('details'),summary=doc.createElement('summary');details.className='sound-part-options';summary.textContent='Volume, oitava, zona e banco MIDI';first.insertBefore(details,bank);details.append(summary);let next=details.nextSibling;while(next){const after=next.nextSibling;details.append(next);next=after;}const card=doc.createElement('article');card.id='sound-part-settings';card.append(details);id('sound-page-mix').prepend(card);}
 const back=id('gx-return'),nav=doc.querySelector('body > nav');if(back&&nav){nav.before(back);back.textContent='← Voltar ao Grauê';}
 // Native readbacks assign .value directly. Synchronize decoration only after the
 // existing receive/change handlers have completed, without dispatching edits.
 const widgets=new Map();
 function refresh(){
  if(!window.GraueSynthControls)return;
  for(const input of sound.querySelectorAll('input[type="number"]')){
   if(!input.closest('label')||!input.hasAttribute('min')||!input.hasAttribute('max'))continue;
   const label=input.parentNode.firstChild?.textContent||input.id;
   let widget=widgets.get(input);if(!widget){widget=window.GraueSynthControls.decorate(input,{label:/Panorama/.test(label)?'Tone Pan':label,min:Number(input.min),max:Number(input.max),width:1});if(widget)widgets.set(input,widget);}
   widget?.sync();
  }
  for(const input of widgets.keys())if(!input.isConnected)widgets.delete(input);
 }
 refresh();
 const prior=window.receive;window.receive=(type,data)=>{if(prior)prior(type,data);if(['hardware','hardwareReset','hardwareBusy','hardwarePhysical'].includes(type))refresh();};
 for(const key of ['hardwarePart','mfxUnit'])id(key)?.addEventListener('change',refresh);
})();
