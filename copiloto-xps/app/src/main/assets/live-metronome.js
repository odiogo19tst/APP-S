(()=>{
'use strict';
const stage=document.querySelector('#gx-shell [data-gx-screen="stage"]')||document.getElementById('stage'), selector=document.getElementById('gx-live-song-select')||document.getElementById('liveSong');
if(!stage||!selector)return;
const style=document.createElement('style');
style.textContent='.graue-metronome{margin:12px 0;padding:12px;border:1px solid #40516b;border-radius:12px;background:#101827;color:#f8fafc}.graue-metronome .metro-head,.graue-metronome .metro-controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.graue-metronome .metro-head{justify-content:space-between}.graue-metronome .metro-lights{display:grid;grid-template-columns:repeat(var(--metro-count,4),minmax(0,1fr));gap:8px;margin:12px 0}.graue-metronome .metro-light{height:34px;border-radius:8px;background:#334155;opacity:.45;transition:background 65ms,opacity 65ms}.graue-metronome .metro-light.first.active{background:#f43f5e;opacity:1;box-shadow:0 0 14px #f43f5e}.graue-metronome .metro-light.other.active{background:#38bdf8;opacity:1;box-shadow:0 0 14px #38bdf8}.graue-metronome input{width:76px}.graue-metronome button{min-width:76px}.graue-metronome small{color:#cbd5e1}';
document.head.append(style);
const panel=document.createElement('section');panel.className='graue-metronome';panel.setAttribute('aria-label','Metrônomo visual');
panel.innerHTML='<div class="metro-head"><strong>Metrônomo visual</strong><small>Vermelho: início · Azul: demais pulsações</small></div><div class="metro-lights" aria-hidden="true"></div><div class="metro-controls"><label>Compasso <select id="metroMeter"><option>2/2</option><option>2/4</option><option>3/4</option><option selected>4/4</option><option>5/4</option><option>6/4</option><option>7/4</option><option>3/8</option><option>5/8</option><option>6/8</option><option>7/8</option><option>9/8</option><option>11/8</option><option>12/8</option><option>15/8</option><option>4/2</option><option>3/2</option></select></label><label>BPM <input id="metroBpm" type="number" min="30" max="240" value="90" inputmode="numeric"></label><button id="metroToggle" type="button">Iniciar</button><button id="metroTap" type="button">Tap tempo</button><button id="metroMute" type="button" aria-pressed="false">🔊 Som ligado</button><small id="metroState" aria-live="polite">Parado · 4/4</small></div>';
const anchor=document.querySelector('#gx-shell .gx-stage-summary')||selector.closest('label');anchor.insertAdjacentElement('afterend',panel);
const meter=panel.querySelector('#metroMeter'),mute=panel.querySelector('#metroMute'),lightsBox=panel.querySelector('.metro-lights');
let muted=false;
mute.addEventListener('click',()=>{muted=!muted;mute.setAttribute('aria-pressed',String(muted));mute.textContent=muted?'🔇 Mudo':'🔊 Som ligado';});
const signature=()=>{const [n,d]=meter.value.split('/').map(Number);return {n,d,compound:d===8&&n>=6&&n%3===0};};
function drawLights(){const {n}=signature();lightsBox.style.setProperty('--metro-count',String(n));lightsBox.replaceChildren();for(let i=0;i<n;i++){const light=document.createElement('span');light.className='metro-light '+(i===0?'first':'other');lightsBox.append(light);}return [...lightsBox.children];}
let lights=drawLights();
function clickMidi(index){if(muted)return;if(!window.Native||typeof window.Native.padHit!=='function')return;try{window.Native.padHit(10,index===0?37:42,index===0?105:65);}catch(_){/* Sem dispositivo: visual continua */}}
const bpm=panel.querySelector('#metroBpm'),toggle=panel.querySelector('#metroToggle'),tap=panel.querySelector('#metroTap'),state=panel.querySelector('#metroState');
let timer=null,beat=0,next=0,taps=[];
function stop(){if(timer!==null)clearTimeout(timer);timer=null;beat=0;lights.forEach(x=>x.classList.remove('active'));toggle.textContent='Iniciar';state.textContent='Parado · '+meter.value;}
function tempo(){let v=Number(bpm.value);return Number.isFinite(v)?Math.max(30,Math.min(240,Math.round(v))):90;}
function tick(){if(timer===null)return;lights.forEach((x,i)=>x.classList.toggle('active',i===beat));const sig=signature();state.textContent='Marcação '+(beat+1)+' / '+sig.n+' · '+tempo()+' BPM';clickMidi(beat);beat=(beat+1)%sig.n;next+=60000/tempo()*(sig.d===8?(sig.compound?1/3:1/2):sig.d===2?2:1);timer=setTimeout(tick,Math.max(0,next-performance.now()));}
function start(){stop();bpm.value=tempo();beat=0;next=performance.now();timer=0;toggle.textContent='Parar';tick();}
meter.addEventListener('change',()=>{lights=drawLights();if(timer!==null)start();else stop();});
toggle.addEventListener('click',()=>timer===null?start():stop());
bpm.addEventListener('change',()=>{bpm.value=tempo();if(timer!==null)start();});
tap.addEventListener('click',()=>{const now=performance.now();taps=taps.filter(t=>now-t<3000);taps.push(now);if(taps.length>=2){const intervals=taps.slice(1).map((t,i)=>t-taps[i]);const avg=intervals.reduce((a,b)=>a+b,0)/intervals.length;bpm.value=Math.max(30,Math.min(240,Math.round(60000/avg)));if(timer!==null)start();}});
function songBpm(){const i=Number(selector.value);if(selector.value===''||!Array.isArray(window.songs))return;const song=window.songs[i];if(!song)return;const sign=String(song.timeSignature??song.meter??song.compasso??'');if([...meter.options].some(o=>o.value===sign)){meter.value=sign;lights=drawLights();}const n=Number(song.bpm??song.tempo);if(Number.isFinite(n)&&n>=30&&n<=240){bpm.value=n;if(timer!==null)start();}}
selector.addEventListener('change',songBpm);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
songBpm();
})();