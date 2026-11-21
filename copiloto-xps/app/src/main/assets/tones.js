(()=>{
const f=id=>document.getElementById(id),factory=window.XPS_TONES||[];let catalog=[...factory];
const families={Pf:'Piano / E.Piano',Ky:'Órgão / Teclas',St:'Cordas / Guitarra',Bs:'Metais / Baixo',Sy:'Synth / Pad',Wr:'World',Dr:'Bateria / FX',Sp:'Sample',USER:'Usuário'};let family='';
const groups={KEY:'Teclas',BEL:'Sinos',MLT:'Mallets',ACD:'Acordeão',HRM:'Gaita',ORC:'Orquestra',HIT:'Hits',AGT:'Violão',EGT:'Guitarra',DGT:'Guitarra distorcida',BRS:'Metais',SBR:'Metais synth',SAX:'Sax',FLT:'Flauta',WND:'Sopros',BS:'Baixo',SBS:'Baixo synth',HLD:'Hard lead',SLD:'Soft lead',TEK:'Techno',PLS:'Pulsante',FX:'Efeitos',VOX:'Vozes',BPD:'Pad brilhante',ETH:'Étnicos',PLK:'Dedilhados',FRT:'Instrumentos de cordas',PRC:'Percussão',SFX:'Efeitos sonoros',BTS:'Batidas',CMB:'Combinações',PNO:'Piano',EP:'Piano elétrico',ORG:'Órgão',SPD:'Pad',STR:'Cordas',SYN:'Sintetizador',USER:'Usuário do teclado',DRM:'Bateria'};
let favorites=new Set(Array.isArray(saved.toneFavorites)?saved.toneFavorites:[]),onlyFavorites=false;
 // Keep USER tones already read when a later SysEx scan times out or returns only partial results.
 const validUser=t=>t&&/^USER[0-9]{3}$/.test(t.code)&&Number.isInteger(t.msb)&&t.msb>=0&&t.msb<=127&&Number.isInteger(t.lsb)&&t.lsb>=0&&t.lsb<=127&&Number.isInteger(t.program)&&t.program>=1&&t.program<=128;
 const normalizedUsers=items=>[...new Map((Array.isArray(items)?items:[]).filter(validUser).map(t=>[t.code,t])).values()];
 let cache=normalizedUsers(saved.xpsToneCache);if(cache.length)catalog=[...factory,...cache];
 const banks=()=>saved.favoriteBanks&&typeof saved.favoriteBanks==='object'?saved.favoriteBanks:(saved.favoriteBanks={});
 const validPosition=(bank,index)=>Number.isInteger(bank)&&bank>=0&&bank<=9&&Number.isInteger(index)&&index>=0&&index<=9;
 const validTone=t=>t&&typeof t.code==='string'&&t.code.length<=30&&typeof t.name==='string'&&Number.isInteger(t.msb)&&t.msb>=0&&t.msb<=127&&Number.isInteger(t.lsb)&&t.lsb>=0&&t.lsb<=127&&Number.isInteger(t.program)&&t.program>=1&&t.program<=128;
 const favoriteEntry=(bank,index)=>{
  if(!validPosition(bank,index))return null;
  const value=banks()[bank+'-'+index];
  if(!value||typeof value!=='object')return null;
  if(value.type==='performance')return typeof value.user==='boolean'&&Number.isInteger(value.number)&&value.number>=1&&value.number<=(value.user?128:16)
    ?{type:'performance',user:value.user,number:value.number}:null;
  if(value.type==='rig'){try{return {type:'rig',...window.GraueQuickRig.normalize(value)}}catch(_){return null;}}
  return validTone(value)?{type:'tone',code:value.code,name:value.name,msb:value.msb,lsb:value.lsb,program:value.program,category:value.category||'',part:Number.isInteger(value.part)&&value.part>=0&&value.part<16?value.part:0,...(Number.isInteger(value.volume)&&value.volume>=0&&value.volume<=127?{volume:value.volume}:{})}:null;
 };
 const putFavoriteEntry=(bank,index,value)=>{
  if(!validPosition(bank,index))throw Error('Banco ou posição inválida');
  let normalized=null;
  if(value?.type==='performance'){
   if(typeof value.user!=='boolean'||!Number.isInteger(value.number)||value.number<1||value.number>(value.user?128:16))throw Error('Performance inválida');
   normalized={type:'performance',user:value.user,number:value.number};
  }else if(value?.type==='rig'){
   if(!window.GraueQuickRig)throw Error('Editor Dual/Split indisponível.');
   normalized={type:'rig',...window.GraueQuickRig.normalize(value)};
  }else if(value){
   if(!validTone(value))throw Error('Timbre inválido');
   if(value.part!==undefined&&(!Number.isInteger(value.part)||value.part<0||value.part>15))throw Error('Parte inválida');
   if(value.volume!==undefined&&(!Number.isInteger(value.volume)||value.volume<0||value.volume>127))throw Error('Volume do favorito inválido');
   normalized={type:'tone',code:value.code,name:value.name,msb:value.msb,lsb:value.lsb,program:value.program,category:value.category||'',part:value.part??0,...(value.volume!==undefined?{volume:value.volume}:{})};
  }
  const key=bank+'-'+index,store=banks(),old=store[key],existed=Object.prototype.hasOwnProperty.call(store,key);
  if(normalized)store[key]=normalized;else delete store[key];
  try{if(persist()===false)throw Error('O Android não confirmou o salvamento do favorito.');}
  catch(e){if(existed)store[key]=old;else delete store[key];throw e;}
  return true;
 };
 const slot=(bank,index)=>{const entry=favoriteEntry(bank,index);return entry?.type==='tone'?entry:null;};
 const putSlot=(bank,index,t)=>putFavoriteEntry(bank,index,t?{...t,type:'tone'}:null);

const familyOf=t=>t.code.startsWith('USER')?'USER':t.code.slice(0,2);
const choose=t=>{f('patchMsb').value=t.msb;f('patchLsb').value=t.lsb;f('patchProgram').value=t.program;f('selectedTone').textContent='Preparado: '+t.name;};
const label=t=>t.code+' • '+t.name;
const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
for(let cat of [...new Set([...catalog.map(t=>t.category),'USER'])].sort()){let o=document.createElement('option');o.value=cat;o.textContent=groups[cat]||cat;f('toneCategory').append(o);}
window.ToneLibrary={list:()=>catalog,favorites:()=>favorites,choose,familyOf,families,slot,putSlot,favoriteEntry,putFavoriteEntry,banks};
Object.entries(families).forEach(([id,label])=>{let b=document.createElement('button');b.textContent=label;b.onclick=()=>{family=family===id?'':id;f('toneCategory').value='';render();};f('toneFamilies').append(b);});
function persistFavorites(){saved.toneFavorites=[...favorites];persist();}
function render(){let q=norm(f('toneSearch').value),category=f('toneCategory').value;let items=catalog.filter(t=>(!family||familyOf(t)===family)&&(!category||t.category===category)&&(!onlyFavorites||favorites.has(t.code))&&norm(t.name+' '+t.code+' '+(groups[t.category]||t.category)).includes(q));f('toneCount').textContent=items.length+' timbres encontrados • mostrando até 60';f('toneResults').replaceChildren();items.slice(0,60).forEach(t=>{let row=document.createElement('div');row.className='song';let pick=document.createElement('button');pick.textContent=label(t);pick.onclick=()=>{f('patchMsb').value=t.msb;f('patchLsb').value=t.lsb;f('patchProgram').value=t.program;f('selectedTone').textContent='Preparado: '+label(t);f('status').textContent='Timbre preparado para a parte selecionada. Toque em Trocar timbre para enviar.';};let star=document.createElement('button');star.textContent=favorites.has(t.code)?'★':'☆';star.setAttribute('aria-label','Favoritar '+t.name);star.onclick=()=>{favorites.has(t.code)?favorites.delete(t.code):favorites.add(t.code);persistFavorites();render();if(window.refreshPerformanceQuick)window.refreshPerformanceQuick();};row.append(pick,star);f('toneResults').append(row);});}
f('toneSearch').oninput=render;f('toneCategory').onchange=render;f('favoriteTones').onclick=()=>{onlyFavorites=!onlyFavorites;f('favoriteTones').textContent=onlyFavorites?'Mostrar todos':'★ Favoritos';render();};
function currentName(){let t=catalog.find(t=>t.msb===+f('patchMsb').value&&t.lsb===+f('patchLsb').value&&t.program===+f('patchProgram').value);f('selectedTone').textContent=t?'Última leitura: '+label(t):'Timbre personalizado ou sem leitura.';}
let userBusy=false;function userReadButtons(){f('readUserTones').disabled=userBusy;f('cancelHardware').disabled=!userBusy;}userReadButtons();
f('readUserTones').onclick=()=>{if(window.Native)window.Native.readUserTones();};f('cancelHardware').onclick=()=>{if(window.Native)window.Native.cancelHardware();};
let prev=window.receive;window.receive=(k,d)=>{prev(k,d);if(k==='hardwareBusy'){userBusy=!!d;userReadButtons();}if(k==='userReadState'&&d){userBusy=!!d.running;f('userToneStatus').textContent=String(d.message||'');userReadButtons();}if(k==='userTones'){if(Array.isArray(d)){
 const incoming=normalizedUsers(d);
 if(incoming.length){
  // A partial scan must not erase positions saved during a previous valid scan.
  cache=normalizedUsers([...cache,...incoming]);saved.xpsToneCache=cache;persist();catalog=[...factory,...cache];
  f('toneCategory').value='USER';
  f('userToneStatus').textContent=incoming.length+' USER confirmados nesta leitura; '+cache.length+' mantidos no celular (inclui cache anterior).';
 }else f('userToneStatus').textContent='Leitura USER sem dados válidos: último cache preservado.';
 render();
}}if(k==='hardwareReset'){userBusy=false;userReadButtons();f('userToneStatus').textContent='USB desconectado. Timbres USER permanecem no cache; reconecte para tocar.';render();}if(k==='hardware'||k==='hardwareReset')currentName();};let change=f('hardwarePart').onchange;f('hardwarePart').onchange=()=>{change();currentName();};render();
})();
