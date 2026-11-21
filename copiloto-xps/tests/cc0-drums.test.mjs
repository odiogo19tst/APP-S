import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const folder=path.resolve('copiloto-xps/app/src/main/assets/drumkits');
let total=0;
for(const bank of [5,6,7])for(let pad=0;pad<8;pad++){
 const filename='cc0_'+bank+'_'+pad+'.wav';
 const b=await fs.readFile(path.join(folder,filename));
 assert(b.length>44&&b.length<5*1024*1024,filename+' tamanho inválido');
 assert.equal(b.toString('ascii',0,4),'RIFF',filename+' WAV RIFF');
 assert.equal(b.toString('ascii',8,12),'WAVE',filename+' WAV válido');
 total+=b.length;
}
const license=await fs.readFile(path.join(folder,'SAMPLES-LICENSE.txt'),'utf8');
assert(license.includes('Creative Commons Zero CC0 1.0'));
const java=await fs.readFile('copiloto-xps/app/src/main/java/br/com/doapps/grauelive/PadSampleEngine.java','utf8');
assert(java.includes('BANKS=8, PADS=8'));
assert(java.includes('ctx.getAssets().open("drumkits/cc0_"+b+"_"+p+".wav")'));
assert(java.includes('source",custom?"importado":bundled?"CC0"'));
const js=await fs.readFile('copiloto-xps/app/src/main/assets/drumpads.js','utf8');
for(const n of ['value="5"','value="6"','value="7"'])assert(js.includes(n),n+' no seletor');
assert(js.includes("sampleBank:5")||js.includes("?settings.sampleBank:5"));
console.log('OK: 24 samples CC0 empacotados, '+(total/1048576).toFixed(2)+' MiB; Java/JS integrados.');
