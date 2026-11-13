'use strict';
// Full local asset bundle in Chromium. Native is an explicitly simulated bridge:
// validates DOM, routes and dispatched commands, never physical Roland sound.
const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const out=process.env.GRAUE_BROWSER_OUTPUT||path.resolve(__dirname,'../build/browser-audit');
fs.mkdirSync(out,{recursive:true});
const url=pathToFileURL(path.resolve(__dirname,'../app/src/main/assets/index.html')).href;
const notes=[
 {loopId:'song-a',title:'Mesmo nome',chords:['C','F'],bpm:72,beats:4,root:0,text:'C             F\nLetra de teste\n'.repeat(30),category:'Teste A'},
 {loopId:'song-b',title:'Mesmo nome',chords:['D','G'],bpm:90,beats:4,root:2,text:'D             G\nSegunda música',category:'Teste B'}
];
const midiCalls=()=>window.nativeCalls.filter(c=>/^(edit|selectTone|selectPerformance|cc$|loopRecord|loopPlay|padHit|playPadSample|toneLevel|startDrone|startPhrase)/.test(c.method));
async function boot(page,state={songs:notes,scenes:[]}){
 await page.addInitScript(value=>{
  let saved=value;window.nativeCalls=[];
  window.Native=new Proxy({}, {get(_o,method){if(method==='load')return ()=>JSON.stringify(saved);if(method==='save')return text=>{saved=JSON.parse(text);window.lastSaved=saved;};return (...args)=>{window.nativeCalls.push({method,args});};}});
 },state);
 await page.goto(url);await page.waitForSelector('#gx-shell');
 await page.waitForFunction(()=>!!window.GraueSoundWorkspace&&!!document.getElementById('loop-import'));
}
async function tab(page,key){if(['coach','backups','settings'].includes(key))await page.locator('#gx-more-menu').evaluate(n=>n.open=true);await page.locator('[data-gx-tab="'+key+'"]').click();}
async function editor(page,key){await tab(page,'sound');await page.locator('#central-existing-editors').evaluate(n=>n.open=true);await page.locator('.gx-sound-chooser').evaluate(n=>n.open=true);await page.locator('[data-gx-sound="'+key+'"]').click();}
async function noOverflow(page,label){const value=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(value.scroll<=value.width+2,label+': horizontal overflow '+JSON.stringify(value));}
async function run(){
 const executable=process.env.GRAUE_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],results=[];
 try{
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1366,height:900}]){
   const page=await browser.newPage({viewport:size});page.on('pageerror',e=>errors.push(size.width+': '+e.stack));
   await boot(page);await noOverflow(page,'stage '+size.width);
   assert.equal(await page.locator('[data-gx-screen].on').count(),1);
   const initial=await page.evaluate(midiCalls);assert.equal(initial.length,0,'Startup must be passive');
   for(const key of ['repertoire','sound','drums','coach','backups','settings','stage']){await tab(page,key);await noOverflow(page,key+' '+size.width);}
   for(const [route,expected] of [['effects','effects'],['split','mix'],['arpeggio','rhythm']]){
    await editor(page,route);assert(await page.locator('#sound-page-'+expected).isVisible());
    assert(await page.locator('#hardwarePart').isVisible());assert(await page.locator('#readHardware').isVisible());await noOverflow(page,'editor '+route+' '+size.width);
    await page.screenshot({path:path.join(out,size.width+'-'+route+'.png'),fullPage:true});await page.locator('#gx-return').click();
   }
   assert.equal((await page.evaluate(midiCalls)).length,0,'Navigation may not send MIDI');
   // Same-title save, favorite and rename must affect only the chosen identity.
   await tab(page,'repertoire');await page.locator('.gx-song-pick').nth(1).click();
   await page.locator('#gx-up').evaluate(n=>n.click());await page.locator('.gx-repertoire-preparation').evaluate(n=>n.open=true);await page.locator('#gx-save-cifra').click();
   let saved=await page.evaluate(()=>window.lastSaved);assert.equal(saved.songs.length,2);assert.equal(saved.songs[0].root,0);assert.equal(saved.songs[1].root,3);
   await page.locator('.gx-song-star').nth(1).click();saved=await page.evaluate(()=>window.lastSaved);assert.deepEqual(saved.songFavorites,['song-b']);
   await page.locator('#gx-add-song').click();assert.equal(await page.locator('#title').inputValue(),'Nova música');
   await page.locator('#title').fill('Terceira música');await page.locator('#saveSong').click();
   saved=await page.evaluate(()=>window.lastSaved);assert.equal(saved.songs.length,3);assert.equal(saved.songs[1].title,'Mesmo nome');
   await page.locator('#title').fill('Terceira renomeada');await page.locator('#saveSong').click();
   saved=await page.evaluate(()=>window.lastSaved);assert.equal(saved.songs.length,3);assert.equal(saved.songs[2].title,'Terceira renomeada');
   await page.locator('#gx-return').click();await tab(page,'stage');assert.equal(await page.locator('#gx-transpose').innerText(),'0','New song must not inherit the previous transposition display');
   // Modal tools and live mode are reversible and leave one visible page.
   await page.locator('.gx-stage-tool-grid button').first().click();assert(await page.locator('.gx-tool-dialog').isVisible());await page.keyboard.press('Escape');
   await page.locator('#gx-show-mode').click();assert.equal(await page.locator('#gx-show-mode').getAttribute('aria-pressed'),'true');await page.screenshot({path:path.join(out,size.width+'-live.png'),fullPage:true});await noOverflow(page,'live '+size.width);await page.locator('[data-gx-tab="sound"]').evaluate(n=>n.click());assert(await page.locator('[data-gx-screen="stage"]').evaluate(n=>n.classList.contains('on')));await page.locator('#gx-show-mode').click();
   await page.evaluate(()=>{window.auditLiveEvents=0;document.addEventListener('graue:live-state',()=>window.auditLiveEvents++);});
   await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.auditLiveEvents),0,'Idle stage must not rebroadcast unchanged state');
   // Inject a readback fixture to exercise actual handlers and MFX draft lifetime.
   await page.evaluate(()=>{
    const hw={'setup:0':Array(80).fill(0),'common:0':Array(80).fill(0),'chorus:0':Array(100).fill(0),'reverb:0':Array(100).fill(0),completeBlocks:56,availableBlocks:56,validSysexPackets:56,readAt:Date.now()};hw['setup:0'][0]=1;hw['setup:0'][18]=64;hw['setup:0'][19]=64;window.auditHardware=hw;
    for(let i=0;i<16;i++){const p=Array(80).fill(0),z=Array(40).fill(0);p[0]=i;p[1]=1;p[4]=87;p[5]=64;p[7]=100;p[21]=64;z[1]=1;z[13]=127;hw['part:'+i]=p;hw['zone:'+i]=z;}
    for(let i=0;i<3;i++){const b=Array(160).fill(0);b[0]=1;for(let n=17;n<b.length;n+=4)b[n]=8;hw['mfx:'+i]=b;}
    window.receive('xpsConnection',true);window.receive('armed',true);window.receive('hardware',hw);
   });
   await editor(page,'effects');await page.locator('.sound-flow-details').evaluate(n=>n.open=true);
   const input=page.locator('#mfxParameters input').first();assert(await input.count());
   await input.fill('1');await page.evaluate(()=>window.receive('hardwareBusy',true));assert.equal(await input.inputValue(),'1','Busy may not erase a prepared MFX value');
   await page.evaluate(()=>window.receive('hardwareBusy',false));
   await page.locator('#mfxParameters button').first().click();const sent=(await page.evaluate(midiCalls)).at(-1);assert.equal(sent.method,'editHardware');assert.equal(JSON.parse(sent.args[0])[0].section,'mfxparam');
   await page.evaluate(()=>window.receive('status','Não foi possível confirmar todos os valores enviados.'));assert.match(await page.locator('#sound-flow-response').innerText(),/Não foi possível/);
   await page.locator('#gx-return').click();await tab(page,'stage');
   // Cancel destructive loop actions; the exact bridge call requires confirmation.
   await page.evaluate(()=>window.receive('loopState',{playing:false,recording:false,queued:false,track:-1,counts:[2,0,0,0],muted:[false,false,false,false],position:0,bpm:72,beats:4,bars:2,message:'Loop parado'}));
   await page.locator('.gx-loop-options').evaluate(n=>n.open=true);
   page.once('dialog',d=>d.dismiss());await page.locator('#loop-clear-all').click();assert.equal(await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='loopClearAll').length),0);
   page.once('dialog',d=>d.accept());await page.locator('#loop-clear-all').click();assert.equal(await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='loopClearAll').length),1);
   // Real central UI, simulated transport. Drafts must not send prematurely.
   await tab(page,'sound');await page.locator('[data-central-tab="parts"]').click();
   const beforeDraft=(await page.evaluate(midiCalls)).length;
   await page.locator('[data-central-level="0"]').fill('99');await page.locator('[data-central-level="0"]').dispatchEvent('change');assert.equal((await page.evaluate(midiCalls)).length,beforeDraft);
   await page.locator('#central-apply').click();let centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(JSON.parse(centralSent.args[0])[0].value,99);
   await page.evaluate(()=>{window.auditHardware['part:0'][7]=99;window.receive('hardware',window.auditHardware);});assert.match(await page.locator('#central-pending').innerText(),/Nenhum/);
   await page.locator('[data-central-tab="scenes"]').click();await page.locator('#central-scene-name').fill('Verso');await page.locator('#central-scene-save').click();
   assert.equal(await page.evaluate(()=>window.lastSaved.centralScenes.length),1);await page.locator('#central-scenes .central-scene button').first().click();await page.locator('#central-apply').click();centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(JSON.parse(centralSent.args[0]).length,119);await page.locator('#central-discard').click();
   await page.locator('[data-central-tab="sequence"]').click();await page.locator('#central-seq-steps').selectOption('64');await page.locator('#central-seq-grid [aria-label="Bumbo passo 1"]').click();await page.locator('#central-seq-play').click();
   centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(centralSent.method,'startPhraseSequence');const seqPayload=JSON.parse(centralSent.args[0]);assert.equal(seqPayload.tracks.length,8);assert.equal(seqPayload.tracks[4].velocities.length,64);assert.equal(seqPayload.tracks[4].velocities[0],100);
   await page.evaluate(()=>window.receive('phraseState',{playing:true,step:0,muted:Array(8).fill(false),message:'Sequenciador tocando'}));assert(await page.locator('#central-seq-grid [aria-label="Bumbo passo 1"]').isDisabled());await page.locator('#central-seq-stop').click();await page.evaluate(()=>window.receive('phraseState',{playing:false,step:-1,muted:Array(8).fill(false),message:'Sequenciador parado'}));
   await noOverflow(page,'central sequencer '+size.width);await page.screenshot({path:path.join(out,size.width+'-central-sequence.png'),fullPage:true});
   await page.locator('[data-central-tab="system"]').click();assert.equal(await page.locator('.central-limits button:disabled').count(),2);
   await page.locator('[data-central-tab="overview"]').click();await page.locator('#central-chord-buttons button').first().click();assert.equal(await page.evaluate(()=>window.nativeCalls.at(-1).method),'playAssistChord');
   await page.evaluate(()=>{window.receive('midi',[144,60,90]);window.receive('midi',[145,60,80]);window.receive('midi',[128,60,0]);});assert.equal(await page.locator('#central-keys rect[data-note="60"]').getAttribute('fill'),'#9aebc6');await page.evaluate(()=>window.receive('midi',[129,60,0]));assert.notEqual(await page.locator('#central-keys rect[data-note="60"]').getAttribute('fill'),'#9aebc6');
   await noOverflow(page,'central overview '+size.width);await page.screenshot({path:path.join(out,size.width+'-central.png'),fullPage:true});await tab(page,'stage');
   await page.screenshot({path:path.join(out,size.width+'-stage.png'),fullPage:true});
   results.push({viewport:size,pass:true});await page.close();
  }
  // Valid JSON that is not a state object must not break startup.
  for(const value of [null,[],{songs:[null,{title:'Inválida'},...notes],scenes:[null]}]){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.stack));await boot(p,value);if(value?.songs?.includes(null)){const recovery=await p.evaluate(()=>window.lastSaved);assert.equal(recovery.recoverySongs.length,2);assert.equal(recovery.recoveryScenes.length,1);assert.equal(recovery.songs.length,2);}await p.close();}
  assert.deepEqual(errors,[],'Browser runtime errors');
 }catch(e){for(const page of browser.contexts().flatMap(c=>c.pages())){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}throw e;}finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({results,errors},null,2));await browser.close();}
 console.log('Browser audit PASS: 3 viewports, all pages, editor routes, identities, drafts, confirmation and passive idle. Hardware bridge simulated.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
