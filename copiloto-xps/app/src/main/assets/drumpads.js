'use strict';
/* Grauê DrumStudio: MIDI notes sound on the XPS-10, never on Spotify or its 6 hardware audio pads. */
(()=>{
 const el=id=>document.getElementById(id);
 const drumNotes=[['Bumbo',36],['Caixa',38],['Hi-Hat',42],['Hi-Hat aberto',46],['Tom grave',45],['Tom agudo',50],['Crash',49],['Ride',51]];
 const blank=()=>Array.from({length:8},()=>Array(16).fill(0));
 const settings=saved.drumStudio&&typeof saved.drumStudio==='object'?saved.drumStudio:{};
 let grid=Array.isArray(settings.grid)&&settings.grid.length===8&&settings.grid.every(r=>Array.isArray(r)&&r.length===16)?settings.grid.map(row=>row.map(v=>v?80:0)):blank();
 let drumChannel=Number.isInteger(settings.drumChannel)&&settings.drumChannel>=1&&settings.drumChannel<=16?settings.drumChannel:10;
 let droneChannel=Number.isInteger(settings.droneChannel)&&settings.droneChannel>=1&&settings.droneChannel<=16?settings.droneChannel:3;
 let bpm=Number.isInteger(settings.bpm)&&settings.bpm>=40&&settings.bpm<=180?settings.bpm:72;
 let droneOn=false;
 let audioMode=settings.audioMode==='midi'?'midi':'samples';
 let sampleBank=Number.isInteger(settings.sampleBank)&&settings.sampleBank>=0&&settings.sampleBank<8?settings.sampleBank:5;
 let selectedPad=0,padLibrary=null;
 const xpsDrumKits=(window.XPS_TONES||[]).filter(t=>/^Dr0(0[1-9]|1[0-9]|2[0-8])$/.test(t.code)&&t.category==='DRM');
 let selectedRoland=typeof settings.rolandKit==='string'?settings.rolandKit:'Dr001';

 const save=()=>{saved.drumStudio={grid,drumChannel,droneChannel,bpm,audioMode,sampleBank,rolandKit:selectedRoland};persist();};
 const native=(name,...args)=>{if(!window.Native?.[name]){el('gx-beats-status').textContent='Função MIDI disponível somente no APK Android atualizado.';return false;}window.Native[name](...args);return true;};
 const channels=()=>{
  for(const target of [el('gx-drums-channel'),el('gx-drone-channel')]){
   for(let i=1;i<=16;i++){const o=document.createElement('option');o.value=String(i);o.textContent='Canal '+i;target.append(o);}
  }
  el('gx-drums-channel').value=String(drumChannel);el('gx-drone-channel').value=String(droneChannel);el('gx-beats-bpm').value=String(bpm);
 };
 channels();
 const setup=document.createElement('div');setup.className='gx-drum-library';
 setup.innerHTML='<div class="gx-section-label">BIBLIOTECA DE DRUM PADS <small>Escolha onde o som será produzido</small></div>'+
 '<div class="gx-pad-library-source"><label>Fonte do som<select id="gx-pad-source"><option value="midi">Roland XPS-10 · MIDI</option><option value="samples">Celular · Samples de áudio</option></select></label>'+
 '<label id="gx-pad-roland-wrapper">Kit interno do XPS-10<select id="gx-pad-roland-kit"></select></label>'+
 '<label id="gx-pad-local-wrapper">Biblioteca de áudio<select id="gx-pad-local-kit"><option value="0">Drum Kit 1 · Grauê original</option><option value="1">EFX 1 · Grauê original</option><option value="2">Worship Drums · Grauê original</option><option value="3">Worship EFX · Grauê original</option><option value="4">Meus Samples · importar do celular / Drive</option><option value="5">Worship Groove · Vintage CC0</option><option value="6">Pop Groove · Bounce CC0</option><option value="7">Modern Hits · Trap CC0</option></select></label></div>'+
 '<div class="gx-pad-library-actions"><button id="gx-pad-use-roland">Usar este kit no Roland</button><label id="gx-pad-import-label">Pad para importar<select id="gx-pad-import-slot"></select></label><button id="gx-pad-import">Importar neste pad</button><button id="gx-pad-import-all">Escolher até 8 áudios</button><button id="gx-pad-import-zip">Importar pacote ZIP</button><button id="gx-pad-stop-audio">Parar áudio do celular</button></div>'+
 '<small id="gx-pad-library-status" role="status" aria-live="polite">Os kits do Roland vêm da lista oficial, mas dependem de uma parte Rhythm habilitada. Novos kits 5–7 incluem samples CC0 reais, independentes do Roland, prontos offline. Você também pode escolher sons do Google Drive pelo seletor de arquivos Android.</small>'+
 '<small class="gx-pad-library-help">As bibliotecas CC0 vêm do projeto livre Boochi44/free-drum-samples (WAV reais). Não são sons proprietários do app mostrado nas imagens nem samples oficiais do Roland. A saída USB do Roland transporta MIDI, não áudio. Para usar samples do celular na igreja, conecte a saída de áudio do telefone à mesa de som.</small>';
 const drumSection=el('gx-drums-pads').closest('.gx-drums-kit');
 if(drumSection)drumSection.insertBefore(setup,drumSection.querySelector('.gx-drums-settings'));
 const kits=el('gx-pad-roland-kit');
 xpsDrumKits.forEach(t=>{const o=document.createElement('option');o.value=t.code;o.textContent=t.code+' · '+t.name;kits.append(o);});
 kits.value=xpsDrumKits.some(t=>t.code===selectedRoland)?selectedRoland:'Dr001';
 const slotPicker=el('gx-pad-import-slot');
 for(let i=0;i<8;i++){const o=document.createElement('option');o.value=String(i);o.textContent=String(i+1)+' · '+drumNotes[i][0];slotPicker.append(o);}
 el('gx-pad-source').value=audioMode;
 el('gx-pad-local-kit').value=String(sampleBank);
 function renderAudioSource(){
  const sample=audioMode==='samples';
  el('gx-pad-local-wrapper').hidden=!sample;el('gx-pad-import').hidden=!sample;
  el('gx-pad-import-label').hidden=!sample;el('gx-pad-stop-audio').hidden=!sample;el('gx-pad-import-all').hidden=!sample;el('gx-pad-import-zip').hidden=!sample;
  el('gx-pad-roland-wrapper').hidden=sample;el('gx-pad-use-roland').hidden=sample;
  const names=padLibrary?.banks?.[sampleBank]?.pads||[];
  const buttons=el('gx-drums-pads').querySelectorAll('button');
  buttons.forEach((b,i)=>{
   const info=names[i],label=sample?(info?.label||drumNotes[i][0]):drumNotes[i][0];
   b.querySelector('strong').textContent=label;
   b.querySelector('small').textContent=sample?(info?.source==='importado'?'Áudio importado':info?.available?'Áudio original Grauê':'Importe um sample'):'MIDI '+drumNotes[i][1];
   b.classList.toggle('gx-drum-empty',sample&&info&&!info.available);
  });
  el('gx-pad-library-status').textContent=sample?'Som no CELULAR: '+el('gx-pad-local-kit').selectedOptions[0]?.textContent+'. Os bancos CC0 não precisam de USB nem internet. Meus Samples aceita WAV/MP3/OGG e ZIP com até 8 sons, inclusive pelo seletor do Google Drive.':'Som no XPS-10 por MIDI. Confirme a parte Rhythm no teclado.';
  el('gx-beats-start').disabled=sample;
  el('gx-beats-status').textContent=sample?'Pads CC0 prontos no celular. O loop de 16 passos ainda usa MIDI; os samples podem ser disparados individualmente.':'Looper MIDI pronto. A saída de som depende do kit configurado no Roland.';
 }
 el('gx-pad-source').onchange=()=>{native('stopSequence');native('stopPadSamples');audioMode=el('gx-pad-source').value;save();renderAudioSource();};
 el('gx-pad-local-kit').onchange=()=>{sampleBank=+el('gx-pad-local-kit').value;save();renderAudioSource();};
 kits.onchange=()=>{selectedRoland=kits.value;save();};
 el('gx-pad-use-roland').onclick=()=>{
  const tone=xpsDrumKits.find(t=>t.code===kits.value);
  if(!tone){el('gx-pad-library-status').textContent='Kit Roland não encontrado no catálogo.';return;}
  selectedRoland=tone.code;save();
  const ok=native('selectDrumKit',drumChannel,tone.msb,tone.lsb,tone.program);
  if(ok)el('gx-pad-library-status').textContent='Solicitado: '+tone.name+' · canal '+drumChannel+'. Confirme que o XPS recebe Program Change como parte de bateria.';
 };
 el('gx-pad-import').onclick=()=>{selectedPad=+slotPicker.value;native('importPadSample',sampleBank,selectedPad);};
 el('gx-pad-import-all').onclick=()=>{
  if(confirm('Importar até 8 sons para o banco selecionado, substituindo os pads correspondentes no app? Os arquivos de origem não serão alterados.'))native('importPadKit',sampleBank);
 };
 el('gx-pad-import-zip').onclick=()=>{
  if(confirm('Importar até 8 arquivos WAV, MP3 ou OGG de um ZIP? Os pads correspondentes serão atualizados somente no Grauê; o ZIP original será preservado.'))
   native('importPadZip',sampleBank);
 };
 el('gx-pad-stop-audio').onclick=()=>native('stopPadSamples');
 renderAudioSource();

 el('gx-drums-channel').onchange=()=>{drumChannel=+el('gx-drums-channel').value;native('stopSequence');save();renderAudioSource();};
 el('gx-drone-channel').onchange=()=>{native('stopDronePad');droneOn=false;droneChannel=+el('gx-drone-channel').value;save();};
 el('gx-beats-bpm').onchange=()=>{bpm=Math.min(180,Math.max(40,Number(el('gx-beats-bpm').value)||72));el('gx-beats-bpm').value=String(bpm);save();};
 for(const [label,note] of drumNotes){
  const btn=document.createElement('button');btn.className='gx-drum-key';btn.type='button';
  const n=document.createElement('strong');n.textContent=label;
  const caption=document.createElement('small');caption.textContent='MIDI '+note;
  btn.append(n,caption);
  btn.onclick=()=>{
   const velocity=Number(el('gx-drums-velocity').value);
   if(audioMode==='samples')native('playPadSample',sampleBank,drumNotes.findIndex(x=>x[1]===note),velocity);
   else native('padHit',drumChannel,note,velocity);
  };
  el('gx-drums-pads').append(btn);
 }
 renderAudioSource();
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
  if(audioMode==='samples'){el('gx-beats-status').textContent='Looper de 16 passos usa MIDI. Troque a fonte para Roland XPS-10.';return;}
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
  if(type==='padSampleState'){
   padLibrary=payload&&Array.isArray(payload.banks)?payload:null;
   renderAudioSource();
  }
  if(type==='drumKitSent'){
   const choice=xpsDrumKits.find(x=>x.msb===payload?.msb&&x.lsb===payload?.lsb&&x.program===payload?.program);
   el('gx-pad-library-status').textContent='Comando MIDI enviado: '+(choice?.name||'kit')+'. Som não confirmado por SysEx; teste tocando um pad.';
  }
  if(type==='droneStatus'){droneOn=!!payload;el('gx-drone-status').textContent=droneOn?'● Pad contínuo ativo — toque Parar Pad':'Pad parado';el('gx-drone-start').classList.toggle('on',droneOn);}
  if(type==='xpsConnection')el('gx-drums-device-state').textContent=payload?'● USB-MIDI conectado · partes requerem timbres configurados':'● USB-MIDI desconectado';
  if(type==='sequenceStep'&&payload<0)el('gx-beats-status').textContent='Loop parado.';
  if(type==='xpsConnection'&&!payload){droneOn=false;el('gx-drone-status').textContent='USB desconectado — notas liberadas.';}
 };
 renderSteps();
 native('getPadSampleLibrary');
})();
