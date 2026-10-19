(()=>{
const f=id=>document.getElementById(id),names=['Bumbo','Caixa','Chimbal','Chimbal aberto','Tom grave','Tom agudo','Crash','Ride'];
let grid=Array.from({length:8},()=>Array(16).fill(0)),cells=[];
if(Array.isArray(saved.pattern)&&saved.pattern.length===8&&saved.pattern.every(r=>Array.isArray(r)&&r.length===16&&r.every(v=>Number.isInteger(v)&&v>=0&&v<=127)))grid=saved.pattern.map(r=>[...r]);
const invoke=(m,...args)=>window.Native?window.Native[m](...args):f('status').textContent='A batida requer o APK conectado por MIDI.';
function save(){saved.pattern=grid.map(r=>[...r]);persist();}
function render(){let box=f('sequenceGrid');box.replaceChildren();cells=[];names.forEach((name,r)=>{let label=document.createElement('span');label.textContent=name;box.append(label);let row=[];for(let c=0;c<16;c++){let b=document.createElement('button');b.textContent=String(c+1);b.classList.toggle('beat-on',grid[r][c]>0);b.setAttribute('aria-label',name+', passo '+(c+1));b.setAttribute('aria-pressed',grid[r][c]>0?'true':'false');b.onclick=()=>{invoke('stopSequence');grid[r][c]=grid[r][c]?0:100;save();render();};row.push(b);box.append(b);}cells.push(row);});}
f('sequenceStart').onclick=()=>{let bpm=+f('sequenceBpm').value;if(!Number.isInteger(bpm)||bpm<30||bpm>240)return f('status').textContent='Use BPM entre 30 e 240.';let notes=saved.padNotes||[36,38,42,46,45,50,49,51];invoke('startSequence',JSON.stringify({grid,notes,bpm,channel:+f('drumChannel').value}));};
f('sequenceStop').onclick=()=>invoke('stopSequence');
f('sequencePreset').onclick=()=>{invoke('stopSequence');grid=Array.from({length:8},()=>Array(16).fill(0));[0,8].forEach(c=>grid[0][c]=110);[4,12].forEach(c=>grid[1][c]=100);[0,2,4,6,8,10,12,14].forEach(c=>grid[2][c]=75);save();render();};
f('sequenceClear').onclick=()=>{invoke('stopSequence');grid=Array.from({length:8},()=>Array(16).fill(0));save();render();};
let prev=window.receive;window.receive=(k,d)=>{prev(k,d);if(k==='sequenceStep'){cells.forEach(row=>row.forEach((b,c)=>b.classList.toggle('beat-current',c===d)));f('sequenceStatus').textContent=d<0?'Batida parada':'Tocando • passo '+(d+1);}};render();
})();
