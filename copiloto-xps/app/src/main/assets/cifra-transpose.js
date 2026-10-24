// Transposição segura do texto das cifras: preserva letras e move apenas símbolos musicais.
(function(g){
 'use strict';
 function transposeText(text,semitones,parseChord,transposeChord){
  if(typeof text!=='string'||!Number.isInteger(semitones)||semitones===0)return text||'';
  let out=text.replace(/\[([^\]]+)\]/g,(whole,token)=>{
   const c=token.trim();return parseChord(c)?'['+transposeChord(c,semitones)+']':whole;
  });
  return out.split(/(\r?\n)/).map(line=>{
   if(!line||/^\r?\n$/.test(line)||!line.trim())return line;
   const tokens=line.trim().split(/\s+/),norm=t=>t.replace(/^[|:]+|[|:]+$/g,'');
   const count=tokens.filter(t=>!!parseChord(norm(t))).length;
   if(count<2||!tokens.every(t=>!norm(t)||!!parseChord(norm(t))))return line;
   return line.replace(/\S+/g,t=>{
    const found=t.match(/^([|:]*)(.*?)([|:]*)$/),body=found&&found[2];
    return body&&parseChord(body)?found[1]+transposeChord(body,semitones)+found[3]:t;
   });
  }).join('');
 }
 g.GraueCifraTranspose=transposeText;
 if(typeof module!=='undefined')module.exports=transposeText;
})(typeof window==='undefined'?globalThis:window);
