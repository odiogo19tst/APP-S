(()=>{
const f=id=>document.getElementById(id);let hw={},busy=false;
const invoke=(name,...a)=>window.Native?window.Native[name](...a):f('status').textContent='Requer APK conectado ao teclado.';
function send(items){if(busy)return f('status').textContent='Aguarde a operação atual.';invoke('editHardware',JSON.stringify(items));}
const edit=(section,index,offset,value)=>({section,index,offset,value});
function field(id,label,value,min,max){let l=document.createElement('label');l.textContent=label;let n=document.createElement('input');n.id=id;n.type='number';n.min=min;n.max=max;n.value=value;l.append(n);return l;}
function number(id,min,max){let value=Number(f(id).value);if(f(id).value===''||!Number.isInteger(value)||value<min||value>max)throw Error('Valor inválido: '+id);return value;}
function renderMfx(){let unit=+f('mfxUnit').value,b=hw['mfx:'+unit],box=f('mfxParameters');box.replaceChildren();if(!b){f('mfxDetailStatus').textContent='Leia o teclado para carregar os parâmetros.';return;}let type=b[0],params=window.XPS_MFX_PARAMS[type]||[];f('mfxDetailStatus').textContent=(window.XPS_EFFECTS[type]||type)+' • '+params.length+' parâmetros lidos. Troque o tipo antes de editar. Valores sem unidade são índices do parâmetro.';
 for(let p of params){let offset=17+p.parameter*4,raw=b.slice(offset,offset+4).reduce((a,v)=>a*16+v,0),l=document.createElement('label');l.textContent=p.label;let input=document.createElement(p.labels?'select':'input');if(p.labels){p.labels.forEach((label,i)=>{let o=document.createElement('option');o.value=p.min+i;o.textContent=label;input.append(o);});input.value=raw;}else{input.type='number';input.min=p.min-32768;input.max=p.max-32768;input.value=raw-32768;}let btn=document.createElement('button');btn.textContent='Aplicar';btn.disabled=busy;btn.onclick=()=>{let v=Number(input.value)+(p.labels?0:32768);if(input.value===''||!Number.isInteger(v)||v<p.min||v>p.max)return f('status').textContent='Valor fora da faixa deste efeito.';send([{section:'mfxparam',index:unit,effect:type,offset:p.parameter,value:v}]);};l.append(input,btn);box.append(l);}
}
const shape=[['shapeCutoff','Filtro',17],['shapeRes','Ressonância',18],['shapeAttack','Ataque',19],['shapeRelease','Release',20],['shapeDecay','Decay',33]];
function render(){renderMfx();let p=hw['part:'+f('hardwarePart').value];f('shapeFields').replaceChildren();shape.forEach(([id,label,o])=>f('shapeFields').append(field(id,label+' • 64 neutro',p?p[o]:'',0,127)));
 let setup=hw['setup:0'];for(let [id,o,shift] of [['arpStyle',27,1],['arpOctave',29,-64],['arpAccent',31,0],['rhythmGroup',38,1],['rhythmAccent',39,0],['rhythmVelocity',40,0]])f(id).value=setup?setup[o]+shift:'';
 f('arpEnabled').checked=!!setup?.[25];f('arpHold').checked=!!setup?.[30];f('rhythmEnabled').checked=!!setup?.[33];
 let group=hw['rhythmGroup:0'];f('physicalPads').replaceChildren();for(let i=0;i<6;i++){let offset=21+6*i;f('physicalPads').append(field('physicalPattern'+i,'Pad '+(i+1)+' • padrão 1–256',group?group[offset+2]*16+group[offset+3]+1:'',1,256),field('physicalVelocity'+i,'Pad '+(i+1)+' • intensidade',group?group[offset]:'',1,127));}
}
f('applyShape').onclick=()=>{try{send(shape.map(([id,,o])=>edit('part',+f('hardwarePart').value,o,number(id,0,127))));}catch(e){f('status').textContent=e.message;}};
f('applyArp').onclick=()=>{try{send([edit('setup',0,25,f('arpEnabled').checked?1:0),edit('setup',0,30,f('arpHold').checked?1:0),edit('setup',0,27,number('arpStyle',1,128)-1),edit('setup',0,29,number('arpOctave',-3,3)+64),edit('setup',0,31,number('arpAccent',0,100))]);}catch(e){f('status').textContent=e.message;}};
f('applyRhythm').onclick=()=>{try{send([edit('setup',0,33,f('rhythmEnabled').checked?1:0),edit('setup',0,38,number('rhythmGroup',1,24)-1),edit('setup',0,39,number('rhythmAccent',0,100)),edit('setup',0,40,number('rhythmVelocity',1,127))]);}catch(e){f('status').textContent=e.message;}};
f('applyPhysicalPads').onclick=()=>{try{let out=[];for(let i=0;i<6;i++){let n=number('physicalPattern'+i,1,256)-1,o=21+i*6;out.push(edit('rhythmGroup',0,o,number('physicalVelocity'+i,1,127)),edit('rhythmGroup',0,o+2,n>>4),edit('rhythmGroup',0,o+3,n&15));}send(out);}catch(e){f('status').textContent=e.message;}};
for(let id of ['mfxUnit','hardwarePart']){let prev=f(id).onchange;f(id).onchange=()=>{prev();render();};}
let prev=window.receive;window.receive=(k,d)=>{prev(k,d);if(k==='hardwareBusy'){busy=!!d;renderMfx();}if(k==='hardware')hw=d;if(k==='hardwareReset')hw={};if(k==='hardware'||k==='hardwareReset')render();};render();
})();
