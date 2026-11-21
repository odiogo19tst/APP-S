'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),L=require('../app/src/main/assets/louve-import'),M=require('../app/src/main/assets/music'),parse=require('../app/src/main/assets/import-text'),transpose=require('../app/src/main/assets/cifra-transpose');
const fixture=fs.readFileSync(__dirname+'/fixtures/louve-scale.txt','utf8');const set=L.parse(fixture);
assert.equal(set.items.length,3);assert.equal(set.title,'Culto Louvor e Adoração');
assert.deepEqual(set.items.map(x=>x.key),['C','E','C']);

assert.deepEqual(set.items.map(x=>x.order),[1,2,3],'Original song numbers must be retained');
assert.deepEqual(L.parse(fixture.replace('1. Um Chamado','5. Um Chamado')).items.map(x=>x.order),[5,2,3],'Never synthesize the original numbering');
const imported=[
 {title:set.items[1].title,category:set.title,sourceUrl:set.items[1].sourceUrl,requestedKey:'E',louveEntryId:'entry-1'},
 {title:'Deus do Secreto',category:'Cifra Club',sourceUrl:'https://www.cifraclub.com.br/outro/nao-confundir/',root:0,minor:false},
 {title:set.items[0].title,category:set.title,sourceUrl:set.items[0].sourceUrl,requestedKey:'C',louveEntryId:'entry-0'}
];
assert.deepEqual(L.orderedIndexes(imported,set),[2,0,1],'Scale songs first, exact numeric order, local songs afterward');
assert.deepEqual(L.songMeta(imported[0],set),{order:2,key:'E',title:set.title,index:1});
assert.deepEqual(L.songMeta(imported[2],set),{order:1,key:'C',title:set.title,index:0});
assert.equal(L.songMeta(imported[1],set),null,'Unrelated Cifra Club music never gets a scale number');
const legacy={title:set.items[1].title,category:set.title,sourceUrl:set.items[1].sourceUrl};
assert.equal(L.songMeta(legacy,set).order,2,'Older persisted songs still match the original setlist');
const pending={...set,items:set.items.map((entry,i)=>({...entry,status:i===1?'pending':'done'}))};
assert.equal(L.songMeta(imported[0],pending).order,2,'Pending songs never renumber imported songs');
assert.deepEqual(set.items.map(x=>x.bpm),[162,150,124]);
assert.equal(L.parse(fixture.replace('Tom: C','Tom: F#')).items[0].key,'F#');
assert.equal(set.items[0].artist,'Quatro por Um');assert.equal(set.items[1].title,'Poder Pra Salvar (Mighty to Save)');
assert(set.items[2].sourceUrl.endsWith('#instrument=guitar&key=3'));
for(const url of ['http://www.cifraclub.com.br/x/','https://cifraclub.com.br.evil.com/x/','https://evil.com/x','https://user@cifraclub.com.br/x/'])assert.equal(L.cifraUrl(url),'');
assert.throws(()=>L.parse('1. Música\n Cifra: https://evil.com/'),/HTTPS/);
const score={text:'C  F  G\nLetra de teste original',key:'C',louve:set.items[1]};
const converted=L.prepareScore(score,M,parse,transpose);assert.equal(converted.root,4);assert(converted.text.startsWith('E  A  B'));assert.equal(converted.bpm,150);assert.equal(converted.keyMatched,true);
const unknown=L.prepareScore({...score,key:''},M,parse,transpose);assert(unknown.text.startsWith('C  F  G'));assert.equal(unknown.keyMatched,false);assert(unknown.scoreNotes.includes('Tom pedido: E'));
console.log('Louve: three real setlist entries, metadata, safe URLs, explicit-key transposition and unknown-key preservation passed');

assert.equal(L.cleanScoreText('[Primeira Parte]\nParte 1 de 3\nC  G\nParte de mim\n  Parte 2 de 3\n[Refrão]'),'[Primeira Parte]\nC  G\nParte de mim\n[Refrão]');
