(()=>{
const f=id=>document.getElementById(id),lib=window.ToneLibrary;let hw={},prepared=null;
const native=(name,...a)=>{if(window.Native)window.Native[name](...a);else f('status').textContent='Requer APK com MIDI USB conectado.';};
const add=(id,label,value)=>{let o=document.createElement('option');o.textContent=label;o.value=value;f(id).append(o);};
for(let i=0;i<16;i++){add('livePart','Parte '+(i+1),i);add('drumChannel','Canal '+(i+1),i+1);}f('livePart').value='0';f('drumChannel').value='10';
Object.entries(lib.families).forEach(([id,name])=>add('liveFamily',name,id));
window.refreshLiveSongs=()=>{f('liveSong').replaceChildren();add('liveSong','Selecionar música…','');songs.forEach((s,i)=>add('liveSong',(s.category||'Sem categoria')+' • '+s.title,i));};window.refreshLiveSongs();
f('liveSong').onchange=()=>{if(f('liveSong').value!=='')select(songs[+f('liveSong').value]);};
f('liveFocus').hidden=true;f('liveFocus').disabled=true;f('liveFocus').onclick=null; // A experiência Ao Vivo fica no painel principal, não no legado.
f('liveCifra').onclick=()=>native('openCifra');f('liveUndo').onclick=()=>native('undoHardware');f('livePanic').onclick=()=>native('panic');
f('liveEffects').onclick=()=>f('effectsDrawer').showModal();f('closeEffects').onclick=()=>f('effectsDrawer').close();f('liveSendCC').onclick=()=>{let p=hw['part:'+f('livePart').value];if(!p)return f('status').textContent='Leia o teclado antes de aplicar efeitos nesta parte.';native('cc',p[0]+1,+f('liveCC').value,+f('liveCCValue').value);};
f('liveRead').onclick=()=>native('readHardware');f('liveArm').hidden=true;f('liveArm').disabled=true;f('liveArm').onclick=null;
function part(){let i=+f('livePart').value;f('hardwarePart').value=i;f('hardwarePart').onchange();return i;}
f('livePart').onchange=()=>{part();prepared=null;f('livePrepared').textContent='Escolha um timbre para esta parte.';};
f('liveApplyVolume').onclick=()=>{let p=hw['part:'+f('livePart').value];if(!p)return f('status').textContent='Leia o teclado para conhecer o canal desta parte.';native('cc',p[0]+1,7,+f('liveVolume').value);};
function render(){let q=f('liveSearch').value.toLowerCase(),family=f('liveFamily').value;f('liveToneList').replaceChildren();lib.list().filter(t=>(!family||lib.familyOf(t)===family)&&(!f('liveFavorites').checked||lib.favorites().has(t.code))&&(t.name+' '+t.code).toLowerCase().includes(q)).slice(0,50).forEach(t=>{let b=document.createElement('button');b.textContent=t.code+' • '+t.name;b.onclick=()=>{prepared=t;lib.choose(t);f('livePrepared').textContent='Preparado: '+t.name;};f('liveToneList').append(b);});}
function open(drums){part();prepared=null;f('livePrepared').textContent='Escolha um timbre.';f('liveTarget').textContent='Destino: parte '+(+f('livePart').value+1);if(drums){let p=hw['part:'+f('livePart').value];if(p)f('drumChannel').value=String(p[0]+1);f('liveFamily').value='Dr';f('liveSearch').value='';f('liveFavorites').checked=false;}render();f('toneDrawer').showModal();}
f('liveTones').onclick=()=>open(false);f('liveDrums').onclick=()=>open(true);f('closeDrawer').onclick=()=>f('toneDrawer').close();
for(let id of ['liveFamily','liveFavorites'])f(id).onchange=render;f('liveSearch').oninput=render;
f('liveApplyTone').onclick=()=>{if(!prepared)return;const selectedPart=part();native('selectTone',prepared.msb,prepared.lsb,prepared.program,selectedPart);f('toneDrawer').close();};
const defaults=[['Bumbo',36],['Caixa',38],['Chimbal fechado',42],['Chimbal aberto',46],['Tom grave',45],['Tom agudo',50],['Prato crash',49],['Prato ride',51]];
let notes=Array.isArray(saved.padNotes)&&saved.padNotes.length===8?saved.padNotes:defaults.map(p=>p[1]);notes=notes.map((n,i)=>Number.isInteger(n)&&n>=0&&n<=127?n:defaults[i][1]);
defaults.forEach(([label],i)=>{let b=document.createElement('button');b.textContent=label;b.onpointerdown=e=>{e.preventDefault();native('padHit',+f('drumChannel').value,notes[i],+f('drumVelocity').value);};f('drumPads').append(b);let l=document.createElement('label');l.textContent=label+' • nota MIDI';let input=document.createElement('input');input.type='number';input.min=0;input.max=127;input.value=notes[i];input.onchange=()=>{let n=+input.value;if(!Number.isInteger(n)||n<0||n>127){input.value=notes[i];return;}notes[i]=n;saved.padNotes=notes;persist();};l.append(input);f('padNotes').append(l);});
f('stopPads').onclick=()=>native('stopPads');

// FAVORITE banks are not the sixteen parts of the current Performance.
const stageFavoritePanels=[];
let stageFavoriteBank=Number.isInteger(saved.stageFavoriteBank)&&saved.stageFavoriteBank>=0&&saved.stageFavoriteBank<=9?saved.stageFavoriteBank:0;
window.mountStageFavorites=container=>{
 if(!container)return;
 if(!stageFavoritePanels.includes(container))stageFavoritePanels.push(container);
 refreshPerformanceQuick();
};
function refreshPerformanceQuick(){
 const ready=!!hw['setup:0'];
 f('liveConnection').textContent=ready?'MIDI lido · favoritos pendentes':'Favoritos ainda não lidos';
 for(const container of stageFavoritePanels){
  container.replaceChildren();
  const heading=document.createElement('div');heading.className='stage-favorite-heading';
  const label=document.createElement('label');label.textContent='Banco de favoritos';
  const bank=document.createElement('select');bank.className='stage-favorite-bank';bank.setAttribute('aria-label','Selecionar banco de favoritos de 0 a 9');
  for(let i=0;i<=9;i++){const option=document.createElement('option');option.value=String(i);option.textContent='Banco '+i;bank.append(option);}
  bank.value=String(stageFavoriteBank);
  bank.onchange=()=>{const value=Number(bank.value);if(!Number.isInteger(value)||value<0||value>9)return;stageFavoriteBank=value;saved.stageFavoriteBank=value;persist();refreshPerformanceQuick();};
  label.append(bank);heading.append(label);
  const current=document.createElement('span');current.className='stage-favorite-current';current.textContent='Em uso no XPS: não confirmado';heading.append(current);container.append(heading);
  const grid=document.createElement('div');grid.className='stage-favorite-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','Nove favoritos do banco '+stageFavoriteBank);
  for(let i=1;i<=9;i++){
   const button=document.createElement('button');button.className='stage-favorite-slot';button.disabled=true;
   const number=document.createElement('strong');number.textContent=String(i).padStart(2,'0');
   const name=document.createElement('small');name.textContent='Ainda não lido';
   button.append(number,name);button.setAttribute('aria-label','Favorito '+i+' do banco '+stageFavoriteBank+' ainda não lido');grid.append(button);
  }
  container.append(grid);
  const hint=document.createElement('p');hint.className='muted stage-favorite-hint';hint.textContent='Aguardando a importação dos favoritos físicos do XPS-10. A seleção do banco organiza o painel; nenhum favorito foi acionado no teclado.';container.append(hint);
 }
}
window.mountStageFavorites(f('liveQuickFavorites'));
window.refreshPerformanceQuick=refreshPerformanceQuick;
const previousPartChange=f('livePart').onchange;
f('livePart').onchange=()=>{previousPartChange();refreshPerformanceQuick();};
refreshPerformanceQuick();

const prev=window.receive;window.receive=(k,d)=>{prev(k,d);if(k==='hardware')hw=d;if(k==='hardwareReset')hw={};if(k==='armed'){f('liveArm').hidden=true;f('liveArm').disabled=true;}if(k==='hardware'||k==='hardwareReset')refreshPerformanceQuick();};
})();
