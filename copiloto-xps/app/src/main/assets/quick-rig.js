'use strict';
(function(scope){
 const integer=(n,lo,hi)=>Number.isInteger(n)&&n>=lo&&n<=hi;
 function tone(value){
  if(!value||typeof value!=='object'||typeof value.code!=='string'||!value.code||value.code.length>30||
     typeof value.name!=='string'||!value.name.trim()||value.name.length>100||
     !integer(value.msb,0,127)||!integer(value.lsb,0,127)||!integer(value.program,1,128))throw Error('Escolha dois timbres válidos da biblioteca.');
  return {code:value.code,name:value.name,msb:value.msb,lsb:value.lsb,program:value.program,category:String(value.category||'').slice(0,30)};
 }
 function normalize(value){
  if(!value||!['dual','split'].includes(value.mode))throw Error('Modo Dual/Split inválido.');
  const main=tone(value.main),second=tone(value.second);
  const volumeMain=value.volumeMain,volumeSecond=value.volumeSecond,point=value.point;
  if(!integer(volumeMain,0,127)||!integer(volumeSecond,0,127)||!integer(point,1,127))
   throw Error('Verifique volumes de 0–127 e nota de divisão de 1–127.');
  return {mode:value.mode,main,second,volumeMain,volumeSecond,point};
 }
 function plan(hw,raw){
  const rig=normalize(raw);
  if(!hw||!Array.isArray(hw['setup:0'])||hw['setup:0'][0]!==1||!(hw.validSysexPackets>0))
   throw Error('Para montar Dual/Split, conecte e leia uma Performance real do XPS-10.');
  const p=[hw['part:0'],hw['part:1']];
  for(let i=0;i<2;i++){
   if(!Array.isArray(p[i])||p[i].length<8||!integer(p[i][0],0,15)||!integer(p[i][1],0,1))
    throw Error('Leia as Partes 1 e 2 antes de aplicar Dual/Split.');
  }
  if(p[0][0]===p[1][0])throw Error('As Partes 1 e 2 usam o mesmo canal MIDI. Corrija no teclado.');
  const zones=p.map((part)=>hw['zone:'+part[0]]);
  if(zones.some(z=>!Array.isArray(z)||z.length<14||!integer(z[1],0,1)||!integer(z[12],0,127)||!integer(z[13],0,127)))
   throw Error('Leia as zonas MIDI das Partes 1 e 2 antes de aplicar.');
  // A zone belongs to a MIDI channel. Do not change another active part sharing that channel.
  for(let i=2;i<16;i++){
   const other=hw['part:'+i];
   if(!Array.isArray(other)||!integer(other[0],0,15)||!integer(other[1],0,1))
    throw Error('Leia as 16 partes para verificar canais compartilhados.');
   if(other[1]===1&&(other[0]===p[0][0]||other[0]===p[1][0]))
    throw Error('Outro som usa o canal de uma das partes do Dual/Split. Ajuste os canais primeiro.');
  }
  const edit=(section,index,offset,value)=>({section,index,offset,value});
  const main=rig.main,second=rig.second,tones=[main,second],volumes=[rig.volumeMain,rig.volumeSecond];
  const commands=[];
  for(let i=0;i<2;i++){
   const t=tones[i],ch=p[i][0],low=rig.mode==='split'&&i===1?rig.point:0,high=rig.mode==='split'&&i===0?rig.point-1:127;
   commands.push(edit('part',i,1,1),edit('part',i,4,t.msb),edit('part',i,5,t.lsb),
    edit('part',i,6,t.program-1),edit('part',i,7,volumes[i]),
    edit('zone',ch,1,1),edit('zone',ch,12,low),edit('zone',ch,13,high));
  }
  return commands;
 }
 function label(value){
  const rig=normalize(value);
  return (rig.mode==='split'?'Split':'Dual')+' · '+rig.main.name+' + '+rig.second.name;
 }
 const api={tone,normalize,plan,label};
 if(typeof module!=='undefined')module.exports=api;
 if(scope)scope.GraueQuickRig=api;
})(typeof window!=='undefined'?window:null);
