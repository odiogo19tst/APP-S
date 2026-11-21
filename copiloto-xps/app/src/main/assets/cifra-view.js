/* Keep heading labels and verse text; remove only recognized chord tokens. */
(function(root){
 'use strict';
 function lyricsOnly(raw,parseChord){
  return String(raw||'').split(/\r?\n/).filter(line=>{
   const t=line.trim();
   if(!t)return true;
   if(/^\[[^\]]+\]$/.test(t))return true; // section
   const tokens=t.split(/\s+/).map(v=>v.replace(/^[|:()]+|[|:()]+$/g,'')).filter(Boolean);
   if(tokens.length>=2&&tokens.every(x=>parseChord(x)))return false;
   if(tokens.length===1&&/[|:]/.test(t)&&parseChord(tokens[0]))return false;
   return true;
  }).map(line=>line.replace(/\[([^\]]+)\]/g,(whole,inside)=>parseChord(inside.trim())?'':whole)).join('\n').trim();
 }
 root.GraueCifraView={lyricsOnly};
 if(typeof module!=='undefined')module.exports={lyricsOnly};
})(typeof window==='undefined'?globalThis:window);
