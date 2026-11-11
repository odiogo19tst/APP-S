'use strict';
/* Presentation only: move existing controls, retain IDs/handlers, never emit MIDI. */
(()=>{
 const shell=document.getElementById('gx-shell');if(!shell)return;
 const doc=shell.ownerDocument,q=s=>shell.querySelector(s),id=s=>doc.getElementById(s);
 const paths={stage:'M4 18V7l8-3 8 3v11M8 18v-6h8v6M2 21h20',repertoire:'M8 3h11a2 2 0 0 1 2 2v16H8a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm0 0v18M12 8h5M12 12h5',sound:'M5 3v18M12 3v18M19 3v18M2 8h6M9 16h6M16 10h6',drums:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',more:'M4 6h16M4 12h16M4 18h16',play:'m8 5 11 7-11 7Z',pause:'M8 5v14M16 5v14',next:'m5 5 10 7-10 7ZM19 5v14',stop:'M6 6h12v12H6Z',star:'m12 3 3 6 6 1-4 5 1 6-6-3-6 3 1-6-4-5 6-1Z',usb:'M12 3v14a3 3 0 1 1-3-3M8 7l4-4 4 4M12 13h5v-3',settings:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M8 15v6'};
 function icon(name){const svg=doc.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');const p=doc.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',paths[name]||paths.more);svg.append(p);return svg;}
 function label(button,name,text){if(!button)return;const span=doc.createElement('span');span.textContent=text;button.replaceChildren(icon(name),span);button.setAttribute('aria-label',text);}
 function disclosure(node,title,order,extra=''){if(!node)return null;const d=doc.createElement('details');d.className='gx-disclosure '+extra;d.dataset.layoutOrder=String(order);const summary=doc.createElement('summary');summary.textContent=title;node.parentNode.insertBefore(d,node);d.append(summary,node);return d;}
 shell.classList.add('gx-layout-v3');
 const nav=q('.gx-nav'),menu=doc.createElement('details'),summary=doc.createElement('summary'),items=doc.createElement('div');
 menu.className='gx-more-menu';menu.id='gx-more-menu';summary.append(icon('more'));const moreText=doc.createElement('span');moreText.textContent='Mais';summary.append(moreText);items.className='gx-more-items';menu.append(summary,items);
 for(const [key,text] of [['stage','Palco'],['repertoire','Repertório'],['sound','Sons'],['drums','Pads']])label(q('[data-gx-tab="'+key+'"]'),key,text);
 for(const [key,text] of [['coach','Jarvis Musical'],['backups','Backups'],['settings','Ajustes']]){const button=q('[data-gx-tab="'+key+'"]');if(button){button.textContent=text;items.append(button);}}
 const refresh=id('gx-midi-refresh');if(refresh)items.append(refresh);
 nav?.append(menu);
 const updateNavigation=()=>{const active=q('[data-gx-tab].on');const moreActive=['coach','backups','settings'].includes(active?.dataset.gxTab);if(menu.classList.contains('gx-more-active')!==moreActive)menu.classList.toggle('gx-more-active',moreActive);shell.querySelectorAll('[data-gx-tab]').forEach(b=>b.setAttribute('aria-current',b===active?'page':'false'));};
 shell.querySelectorAll('[data-gx-tab]').forEach(button=>button.addEventListener('click',()=>{menu.open=false;updateNavigation();}));
 if(typeof MutationObserver!=='undefined')new MutationObserver(updateNavigation).observe(nav,{subtree:true,attributes:true,attributeFilter:['class']});updateNavigation();
 const gear=id('gx-open-settings');if(gear){gear.setAttribute('title','Ajustes');gear.replaceChildren(icon('settings'));}
 label(id('gx-unified-usb'),'usb','Conectar');
 const brand=q('.gx-brand small');if(brand)brand.textContent='COMPANHEIRO DE PALCO';
 label(id('gx-start'),'play','Seguir cifra');label(id('gx-pause'),'pause','Pausar');label(id('gx-next'),'next','Próxima');label(id('gx-panic'),'stop','Parar MIDI');label(id('gx-show-favorites'),'star','Favoritos');
 const rigInfo=id('gx-stage-rig-info');if(rigInfo){const d=doc.createElement('details'),s=doc.createElement('summary');d.className='gx-rig-details';s.textContent='Setup e conexão do teclado';rigInfo.parentNode.insertBefore(d,rigInfo);d.append(s);for(const key of ['gx-stage-rig-info','gx-stage-health','gx-stage-reapply-rig']){const el=id(key);if(el)d.append(el);}}
 const stage=q('[data-gx-screen="stage"]');
 const favorites=disclosure(stage?.querySelector('.gx-zone:not(.gx-stage-prep-only)'),'Favoritos do teclado',50,'gx-favorites-disclosure');
 disclosure(stage?.querySelector('.graue-metronome'),'Metrônomo',40);
 disclosure(stage?.querySelector('.gx-silent-advisor'),'Sugestões do Jarvis',60);
 disclosure(stage?.querySelector('.gx-assist'),'Acorde de apoio',70);
 disclosure(stage?.querySelector('.gx-played-feedback'),'O que estou tocando',80);
 disclosure(stage?.querySelector('.gx-stage-prep-only'),'Preparar timbres e camadas',90,'gx-stage-prep-only');
 disclosure(stage?.querySelector('.gx-stage-footer'),'Leitura do teclado',100,'gx-stage-prep-only');
 id('gx-show-favorites')?.addEventListener('click',()=>{if(favorites){favorites.open=true;favorites.scrollIntoView({behavior:'smooth',block:'start'});}});
 // Keep the loop transport immediately accessible; setup and help are secondary.
 const looper=q('.gx-midi-looper');if(looper){const options=doc.createElement('details'),s=doc.createElement('summary');options.className='gx-loop-options';s.textContent='BPM, compassos e instruções';options.append(s);const settings=looper.querySelector('.loop-settings'),help=looper.querySelector(':scope>small');if(settings)options.append(settings);const secondary=doc.createElement('div');secondary.className='gx-loop-secondary';for(const key of ['loop-mute','loop-clear']){const b=id(key);if(b)secondary.append(b);}options.append(secondary);if(help)options.append(help);looper.append(options);}
 // Existing sound editor buttons keep their original click handlers and native bindings.
 const soundNav=q('.gx-sound-nav');if(soundNav){const chooser=disclosure(soundNav,'Escolher editor de sons',0,'gx-sound-chooser');const s=chooser.querySelector('summary');const wide=()=>typeof window.matchMedia==='function'&&window.matchMedia('(min-width:980px)').matches;chooser.open=wide();const updateChooser=()=>{const selected=soundNav.querySelector('button.on');if(selected)s.textContent='Editor · '+selected.textContent.trim();};soundNav.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{updateChooser();chooser.open=wide();}));if(typeof MutationObserver!=='undefined')new MutationObserver(updateChooser).observe(soundNav,{subtree:true,attributes:true,attributeFilter:['class']});updateChooser();}
 const headings={repertoire:['Seu repertório','Cifras e configurações prontas para tocar.'],sound:['Sons e Performances','Encontre seu timbre. Prepare cada detalhe.'],drums:['Ritmo e textura','Bateria, pads e loops no seu setup.'],coach:['Jarvis Musical','Um apoio para preparar e tocar.'],backups:['Seus backups','Repertório e cópias do Roland em um só lugar.'],settings:['Seu setup','Conexão, preferências e inteligência musical.']};
 for(const [key,[title,text]] of Object.entries(headings)){const screen=q('[data-gx-screen="'+key+'"]');if(!screen)continue;const h=doc.createElement('header'),name=doc.createElement('h1'),note=doc.createElement('p');h.className='gx-page-heading';name.textContent=title;note.textContent=text;h.append(name,note);screen.prepend(h);}
 doc.addEventListener('click',event=>{if(menu.open&&!menu.contains(event.target))menu.open=false;});
 doc.addEventListener('keydown',event=>{if(event.key==='Escape'){menu.open=false;summary.focus?.();}});
 let midiConnected=false;shell.dataset.connection='offline';const prior=window.receive;
 window.receive=(type,data)=>{if(prior)prior(type,data);if(type==='xpsConnection'){midiConnected=!!data;shell.dataset.connection=midiConnected?'midi':'offline';}if(type==='hardwareReset')shell.dataset.connection=midiConnected?'midi':'offline';if((type==='hardware'||type==='hardwarePhysical')&&midiConnected&&Number(data?.validSysexPackets)>0)shell.dataset.connection='verified';};
})();
