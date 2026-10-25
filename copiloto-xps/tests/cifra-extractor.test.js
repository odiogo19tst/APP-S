const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../app/src/main');
const extract=require(path.join(root,'assets/cifra-extractor.js'));
const lyrics=require(path.join(root,'assets/cifra-view.js'));
const parse=require(path.join(root,'assets/import-text.js'));
const music=require(path.join(root,'assets/music.js'));
const transpose=require(path.join(root,'assets/cifra-transpose.js'));
const raw=[
 '[Intro]',
 'C     Am    F    G',
 '',
 'Senhor, minha [Am]vida é [F]tua',
 'No silêncio eu Te encontro',
 '',
 'Tom: C',
 'Capotraste: sem capotraste',
 '',
 '[Riff]',
 'e|------0h2-----|',
 'B|---1------1---|',
 '',
 '[Refrão]',
 'F   G   C',
 'A igreja canta em um só coração'
].join('\n');
const main={innerText:raw,textContent:raw};
const heading={innerText:'Música Exemplo',textContent:'Música Exemplo'};
const artist={innerText:'Banda Exemplo'};
const doc={
 title:'Música Exemplo - Cifra Club',
 querySelector(s){if(s==='h1')return heading;if(s.includes('artist-name'))return artist;return null;},
 querySelectorAll(s){if(s==='pre')return [main];if(s==='main')return [{innerText:'Buscar letras. Entrar. Assinar. '+raw}];return [];}
};
const data=extract.extract(doc,'https://www.cifraclub.com.br/cantor/musica/');
assert.equal(data.ok,true,JSON.stringify(data));
assert.equal(data.title,'Música Exemplo');
assert.equal(data.artist,'Banda Exemplo');
assert(data.text.includes('[Intro]')&&data.text.includes('[Refrão]'),'Structure must be preserved');
assert(data.text.includes('Senhor, minha [Am]vida é [F]tua'),'Chord/lyric alignment was erased');
assert(data.riffs.includes('e|------0h2-----|'),'Riff/Tab must be separate');
assert(!data.text.includes('e|------0h2-----|'),'Tab accidentally mixed with lyric display');
assert(data.notes.includes('Tom: C')&&data.notes.includes('Capotraste:'),'Music annotations not extracted');
assert(data.sections.includes('Riff')&&data.sections.includes('Refrão'),'Section labels missing');
const parsed=parse(data.text,music.parse);
assert(parsed.chords.includes('C')&&parsed.chords.includes('Am')&&parsed.chords.includes('F'),'Chords not extracted for progression');
assert(parsed.text.includes('[Refrão]')&&parsed.text.includes('vida'),'Parser must preserve full chart text');
assert.equal(parsed.root,0,'Key should follow chord context');
const shown=lyrics.lyricsOnly(parsed.text,music.parse);
assert(shown.includes('[Refrão]')&&shown.includes('Senhor, minha vida é tua'),'Lyric-only strips wrong labels');
assert(!shown.includes('C     Am    F    G'),'Lyric-only must drop chord-only lines');
const changed=transpose(parsed.text,2,music.parse,music.transpose);
assert(changed.includes('D     Bm    G    A')&&changed.includes('[Bm]vida é [G]tua'),'Transpose of original content must work');
assert(changed.includes('[Refrão]')&&changed.includes('A igreja canta'),'Transpose must not change structure or lyrics');
assert.equal(extract.extract(doc,'https://outro-site.com.br/cantor/verso/').ok,false,'Only Cifra Club current domain');
const java=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/CifraPanel.java'),'utf8');
const native=fs.readFileSync(path.join(root,'java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const app=fs.readFileSync(path.join(root,'assets/app.js'),'utf8');
const ux=fs.readFileSync(path.join(root,'assets/ux-v2.js'),'utf8');
assert(java.includes('cifra-extractor.js')&&java.includes('evaluateJavascript'),'Native WebView must detect automatically');
assert(!java.includes('window.getSelection()'),'User must not manually select the text');
assert(native.includes('cifraPanel.setVisibility(android.view.View.GONE)'),'Browser must return to background');
assert(app.includes('parsed.riffs=')&&app.includes('parsed.sections=')&&app.includes('parsed.scoreNotes='),'Parsed fields must persist');
assert(ux.includes('data-gx-rep="riffs"')&&ux.includes('gx-scroll-toggle')&&ux.includes('gx-transpose-minus'),'Stage must expose tabs, scroll and transpose');
console.log('Grauê Cifra: automatic DOM import, sections, lyrics, riffs, notes, transposition, WebView background and scrolling checks passed');
