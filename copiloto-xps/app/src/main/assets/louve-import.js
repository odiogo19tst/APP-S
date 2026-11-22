/* User-initiated LouveApp setlist import; URLs remain links until a real score loads. */
(function(g){
'use strict';
function cifraUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&/^(?:m\.|www\.)?cifraclub\.com\.br$/.test(u.hostname)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function parse(input){
 const text=String(input||'').replace(/\r\n?/g,'\n');if(text.length>200000)throw Error('Escala maior que o limite.');
 const title=(text.split('\n').find(x=>x.trim())||'Escala LouveApp').replace(/^\*+|\*+$/g,'').trim().slice(0,150);
 const dateLine=(text.split('\n').find(x=>/^\s*📅\s*/u.test(x))||'').replace(/^\s*📅\s*/u,'').trim().slice(0,120);
 const items=[];let item=null;
 for(const line of text.split('\n')){
  const heading=line.match(/^\s*(\d+)[.)]\s+(.+?)(?:\s+[—–]\s+(.+))?\s*$/);
  if(heading){if(items.length>=50)throw Error('Importe até 50 músicas por escala.');item={id:'entry-'+items.length,order:Number(heading[1]),title:heading[2].trim().slice(0,150),artist:(heading[3]||'').trim().slice(0,100),category:title,key:'',bpm:72,sourceUrl:'',youtubeUrl:'',lyricsUrl:'',audioUrl:''};items.push(item);continue;}
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
 return {title,dateLine,items};
}
function prepareScore(data,M,parseScore,transposeText){
 const parsed=parseScore(data.text,M.parse),meta=data.louve||{};
 const sourceKey=M.parse(String(data.key||'')),requested=M.parse(String(meta.key||''));
 if(sourceKey){parsed.root=sourceKey.root;parsed.minor=sourceKey.q.startsWith('m')&&!sourceKey.q.startsWith('maj');}
 if(sourceKey&&requested){const shift=M.mod(requested.root-sourceKey.root);parsed.chords=parsed.chords.map(c=>M.transpose(c,shift));parsed.text=transposeText(parsed.text,shift,M.parse,M.transpose);parsed.root=requested.root;parsed.minor=requested.q.startsWith('m')&&!requested.q.startsWith('maj');}
 return {...parsed,title:meta.title||data.title||parsed.title,artist:meta.artist||data.artist||'',category:meta.category||'LouveApp',bpm:meta.bpm||72,sourceUrl:meta.sourceUrl||data.sourceUrl,youtubeUrl:meta.youtubeUrl||'',lyricsUrl:meta.lyricsUrl||'',audioUrl:meta.audioUrl||'',requestedKey:meta.key||'',louveOrder:Number.isInteger(meta.order)&&meta.order>0?meta.order:null,louveEntryId:String(meta.id||'').slice(0,40),sourceKey:String(data.key||''),keyMatched:!!(sourceKey&&requested),riffs:data.riffs||'',scoreNotes:[data.notes||'',!sourceKey&&meta.key?'Tom pedido: '+meta.key+'. Confira o tom da fonte antes de transpor.':''].filter(Boolean).join('\n'),sections:data.sections||[]};
}

/** Match current LouveApp scale entries to imported songs without reassigning
 * an unrelated song merely because it has the same title. */
function songMeta(song,set){
 if(!song||!set||!Array.isArray(set.items)||!set.items.length||song.category!==String(set.title||'').slice(0,60))return null;
 const items=set.items;
 const src=String(song.sourceUrl||''),id=String(song.louveEntryId||'');
 let idx=items.findIndex(item=>src&&item.sourceUrl===src&&
   (!id||!item.id||id===item.id));
 if(idx<0&&id)idx=items.findIndex(item=>item.id===id&&item.title===song.title);
 if(idx<0){
  const same=items.map((item,index)=>({item,index})).filter(x=>x.item.title===song.title);
  if(same.length===1)idx=same[0].index;
 }
 if(idx<0)return null;
 const item=items[idx];
 const order=Number.isInteger(item.order)&&item.order>0&&item.order<=999?item.order:idx+1;
 return {order,key:String(item.key||song.requestedKey||'').trim().slice(0,5),title:set.title,index:idx};
}
function orderedIndexes(songs,set){
 return (Array.isArray(songs)?songs:[]).map((s,i)=>({i,meta:songMeta(s,set)}))
  .sort((a,b)=>(a.meta?0:1)-(b.meta?0:1)||
   (a.meta&&b.meta?a.meta.order-b.meta.order:0)||a.i-b.i).map(x=>x.i);
}
function cleanScoreText(text){return String(text||'').split('\n').filter(line=>!/^\s*Parte\s+\d+\s+de\s+\d+\s*$/i.test(line)).join('\n');}

/**
 * Import metadata for every Louve item immediately. A Cifra Club page might be
 * redirected, rate-limited, offline or missing chords; it must not control
 * whether the musician can see their setlist. Keep existing user edits, rigs,
 * notes and already-imported scores. Placeholder chord = stated reference key
 * only (NOT a transcribed musical progression).
 */
function ensureSongs(songs,set,Music,normalizeSong){
 if(!Array.isArray(songs)||!set||!Array.isArray(set.items)||typeof normalizeSong!=='function')
  throw Error('Escala ou repertório inválido.');
 const category=String(set.title||'LouveApp').slice(0,60);
 let added=0,reused=0;
 for(const entry of set.items){
  const title=String(entry.title||'').trim().slice(0,150);
  const url=String(entry.sourceUrl||'');
  const id=String(entry.id||'').slice(0,40);
  let at=songs.findIndex(song=>song&&song.category===category&&
   ((url&&song.sourceUrl===url)||(id&&song.louveEntryId===id&&song.title===title)));
  if(at>=0){
   // A new paste must not erase annotations, downloaded score, saved rig or favorites.
   const song=songs[at];
   if(!song.sourceUrl&&url)song.sourceUrl=url;
   if(!song.youtubeUrl&&entry.youtubeUrl)song.youtubeUrl=entry.youtubeUrl;
   if(!song.lyricsUrl&&entry.lyricsUrl)song.lyricsUrl=entry.lyricsUrl;
   if(!song.audioUrl&&entry.audioUrl)song.audioUrl=entry.audioUrl;
   song.requestedKey=String(entry.key||song.requestedKey||'').slice(0,5);
   song.louveOrder=entry.order;
   song.louveEntryId=id;
   reused++;
   continue;
  }
  const requested=String(entry.key||'').trim();
  const parsed=Music.parse(requested);
  const reference=parsed?requested:'C';
  const detected=parsed||Music.parse('C');
  songs.push(normalizeSong({
   title,artist:entry.artist,category,sourceUrl:url,youtubeUrl:entry.youtubeUrl,
   lyricsUrl:entry.lyricsUrl,audioUrl:entry.audioUrl,louveEntryId:id,louveOrder:entry.order,
   requestedKey:requested,sourceKey:'',keyMatched:false,
   chords:[reference],root:detected.root,
   minor:detected.q.startsWith('m')&&!detected.q.startsWith('maj'),
   beats:4,bpm:entry.bpm,text:'',riffs:'',sections:[],
   scoreNotes:'Cifra ainda não carregada. O acorde exibido representa somente o tom de referência do LouveApp; não é a harmonia da música. Tente importar a cifra novamente.'
  }));
  added++;
 }
 return {added,reused,total:set.items.length};
}

const api={parse,cifraUrl,prepareScore,songMeta,orderedIndexes,cleanScoreText,ensureSongs};g.GraueLouve=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
