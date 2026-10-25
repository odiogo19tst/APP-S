'use strict';
/* Grauê DrumStudio: MIDI notes sound on the XPS-10, never on Spotify or its 6 hardware audio pads. */
(()=>{
 const el=id=>document.getElementById(id);
 const defaultNotes=[['Bumbo',36],['Caixa',38],['Hi-Hat',42],['Hi-Hat aberto',46],['Tom grave',45],['Tom agudo',50],['Crash',49],['Ride',51]];
 const fxNotes=[['Impacto',36],['Caixa FX',40],['Hi-Hat FX',42],['Cymbal',49],['Splash',55],['Ride Bell',53],['Agogô',67],['FX final',81]];
 const worshipDrums=[['Kick',36],['Snare',38],['Hat fechado',42],['Hat aberto',46],['Tom 1',48],['Tom 2',50],['Crash',49],['Ride',51]];
 const worshipFx=[['Impacto',36],['Sub Drop',38],['Riser',42],['Sweep',46],['Crash',49],['Atmosfera',50],['Voz',55],['Outro',57]];
 let drumNotes=defaultNotes.map(x=>x.slice());
 const blank=()=>Array.from({length:8},()=>Array(16).fill(0));
 const settings=saved.drumStudio&&typeof saved.drumStudio==='object'?saved.drumStudio:{};
 let grid=Array.isArray(settings.grid)&&settings.grid.length===8&&settings.grid.every(r=>Array.isArray(r)&&r.length===16)?settings.grid.map(row=>row.map(v=>v?80:0)):blank();
 let drumChannel=Number.isInteger(settings.drumChannel)&&settings.drumChannel>=1&&settings.drumChannel<=16?settings.drumChannel:10;
 let droneChannel=Number.isInteger(settings.droneChannel)&&settings.droneChannel>=1&&settings.droneChannel<=16?settings.droneChannel:3;
 let bpm=Number.isInteger(settings.bpm)&&settings.bpm>=40&&settings.bpm<=180?settings.bpm:72;
 let selectedLibrary=Number.isInteger(settings.selectedLibrary)&&settings.selectedLibrary>=0&&settings.selectedLibrary<=3?settings.selectedLibrary:0;
 let kitCode=typeof settings.kitCode==='string'?settings.kitCode:'Dr001';
 let sampleInfo=[];
 let droneOn=false;
 const save=()=>{saved.drumStudio={grid,drumChannel,droneChannel,bpm,selectedLibrary,kitCode};persist();};
 const native=(name,...args)=>{if(!window.Native?.[name]){el('gx-beats-status').textContent='Função MIDI disponível somente no APK Android atualizado.';return false;}window.Native[name](...args);return true;};
 const channels=()=>{
  for(const target of [el('gx-drums-channel'),el('gx-drone-channel')]){
   for(let i=1;i<=16;i++){const o=document.createElement('option');o.value=String(i);o.textContent='Canal '+i;target.append(o);}
  }
  el('gx-drums-channel').value=String(drumChannel);el('gx-drone-channel').value=String(droneChannel);el('gx-beats-bpm').value=String(bpm);
 };
 channels();
 el('gx-drums-channel').onchange=()=>{drumChannel=+el('gx-drums-channel').value;native('stopSequence');save();};
 el('gx-drone-channel').onchange=()=>{native('stopDronePad');droneOn=false;droneChannel=+el('gx-drone-channel').value;save();};
 el('gx-beats-bpm').onchange=()=>{bpm=Math.min(180,Math.max(40,Number(el('gx-beats-bpm').value)||72));el('gx-beats-bpm').value=String(bpm);save();};
 const rolandKits=(window.XPS_TONES||[]).filter(t=>t.category==='DRM'&&/^Dr\\d{3}$/.test(t.code)&&t.msb>=0&&t.lsb>=0&&t.program>=1);
 const rolandSelect=el('gx-roland-kit');
 for(const kit of rolandKits){
  const option=document.createElement('option');option.value=kit.code;
  option.textContent=kit.code+' · '+kit.name;rolandSelect.append(option);
 }
 const libraryMeta=[
  {name:'Drum Kit 1',info:'Kit interno do Roland XPS-10. 8 notas MIDI mapeadas para bateria.',defaultKit:'Dr001'},
  {name:'EFX 1',info:'Kit de efeitos GM2 do Roland (SFX). Os sons dependem do mapa de notas do kit.',defaultKit:'Dr028'},
  {name:'Worship Drums',info:'Biblioteca de bateria com 8 samples importados do seu celular. Sem arquivos, os pads ficam silenciosos.'},
  {name:'Worship EFX',info:'Biblioteca independente de 8 efeitos de áudio para louvor: importe seus próprios samples.'}
 ];
 const sampleBank=()=>selectedLibrary;
 const isAudio=()=>selectedLibrary>=2;
 const labelsFor=()=>selectedLibrary===1?fxNotes:selectedLibrary===2?worshipDrums:selectedLibrary===3?worshipFx:defaultNotes;
 function renderPads(){
  drumNotes=labelsFor().map(row=>row.slice());
  const pads=el('gx-drums-pads');pads.replaceChildren();
  drumNotes.forEach(([label,note],index)=>{
   const btn=document.createElement('button');btn.className='gx-drum-key';btn.type='button';
   const heading=document.createElement('strong');heading.textContent=label;
   const detail=document.createElement('small');
   const file=sampleInfo.find(x=>x.index===index&&x.bank===sampleBank());
   detail.textContent=isAudio()?(file?.exists?(file.ready?'Áudio pronto':'Carregando áudio…'):'Sem sample'):'Nota MIDI '+note;
   btn.append(heading,detail);
   btn.onclick=()=>{if(isAudio())native('playDrumSample',sampleBank(),index);
    else native('padHit',drumChannel,note,Number(el('gx-drums-velocity').value));};
   pads.append(btn);
  });
 }
 function renderAudioSlots(){
  const host=el('gx-drum-sample-slots');host.replaceChildren();
  if(!isAudio())return;
  for(let i=0;i<8;i++){
   const entry=sampleInfo.find(x=>x.index===i&&x.bank===sampleBank());
   const row=document.createElement('div');row.className='gx-sample-slot';
   const label=document.createElement('div');label.className='gx-sample-name';
   const title=document.createElement('strong');title.textContent=(i+1)+'. '+labelsFor()[i][0];
   const detail=document.createElement('small');detail.textContent=entry?.exists?(entry.name+(entry.ready?' · pronto':' · carregando')):'Nenhum arquivo importado';
   const choose=document.createElement('button');choose.textContent=entry?.exists?'Trocar áudio':'Importar áudio';
   choose.onclick=()=>native('importDrumSample',sampleBank(),i);
   label.append(title,detail);row.append(label,choose);host.append(row);
  }
 }
 function showLibrary(){
  const data=libraryMeta[selectedLibrary];
  el('gx-drum-source-label').textContent=data.name;
  el('gx-drum-source-info').textContent=data.info;
  el('gx-drum-audio-bank').hidden=!isAudio();
  el('gx-roland-kits').hidden=isAudio();
  el('gx-drums-apply-reverb').disabled=isAudio();
  el('gx-beats-start').disabled=isAudio();
  el('gx-drum-sample-info').textContent=isAudio()?'O som sai pela saída do celular. Ligue-o à mesa para ouvir junto do XPS-10.':'';
  document.querySelectorAll('[data-drum-library]').forEach(b=>b.classList.toggle('on',+b.dataset.drumLibrary===selectedLibrary));
  if(!isAudio()){
   if(!rolandKits.some(k=>k.code===kitCode))kitCode=data.defaultKit;
   rolandSelect.value=kitCode;
  }else native('listDrumSamples',sampleBank());
  renderPads();renderSteps();renderAudioSlots();save();
 }
 function applyRolandKit(){
  if(isAudio())return;
  const tone=rolandKits.find(x=>x.code===rolandSelect.value);
  if(!tone){el('gx-drum-source-info').textContent='Kit desconhecido. Use um dos presets oficiais listados.';return;}
  kitCode=tone.code;save();
  const status='Enviando '+tone.name+' para canal MIDI '+drumChannel+'… Não altera a memória USER.';
  el('gx-drum-source-info').textContent=status;
  native('selectDrumKit',tone.msb,tone.lsb,tone.program,drumChannel);
 }
 document.querySelectorAll('[data-drum-library]').forEach(b=>b.onclick=()=>{
  selectedLibrary=+b.dataset.drumLibrary;
  if(selectedLibrary<2)kitCode=libraryMeta[selectedLibrary].defaultKit;
  native('stopSequence');showLibrary();
 });
 rolandSelect.onchange=()=>{kitCode=rolandSelect.value;save();};
 el('gx-roland-kit-send').onclick=applyRolandKit;

 el('gx-drums-velocity').oninput=()=>el('gx-drums-velocity-out').textContent=el('gx-drums-velocity').value;
 el('gx-drums-reverb').oninput=()=>el('gx-drums-reverb-out').textContent=el('gx-drums-reverb').value;
 el('gx-drums-apply-reverb').onclick=()=>native('cc',drumChannel,91,+el('gx-drums-reverb').value);
 function renderSteps(){
  const host=el('gx-beats-grid');host.replaceChildren();
  for(let row=0;row<drumNotes.length;row++){
   const line=document.createElement('div');line.className='gx-beat-row';
   const lbl=document.createElement('span');lbl.textContent=drumNotes[row][0];line.append(lbl);
   for(let step=0;step<16;step++){
    const btn=document.createElement('button');btn.type='button';btn.textContent=String(step+1);
    const on=grid[row][step]>0;btn.className='gx-beat-step'+(on?' on':'');
    btn.setAttribute('aria-pressed',String(on));btn.setAttribute('aria-label',drumNotes[row][0]+' passo '+(step+1));
    btn.onclick=()=>{native('stopSequence');grid[row][step]=grid[row][step]?0:80;save();renderSteps();};
    line.append(btn);
   }
   host.append(line);
  }
 }
 const beats={worship:()=>{let p=blank();for(let n of [0,8])p[0][n]=95;for(let n of [4,12])p[1][n]=76;for(let n of [0,4,8,12])p[2][n]=55;return{grid:p,bpm:72};},
 ballad:()=>{let p=blank();for(let n of [0,8])p[0][n]=90;for(let n of [4,12])p[1][n]=78;for(let n=0;n<16;n+=2)p[2][n]=65;return{grid:p,bpm:65};},
 pop:()=>{let p=blank();for(let n of [0,4,8,12])p[0][n]=95;for(let n of [4,12])p[1][n]=90;for(let n=0;n<16;n+=2)p[2][n]=70;return{grid:p,bpm:105};}};
 for(const [id,key] of [['gx-beats-worship','worship'],['gx-beats-ballad','ballad'],['gx-beats-pop','pop']]){
  el(id).onclick=()=>{native('stopSequence');const p=beats[key]();grid=p.grid;bpm=p.bpm;el('gx-beats-bpm').value=String(bpm);save();renderSteps();el('gx-beats-status').textContent='Preset '+key+' pronto. Toque Iniciar loop para enviar ao teclado.';};
 }
 el('gx-beats-start').onclick=()=>{
  if(isAudio()){el('gx-beats-status').textContent='Loop de 16 passos usa MIDI do XPS-10. Selecione Drum Kit 1 ou EFX 1.';return;}
  const b=+el('gx-beats-bpm').value;
  if(!Number.isInteger(b)||b<40||b>180){el('gx-beats-status').textContent='Escolha BPM entre 40 e 180.';return;}
  bpm=b;save();
  const payload={grid,notes:drumNotes.map(x=>x[1]),bpm,channel:drumChannel};
  native('startSequence',JSON.stringify(payload));
  el('gx-beats-status').textContent='Loop solicitado no canal '+drumChannel+' do Roland. Sem som? Confirme um kit de bateria nessa parte.';
 };
 el('gx-beats-stop').onclick=()=>{native('stopSequence');el('gx-beats-status').textContent='Loop parado.';};
 const currentChord=()=>String(window.GraueCurrentChord?.()||'').trim();
 el('gx-drone-start').onclick=()=>{
  const chord=el('gx-drone-chord').value||currentChord();
  const notes=Music.voicing(chord,[60,64,67]).filter(x=>x>=36&&x<=96).slice(0,5);
  if(!notes.length){el('gx-drone-status').textContent='Selecione um acorde válido ou abra uma cifra.';return;}
  if(droneChannel===drumChannel){el('gx-drone-status').textContent='Escolha canais diferentes para drum (kit) e pad (synth).';return;}
  el('gx-drone-status').textContent='Enviando '+chord+' ao Roland…';
  native('startDrone',JSON.stringify({channel:droneChannel,velocity:+el('gx-drone-velocity').value,notes}));
 };
 el('gx-drone-stop').onclick=()=>{native('stopDronePad');droneOn=false;el('gx-drone-status').textContent='Pad parado — notas liberadas.';};
 el('gx-drums-panic').onclick=()=>{native('panic');droneOn=false;el('gx-drone-status').textContent='Notas liberadas';el('gx-beats-status').textContent='Tudo parado.';};
 el('gx-backing-open').onclick=()=>{
  const url=el('gx-backing-link').value.trim();
  if(!/^https:\/\/(open\.spotify\.com\/|(?:www\.|m\.)?youtube\.com\/|youtu\.be\/)/i.test(url)){el('gx-beats-status').textContent='Use link oficial HTTPS do Spotify ou YouTube.';return;}
  native('launchPlaybackUrl',url);
 };
 const rep=document.querySelector('[data-gx-screen="repertoire"]');
 if(rep){
  const panel=document.createElement('section');panel.className='gx-panel gx-youtube-helper';
  panel.innerHTML='<div class="gx-section-label">YOUTUBE NO REPERTÓRIO · SEM CIFRA CLUB</div><p>Cole o link, informe o nome e os acordes conhecidos, e salve na lista de músicas. Um link por si só não fornece as notas: para transcrever automaticamente é preciso analisar áudio autorizado.</p><div class="gx-youtube-fields"><label>Link YouTube<input id="gx-yt-link" type="url" placeholder="https://youtu.be/..."></label><label>Nome da música<input id="gx-yt-title" maxlength="140" placeholder="Título da música"></label><label>Progressão de acordes<input id="gx-yt-chords" placeholder="Ex.: G D Em C"></label><label>BPM<input type="number" id="gx-yt-bpm" min="40" max="180" value="72"></label></div><div class="gx-youtube-actions"><button id="gx-yt-open">Abrir vídeo</button><button id="gx-yt-save">Salvar cifra no repertório</button><button id="gx-yt-analyze">Analisar com microfone</button></div><small id="gx-yt-message" role="status">A análise pelo microfone é experimental, não extrai a trilha de áudio diretamente do YouTube.</small>';
  rep.append(panel);
  const getLink=()=>el('gx-yt-link').value.trim();
  const validLink=()=>/^https:\/\/(?:www\.|m\.)?youtube\.com\/watch\?|^https:\/\/youtu\.be\//i.test(getLink());
  el('gx-yt-open').onclick=()=>{if(!validLink()){el('gx-yt-message').textContent='Cole um link de vídeo YouTube válido.';return;}native('launchPlaybackUrl',getLink());};
  el('gx-yt-save').onclick=()=>{
   const title=el('gx-yt-title').value.trim(),tokens=el('gx-yt-chords').value.trim().split(/[\s,;|]+/).filter(Boolean);
   if(!validLink()||!title||!tokens.length||tokens.length>150||!tokens.every(t=>!!Music.parse(t))){el('gx-yt-message').textContent='Informe URL, título e acordes válidos. Ex.: G D Em C.';return;}
   const tempo=Number(el('gx-yt-bpm').value),root=Music.parse(tokens[0]).root;
   const entry={title,category:'YouTube',chords:tokens,beats:4,bpm:Number.isInteger(tempo)&&tempo>=40&&tempo<=180?tempo:72,root,minor:/m(?:7|9|11)?$/.test(tokens[0]),text:'Vídeo: '+getLink(),youtubeUrl:getLink()};
   try{
    const idx=songs.findIndex(s=>s.title===entry.title);
    if(idx<0)songs.push(entry);else songs[idx]=entry;
    persist();select(entry);if(window.refreshLiveSongs)window.refreshLiveSongs();
    el('gx-yt-message').textContent='Salvo no repertório. Cifra informada manualmente — não inferida do vídeo.';
   }catch(e){el('gx-yt-message').textContent='Não foi possível salvar: '+e.message;}
  };
  el('gx-yt-analyze').onclick=()=>{
   const tab=document.querySelector('[data-gx-tab="coach"]');if(tab)tab.click();
   el('gx-yt-message').textContent='Copiloto aberto. Toque no microfone para escutar a música no ambiente; o reconhecimento não é garantia de cifra completa.';
  };
 }
 const oldReceive=window.receive;
 window.receive=(type,payload)=>{
  if(oldReceive)oldReceive(type,payload);
  if(type==='droneStatus'){droneOn=!!payload;el('gx-drone-status').textContent=droneOn?'● Pad contínuo ativo — toque Parar Pad':'Pad parado';el('gx-drone-start').classList.toggle('on',droneOn);}
  if(type==='xpsConnection')el('gx-drums-device-state').textContent=payload?'● USB-MIDI conectado · partes requerem timbres configurados':'● USB-MIDI desconectado';
  if(type==='drumSamples'&&Array.isArray(payload)){sampleInfo=payload;renderPads();renderAudioSlots();}
  if(type==='drumKitCommand'){el('gx-drum-source-info').textContent=payload?.sent?'Comando MIDI enviado (não confirma mudança no Roland). Teste tocando um pad.':'Falha ao enviar o kit. Confira USB-MIDI e canal.';}
  if(type==='sequenceStep'&&payload<0)el('gx-beats-status').textContent='Loop parado.';
  if(type==='xpsConnection'&&!payload){droneOn=false;el('gx-drone-status').textContent='USB desconectado — notas liberadas.';}
 };
 showLibrary();
})();
