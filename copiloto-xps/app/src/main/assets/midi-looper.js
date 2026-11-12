(()=>{
 'use strict';
 const stage=document.querySelector('#gx-shell [data-gx-screen="stage"]');
 if(!stage)return;
 const panel=document.createElement('section');panel.className='gx-panel gx-midi-looper';panel.setAttribute('aria-label','Looper MIDI do XPS-10');
 panel.innerHTML='<div class="loop-heading"><strong>● MIDI LOOPER</strong><span id="loop-output">Som no XPS-10 · USB aguardando</span></div><div class="loop-tracks" role="group" aria-label="Selecionar pista"></div><div class="loop-settings"><label>BPM<input id="loop-bpm" type="number" min="40" max="240" value="72" inputmode="numeric"></label><label>Batidas por compasso<select id="loop-beats"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>7</option><option>9</option><option>12</option></select></label><label>Compassos<select id="loop-bars"><option>1</option><option selected>2</option><option>4</option><option>8</option><option>16</option><option>32</option></select></label></div><div class="loop-actions"><button id="loop-rec" type="button">● REC</button><button id="loop-play" type="button">▶ PLAY</button><button id="loop-stop" type="button">■ STOP</button><button id="loop-mute" type="button" aria-pressed="false">Silenciar pista</button><button id="loop-clear" type="button">Apagar pista</button><button id="loop-clear-all" type="button">Apagar tudo</button></div><progress id="loop-progress" max="1" value="0" aria-label="Posição no loop"></progress><p id="loop-status" role="status" aria-live="polite">Conecte o USB e toque REC para gravar o que tocar no Roland.</p><small>REC grava um ciclo e inicia a repetição. Com o loop tocando, REC adiciona à pista na próxima volta (overdub). Notas, sustain, pitch bend, modulação e expressão seguem os canais recebidos. Loops desta sessão ficam na memória até fechar o app. STOP solta o loop; Parar MIDI encerra todos os sons MIDI.</small>';
 const anchor=stage.querySelector('.graue-metronome')||stage.querySelector('.gx-stage-summary');
 if(anchor)anchor.insertAdjacentElement('afterend',panel);else stage.prepend(panel);
 const q=id=>panel.querySelector('#loop-'+id),tracks=panel.querySelector('.loop-tracks');
 let selected=0,connected=false,state={playing:false,recording:false,queued:false,track:-1,counts:[0,0,0,0],muted:[false,false,false,false],position:0,message:'Pronto para gravar'},songKey=null;
 const trackButtons=[];
 for(let i=0;i<4;i++){const button=document.createElement('button');button.type='button';button.onclick=()=>{selected=i;render();};tracks.append(button);trackButtons.push(button);}
 function call(name,...args){if(typeof window.Native?.[name]!=='function'){q('status').textContent='Looper disponível no APK atualizado.';return false;}window.Native[name](...args);return true;}
 function render(){
  const busy=!!(state.playing||state.recording),hasNotes=state.counts.some(n=>n>0);
  trackButtons.forEach((button,i)=>{button.textContent='Pista '+(i+1)+' · '+(state.recording&&state.track===i?(state.queued?'ARMADA':'REC'):state.counts[i]?(state.muted[i]?'MUDO':'Gravada'):'Vazia');button.setAttribute('aria-pressed',String(i===selected));button.classList.toggle('loop-selected',i===selected);button.classList.toggle('loop-recording',!!state.recording&&state.track===i);});
  q('rec').disabled=!connected||state.recording;q('rec').textContent=state.counts[selected]?'● Adicionar notas':'● Gravar pista';
  q('play').disabled=!connected||!hasNotes||state.recording||state.playing;
  q('stop').disabled=!busy;q('mute').disabled=!state.counts[selected];q('clear').disabled=!state.counts[selected]&&!(state.recording&&state.track===selected);
  q('clear-all').disabled=!hasNotes&&!state.recording;
  q('mute').textContent=state.muted[selected]?'Ouvir pista':'Silenciar pista';q('mute').setAttribute('aria-pressed',String(!!state.muted[selected]));
  for(const id of ['bpm','beats','bars'])q(id).disabled=busy;
  q('output').textContent=connected?'Som no XPS-10 · USB conectado':'Som no XPS-10 · USB aguardando';
  q('progress').value=state.position||0;
  const at=Math.floor((state.position||0)*(state.beats||4)*(state.bars||2));
  const inputStatus=state.recording?' · Entrada: '+(Number(state.receivedNotes)||0)+' notas · Capturadas: '+(Number(state.capturedNotes)||0):'';
  q('status').textContent=(connected?state.message:'USB desconectado. Reconecte para gravar ou tocar.')+(busy&&!state.queued?' · Compasso '+(Math.floor(at/(state.beats||4))+1)+' / '+(state.bars||2)+' · Batida '+(at%(state.beats||4)+1):'')+inputStatus;
 }
 q('rec').onclick=()=>{const bpm=Number(q('bpm').value),beats=Number(q('beats').value),bars=Number(q('bars').value);if(!Number.isInteger(bpm)||bpm<40||bpm>240){q('status').textContent='Escolha um BPM inteiro de 40 a 240.';return;}if(state.counts[selected]&&state.muted[selected]){q('status').textContent='Ative Ouvir pista antes de gravar overdub nela.';return;}call('loopRecord',selected,bpm,beats,bars);};
 q('play').onclick=()=>call('loopPlay',Number(q('bpm').value),Number(q('beats').value),Number(q('bars').value));q('stop').onclick=()=>call('loopStop');
 q('mute').onclick=()=>call('loopMute',selected,!state.muted[selected]);
 q('clear').onclick=()=>{if(window.confirm('Apagar a gravação da pista '+(selected+1)+'?'))call('loopClear',selected);};
 q('clear-all').onclick=()=>{if(window.confirm('Apagar todas as gravações das 4 pistas? Esta ação não pode ser desfeita.'))call('loopClearAll');};
 const prior=window.receive;
 window.receive=(type,data)=>{if(prior)prior(type,data);if(type==='loopState'&&data&&Array.isArray(data.counts)&&data.counts.length===4){state=data;render();}if(type==='armed'||type==='xpsConnection'){connected=!!data;render();}};
 document.addEventListener('graue:live-state',event=>{
  const selector=document.getElementById('gx-live-song-select'),detail=event.detail||{},key=String(selector?.value)+':'+String(detail.title||'');
  if(songKey!==null&&key!==songKey&&(state.playing||state.recording))call('loopStop');
  if(key!==songKey&&!state.playing&&!state.recording&&!state.counts.some(n=>n>0)){const bpm=Math.round(Number(detail.bpm));if(bpm>=40&&bpm<=240)q('bpm').value=bpm;}
  songKey=key;
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state.playing||state.recording))call('loopStop');});
 render();call('loopState');
})();
