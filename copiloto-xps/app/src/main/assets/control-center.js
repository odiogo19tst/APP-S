'use strict';
(()=>{
 const model=window.GraueControlCenterModel,screen=document.querySelector('#gx-shell [data-gx-screen="sound"]');if(!model||!screen)return;screen.querySelector('.gx-page-heading')?.remove();
 const doc=screen.ownerDocument,old=screen.querySelector('.gx-sound-layout'),root=doc.createElement('section');root.id='gx-control-center';
 root.innerHTML=`<header class="central-heading"><button id="central-exit" aria-label="Voltar ao menu inicial" title="Voltar ao menu inicial">‹ Menu inicial</button><div class="central-brand"><span id="central-brand-icon"></span><h1>Grauê XPS <span>· Central do teclado</span></h1></div><button id="central-mode" hidden>Entrar em Performance</button><button id="central-connect"><b>Roland XPS-10</b><span id="central-connection">USB aguardando</span></button></header>
 <p id="central-status" role="status" aria-live="polite">Conecte o XPS-10 e aguarde a leitura para editar seus parâmetros.</p>
 <div class="central-layout"><nav class="central-nav" aria-label="Ferramentas da central">
 <button data-central-tab="tones">Timbres</button><button data-central-tab="performance">Performances</button><button data-central-tab="favorites">Favoritos</button><button data-central-tab="overview">Visão geral</button><button data-central-tab="scenes">Cenas</button><button data-central-tab="parts">Partes</button><button data-central-tab="effects">Efeitos</button><button data-central-tab="sequence">Sequenciador</button><button data-central-tab="system">Sistema</button></nav><div class="central-body">
 <section data-central-page="overview" class="central-dashboard"><div class="central-main-column">
 <article class="central-scene-bar"><div><h3>♬ Cena da música</h3><strong id="central-performance-title">Leia a Performance</strong></div><div id="central-scene-shortcuts"></div></article>
 <article class="central-mix-card"><div class="central-card-heading"><h3>▱ Partes e camadas</h3><button data-central-go="parts" class="central-small-link">Todas as partes ›</button></div><div id="central-quick-parts"></div><div class="central-zone-heading"><h4>♬ Zonas (no teclado)</h4><div id="central-zone-legend"></div></div><div id="central-keys" aria-label="Notas MIDI recebidas"></div><small class="central-key-note">Zonas recebidas e indicadores MIDI no celular</small></article>
 <article class="central-sequence-preview"><div class="central-card-heading"><h3>▦ Sequenciador</h3><span class="central-small-note">4 de 8 pistas · página 1</span></div><div class="central-preview-layout"><div id="central-preview-grid"></div><div class="central-preview-transport"><button id="central-preview-edit">● Editar</button><button id="central-preview-play">▶ Tocar</button><button id="central-preview-stop">■ Parar</button><label>BPM<input id="central-preview-bpm" type="number" min="40" max="240" value="72"></label></div></div></article>
 </div><aside class="central-side-column">
 <article class="central-chords"><h3>♬ Memória de acordes</h3><div id="central-chord-buttons" class="central-chord-buttons"></div><details class="central-chord-options"><summary>Opções e mais acordes</summary><div id="central-chord-more-buttons" class="central-chord-buttons"></div><div class="central-fields"><label>Canal MIDI<select id="central-chord-channel"></select></label><label>Duração (ms)<input id="central-chord-duration" type="number" min="150" max="3000" value="900"></label></div><button id="central-chord-stop">Soltar acorde</button><label>Até 8 acordes separados por espaço<input id="central-chord-list" maxlength="120" value="C Am F G Dm Em Bb G7"></label><button id="central-chord-save">Guardar acordes no celular</button></details></article>
 <article class="central-quick-effects"><h3>♧ Efeitos</h3><button id="central-quick-mfx">MFX 1 <span>›</span></button><button id="central-quick-chorus">Chorus <span>›</span></button><button id="central-quick-reverb">Reverb <span>›</span></button></article>
 <article class="central-physical-limits"><h3>♙ Limites do hardware</h3><button disabled>♙ LEDs físicos: sem comando documentado</button><button disabled>♙ Power: exige acessório externo</button><small>Sem acionamento de energia ou LEDs nesta versão.</small></article>
 </aside></section>
 <section data-central-page="favorites" class="central-favorites-page" hidden><h3>Favoritos do Grauê</h3><p>10 bancos locais × 10 posições. Você pode guardar timbres ou Performances e acioná-los pelo USB-MIDI. Estes NÃO são os FAVORITE físicos do Roland, cuja importação ainda depende de decodificação validada.</p>
 <div id="central-favorite-banks" class="central-favorite-banks" role="group" aria-label="Bancos de favoritos"></div>
 <p id="central-favorite-current">Banco 0 · selecione uma posição</p>
 <div id="central-favorite-slots" class="central-favorite-slots" role="group" aria-label="Posições de favoritos"></div>
 <details id="central-favorite-editor" class="central-favorite-editor"><summary>Adicionar ou editar favorito</summary>
 <p id="central-favorite-edit-label">Escolha uma posição acima.</p>
 <label>Tipo de favorito<select id="central-favorite-kind"><option value="tone">Timbre</option><option value="performance">Performance</option></select></label>
 <div id="central-favorite-tone-fields">
 <label>Buscar timbre<input id="central-favorite-tone-search" type="search" placeholder="Nome ou código do timbre"></label>
 <label>Timbre<select id="central-favorite-tone-picker"></select></label>
 <label>Parte do teclado<select id="central-favorite-part"></select></label>
 </div>
 <div id="central-favorite-performance-fields" hidden>
 <label>Banco da Performance<select id="central-favorite-performance-type"><option value="user">USER (001–128)</option><option value="preset">PRESET (001–016)</option></select></label>
 <label>Número da Performance<input id="central-favorite-performance-number" type="number" min="1" max="128" value="1"></label>
 <small id="central-favorite-performance-name">Nome confirmado: não lido</small>
 </div>
 <div class="central-favorite-actions"><button id="central-favorite-save">Guardar nesta posição</button><button id="central-favorite-cancel">Fechar editor</button></div>
 </details>
 <p role="status" aria-live="polite" id="central-favorite-status">Selecione um banco e uma posição. Salvar não transmite MIDI.</p>
 </section>
 <section data-central-page="scenes" hidden><h3>Cenas de execução</h3><p>Guarda volume, filtro, envelope e roteamento MFX das 16 partes, além de transposição, oitava e switches de efeitos. Não inclui timbres, samples ou todos os parâmetros internos MFX. Cada cena pertence à mesma Performance usada na captura.</p><label>Nome da cena<input id="central-scene-name" maxlength="40" placeholder="Ex.: Verso, Refrão ou Oração"></label><button id="central-scene-save">Guardar estado lido</button><div id="central-scenes"></div><p>Cenas vinculadas à música aparecem primeiro. Preparar uma cena não transmite: confira e toque em Aplicar. Para manter edições após desligar o XPS, use WRITE no teclado.</p></section>
 <section data-central-page="parts" hidden><h3>Partes e camadas</h3><p>Escolha uma parte para ajustar seu som. Prepare as alterações e aplique quando estiver pronto.</p><label>Parte em foco<select id="central-part"></select></label><p id="central-zone">Leia o teclado para visualizar a zona.</p><details open class="central-system-group"><summary>Editar o som da parte selecionada</summary><p id="central-part-edit-title"></p><p>Prepare os valores e toque em Aplicar alterações. Os números com sinal representam ajustes em relação ao timbre.</p><div id="central-part-fields"></div></details><details class="central-system-group"><summary>Volumes das 16 partes</summary><div id="central-parts" class="central-parts"></div></details><button id="central-open-rhythm">Arpejador e ritmos do XPS</button><button id="central-open-synthesis">Síntese interna do timbre</button><button id="central-open-split">Editar timbres, camadas e divisão</button></section>
 <section data-central-page="effects" hidden><h3>Efeitos do XPS-10</h3><p>O seu teclado possui 3 unidades MFX. Estes switches preparam ON/BYPASS; tipos, níveis e detalhes são editados no editor de efeitos.</p><div id="central-fx" class="central-fields"></div><button id="central-open-effects">Tipos, níveis e parâmetros MFX</button></section>
 <section data-central-page="sequence" hidden><h3>Sequenciador de 8 pistas MIDI</h3><p>Programa notas em semicolcheias e toca nos canais escolhidos do Roland. Não é gravação de áudio nem copia os sons do XPS-60. Para gravar tocando ao vivo, use o looper no Palco.</p><div class="central-fields"><label>BPM<input id="central-seq-bpm" type="number" min="40" max="240" value="72"></label><label>Passos<select id="central-seq-steps"><option>16</option><option>32</option><option>64</option></select></label></div><div class="central-transport"><button id="central-seq-play">▶ Tocar sequência</button><button id="central-seq-stop">■ Parar</button><button id="central-seq-preset">Preparar base leve</button><button id="central-seq-clear">Limpar sequência</button></div><p id="central-seq-status" role="status">Sequenciador parado</p><div id="central-seq-pages" class="central-step-pages"></div><div class="central-grid-scroll"><div id="central-seq-grid"></div></div><details open><summary>Configurar a pista selecionada</summary><div class="central-fields"><label>Pista<select id="central-seq-track"></select></label><label>Nome<input id="central-seq-name" maxlength="24"></label><label>Canal MIDI<select id="central-seq-channel"></select></label><label>Nota para novos passos<input id="central-seq-note" type="number" min="0" max="127"></label><label>Intensidade<input id="central-seq-velocity" type="number" min="1" max="127"></label><label>Duração (passos)<input id="central-seq-gate" type="number" min="1" max="16"></label></div><p id="central-seq-note-name"></p><p>Toque em um passo vazio para inserir a nota configurada. Toque novamente para apagar. Edite com a sequência parada. O padrão fica no celular; abrir a tela não inicia a reprodução.</p></details></section>
 <section data-central-page="system" hidden><h3>Configuração do teclado</h3><p>Sistema global, teclas, pedal e MIDI do XPS-10. Os campos dependem dos valores recebidos. Prepare os ajustes, toque em Aplicar alterações e confira a releitura.</p><div class="central-fields"><label>Transposição do teclado (−5 a +6)<input id="central-transpose" type="number" min="-5" max="6"></label><label>Oitava do teclado (−3 a +3)<input id="central-octave" type="number" min="-3" max="3"></label></div><div id="central-global-fields"></div><details class="central-system-group"><summary>Controle disponível e limites</summary><div id="central-coverage"></div><button id="central-open-diagnostic">Abrir diagnóstico SysEx existente</button><p>Para investigar alterações do painel, ative Tx Edit Data no menu MIDI do XPS. Isso não transforma todos os botões em controles remotos. Esta versão não grava memórias USER.</p></details><button id="central-open-system">Abrir ajustes do aplicativo</button><article class="central-limits"><h3>Limites físicos do instrumento</h3><button disabled>🔒 LEDs físicos · sem controle independente documentado</button><button disabled>🔒 Power · sem acionamento por MIDI</button><p>Os indicadores e as zonas podem ser mostrados no celular. Controlar o botão físico de energia exigiria um acessório externo e validação própria. Esta versão não envia comandos de energia ou iluminação.</p></article></section>
 </div></div><footer class="central-toolbar"><div class="central-pending-row"><span id="central-pending">Nenhum ajuste preparado</span><button id="central-discard">Descartar preparados</button></div><div class="central-main-actions"><button id="central-read">♧ Ler teclado</button><button id="central-apply">✓ Aplicar alterações</button><button id="central-undo">↶ Desfazer</button><button id="central-save-open">▣ Salvar no Grauê</button></div><small>Edição temporária no XPS · WRITE no teclado para gravar</small></footer>`;
 if(old){const details=doc.createElement('details'),summary=doc.createElement('summary');details.id='central-existing-editors';details.className='central-existing-editors';summary.textContent='Editores detalhados · timbres, mixer e síntese';details.append(summary,old);screen.append(root);root.querySelector('.central-body').append(details);}else screen.append(root);
 const shell=doc.getElementById('gx-shell');const updateFocus=()=>shell.classList.toggle('gx-central-focus',screen.classList.contains('on'));if(typeof MutationObserver!=='undefined')new MutationObserver(updateFocus).observe(screen,{attributes:true,attributeFilter:['class']});updateFocus();
 const q=k=>doc.getElementById('central-'+k),make=(tag,text)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;return n;};
 const icon=paths=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+paths+'</svg>';
 q('brand-icon').innerHTML=icon('<rect x="2" y="6" width="20" height="13" rx="1"/><path d="M6 6v8h3V6m3 0v8h3V6m3 0v8h2M7 14v5m5-5v5m5-5v5M5 3h14"/>');
 const navIcons={favorites:'<path d="m12 2 3.1 6.4 7 1-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-1z"/>',tones:'<path d="M4 5h16v14H4zM8 5v9m5-9v9m5-9v9M6 19v2m12-2v2"/>',performance:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h10M7 13h10M7 17h6"/>',overview:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M9 10h12"/>',scenes:'<path d="M4 7h16v14H4zM7 3h10M4 11h16M8 15h8"/>',parts:'<path d="M5 3v18m7-18v18m7-18v18M2 8h6m1 8h6m1-10h6"/>',effects:'<path d="m4 18 4-12 5 12 4-12 3 12M2 12h20"/>',sequence:'<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',system:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>'};
 for(const b of root.querySelectorAll('[data-central-tab]'))b.insertAdjacentHTML('afterbegin',icon(navIcons[b.dataset.centralTab]));
 const lockIcon='<rect x="5" y="10" width="14" height="11" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>';
 for(const [selector,paths] of [['.central-scene-bar h3','<path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/>'],['.central-mix-card h3','<path d="m12 2 10 5-10 5L2 7Zm-10 10 10 5 10-5M2 17l10 5 10-5"/>'],['.central-sequence-preview h3',navIcons.sequence],['.central-chords h3','<rect x="2" y="5" width="20" height="15"/><path d="M6 5v9h3V5m3 0v9h3V5m3 0v9h2M7 14v6m5-6v6m5-6v6"/>'],['.central-quick-effects h3',navIcons.parts],['.central-physical-limits h3',lockIcon]]){const n=root.querySelector(selector);n.textContent=n.textContent.replace(/^\S+\s/,'');n.insertAdjacentHTML('afterbegin',icon(paths));}
 for(const [id,label,paths] of [['read','Ler teclado','<path d="M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5"/>'],['apply','Aplicar alterações','<path d="m3 12 6 6L21 5"/>'],['undo','Desfazer','<path d="m8 3-6 6 6 6M2 9h11a8 8 0 0 1 8 8"/>'],['save-open','Salvar no Grauê','<path d="M3 2h15l4 4v16H3Zm4 0v7h10V2M7 22V13h11v9"/>']])q(id).innerHTML=icon(paths)+label;

 const preferences=typeof saved==='object'?saved:{},persistNow=()=>typeof persist==='function'&&persist()!==false;
 let chosenCue='',lastPositive=new Map(),quickInputs=[],previewCells=[];
 let hw={},connected=false,busy=false,activePart=0,expected=null,prepared=new Map(),activePage='overview',seqPage=0,seqTrack=0,seqPlaying=false,seqStep=-1,seqMutes=Array(8).fill(false),seqCells=[];
 let pattern;try{pattern=model.pattern(preferences.centralPattern);}catch(e){pattern=model.emptyPattern();}
 let scenes=(Array.isArray(preferences.centralScenes)?preferences.centralScenes:[]).flatMap(s=>{try{return [model.scene(s)];}catch(e){return [];}}).slice(0,30);
 const validChord=c=>typeof c==='string'&&!!Music.parse(c)&&Music.tones(c).length>0&&Music.tones(c).length<=5;
 let chords=Array.isArray(preferences.centralChords)&&preferences.centralChords.length>0&&preferences.centralChords.length<=8&&preferences.centralChords.every(validChord)?preferences.centralChords:['C','Am','F','G','Dm','Em','Bb','G7'];
 const message=t=>q('status').textContent=String(t||''),canEdit=()=>connected&&!busy&&model.ready(hw),key=e=>[e.section,e.index,e.offset].join(':'),currentSong=()=>typeof song!=='undefined'&&typeof songIndex==='function'&&songIndex(song)>=0?song.loopId||'':'';
 function call(name,...args){if(typeof window.Native?.[name]!=='function'){message('Este recurso exige o APK atualizado.');return false;}window.Native[name](...args);return true;}

 // Local favorites are intentionally separate from physical Roland FAVORITE memories.
 let favoriteBank=Number.isInteger(preferences.lastToneBank)&&preferences.lastToneBank>=0&&preferences.lastToneBank<=9?preferences.lastToneBank:0;
 let favoriteIndex=null;
 const favoriteLib=()=>window.ToneLibrary;
 const favoriteMessage=t=>{q('favorite-status').textContent=String(t);message(t);};
 const favoriteEntry=i=>favoriteLib()?.favoriteEntry?.(favoriteBank,i)||null;
 const favoriteLabel=e=>!e?'Não cadastrado':e.type==='rig'?(window.GraueQuickRig?.label(e)||'Dual/Split'):e.type==='performance'?(e.user?'USER ':'PRESET ')+String(e.number).padStart(3,'0'):e.name+' · '+e.code;
 const validFavoriteTone=t=>t&&Number.isInteger(t.msb)&&Number.isInteger(t.lsb)&&Number.isInteger(t.program);
 function updateFavoriteKind(){
  const type=q('favorite-kind').value;
  q('favorite-tone-fields').hidden=type!=='tone';
  q('favorite-performance-fields').hidden=type!=='performance';
  updateFavoritePerformanceName();
 }
 function updateFavoritePerformanceName(){
  const user=q('favorite-performance-type').value==='user';
  q('favorite-performance-number').max=user?'128':'16';
  const n=Number(q('favorite-performance-number').value);
  const key=(user?'U':'P')+n;
  const name=preferences.performanceNames?.[key];
  q('favorite-performance-name').textContent=typeof name==='string'&&name.trim()?'Nome recebido: '+name:'Nome confirmado: não lido';
 }
 function findFavoriteTones(selectedCode=''){
  const lib=favoriteLib(),query=q('favorite-tone-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const results=(lib?.list()||[]).filter(t=>validFavoriteTone(t)&&String(t.code+' '+t.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(query)).slice(0,70);
  const picker=q('favorite-tone-picker');picker.replaceChildren();
  for(const t of results)option(picker,t.code+' · '+t.name,t.code);
  if(selectedCode&&results.some(t=>t.code===selectedCode))picker.value=selectedCode;
  if(!results.length)option(picker,'Nenhum timbre encontrado','');
 }
 function openFavoriteEditor(index){
  favoriteIndex=index;
  const entry=favoriteEntry(index);q('favorite-editor').open=true;
  q('favorite-edit-label').textContent='Banco '+favoriteBank+' · posição '+index+(entry?' · substituir':' · nova');
  q('favorite-kind').value=entry?.type==='performance'?'performance':'tone';
  q('favorite-tone-search').value=entry?.type==='tone'?entry.code:'';
  findFavoriteTones(entry?.type==='tone'?entry.code:'');
  q('favorite-part').value=String(entry?.type==='tone'?entry.part:(Number.isInteger(preferences.lastTonePart)?preferences.lastTonePart:0));
  if(entry?.type==='performance'){q('favorite-performance-type').value=entry.user?'user':'preset';q('favorite-performance-number').value=String(entry.number);}
  updateFavoriteKind();
  favoriteMessage('Editando banco '+favoriteBank+', posição '+index+'. Salvar não altera o teclado.');
 }
 function playFavorite(entry,index){
  if(!entry)return openFavoriteEditor(index);
  if(!connected){favoriteMessage('USB desconectado. Favorito salvo no celular; conecte o XPS-10 para tocar.');return;}
  if(entry.type==='performance'){
   if(!call('selectPerformance',entry.number,entry.user))return;
  }else if(entry.type==='rig'){
   try{
    if(busy)throw Error('Aguarde o término da operação MIDI atual.');
    const edits=window.GraueQuickRig?.plan(hw,entry);
    if(!edits)throw Error('Editor Dual/Split indisponível.');
    if(!call('editHardware',JSON.stringify(edits)))return;
   }catch(e){favoriteMessage(e.message);return;}
  }else{
   if(!validFavoriteTone(entry)||!Number.isInteger(entry.part)||entry.part<0||entry.part>15){favoriteMessage('Timbre ou parte inválida. Edite o favorito antes de tocar.');return;}
   if(!call('selectTone',entry.msb,entry.lsb,entry.program,entry.part))return;
  }
  favoriteMessage('Solicitado ao XPS-10: '+favoriteLabel(entry)+' · confirme o som no teclado.');
 }
 function renderFavoriteBanks(){
  const box=q('favorite-banks');box.replaceChildren();
  for(let i=0;i<10;i++){const b=make('button',String(i));b.classList.toggle('on',i===favoriteBank);b.setAttribute('aria-pressed',String(i===favoriteBank));b.setAttribute('aria-label','Banco de favoritos '+i);b.onclick=()=>{favoriteBank=i;preferences.lastToneBank=i;if(!persistNow())return favoriteMessage('Não foi possível salvar a seleção do banco.');favoriteIndex=null;q('favorite-editor').open=false;renderFavoriteBanks();renderFavoriteSlots();};box.append(b);}
 }
 function renderFavoriteSlots(){
  q('favorite-current').textContent='Banco '+favoriteBank+' · toque para acionar; segure 3s ou toque em Editar';
  const box=q('favorite-slots');box.replaceChildren();
  for(let i=0;i<10;i++){
   const entry=favoriteEntry(i),row=make('div');row.className='central-favorite-slot';
   const select=make('button');select.className='central-favorite-pick';
   const number=make('strong',String(i).padStart(2,'0')),name=make('span',favoriteLabel(entry));select.append(number,name);
   select.setAttribute('aria-label',entry?'Acionar '+favoriteLabel(entry)+' do banco '+favoriteBank:'Editar posição vazia '+i+' do banco '+favoriteBank);
   let timer=null,suppress=false;
   select.addEventListener('pointerdown',e=>{if(e.button!==0)return;suppress=false;timer=setTimeout(()=>{timer=null;suppress=true;openFavoriteEditor(i);},3000);});
   for(const event of ['pointerup','pointerleave','pointercancel'])select.addEventListener(event,()=>{if(timer!==null)clearTimeout(timer);timer=null;});
   select.addEventListener('contextmenu',e=>{e.preventDefault();});
   select.onclick=()=>{if(suppress){suppress=false;return;}playFavorite(entry,i);};
   const edit=make('button','Editar');edit.className='central-favorite-edit';edit.setAttribute('aria-label','Editar favorito '+i+' do banco '+favoriteBank);edit.onclick=()=>openFavoriteEditor(i);
   row.append(select,edit);
   if(entry){const remove=make('button','Apagar');remove.className='central-favorite-remove';remove.setAttribute('aria-label','Apagar favorito '+i+' do banco '+favoriteBank);remove.onclick=()=>{if(!confirm('Apagar somente o favorito '+i+' do banco '+favoriteBank+' no celular?'))return;try{favoriteLib().putFavoriteEntry(favoriteBank,i,null);renderFavoriteSlots();favoriteMessage('Favorito removido do celular. O XPS-10 não foi modificado.');}catch(e){favoriteMessage(e.message);}};row.append(remove);}
   box.append(row);
  }
 }
 for(let i=0;i<16;i++)option(q('favorite-part'),'Parte '+(i+1),i);
 q('favorite-part').value=String(preferences.lastTonePart||0);
 q('favorite-kind').onchange=updateFavoriteKind;
 q('favorite-tone-search').oninput=()=>findFavoriteTones();
 q('favorite-performance-type').onchange=updateFavoritePerformanceName;
 q('favorite-performance-number').oninput=updateFavoritePerformanceName;
 q('favorite-cancel').onclick=()=>{q('favorite-editor').open=false;favoriteIndex=null;};
 q('favorite-save').onclick=()=>{
  if(favoriteIndex===null)return favoriteMessage('Selecione uma posição antes de guardar.');
  const type=q('favorite-kind').value;
  let entry;
  if(type==='tone'){
   const code=q('favorite-tone-picker').value,t=(favoriteLib()?.list()||[]).find(t=>t.code===code);
   if(!validFavoriteTone(t))return favoriteMessage('Escolha um timbre válido da biblioteca.');
   const part=Number(q('favorite-part').value);if(!Number.isInteger(part)||part<0||part>15)return favoriteMessage('Parte inválida.');
   entry={type:'tone',...t,part};preferences.lastTonePart=part;
  }else{
   const user=q('favorite-performance-type').value==='user',number=Number(q('favorite-performance-number').value);
   if(!Number.isInteger(number)||number<1||number>(user?128:16))return favoriteMessage('Número de Performance fora da faixa.');
   entry={type:'performance',user,number};
  }
  try{
   favoriteLib().putFavoriteEntry(favoriteBank,favoriteIndex,entry);
   q('favorite-editor').open=false;favoriteIndex=null;renderFavoriteSlots();
   favoriteMessage('Favorito guardado no celular: '+favoriteLabel(entry)+'. Toque na posição para solicitar ao teclado.');
  }catch(e){favoriteMessage(e.message);}
 };
 renderFavoriteBanks();findFavoriteTones();renderFavoriteSlots();updateFavoriteKind();

 function selectPage(name){
  activePage=name;root.dataset.page=name;
  const editors=doc.getElementById('central-existing-editors'),library=name==='tones'||name==='performance';
  root.querySelectorAll('[data-central-page]').forEach(n=>n.hidden=n.dataset.centralPage!==name);
  root.querySelectorAll('[data-central-tab]').forEach(n=>{n.classList.toggle('on',n.dataset.centralTab===name);n.setAttribute('aria-current',n.dataset.centralTab===name?'page':'false');});
  if(editors)editors.open=library;
  if(name==='favorites'){renderFavoriteBanks();renderFavoriteSlots();}
  if(library){const source=doc.querySelector('[data-gx-sound="'+name+'"]');if(source)source.click();else message('O editor de '+name+' não está disponível nesta versão.');}
 }
 for(const b of root.querySelectorAll('[data-central-tab],[data-central-go]'))b.onclick=()=>selectPage(b.dataset.centralTab||b.dataset.centralGo);
 function option(field,text,value){const o=make('option',text);o.value=String(value);field.append(o);}
 for(let i=1;i<=16;i++){option(q('chord-channel'),'Canal '+i,i);option(q('seq-channel'),'Canal '+i,i);option(q('part'),'Parte '+i,i-1);}
 for(let i=0;i<8;i++)option(q('seq-track'),'Pista '+(i+1),i);
 function updateButtons(){q('mode').hidden=!connected||!Array.isArray(hw['setup:0'])||hw['setup:0'][0]===1;q('mode').disabled=busy;q('connection').textContent=connected?(model.ready(hw)?'USB · Performance lida':Array.isArray(hw['system:0'])?'USB · sistema lido':'USB · aguardando SysEx'):'USB desconectado';q('pending').textContent=prepared.size?prepared.size+' ajuste(s) preparado(s)'+(prepared.size>128?' · aplicar 128 por vez':''):'Nenhum ajuste preparado';q('apply').disabled=!connected||busy||!model.canApply([...prepared.values()],hw);q('discard').disabled=!prepared.size;q('read').disabled=!connected||busy;q('undo').disabled=!connected||busy;q('scene-save').disabled=!canEdit();for(const b of root.querySelectorAll('#central-chord-buttons button,#central-chord-more-buttons button'))b.disabled=!connected;q('chord-stop').disabled=!connected;q('seq-play').disabled=!connected||busy||seqPlaying;q('seq-stop').disabled=!seqPlaying;q('preview-play').disabled=!connected||busy||seqPlaying;q('preview-stop').disabled=!seqPlaying;q('preview-bpm').disabled=seqPlaying;}
 function stageEdit(section,index,offset,value){try{const e=model.command(section,index,offset,value);if(model.isGlobal(e)?!connected||busy||!model.globalReady(hw)||!Number.isInteger(model.systemValue(hw,e)):!canEdit())throw Error('Conecte e leia o XPS-10 antes de preparar uma alteração.');prepared.set(key(e),e);chosenCue='';refreshQuickParts();renderCueShortcuts();updateButtons();}catch(e){message(e.message);}}
 function value(section,index,offset){return prepared.get([section,index,offset].join(':'))?.value??hw[section+':'+index]?.[offset];}
 function refreshFields(){
  for(const n of root.querySelectorAll('[data-central-level]')){const i=Number(n.dataset.centralLevel),v=value('part',i,7);if(doc.activeElement!==n)n.value=Number.isInteger(v)?String(v):'';n.disabled=!canEdit()||!Array.isArray(hw['part:'+i]);}
  for(const n of q('fx').querySelectorAll('input')){n.checked=!!value('setup',0,Number(n.dataset.offset));n.disabled=!canEdit();}
  for(const [name,offset] of [['transpose',18],['octave',19]]){const n=q(name),v=value('setup',0,offset);if(doc.activeElement!==n)n.value=Number.isInteger(v)?String(v-64):'';n.disabled=!canEdit();}
  const p=hw['part:'+activePart],z=p?hw['zone:'+p[0]]:null;q('zone').textContent=z&&Number.isInteger(z[12])&&Number.isInteger(z[13])?'Parte '+(activePart+1)+' · Canal '+(p[0]+1)+' · Zona '+noteName(z[12])+' a '+noteName(z[13]):'Zona ainda não recebida do teclado.';
  refreshSystemFields();refreshPartFields();refreshCoverage();refreshQuickParts();renderCueShortcuts();updateButtons();
 }
 const partInputs=[],partGroups=new Map();
 for(const f of model.partFields){let group=partGroups.get(f.group);if(!group){group=make('details');group.className='central-system-group';group.open=['Som','Execução'].includes(f.group);group.append(make('summary',f.group));const fields=make('div');fields.className='central-fields';group.append(fields);q('part-fields').append(group);partGroups.set(f.group,group);}const label=make('label',f.label),input=make(f.options?'select':'input');input.dataset.partField=f.section+':'+f.offset;if(f.options)f.options.forEach((text,i)=>option(input,text,f.min+i));else{input.type='number';input.min=String(f.min);input.max=String(f.max);input.step='1';}input.onchange=()=>{try{stageEdit(f.section,activePart,f.offset,model.partRaw(f,input.value));}catch(e){message(e.message);}refreshFields();};label.append(input);if(f.hint)label.append(make('small',f.hint));group.lastChild.append(label);partInputs.push({f,input});}
 function refreshPartFields(){q('part-edit-title').textContent='Parte '+(activePart+1)+(patchName(activePart)?' · '+patchName(activePart):' · sem nome recebido');for(const {f,input} of partInputs){const e={...f,index:activePart},v=prepared.get(key(e))?.value??model.partValue(hw,e),known=!!model.partKnown(hw,e);input.disabled=!canEdit()||!known;if(doc.activeElement!==input||!known)input.value=known?String(v-(f.bias||0)):'';} }
 function refreshCoverage(){const box=q('coverage');box.replaceChildren();const rows=[['Sistema global',model.systemFields.filter(f=>Number.isInteger(model.systemValue(hw,f))).length+' / '+model.systemFields.length+' valores recebidos'],['Parte '+(activePart+1),model.partFields.filter(f=>model.partKnown(hw,{...f,index:activePart})).length+' / '+model.partFields.length+' valores recebidos'],['Síntese interna','Editor existente · leitura própria do Patch'],['Arpejador e ritmos','Editor existente · botão Arpejador e ritmos na aba Partes'],['Favoritos físicos e arquivos','Importação de backup e pendrive; sem controle completo confirmado'],['Memória USER','Gravação remota não habilitada'],['Power, visor e LEDs','Sem comandos documentados implementados']];for(const [title,text] of rows){const p=make('p');p.append(make('strong',title+': '),doc.createTextNode(text));box.append(p);} }
 const systemInputs=[];const systemGroups=new Map();
 for(const f of model.systemFields){let group=systemGroups.get(f.group);if(!group){group=make('details');group.className='central-system-group';group.open=f.group==='Som geral';group.append(make('summary',f.group));const fields=make('div');fields.className='central-fields';group.append(fields);q('global-fields').append(group);systemGroups.set(f.group,group);}const label=make('label',f.label),input=make(f.options?'select':'input');input.dataset.systemField=f.section+':'+f.offset;if(f.options)f.options.forEach((t,i)=>option(input,t,f.min+i));else{input.type='number';input.min=String(f.min);input.max=String(f.max);input.step=String(f.step||1);}input.onchange=()=>{try{stageEdit(f.section,0,f.offset,model.toRaw(f,input.value));}catch(e){message(e.message);}refreshFields();};label.append(input);group.lastChild.append(label);systemInputs.push({f,input});}
 function refreshSystemFields(){for(const {f,input} of systemInputs){const v=prepared.get(key(f))?.value??model.systemValue(hw,f),known=Number.isInteger(v);input.disabled=!connected||busy||!model.globalReady(hw)||!known;if(doc.activeElement!==input||!known)input.value=known?String((v-(f.bias||0))/(f.scale||1)):'';}}
 for(let i=0;i<16;i++){const card=make('label'),caption=make('span','Parte '+(i+1)),input=make('input');input.type='number';input.min='0';input.max='127';input.dataset.centralLevel=String(i);input.setAttribute('aria-label','Nível preparado da parte '+(i+1));input.onchange=()=>{if(input.value===''){message('Informe um nível de 0 a 127.');refreshFields();return;}stageEdit('part',i,7,Number(input.value));};card.append(caption,input);q('parts').append(card);}
 for(const [name,offset] of [['MFX 1',10],['MFX 2',11],['MFX 3',12],['Chorus',13],['Reverb',14]]){const label=make('label'),input=make('input');input.type='checkbox';input.dataset.offset=String(offset);input.onchange=()=>stageEdit('setup',0,offset,input.checked?1:0);label.append(input,make('span',name+' ativo'));q('fx').append(label);}
 q('part').onchange=()=>{activePart=Number(q('part').value);const original=doc.getElementById('hardwarePart');if(original){original.value=String(activePart);original.onchange?.();}refreshFields();};
 for(const [name,offset] of [['transpose',18],['octave',19]])q(name).onchange=()=>{if(q(name).value===''){message('Informe um valor inteiro.');refreshFields();return;}stageEdit('setup',0,offset,Number(q(name).value)+64);};
 q('read').onclick=()=>{if(prepared.size&&!confirm('Atualizar a leitura e descartar os ajustes preparados nesta central?'))return;prepared.clear();expected=null;call('readHardware');refreshFields();};
 q('discard').onclick=()=>{prepared.clear();expected=null;chosenCue='';refreshFields();message('Ajustes preparados descartados. Nenhum comando MIDI enviado.');};
 q('apply').onclick=()=>{try{if(!connected||busy||!model.canApply([...prepared.values()],hw))return;const edits=model.pendingBatch([...prepared.values()]);expected={source:model.editSource(edits,hw),edits};if(call('editHardware',JSON.stringify(edits)))message('Ajustes enviados. Aguardando a leitura do XPS-10.');else expected=null;}catch(e){expected=null;message(e.message);}};
 q('mode').onclick=()=>{if(!connected||busy||!Array.isArray(hw['setup:0'])||hw['setup:0'][0]===1)return;call('editHardware',JSON.stringify([{section:'setup',index:0,offset:0,value:1}]));};
 q('undo').onclick=()=>call('undoHardware');
 q('exit').onclick=()=>window.GraueNavigation?.home();q('connect').onclick=()=>doc.getElementById('gx-unified-usb')?.click();q('save-open').onclick=()=>{selectPage('scenes');q('scene-name').focus();message('Informe o nome e guarde o estado lido do teclado.');};
 const openEditor=key=>{selectPage(key==='performance'?'performance':'tones');const details=doc.getElementById('central-existing-editors');if(details)details.open=true;doc.querySelector('[data-gx-sound="'+key+'"]')?.click();};
 q('quick-mfx').onclick=()=>{const unit=doc.getElementById('mfxUnit');if(unit){unit.value='0';unit.onchange?.();}openEditor('effects');};for(const kind of ['chorus','reverb'])q('quick-'+kind).onclick=()=>{openEditor('effects');doc.getElementById('ambienceCard')?.scrollIntoView({block:'start'});};
 const openSynthesis=()=>{const pick=doc.querySelector('#gx-patch-four-tones select[aria-label="Parte a preparar no laboratório de síntese"]');if(pick){pick.value=String(activePart);pick.onchange?.();}openEditor('patch');};q('open-synthesis').onclick=openSynthesis;q('open-diagnostic').onclick=()=>{openSynthesis();const details=doc.querySelector('.gx-synth-capture');if(details){details.open=true;details.scrollIntoView({block:'start'});}};q('open-rhythm').onclick=()=>openEditor('arpeggio');q('open-effects').onclick=()=>openEditor('effects');q('open-split').onclick=()=>openEditor('split');q('open-system').onclick=()=>{doc.getElementById('gx-more-menu').open=true;doc.querySelector('[data-gx-tab="settings"]')?.click();};
 function prepareScene(s){try{if(!canEdit())throw Error('Aguarde a leitura da Performance.');const edits=model.prepare(s,hw);prepared=new Map(edits.map(e=>[key(e),e]));chosenCue=s.name;expected=null;refreshFields();message('Cena '+s.name+' preparada. Toque Aplicar para enviar os parâmetros.');}catch(e){message(e.message);}}
 function renderCueShortcuts(){const common=hw['common:0'],name=Array.isArray(common)?common.slice(0,12).map(n=>n>=32&&n<=126?String.fromCharCode(n):'').join('').trim():'';q('performance-title').textContent=name||'Leia a Performance';const box=q('scene-shortcuts'),id=currentSong();box.replaceChildren();for(const name of ['Verso','Refrão','Oração']){const cue=scenes.find(s=>s.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR')&&s.songId===id)||scenes.find(s=>s.name.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'));const b=make('button',name);b.classList.toggle('on',chosenCue===name);b.setAttribute('aria-pressed',String(chosenCue===name));b.setAttribute('aria-label',(cue?'Preparar cena ':'Criar cena ')+name);b.onclick=()=>{if(cue)prepareScene(cue);else{selectPage('scenes');q('scene-name').value=name;q('scene-name').focus();message('Prepare o som e guarde o estado lido como '+name+'.');}};box.append(b);}}
 function renderScenes(){const box=q('scenes'),id=currentSong();box.replaceChildren();const sorted=[...scenes].sort((a,b)=>Number(b.songId===id&&!!id)-Number(a.songId===id&&!!id));if(!sorted.length)box.append(make('p','Nenhuma cena guardada. Aplique seus ajustes e capture o estado recebido do teclado.'));for(const s of sorted){const row=make('div'),name=make('strong',s.name+(s.songId===id&&id?' · desta música':'')+(s.edits.length<119?' · parcial ('+s.edits.length+'/119)':'')),prepare=make('button','Preparar'),remove=make('button','Apagar cópia');row.className='central-scene';prepare.onclick=()=>prepareScene(s);remove.onclick=()=>{if(!confirm('Apagar esta cena do celular? O teclado não será alterado.'))return;const previous=scenes;scenes=scenes.filter(x=>x!==s);preferences.centralScenes=scenes;if(!persistNow()){scenes=previous;preferences.centralScenes=scenes;message('Não foi possível persistir a exclusão. A cena foi preservada.');return;}renderScenes();doc.dispatchEvent(new CustomEvent('graue:scenes-changed'));};row.append(name,prepare,remove);box.append(row);}renderCueShortcuts();}
 q('scene-save').onclick=()=>{try{if(!canEdit())throw Error('Leia a Performance antes de guardar uma cena.');if(scenes.length>=30)throw Error('Limite de 30 cenas. Apague uma cópia para guardar outra.');const captured=model.capture(hw,q('scene-name').value,currentSong());let stagedCount=0;for(const edit of prepared.values()){const index=captured.edits.findIndex(e=>key(e)===key(edit));if(index>=0){captured.edits[index]=model.command(edit.section,edit.index,edit.offset,edit.value);stagedCount++;}}scenes.push(captured);preferences.centralScenes=scenes;if(!persistNow()){scenes.pop();preferences.centralScenes=scenes;throw Error('O Android não confirmou o salvamento da cena. Nenhuma cópia foi guardada.');}renderScenes();doc.dispatchEvent(new CustomEvent('graue:scenes-changed'));message('Cena '+captured.name+' guardada: '+captured.edits.length+'/119 parâmetros validados'+(captured.edits.length<119?' (captura parcial).':'')+(stagedCount?' Incluiu '+stagedCount+' ajuste(s) preparado(s), ainda não enviados ao XPS.':'')+(prepared.size>stagedCount?' '+(prepared.size-stagedCount)+' ajuste(s) fora das cenas não incluídos.':'')+' A memória USER do teclado não foi gravada.');}catch(e){message(e.message);}};
 function renderChords(){q('chord-list').value=chords.join(' ');q('chord-buttons').replaceChildren();q('chord-more-buttons').replaceChildren();for(const [index,chord] of chords.entries()){const b=make('button',chord);b.onclick=()=>{const duration=Number(q('chord-duration').value),channel=Number(q('chord-channel').value);if(!Number.isInteger(duration)||duration<150||duration>3000)return message('Use duração de 150 a 3000 ms.');const notes=Music.voicing(chord,[60,64,67]);if(!notes.length||notes.length>5||notes.some(n=>n<36||n>96))return message('Acorde fora da faixa suportada.');if(!connected)return message('Conecte o XPS-10 para tocar o acorde.');call('playAssistChord',JSON.stringify({channel,velocity:70,duration,notes}));};q(index<4?'chord-buttons':'chord-more-buttons').append(b);}updateButtons();}
 q('chord-stop').onclick=()=>call('stopAssistChord');q('chord-save').onclick=()=>{const next=q('chord-list').value.trim().split(/\s+/);if(next.length<1||next.length>8||!next.every(validChord))return message('Informe de 1 a 8 acordes válidos, como C, Am, Fmaj7 e G7.');chords=next;preferences.centralChords=chords;persistNow();renderChords();message('Memória de acordes guardada no celular.');};
 function noteName(n){return Music.names[n%12]+(Math.floor(n/12)-1);}
 const keyRects=new Map(),pressedKeys=new Set(),ns='http://www.w3.org/2000/svg',svg=doc.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 504 78');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('role','img');svg.setAttribute('aria-label','Indicadores de notas MIDI de C2 a C7');let white=0;const blacks=[];
 for(let note=36;note<=96;note++){const black=[1,3,6,8,10].includes(note%12),r=doc.createElementNS(ns,'rect');r.setAttribute('rx','1');r.setAttribute('y','1');r.setAttribute('x',String(black?white*14-5:white*14));r.setAttribute('width',String(black?9:13));r.setAttribute('height',String(black?45:74));r.setAttribute('fill',black?'#13212b':'#dae8ee');r.dataset.black=String(black);r.dataset.note=String(note);keyRects.set(note,r);if(black)blacks.push(r);else{svg.append(r);white++;}}
 for(const r of blacks)svg.append(r);q('keys').append(svg);
 const defs=doc.createElementNS(ns,'defs'),overlap=doc.createElementNS(ns,'pattern');overlap.id='central-zone-overlap';overlap.setAttribute('patternUnits','userSpaceOnUse');overlap.setAttribute('width','6');overlap.setAttribute('height','6');for(const [x,color] of [[0,'#69c7af'],[3,'#c9849a']]){const r=doc.createElementNS(ns,'rect');r.setAttribute('x',String(x));r.setAttribute('width','3');r.setAttribute('height','6');r.setAttribute('fill',color);overlap.append(r);}defs.append(overlap);svg.prepend(defs);
 function patchName(index){const patch=hw['patch:'+index];return Array.isArray(patch)?patch.slice(0,12).map(n=>n>=32&&n<=126?String.fromCharCode(n):'').join('').trim():'';}
 function refreshQuickParts(){for(const [i,item] of quickInputs.entries()){const p=hw['part:'+i],v=value('part',i,7),known=Number.isInteger(v);item.name.textContent=patchName(i)||'Parte '+(i+1);item.meta.textContent=p?'Parte '+(i+1)+' · CH '+(p[0]+1):'Sem leitura';item.out.textContent=known?String(v):'—';if(doc.activeElement!==item.input)item.input.value=known?String(v):'0';item.input.disabled=!canEdit()||!known;item.mute.disabled=!canEdit()||!known;item.mute.textContent=known&&v===0?'Ouvir':'Mudo';item.input.style.setProperty('--level',known?(v/127*100)+'%':'0%');if(known&&v>0)lastPositive.set(i,v);}
  const zones=[0,1].map(i=>{const p=hw['part:'+i],z=p?hw['zone:'+p[0]]:null;return z&&z[1]===1&&Number.isInteger(z[12])&&Number.isInteger(z[13])?{index:i,low:z[12],high:z[13]}:null;});q('zone-legend').replaceChildren();for(const z of zones)if(z){const label=make('span',(patchName(z.index)||'Parte '+(z.index+1))+' ('+noteName(z.low)+'–'+noteName(z.high)+')');label.className='central-zone-chip zone-'+z.index;q('zone-legend').append(label);}if(!zones.some(Boolean))q('zone-legend').append(make('span','Zonas ainda não lidas'));
  for(const [note,r] of keyRects){const a=zones[0]&&note>=zones[0].low&&note<=zones[0].high,b=zones[1]&&note>=zones[1].low&&note<=zones[1].high;r.dataset.baseFill=r.dataset.black==='true'?'#111c24':a&&b?'url(#central-zone-overlap)':a?'#69c7af':b?'#c9849a':'#dae8ee';if(![...pressedKeys].some(k=>k.endsWith(':'+note)))r.setAttribute('fill',r.dataset.baseFill);}}
 for(let i=0;i<4;i++){const card=make('div'),head=make('div'),name=make('b','Parte '+(i+1)),out=make('output','—'),input=make('input'),mute=make('button','Mudo'),meta=make('small','Sem leitura');card.className='central-quick-part';head.className='central-quick-part-title';input.type='range';input.min='0';input.max='127';input.value='0';input.dataset.quickPart=String(i);input.setAttribute('aria-label','Volume preparado da parte '+(i+1));input.oninput=()=>{out.textContent=input.value;input.style.setProperty('--level',(Number(input.value)/127*100)+'%');};input.onchange=()=>{stageEdit('part',i,7,Number(input.value));refreshFields();};mute.onclick=()=>{const v=value('part',i,7);if(!Number.isInteger(v))return;if(v>0){lastPositive.set(i,v);stageEdit('part',i,7,0);}else if(lastPositive.has(i))stageEdit('part',i,7,lastPositive.get(i));else{input.focus();message('Ajuste o fader para definir o nível desta parte.');}refreshFields();};head.append(name,out);card.append(head,input,mute,meta);q('quick-parts').append(card);quickInputs.push({name,out,input,mute,meta});}
 function renderPreview(){const box=q('preview-grid');box.replaceChildren();previewCells=[];const numbers=make('div');numbers.className='central-preview-row central-preview-numbers';numbers.append(make('span',''));for(let i=0;i<16;i++)numbers.append(make('span',String(i+1)));box.append(numbers);for(const [index,label] of [[4,'Bateria'],[2,'Baixo'],[1,'Pad'],[3,'Arpejo']]){const row=make('button'),name=make('span',pattern.tracks[index].name);row.className='central-preview-row';row.setAttribute('aria-label','Editar pista '+pattern.tracks[index].name);name.className='central-preview-name';row.append(name);for(let step=0;step<16;step++){const cell=make('span');cell.dataset.step=String(step);cell.className='central-preview-cell'+(pattern.tracks[index].velocities[step]?' is-on':'');previewCells.push(cell);row.append(cell);}row.onclick=()=>{seqTrack=index;seqPage=0;renderSequence();selectPage('sequence');};box.append(row);}q('preview-bpm').value=String(pattern.bpm);}
 q('preview-play').onclick=()=>q('seq-play').click();q('preview-stop').onclick=()=>q('seq-stop').click();q('preview-edit').onclick=()=>selectPage('sequence');q('preview-bpm').onchange=()=>{q('seq-bpm').value=q('preview-bpm').value;q('seq-bpm').onchange();};
 function savePattern(){preferences.centralPattern=pattern;persistNow();}
 function trackFields(){const t=pattern.tracks[seqTrack];q('seq-track').value=String(seqTrack);for(const name of ['name','channel','note','velocity','gate'])q('seq-'+name).value=String(t[name]);q('seq-note-name').textContent='Nota preparada: '+noteName(t.note)+' · canal '+t.channel+'. O timbre deste canal é definido no XPS.';}
 function sequenceControls(){for(const id of ['seq-bpm','seq-steps','seq-preset','seq-clear','seq-name','seq-channel','seq-note','seq-velocity','seq-gate'])q(id).disabled=seqPlaying;for(const [index,b] of seqCells.entries()){b.disabled=seqPlaying;b.classList.toggle('central-current-step',seqPlaying&&Number(b.dataset.step)===seqStep);}for(const b of q('seq-grid').querySelectorAll('[data-track-mute]')){const i=Number(b.dataset.trackMute);b.textContent=seqMutes[i]?'Ouvir':'Mudo';b.disabled=!seqPlaying;}for(const cell of previewCells)cell.classList.toggle('central-current-step',seqPlaying&&Number(cell.dataset.step)===seqStep);updateButtons();}
 function renderSequence(){q('seq-bpm').value=String(pattern.bpm);q('seq-steps').value=String(pattern.steps);seqPage=Math.min(seqPage,pattern.steps/16-1);q('seq-pages').replaceChildren();for(let i=0;i<pattern.steps/16;i++){const b=make('button',(i*16+1)+'–'+(i*16+16));b.classList.toggle('on',i===seqPage);b.onclick=()=>{seqPage=i;renderSequence();};q('seq-pages').append(b);}const grid=q('seq-grid');grid.replaceChildren();seqCells=[];pattern.tracks.forEach((track,i)=>{const row=make('div'),pick=make('button',track.name),mute=make('button','Mudo');row.className='central-seq-row';pick.className='central-track-name';pick.classList.toggle('on',i===seqTrack);pick.onclick=()=>{seqTrack=i;trackFields();renderSequence();};mute.dataset.trackMute=String(i);mute.onclick=()=>call('mutePhraseTrack',i,!seqMutes[i]);row.append(pick,mute);for(let col=seqPage*16;col<(seqPage+1)*16;col++){const b=make('button',track.velocities[col]?noteName(track.notes[col]):'·');b.dataset.step=String(col);b.setAttribute('aria-label',track.name+' passo '+(col+1));b.setAttribute('aria-pressed',String(track.velocities[col]>0));b.className='central-step'+(track.velocities[col]?' central-step-on':'');b.onclick=()=>{if(seqPlaying)return;track.velocities[col]=track.velocities[col]?0:track.velocity;track.notes[col]=track.note;savePattern();renderSequence();};seqCells.push(b);row.append(b);}grid.append(row);});trackFields();renderPreview();sequenceControls();}
 q('seq-track').onchange=()=>{seqTrack=Number(q('seq-track').value);renderSequence();};
 for(const key of ['name','channel','note','velocity','gate'])q('seq-'+key).onchange=()=>{if(seqPlaying)return;const candidate=JSON.parse(JSON.stringify(pattern));candidate.tracks[seqTrack][key]=key==='name'?q('seq-name').value:Number(q('seq-'+key).value);try{pattern=model.pattern(candidate);savePattern();renderSequence();}catch(e){message(e.message);trackFields();}};
 for(const key of ['bpm','steps'])q('seq-'+key).onchange=()=>{if(seqPlaying)return;try{pattern=model.pattern({...pattern,[key]:Number(q('seq-'+key).value)});savePattern();renderSequence();}catch(e){message(e.message);renderSequence();}};
 q('seq-play').onclick=()=>{try{if(!connected||busy||seqPlaying)return;const payload=model.payload(pattern);if(!payload.tracks.some(t=>t.velocities.some(v=>v>0)))throw Error('Programe ao menos uma nota antes de tocar.');call('startPhraseSequence',JSON.stringify(payload));}catch(e){message(e.message);}};q('seq-stop').onclick=()=>call('stopPhraseSequence');
 q('seq-clear').onclick=()=>{if(seqPlaying||!confirm('Limpar todas as notas deste padrão?'))return;for(const t of pattern.tracks)t.velocities.fill(0);savePattern();renderSequence();};
 q('seq-preset').onclick=()=>{if(seqPlaying)return;if(pattern.tracks.some(t=>t.velocities.some(v=>v>0))&&!confirm('Substituir as notas pela base leve?'))return;for(const t of pattern.tracks)t.velocities.fill(0);for(let base=0;base<64;base+=16){for(const k of [0,8])pattern.tracks[4].velocities[base+k]=105;for(const k of [4,12])pattern.tracks[5].velocities[base+k]=90;for(const k of [0,2,4,6,8,10,12,14])pattern.tracks[6].velocities[base+k]=65;}savePattern();renderSequence();message('Base MIDI preparada no canal 10. Escolha um kit de bateria nesse canal antes de tocar.');};
 const prior=window.receive;window.receive=(type,data)=>{if(prior)prior(type,data);
  if(type==='armed'||type==='xpsConnection'){connected=!!data;if(!connected){lastPositive.clear();prepared.clear();expected=null;seqPlaying=false;seqStep=-1;}refreshFields();sequenceControls();}
  if(type==='hardwareBusy'){busy=!!data;refreshFields();}
  if(type==='hardware'||type==='hardwarePhysical'){
   const previous=hw;hw=data||{};
   if(expected){try{if(expected.source===model.editSource(expected.edits,hw)&&model.editsMatch(expected.edits,hw)){for(const e of expected.edits)if(prepared.get(key(e))?.value===e.value)prepared.delete(key(e));message('Os valores lidos correspondem aos ajustes enviados. Confira o som no XPS.');}}catch(e){}expected=null;}
   else if(prepared.size&&model.ready(previous)&&model.ready(hw)){try{if(model.fingerprint(previous)!==model.fingerprint(hw)){lastPositive.clear();prepared=new Map([...prepared].filter(([,e])=>model.isGlobal(e)));message('Performance alterada. Ajustes preparados descartados para não atingir outro som.');}}catch(e){prepared.clear();message('Leitura incompleta. Atualize o teclado antes de preparar novos ajustes.');}}
   refreshFields();
  }
  if(type==='hardwareReset'){lastPositive.clear();hw={};prepared.clear();expected=null;busy=false;refreshFields();}
  if(type==='status')message(data);
  if(type==='phraseState'&&data){seqPlaying=!!data.playing;seqStep=Number.isInteger(data.step)?data.step:-1;if(Array.isArray(data.muted)&&data.muted.length===8)seqMutes=data.muted.map(Boolean);q('seq-status').textContent=String(data.message||'')+(seqPlaying?' · passo '+(seqStep+1)+' / '+pattern.steps:'');sequenceControls();}
  if(type==='phraseError'){message(data);q('seq-status').textContent=String(data);}
  if(type==='midi'&&Array.isArray(data)){const [s,n,v]=data,r=keyRects.get(n);if(r&&((s&240)===128||(s&240)===144)){const key=(s&15)+':'+n;if((s&240)===144&&v>0)pressedKeys.add(key);else pressedKeys.delete(key);const held=[...pressedKeys].some(k=>k.endsWith(':'+n));r.setAttribute('fill',held?'#9aebc6':r.dataset.baseFill||(r.dataset.black==='true'?'#13212b':'#dae8ee'));}}
  if(type==='clear'){pressedKeys.clear();for(const r of keyRects.values())r.setAttribute('fill',r.dataset.baseFill||(r.dataset.black==='true'?'#13212b':'#dae8ee'));}
 };
 doc.addEventListener('graue:scenes-changed',()=>{scenes=(Array.isArray(preferences.centralScenes)?preferences.centralScenes:[]).flatMap(s=>{try{return[model.scene(s)];}catch(_){return[];}}).slice(0,30);renderScenes();});
 doc.addEventListener('graue:live-state',()=>renderScenes());
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden&&seqPlaying)call('stopPhraseSequence');});
 selectPage('overview');renderScenes();renderSequence();renderChords();refreshFields();call('phraseSequenceState');
})();
