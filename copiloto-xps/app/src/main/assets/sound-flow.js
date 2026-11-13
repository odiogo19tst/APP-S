'use strict';
/* Organize existing tools by task. Navigation and field feedback never send MIDI. */
(()=>{
 const id=k=>document.getElementById(k),sound=id('sound');if(!sound)return;
 const doc=sound.ownerDocument,make=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const tabs=sound.querySelector('.sound-workspace-tabs');if(!tabs)return;
 const context=make('article',null,'sound-flow-context');context.id='sound-flow-context';
 context.append(make('h3','Antes de ajustar · confira a parte'));
 const tone=id('applyTone')?.closest('article');
 // Keep the real selectors, callbacks and readback nodes shared by all five steps.
 for(const key of ['readHardware','performanceMode','undoHardware']){const node=id(key);if(node)context.append(node);}
 if(id('hardwareStatus'))context.append(id('hardwareStatus'));
 const part=id('hardwarePart')?.closest('label');if(part)context.append(part);
 if(id('partSummary'))context.append(id('partSummary'));
 sound.insertBefore(context,tabs);
 const response=make('p','Ajuste os valores, toque em Aplicar no bloco e ouça no teclado.','sound-flow-response');response.id='sound-flow-response';response.setAttribute('role','status');response.setAttribute('aria-live','polite');
 context.append(response);
 // The two ambience controls belong to their own card, after the MFX card.
 const effects=id('sound-page-effects'),ambience=id('ambienceCard');if(effects&&ambience)effects.append(ambience);
 const parameters=id('mfxParameters')?.closest('article');
 if(parameters){const details=make('details',null,'sound-flow-details');details.append(make('summary','Ajustes detalhados do efeito · opcional'));parameters.parentNode.insertBefore(details,parameters);details.append(parameters);}
 if(effects&&ambience)effects.insertBefore(ambience,effects.querySelector('.sound-flow-details'));
 const captions={tones:'Escolha a parte acima e depois o timbre. Para combinar dois sons, configure as partes 1 e 2 e siga para Ajustes.',mix:'Monte as camadas ou divida o teclado. Acerte volumes e a resposta do som. Os valores ficam preparados até tocar em Aplicar no bloco correspondente.',effects:'Escolha MFX 1, 2 ou 3 e o tipo de efeito. Aplique e aguarde a leitura; depois ajuste a ambiência ou abra os detalhes.',rhythm:'Configure o arpejador e os ritmos do XPS-10. Para tocar samples e loops, use a aba Pads ou o looper no Palco.',scenes:'Confira o som antes de guardar. Cenas salvam os controles no celular; para manter a Performance no XPS-10 após desligar, use WRITE no teclado.'};
 for(const [key,text] of Object.entries(captions)){
  const panel=id('sound-page-'+key);if(!panel)continue;
  panel.insertBefore(make('p',text,'sound-flow-help'),panel.firstChild);
  const footer=make('div',null,'sound-flow-step-actions'),keys=Object.keys(captions),index=keys.indexOf(key);
  for(const [label,next] of [['← Anterior',keys[index-1]],['Próximo →',keys[index+1]]])if(next){const b=make('button',label);b.type='button';b.onclick=()=>{window.GraueSoundWorkspace?.open(next);tabs.scrollIntoView({behavior:'smooth',block:'start'});};footer.append(b);}
  panel.append(footer);
 }
 if(id('saveScene'))id('saveScene').textContent='Salvar cena de controles no celular';
 if(id('applyMfx'))id('applyMfx').textContent='Aplicar tipo e níveis do MFX';
 if(id('applyAmbience'))id('applyAmbience').textContent='Aplicar chorus e reverb';
 if(tone?.querySelector('h3'))tone.querySelector('h3').textContent='Escolher o timbre desta parte';
 // A field edit is not a hardware acknowledgement. Preserve the actual native
 // response separately; only readback refreshes the field-edit hints.
 const notices=new Map();
 sound.addEventListener('input',event=>{
  const target=event.target;if(!target.matches('input,select')||target===id('hardwarePart')||target===id('mfxUnit')||['toneSearch','sceneName'].includes(target.id))return;
  const card=target.closest('article');if(!card||card===context)return;
  let note=notices.get(card);if(!note){note=make('p',null,'sound-flow-prepared');note.setAttribute('role','status');card.append(note);notices.set(card,note);}
  note.textContent='Valores preparados neste bloco. Use Aplicar para enviar ao teclado.';
 });
 const sourceStatus=id('status');
 if(sourceStatus&&typeof MutationObserver!=='undefined')new MutationObserver(()=>{response.textContent=sourceStatus.textContent;}).observe(sourceStatus,{childList:true,subtree:true,characterData:true});
 const prior=window.receive;window.receive=(type,data)=>{
  if(prior)prior(type,data);
  if(type==='status')response.textContent=String(data||'');
  if(type==='hardware'||type==='hardwareReset'){
   for(const note of notices.values())note.textContent=type==='hardware'?'Campos atualizados pela leitura. Confira a resposta do teclado acima.':'Conexão alterada. Leia o teclado antes de aplicar.';
  }
 };
 // Use the same navigation buttons, now ordered by the musician's workflow.
 const nav=doc.querySelector('.gx-sound-nav');if(nav){
  const groups=[['1 · Escolher o som',['performance','tones','favorites']],['2 · Montar as partes',['parts','mixer','split']],['3 · Ajustar o som',['effects','arpeggio']]];
  for(const [title,keys] of groups){nav.append(make('strong',title,'sound-flow-group'));for(const key of keys){const b=nav.querySelector('[data-gx-sound="'+key+'"]');if(b)nav.append(b);}}
  const advanced=make('details',null,'sound-flow-advanced');advanced.append(make('summary','Avançado · edição completa'));
  for(const key of ['matrix','patch']){const b=nav.querySelector('[data-gx-sound="'+key+'"]');if(b)advanced.append(b);}
  if(id('gx-advanced'))advanced.append(id('gx-advanced'));nav.append(advanced);
 }
 const savePage=id('sound-page-scenes'),repertoire=doc.querySelector('[data-gx-tab="repertoire"]');
 if(savePage&&repertoire){const link=make('button','Vincular à música no Repertório');link.type='button';link.onclick=()=>{id('gx-return')?.click();repertoire.click();id('gx-song-rig')?.scrollIntoView({behavior:'smooth',block:'start'});};savePage.insertBefore(link,savePage.firstChild);}
})();
