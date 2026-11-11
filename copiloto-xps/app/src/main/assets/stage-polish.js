'use strict';
/* Presentation only: retain existing controls and MIDI callbacks. */
(()=>{
 const shell=document.getElementById('gx-shell');if(!shell)return;
 const stage=shell.querySelector('[data-gx-screen="stage"]'),settings=shell.querySelector('[data-gx-screen="settings"] .gx-settings');
 const palettes={mint:['Verde','#9aebc6','#173526'],blue:['Azul','#9abafa','#142b49'],amber:['Âmbar','#f4cd83','#3b2a0f'],rose:['Rosa','#f3a8c1','#3c1d2d']};
 const applyPalette=key=>{const value=palettes[key]||palettes.mint;shell.dataset.palette=palettes[key]?key:'mint';document.body.style.setProperty('--gx-mint',value[1]);document.body.style.setProperty('--gx-accent-ink',value[2]);document.body.style.setProperty('--accent',value[1]);};
 const initial=typeof saved!=='undefined'?saved.colorPalette:'mint';applyPalette(initial);
 if(settings){const panel=document.createElement('section');panel.className='gx-panel gx-palette-panel';const title=document.createElement('h3');title.textContent='Paleta de cores';const choices=document.createElement('div');choices.className='gx-palette-choices';choices.setAttribute('role','group');choices.setAttribute('aria-label','Cor de destaque');
 for(const [key,[name,color]] of Object.entries(palettes)){const b=document.createElement('button');b.type='button';b.textContent=name;b.style.setProperty('--swatch',color);b.dataset.palette=key;b.setAttribute('aria-pressed',String(shell.dataset.palette===key));b.onclick=()=>{applyPalette(key);choices.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));if(typeof saved!=='undefined'){saved.colorPalette=key;if(typeof persist==='function')persist();}};choices.append(b);}
 panel.append(title,choices);settings.prepend(panel);}
 if(!stage)return;
 const tools=document.createElement('div');tools.className='gx-stage-tool-grid';tools.setAttribute('role','group');tools.setAttribute('aria-label','Ferramentas do Palco');
 const dialog=document.createElement('dialog');dialog.className='gx-tool-dialog';dialog.id='gx-stage-tool-dialog';dialog.setAttribute('aria-labelledby','gx-tool-title');
 const head=document.createElement('div');head.className='gx-tool-heading';const title=document.createElement('h2');title.id='gx-tool-title';const close=document.createElement('button');close.type='button';close.textContent='Fechar ✕';close.onclick=()=>dialog.close();head.append(title,close);dialog.append(head);shell.append(dialog);
 let lastButton=null;const entries=[];
 function open(entry){for(const e of entries)e.node.hidden=e!==entry;entry.node.open=true;title.textContent=entry.title;lastButton=entry.button;if(!dialog.open)dialog.showModal();}
 const names={40:'Metrônomo',50:'Favoritos',60:'Jarvis',70:'Acorde',80:'Notas',90:'Partes',100:'Leitura USB'};
 for(const node of [...stage.querySelectorAll(':scope > .gx-disclosure')]){const key=node.dataset.layoutOrder;if(!names[key])continue;const button=document.createElement('button');button.type='button';button.textContent=names[key];button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);if(key==='90'||key==='100')button.className='gx-stage-prep-only';const entry={node,button,title:node.querySelector('summary').textContent};entries.push(entry);button.onclick=()=>open(entry);node.classList.add('gx-tool-content');node.hidden=true;dialog.append(node);tools.append(button);}
 if(entries.length){stage.append(tools);const favorites=entries.find(e=>e.node.dataset.layoutOrder==='50');document.getElementById('gx-show-favorites')?.addEventListener('click',()=>{if(favorites)open(favorites);});}
 dialog.addEventListener('close',()=>{lastButton?.focus();});
 // Close presentation panels on navigation; never stop/start musical engines here.
 shell.querySelectorAll('[data-gx-tab]').forEach(b=>b.addEventListener('click',()=>{if(dialog.open)dialog.close();}));
})();
