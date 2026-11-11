'use strict';
/* Reader presentation only. Reuse original score, scrolling and transpose nodes. */
(function(scope){
 const fontSize=value=>Number.isFinite(Number(value))?Math.max(14,Math.min(30,Math.round(Number(value)))):18;
 function mount(doc,preferences={}){
  const shell=doc.getElementById('gx-shell'),screen=shell?.querySelector('[data-gx-screen="repertoire"]');if(!screen)return;
  const q=s=>screen.querySelector(s),id=k=>doc.getElementById(k),view=q('.gx-rep-view'),paper=q('.gx-paper'),actions=q('.gx-paper-actions'),library=q('.gx-rep-library');
  if(!view||!paper)return;
  const wrap=(node,title,cls)=>{if(!node)return null;const d=doc.createElement('details'),s=doc.createElement('summary');d.className=cls;s.textContent=title;node.parentNode.insertBefore(d,node);d.append(s,node);return d;};
  const libraryDetails=wrap(library,'Músicas · buscar e escolher','gx-repertoire-library');if(libraryDetails)libraryDetails.open=true;
  wrap(actions,'Importar, salvar e preparar teclado','gx-repertoire-preparation');
  const tools=doc.createElement('div');tools.className='gx-reader-tools';tools.setAttribute('aria-label','Controles de leitura');
  const typography=doc.createElement('div');typography.className='gx-reader-type';
  function button(text,label){const b=doc.createElement('button');b.type='button';b.textContent=text;b.setAttribute('aria-label',label);return b;}
  const smaller=button('A−','Diminuir fonte da cifra'),larger=button('A+','Aumentar fonte da cifra'),output=doc.createElement('output'),focus=button('Focar cifra','Focar cifra');
  output.setAttribute('aria-live','polite');focus.setAttribute('aria-pressed','false');
  typography.append(smaller,output,larger);tools.append(typography);
  const transpose=q('.gx-cifra-shift');if(transpose)tools.append(transpose);
  tools.append(focus);view.insertBefore(tools,paper);
  const scroll=q('.gx-scroll-controls');if(scroll)view.insertBefore(scroll,paper);
  let size=preferences.size==null?18:fontSize(preferences.size),focused=false;
  function resize(value,save){size=fontSize(value);screen.style.setProperty('--gx-repertoire-font',size+'px');output.textContent=size+' px';smaller.disabled=size<=14;larger.disabled=size>=30;if(save)preferences.save?.(size);}
  smaller.onclick=()=>resize(size-2,true);larger.onclick=()=>resize(size+2,true);resize(size,false);
  function toggle(value){focused=value;screen.classList.toggle('gx-reader-focused',focused);focus.setAttribute('aria-pressed',String(focused));focus.textContent=focused?'Sair do foco':'Focar cifra';}
  focus.onclick=()=>toggle(!focused);
  doc.addEventListener('keydown',e=>{if(e.key==='Escape'&&focused){toggle(false);focus.focus();}});
  return {resize,toggle,smaller,larger,focus,output,libraryDetails};
 }
 const api={fontSize,mount};if(typeof module!=='undefined')module.exports=api;
 if(scope&&typeof document!=='undefined')mount(document,{size:typeof saved!=='undefined'?saved.repertoireFontSize:null,save:n=>{if(typeof saved!=='undefined'){saved.repertoireFontSize=n;if(typeof persist==='function')persist();}}});
})(typeof window!=='undefined'?window:null);
