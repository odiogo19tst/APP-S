/* User-initiated LouveApp setlist import; URLs remain links until a real score loads. */
(function(g){
'use strict';
function cifraUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&/^(?:m\.|www\.)?cifraclub\.com\.br$/.test(u.hostname)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function parse(input){
 const text=String(input||'').replace(/\r\n?/g,'\n');if(text.length>200000)throw Error('Escala maior que o limite.');
 const title=(text.split('\n').find(x=>x.trim())||'Escala LouveApp').replace(/^\*+|\*+$/g,'').trim().slice(0,150);
 const items=[];let item=null;
 for(const line of text.split('\n')){
  const heading=line.match(/^\s*\d+[.)]\s+(.+?)(?:\s+[—–]\s+(.+))?\s*$/);
  if(heading){if(items.length>=50)throw Error('Importe até 50 músicas por escala.');item={id:'entry-'+items.length,title:heading[1].trim().slice(0,150),artist:(heading[2]||'').trim().slice(0,100),category:title,key:'',bpm:72,sourceUrl:'',youtubeUrl:'',lyricsUrl:'',audioUrl:''};items.push(item);continue;}
  if(!item)continue;
  const key=line.match(/Tom:\s*([A-G](?:#|b)?m?)(?=\s|[·,;)]|$)/i);if(key)item.key=key[1][0].toUpperCase()+key[1].slice(1);
  const bpm=line.match(/BPM:\s*(\d{1,3})/i);if(bpm&&+bpm[1]>=30&&+bpm[1]<=300)item.bpm=+bpm[1];
  const link=line.match(/https:\/\/\S+/);if(!link)continue;const url=link[0].replace(/[*)]+$/,'');
  if(/Cifra:/i.test(line))item.sourceUrl=cifraUrl(url);
  else if(/Vídeo:/i.test(line))item.youtubeUrl=url;
  else if(/Letra:/i.test(line))item.lyricsUrl=url;
  else if(/Áudio:/i.test(line))item.audioUrl=url;
 }
 if(!items.length)throw Error('Não encontrei músicas numeradas na escala.');
 if(items.some(x=>!x.sourceUrl))throw Error('Cada música precisa de um link HTTPS do Cifra Club.');
 return {title,items};
}
function prepareScore(data,M,parseScore,transposeText){
 const parsed=parseScore(data.text,M.parse),meta=data.louve||{};
 const sourceKey=M.parse(String(data.key||'')),requested=M.parse(String(meta.key||''));
 if(sourceKey){parsed.root=sourceKey.root;parsed.minor=sourceKey.q.startsWith('m')&&!sourceKey.q.startsWith('maj');}
 if(sourceKey&&requested){const shift=M.mod(requested.root-sourceKey.root);parsed.chords=parsed.chords.map(c=>M.transpose(c,shift));parsed.text=transposeText(parsed.text,shift,M.parse,M.transpose);parsed.root=requested.root;parsed.minor=requested.q.startsWith('m')&&!requested.q.startsWith('maj');}
 return {...parsed,title:meta.title||data.title||parsed.title,artist:meta.artist||data.artist||'',category:meta.category||'LouveApp',bpm:meta.bpm||72,sourceUrl:meta.sourceUrl||data.sourceUrl,youtubeUrl:meta.youtubeUrl||'',lyricsUrl:meta.lyricsUrl||'',audioUrl:meta.audioUrl||'',requestedKey:meta.key||'',sourceKey:String(data.key||''),keyMatched:!!(sourceKey&&requested),riffs:data.riffs||'',scoreNotes:[data.notes||'',!sourceKey&&meta.key?'Tom pedido: '+meta.key+'. Confira o tom da fonte antes de transpor.':''].filter(Boolean).join('\n'),sections:data.sections||[]};
}
const api={parse,cifraUrl,prepareScore};g.GraueLouve=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
