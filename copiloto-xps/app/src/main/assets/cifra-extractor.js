/* Cifra Club: parse the score displayed in the user's own WebView session.
   No background crawling, no authentication access, no off-domain requests. */
(function(root){
 'use strict';
 const chord=/^[A-G](?:#|b)?(?:(?:m(?!aj)|maj|M|sus|dim|aug|add|alt|ø|°|º|Δ|7M|4|5|6|7|9|11|13|2|3|\+|-|\(|\)|#|b|\d))*?(?:\/[A-G](?:#|b)?)?$/;
 const sections=/^(?:intro|introdução|primeira|segunda|terceira|quarta|parte|estrofe|pré[- ]?refrão|refrão|ponte|interlúdio|final|outro|solo|instrumental|verso|coro|riff|dedilhado|tab|violão)/i;
 const note=/^(?:tom original|tom|afinação|afinacao|capotraste|capo|ritmo|batida|andamento|observa(?:ção|cao)|notas?|arranjo|dica|pestana|compasso|tocando|versão)\s*:/i;
 const tabline=/^\s*(?:[eE]|[A-Ga-g][#b]?)\s*\|[-~0-9xXhHpPbBrR\\/().*|: ]{7,}$/;
 const trimText=t=>String(t||'').replace(/\u00a0/g,' ').replace(/\r\n?/g,'\n').replace(/[\u200b-\u200d]/g,'');
 const simpleChord=t=>chord.test(String(t||'').replace(/^[|:()]+|[|:()]+$/g,'').trim());
 function chordLine(line){
  const txt=line.trim();if(!txt||txt.length>220||tabline.test(txt))return false;
  const words=txt.split(/\s+/).filter(x=>x!=='|'&&x!==':'&&x!== '||');
  if(!words.length||!words.every(simpleChord))return false;
  return words.length>=2||/\|/.test(txt)||/^\s{2,}\S/.test(line)||/\([^)]*[A-G][^)]*\)/.test(line);
 }
 function labelOf(line){
  let label=line.trim().match(/^\[([^\]]{1,65})\]$/);
  return label&&!simpleChord(label[1])&&sections.test(label[1])?label[1]:'';
 }
 function classify(text){
  const lines=trimText(text).split('\n').map(x=>x.replace(/[ \t]+$/,''));
  const score=[],riffs=[],notes=[],parts=[];let mode='score',lyrics=0,chordCount=0;
  for(const raw of lines){
   const line=raw.trim();
   if(line.length>800)continue;
   if(!line){if(mode==='riffs')riffs.push('');else score.push('');continue;}
   const label=labelOf(line);
   if(label){parts.push(label);mode=/\b(?:riff|tab|dedilhado|solo de guitarra|violão solo)\b/i.test(label)?'riffs':'score';(mode==='riffs'?riffs:score).push(raw);continue;}
   if(note.test(line)){notes.push(line);continue;}
   if(tabline.test(raw)){mode='riffs';riffs.push(raw);continue;}
   if(mode==='riffs'){
    if(chordLine(raw)||/^(?:[A-ZÁÉÍÓÚ].*[a-záéíóú])/.test(line)){mode='score';}
    else{riffs.push(raw);continue;}
   }
   if(chordLine(raw)){chordCount+=(line.match(/[A-G](?:#|b)?\S*/g)||[]).length;score.push(raw);continue;}
   if(/^[\p{L}\p{N}]/u.test(line)||/\[[A-G](?:#|b)?[^\]]*\]/.test(line))lyrics++;
   score.push(raw);
  }
  const main=score.join('\n').replace(/^\s*\n+|\n+\s*$/g,'').slice(0,100000);
  return {text:main,riffs:riffs.join('\n').trim().slice(0,30000),
   notes:notes.join('\n').trim().slice(0,10000),sections:[...new Set(parts)].slice(0,100),
   lyricLines:lyrics,chordLines:chordCount};
 }
 function quality(text){
  const parsed=classify(text);
  const len=parsed.text.length,chords=parsed.chordLines,verses=parsed.lyricLines,sections=parsed.sections.length;
  // A full page navigation section is not a legitimate score.
  if(len<25||len>180000)return -9999;
  const nonScore=/\b(entrar|cadastre-se|assinar|publicidade|compartilhar|explorar cifras)\b/gi;
  const noise=(text.match(nonScore)||[]).length;
  return chords*18+Math.min(verses,90)*2+sections*10+Math.min(len,5000)/80-noise*22-Math.max(0,len-18000)/60;
 }
 function bestSource(doc){
  const selectors=[
   '[data-testid="chord-sheet"]','[data-testid="cifra-content"]','[data-testid*="cifra"]',
   '[class*="cifra_cnt"]','[class*="cifra-content"]','[class*="chord-sheet"]',
   '[class*="chordSheet"]','.cifra','pre','article','main','[role="main"]'
  ];
  const candidates=[],seen=new Set();
  for(const selector of selectors){
   let nodes=[];try{nodes=[...doc.querySelectorAll(selector)].slice(0,35);}catch(e){}
   for(const element of nodes){
    if(!element||seen.has(element))continue;seen.add(element);
    const raw=trimText(element.innerText||element.textContent||'').trim();
    if(raw.length<25||raw.length>180000)continue;
    const kind=selector.includes('pre')||selector.includes('cifra')||selector.includes('chord')?'direct':'fallback';
    const bonus=kind==='direct'?35:0;
    candidates.push({text:raw,score:quality(raw)+bonus,kind});
   }
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]||null;
 }
 function extract(doc,url){
  const loc=String(url||doc.location?.href||'');
  if(!/^https:\/\/(?:[\w-]+\.)*cifraclub\.com\.br\//i.test(loc))
    return {ok:false,error:'Abra a música no site oficial do Cifra Club.'};
  const candidate=bestSource(doc);
  if(!candidate||candidate.score<7)return {ok:false,error:'O site não disponibilizou uma cifra legível nesta página. Confira se abriu uma música e tente de novo.'};
  const parsed=classify(candidate.text);
  if(!parsed.text||parsed.text.length<25||(!parsed.chordLines&&!/\[[A-G](?:#|b)?[^\]]*\]/.test(parsed.text)))return {ok:false,error:'Não encontrei versos suficientes para importar.'};
  const titleElement=doc.querySelector('h1');
  const title=trimText(titleElement?.innerText||titleElement?.textContent||doc.title||'Cifra importada').trim().slice(0,150);
  const artistElement=doc.querySelector('[data-testid="artist-name"],[class*="artist-name"],h2');
  const artist=trimText(artistElement?.innerText||artistElement?.textContent||'').trim().slice(0,100);
  const keyText=parsed.notes+'\n'+trimText(doc.body?.innerText||doc.body?.textContent||'');
  const explicitKey=(keyText.match(/(?:^|\n)\s*(?:tom original|tom)\s*:\s*([A-G](?:#|b)?m?)\b/i)||[])[1]||'';
  return {ok:true,title,artist,key:explicitKey,sourceUrl:loc.split('#')[0].slice(0,500),...parsed,detector:candidate.kind};
 }
 root.GraueCifraExtract=extract;
 if(typeof module!=='undefined')module.exports={extract,classify,chordLine,simpleChord,quality};
})(typeof window==='undefined'?globalThis:window);
