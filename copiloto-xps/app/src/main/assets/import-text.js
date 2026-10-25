/* Shared text / Cifra Club score parser.
 * Preserves section labels, lyrics, line spacing and chords for presentation.
 * Only valid chords feed the MIDI progression.
 */
(function(g){
 'use strict';
 function parseText(input,parseChord){
  const text=String(input||'').replace(/\r\n?/g,'\n').replace(/\u00a0/g,' ');
  const trimmed=text.trim();
  if(/^https?:\/\/\S+$/.test(trimmed))throw Error('Abra a cifra no navegador integrado. Um link sozinho não contém a música.');
  if(trimmed.length>200000)throw Error('Cifra maior que 200 mil caracteres.');
  const metadata={title:(text.match(/\{(?:title|t):\s*([^}]+)\}/i)||[])[1]||'Música importada',
   key:(text.match(/\{(?:key|tom):\s*([^}]+)\}/i)||[])[1]||''};
  const cleaned=text.replace(/\{(?:title|t|key|tom):\s*[^}]+\}\n?/gi,'').trim();
  const chords=[];
  function normalizeToken(t){return t.trim().replace(/^[|:()]+|[|:()]+$/g,'');}
  // Inline chord names in ChordPro brackets. [Refrão] is a heading, not a chord.
  for(const hit of cleaned.matchAll(/\[([^\]\n]+)\]/g)){
   const ch=hit[1].trim();if(parseChord(ch))chords.push(ch);
  }
  // Lines of chords often alternate with lyrics; preserve every line for the reader.
  for(const raw of cleaned.split('\n')){
   if(!raw.trim()||/^[ \t]*\[[^\]]+\][ \t]*$/.test(raw))continue;
   let tokens=raw.trim().split(/\s+/).map(normalizeToken).filter(Boolean);
   if(!tokens.length||tokens.length>90)continue;
   const valid=tokens.filter(t=>parseChord(t));
   if(valid.length===tokens.length&&(tokens.length>=2||/[|:]/.test(raw)||/^\s{2,}/.test(raw))){
    chords.push(...valid);
   }
  }
  if(!chords.length)throw Error('Acordes não identificados nesta versão. Confira o formato da cifra.');
  const key=parseChord(metadata.key)||parseChord(chords[0]);
  return {title:metadata.title,chords:chords.slice(0,2000),beats:4,bpm:72,
   root:key?key.root:0,minor:key?key.q.startsWith('m')&&!key.q.startsWith('maj'):false,text:cleaned};
 }
 g.parseSharedCifra=parseText;
 if(typeof module!=='undefined')module.exports=parseText;
})(typeof window==='undefined'?globalThis:window);
