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

const igreja=`[Intro] G    C    G    C

[Primeira Parte]

G
Vou falar o que todos
     C/G
Já conseguiam ver
 Em7
Mas eu demorei pra perceber

[Pré-Refrão]

              C#m             B/Eb
Eu estava longe, você estava perto
              E                E9
Eu te rejeitei em troca recebi afeto
              Am
Me senti sozinho, me tornou seu
   G/B
filho
                    C
Fez de mim sua morada e eu disse
     D
És bem-vindo`;
const igrejaUp=transpose(igreja,2,music.parse,music.transpose);
assert(igrejaUp.includes('[Intro] A    D    A    D'),'Acordes colados a [Intro] devem transpor');
assert(igrejaUp.includes('\nA\nVou falar o que todos'),'Acorde solitário acima da letra deve transpor');
assert(igrejaUp.includes('     D/A\nJá conseguiam ver'),'Baixo invertido isolado deve transpor');
assert(igrejaUp.includes('\n F#m7\nMas eu demorei'),'Acorde Em7 isolado deve transpor');
assert(igrejaUp.includes('Ebm             C#/F'),'Colunas da cifra devem manter espaçamento');
assert(igrejaUp.includes('F#9'),'Acordes com 9ª devem transpor');
assert(igrejaUp.includes('Bm\nMe senti sozinho'),'Acordes menores isolados devem transpor');
assert(igrejaUp.includes('A/C#\nfilho'),'Inversões isoladas devem transpor');
assert(igrejaUp.includes('                    D\nFez de mim'),'Acorde simples isolado acima do verso deve transpor');
assert(igrejaUp.includes('     E\nÉs bem-vindo'),'Último acorde deve transpor');
assert(igrejaUp.includes('Eu estava longe, você estava perto'),'Letra da cifra deve permanecer intacta');
assert.equal(transpose(igrejaUp,-2,music.parse,music.transpose),igreja,'A cifra completa deve voltar ao tom original');
const tiny='A\nvida é bela\nsem acordes conhecidos';
assert.equal(transpose(tiny,2,music.parse,music.transpose),tiny,'Uma letra começando com A não pode ser confundida com acorde');
const textWithCRLF='[Intro] G C G C\r\n\r\n[Verso]\r\nG\r\nUm verso da canção\r\nC/G\r\nOutro verso musical';
assert(transpose(textWithCRLF,2,music.parse,music.transpose).includes('[Intro] A D A D\r\n'),'Preservar quebras CRLF');
assert(!transpose(textWithCRLF,2,music.parse,music.transpose).includes('\nG\r\nUm verso'),'Primeiro acorde após [Verso] deve ser transposto');

console.log('Grauê: intro, acordes isolados, inversões e letras transpostos sem perdas');
