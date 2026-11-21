(function(g){
const names=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
const mod=n=>(n%12+12)%12;
function parse(s){let m=s.trim().match(/^([A-G])([#b]?)(maj7|maj9|7M|m7b5|m7\(b5\)|m9|m11|m6|m7|m|dim7|dim|aug|sus2|sus4|7sus4|add9|6|7|9|11|13)?(?:\/([A-G][#b]?))?$/);if(!m)return null;let root=mod({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]]+(m[2]==='#'?1:m[2]==='b'?-1:0));return {root,q:({'7M':'maj7','m7(b5)':'m7b5'}[m[3]]||m[3]||''),bass:m[4]||''};}
const shapes={maj9:[0,4,7,11,2],m9:[0,3,7,10,2],m11:[0,3,7,10,2,5],m6:[0,3,7,9],m7b5:[0,3,6,10],dim7:[0,3,6,9],aug:[0,4,8],6:[0,4,7,9],9:[0,4,7,10,2],11:[0,4,7,10,2,5],13:[0,4,7,10,2,9],'7sus4':[0,5,7,10],'':[0,4,7],m:[0,3,7],7:[0,4,7,10],maj7:[0,4,7,11],m7:[0,3,7,10],dim:[0,3,6],sus2:[0,2,7],sus4:[0,5,7],add9:[0,2,4,7]};
function tones(s){let c=parse(s);return c?shapes[c.q].map(x=>mod(x+c.root)):[];}
function transpose(s,n){let c=parse(s);return c?names[mod(c.root+n)]+c.q+(c.bass?'/'+names[mod(parse(c.bass).root+n)]:''):s;}
function chord(notes){let sorted=[...new Set(notes)].sort((a,b)=>a-b),pcs=[...new Set(sorted.map(mod))];if(pcs.length<3)return pcs.map(x=>names[x]).join(' · ')||'—';for(let r of pcs)for(let q of ['maj7','m7','7','add9','','m','dim','sus2','sus4']){let ts=shapes[q].map(x=>mod(x+r));if(ts.length===pcs.length&&ts.every(x=>pcs.includes(x)))return names[r]+q+(mod(sorted[0])!==r?'/'+names[mod(sorted[0])]:'');}return pcs.map(x=>names[x]).join(' · ');}
function degree(pc,root,minor){let scale=minor?[0,2,3,5,7,8,10]:[0,2,4,5,7,9,11];let i=scale.indexOf(mod(pc-root));return i<0?'cromática':['I','II','III','IV','V','VI','VII'][i];}
function borrow(root,minor){return minor?names[mod(root+5)]+' maior (IV dórico): experimente a sexta maior.':names[mod(root+5)]+'m (iv emprestado do menor): resolva em '+names[root]+'. Use como alternativa combinada com a banda.';}
function voicing(s,previous=[60,64,67]){let t=tones(s);if(!t.length)return [];let best=null,cost=Infinity;for(let base=48;base<=72;base++)for(let inv=0;inv<t.length;inv++){let x=t.slice(inv).concat(t.slice(0,inv)).map(n=>base+mod(n-base));for(let k=1;k<x.length;k++)while(x[k]<=x[k-1])x[k]+=12;let c=x.reduce((v,n,i)=>v+Math.abs(n-previous[Math.min(i,previous.length-1)]),0);if(c<cost){cost=c;best=x;}}return best;}
g.Music={names,mod,parse,tones,transpose,chord,degree,borrow,voicing};if(typeof module!=='undefined')module.exports=g.Music;
})(typeof window==='undefined'?globalThis:window);
