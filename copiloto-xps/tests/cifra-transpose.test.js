// Cifra Club -> Grauê: apenas símbolos harmônicos mudam.
const assert=require('node:assert/strict');
const music=require('../app/src/main/assets/music.js');
const transpose=require('../app/src/main/assets/cifra-transpose.js');
const original=`[Intro]
C    Am    F    G
A casa é sua, nós deixamos ela para você
[Am]Senhor, minha [F]fé
| C | G/B | Am | F |
A
`;
const transformed=transpose(original,2,music.parse,music.transpose);
assert(transformed.includes('D    Bm    G    A'),'Linhas de acordes devem transpor');
assert(transformed.includes('[Bm]Senhor, minha [G]fé'),'Cifra ChordPro deve transpor');
assert(transformed.includes('| D | A/C# | Bm | G |'),'Baixos de acordes devem transpor');
assert(transformed.includes('A casa é sua, nós deixamos ela para você'),'Letras devem permanecer');
assert(transformed.includes('[Intro]'),'Marcadores que não são acordes não mudam');
assert(transformed.includes('\nA\n'),'Notas isoladas na letra ficam inalteradas');
assert.equal(transpose(original,0,music.parse,music.transpose),original);
assert.equal(transpose(transformed,-2,music.parse,music.transpose),original,'Round trip');
console.log('Grauê: transposição musical sem alterar letras passou');
