const assert=require('node:assert/strict');
const M=require('../app/src/main/assets/music.js');
assert.equal(M.chord([64,67,72]),'C/E');assert.equal(M.chord([60,64,67,71]),'Cmaj7');assert.equal(M.chord([57,60,64,67]),'Am7');
assert.equal(M.transpose('Bbmaj7/D',2),'Cmaj7/E');assert.equal(M.transpose('C',-1),'B');assert.equal(M.parse('garbage'),null);
assert.deepEqual(M.tones('G7'),[7,11,2,5]);assert.equal(M.degree(8,0,false),'cromática');assert.equal(M.degree(8,0,true),'VI');
for(const c of ['C','Fm','Bbmaj7','G7','Am7','Dsus4']){let v=M.voicing(c);assert.deepEqual([...new Set(v.map(M.mod))].sort(),M.tones(c).sort());assert(v.every((n,i)=>!i||n>v[i-1]));}
console.log('Music: chords, inversions, transpose, degrees and voicings passed');
