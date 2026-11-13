// Grauê XPS · Transposição de cifras importadas.
// Preserva os textos e as colunas de acordes, inclusive nas introduções e versos.
(function(g){
 'use strict';
 const breaks=/\r\n|\n|\r/;
 function transposeText(text,semitones,parseChord,transposeChord){
  if(typeof text!=='string')return '';
  if(!Number.isInteger(semitones)||semitones===0)return text;
  const isChord=s=>{
   try{return !!s&&!!parseChord(s);}catch(e){return false;}
  };
  const bare=t=>t.replace(/^[|:]+|[|:]+$/g,'');
  const chordsOnly=line=>{
   const words=line.trim().split(/\s+/).filter(Boolean);
   const recognized=words.filter(w=>isChord(bare(w)));
   return recognized.length>0&&words.every(w=>!bare(w)||isChord(bare(w)));
  };
  const countChords=line=>line.trim().split(/\s+/).filter(w=>isChord(bare(w))).length;
  const changeRow=line=>line.replace(/\S+/g,word=>{
   const parts=word.match(/^([|:]*)(.*?)([|:]*)$/);
   return parts&&isChord(parts[2])
    ?parts[1]+transposeChord(parts[2],semitones)+parts[3]:word;
  });
  // [Am]letra e [G/B]letra: ChordPro.
  const chordPro=text.replace(/\[([^\]\r\n]+)\]/g,(whole,tag)=>{
   const chord=tag.trim();
   return isChord(chord)?'['+transposeChord(chord,semitones)+']':whole;
  });
  const parts=chordPro.split(/(\r\n|\n|\r)/);
  const lines=parts.filter((_,i)=>i%2===0);
  const isLyric=line=>!!line&&/[a-záàâãéêíóôõúüç]/i.test(line)
    &&/[a-záàâãéêíóôõúüç]/.test(line)
    &&!chordsOnly(line)
    &&!/^[\s]*\[[^\]]+\][\s]*$/.test(line)
    &&!/^\s*(?:e|B|G|D|A)\|[-0-9x]+/i.test(line);
  const nextNonempty=i=>{
   for(let j=i+1;j<Math.min(lines.length,i+4);j++)if(lines[j].trim())return lines[j];
   return '';
  };
  const labeledContent=line=>{
   // Header + chords on the same line, e.g. "[Intro] G C G C".
   const m=line.match(/^(\s*\[([^\]\r\n]+)\]\s*)(.*)$/);
   if(!m||isChord(m[2].trim())||!m[3].trim())return null;
   return {head:m[1],tail:m[3]};
  };
  const evidence=line=>{
   const labeled=labeledContent(line);
   const target=labeled?labeled.tail:line;
   return chordsOnly(target)&&(countChords(target)>=2||
    /[#b/0-9]/.test(target.trim())||/^\s{2,}[A-G]\b/.test(target));
  };
  return parts.map((piece,k)=>{
   if(k%2)return piece; // preserve CR/LF exactly
   const i=k/2,line=piece,section=labeledContent(line);
   if(section&&chordsOnly(section.tail))return section.head+changeRow(section.tail);
   if(!chordsOnly(line))return line;
   if(countChords(line)>=2)return changeRow(line);
   // Single chord above a lyric: decide by score layout, never by the key label.
   // This also prevents changing a lone "A" at the end of the lyrics.
   if(!isLyric(nextNonempty(i)))return line;
   const markedNearby=lines.slice(Math.max(0,i-12),Math.min(lines.length,i+13))
     .some((other,j)=>Math.max(0,i-12)+j!==i&&evidence(other));
   if(!markedNearby)return line;
   return changeRow(line);
  }).join('');
 }
 g.GraueCifraTranspose=transposeText;
 if(typeof module!=='undefined')module.exports=transposeText;
})(typeof window==='undefined'?globalThis:window);
