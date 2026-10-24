'use strict';
/* Grauê XPS | Interface de palco. Camada de apresentação sobre os serviços MIDI, áudio e repertório existentes. */
(()=>{
 const $x=id=>document.getElementById(id);
 const S=(s)=>String(s==null?'':s);
 const callOld=(id)=>{let el=$x(id);if(el)el.click();};
 const shell=document.createElement('div');shell.id='gx-shell';
 shell.innerHTML=[
 '<header class="gx-header"><div class="gx-brand"><span class="gx-mark">ϟ</span><div><b>Grauê XPS</b><small>SEU TECLADO. MAIS LONGE.</small></div></div><span class="gx-usb" id="gx-usb">● XPS-10<br><small>Não lido</small></span><button class="gx-gear" id="gx-open-settings" aria-label="Ajustes">⚙</button></header>',
 '<nav class="gx-nav" aria-label="Áreas do aplicativo"><button data-gx-tab="stage" class="on">Palco</button><button data-gx-tab="repertoire">Repertório</button><button data-gx-tab="sound">Sons</button><button data-gx-tab="coach">Copiloto</button><button data-gx-tab="backups">Backups</button><button data-gx-tab="settings">Ajustes</button></nav>',
 '<div class="gx-screen on" data-gx-screen="stage">',
 '<div class="gx-stage-summary"><section class="gx-current gx-panel"><small>● TOCANDO AGORA</small><strong id="gx-song-name">Selecione uma música</strong><span id="gx-song-cat">Seu repertório</span><div class="gx-progress"><i id="gx-progress-bar"></i></div></section>',
 '<section class="gx-panel gx-mini"><small>TOM</small><strong id="gx-key">—</strong><span id="gx-scale">Referência</span></section>',
 '<section class="gx-panel gx-mini"><small>ANDAMENTO</small><strong id="gx-bpm">72</strong><span>BPM • 4/4</span></section>',
 '<section class="gx-panel gx-mini"><small>SEÇÃO ATUAL</small><strong id="gx-section">Em execução</strong></section>',
 '<section class="gx-panel gx-mini"><small>PRÓXIMO ACORDE</small><strong id="gx-next-chord">—</strong><span id="gx-next-line">Acompanhamento</span></section></div>',
 '<div class="gx-stage-actions"><button class="gx-start" id="gx-start">▶<span>Iniciar</span></button><button id="gx-pause">Ⅱ<span>Pausar</span></button><button id="gx-next">⏭<span>Próxima música</span></button><button class="gx-danger" id="gx-panic">⚠<span>Parar MIDI</span></button><div class="gx-transpose"><button id="gx-down" aria-label="Transpor abaixo">−</button><strong id="gx-transpose">0</strong><button id="gx-up" aria-label="Transpor acima">+</button><small>Transpor cifra</small></div><button id="gx-show-favorites">★<span>Favoritos</span></button></div>',
 '<div class="gx-panel gx-zone"><div class="gx-section-label">✧ TROCA RÁPIDA DE TIMBRES <button id="gx-edit-fav">Organizar</button></div><div id="gx-live-favorites" class="gx-fav-grid"></div><div class="gx-live-banks-heading">Banco de favoritos <strong id="gx-live-bank-name">0</strong></div><div id="gx-live-bank-tabs" class="gx-live-bank-tabs"></div><div id="gx-live-bank-slots" class="gx-live-bank-slots"></div></div>',
 '<div class="gx-panel gx-assist"><div class="gx-section-label">✦ JARVIS MUSICAL · ACORDE DE APOIO <small>Som gerado pelo XPS-10 por MIDI</small></div><div class="gx-assist-controls"><div><strong id="gx-assist-chord">—</strong><small>acorde atual da música</small></div><label>Canal<select id="gx-assist-channel"></select></label><button id="gx-assist-play">▶ Tocar acorde</button><button id="gx-assist-stop">■ Parar</button></div><small>Um toque envia o acorde por 900 ms, somente com MIDI ativado. Escolha um canal de recepção que não interfira nas notas que você está tocando. Nunca toca sem seu comando.</small></div>',
 '<div class="gx-panel gx-zone"><div class="gx-section-label">▤ PARTES DO TECLADO <small>ACESSO RÁPIDO</small></div><div id="gx-stage-parts" class="gx-stage-parts"></div></div>',
 '<div class="gx-stage-footer"><button id="gx-connect">Conectar USB</button><button id="gx-read">Ler teclado</button><button id="gx-arm">Habilitar envio MIDI</button><button id="gx-show-mode">Modo show ↔</button></div></div>',
 '<div class="gx-screen" data-gx-screen="repertoire"><div class="gx-rep-layout">',
 '<aside class="gx-panel gx-rep-library"><div class="gx-section-label">▏ Meu Repertório</div><input id="gx-search" placeholder="Buscar música, artista ou tom…" aria-label="Buscar repertório"><div class="gx-filters"><button class="on" data-gx-filter="all">Todas</button><button data-gx-filter="favorites">Favoritas</button><button data-gx-filter="setlist">Setlist</button><button data-gx-filter="recent">Recentes</button><button id="gx-add-song">+</button></div><div id="gx-songs" class="gx-song-list"></div></aside>',
 '<section class="gx-rep-view"><div class="gx-rep-tabs"><button class="on" data-gx-rep="cifra">Cifra integrada</button><button data-gx-rep="letter">Letra</button><button data-gx-rep="notes">Anotações</button><button data-gx-rep="setlist">Setlist</button></div>',
 '<div class="gx-paper"><div class="gx-cifra-head"><div><b>♬ Cifra Club</b><small>Navegação integrada no aplicativo</small></div><button id="gx-open-cifra">Buscar no Cifra Club ↗</button></div><div class="gx-paper-main"><div class="gx-paper-copy"><h2 id="gx-cifra-title">Escolha uma música</h2><span id="gx-cifra-meta">Importe letras e acordes para o seu repertório</span><p id="gx-cifra-key">Tom de referência: —</p><div id="gx-cifra-content">Selecione uma música ou abra o Cifra Club para importar sua cifra.</div></div><aside class="gx-paper-actions"><button class="gx-blue" id="gx-import-cifra">Importar cifra desta página</button><button id="gx-save-cifra">Salvar no repertório</button><button id="gx-transpose-cifra">Transpor +1</button><button id="gx-view-cifra">Abrir navegador</button><div class="gx-session">✓ Sessão gerenciada pelo Cifra Club<small>O login depende do site e pode exigir nova autenticação.</small></div></aside></div></div>',
 '<p class="gx-note">A cifra do site abre no painel nativo ao lado em paisagem; o botão Importar copia apenas a música aberta quando o site permite a leitura. Nenhuma sincronização automática de conta foi prometida.</p></section></div></div>',
 '<div class="gx-screen" data-gx-screen="sound"><div class="gx-sound-layout"><aside class="gx-panel gx-sound-nav"><button data-gx-sound="performance">▣ Performance</button><button class="on" data-gx-sound="tones">♧ Timbres</button><button data-gx-sound="parts">♮ Partes (1–16)</button><button data-gx-sound="mixer">☷ Mixer</button><button data-gx-sound="split">◉ Split / Layer</button><button data-gx-sound="effects">♬ Efeitos (MFX)</button><button data-gx-sound="arpeggio">▥ Arpejador</button><button data-gx-sound="favorites">★ Favoritos</button><button id="gx-advanced">⚙ Editor completo</button></aside>',
 '<div class="gx-sound-center"><div class="gx-panel gx-performance"><small>PERFORMANCE ATUAL</small><div class="gx-perf-row"><strong id="gx-perf-name">Aguardando leitura do teclado</strong><button id="gx-perf-read">Ler</button><button id="gx-perf-edit">Editar</button><button id="gx-perf-new">Timbres</button><button id="gx-user-patches">Ler USER</button></div></div><div id="gx-one-touch" class="gx-panel gx-one-touch"><div class="gx-tone-heading"><strong>TOCAR AGORA — XPS-10</strong><label>Parte <select id="gx-tone-part"></select></label></div><div id="gx-tone-categories" class="gx-tone-categories"></div><div class="gx-tone-toolbar"><input id="gx-tone-search" type="search" placeholder="Buscar timbre, código ou categoria…"><button id="gx-tone-favorites">★ Favoritos</button></div><div class="gx-tone-count" id="gx-tone-count"></div><div id="gx-tone-list" class="gx-tone-list"></div><div class="gx-tone-banks"><div class="gx-section-label">BANCOS DE FAVORITOS DO APP — 0 A 9 <small>Não sobrescreve os bancos internos do Roland</small></div><div id="gx-bank-tabs" class="gx-bank-tabs"></div><div id="gx-bank-slots" class="gx-bank-slots"></div></div><p class="gx-tone-tip">Toque no som para enviar ao XPS-10. Segure por 3 segundos para editar. Na primeira conexão o app lê automaticamente; os 256 USER ficam guardados localmente.</p></div><dialog id="gx-tone-dialog" class="gx-tone-dialog"><div class="gx-tone-dialog-header"><strong id="gx-edit-name">Editar timbre</strong><button id="gx-edit-close">Fechar ✕</button></div><p id="gx-edit-status">Compare configurações temporárias sem sobrescrever os timbres USER.</p><div class="gx-variant-tabs"><button data-gx-variant="original" class="on">Original</button><button data-gx-variant="manual">Minha edição</button><button data-gx-variant="ai">Sugestão IA</button></div><label>Volume da parte <input id="gx-edit-volume" type="range" min="0" max="127" value="100"><output id="gx-edit-volume-value">100</output></label><label>Descrição e recomendações <textarea id="gx-edit-notes" rows="4" maxlength="1500" placeholder="Anotações e sugestões para esta Performance"></textarea></label><div class="gx-edit-actions"><button id="gx-edit-suggest">Pedir sugestão à Gemma</button><button id="gx-edit-test" class="gx-start">Testar no XPS-10</button><button id="gx-edit-save">Salvar no aplicativo</button><button id="gx-edit-undo">Desfazer teste</button></div><div id="gx-edit-confirm" hidden>Deseja salvar a configuração escolhida no Grauê? <button id="gx-edit-yes">Sim</button><button id="gx-edit-no">Não</button></div><small>Salvar aqui grava um preset no celular, NÃO sobrescreve a memória USER do teclado. Edições temporárias dependem do modo Performance e de leitura válida.</small></dialog><div class="gx-panel gx-mixer" id="gx-advanced-mixer"><div class="gx-section-label">PARTES MIDI (1–16)<div><button class="on" id="gx-parts-page1">1–8</button><button id="gx-parts-page2">9–16</button></div></div><div id="gx-mixer-parts" class="gx-mixer-grid"></div><p>Volumes da última leitura. Alterações só são enviadas quando o MIDI está habilitado.</p></div></div>',
 '<aside class="gx-sound-right"><div class="gx-panel gx-device"><div id="gx-device-state">● XPS-10 • aguardando leitura</div><div class="gx-keyboard">▮ ▯ ▮ ▯ ▮ ▮ ▯ ▮ ▯ ▮ ▯ ▮</div><small>Controle USB-MIDI; não transmite áudio do teclado</small><button id="gx-device-connect">Conectar USB</button></div><div class="gx-panel gx-fav-side"><div class="gx-section-label">TIMBRES FAVORITOS <button id="gx-sound-fav-edit">Editar</button></div><div id="gx-sound-favorites"></div></div></aside></div></div>',
 '<div class="gx-screen" data-gx-screen="coach"><div class="gx-coach-layout"><div class="gx-panel gx-listening"><h3>Escuta e análise</h3><button id="gx-mic" class="gx-mic-circle" aria-label="Iniciar ou parar escuta">♩</button><strong id="gx-mic-label">Escuta parada</strong><span id="gx-mic-sub">Toque para iniciar o microfone</span><div class="gx-wave" id="gx-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>',
 '<div class="gx-panel gx-analysis"><h3>Resultado da análise</h3><div class="gx-analysis-grid"><div class="gx-reading"><small>NOTA DETECTADA</small><strong id="gx-heard-note">—</strong><span>Voz / instrumento dominante</span></div><div class="gx-reading"><small>TOM SUGERIDO</small><strong id="gx-heard-key">—</strong><span id="gx-heard-mode">Aguardando áudio</span></div><div class="gx-reading"><small>MODO</small><select id="gx-mode"><option value="0">Maior</option><option value="1">Menor</option></select><span>Referência da música</span></div><div class="gx-reading"><small>ACORDE MIDI</small><strong id="gx-heard-chord">—</strong><span>Teclas pressionadas</span></div><div class="gx-reading"><small>ÍNDICE DE CONFIANÇA</small><strong id="gx-heard-confidence">—</strong><span>Heurístico, não probabilidade</span></div><div class="gx-reading"><small>GRAU ATUAL</small><strong id="gx-heard-degree">—</strong><span>Baseado no tom de referência</span></div></div><div class="gx-section-label">HISTÓRICO DE NOTAS</div><div id="gx-note-history" class="gx-history">Aguardando notas reais…</div></div>',
 '<aside class="gx-panel gx-coach-tips"><h3>✦ Dicas do Copiloto</h3><p id="gx-tip-text">Inicie a escuta para analisar a voz. Conecte o XPS-10 para ler os acordes tocados por MIDI.</p><button id="gx-ai-settings">Configurar IA local</button><div class="gx-gemma-chat"><label for="gx-gemma-question">Pergunte ao copiloto offline</label><textarea id="gx-gemma-question" rows="3" maxlength="1200" placeholder="Ex.: Como harmonizar essa música com pads e piano?"></textarea><button id="gx-gemma-send">Perguntar à Gemma</button><div id="gx-gemma-answer" role="status" aria-live="polite">Aguardando pergunta. Instale a Gemma em Ajustes para usar offline.</div></div><button id="gx-ai-ask">Editor completo do assistente</button><label>Sensibilidade / áudio <input id="gx-sense" type="range" min="1" max="10" value="5" disabled title="Calibração de sensibilidade ainda não disponível"></label></aside></div></div>',
 '<div class="gx-screen" data-gx-screen="backups"><div class="gx-backups gx-panel"><div class="gx-section-label">BACKUPS DO ROLAND XPS-10 <small>Biblioteca de cópias originais</small></div><p class="gx-backup-intro">Importe os arquivos do pendrive. O Grauê guarda cópias locais, verifica duplicados e permite exportar o mesmo conteúdo. Nenhum arquivo é restaurado no XPS-10.</p><div class="gx-backup-actions"><button id="gx-backup-import" class="gx-start">↥ Importar backups</button><button id="gx-backup-refresh">↻ Atualizar biblioteca</button><button id="gx-backup-export-index">↓ Exportar catálogo JSON</button><button id="gx-backup-merge" disabled title="Mesclagem requer validação do formato de backups Roland">Mesclar timbres — indisponível</button></div><div id="gx-backup-list" class="gx-backup-list" aria-live="polite"><p class="gx-empty">Carregando cópias disponíveis…</p></div><p id="gx-backup-comparison" class="gx-backup-compare"></p><p class="gx-backup-warning">Atenção: restaurar no teclado pode substituir os dados atuais. A mesclagem de backups ainda não é compatível nem validada; não altere arquivos proprietários manualmente.</p></div></div>',
 '<div class="gx-screen" data-gx-screen="settings"><div class="gx-panel gx-settings"><h2>Ajustes e integrações</h2><section class="gx-gemma-panel" id="gx-gemma-panel"><div class="gx-gemma-heading"><strong>✦ Gemma 3 270M — IA local</strong><span id="gx-gemma-status">Verificando instalação…</span></div><p>Instalação de aproximadamente 304 MB, uma única vez. Depois, o Copiloto responde offline sem enviar perguntas para servidores. Este modelo conversa sobre música, mas não escuta áudio diretamente.</p><p class="gx-gemma-source">Pesos publicados por um espelho comunitário, não hospedados pelo Google. O arquivo é verificado por assinatura SHA-256 antes da instalação.</p><div class="gx-gemma-links"><button id="gx-gemma-terms">Ler Termos de Uso Gemma ↗</button><button id="gx-gemma-source">Origem do modelo ↗</button></div><label class="gx-gemma-license"><input id="gx-gemma-accept" type="checkbox"> Li e aceito os Termos de Uso Gemma e estou ciente da origem do arquivo.</label><div class="gx-gemma-controls"><button id="gx-gemma-install" disabled>Instalar Gemma 270M</button><button id="gx-gemma-cancel" hidden>Pausar</button><button id="gx-gemma-try">Testar IA</button></div><progress id="gx-gemma-progress" value="0" max="100" hidden></progress><div id="gx-gemma-info" role="status" aria-live="polite">Modelo ainda não configurado.</div></section><div class="gx-settings-grid"><button id="gx-connect-settings">♬ Conexão USB-MIDI<br><small>Selecionar dispositivo</small></button><button id="gx-read-settings">▤ Ler XPS-10<br><small>Carregar Performance atual</small></button><button id="gx-legacy-editor">⚙ Editor avançado<br><small>Efeitos, splits e 16 partes</small></button><button id="gx-legacy-repertoire">▥ Repertório e arquivos<br><small>Importar e exportar setlists</small></button><button id="gx-legacy-ai">✧ Modelo de IA local<br><small>Selecionar e testar modelo</small></button><button id="gx-legacy-settings">☷ Ajustes completos<br><small>Configurações do dispositivo</small></button><button id="gx-backups-settings">▦ Biblioteca de backups<br><small>Importação segura do pendrive</small></button><button id="gx-cifra-settings">♫ Cifra Club<br><small>Abrir sessão no navegador</small></button></div><p>O Bip 6 permanece desativado enquanto houver reinicializações no relógio. A análise de voz acompanhada por instrumentos ainda é experimental.</p></div></div>'
 ].join('');
 const oldMain=document.querySelector('main');oldMain.parentNode.insertBefore(shell,oldMain);
 document.body.classList.add('gx-ready');
 const toast=document.createElement('div');
 toast.id='gx-toast'; toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
 document.body.append(toast);
 let toastTimer;
 function notify(message){
  const m=S(message).trim();if(!m||m===toast.textContent)return;
  toast.textContent=m;toast.classList.add('gx-show');clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{toast.classList.remove('gx-show');toast.textContent='';},5200);
 }
 const statusNode=document.getElementById('status');
 if(statusNode&&typeof MutationObserver!=='undefined'){
  new MutationObserver(()=>notify(statusNode.textContent)).observe(statusNode,{childList:true,characterData:true,subtree:true});
 }
 const returnButton=document.createElement('button');returnButton.id='gx-return';returnButton.textContent='← Voltar ao Grauê XPS';returnButton.onclick=()=>{document.body.classList.remove('gx-legacy');sync();};
 document.body.append(returnButton);
 const screens=[...shell.querySelectorAll('[data-gx-screen]')],tabs=[...shell.querySelectorAll('[data-gx-tab]')];
 let active='stage',filter='all',section='cifra',soundSection='tones',selectedIndex=-1,partPage=0,transposeSteps=0;
 let lastAudio=null,hw={},connected=false,recording=false,notesHistory=[],keyName='—',lastCh='—';
 let backupRows=[],backupSelection=new Set();
 const friendlyNote=midi=>Number.isInteger(midi)&&midi>=0&&midi<=127?M.names[midi%12]+String(Math.floor(midi/12)-1):'—';
 const switchTab=name=>{active=name;screens.forEach(n=>n.classList.toggle('on',n.dataset.gxScreen===name));tabs.forEach(n=>n.classList.toggle('on',n.dataset.gxTab===name));sync();if(name==='backups'&&window.Native?.listBackups)window.Native.listBackups();};
 tabs.forEach(b=>b.onclick=()=>switchTab(b.dataset.gxTab));$x('gx-open-settings').onclick=()=>switchTab('settings');
 const openLegacy=tab=>{document.body.classList.add('gx-legacy');let b=document.querySelector('[data-tab="'+tab+'"]');if(b)b.click();window.scrollTo(0,0);};
 const read=()=>callOld('readHardware');
 const arm=()=>callOld('liveArm');
 const connect=()=>callOld('connect');
 const openCifra=()=>{switchTab('repertoire');callOld('liveCifra');};
 const stageParts=[['▥','Lower','Parte 1'],['▥','Upper','Parte 2'],['▣','Split','Divisão'],['▤','Layer','Camadas'],['♩','Piano','Timbres'],['♫','E.Piano','Timbres'],['♬','Órgão','Timbres'],['♮','Strings','Timbres'],['♧','Brass','Timbres'],['♬','Synth','Timbres'],['▦','Pads','Bateria'],['✧','FX','Efeitos']];
 stageParts.forEach(([glyph,title,desc],i)=>{
  const b=document.createElement('button');b.innerHTML='<strong>'+glyph+'</strong><span>'+title+'</span><small>'+desc+'</small>';
  b.onclick=()=>{if(i<2){let p=$x('livePart');p.value=String(i);if(p.onchange)p.onchange();switchTab('sound');}
  else if(i===2||i===3){switchTab('sound');soundSection=i===2?'split':'split';showSoundPanel();}
  else if(i===10){switchTab('stage');callOld('liveDrums');}
  else if(i===11){switchTab('sound');soundSection='effects';showSoundPanel();}
  else{switchTab('sound');soundSection='tones';toneCategory=({4:'Pf',5:'Pf',6:'Ky',7:'St',8:'Bs',9:'Sy'})[i]||'';renderCategories();showSoundPanel();}};
  $x('gx-stage-parts').append(b);
 });
 $x('gx-start').onclick=()=>{if(!playing)callOld('play');switchTab('stage');sync();};
 $x('gx-pause').onclick=()=>{if(playing)callOld('play');sync();};
 $x('gx-next').onclick=()=>{const at=songs.findIndex(s=>s.title===song.title);if(songs.length>1){selectedIndex=(at+1+songs.length)%songs.length;select(songs[selectedIndex]);transposeSteps=0;sync();}else{notify('Adicione outra música ao repertório para usar Próxima música.');}};
 $x('gx-panic').onclick=()=>{if(confirm('Enviar All Notes Off e soltar sustain nos 16 canais MIDI? Isso pode interromper o som do teclado.'))callOld('livePanic');};
 $x('gx-down').onclick=()=>{callOld('down');transposeSteps--;sync();};
 $x('gx-up').onclick=()=>{callOld('up');transposeSteps++;sync();};
 $x('gx-show-favorites').onclick=()=>{let e=$x('gx-live-favorites');e.scrollIntoView({behavior:'smooth',block:'center'});};
 for(let i=1;i<=16;i++){let option=document.createElement('option');option.value=String(i);option.textContent=String(i);$x('gx-assist-channel').append(option);}
 $x('gx-assist-channel').value=String(saved.assistChannel||3);
 $x('gx-assist-channel').onchange=()=>{saved.assistChannel=+$x('gx-assist-channel').value;persist();};
 $x('gx-assist-play').onclick=()=>{
  const name=String(song.chords?.[idx]||'').trim(),notes=M.voicing(name,[60,64,67]).slice(0,5);
  if(!notes.length){notify('Selecione uma cifra com acordes identificáveis primeiro.');return;}
  if(!window.Native?.playAssistChord){notify('Controle MIDI de apoio indisponível. Atualize o APK.');return;}
  window.Native.playAssistChord(JSON.stringify({channel:+$x('gx-assist-channel').value,notes,velocity:58,duration:900}));
 };
 $x('gx-assist-stop').onclick=()=>window.Native?.stopAssistChord?.();

 $x('gx-edit-fav').onclick=()=>{switchTab('sound');soundSection='favorites';showSoundPanel();};
 $x('gx-connect').onclick=connect;$x('gx-read').onclick=read;$x('gx-arm').onclick=arm;$x('gx-show-mode').onclick=()=>callOld('liveFocus');
 $x('gx-search').oninput=renderSongs;
 shell.querySelectorAll('[data-gx-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.gxFilter;shell.querySelectorAll('[data-gx-filter]').forEach(x=>x.classList.toggle('on',x===b));renderSongs();});
 $x('gx-add-song').onclick=()=>openLegacy('songs');
 shell.querySelectorAll('[data-gx-rep]').forEach(b=>b.onclick=()=>{section=b.dataset.gxRep;shell.querySelectorAll('[data-gx-rep]').forEach(x=>x.classList.toggle('on',b===x));renderRepertoire();});
 for(const id of ['gx-open-cifra','gx-view-cifra'])$x(id).onclick=openCifra;
 $x('gx-import-cifra').onclick=()=>{if(window.Native&&window.Native.importCifra)window.Native.importCifra();else openCifra();};
 $x('gx-save-cifra').onclick=()=>{if(!song||!song.title){return;}let at=songs.findIndex(s=>s.title===song.title);if(at<0)songs.push({...song});else songs[at]={...song};persist();renderSongs();$x('status').textContent='Música salva no repertório local.';};
 $x('gx-transpose-cifra').onclick=()=>{callOld('up');transposeSteps++;sync();};
 shell.querySelectorAll('[data-gx-sound]').forEach(b=>b.onclick=()=>{soundSection=b.dataset.gxSound;showSoundPanel();});
 $x('gx-advanced').onclick=()=>openLegacy('sound');
 $x('gx-perf-read').onclick=read;$x('gx-perf-edit').onclick=()=>openLegacy('sound');$x('gx-perf-new').onclick=()=>openLegacy('sound');
 $x('gx-user-patches').onclick=()=>{if(confirm('Atualizar os 256 timbres USER? A leitura automática já mantém um cache local; repita somente após alterar o teclado.'))window.Native?.readUserTones?.();};
 $x('gx-parts-page1').onclick=()=>{partPage=0;renderMixer();};
 $x('gx-parts-page2').onclick=()=>{partPage=1;renderMixer();};
 $x('gx-sound-fav-edit').onclick=()=>{switchTab('sound');soundSection='favorites';showSoundPanel();};
 $x('gx-device-connect').onclick=connect;
 $x('gx-mic').onclick=()=>callOld('mic');
 $x('gx-mode').onchange=()=>{let x=$x('mode');x.value=$x('gx-mode').value;if(x.onchange)x.onchange();sync();};
 $x('gx-backup-import').onclick=()=>{if(window.Native?.importXpsBackups)window.Native.importXpsBackups();else notify('Importação de backup só está disponível no APK Android.');};
 $x('gx-backup-refresh').onclick=()=>{if(window.Native?.listBackups)window.Native.listBackups();};
 $x('gx-backup-export-index').onclick=()=>{if(window.Native?.exportFile)window.Native.exportFile(JSON.stringify({app:'Graue XPS',kind:'catalog-only',note:'Os arquivos BIN devem ser exportados individualmente.',backups:backupRows},null,2));};
 $x('gx-connect-settings').onclick=connect;$x('gx-read-settings').onclick=read;
 $x('gx-backups-settings').onclick=()=>switchTab('backups');
 $x('gx-cifra-settings').onclick=openCifra;
 const gemmaAccept=$x('gx-gemma-accept');
 const gemmaInstall=$x('gx-gemma-install');
 const gemmaCancel=$x('gx-gemma-cancel');
 const gemmaProgress=$x('gx-gemma-progress');
 const gemmaInfo=$x('gx-gemma-info');
 const gemmaStatus=$x('gx-gemma-status');
 gemmaAccept.onchange=()=>{if(!gemmaInstall.dataset.busy)gemmaInstall.disabled=!gemmaAccept.checked;};
 $x('gx-gemma-terms').onclick=()=>{if(window.Native?.openReference)window.Native.openReference('gemmaTerms');};
 $x('gx-gemma-source').onclick=()=>{if(window.Native?.openReference)window.Native.openReference('gemmaSource');};
 gemmaInstall.onclick=()=>{if(!gemmaAccept.checked){notify('Leia os termos antes de instalar.');return;}
  if(!window.Native?.installGemma){notify('Esta instalação requer o aplicativo Android atualizado.');return;}
  window.Native.installGemma(true);
  gemmaInstall.dataset.busy='1';gemmaInstall.disabled=true;gemmaCancel.hidden=false;
  gemmaProgress.hidden=false;gemmaStatus.textContent='Iniciando download…';
 };
 gemmaCancel.onclick=()=>{window.Native?.cancelGemma?.();gemmaStatus.textContent='Pausando transferência…';};
 $x('gx-gemma-try').onclick=()=>{if(!window.Native?.testModel){notify('Motor local indisponível.');return;}window.Native.testModel();switchTab('coach');$x('gx-gemma-answer').textContent='Verificando IA local…';};
 $x('gx-gemma-send').onclick=()=>{
  const question=$x('gx-gemma-question').value.trim();
  if(!question){notify('Digite uma pergunta musical.');return;}
  if(!window.Native?.ask){notify('IA local indisponível no APK.');return;}
  const context='Música atual: '+S(song.title).slice(0,80)+'. Tom de referência: '+M.names[root]+(minor?' menor':' maior')+'. Acorde atual no repertório: '+S(song.chords?.[idx]||'sem acorde').slice(0,25)+'. Nota ouvida: '+(lastAudio&&Number.isInteger(lastAudio.midi)?friendlyNote(lastAudio.midi):'não identificada')+'. Acorde tocado por MIDI: '+S(lastCh).slice(0,24)+'. ';
  const prompt=(context+'Pergunta do músico: '+question).slice(0,2250);
  $x('gx-gemma-answer').textContent='A IA está elaborando a resposta offline…';
  window.Native.ask(prompt);
 };

 $x('gx-ai-settings').onclick=()=>{switchTab('settings');$x('gx-gemma-panel').scrollIntoView({behavior:'smooth',block:'start'});};$x('gx-ai-ask').onclick=()=>openLegacy('coach');
 for(const [id,tab] of [['gx-legacy-settings','settings'],['gx-legacy-editor','sound'],['gx-legacy-repertoire','songs'],['gx-legacy-ai','settings']])$x(id).onclick=()=>openLegacy(tab);
 function showSoundPanel(){
   shell.querySelectorAll('[data-gx-sound]').forEach(b=>b.classList.toggle('on',b.dataset.gxSound===soundSection));
   const tonesMode=soundSection==='tones'||soundSection==='favorites';
   $x('gx-one-touch').hidden=!tonesMode;
   $x('gx-advanced-mixer').hidden=tonesMode;
   if(soundSection==='favorites'){toneOnlyFavs=true;renderToneList();}
   if(soundSection==='tones'){toneOnlyFavs=false;renderToneList();}
   if(soundSection==='split'||soundSection==='effects'||soundSection==='arpeggio')openLegacy('sound');
   if(!tonesMode)renderMixer();
 }
 const songFavoriteSet=()=>new Set(Array.isArray(saved.songFavorites)?saved.songFavorites:[]);
 function renderSongs(){
  const box=$x('gx-songs'),q=$x('gx-search').value.trim().toLowerCase(),favs=songFavoriteSet();box.replaceChildren();
  let items=songs.map((s,i)=>({s,i})).filter(({s})=>(S(s.title)+' '+S(s.category)+' '+S(s.root)).toLowerCase().includes(q));
  if(filter==='favorites')items=items.filter(({s})=>favs.has(s.title));
  if(filter==='setlist')items=items.filter(({s})=>S(s.category).toLowerCase().includes('setlist'));
  if(filter==='recent')items=items.slice(-12).reverse();
  if(!items.length){let p=document.createElement('p');p.className='gx-empty';p.textContent='Nenhuma música encontrada. Abra o Cifra Club e importe uma cifra.';box.append(p);}
  items.forEach(({s,i})=>{
   let row=document.createElement('div');row.className='gx-song-row'+(song.title===s.title?' active':'');
   let pick=document.createElement('button'),star=document.createElement('button');
   pick.className='gx-song-pick';let title=document.createElement('strong');title.textContent=s.title;let sub=document.createElement('small');sub.textContent=s.category||'Sem categoria';pick.append(title,sub);
   pick.onclick=()=>{selectedIndex=i;transposeSteps=0;select(s);renderSongs();renderRepertoire();syncStage();};
   star.className='gx-song-star';star.textContent=favs.has(s.title)?'★':'☆';star.setAttribute('aria-label','Favoritar '+s.title);
   star.onclick=()=>{let set=songFavoriteSet();set.has(s.title)?set.delete(s.title):set.add(s.title);saved.songFavorites=[...set];persist();renderSongs();};
   row.append(pick,star);box.append(row);
  });
 }
 function renderRepertoire(){
   $x('gx-cifra-title').textContent=song.title||'Escolha uma música';
   $x('gx-cifra-meta').textContent=song.category||'Repertório local';
   $x('gx-cifra-key').textContent='Tom de referência: '+M.names[root]+(minor?' menor':' maior');
   const content=$x('gx-cifra-content');content.replaceChildren();
   if(section==='setlist'){content.textContent='Escolha músicas pela lista à esquerda. A ordem da apresentação pode ser preparada no editor completo.';return;}
   if(section==='notes'){content.textContent='Anotações da música selecionada. Para editar, abra o editor de repertório.';let b=document.createElement('button');b.textContent='Editar música';b.onclick=()=>openLegacy('songs');content.append(b);return;}
   let txt=S(song.text).trim();
   if(section==='letter'&&txt)txt=txt.replace(/\[[^\]]+\]/g,'');
   if(!txt)txt='Cifra ainda não importada. Abra o Cifra Club, localize a música e toque Importar no navegador.';
   const p=document.createElement('pre');p.className='gx-cifra-text';p.textContent=txt;content.append(p);
 }
 const toneCategories=[
  ['','Todas'],['Pf','Piano / E.Piano'],['Ky','Órgão / Teclas'],['St','Cordas / Guitarra'],
  ['Bs','Metais / Baixo'],['Sy','Synth / Pad'],['Wr','World / Outros'],
  ['Dr','Bateria / FX'],['USER','USER']
 ];
 let toneCategory='',toneBank=0,toneOnlyFavs=false,toneEditing=null,toneVariant='original',lastSelectedTone=null;
 let toneVariants={},toneAiPending=false,longPressTimer=null;
 const toneLib=()=>window.ToneLibrary;
 for(let i=0;i<16;i++){let op=document.createElement('option');op.value=String(i);op.textContent=String(i+1);$x('gx-tone-part').append(op);}
 $x('gx-tone-part').value=String(saved.lastTonePart||0);
 $x('gx-tone-part').onchange=()=>{saved.lastTonePart=+$x('gx-tone-part').value;persist();};
 function chooseTone(t){
  lastSelectedTone=t;
  if(!window.Native?.selectTone){notify('Conecte o XPS-10 pelo USB para trocar o timbre.');return;}
  window.Native.selectTone(t.msb,t.lsb,t.program,+$x('gx-tone-part').value);
  notify('Timbre solicitado: '+t.name+'. Confira a resposta e toque no teclado.');
 }
 function bindToneTouch(button,t){
  let opened=false;
  button.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;
   opened=false;
   clearTimeout(longPressTimer);
   longPressTimer=setTimeout(()=>{opened=true;openToneEditor(t);},3000);
  });
  for(let evt of ['pointerup','pointerleave','pointercancel'])button.addEventListener(evt,()=>clearTimeout(longPressTimer));
  button.addEventListener('contextmenu',e=>{e.preventDefault();opened=true;clearTimeout(longPressTimer);openToneEditor(t);});
  button.onclick=()=>{if(opened){opened=false;return;}chooseTone(t);};
 }
 function renderToneList(){
  const grid=$x('gx-tone-list');if(!grid)return;
  let q=$x('gx-tone-search').value.toLocaleLowerCase('pt-BR').trim();
  let tones=(toneLib()?.list()||[]).filter(t=>{
   const cat=t.code?.startsWith('USER')?'USER':String(t.code||'').slice(0,2);
   return (!toneCategory||toneCategory===cat)&&(!toneOnlyFavs||toneLib().favorites().has(t.code))
    &&(t.name+' '+t.code+' '+t.category).toLocaleLowerCase('pt-BR').includes(q);
  });
  $x('gx-tone-count').textContent=tones.length+' timbres nesta seleção · toque para enviar · segure 3s para editar';
  grid.replaceChildren();
  if(!tones.length){const el=document.createElement('p');el.textContent=toneCategory==='USER'?'Conecte o XPS-10 para carregar os 256 USER uma única vez.':'Nenhum timbre encontrado nesta categoria.';grid.append(el);}
  tones.slice(0,90).forEach(t=>{
   const line=document.createElement('div');line.className='gx-tone-line';
   const pick=document.createElement('button');pick.className='gx-tone-pick';pick.textContent=t.code+' · '+(t.name||'Sem nome');
   bindToneTouch(pick,t);
   const star=document.createElement('button');star.textContent=toneLib().favorites().has(t.code)?'★':'☆';star.setAttribute('aria-label','Favoritar '+t.name);
   star.onclick=()=>{const favorites=toneLib().favorites();favorites.has(t.code)?favorites.delete(t.code):favorites.add(t.code);saved.toneFavorites=[...favorites];persist();renderToneList();renderFavorites();};
   const more=document.createElement('button');more.textContent='Editar';more.onclick=()=>openToneEditor(t);
   line.append(pick,star,more);grid.append(line);
  });
 }
 toneCategories.forEach(([key,label])=>{
  const b=document.createElement('button');b.textContent=label;b.onclick=()=>{toneCategory=key;toneOnlyFavs=false;renderToneList();renderCategories();};b.dataset.category=key;$x('gx-tone-categories').append(b);
 });
 function renderCategories(){
  $x('gx-tone-categories').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.category===toneCategory));
 }
 $x('gx-tone-search').oninput=renderToneList;
 $x('gx-tone-favorites').onclick=()=>{toneOnlyFavs=!toneOnlyFavs;$x('gx-tone-favorites').classList.toggle('on',toneOnlyFavs);renderToneList();};
 for(let i=0;i<10;i++){
  const b=document.createElement('button');b.textContent='Banco '+i;b.dataset.bank=String(i);
  b.onclick=()=>{toneBank=i;renderBanks();};$x('gx-bank-tabs').append(b);
 }
 function renderLiveBanks(){
  const nav=$x('gx-live-bank-tabs'),slots=$x('gx-live-bank-slots');
  nav.replaceChildren();slots.replaceChildren();
  for(let i=0;i<10;i++){
   const btn=document.createElement('button');btn.textContent=String(i);
   btn.classList.toggle('on',toneBank===i);btn.onclick=()=>{toneBank=i;renderBanks();};
   nav.append(btn);
   const t=toneLib()?.slot(toneBank,i);
   const pick=document.createElement('button');pick.className='gx-live-bank-slot';
   pick.textContent=(i+1)+'. '+(t?t.name:'—');
   pick.disabled=!t;pick.onclick=()=>{if(t)chooseTone(t);};
   slots.append(pick);
  }
  $x('gx-live-bank-name').textContent=String(toneBank);
 }
 function renderBanks(){
  $x('gx-bank-tabs').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.bank===toneBank));
  const grid=$x('gx-bank-slots');grid.replaceChildren();
  for(let i=0;i<10;i++){
   const t=toneLib()?.slot(toneBank,i);
   const b=document.createElement('button');b.className='gx-bank-slot';b.textContent=i+' · '+(t?t.name:'Vazio');
   b.onclick=()=>{if(t)chooseTone(t);else if(lastSelectedTone){toneLib().putSlot(toneBank,i,lastSelectedTone);notify('Timbre adicionado ao banco '+toneBank+', posição '+i);renderBanks();}else notify('Selecione primeiro um timbre na lista para preencher este espaço.');};
   b.oncontextmenu=e=>{e.preventDefault();if(t&&confirm('Remover este favorito somente do banco do aplicativo?')){toneLib().putSlot(toneBank,i,null);renderBanks();}};
   grid.append(b);
  }
  renderLiveBanks();
 }
 function openToneEditor(t){
  const part=+$x('gx-tone-part').value,p=hw['part:'+part];
  toneEditing=t;toneAiPending=false;
  const level=p&&Number.isInteger(p[7])?p[7]:100;
  const source=p?{name:'Original lido do XPS-10',msb:p[4],lsb:p[5],program:p[6]+1,volume:level,notes:'Valores recuperados pela leitura MIDI desta parte.'}:null;
  toneVariants={
   original:source,
   manual:{name:'Minha edição',msb:t.msb,lsb:t.lsb,program:t.program,volume:level,notes:'Ajuste o volume e teste.'},
   ai:null
  };
  $x('gx-edit-name').textContent=t.name+' · Parte '+(part+1);
  $x('gx-edit-status').textContent=source?'Configuração original disponível para comparação.':'Original ainda não lido. Conecte e leia para comparar o estado do teclado.';
  setToneVariant('manual');
  $x('gx-tone-dialog').showModal();
 }
 function setToneVariant(mode){
  toneVariant=mode;const v=toneVariants[mode];
  $x('gx-tone-dialog').querySelectorAll('[data-gx-variant]').forEach(b=>b.classList.toggle('on',b.dataset.gxVariant===mode));
  $x('gx-edit-volume').disabled=!v||mode==='original';
  $x('gx-edit-notes').readOnly=!v||mode==='original';
  $x('gx-edit-test').disabled=!v;
  $x('gx-edit-volume').value=v?v.volume:100;
  $x('gx-edit-volume-value').textContent=v?String(v.volume):'—';
  $x('gx-edit-notes').value=v?v.notes:'Sem sugestão da IA. Instale a Gemma e toque em Pedir sugestão.';
 }
 $x('gx-tone-dialog').querySelectorAll('[data-gx-variant]').forEach(b=>b.onclick=()=>setToneVariant(b.dataset.gxVariant));
 $x('gx-edit-close').onclick=()=>$x('gx-tone-dialog').close();
 $x('gx-edit-volume').oninput=()=>{
  const v=toneVariants[toneVariant];if(v&&toneVariant!=='original')v.volume=+$x('gx-edit-volume').value;
  $x('gx-edit-volume-value').textContent=$x('gx-edit-volume').value;
 };
 $x('gx-edit-notes').oninput=()=>{const v=toneVariants[toneVariant];if(v&&toneVariant!=='original')v.notes=$x('gx-edit-notes').value;};
 $x('gx-edit-suggest').onclick=()=>{
  if(!toneEditing||!window.Native?.ask)return notify('IA local indisponível. Configure a Gemma em Ajustes.');
  toneAiPending=true;
  $x('gx-edit-status').textContent='Gerando sugestão musical offline…';
  window.Native.ask('Você é um consultor de timbres do Roland XPS-10. Timbre '+toneEditing.name+', categoria '+toneEditing.category+'. Parte '+(+$x('gx-tone-part').value+1)+'. Sugira volume para solo ou acompanhamento. Responda SOMENTE JSON com duas propriedades: {"volume":numero inteiro entre 0 e 127,"reason":"frase curta em português"}. Não simule alterações no teclado.');
 };
 $x('gx-edit-test').onclick=()=>{
  const v=toneVariants[toneVariant];if(!v)return;
  if(!window.Native?.selectTone)return notify('Conecte USB-MIDI antes de testar.');
  const part=+$x('gx-tone-part').value;
  if(hw['setup:0']?.[0]===1&&hw['part:'+part]){
   window.Native.selectToneWithVolume?.(v.msb,v.lsb,v.program,part,v.volume);
   $x('gx-edit-status').textContent='Timbre e volume enviados para teste temporário. Aguarde a confirmação MIDI.';
  }else{
   window.Native.selectTone(v.msb,v.lsb,v.program,part);
   $x('gx-edit-status').textContent='Modo Patch ou leitura não confirmada. Program Change enviado; confira o teclado.';
  }
 };
 $x('gx-edit-save').onclick=()=>{$x('gx-edit-confirm').hidden=false;};
 $x('gx-edit-yes').onclick=()=>{
  const v=toneVariants[toneVariant];if(v&&toneEditing){
   if(!saved.tonePresets)saved.tonePresets={};
   saved.tonePresets[toneEditing.code]={...v,source:toneVariant,part:+$x('gx-tone-part').value};
   persist();notify('Configuração salva no Grauê. A memória do teclado não foi sobrescrita.');
  }
  $x('gx-edit-confirm').hidden=true;$x('gx-tone-dialog').close();
 };
 $x('gx-edit-no').onclick=()=>{$x('gx-edit-confirm').hidden=true;notify('Edição não salva.');};
 $x('gx-edit-undo').onclick=()=>{window.Native?.undoHardware?.();notify('Desfazer solicitado. Confira a leitura no XPS-10.');};
 function onToneAiAnswer(answer){
  if(!toneAiPending||!toneEditing)return;
  toneAiPending=false;
  const text=S(answer).trim();let parsed=null;
  try{const m=text.match(/\{[\s\S]*?\}/);if(m)parsed=JSON.parse(m[0]);}catch(e){}
  if(parsed&&Number.isInteger(parsed.volume)&&parsed.volume>=0&&parsed.volume<=127){
   toneVariants.ai={name:'Sugestão Gemma',msb:toneEditing.msb,lsb:toneEditing.lsb,program:toneEditing.program,volume:parsed.volume,notes:S(parsed.reason).slice(0,1000)};
   setToneVariant('ai');
   $x('gx-edit-status').textContent='A IA sugeriu uma configuração. Teste antes de salvar.';
  }else{
   $x('gx-edit-status').textContent='Sugestão recebida como texto; verifique os valores antes de editar.';
   toneVariants.ai={name:'Texto da IA',msb:toneEditing.msb,lsb:toneEditing.lsb,program:toneEditing.program,volume:100,notes:text.slice(0,1000)};
   setToneVariant('ai');
  }
 }
 renderCategories();renderBanks();renderToneList();
 function renderFavorites(){
   const tones=(window.ToneLibrary?.list()||[]).filter(t=>window.ToneLibrary.favorites().has(t.code)).slice(0,12);
   const stage=$x('gx-live-favorites'),side=$x('gx-sound-favorites');stage.replaceChildren();side.replaceChildren();
   if(!tones.length){for(const el of [stage,side]){const p=document.createElement('p');p.className='gx-empty';p.textContent='Marque timbres como favoritos em Sons para aparecerem aqui.';el.append(p);}return;}
   tones.forEach((t,i)=>{
    const b=document.createElement('button');b.className='gx-fav-tile gx-fav-'+i%8;
    const name=document.createElement('strong');name.textContent=t.name;const code=document.createElement('small');code.textContent=t.code;
    b.append(name,code);bindToneTouch(b,t);stage.append(b);
    const entry=document.createElement('button');entry.className='gx-fav-entry';entry.textContent=t.name+' · '+t.code;entry.onclick=()=>b.click();side.append(entry);
   });
 }
 function renderBackups(){
  const box=$x('gx-backup-list');box.replaceChildren();
  if(!backupRows.length){let p=document.createElement('p');p.className='gx-empty';p.textContent='Nenhum backup salvo. Use Importar backups para escolher arquivos do pendrive.';box.append(p);return;}
  backupRows.forEach((data,i)=>{
   const row=document.createElement('div');row.className='gx-backup-row';
   const mark=document.createElement('input');mark.type='checkbox';mark.checked=backupSelection.has(data.sha256);
   mark.setAttribute('aria-label','Selecionar backup '+data.name);
   mark.onchange=()=>{mark.checked?backupSelection.add(data.sha256):backupSelection.delete(data.sha256);updateBackupComparison();};
   const info=document.createElement('div');info.className='gx-backup-name';
   const title=document.createElement('strong');title.textContent=data.name||'Backup sem nome';
   const details=document.createElement('small');details.textContent=(Math.round((data.bytes||0)/1024))+' KB · SHA-256: '+String(data.sha256||'').slice(0,14)+'… · arquivo original protegido';
   info.append(title,details);
   const btn=document.createElement('button');btn.textContent='Exportar';
   btn.onclick=()=>{if(window.Native?.exportXpsBackup)window.Native.exportXpsBackup(data.sha256);};
   const remove=document.createElement('button');remove.className='gx-danger-inline';remove.textContent='Excluir cópia';
   remove.onclick=()=>{if(confirm('Excluir apenas esta cópia do Grauê? O arquivo original do pendrive e o teclado não serão alterados.'))window.Native?.deleteXpsBackup?.(data.sha256);};
   row.append(mark,info,btn,remove);box.append(row);
  });
  updateBackupComparison();
 }
 function updateBackupComparison(){
  const el=$x('gx-backup-comparison');if(!el)return;
  const selected=backupRows.filter(r=>backupSelection.has(r.sha256));
  el.textContent=selected.length===0?'Marque arquivos para comparar tamanho e assinatura.':selected.length===1?'1 backup selecionado — selecione mais um para comparar.':selected.length+' backups distintos selecionados. Assinaturas SHA-256 diferentes; timbres internos ainda não foram interpretados. A mesclagem não está habilitada.';
 }
 function renderMixer(){
  $x('gx-parts-page1').classList.toggle('on',partPage===0);$x('gx-parts-page2').classList.toggle('on',partPage===1);
  let grid=$x('gx-mixer-parts');grid.replaceChildren();
  for(let i=partPage*8;i<partPage*8+8;i++){
   const p=hw['part:'+i],col=document.createElement('div');col.className='gx-channel';
   const num=document.createElement('b');num.textContent=i+1;const name=document.createElement('span');name.textContent=p?'CH '+(p[0]+1):'Sem leitura';
   const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=127;slider.value=p?String(p[7]):'0';slider.disabled=!p;
   slider.setAttribute('aria-label','Volume da parte '+(i+1));
   const out=document.createElement('strong');out.textContent=p?p[7]:'—';
   slider.oninput=()=>out.textContent=slider.value;
   slider.onchange=()=>{
    if(!p)return;
    if(!$x('arm').checked){notify('Ative o envio MIDI antes de modificar volume.');renderMixer();return;}
    if(!hw['setup:0']||hw['setup:0'][0]!==1){notify('Leia uma Performance válida do XPS-10 antes de editar o volume.');renderMixer();return;}
    if(!window.Native||!window.Native.editHardware){notify('Conecte o XPS-10 pelo USB e atualize a leitura.');return;}
    const level=Number(slider.value);
    if(!Number.isInteger(level)||level<0||level>127){renderMixer();return;}
    // Altera nível da parte, não CC7 do canal, que poderia afetar outras partes.
    // O motor nativo aplica validação, snapshot e desfazer.
    try{
      window.Native.editHardware(JSON.stringify([{section:'part',index:i,offset:7,value:level}]));
      notify('Solicitada alteração da parte '+(i+1)+'. Confira a resposta do XPS-10.');
    }catch(e){notify('Falha ao solicitar edição MIDI. Faça nova leitura antes de repetir.');}

   };
   col.append(num,name,slider,out);grid.append(col);
  }
  const common=hw['common:0'];let perf='Performance ainda não lida';
  if(common&&common.length>=12){const v=common.slice(0,12).map(n=>n>=32&&n<=126?String.fromCharCode(n):'').join('').trim();if(v)perf=v;}
  $x('gx-perf-name').textContent=perf;
  $x('gx-device-state').textContent=hw['setup:0']?'● Performance respondendo por MIDI':'● XPS-10 • aguardando leitura';
 }
 function syncStage(){
  $x('gx-song-name').textContent=song.title||'Selecione uma música';
  $x('gx-song-cat').textContent=song.category||'Repertório local';
  $x('gx-key').textContent=M.names[root];$x('gx-scale').textContent=minor?'Menor':'Maior';
  $x('gx-bpm').textContent=$x('tempo')?.value||'72';
  $x('gx-next-chord').textContent=song.chords?.[(idx+1)%song.chords.length]||'—';
  $x('gx-section').textContent='Acorde '+String(idx+1);
  $x('gx-progress-bar').style.width=((idx+1)/Math.max(1,song.chords.length)*100)+'%';
  $x('gx-next-line').textContent=song.chords?.[idx]||'Sem acorde';
  $x('gx-assist-chord').textContent=song.chords?.[idx]||'—';
  $x('gx-transpose').textContent=(transposeSteps>0?'+':'')+transposeSteps;
  $x('gx-arm').textContent=$x('arm')?.checked?'Desabilitar envio MIDI':'Habilitar envio MIDI';
 }
 function renderCoach(){
  $x('gx-mic-label').textContent=recording?'Escuta ativa':'Escuta parada';
  $x('gx-mic-sub').textContent=recording?'Toque para parar':'Toque para iniciar o microfone';
  $x('gx-mic').classList.toggle('listening',recording);$x('gx-wave').classList.toggle('moving',recording);
  const v=lastAudio;$x('gx-heard-note').textContent=v?friendlyNote(v.midi):'—';
  $x('gx-heard-key').textContent=v&&v.root>=0?M.names[v.root]:'—';
  $x('gx-heard-mode').textContent=v&&v.root>=0?(v.mode===1?'Menor estimado':'Maior estimado'):'Ainda sem tom confiável';
  $x('gx-heard-confidence').textContent=v&&v.root>=0?String(v.confidence)+'/100':'—';
  $x('gx-heard-degree').textContent=v&&v.degree?['','I','II','III','IV','V','VI','VII'][v.degree]||'—':'—';
  $x('gx-heard-chord').textContent=lastCh;
  $x('gx-mode').value=minor?'1':'0';
  $x('gx-note-history').textContent=notesHistory.length?notesHistory.join('  •  '):'Aguardando notas reais…';
  $x('gx-tip-text').textContent=v&&v.root>=0?'Tom sugerido: '+M.names[v.root]+(v.mode===1?' menor':' maior')+'. Confira a resolução e os acordes tocados antes de confirmar.':'O tom maior ou menor pode ser ambíguo com poucas notas. Use MIDI para os acordes e microfone para a voz; a análise de áudio ainda é experimental.';
 }
 function sync(){syncStage();renderSongs();renderRepertoire();renderFavorites();renderMixer();renderCoach();$x('gx-usb').innerHTML='● XPS-10<br><small>'+(hw['setup:0']?'Dados lidos':'Aguardando')+'</small>';}
 // Recepção passiva: os dados provêm dos serviços originais; a interface nunca simula notas, status nem conexão.
 const prior=window.receive;
 window.receive=(kind,data)=>{
  prior(kind,data);
  if(kind==='hardware')hw=data||{};
  if(kind==='hardwareReset')hw={};
  if(kind==='mic')recording=!!data;
  if(kind==='audio'){lastAudio=data;if(Number.isInteger(data.midi)&&data.midi>=0){const n=friendlyNote(data.midi);if(notesHistory.at(-1)!==n)notesHistory=[...notesHistory,n].slice(-9);}}
  if(kind==='midi'){lastCh=$x('chord').textContent;}
  if(kind==='clear')lastCh='—';
  if(kind==='audio'||kind==='midi'||kind==='mic'||kind==='clear'){renderCoach();return;}
  if(kind==='hardware'||kind==='hardwareReset'){renderMixer();renderFavorites();syncStage();return;}
  if(kind==='armed'){syncStage();return;}
  if(kind==='backups'){backupRows=Array.isArray(data)?data:[];renderBackups();}
  if(kind==='userTones'){renderToneList();renderBanks();renderFavorites();}
  if(kind==='xpsConnection'){$x('gx-usb').textContent=data?'● XPS-10 conectado':'● USB desconectado';}
  if(kind==='answer')onToneAiAnswer(data);
  if(kind==='gemmaProgress'){
    const busy=!!data.busy,progress=Number(data.progress);
    gemmaInstall.dataset.busy=busy?'1':'';
    gemmaInstall.disabled=busy||!gemmaAccept.checked;
    gemmaCancel.hidden=!busy;
    gemmaProgress.hidden=!busy;
    if(Number.isFinite(progress)&&progress>=0)gemmaProgress.value=Math.max(0,Math.min(100,progress));
    gemmaStatus.textContent=data.message||'Verificando...';
    gemmaInfo.textContent=data.message||'';
  }
  if(kind==='gemmaState'){
    gemmaStatus.textContent=data.installed?(data.gemma270?'Gemma 3 270M instalada':'Outro modelo já instalado'):'Nenhuma IA instalada';
    if(data.gemma270){gemmaInstall.textContent='Reinstalar Gemma';gemmaInfo.textContent='Gemma disponível para o Copiloto. Teste usando uma pergunta.';}
  }
  if(kind==='modelInfo')gemmaInfo.textContent=String(data);
  if(kind==='answer'){$x('gx-gemma-answer').textContent=String(data||'A IA não retornou texto.');}
  if(kind==='status')notify(data);
  if(kind==='webCifra'||kind==='import')sync();
 };
 const priorPersist=window.refreshLiveSongs;
 if(typeof priorPersist==='function')window.refreshLiveSongs=()=>{priorPersist();renderSongs();renderRepertoire();};
 sync();
 showSoundPanel();
 if(window.Native?.restoreCachedTones)window.Native.restoreCachedTones();
 if(window.Native?.listBackups)window.Native.listBackups();
 // O sequenciador progride por BPM; atualizar continuamente o resumo sem redesenhar o mixer.
 setInterval(()=>{if(active==='stage'&&document.visibilityState!=='hidden')syncStage();},300);
})();
