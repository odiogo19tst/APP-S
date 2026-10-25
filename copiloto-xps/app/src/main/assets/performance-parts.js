'use strict';
/* Pure snapshot resolver: no MIDI commands, never fabricates missing parts.
   Uses Roland tone catalog bank MSB/LSB + 1-based Program, and an optional
   actual patch name only when the SysEx patch block was returned. */
(function(root){
 const integer=(n,min=0,max=127)=>Number.isInteger(n)&&n>=min&&n<=max;
 const nameFromPatch=p=>Array.isArray(p)&&p.length>=12
  ?p.slice(0,12).map(v=>integer(v,32,126)?String.fromCharCode(v):' ').join('').trim():'';
 function readParts(snapshot,tones){
  const data=snapshot&&typeof snapshot==='object'?snapshot:{};
  const catalog=Array.isArray(tones)?tones:[];
  const byAddress=new Map();
  for(const t of catalog){
   if(t&&integer(t.msb)&&integer(t.lsb)&&integer(t.program,1,128)){
    const key=[t.msb,t.lsb,t.program].join(':');
    if(!byAddress.has(key))byAddress.set(key,t);
   }
  }
  const result=[];
  for(let index=0;index<16;index++){
   const p=data['part:'+index];
   // Partial SysEx is NOT a valid complete part. Don't turn its absent bank into zeros.
   if(!Array.isArray(p)||p.length<8||![0,1,4,5,6,7].every(i=>integer(p[i])))continue;
   const msb=p[4],lsb=p[5],program=p[6]+1,volume=p[7];
   const catalogTone=byAddress.get([msb,lsb,program].join(':'));
   const patchName=nameFromPatch(data['patch:'+index]);
   const name=catalogTone?.name||patchName||'Timbre sem nome confirmado';
   result.push({
    index,part:index+1,channel:p[0]+1,enabled:p[1]!==0,
    msb,lsb,program,volume,code:catalogTone?.code||null,
    name,source:catalogTone?'Catálogo Roland':patchName?'Nome lido por SysEx':'Somente endereço MIDI',
    verified:!!catalogTone||!!patchName
   });
  }
  return result;
 }
 const api={readParts,nameFromPatch};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.GrauePerformanceParts=api;
})(typeof window!=='undefined'?window:undefined);
