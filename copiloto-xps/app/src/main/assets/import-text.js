(function(g){
function parseText(text,parseChord){
 const trimmed=text.trim();if(/^https?:\/\/\S+$/.test(trimmed))throw Error('Recebi apenas um link. Compartilhe ou cole o texto da cifra.');
 if(trimmed.length>200000)throw Error('Texto maior que 200 mil caracteres.');
 let chords=[...text.matchAll(/\[([^\]]+)\]/g)].map(m=>m[1].trim()),title=(text.match(/\{(?:title|t):\s*([^}]+)\}/i)||[])[1]||'Música importada';
 let content=text.replace(/\{[^}]*\}/g,'').replace(/\[[^\]]*\]/g,'');
 if(!chords.length){let lyrics=[];for(let line of text.split(/\r?\n/)){let tokens=line.trim().split(/\s+/).filter(t=>t&&!/^[|:]+$/.test(t));if(tokens.length&&tokens.every(t=>parseChord(t))){chords.push(...tokens);}else lyrics.push(line);}content=lyrics.join('\n');}
 if(!chords.length)throw Error('Não identifiquei acordes. Use ChordPro [C] ou linhas como C Am F G.');
 let invalid=chords.find(c=>!parseChord(c));if(invalid)throw Error('Acorde ainda não suportado: '+invalid+'. Revise antes de importar.');
 let key=text.match(/\{key:\s*([^}]+)\}/i),k=key?parseChord(key[1].trim()):null;
 return {title,chords,beats:4,bpm:72,root:k?k.root:0,minor:k?k.q.startsWith('m')&&!k.q.startsWith('maj'):false,text:content};
}
g.parseSharedCifra=parseText;if(typeof module!=='undefined')module.exports=parseText;
})(typeof window==='undefined'?globalThis:window);
