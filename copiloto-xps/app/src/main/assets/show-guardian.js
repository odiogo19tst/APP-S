'use strict';
/* Grauê XPS: session preparation, reversible local settings vault and real-tone suggestions.
 * Does not issue MIDI during rendering, saving, selecting a song or reconnection.
 */
(()=>{
 const model=window.GraueShowGuardianModel,stageApi=window.GraueStageUX;
 const stage=document.querySelector('#gx-shell [data-gx-screen="stage"]');
 if(!model||!stage||!stageApi)return;
 const doc=stage.ownerDocument;
 const make=(tag,text,cls)=>{const el=doc.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el;};
 const panel=make('details',null,'gx-guardian');panel.id='gx-guardian';
 const summary=make('summary','✓ Preparar culto · Cofre de Performances');
 panel.append(summary);
 const intro=make('p','Pré-voo do repertório e USB, versões locais da Performance e sugestões de arranjo. Nenhuma dessas funções grava na memória USER do Roland.','gx-guardian-intro');
 panel.append(intro);
 const columns=make('div',null,'gx-guardian-columns');panel.append(columns);
 const left=make('section',null,'gx-guardian-section'),right=make('section',null,'gx-guardian-section'),bottom=make('section',null,'gx-guardian-section gx-guardian-suggest');
 columns.append(left,right,bottom);
 const heading=(parent,label)=>parent.append(make('h3',label));
 const btn=(parent,label,id)=>{const b=make('button',label);b.type='button';b.id=id;parent.append(b);return b;};
 const status=(parent,id,text)=>{const p=make('p',text,'gx-guardian-message');p.id=id;p.setAttribute('role','status');p.setAttribute('aria-live','polite');parent.append(p);return p;};
 heading(left,'Pré-voo do culto');
 const preflightActions=make('div',null,'gx-guardian-actions');left.append(preflightActions);
 const checkButton=btn(preflightActions,'Conferir tudo','gx-guardian-check');
 const readButton=btn(preflightActions,'Ler XPS-10','gx-guardian-read');
 const checkList=make('ul',null,'gx-guardian-checks');left.append(checkList);
 const auditMessage=status(left,'gx-guardian-audit-status','Conferência somente leitura; inicie antes de tocar.');
 const songList=make('div',null,'gx-guardian-songlist');left.append(songList);
 heading(right,'Cofre de parâmetros');
 right.append(make('p','Guarda até 8 versões dos ajustes de partes lidos por SysEx. Não substitui o backup SVD, Patches ou favoritos físicos.'));
 const vaultActions=make('div',null,'gx-guardian-actions');right.append(vaultActions);
 const captureButton=btn(vaultActions,'Salvar versão atual','gx-guardian-capture');
 const exportButton=btn(vaultActions,'Exportar cofre JSON','gx-guardian-export');
 const vaultLabel=make('label','Versões locais');right.append(vaultLabel);
 const vaultPicker=make('select');vaultPicker.id='gx-guardian-vault-select';vaultLabel.append(vaultPicker);
 const compareActions=make('div',null,'gx-guardian-actions');right.append(compareActions);
 const compareButton=btn(compareActions,'Comparar','gx-guardian-compare');
 const applyButton=btn(compareActions,'Reaplicar temporariamente','gx-guardian-apply');applyButton.disabled=true;
 const deleteButton=btn(compareActions,'Excluir versão','gx-guardian-delete');
 const vaultMessage=status(right,'gx-guardian-vault-status','Salve após uma leitura SysEx atual, com a Performance original selecionada.');
 heading(bottom,'Arranjo assistido');
 bottom.append(make('p','Sugestões locais sobre timbres existentes: não analisam o áudio real e nunca enviam MIDI automaticamente.'));
 const suggestActions=make('div',null,'gx-guardian-actions');bottom.append(suggestActions);
 const suggestButton=btn(suggestActions,'Sugerir Dual','gx-guardian-suggest');
 const openRigButton=btn(suggestActions,'Editar no Dual/Split','gx-guardian-open-rig');openRigButton.disabled=true;
 const suggestMessage=status(bottom,'gx-guardian-suggest-status','Selecione uma música do repertório para receber uma proposta de timbres.');
 const toneList=make('div',null,'gx-guardian-tone-list');bottom.append(toneList);
 const area=stage.querySelector('.gx-stage-summary');
 if(area)area.insertAdjacentElement('afterend',panel);else stage.prepend(panel);
 const prefs=typeof saved==='object'&&saved?saved:{};
 let proposal=null,pendingRestore=null,lastAudit=null;
 const show=(node,txt)=>{node.textContent=String(txt||'');};
 const current=()=>stageApi.state();
 const vault=()=>Array.isArray(prefs.guardianVault)?prefs.guardianVault:[];
 const activeSnapshot=()=>vault().find(s=>s.id===vaultPicker.value);
 const saveData=(next,prior)=>{prefs.guardianVault=next;try{if(typeof persist!=='function'||persist()===false)throw Error('Android não confirmou o salvamento.');return true;}
 catch(e){prefs.guardianVault=prior;show(vaultMessage,'Salvamento não confirmado; versões anteriores preservadas. '+e.message);return false;}};
 function renderVault(){
  const selected=vaultPicker.value;
  vaultPicker.replaceChildren();
  for(const item of vault()){
   const option=make('option',item.title+' · '+new Date(item.createdAt).toLocaleString('pt-BR')+' · '+item.partCount+' parte(s)');
   option.value=item.id;vaultPicker.append(option);
  }
  if(selected&&vault().some(s=>s.id===selected))vaultPicker.value=selected;
  pendingRestore=null;applyButton.disabled=true;
  const has=vault().length>0;compareButton.disabled=!has;deleteButton.disabled=!has;exportButton.disabled=!has;
 }
 function renderAudit(){
  const st=current(),result=model.audit({connected:st.connected,hw:st.hw,
    song:typeof song!=='undefined'?song:null,songs:typeof songs!=='undefined'?songs:[],
    setlist:prefs.louveSetlist,storeImports:[]});
  lastAudit=result;
  checkList.replaceChildren();
  for(const item of result.checks){
   const li=make('li',(item.pass?'✓ ':'! ')+item.label);li.className=item.pass?'gx-guardian-good':'gx-guardian-warn';checkList.append(li);
  }
  show(auditMessage,result.ready?'Conferência do aplicativo aprovada. Confira também áudio e equipamento físico.':
    'Há pendências. Confira os itens acima antes de entrar em Ao Vivo.');
  songList.replaceChildren();
  const entries=Array.isArray(songs)?songs:[],set=prefs.louveSetlist;
  const listed=window.GraueLouve?.orderedIndexes?window.GraueLouve.orderedIndexes(entries,set):entries.map((_,i)=>i);
  for(const i of listed.slice(0,20)){
   const entry=entries[i],meta=window.GraueLouve?.songMeta?.(entry,set);
   const row=make('div');row.className='gx-guardian-song';
   const pos=meta?meta.order+'. ':'';
   const verified=!!entry?.keyboardSetup;
   row.append(make('span',pos+String(entry?.title||'Música sem nome').slice(0,80)));
   row.append(make('small',(meta?.key?'Tom '+meta.key+' · ':'')+(verified?'Performance vinculada':'SEM PERFORMANCE')));
   songList.append(row);
  }
  if(entries.length>20)songList.append(make('small','Exibindo as primeiras 20 músicas. Veja o restante no Repertório.'));
 }
 function capture(){
  const st=current();if(!st.connected){show(vaultMessage,'Conecte o USB e leia a Performance antes de salvar.');return;}
  try{
   const snap=model.snapshot(st.hw,model.name(st.hw)||'Performance',Date.now());
   const old=vault(),next=model.appendVault(old,snap);
   if(saveData(next,old)){renderVault();vaultPicker.value=snap.id;show(vaultMessage,'Versão salva no celular: '+snap.title+'. Não foi enviado MIDI nem criado SVD.');}
  }catch(e){show(vaultMessage,e.message);}
 }
 function compare(){
  pendingRestore=null;applyButton.disabled=true;
  const snap=activeSnapshot();if(!snap){show(vaultMessage,'Selecione uma versão salva.');return;}
  const st=current();if(!st.connected){show(vaultMessage,'USB desconectado: nenhuma comparação possível.');return;}
  try{
   const result=model.compare(snap,st.hw);
   if(!result.safe)throw Error('Comando externo à lista de partes permitidas.');
   if(!result.changed){show(vaultMessage,'Os parâmetros permitidos já correspondem ao cofre. Nenhuma alteração necessária.');return;}
   pendingRestore={id:snap.id,source:snap.source,expected:JSON.stringify(result.commands)};
   applyButton.disabled=false;
   show(vaultMessage,result.changed+' parâmetro(s) diferente(s) nas '+result.totalParts+' parte(s). Reaplicação opcional, temporária, após confirmação. Não usa WRITE USER.');
  }catch(e){show(vaultMessage,'Comparação bloqueada: '+e.message);}
 }
 function apply(){
  const st=current(),snap=activeSnapshot();
  if(!snap||!pendingRestore||pendingRestore.id!==snap.id||!st.connected){
   applyButton.disabled=true;show(vaultMessage,'Seleção ou conexão alterada. Compare novamente.');return;}
  if(doc.getElementById('gx-shell')?.classList.contains('gx-live-mode')){
   show(vaultMessage,'Saia do Modo Ao Vivo antes de reaplicar ajustes.');return;}
  try{
   const result=model.compare(snap,st.hw);
   if(snap.source!==pendingRestore.source||JSON.stringify(result.commands)!==pendingRestore.expected)
     throw Error('O teclado mudou desde a comparação. Refaça a leitura e compare.');
   if(!result.commands.length){show(vaultMessage,'O teclado já corresponde à versão.');return;}
   if(!window.Native||typeof window.Native.editHardware!=='function')throw Error('Ponte MIDI indisponível.');
   if(!confirm('Reaplicar '+result.commands.length+' parâmetros das PARTES na Performance atual, sem WRITE USER? Confira no XPS-10 após o envio.'))return;
   window.Native.editHardware(JSON.stringify(result.commands));
   show(vaultMessage,'Edição temporária solicitada. Confirme a releitura SysEx antes de salvar no instrumento. Backup SVD não foi alterado.');
  }catch(e){show(vaultMessage,'Sem envio MIDI: '+e.message);}
  finally{pendingRestore=null;applyButton.disabled=true;}
 }
 function suggest(){
  const currentSong=typeof song!=='undefined'?song:null;
  const known=window.ToneLibrary?.list?.()||window.XPS_TONES||[];
  const recommendation=model.recommend(currentSong,known);
  proposal=recommendation.rig;openRigButton.disabled=!proposal;
  show(suggestMessage,recommendation.label+' '+recommendation.method);
  toneList.replaceChildren();
  for(const t of recommendation.options.slice(0,4))toneList.append(make('span',t.code+' · '+t.name,'gx-guardian-tone'));
  if(proposal)toneList.append(make('strong','Proposta Dual: '+proposal.main.name+' + '+proposal.second.name));
 }
 checkButton.onclick=renderAudit;
 readButton.onclick=()=>{
  const st=current();if(!st.connected){show(auditMessage,'USB desconectado. Conecte o teclado e confira novamente.');return;}
  if(!window.Native?.readHardware){show(auditMessage,'Leitura SysEx indisponível nesta versão do APK.');return;}
  window.Native.readHardware();
  show(auditMessage,'Leitura solicitada ao Roland; confira o resultado após a resposta SysEx.');
 };
 captureButton.onclick=capture;
 exportButton.onclick=()=>{
  try{
   if(!vault().length)throw Error('O cofre está vazio.');
   if(typeof window.Native?.exportFile!=='function')throw Error('Exportação exige o Android Grauê.');
   const data={kind:'GRAUE_XPS_TEMPORARY_PART_SNAPSHOTS',version:1,createdAt:new Date().toISOString(),
    warning:'Não é um SVD nem um backup de Patch. Contém parâmetros de partes para restauração temporária confirmada.',
    versions:vault().map(model.normalizeSnapshot)};
   window.Native.exportFile(JSON.stringify(data,null,2));
   show(vaultMessage,'Exportação solicitada ao Android. Confira o arquivo escolhido.');
  }catch(e){show(vaultMessage,e.message);}
 };
 vaultPicker.onchange=()=>{pendingRestore=null;applyButton.disabled=true;show(vaultMessage,'Versão selecionada. Compare com a Performance lida para revisar as diferenças.');};
 compareButton.onclick=compare;applyButton.onclick=apply;
 deleteButton.onclick=()=>{
  const entry=activeSnapshot();if(!entry)return;
  if(!confirm('Excluir apenas a versão local '+entry.title+'? O teclado e os backups SVD não serão alterados.'))return;
  const previous=vault(),next=previous.filter(x=>x.id!==entry.id);
  if(saveData(next,previous)){renderVault();show(vaultMessage,'Versão local excluída.');}
 };
 suggestButton.onclick=suggest;
 openRigButton.onclick=()=>{
  if(!proposal)return;
  if(doc.getElementById('gx-shell')?.classList.contains('gx-live-mode')){
   show(suggestMessage,'Saia do Ao Vivo para editar Dual/Split.');return;}
  if(typeof window.GraueOpenQuickRig!=='function'){show(suggestMessage,'Editor Dual/Split indisponível.');return;}
  doc.querySelector('#gx-shell [data-gx-tab="sound"]')?.click();
  window.GraueOpenQuickRig(proposal);
  show(suggestMessage,'Proposta carregada no editor. Revise e escolha Aplicar; nada foi enviado automaticamente.');
 };
 doc.addEventListener('graue:live-state',()=>{if(panel.open&&lastAudit)renderAudit();});
 renderVault();renderAudit();
 window.GraueShowGuardian={audit:renderAudit,saveVersion:capture,compare,propose:suggest};
})();
