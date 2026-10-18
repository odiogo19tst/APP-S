(()=>{
let hw={},busy=false;
const field=id=>document.getElementById(id), msg=t=>field('status').textContent=t;
const call=(method,...args)=>{if(window.Native)window.Native[method](...args);else msg('Esta função precisa do APK conectado ao XPS-10.');};
const add=(id,label,value)=>{let o=document.createElement('option');o.textContent=label;o.value=value;field(id).append(o);};
(window.XPS_EFFECTS||[]).forEach((name,i)=>add('mfxType',i+' • '+name,i));
for(let i=0;i<16;i++)add('hardwarePart','Parte '+(i+1),i);
for(let n=0;n<128;n++)for(let id of ['zoneLow','zoneHigh','splitPoint'])add(id,Music.names[n%12]+(Math.floor(n/12)-1)+' • '+n,n);
field('splitPoint').value=60;
const block=(name,index=0)=>hw[name+':'+index];
const selected=()=>+field('hardwarePart').value;
function fill(id,value){field(id).value=value==null?'':value;}
function refresh(){let part=block('part',selected()),z=part?block('zone',part[0]):null;
 let patch=block('patch',selected()),patchName=patch&&part&&part[4]!==86&&part[4]!==120?patch.slice(0,12).map(c=>String.fromCharCode(c)).join('').trim():'';field('partSummary').textContent=part?(patchName?'Timbre lido: '+patchName+' • ':'')+'Canal recebido: '+(part[0]+1)+' • '+(part[1]?'recepção ativa':'recepção desativada')+' • zona do canal '+(part[0]+1):'Parte sem resposta do teclado.';
 fill('patchMsb',part?.[4]);fill('patchLsb',part?.[5]);fill('patchProgram',part?part[6]+1:null);fill('partLevel',part?.[7]);fill('partOctave',part?part[21]-64:null);fill('partMfx',part?.[32]);field('zoneOn').checked=!!z?.[1];fill('zoneLow',z?.[12]);fill('zoneHigh',z?.[13]);
 let fx=block('mfx',+field('mfxUnit').value);['mfxType','mfxDry','mfxChorus','mfxReverb'].forEach((id,i)=>fill(id,fx?.[i]));let ch=block('chorus'),rev=block('reverb');fill('chorusType',ch?.[0]);fill('chorusLevel',ch?.[1]);fill('reverbType',rev?.[0]);fill('reverbLevel',rev?.[1]);buttons();
}
function buttons(){let perform=block('setup')?.[0]===1;for(let id of ['applyTone','applyPart','layerParts','splitParts','applyMfx','applyAmbience'])field(id).disabled=busy||!perform;field('performanceMode').disabled=busy||!block('setup');field('readHardware').disabled=busy;field('undoHardware').disabled=busy;}
const edit=(section,index,offset,value)=>({section,index,offset,value});
function val(id,min=0,max=127){let raw=field(id).value,n=Number(raw);if(raw===''||!Number.isInteger(n)||n<min||n>max)throw Error('Preencha '+id+' entre '+min+' e '+max+'.');return n;}
function requireBlock(name,index=0){let b=block(name,index);if(!b)throw Error('Leia o bloco '+name+' '+(index+1)+' antes de editar.');return b;}
function send(build){try{if(busy)throw Error('Aguarde a operação atual.');if(!field('arm').checked)throw Error('Ative o envio MIDI abaixo para aplicar.');call('editHardware',JSON.stringify(build()));}catch(e){msg(e.message);}}
field('hardwarePart').onchange=refresh;field('mfxUnit').onchange=refresh;
field('readHardware').onclick=()=>call('readHardware');field('undoHardware').onclick=()=>call('undoHardware');field('performanceMode').onclick=()=>send(()=>[edit('setup',0,0,1)]);
field('applyTone').onclick=()=>send(()=>{let i=selected();requireBlock('part',i);return [edit('part',i,4,val('patchMsb')),edit('part',i,5,val('patchLsb')),edit('part',i,6,val('patchProgram',1,128)-1)];});
field('applyPart').onclick=()=>send(()=>{let i=selected(),p=requireBlock('part',i),channel=p[0];requireBlock('zone',channel);let low=val('zoneLow'),high=val('zoneHigh');if(low>high)throw Error('A nota inicial deve ser menor ou igual à final.');return [edit('part',i,4,val('patchMsb')),edit('part',i,5,val('patchLsb')),edit('part',i,6,val('patchProgram',1,128)-1),edit('part',i,7,val('partLevel')),edit('part',i,21,val('partOctave',-3,3)+64),edit('part',i,31,0),edit('part',i,32,val('partMfx',0,2)),edit('zone',channel,1,field('zoneOn').checked?1:0),edit('zone',channel,12,low),edit('zone',channel,13,high)];});
function pair(split){send(()=>{let a=requireBlock('part',0),b=requireBlock('part',1);if(a[0]===b[0])throw Error('As partes 1 e 2 precisam de canais diferentes. Ajuste os canais no teclado.');let point=val('splitPoint',1,127),out=[];[a,b].forEach((p,i)=>{requireBlock('zone',p[0]);out.push(edit('part',i,1,1),edit('zone',p[0],1,1),edit('zone',p[0],12,split&&i===1?point:0),edit('zone',p[0],13,split&&i===0?point-1:127));});return out;});}
field('layerParts').onclick=()=>pair(false);field('splitParts').onclick=()=>pair(true);
field('applyMfx').onclick=()=>send(()=>{let i=val('mfxUnit',0,2);requireBlock('mfx',i);requireBlock('common');return [edit('common',0,48+i,0),edit('mfx',i,0,val('mfxType',0,78)),edit('mfx',i,1,val('mfxDry')),edit('mfx',i,2,val('mfxChorus')),edit('mfx',i,3,val('mfxReverb'))];});
field('applyAmbience').onclick=()=>send(()=>{requireBlock('chorus');requireBlock('reverb');requireBlock('common');return [edit('common',0,51,0),edit('common',0,52,0),edit('chorus',0,0,val('chorusType',0,3)),edit('chorus',0,1,val('chorusLevel')),edit('reverb',0,0,val('reverbType',0,5)),edit('reverb',0,1,val('reverbLevel'))];});
let receive=window.receive;window.receive=(kind,data)=>{receive(kind,data);if(kind==='hardwareReset'){hw={};busy=false;field('hardwareStatus').textContent='Conexão alterada. Faça uma nova leitura.';refresh();}if(kind==='hardwareBusy'){busy=!!data;buttons();}if(kind==='hardware'){hw=data;let count=Object.keys(data).filter(k=>k!== 'readAt').length;field('hardwareStatus').textContent=count+' de 56 blocos recebidos • '+(block('setup')?.[0]===1?'Performance':'modo Performance não confirmado')+' • '+new Date(data.readAt).toLocaleTimeString('pt-BR');refresh();}};refresh();
})();
