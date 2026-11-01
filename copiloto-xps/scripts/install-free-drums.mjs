// Installs only explicitly reviewed CC0 WAV one-shots at Android build time.
// Upstream pinned to a commit: Boochi44/free-drum-samples (CC0 1.0).
import fs from 'node:fs/promises';
import path from 'node:path';
const sha='77ba31428a079dd8f17c8e144c1e649ea0a198b3';
const base='https://raw.githubusercontent.com/Boochi44/free-drum-samples/'+sha+'/drum-samples/';
const kits=[
 {bank:5,dir:'03-soulful-vintage',sounds:[
  'kicks/vintage-kick-01.wav','snares/vintage-snare-01.wav',
  'hi-hats/hi-hat-closed-01.wav','claps/vintage-clap-01.wav',
  'percs/perc-low-tom.wav','percs/perc-high-tom.wav',
  'fx/fx-cymbal.wav','open-hats/open-hat-01.wav']},
 {bank:6,dir:'02-bounce',sounds:[
  'kicks/bounce-kick-01.wav','snares/bounce-snare-01.wav',
  'hi-hats/hi-hat-closed-01.wav','claps/clap-01.wav',
  'percs/perc-low-tom.wav','percs/perc-high-tom.wav',
  'fx/fx-cymbal.wav','open-hats/open-hat-01.wav']},
 {bank:7,dir:'01-hard-trap',sounds:[
  'kicks/hard-kick-01.wav','snares/hard-snare-01.wav',
  'hi-hats/hi-hat-closed-01.wav','claps/clap-01.wav',
  'percs/perc-low-tom.wav','percs/perc-cowbell.wav',
  'fx/fx-cymbal.wav','open-hats/open-hat-01.wav']}
];
const output=path.resolve('copiloto-xps/app/src/main/assets/drumkits');
await fs.mkdir(output,{recursive:true});
async function get(url){
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw new Error('HTTP '+response.status);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length<44||bytes.length>5*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')
    throw new Error('Arquivo WAV inesperado: '+url);
   return bytes;
  }catch(error){if(attempt===3)throw error;await new Promise(r=>setTimeout(r,attempt*1500));}
 }
}
let total=0;
for(const kit of kits){
 for(let i=0;i<kit.sounds.length;i++){
  const bytes=await get(base+kit.dir+'/'+kit.sounds[i]);
  const name='cc0_'+kit.bank+'_'+i+'.wav';
  await fs.writeFile(path.join(output,name),bytes);
  total+=bytes.length;
  console.log(name+' — '+Math.round(bytes.length/1024)+' KB');
 }
}
await fs.writeFile(path.join(output,'SAMPLES-LICENSE.txt'),
 'Grauê XPS: 24 free one-shot WAV samples from Boochi44/free-drum-samples.\n'+
 'Source: https://github.com/Boochi44/free-drum-samples\n'+
 'Pinned upstream revision: '+sha+'\n'+
 'License declared by the author: Creative Commons Zero CC0 1.0.\n'+
 'Included sample filenames and folder lineage are defined in scripts/install-free-drums.mjs.\n'+
 'These sounds do not come from Roland XPS-10 or the proprietary app shown in the screenshots.\n');
console.log('CC0 drum banks packaged: '+(total/1048576).toFixed(2)+' MiB.');
