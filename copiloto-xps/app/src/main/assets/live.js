(()=>{
const f=id=>document.getElementById(id),lib=window.ToneLibrary;let hw={},prepared=null;
const native=(name,...a)=>{if(window.Native)window.Native[name](...a);else f('status').textContent='Requer APK com MIDI USB conectado.';};
const add=(id,label,value)=>{let o=document.createElement('option');o.textContent=label;o.value=value;f(id).append(o);};
for(let i=0;i<16;i++){add('livePart','Parte '+(i+1),i);add('drumChannel','Canal '+(i+1),i+1);}f('livePart').value='0';f('drumChannel').value='10';
Object.entries(lib.families).forEach(([id,name])=>add('liveFamily',name,id));
window.refreshLiveSongs=()=>{f('liveSong').replaceChildren();add('liveSong','Selecionar música…','');songs.forEach((s,i)=>add('liveSong',(s.category||'Sem categoria')+' • '+s.title,i));};window.refreshLiveSongs();
f('liveSong').onchange=()=>{if(f('liveSong').value!=='')select(songs[+f('liveSong').value]);};
f('liveFocus').onclick=()=>{document.body.classList.toggle('live-focus');f('liveFocus').textContent=document.body.classList.contains('live-focus')?'Sair do show':'Modo show ↔';native('showMode',document.body.classList.contains('live-focus'));};
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

function refreshPerformanceQuick(){
 const parts=f('livePartsGrid'),box=f('liveQuickFavorites');
 if(!parts||!box)return;
 parts.replaceChildren();
 const selected=+f('livePart').value,ready=!!hw['setup:0'];
 f('liveConnection').textContent=ready?'Performance lida':'Aguardando leitura MIDI';
 for(let i=0;i<16;i++){
  const p=hw['part:'+i],b=document.createElement('button');
  const n=document.createElement('strong');n.textContent=String(i+1).padStart(2,'0');
  const label=document.createElement('small');
  const tone=p?lib.list().find(x=>x.msb===p[4]&&x.lsb===p[5]&&x.program===p[6]+1):null;
  label.textContent=p?(tone?tone.name:'Canal '+(p[0]+1)):'Sem leitura';
  b.append(n,label);b.setAttribute('aria-label','Selecionar parte '+(i+1));b.setAttribute('aria-pressed',String(i===selected));
  b.onclick=()=>{f('livePart').value=String(i);f('livePart').onchange();};
  parts.append(b);
 }
 box.replaceChildren();
 const favorites=lib.list().filter(x=>lib.favorites().has(x.code)).slice(0,12);
 if(!favorites.length){const p=document.createElement('p');p.className='muted';p.textContent='Favoritos marcados em Sons aparecem aqui.';box.append(p);return;}
 favorites.forEach(t=>{
  const b=document.createElement('button');b.textContent='★ '+t.name;
  b.onclick=()=>{
   const i=+f('livePart').value;
   if(!window.Native?.selectTone){f('status').textContent='Conecte o XPS-10 via USB-MIDI.';return;}
   window.Native.selectTone(t.msb,t.lsb,t.program,i);
   f('status').textContent='Timbre solicitado: '+t.name+'. Aguarde confirmação pela leitura MIDI.';
  };
  box.append(b);
 });
}
window.refreshPerformanceQuick=refreshPerformanceQuick;
const previousPartChange=f('livePart').onchange;
f('livePart').onchange=()=>{previousPartChange();refreshPerformanceQuick();};
refreshPerformanceQuick();

const prev=window.receive;window.receive=(k,d)=>{prev(k,d);if(k==='hardware')hw=d;if(k==='hardwareReset')hw={};if(k==='armed'){f('liveArm').hidden=true;f('liveArm').disabled=true;}if(k==='hardware'||k==='hardwareReset')refreshPerformanceQuick();};
})();
