(()=>{
 'use strict';
 const stage=document.querySelector('#gx-shell [data-gx-screen="stage"]');
 if(!stage)return;
 const panel=document.createElement('section');panel.className='gx-panel gx-midi-looper';panel.setAttribute('aria-label','Looper MIDI do XPS-10');
 panel.innerHTML='<div class="loop-heading"><strong>● MIDI LOOPER</strong><span id="loop-output">Som no XPS-10 · USB aguardando</span></div><div class="loop-tracks" role="group" aria-label="Selecionar pista"></div><div class="loop-settings"><label>BPM<input id="loop-bpm" type="number" min="40" max="240" value="72" inputmode="numeric"></label><label>Batidas por compasso<select id="loop-beats"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>7</option><option>9</option><option>12</option></select></label><label>Compassos<select id="loop-bars"><option>1</option><option selected>2</option><option>4</option><option>8</option><option>16</option><option>32</option></select></label></div><label class="loop-countin-label"><input id="loop-countin" type="checkbox"> Contagem visual antes de gravar</label><div class="loop-actions"><button id="loop-rec" type="button">● REC</button><button id="loop-play" type="button">▶ Reproduzir</button><button id="loop-stop" type="button">■ Parar</button><button id="loop-mute" type="button" aria-pressed="false">Silenciar pista</button><button id="loop-clear" type="button">Apagar pista</button><button id="loop-clear-all" type="button">Apagar tudo</button></div><progress id="loop-progress" max="1" value="0" aria-label="Posição no loop"></progress><p id="loop-status" role="status" aria-live="polite">Conecte o USB e toque REC para gravar o que tocar no Roland.</p><small>REC grava um ciclo e inicia a repetição. Com o loop tocando, REC adiciona à pista na próxima volta (overdub). Notas, sustain, pitch bend, modulação e expressão seguem os canais recebidos. A última sessão é recuperada ao reabrir, sem tocar sozinha. Salve cópias na biblioteca para guardar versões. STOP solta o loop; Parar MIDI encerra todos os sons MIDI.</small>';
 const library=document.createElement('details');library.className='loop-library';library.innerHTML='<summary>Salvar e biblioteca MIDI</summary><label>Nome do loop<input id="loop-name" maxlength="80" placeholder="Ex.: Base do refrão"></label><label class="loop-link-label"><input id="loop-link-song" type="checkbox" checked> Vincular à música selecionada</label><small id="loop-song">Sem música selecionada</small><div class="loop-library-buttons"><button id="loop-save" type="button">Salvar cópia</button><button id="loop-export" type="button">Exportar .mid</button><button id="loop-import" type="button">Importar .mid</button></div><label>Loops salvos<select id="loop-saved"><option value="">Nenhum loop salvo</option></select></label><div class="loop-library-buttons"><button id="loop-load" type="button">Carregar</button><button id="loop-delete-saved" type="button">Apagar cópia salva</button></div><small id="loop-library-status" role="status">A última sessão é salva automaticamente. Salvar cópia cria uma versão na biblioteca. Arquivos MIDI: até 4 pistas, BPM constante, denominador 4 e até 32 compassos.</small>';
 panel.append(library);
 const anchor=stage.querySelector('.graue-metronome')||stage.querySelector('.gx-stage-summary');
 if(anchor)anchor.insertAdjacentElement('afterend',panel);else stage.prepend(panel);
 const q=id=>panel.querySelector('#loop-'+id),tracks=panel.querySelector('.loop-tracks');
 for(const [key,max,fallback] of [['beats',12,'4'],['bars',32,'2']]){const field=q(key),current=field.value;field.replaceChildren();for(let n=1;n<=max;n++){const option=document.createElement('option');option.value=String(n);option.textContent=String(n);field.append(option);}field.value=current||fallback;}
 let pendingLibrary=false,libraryItems=[],contextSongId='',contextSongTitle='',settingsReady=false;
 let selected=0,connected=false,state={playing:false,recording:false,queued:false,track:-1,counts:[0,0,0,0],muted:[false,false,false,false],position:0,message:'Pronto para gravar'},songKey=null;
 const trackButtons=[];
 for(let i=0;i<4;i++){const button=document.createElement('button');button.type='button';button.onclick=()=>{selected=i;render();};tracks.append(button);trackButtons.push(button);}
 function call(name,...args){if(typeof window.Native?.[name]!=='function'){q('status').textContent='Looper disponível no APK atualizado.';return false;}window.Native[name](...args);return true;}
 function render(){
  const busy=!!(state.playing||state.recording),hasNotes=state.counts.some(n=>n>0);
  trackButtons.forEach((button,i)=>{button.textContent='Pista '+(i+1)+' · '+(state.recording&&state.track===i?(state.queued?'Aguardando':'Gravando'):state.counts[i]?(state.muted[i]?'MUDO':'Gravada'):'Vazia');button.setAttribute('aria-pressed',String(i===selected));button.classList.toggle('loop-selected',i===selected);button.classList.toggle('loop-recording',!!state.recording&&state.track===i);});
  q('rec').disabled=!connected||state.recording||pendingLibrary;q('rec').textContent=state.recording?(state.queued?'Aguardando…':'Gravando…'):(state.counts[selected]?'● Adicionar notas':'● Gravar pista');
  q('play').disabled=!connected||!hasNotes||state.recording||state.playing||pendingLibrary;
  q('stop').disabled=!busy;q('mute').disabled=!state.counts[selected];q('clear').disabled=!state.counts[selected]&&!(state.recording&&state.track===selected);
  q('clear-all').disabled=!hasNotes&&!state.recording;
  q('mute').textContent=state.muted[selected]?'Ouvir pista':'Silenciar pista';q('mute').setAttribute('aria-pressed',String(!!state.muted[selected]));
  for(const id of ['bpm','beats','bars','countin'])q(id).disabled=busy;
  q('output').textContent=connected?'Som no XPS-10 · USB conectado':'Som no XPS-10 · USB aguardando';
  q('progress').value=state.position||0;
  for(const key of ['save','export'])q(key).disabled=busy||pendingLibrary||!hasNotes;
  q('import').disabled=busy||pendingLibrary;
  q('load').disabled=busy||pendingLibrary||!q('saved').value;
  q('delete-saved').disabled=pendingLibrary||!q('saved').value;
  q('saved').disabled=pendingLibrary;
  q('link-song').disabled=!contextSongId;

  const at=Math.floor((state.position||0)*(state.beats||4)*(state.bars||2));
  const inputStatus=state.recording?' · Entrada: '+(Number(state.receivedNotes)||0)+' notas · Capturadas: '+(Number(state.capturedNotes)||0):'';
  q('status').textContent=(connected?state.message:'USB desconectado. Reconecte para gravar ou tocar.')+(busy&&!state.queued?' · Compasso '+(Math.floor(at/(state.beats||4))+1)+' / '+(state.bars||2)+' · Batida '+(at%(state.beats||4)+1):'')+inputStatus;
 }
 q('rec').onclick=()=>{const bpm=Number(q('bpm').value),beats=Number(q('beats').value),bars=Number(q('bars').value);if(!Number.isInteger(bpm)||bpm<40||bpm>240){q('status').textContent='Escolha um BPM inteiro de 40 a 240.';return;}if(state.counts[selected]&&state.muted[selected]){q('status').textContent='Ative Ouvir pista antes de gravar overdub nela.';return;}if(q('countin').checked&&typeof window.Native?.loopRecordPrepared==='function')call('loopRecordPrepared',selected,bpm,beats,bars,true);else call('loopRecord',selected,bpm,beats,bars);};
 q('countin').checked=typeof saved!=='undefined'&&!!saved.loopCountIn;q('countin').onchange=()=>{if(typeof saved!=='undefined'){saved.loopCountIn=q('countin').checked;if(typeof persist==='function')persist();}};
 q('play').onclick=()=>call('loopPlay',Number(q('bpm').value),Number(q('beats').value),Number(q('bars').value));q('stop').onclick=()=>call('loopStop');
 q('mute').onclick=()=>call('loopMute',selected,!state.muted[selected]);
 q('clear').onclick=()=>{if(window.confirm('Apagar a gravação da pista '+(selected+1)+'?'))call('loopClear',selected);};
 q('clear-all').onclick=()=>{if(window.confirm('Apagar todas as gravações das 4 pistas? Esta ação não pode ser desfeita.'))call('loopClearAll');};
 function info(text){q('library-status').textContent=text;pendingLibrary=false;render();}
 function libraryCall(name,...args){pendingLibrary=true;render();if(!call(name,...args))info('Esta função precisa do APK atualizado.');}
 function updateLibrary(){
  const chosen=q('saved').value;q('saved').replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent='Escolha um loop salvo';q('saved').append(empty);
  const items=[...libraryItems].sort((a,b)=>Number(b.songId===contextSongId&&!!contextSongId)-Number(a.songId===contextSongId&&!!contextSongId));
  for(const item of items){const option=document.createElement('option');option.value=item.id;option.textContent=item.name+(item.songTitle?' · '+item.songTitle:'')+(item.songId===contextSongId&&!!contextSongId?' ★':'');q('saved').append(option);}
  if(items.some(item=>item.id===chosen))q('saved').value=chosen;render();
 }
 q('saved').onchange=()=>render();
 q('save').onclick=()=>{const name=q('name').value.trim();if(!name){info('Dê um nome ao loop antes de salvar.');q('name').focus?.();return;}const linked=q('link-song').checked&&contextSongId;libraryCall('saveLoop',name,linked?contextSongId:'',linked?contextSongTitle:'');};
 q('load').onclick=()=>{const id=q('saved').value;if(!id)return;if(state.counts.some(n=>n>0)&&!window.confirm('Carregar este loop no lugar da sessão atual? Salve uma cópia antes se quiser mantê-la.'))return;libraryCall('loadLoop',id);};
 q('delete-saved').onclick=()=>{const id=q('saved').value;if(id&&window.confirm('Apagar apenas esta cópia da biblioteca? A sessão atual será mantida.'))libraryCall('deleteLoop',id);};
 q('export').onclick=()=>libraryCall('exportLoopMidi');
 q('import').onclick=()=>{if(state.counts.some(n=>n>0)&&!window.confirm('Importar um MIDI no lugar da sessão atual? O arquivo será validado antes de substituir.'))return;libraryCall('importLoopMidi');};
 const prior=window.receive;
 window.receive=(type,data)=>{if(prior)prior(type,data);if(type==='loopState'&&data&&Array.isArray(data.counts)&&data.counts.length===4){state=data;if(!settingsReady&&Number.isFinite(data.bpm)){for(const key of ['bpm','beats','bars'])q(key).value=String(data[key]);settingsReady=true;}render();}if(type==='loopLibrary'&&Array.isArray(data)){libraryItems=data;updateLibrary();}
  if(type==='loopLibraryError'||type==='loopLibraryInfo')info(String(data));
  if(type==='loopLibrarySaved'){q('saved').value=data.id;info('Cópia salva: '+data.name);}
  if(type==='loopLoaded'){for(const key of ['bpm','beats','bars'])q(key).value=String(data[key]);q('name').value=String(data.name||'Loop');info('Carregado: '+String(data.name||'MIDI')+'. Toque Reproduzir quando quiser.');}
  if(type==='armed'||type==='xpsConnection'){connected=!!data;render();}};
 document.addEventListener('graue:live-state',event=>{
  const selector=document.getElementById('gx-live-song-select'),detail=event.detail||{},key=detail.songId||String(selector?.value)+':'+String(detail.title||'');
  const nextSongId=String(detail.songId||''),nextSongTitle=String(detail.title||'');if(nextSongId!==contextSongId||nextSongTitle!==contextSongTitle){contextSongId=nextSongId;contextSongTitle=nextSongTitle;q('song').textContent=contextSongId?'Música: '+contextSongTitle:'Sem vínculo: selecione uma música no Palco';updateLibrary();}
  if(songKey!==null&&key!==songKey&&(state.playing||state.recording))call('loopStop');
  if(key!==songKey&&!state.playing&&!state.recording&&!state.counts.some(n=>n>0)){const bpm=Math.round(Number(detail.bpm));if(bpm>=40&&bpm<=240)q('bpm').value=bpm;}
  songKey=key;
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state.playing||state.recording))call('loopStop');});
 render();call('loopState');call('listLoops');
})();
