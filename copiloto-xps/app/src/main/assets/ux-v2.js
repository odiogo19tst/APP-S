'use strict';
/* Grauê XPS | Interface de palco. Camada de apresentação sobre os serviços MIDI, áudio e repertório existentes. */
(()=>{
 const $x=id=>document.getElementById(id);
 const S=(s)=>String(s==null?'':s);
 const callOld=(id)=>{let el=$x(id);if(el)el.click();};
 const shell=document.createElement('div');shell.id='gx-shell';
 shell.innerHTML=[
 '<header class="gx-header"><div class="gx-brand"><span class="gx-mark">ϟ</span><div><b>Grauê XPS</b><small>SEU TECLADO. MAIS LONGE.</small></div></div><span class="gx-usb" id="gx-usb">● XPS-10<br><small>Não conectado</small></span><button id="gx-unified-usb" class="gx-usb-main">Conectar USB</button><button class="gx-gear" id="gx-open-settings" aria-label="Ajustes">⚙</button></header>',
 '<nav class="gx-nav" aria-label="Áreas do aplicativo"><button data-gx-tab="stage" class="on">Palco</button><button data-gx-tab="repertoire">Repertório</button><button data-gx-tab="sound">Sons</button><button data-gx-tab="drums">DrumPads</button><button data-gx-tab="coach">Copiloto</button><button data-gx-tab="backups">Backups</button><button data-gx-tab="settings">Ajustes</button></nav>',
 '<div class="gx-screen on" data-gx-screen="stage">',
 '<div class="gx-stage-summary"><section class="gx-current gx-panel"><small>● TOCANDO AGORA</small><strong id="gx-song-name">Selecione uma música</strong><span id="gx-song-cat">Seu repertório</span><div class="gx-progress"><i id="gx-progress-bar"></i></div></section>',
 '<section class="gx-panel gx-mini"><small>TOM</small><strong id="gx-key">—</strong><span id="gx-scale">Referência</span></section>',
 '<section class="gx-panel gx-mini"><small>ANDAMENTO</small><strong id="gx-bpm">72</strong><span>BPM • 4/4</span></section>',
 '<section class="gx-panel gx-mini"><small>SEÇÃO ATUAL</small><strong id="gx-section">Em execução</strong></section>',
 '<section class="gx-panel gx-mini"><small>PRÓXIMO ACORDE</small><strong id="gx-next-chord">—</strong><span id="gx-next-line">Acompanhamento</span></section></div>',
 '<div class="gx-played-feedback gx-panel"><div><small>ACORDE REALMENTE TOCADO · MIDI</small><strong id="gx-played-chord">—</strong></div><div><small>COMPARAÇÃO COM A CIFRA</small><strong id="gx-played-verdict">Aguardando notas MIDI</strong></div><small>Previsão da cifra e notas tocadas são coisas diferentes. Acompanhamento automático ainda não validado.</small><button id="gx-score-next">Próximo acorde da cifra (manual)</button></div><div class="gx-stage-actions"><button class="gx-start" id="gx-start">▶<span>Iniciar</span></button><button id="gx-pause">Ⅱ<span>Pausar</span></button><button id="gx-next">⏭<span>Próxima música</span></button><button class="gx-danger" id="gx-panic">⚠<span>Parar MIDI</span></button><div class="gx-transpose"><button id="gx-down" aria-label="Transpor abaixo">−</button><strong id="gx-transpose">0</strong><button id="gx-up" aria-label="Transpor acima">+</button><small>Transpor cifra</small></div><button id="gx-show-favorites">★<span>Favoritos</span></button></div>',
 '<div class="gx-panel gx-silent-advisor" id="gx-silent-advisor"><div class="gx-silent-head"><strong>✦ JARVIS · SUGESTÕES SILENCIOSAS</strong><span id="gx-silent-source">Cifra e favoritos do celular</span></div><div class="gx-silent-content"><div><small>PRÓXIMA HARMONIA</small><strong id="gx-silent-next">—</strong><small id="gx-silent-detail">Abra uma música do repertório.</small></div><div><small>TIMBRE PREPARADO</small><strong id="gx-silent-tone">—</strong><small id="gx-silent-tone-detail">Marque sons como favoritos para receber sugestões.</small></div></div><div class="gx-silent-actions"><button id="gx-silent-accept" disabled>Aplicar timbre</button><button id="gx-silent-alternate" disabled>Outra sugestão</button><button id="gx-silent-ai">Dica da IA local</button><button id="gx-silent-dismiss">Ignorar</button></div><p id="gx-silent-ai-text" role="status" aria-live="polite"></p><p class="gx-silent-note">Sugestões visuais, sem fala nem som. Timbres só mudam com seu toque. A próxima harmonia vem da cifra, não de reconhecimento automático da banda.</p></div>',
'<div class="gx-panel gx-zone"><div class="gx-section-label">✧ TROCA RÁPIDA DE TIMBRES <button id="gx-edit-fav">Organizar</button></div><div id="gx-live-favorites" class="gx-fav-grid"></div><div class="gx-live-banks-heading">Banco de favoritos <strong id="gx-live-bank-name">0</strong></div><div id="gx-live-bank-tabs" class="gx-live-bank-tabs"></div><div id="gx-live-bank-slots" class="gx-live-bank-slots"></div></div>',
 '<div class="gx-panel gx-assist"><div class="gx-section-label">✦ JARVIS MUSICAL <small>ACORDE DE APOIO</small></div><div class="gx-assist-controls"><div><strong id="gx-assist-chord">—</strong><small>acorde atual da música</small></div><label>Canal<select id="gx-assist-channel"></select></label><button id="gx-assist-play">▶ Tocar acorde</button><button id="gx-assist-stop">■ Parar</button></div><small>Envio automático ao conectar · acordes só tocam com seu comando</small></div>',
 '<div class="gx-panel gx-zone"><div class="gx-section-label">▤ PARTES DO TECLADO <small>ACESSO RÁPIDO</small></div><div id="gx-stage-parts" class="gx-stage-parts"></div></div>',
 '<div class="gx-stage-footer"><button id="gx-connect">Conectar USB</button><button id="gx-read">Ler teclado</button><button id="gx-arm" hidden>Envio MIDI automático</button><button id="gx-show-mode">Modo show ↔</button></div></div>',
 '<div class="gx-screen" data-gx-screen="repertoire"><div class="gx-rep-layout">',
 '<aside class="gx-panel gx-rep-library"><div class="gx-section-label">▏ Meu Repertório</div><input id="gx-search" placeholder="Buscar música, artista ou tom…" aria-label="Buscar repertório"><div class="gx-filters"><button class="on" data-gx-filter="all">Todas</button><button data-gx-filter="favorites">Favoritas</button><button data-gx-filter="setlist">Setlist</button><button data-gx-filter="recent">Recentes</button><button id="gx-add-song">+</button></div><div id="gx-songs" class="gx-song-list"></div></aside>',
 '<section class="gx-rep-view"><div class="gx-rep-tabs"><button class="on" data-gx-rep="cifra">Cifra integrada</button><button data-gx-rep="letter">Letra</button><button data-gx-rep="notes">Anotações</button><button data-gx-rep="setlist">Setlist</button></div>',
 '<div class="gx-paper"><div class="gx-cifra-head"><div><b>♬ Cifra Club</b><small>Navegação integrada no aplicativo</small></div><button id="gx-open-cifra">Buscar no Cifra Club ↗</button></div><div class="gx-paper-main"><div class="gx-paper-copy"><h2 id="gx-cifra-title">Escolha uma música</h2><span id="gx-cifra-meta">Importe letras e acordes para o seu repertório</span><p id="gx-cifra-key">Tom de referência: —</p><div id="gx-cifra-content">Selecione uma música ou abra o Cifra Club para importar sua cifra.</div></div><aside class="gx-paper-actions"><button class="gx-blue" id="gx-import-cifra">Importar cifra desta página</button><button id="gx-save-cifra">Salvar no repertório</button><button id="gx-transpose-cifra">Transpor +1</button><button id="gx-view-cifra">Abrir navegador</button><div class="gx-session">✓ Sessão gerenciada pelo Cifra Club<small>O login depende do site e pode exigir nova autenticação.</small></div></aside></div></div>',
 '<p class="gx-note">A cifra do site abre no painel nativo ao lado em paisagem; o botão Importar copia apenas a música aberta quando o site permite a leitura. Nenhuma sincronização automática de conta foi prometida.</p></section></div></div>',
 '<div class="gx-screen" data-gx-screen="sound"><div class="gx-sound-layout"><aside class="gx-panel gx-sound-nav"><button data-gx-sound="performance">▣ Performance</button><button class="on" data-gx-sound="tones">♧ Timbres</button><button data-gx-sound="parts">♮ Partes (1–16)</button><button data-gx-sound="mixer">☷ Mixer</button><button data-gx-sound="split">◉ Split / Layer</button><button data-gx-sound="effects">♬ Efeitos (MFX)</button><button data-gx-sound="arpeggio">▥ Arpejador</button><button data-gx-sound="favorites">★ Favoritos</button><button id="gx-advanced">⚙ Editor completo</button></aside>',
 '<div class="gx-sound-center"><div class="gx-panel gx-performance"><small>PERFORMANCE ATUAL</small><div class="gx-perf-row"><strong id="gx-perf-name">Aguardando leitura do teclado</strong><small id="gx-performance-source">Nenhum dado SysEx confirmado</small><button id="gx-perf-read">Ler</button><button id="gx-perf-edit">Editar</button><button id="gx-perf-new">Timbres</button><button id="gx-user-patches">Ler USER</button></div></div><div class="gx-panel gx-modify-panel"><div class="gx-tone-heading"><strong>CONTROLES MIDI AO VIVO</strong><small id="gx-modify-status">USB-MIDI</small></div><div id="gx-modify-sliders" class="gx-modify-sliders"></div></div><div id="gx-performance-banks" class="gx-panel gx-performance-banks" hidden><p class="gx-real-source">Apenas a Performance **atualmente carregada** pode ser confirmada pela leitura SysEx. Para recuperar as 128 Performances salvas e os Favorites, importe o backup original. Nomes e configurações sem fonte confirmada não serão exibidos.</p><div class="gx-perf-tools"><strong>PERFORMANCES</strong><button id="gx-perf-user" class="on">USER 128</button><button id="gx-perf-presets">PRESET 16</button><button id="gx-perf-prev">‹</button><span id="gx-perf-page">1–16</span><button id="gx-perf-next">›</button></div><div id="gx-perf-grid" class="gx-perf-grid"></div><small>Não importa nem adivinha os 128 nomes USER por MIDI. É necessário um backup original para extrair a memória arquivada.</small></div><div id="gx-one-touch" class="gx-panel gx-one-touch"><div class="gx-tone-heading"><strong>TOCAR AGORA — XPS-10</strong><label>Parte <select id="gx-tone-part"></select></label></div><div id="gx-tone-categories" class="gx-tone-categories"></div><div class="gx-tone-toolbar"><input id="gx-tone-search" type="search" placeholder="Buscar timbre, código ou categoria…"><button id="gx-tone-favorites">★ Favoritos</button></div><div class="gx-tone-count" id="gx-tone-count"></div><div id="gx-tone-list" class="gx-tone-list"></div><section class="gx-roland-favorites" id="gx-roland-favorites"><div class="gx-section-label">FAVORITOS FÍSICOS DO ROLAND XPS-10 <small>10 bancos × 10 posições</small></div><strong id="gx-roland-favorites-status">Ainda não importados</strong><p>Os 100 registros de FAVORITE do Roland são diferentes dos 256 timbres USER. A Roland confirma que o backup inclui os favoritos, mas precisamos validar o formato real para identificar timbres e Performances sem inventar posições.</p><div class="gx-roland-actions"><button id="gx-roland-backup-import">Selecionar backup do XPS-10</button><button id="gx-roland-view-backups">Ver cópias guardadas</button></div><small>Esta etapa guarda uma cópia intacta. Os bancos abaixo são somente os que você configurou no celular — não representam os bancos físicos do teclado.</small></section><div class="gx-tone-banks"><div class="gx-section-label">BANCOS LOCAIS ANTIGOS (ARQUIVADOS) <small>Não são os favoritos do Roland</small></div><div id="gx-bank-tabs" class="gx-bank-tabs"></div><div id="gx-bank-slots" class="gx-bank-slots"></div></div><p class="gx-tone-tip">Toque para enviar o timbre e segure por 3 segundos para editar. USB conectado não significa SysEx lido; dados USER só são confirmados após uma resposta real do XPS-10.</p></div><dialog id="gx-tone-dialog" class="gx-tone-dialog"><div class="gx-tone-dialog-header"><strong id="gx-edit-name">Editar timbre</strong><button id="gx-edit-close">Fechar ✕</button></div><p id="gx-edit-status">Compare configurações temporárias sem sobrescrever os timbres USER.</p><div class="gx-variant-tabs"><button data-gx-variant="original" class="on">Original</button><button data-gx-variant="manual">Minha edição</button><button data-gx-variant="ai">Sugestão IA</button></div><label>Volume da parte <input id="gx-edit-volume" type="range" min="0" max="127" value="100"><output id="gx-edit-volume-value">100</output></label><label>Descrição e recomendações <textarea id="gx-edit-notes" rows="4" maxlength="1500" placeholder="Anotações e sugestões para esta Performance"></textarea></label><div class="gx-edit-actions"><button id="gx-edit-suggest">Pedir sugestão à Gemma</button><button id="gx-edit-test" class="gx-start">Testar no XPS-10</button><button id="gx-edit-save">Salvar no aplicativo</button><button id="gx-edit-undo">Desfazer teste</button></div><div id="gx-edit-confirm" hidden>Deseja salvar a configuração escolhida no Grauê? <button id="gx-edit-yes">Sim</button><button id="gx-edit-no">Não</button></div><small>Salvar aqui grava um preset no celular, NÃO sobrescreve a memória USER do teclado. Edições temporárias dependem do modo Performance e de leitura válida.</small></dialog><div class="gx-panel gx-faders-physical"><div class="gx-section-label">FADERS FÍSICOS · DUAL / SPLIT</div><div class="gx-physical-two"><label>UPPER/1 · Parte 1<input type="range" id="gx-physical-upper" min="0" max="127" value="0" disabled><output id="gx-upper-value">—</output></label><label>LOWER/2 · Parte 2<input type="range" id="gx-physical-lower" min="0" max="127" value="0" disabled><output id="gx-lower-value">—</output></label></div><small id="gx-physical-status">Aguardando CC7 dos canais MIDI. Sem leitura, valores desconhecidos.</small><small>O movimento físico de Chorus/Reverb pode não transmitir MIDI; sem evento, não há valor para sincronizar.</small></div><div class="gx-panel gx-mixer" id="gx-advanced-mixer"><div class="gx-section-label">PARTES MIDI (1–16)<div><button class="on" id="gx-parts-page1">1–8</button><button id="gx-parts-page2">9–16</button></div></div><div id="gx-mixer-parts" class="gx-mixer-grid"></div><p>Volumes da última leitura. Alterações só são enviadas quando o MIDI está habilitado.</p></div></div>',
 '<aside class="gx-sound-right"><div class="gx-panel gx-device"><div id="gx-device-state">● XPS-10 • aguardando leitura</div><div class="gx-keyboard">▮ ▯ ▮ ▯ ▮ ▮ ▯ ▮ ▯ ▮ ▯ ▮</div><small>Controle USB-MIDI; não transmite áudio do teclado</small><button id="gx-device-connect">Conectar USB</button></div><div class="gx-panel gx-fav-side"><div class="gx-section-label">TIMBRES FAVORITOS <button id="gx-sound-fav-edit">Editar</button></div><div id="gx-sound-favorites"></div></div></aside></div></div>',
 '<div class="gx-screen" data-gx-screen="drums"><div class="gx-drums"><header class="gx-drums-heading"><div><small>WORSHIP LIVE · XPS-10</small><h2>DrumPads & Pads Contínuos</h2></div><button class="gx-drums-danger" id="gx-drums-panic">■ Parar tudo</button></header><div class="gx-drums-device"><strong id="gx-drums-device-state">USB-MIDI aguardando conexão</strong><span>Drum e pad são notas MIDI: o áudio sai pelo próprio XPS-10, desde que as partes estejam configuradas.</span></div><div class="gx-drums-columns"><section class="gx-panel gx-drums-kit"><div class="gx-section-label">BATERIA ELETRÔNICA <small>8 pads MIDI · resposta imediata ao toque</small></div><div class="gx-drums-settings"><label>Canal da bateria <select id="gx-drums-channel"></select></label><label>Intensidade <input id="gx-drums-velocity" type="range" min="20" max="127" value="90"><output id="gx-drums-velocity-out">90</output></label><label>Reverb MIDI <input id="gx-drums-reverb" type="range" min="0" max="127" value="40"><output id="gx-drums-reverb-out">40</output></label><button id="gx-drums-apply-reverb">Aplicar reverb ao kit</button></div><div class="gx-drums-pads" id="gx-drums-pads"></div><small>Configure um Drum Kit na parte/canal escolhido. Reverb (CC91) depende dos efeitos e ajustes do XPS-10.</small></section><section class="gx-panel gx-drone"><div class="gx-section-label">PAD CONTÍNUO · WORSHIP <small>Segure a harmonia até tocar em Parar</small></div><div class="gx-drone-settings"><label>Acorde <select id="gx-drone-chord"><option value="">Acorde da cifra</option><option>C</option><option>Dm</option><option>Em</option><option>F</option><option>G</option><option>Am</option><option>Bb</option><option>D</option><option>E</option><option>A</option><option>Bm</option><option>Gm</option></select></label><label>Parte/canal do pad <select id="gx-drone-channel"></select></label><label>Intensidade <input id="gx-drone-velocity" type="range" min="15" max="100" value="48"></label></div><div class="gx-drone-actions"><button id="gx-drone-start">▶ Sustentar acorde</button><button id="gx-drone-stop">■ Soltar pad</button></div><strong id="gx-drone-status" aria-live="polite">Pad parado</strong><small>Configure um timbre de pad/strings nessa parte do Roland. Não substitui os seis Audio Pads físicos, que tocam arquivos de pendrive.</small></section></div><section class="gx-panel gx-beats"><div class="gx-section-label">LOOP DE BATERIA MIDI · 16 PASSOS <small>Presets worship / balada / pop</small></div><div class="gx-beats-toolbar"><label>BPM <input type="number" id="gx-beats-bpm" min="40" max="180" value="72"></label><button id="gx-beats-worship">Worship</button><button id="gx-beats-ballad">Balada</button><button id="gx-beats-pop">Pop</button><button id="gx-beats-start">▶ Iniciar loop</button><button id="gx-beats-stop">■ Parar loop</button></div><div id="gx-beats-grid" class="gx-beats-grid"></div><small id="gx-beats-status">O loop é enviado por MIDI ao XPS-10. A precisão depende da conexão Android/USB.</small></section><section class="gx-panel gx-backing"><div class="gx-section-label">ACOMPANHAMENTO EXTERNO <small>Spotify ou YouTube no aplicativo oficial</small></div><div class="gx-backing-links"><input id="gx-backing-link" type="url" placeholder="Cole link HTTPS do Spotify ou YouTube"><button id="gx-backing-open">Abrir player</button></div><p>O USB do XPS-10 não transporta áudio. Para ouvir o Spotify junto com o teclado, conecte a saída de áudio do celular à mesa de som separadamente. Não é possível enviar a música pelo MIDI nem comandar os seis pads de áudio físicos por esse fluxo.</p></section></div></div>',
 '<div class="gx-screen" data-gx-screen="coach"><div class="gx-coach-layout"><div class="gx-panel gx-listening"><h3>Escuta e análise</h3><button id="gx-mic" class="gx-mic-circle" aria-label="Iniciar ou parar escuta">♩</button><strong id="gx-mic-label">Escuta parada</strong><span id="gx-mic-sub">Toque para iniciar o microfone</span><div class="gx-wave" id="gx-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>',
 '<div class="gx-panel gx-analysis"><h3>Resultado da análise</h3><div class="gx-analysis-grid"><div class="gx-reading"><small>NOTA DETECTADA</small><strong id="gx-heard-note">—</strong><span>Voz / instrumento dominante</span></div><div class="gx-reading"><small>TOM SUGERIDO</small><strong id="gx-heard-key">—</strong><span id="gx-heard-mode">Aguardando áudio</span></div><div class="gx-reading"><small>MODO</small><select id="gx-mode"><option value="0">Maior</option><option value="1">Menor</option></select><span>Referência da música</span></div><div class="gx-reading"><small>ACORDE MIDI</small><strong id="gx-heard-chord">—</strong><span>Teclas pressionadas</span></div><div class="gx-reading"><small>ÍNDICE DE CONFIANÇA</small><strong id="gx-heard-confidence">—</strong><span>Heurístico, não probabilidade</span></div><div class="gx-reading"><small>GRAU ATUAL</small><strong id="gx-heard-degree">—</strong><span>Baseado no tom de referência</span></div></div><div class="gx-section-label">HISTÓRICO DE NOTAS</div><div id="gx-note-history" class="gx-history">Aguardando notas reais…</div></div>',
 '<aside class="gx-panel gx-coach-tips"><h3>✦ Dicas do Copiloto</h3><p id="gx-tip-text">Inicie a escuta para analisar a voz. Conecte o XPS-10 para ler os acordes tocados por MIDI.</p><button id="gx-ai-settings">Configurar IA local</button><div class="gx-gemma-chat"><label for="gx-gemma-question">Pergunte ao Jarvis Musical (online ou offline)</label><textarea id="gx-gemma-question" rows="3" maxlength="1200" placeholder="Ex.: Como harmonizar essa música com pads e piano?"></textarea><button id="gx-gemma-send">Perguntar ao Jarvis</button><div id="gx-gemma-answer" role="status" aria-live="polite">Aguardando pergunta. Configure a API ou instale a Gemma em Ajustes.</div></div><button id="gx-ai-ask">Editor completo do assistente</button><label>Sensibilidade / áudio <input id="gx-sense" type="range" min="1" max="10" value="5" disabled title="Calibração de sensibilidade ainda não disponível"></label></aside></div></div>',
 '<div class="gx-screen" data-gx-screen="backups"><div class="gx-backups gx-panel"><div class="gx-section-label">BACKUPS DO ROLAND XPS-10 <small>Biblioteca de cópias originais</small></div><p class="gx-backup-intro">Importe os arquivos do pendrive. O Grauê guarda cópias locais, verifica duplicados e permite exportar o mesmo conteúdo. Nenhum arquivo é restaurado no XPS-10.</p><div class="gx-backup-actions"><button id="gx-backup-import" class="gx-start">↥ Importar backups</button><button id="gx-backup-refresh">↻ Atualizar biblioteca</button><button id="gx-backup-export-index">↓ Exportar catálogo JSON</button><button id="gx-backup-merge" disabled title="Mesclagem requer validação do formato de backups Roland">Mesclar timbres — indisponível</button></div><div id="gx-backup-list" class="gx-backup-list" aria-live="polite"><p class="gx-empty">Carregando cópias disponíveis…</p></div><p id="gx-backup-comparison" class="gx-backup-compare"></p><div id="gx-inspection-report" class="gx-inspection-report" hidden><strong>Diagnóstico do arquivo original</strong><pre id="gx-inspection-data"></pre><small>Identificação técnica, não extração de favoritos. O arquivo não é alterado e nenhuma informação é enviada à rede.</small></div><p class="gx-backup-warning">O backup original do XPS-10 inclui os favoritos. Este app guarda e exporta uma cópia sem alterações; ainda não interpreta automaticamente o formato proprietário dos 100 favoritos. Precisamos validar um backup original antes de construir o leitor. Não execute Restore no teclado sem preservar seus dados.</p></div></div>',
 '<div class="gx-screen" data-gx-screen="settings"><div class="gx-panel gx-settings"><h2>Ajustes e integrações</h2><section class="gx-direct-api" id="gx-direct-api"><h3>✦ Jarvis Online — colar sua chave no aplicativo</h3><p>Use sua chave pessoal da OpenAI Platform depois de instalar. Não envie a chave por chat, prints ou GitHub. O Grauê criptografa no Android e conecta diretamente à OpenAI por HTTPS. Esta alternativa dispensa servidor extra, mas oferece menos proteção que um backend próprio.</p><label for="gx-direct-mode">Usar a IA</label><select id="gx-direct-mode"><option value="automatico">Automático (OpenAI + Gemma offline)</option><option value="online">Somente OpenAI</option><option value="offline">Somente Gemma offline</option></select><label for="gx-direct-model">Modelo para conversar</label><select id="gx-direct-model"><option value="gpt-6-luna">Luna — econômico</option><option value="gpt-6.1-sol">Sol — avançado</option></select><label for="gx-direct-key">Cole sua chave OpenAI aqui (após instalar)</label><input type="password" autocomplete="off" autocapitalize="off" spellcheck="false" id="gx-direct-key" placeholder="sk-proj-…" maxlength="500"><div class="gx-direct-actions"><button id="gx-direct-save">Salvar no celular</button><button id="gx-direct-test">Testar API</button><button id="gx-direct-clear">Apagar chave</button></div><small id="gx-direct-state" role="status">Sem chave configurada.</small><small>Uso cobrado pela OpenAI conforme sua conta. Limite de saída por resposta; não equivale a um teto de gastos. Defina seu orçamento na OpenAI Platform.</small></section><details class="gx-advanced-cloud"><summary>Integração por servidor (opcional / avançada)</summary><section id="gx-online-panel" class="gx-online-panel"><div class="gx-online-heading"><strong>✦ Jarvis Online · OpenAI</strong><small id="gx-online-state">Servidor ainda não conectado</small></div><p>A chave OpenAI deve ficar somente no servidor. Aqui você configura o endereço HTTPS do seu Worker e um token separado para este celular. O modo automático usa Gemma quando a rede falha.</p><label for="gx-online-mode">Motor do Jarvis</label><select id="gx-online-mode"><option value="offline">Gemma offline</option><option value="automatico">Automático: Luna + Gemma de reserva</option><option value="online">Somente API online</option></select><label for="gx-online-model">Modelo online</label><select id="gx-online-model"><option value="gpt-6-luna">Luna · econômico</option><option value="gpt-6.1-sol">Sol · avançado</option></select><label for="gx-online-url">Endereço HTTPS do Worker</label><input id="gx-online-url" type="url" autocapitalize="off" spellcheck="false" maxlength="220" placeholder="https://graue-jarvis-api.seusubdominio.workers.dev"><label for="gx-online-token">Token do DISPOSITIVO (não é a chave OpenAI)</label><input id="gx-online-token" type="password" autocorrect="off" autocapitalize="off" autocomplete="off" placeholder="Cole somente o GRAUE_DEVICE_TOKEN"><div class="gx-online-buttons"><button id="gx-online-save">Salvar conexão</button><button id="gx-online-test">Testar servidor</button></div><small id="gx-online-feedback" role="status" aria-live="polite">Sem conexão online. Sua Gemma continua independente.</small><small>Online requer internet e consumo pago da API. Apenas texto e contexto musical enviado pelo Grauê serão processados no servidor; não envia áudio nem realiza MIDI automaticamente.</small></section></details><section class="gx-gemma-panel" id="gx-gemma-panel"><div class="gx-gemma-heading"><strong>✦ Gemma 3 270M — IA local</strong><span id="gx-gemma-status">Verificando instalação…</span></div><p>Instalação de aproximadamente 304 MB, uma única vez. Depois, o Copiloto responde offline sem enviar perguntas para servidores. Este modelo conversa sobre música, mas não escuta áudio diretamente.</p><p class="gx-gemma-source">Pesos publicados por um espelho comunitário, não hospedados pelo Google. O arquivo é verificado por assinatura SHA-256 antes da instalação.</p><div class="gx-gemma-links"><button id="gx-gemma-terms">Ler Termos de Uso Gemma ↗</button><button id="gx-gemma-source">Origem do modelo ↗</button></div><label class="gx-gemma-license"><input id="gx-gemma-accept" type="checkbox"> Li e aceito os Termos de Uso Gemma e estou ciente da origem do arquivo.</label><div class="gx-gemma-controls"><button id="gx-gemma-install" disabled>Instalar Gemma 270M</button><button id="gx-gemma-cancel" hidden>Pausar</button><button id="gx-gemma-try">Testar IA</button></div><progress id="gx-gemma-progress" value="0" max="100" hidden></progress><div id="gx-gemma-info" role="status" aria-live="polite">Modelo ainda não configurado.</div></section><section class="gx-jarvis-memory" id="gx-jarvis-memory"><h3>✦ Memória do Jarvis Musical</h3><p>O que o Jarvis deve lembrar para sugerir melhor durante o culto? Fica somente neste celular; você pode editar ou apagar quando quiser.</p><label for="gx-jarvis-notes">Suas preferências musicais</label><textarea id="gx-jarvis-notes" maxlength="550" rows="4" placeholder="Ex.: Priorizar piano e pad em oração; piano acústico nas músicas animadas. Evitar trocar sons automaticamente."></textarea><div class="gx-jarvis-memory-actions"><button id="gx-jarvis-save">Salvar memória local</button><button id="gx-jarvis-clear">Apagar preferências</button></div><small id="gx-jarvis-notes-status" role="status" aria-live="polite">Memória local pronta para configurar.</small></section><div class="gx-settings-grid"><button id="gx-connect-settings">♬ Conexão USB-MIDI<br><small>Selecionar dispositivo</small></button><button id="gx-read-settings">▤ Ler XPS-10<br><small>Carregar Performance atual</small></button><button id="gx-legacy-editor">⚙ Editor avançado<br><small>Efeitos, splits e 16 partes</small></button><button id="gx-legacy-repertoire">▥ Repertório e arquivos<br><small>Importar e exportar setlists</small></button><button id="gx-legacy-ai">✧ Modelo de IA local<br><small>Selecionar e testar modelo</small></button><button id="gx-legacy-settings">☷ Ajustes completos<br><small>Configurações do dispositivo</small></button><button id="gx-midi-report">▤ Diagnóstico USB e favoritos<br><small>Exportar sem chaves API</small></button><button id="gx-backups-settings">▦ Biblioteca de backups<br><small>Importação segura do pendrive</small></button><button id="gx-cifra-settings">♫ Cifra Club<br><small>Abrir sessão no navegador</small></button></div><p>O Bip 6 permanece desativado enquanto houver reinicializações no relógio. A análise de voz acompanhada por instrumentos ainda é experimental.</p></div></div>'
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
 let silentDismissedKey='',silentToneIndex=0,silentPending=false,silentSuggested=null,silentMusicKey='';
 const stageKey=()=>[song?.title||'',idx,root,minor].join(':');
 function preferredTones(){
  const lib=window.ToneLibrary;
  if(!lib?.favorites||!lib?.list)return [];
  const favorites=lib.favorites();
  const all=lib.list().filter(t=>t&&favorites.has(t.code)&&Number.isInteger(t.msb)&&Number.isInteger(t.lsb)&&Number.isInteger(t.program));
  const context=(S(song?.title)+' '+S(song?.category)).toLocaleLowerCase('pt-BR');
  const soft=/oração|oracao|adoração|adoracao|medita|lento|worship|intimidade/.test(context);
  const energetic=/celebra|alegr|júbilo|jubilo|festa|rápid|rapido/.test(context);
  const priority=t=>{
   const v=(S(t.name)+' '+S(t.category)).toLocaleLowerCase('pt-BR');
   if(soft)return /pad|strings|warm|ambient|choir|string|synth/.test(v)?3:0;
   if(energetic)return /piano|brass|organ|lead|epiano/.test(v)?3:0;
   return /piano|pad|strings/.test(v)?2:0;
  };
  return all.map((t,i)=>({t,i,priority:priority(t)})).sort((a,b)=>b.priority-a.priority||a.i-b.i).map(v=>v.t);
 }
 function renderSilentAdvisor(){
  const key=stageKey(),tones=preferredTones();
  if(key!==silentMusicKey){silentMusicKey=key;silentToneIndex=0;silentPending=false;$x('gx-silent-ai-text').textContent='';}
  const hidden=silentDismissedKey===key;
  $x('gx-silent-advisor').classList.toggle('gx-silent-muted',hidden);
  const current=songs.some(m=>m?.title===song?.title)&&Array.isArray(song?.chords)?song.chords:[];
  const next=current.length?current[(idx+1)%current.length]:null;
  $x('gx-silent-next').textContent=hidden?'Sugestão ignorada':(next||'Sem cifra');
  $x('gx-silent-detail').textContent=hidden?'Toque em Mostrar para reabrir.':(next?'Próximo acorde registrado na cifra, após '+S(current[idx]||'—')+'.':'Selecione uma música com acordes.');
  silentSuggested=!hidden&&tones.length?tones[silentToneIndex%tones.length]:null;
  $x('gx-silent-tone').textContent=hidden?'—':(silentSuggested?.name||'Sem favorito');
  $x('gx-silent-tone-detail').textContent=hidden?'Sem trocas automáticas.':(silentSuggested?'Sugestão por favoritos e perfil da música. Confirme antes de tocar.':'Favorite timbres em Sons para sugestões rápidas.');
  $x('gx-silent-source').textContent=hidden?'Pausado para esta música':'Cifra e favoritos do celular';
  $x('gx-silent-accept').disabled=!silentSuggested;
  $x('gx-silent-alternate').disabled=hidden||tones.length<2;
  $x('gx-silent-ai').disabled=hidden||silentPending;
  $x('gx-silent-dismiss').textContent=hidden?'Mostrar':'Ignorar';
 }
 $x('gx-silent-accept').onclick=()=>{if(silentSuggested)chooseTone(silentSuggested);};
 $x('gx-silent-alternate').onclick=()=>{const count=preferredTones().length;if(count>1){silentToneIndex=(silentToneIndex+1)%count;renderSilentAdvisor();}};
 $x('gx-silent-dismiss').onclick=()=>{silentDismissedKey=silentDismissedKey===stageKey()?'':stageKey();renderSilentAdvisor();};
 $x('gx-silent-ai').onclick=()=>{
  if(silentPending)return;
  if(!window.Native?.ask){$x('gx-silent-ai-text').textContent='IA local não disponível. Configure a Gemma em Ajustes.';return;}
  const current=Array.isArray(song?.chords)?song.chords.slice(0,16):[];
  if(!current.length){$x('gx-silent-ai-text').textContent='Escolha uma música com cifras antes de pedir a dica.';return;}
  silentPending=true;renderSilentAdvisor();
  $x('gx-silent-ai-text').textContent='Consultando IA local — a cifra e os favoritos continuam acessíveis.';
  const prompt='Seja um copiloto de palco SILENCIOSO. Responda em português em até 24 palavras, com uma sugestão prática para o tecladista no culto. Não alegue ouvir a banda. Não execute MIDI. Música: '+S(song.title).slice(0,90)+'. Categoria: '+S(song.category).slice(0,40)+'. Tom declarado: '+M.names[root]+(minor?' menor':' maior')+'. Progressão registrada: '+current.join(' ').slice(0,120)+'. Acorde atual na cifra: '+S(current[idx]||'').slice(0,24)+'. Favoritos: '+preferredTones().slice(0,5).map(t=>t.name).join(', ').slice(0,130)+'.';
  window.Native.ask(prompt);
 };

 const friendlyNote=midi=>Number.isInteger(midi)&&midi>=0&&midi<=127?M.names[midi%12]+String(Math.floor(midi/12)-1):'—';
 let usbConnected=false;
 const switchTab=name=>{active=name;screens.forEach(n=>n.classList.toggle('on',n.dataset.gxScreen===name));tabs.forEach(n=>n.classList.toggle('on',n.dataset.gxTab===name));sync();if(name==='backups'&&window.Native?.listBackups)window.Native.listBackups();};
 tabs.forEach(b=>b.onclick=()=>switchTab(b.dataset.gxTab));$x('gx-open-settings').onclick=()=>switchTab('settings');
 const openLegacy=tab=>{document.body.classList.add('gx-legacy');let b=document.querySelector('[data-tab="'+tab+'"]');if(b)b.click();window.scrollTo(0,0);};
 const read=()=>callOld('readHardware');
 const arm=()=>{}; // connection owns MIDI send/receive readiness
 const connect=()=>callOld('connect');
 $x('gx-unified-usb').onclick=()=>{if(!usbConnected)connect();else notify('USB-MIDI já conectado. A leitura é automática; a ausência de SysEx pode indicar modo MIDI ou Device ID diferente.');};
 const openCifra=()=>{switchTab('repertoire');callOld('liveCifra');};
 const stageParts=[['▥','Lower','Parte 1'],['▥','Upper','Parte 2'],['▣','Split','Divisão'],['▤','Layer','Camadas'],['♩','Piano','Timbres'],['♫','E.Piano','Timbres'],['♬','Órgão','Timbres'],['♮','Strings','Timbres'],['♧','Brass','Timbres'],['♬','Synth','Timbres'],['▦','Pads','Bateria'],['✧','FX','Efeitos']];
 stageParts.forEach(([glyph,title,desc],i)=>{
  const b=document.createElement('button');b.innerHTML='<strong>'+glyph+'</strong><span>'+title+'</span><small>'+desc+'</small>';
  b.onclick=()=>{if(i<2){let p=$x('livePart');p.value=String(i);if(p.onchange)p.onchange();switchTab('sound');}
  else if(i===2||i===3){switchTab('sound');soundSection=i===2?'split':'split';showSoundPanel();}
  else if(i===10){switchTab('drums');}
  else if(i===11){switchTab('sound');soundSection='effects';showSoundPanel();}
  else{switchTab('sound');soundSection='tones';toneCategory=({4:'Pf',5:'Pf',6:'Ky',7:'St',8:'Bs',9:'Sy'})[i]||'';renderCategories();showSoundPanel();}};
  $x('gx-stage-parts').append(b);
 });
 $x('gx-start').onclick=()=>{if(!playing)callOld('play');switchTab('stage');sync();};
 $x('gx-pause').onclick=()=>{if(playing)callOld('play');sync();};
 $x('gx-score-next').onclick=()=>{callOld('nextBtn');syncStage();};
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
 $x('gx-roland-backup-import').onclick=()=>window.Native?.importXpsBackups?.();
 $x('gx-roland-view-backups').onclick=()=>switchTab('backups');
 $x('gx-midi-report').onclick=()=>window.Native?.getMidiDiagnostics?.();
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
 const directMode=$x('gx-direct-mode'),directModel=$x('gx-direct-model'),directKey=$x('gx-direct-key'),directState=$x('gx-direct-state');
 $x('gx-direct-save').onclick=()=>{
  if(!window.Native?.configureDirectApi)return notify('Instale o novo APK para configurar a OpenAI.');
  const value=directKey.value.trim();
  if(!value&&directState.dataset.configured!=='1'&&directMode.value!=='offline'){directState.textContent='Cole sua chave OpenAI para ativar a conexão.';return;}
  window.Native.configureDirectApi(value,directMode.value,directModel.value);
  directKey.value='';directState.textContent='Salvando em armazenamento protegido…';
 };
 $x('gx-direct-test').onclick=()=>{
  if(!window.Native?.testDirectApi)return notify('Função não disponível neste APK.');
  directState.textContent='Verificando resposta da OpenAI (pode gerar cobrança)…';
  window.Native.testDirectApi();
 };
 $x('gx-direct-clear').onclick=()=>{
  if(confirm('Apagar a chave OpenAI armazenada neste celular?')){window.Native?.forgetDirectApi?.();directKey.value='';}
 };
  const onlineMode=$x('gx-online-mode'),onlineModel=$x('gx-online-model'),onlineUrl=$x('gx-online-url'),onlineToken=$x('gx-online-token');
 const onlineState=$x('gx-online-state'),onlineFeedback=$x('gx-online-feedback');
 $x('gx-online-save').onclick=()=>{
  if(!window.Native?.configureJarvisOnline){notify('Recurso disponível apenas no APK atualizado.');return;}
  const url=onlineUrl.value.trim(),token=onlineToken.value;
  if(onlineMode.value!=='offline'&&(!url||!token&&onlineState.dataset.configured!=='1')){
   onlineFeedback.textContent='Configure o endereço do Worker e o token do dispositivo, nunca a chave OpenAI.';
   return;
  }
  if(token.startsWith('sk-')){onlineFeedback.textContent='Esta parece ser uma chave OpenAI. Não a cole no celular! Use o token do Worker.';onlineToken.value='';return;}
  window.Native.configureJarvisOnline(url,token,onlineMode.value,onlineModel.value);
  onlineToken.value='';
  onlineFeedback.textContent='Salvando configuração protegida no celular…';
 };
 $x('gx-online-test').onclick=()=>{
  if(!window.Native?.testJarvisOnline){notify('Recurso indisponível.');return;}
  onlineFeedback.textContent='Consultando o Jarvis pela API… Uma requisição poderá ser cobrada.';
  window.Native.testJarvisOnline();
 };
 const jarvisNotes=$x('gx-jarvis-notes');
 const jarvisNotesStatus=$x('gx-jarvis-notes-status');
 $x('gx-jarvis-save').onclick=()=>{
  if(!window.Native?.saveJarvisMemory){notify('Memória local disponível apenas na versão atualizada do APK.');return;}
  window.Native.saveJarvisMemory(jarvisNotes.value.slice(0,550));
  jarvisNotesStatus.textContent='Salvando preferências neste celular…';
 };
 $x('gx-jarvis-clear').onclick=()=>{
  if(!window.Native?.clearJarvisMemory)return;
  if(!confirm('Apagar as preferências musicais salvas somente neste aparelho?'))return;
  window.Native.clearJarvisMemory();
  jarvisNotesStatus.textContent='Limpando preferências locais…';
 };
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
   $x('gx-performance-banks').hidden=soundSection!=='performance';
   $x('gx-advanced-mixer').hidden=tonesMode;
   if(soundSection==='favorites'){toneOnlyFavs=true;$x('gx-tone-favorites').classList.add('on');renderToneList();}
   if(soundSection==='tones'){toneOnlyFavs=false;$x('gx-tone-favorites').classList.remove('on');renderToneList();}
   if(soundSection==='split'||soundSection==='effects'||soundSection==='arpeggio')openLegacy('sound');
   if(!tonesMode)renderMixer();
 }
 const modifyControls=[[7,'Volume'],[11,'Expressão'],[71,'Resson.'],[72,'Release'],[73,'Attack'],[74,'Cutoff'],[91,'Reverb'],[93,'Chorus']];
 const modifyValues=new Map();
 const modifyGrid=$x('gx-modify-sliders');
 for(const [cc,name] of modifyControls){
  const cell=document.createElement('label');cell.className='gx-modify-cell';
  const caption=document.createElement('span');caption.textContent=name;
  const slider=document.createElement('input');slider.type='range';slider.min=0;slider.max=127;slider.value=64;slider.dataset.cc=String(cc);
  slider.setAttribute('aria-label','Controle MIDI '+name);
  const result=document.createElement('output');result.textContent='—';
  slider.oninput=()=>{result.textContent=slider.value;};
  slider.onchange=()=>{
   if(!usbConnected){notify('USB-MIDI desconectado.');return;}
   const part=Number($x('gx-tone-part').value)||0;
   const chan=hw['part:'+part]?.[0];
   const channel=Number.isInteger(chan)?chan+1:1;
   window.Native?.cc?.(channel,cc,Number(slider.value));
  };
  cell.append(caption,slider,result);modifyGrid.append(cell);
 }
 const physicalControls=[
  {part:0,id:'gx-physical-upper',out:'gx-upper-value',fallback:0},
  {part:1,id:'gx-physical-lower',out:'gx-lower-value',fallback:1}
 ];
 function physicalChannel(c){const part=hw['part:'+c.part];return part&&Number.isInteger(part[0])?part[0]:c.fallback;}
 function reflectPhysicalFader(ch,cc,value){
  if(cc!==7||!Number.isInteger(value)||value<0||value>127)return;
  let updated=false;
  for(const c of physicalControls)if(ch===physicalChannel(c)){
   const slider=$x(c.id);if(!slider.matches(':active'))slider.value=String(value);
   slider.disabled=false;$x(c.out).textContent=String(value);updated=true;
  }
  if(updated)$x('gx-physical-status').textContent='CC7 recebido · canal MIDI '+(ch+1)+' · UPPER/1 e LOWER/2 independentes';
 }
 for(const c of physicalControls){
  const slider=$x(c.id);slider.oninput=()=>$x(c.out).textContent=slider.value;
  slider.onchange=()=>{if(!slider.disabled&&window.Native?.cc)window.Native.cc(physicalChannel(c)+1,7,Number(slider.value));};
 }
 function renderPlayedChord(){
  const out=$x('gx-played-chord'),verdict=$x('gx-played-verdict');
  const actual=typeof notes==='function'?notes().filter(n=>Number.isInteger(n)&&n>=0&&n<=127):[];
  out.textContent=actual.length?M.chord(actual)+(actual.length<3?' · notas isoladas':''):'—';
  const chosen=songs.some(m=>m&&m.title===song.title)||song.title.startsWith('Exercício');
  if(!chosen){verdict.textContent='Selecione uma cifra para comparar';return;}
  const expected=song.chords?.[idx]||'',target=M.tones(expected);
  if(!target.length){verdict.textContent='Acorde esperado não reconhecido';return;}
  if(!actual.length){verdict.textContent='Esperado: '+expected+' · aguardando notas';return;}
  const played=[...new Set(actual.map(n=>n%12))],expect=[...new Set(target)];
  const matching=played.filter(n=>expect.includes(n)).length;
  if(matching===expect.length&&played.every(n=>expect.includes(n)))verdict.textContent='✓ Confere com '+expected+' nas notas recebidas';
  else if(matching>0&&played.every(n=>expect.includes(n)))verdict.textContent='Parcial: '+matching+'/'+expect.length+' de '+expected;
  else verdict.textContent='Diferente de '+expected+' · confira tensões e inversões';
 }
 function reflectModify(cc,value){
  if(!Number.isInteger(value)||value<0||value>127)return;
  const slider=modifyGrid.querySelector('[data-cc="'+cc+'"]');
  if(!slider||slider.matches(':active'))return;
  slider.value=String(value);const label=slider.parentElement.querySelector('output');
  if(label)label.textContent=String(value);
  modifyValues.set(cc,value);
 }
 let userPerformances=true,perfPage=0,perfPending=null;
 const rememberedPerf=saved.performanceNames&&typeof saved.performanceNames==='object'?saved.performanceNames:(saved.performanceNames={});
 function renderPerformanceBanks(){
  const panel=$x('gx-perf-grid');panel.replaceChildren();
  const common=hw['common:0'];
  let name='';
  if(Array.isArray(common)&&common.length>=12){
   name=common.slice(0,12).filter(Number.isInteger).map(x=>x>=32&&x<=126?String.fromCharCode(x):'').join('').trim();
  }
  const msg=document.createElement('p');msg.className='gx-real-source';
  msg.textContent=name?'Performance atual confirmada por MIDI: '+name+'. Outros programas salvos exigem leitura validada do backup.':
    'Nenhuma lista de Performances armazenadas foi confirmada. Importar os Favorites do backup é prioritário.';
  panel.append(msg);
  $x('gx-perf-prev').disabled=true;
  $x('gx-perf-next').disabled=true;
  $x('gx-perf-page').textContent=name?'Atual':'Sem dados';
 }
 $x('gx-perf-user').onclick=()=>{userPerformances=true;perfPage=0;renderPerformanceBanks();};
 $x('gx-perf-presets').onclick=()=>{userPerformances=false;perfPage=0;renderPerformanceBanks();};
 $x('gx-perf-prev').onclick=()=>{perfPage--;renderPerformanceBanks();};
 $x('gx-perf-next').onclick=()=>{perfPage++;renderPerformanceBanks();};
 renderPerformanceBanks();
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
  let tones=(toneLib()?.list()||window.XPS_TONES||[]).filter(t=>{
   const cat=t.code?.startsWith('USER')?'USER':String(t.code||'').slice(0,2);
   return (!toneCategory||toneCategory===cat)&&(!toneOnlyFavs||toneLib().favorites().has(t.code))
    &&(t.name+' '+t.code+' '+t.category).toLocaleLowerCase('pt-BR').includes(q);
  });
  const total=(toneLib()?.list()||window.XPS_TONES||[]).length;
  $x('gx-tone-count').textContent=tones.length+' de '+total+' timbres disponíveis'+(toneOnlyFavs?' · filtro FAVORITOS ativo':'')+' · toque para enviar · segure 3s para editar';
  grid.replaceChildren();
  if(!tones.length){const el=document.createElement('p');el.textContent=toneOnlyFavs?'Nenhum timbre favorito cadastrado no Grauê. Toque em Todas e marque ☆ nos sons desejados. Os bancos físicos 0–9 do Roland não são legíveis por esta implementação SysEx.':toneCategory==='USER'?'Conecte o XPS-10 e confirme uma leitura SysEx dos USER; a lista de fábrica continua disponível offline.':total===0?'Catálogo não carregado. Confira os arquivos do APK.':'Nenhum timbre encontrado nesta categoria.';grid.append(el);}
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
  const b=document.createElement('button');b.textContent=label;b.onclick=()=>{toneCategory=key;toneOnlyFavs=false;soundSection='tones';$x('gx-tone-favorites').classList.remove('on');renderToneList();renderCategories();shell.querySelectorAll('[data-gx-sound]').forEach(x=>x.classList.toggle('on',x.dataset.gxSound==='tones'));};b.dataset.category=key;$x('gx-tone-categories').append(b);
 });
 function renderCategories(){
  $x('gx-tone-categories').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.category===toneCategory));
 }
 $x('gx-tone-search').oninput=renderToneList;
 $x('gx-tone-favorites').onclick=()=>{toneOnlyFavs=!toneOnlyFavs;soundSection=toneOnlyFavs?'favorites':'tones';$x('gx-tone-favorites').classList.toggle('on',toneOnlyFavs);shell.querySelectorAll('[data-gx-sound]').forEach(x=>x.classList.toggle('on',x.dataset.gxSound===soundSection));renderToneList();};
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
   const b=document.createElement('button');b.className='gx-bank-slot';b.textContent=i+' · '+(t?t.name:'Não cadastrado');
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
   const inspect=document.createElement('button');inspect.textContent='Identificar arquivo';
   inspect.onclick=()=>{if(window.Native?.inspectRolandBackup)window.Native.inspectRolandBackup(data.sha256);};
   const btn=document.createElement('button');btn.textContent='Exportar';
   btn.onclick=()=>{if(window.Native?.exportXpsBackup)window.Native.exportXpsBackup(data.sha256);};
   const remove=document.createElement('button');remove.className='gx-danger-inline';remove.textContent='Excluir cópia';
   remove.onclick=()=>{if(confirm('Excluir apenas esta cópia do Grauê? O arquivo original do pendrive e o teclado não serão alterados.'))window.Native?.deleteXpsBackup?.(data.sha256);};
   row.append(mark,info,inspect,btn,remove);box.append(row);
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
   const slider=document.createElement('input');slider.id='gx-part-slider-'+i;slider.type='range';slider.min=0;slider.max=127;slider.value=p?String(p[7]):'0';slider.disabled=!p;
   slider.setAttribute('aria-label','Volume da parte '+(i+1));
   const out=document.createElement('strong');out.id='gx-part-value-'+i;out.textContent=p?p[7]:'—';
   slider.oninput=()=>out.textContent=slider.value;
   slider.onchange=()=>{
    if(!p)return;
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
  const blockCount=Number(hw.completeBlocks||0),total=Number(hw.availableBlocks||0);
  $x('gx-performance-source').textContent=blockCount>0?'SysEx confirmado: '+blockCount+' de '+total+' blocos do estado ativo. Favorites persistentes não são incluídos.':'USB-MIDI sem leitura SysEx confirmada; consulte o backup.';
  renderPerformanceBanks();
  $x('gx-device-state').textContent=hw['setup:0']?'● Performance respondendo por MIDI':'● XPS-10 • aguardando leitura';
 }
 function syncStage(){
  const hasRealSong=songs.some(m=>m&&m.title===song.title);
  $x('gx-song-name').textContent=hasRealSong?song.title:'Selecione uma música do repertório';
  $x('gx-song-cat').textContent=song.category||'Repertório local';
  $x('gx-key').textContent=hasRealSong?M.names[root]:'—';$x('gx-scale').textContent=hasRealSong?(minor?'Menor':'Maior'):'Nenhuma música selecionada';
  $x('gx-bpm').textContent=$x('tempo')?.value||'72';
  $x('gx-next-chord').textContent=hasRealSong?(song.chords?.[(idx+1)%song.chords.length]||'—'):'—';
  $x('gx-section').textContent=hasRealSong?'Acorde '+String(idx+1):'Aguardando cifra';
  $x('gx-progress-bar').style.width=((idx+1)/Math.max(1,song.chords.length)*100)+'%';
  $x('gx-next-line').textContent=hasRealSong?(song.chords?.[idx]||'Sem acorde'):'Selecione uma música';
  $x('gx-assist-chord').textContent=hasRealSong?(song.chords?.[idx]||'—'):'—';
  renderPlayedChord();
  renderSilentAdvisor();
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
 function sync(){syncStage();renderSongs();renderRepertoire();renderFavorites();renderMixer();renderCoach();$x('gx-usb').textContent=hw['setup:0']?'● XPS-10 lido':usbConnected?'● MIDI conectado':'● USB desligado';}
 // Recepção passiva: os dados provêm dos serviços originais; a interface nunca simula notas, status nem conexão.
 const prior=window.receive;
 window.receive=(kind,data)=>{
  prior(kind,data);
  if(kind==='hardware')hw=data||{};
  if(kind==='hardwareReset')hw={};
  if(kind==='mic')recording=!!data;
  if(kind==='audio'){lastAudio=data;if(Number.isInteger(data.midi)&&data.midi>=0){const n=friendlyNote(data.midi);if(notesHistory.at(-1)!==n)notesHistory=[...notesHistory,n].slice(-9);}}
  if(kind==='midi'){
    lastCh=$x('chord').textContent;
    const [status,cc,value]=Array.isArray(data)?data:[];
    if((status&240)===176&&Number.isInteger(cc)&&Number.isInteger(value)&&value>=0&&value<=127){
      const ch=status&15;
      reflectModify(cc,value);
      const legacy=$x('cc'+cc),output=$x('value'+cc);
      if(legacy&&!legacy.matches(':active')){legacy.value=String(value);if(output)output.textContent=String(value);}
      if(cc===7)reflectPhysicalFader(ch,cc,value);
      if(cc===7)for(let part=0;part<16;part++){
        const p=hw['part:'+part];
        if(!p||p[0]!==ch)continue;
        p[7]=value;
        const slider=$x('gx-part-slider-'+part),label=$x('gx-part-value-'+part);
        if(slider&&!slider.matches(':active'))slider.value=String(value);
        if(label)label.textContent=String(value);
      }
    }
  }
  if(kind==='clear')lastCh='—';
  if(kind==='midi'||kind==='clear')renderPlayedChord();
  if(kind==='audio'||kind==='midi'||kind==='mic'||kind==='clear'){renderCoach();return;}
  if(kind==='performanceSelected'){perfPending=data&&Number.isInteger(data.index)?{index:data.index,user:!!data.user}:null;}
  if(kind==='hardware'&&perfPending&&data&&Array.isArray(data['common:0'])){
   const name=data['common:0'].slice(0,12).filter(c=>Number.isInteger(c)).map(c=>c>=32&&c<=126?String.fromCharCode(c):'').join('').trim();
   if(name){rememberedPerf[(perfPending.user?'U':'P')+perfPending.index]=name;persist();renderPerformanceBanks();}
   perfPending=null;
  }
  if(kind==='hardwarePhysical'){
    hw={...hw,...(data||{})};
    // XPS Tx Edit Data may send physical slider/edit values as SysEx.
    renderMixer();
    $x('gx-modify-status').textContent='Painel do XPS recebido';
    return;
  }
  if(kind==='hardware'||kind==='hardwareReset'){renderMixer();renderFavorites();syncStage();return;}
  if(kind==='armed'){syncStage();return;}
  if(kind==='backupInspection'){
   $x('gx-inspection-report').hidden=false;
   const analysis=data||{};
   const view={
    arquivo:analysis.name||'',tamanhoBytes:analysis.bytes||0,
    tipo:analysis.container||'Indefinido',
    assinaturaInicial:analysis.headerHex||'',
    arquivosInternos:analysis.files||[],
    favoritosExtraidos:0,
    observacao:analysis.interpretation||'Formato ainda sem leitor validado.'
   };
   $x('gx-inspection-data').textContent=JSON.stringify(view,null,2);
   switchTab('backups');
  }
  if(kind==='hardwareCache'){
    const copy=data||{},count=Number(copy.completeBlocks||0);
    if(count>0&&Object.keys(hw).length===0){
      $x('gx-performance-source').textContent='Última leitura salva: '+count+' de '+Number(copy.availableBlocks||0)+' blocos. Não representa necessariamente a Performance atual.';
    }
  }
  if(kind==='backups'){
   backupRows=Array.isArray(data)?data:[];renderBackups();
   $x('gx-roland-favorites-status').textContent=backupRows.length
    ?backupRows.length+' backup(s) guardado(s), mas favoritos físicos ainda não decodificados'
    :'Ainda não importados · sem backup do Roland';
  }
  if(kind==='midiDiagnostics'){
   const stats=data||{},library=toneLib()?.list()||[],factory=window.XPS_TONES||[];
   const report={app:'Grauê XPS',type:'Diagnóstico somente leitura',usbConnected:!!stats.connected,sysexValidPackets:Number(stats.validSysexPackets||0),
    xpsReadVerified:!!stats.readValidated,cachedUserTones:!!stats.cachedUserTones,factoryTones:factory.length,userToneEntries:Math.max(0,library.length-factory.length),
    appFavoriteTones:toneLib()?.favorites()?.size||0,rolandFavoriteEntriesDecoded:0,
    backupFiles:backupRows.map(b=>({name:b.name,bytes:b.bytes,sha256:b.sha256})),
    note:'Nenhuma chave de API incluída. Bancos Roland ainda não foram extraídos do backup.'};
   window.Native?.exportFile?.(JSON.stringify(report,null,2));
  }
  if(kind==='sysexReady'){
   $x('gx-device-state').textContent='● Resposta SysEx confirmada do XPS-10';
   $x('gx-usb').textContent='● SysEx validado';
  }
  if(kind==='userTones'){renderToneList();renderBanks();renderFavorites();}
  if(kind==='status'&&/Sem resposta SysEx|não respondeu SysEx/i.test(String(data||''))){
    $x('gx-device-state').textContent='● USB-MIDI presente · XPS-10 sem resposta SysEx';
  }
  if(kind==='xpsConnection'){
   usbConnected=!!data;
   $x('gx-unified-usb').textContent=usbConnected?'USB conectado':'Conectar USB';
   $x('gx-unified-usb').classList.toggle('connected',usbConnected);
   $x('gx-usb').textContent=usbConnected?'● MIDI conectado':'● USB desconectado';
   $x('gx-device-state').textContent=usbConnected?'● MIDI conectado · aguardando resposta SysEx':'● USB desconectado';
  }
  if(kind==='answer'){
    if(silentPending){
     silentPending=false;
     $x('gx-silent-ai-text').textContent=S(data||'Nenhuma sugestão disponível.').slice(0,500);
     renderSilentAdvisor();
    }else onToneAiAnswer(data);
  }
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
  if(kind==='directApiState'){
   const x=data||{};directMode.value=x.mode||'offline';directModel.value=x.model||'gpt-6-luna';
   directState.dataset.configured=x.configured?'1':'0';
   directState.textContent=x.configured?'Chave protegida no celular. Use Testar API para confirmar.':'Sem chave configurada. Cole sua chave somente no aplicativo.';
  }
  if(kind==='jarvisGateway'){
   const g=data||{};onlineMode.value=g.mode||'offline';onlineModel.value=g.model||'gpt-6-luna';
   onlineUrl.value=g.endpoint||'';
   onlineState.dataset.configured=g.configured?'1':'0';
   onlineState.textContent=g.configured?'Servidor configurado':'Servidor não configurado';
   onlineFeedback.textContent=g.configured?'Conexão salva. Teste a API antes do culto.':'Configure o Worker e o token separado; a chave OpenAI fica no servidor.';
  }
  if(kind==='aiSource'){onlineFeedback.textContent='Última resposta: '+String(data||'indefinida');}
  if(kind==='jarvisMemory'){
   jarvisNotes.value=String(data||'').slice(0,550);
   jarvisNotesStatus.textContent=jarvisNotes.value?'Preferências locais carregadas. O Jarvis vai usá-las nas próximas sugestões.':'Nenhuma preferência salva. O Jarvis usará o perfil padrão.';
  }
  if(kind==='answer'){$x('gx-gemma-answer').textContent=String(data||'A IA não retornou texto.');}
  if(kind==='status')notify(data);
  if(kind==='webCifra'||kind==='import')sync();
 };
 const priorPersist=window.refreshLiveSongs;
 if(typeof priorPersist==='function')window.refreshLiveSongs=()=>{priorPersist();renderSongs();renderRepertoire();};
 sync();
 renderSilentAdvisor();
 showSoundPanel();
 if(window.Native?.restoreCachedTones)window.Native.restoreCachedTones();
 if(window.Native?.getJarvisMemory)window.Native.getJarvisMemory();
 if(window.Native?.getJarvisOnlineStatus)window.Native.getJarvisOnlineStatus();
 if(window.Native?.getDirectApiState)window.Native.getDirectApiState();
 if(window.Native?.listBackups)window.Native.listBackups();
 // O sequenciador progride por BPM; atualizar continuamente o resumo sem redesenhar o mixer.
 window.GraueCurrentChord=()=>String(song?.chords?.[idx]||'');
 setInterval(()=>{if(active==='stage'&&document.visibilityState!=='hidden')syncStage();},300);
})();
