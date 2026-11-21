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
async function tab(page,key){if(await page.locator('#central-exit').isVisible()){if(key==='sound')return;await page.locator('#central-exit').click();}if(['coach','backups','settings'].includes(key))await page.locator('#gx-more-menu').evaluate(n=>n.open=true);await page.locator('[data-gx-tab="'+key+'"]').click();}
async function editor(page,key){await tab(page,'sound');await page.locator('#central-existing-editors').evaluate(n=>n.open=true);await page.locator('.gx-sound-chooser').evaluate(n=>n.open=true);await page.locator('[data-gx-sound="'+key+'"]').click();}
async function noOverflow(page,label){const value=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(value.scroll<=value.width+2,label+': horizontal overflow '+JSON.stringify(value));}
async function dockTab(page,key){if(['coach','backups','settings'].includes(key))await page.locator('#gx-more-menu').evaluate(n=>n.open=true);await page.locator('[data-gx-tab="'+key+'"]').click();}
async function checkDock(page,label,size){const nav=page.locator('#gx-shell>.gx-nav');assert(await nav.isVisible(),label+': dock visible');const box=await nav.boundingBox();assert(box&&box.y>=0&&Math.abs(box.y+box.height-size.height)<=2,label+': dock fixed to viewport bottom '+JSON.stringify(box));assert.match(await page.locator('[data-gx-tab="stage"]').innerText(),/Início/);}
async function run(){
 const executable=process.env.GRAUE_CHROME||['/usr/bin/google-chrome','/usr/bin/chromium'].find(fs.existsSync);
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const errors=[],results=[];
 try{
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1366,height:900},{width:1672,height:941}]){
   const page=await browser.newPage({viewport:size});page.on('pageerror',e=>errors.push(size.width+': '+e.stack));
   await boot(page);await noOverflow(page,'stage '+size.width);
   // Android already removes native system bars, but its WebView can still expose
   // a nonzero CSS safe area. The dock must not reserve that region a second time.
   const cdp=await page.context().newCDPSession(page);
   for(const bottom of [0,48,90]){
    await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom}});
    const metrics=await page.evaluate(()=>{const probe=document.createElement('div');probe.style.height='env(safe-area-inset-bottom)';document.body.append(probe);const safe=parseFloat(getComputedStyle(probe).height);probe.remove();const nav=document.querySelector('#gx-shell>.gx-nav'),button=nav.querySelector('[data-gx-tab="stage"]'),r=nav.getBoundingClientRect(),b=button.getBoundingClientRect();return {safe,height:r.height,gap:r.bottom-b.bottom,padding:parseFloat(getComputedStyle(document.getElementById('gx-shell')).paddingBottom)};});
    assert.equal(metrics.safe,bottom,'Nonzero safe area must actually be emulated');
    const expectedHeight=size.height<=560&&size.width>size.height?52:66;
    assert.equal(metrics.height,expectedHeight,'Native-consumed safe area must not inflate the dock');
    assert(metrics.gap>=0&&metrics.gap<=10,'No blank strip below dock buttons: '+JSON.stringify(metrics));
    assert.equal(metrics.padding,expectedHeight+16,'Content reserve follows only visible dock height');
   }
   await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{bottom:48}});
   await page.screenshot({path:path.join(out,size.width+'-dock-native-insets.png')});

   assert.equal(await page.locator('[data-gx-screen].on').count(),1);
   const initial=await page.evaluate(midiCalls);assert.equal(initial.length,0,'Startup must be passive');
   for(const key of ['repertoire','sound','drums','coach','backups','settings','stage']){
    await dockTab(page,key);await noOverflow(page,key+' '+size.width);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await checkDock(page,key,size);
    if(key==='drums')await page.screenshot({path:path.join(out,size.width+'-pads-dock.png')});
    await dockTab(page,'stage');assert(await page.locator('[data-gx-screen="stage"]').evaluate(n=>n.classList.contains('on')));
   }
   for(const d of await page.locator('dialog').all())assert(await d.locator('button').filter({hasText:/Fechar|Voltar|Cancelar|✕|×/i}).count(),'Each modal has an explicit close/back button');

   // Home is named and remains reachable after scrolling the central screen.
   await tab(page,'sound');assert.match(await page.locator('#central-exit').innerText(),/Menu inicial/);
   const homeSong=(await page.evaluate(()=>window.GraueStageUX.state())).songId;
   const beforeHome=(await page.evaluate(midiCalls)).length;
   await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
   const homeBox=await page.locator('#central-exit').boundingBox();assert(homeBox&&homeBox.y>=0&&homeBox.y+homeBox.height<=size.height,'Home button must remain on screen');
   await page.screenshot({path:path.join(out,size.width+'-menu-inicial.png')});
   await page.locator('#central-exit').click();await page.waitForFunction(()=>!document.getElementById('gx-shell').classList.contains('gx-central-focus'));
   assert(await page.locator('.gx-nav').isVisible());assert.equal((await page.evaluate(()=>window.GraueStageUX.state())).songId,homeSong);assert.equal((await page.evaluate(midiCalls)).length,beforeHome,'Home never sends MIDI');
   await tab(page,'sound');assert.equal(await page.evaluate(()=>window.GraueNavigation.back()),true);assert(await page.locator('[data-gx-screen="stage"]').evaluate(n=>n.classList.contains('on')));
   assert.equal(await page.evaluate(()=>window.GraueNavigation.back()),false,'Root leaves native default back behavior available');
   for(const [route,expected] of [['effects','effects'],['split','mix'],['arpeggio','rhythm']]){
    await editor(page,route);assert(await page.locator('#sound-page-'+expected).isVisible());
    assert(await page.locator('#hardwarePart').isVisible());assert(await page.locator('#readHardware').isVisible());await noOverflow(page,'editor '+route+' '+size.width);
    await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await checkDock(page,'full editor '+route,size);
    if(route==='effects')await page.screenshot({path:path.join(out,size.width+'-editor-dock.png')});
    await page.screenshot({path:path.join(out,size.width+'-'+route+'.png'),fullPage:true});
    await dockTab(page,'drums');assert.equal(await page.evaluate(()=>document.body.classList.contains('gx-legacy')),false);assert(await page.locator('[data-gx-screen="drums"]').evaluate(n=>n.classList.contains('on')));await dockTab(page,'stage');
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
   await page.locator('#gx-show-mode').click();assert.equal(await page.locator('#gx-show-mode').getAttribute('aria-pressed'),'true');await page.screenshot({path:path.join(out,size.width+'-live.png'),fullPage:true});await noOverflow(page,'live '+size.width);await checkDock(page,'Ao Vivo',size);await dockTab(page,'sound');assert(await page.locator('[data-gx-screen="sound"]').evaluate(n=>n.classList.contains('on')));assert.equal(await page.locator('#gx-show-mode').getAttribute('aria-pressed'),'false');await dockTab(page,'stage');
   await page.evaluate(()=>{window.auditLiveEvents=0;document.addEventListener('graue:live-state',()=>window.auditLiveEvents++);});
   await page.waitForTimeout(1000);assert.equal(await page.evaluate(()=>window.auditLiveEvents),0,'Idle stage must not rebroadcast unchanged state');
   // Inject a readback fixture to exercise actual handlers and MFX draft lifetime.
   await page.evaluate(()=>{
    const hw={'setup:0':Array(80).fill(0),'common:0':Array(80).fill(0),'chorus:0':Array(100).fill(0),'reverb:0':Array(100).fill(0),'system:0':Array(30).fill(0),'systemController:0':Array(78).fill(0),completeBlocks:58,availableBlocks:58,validSysexPackets:58,readAt:Date.now()};hw['system:0'].splice(0,4,0,4,0,0);hw['system:0'][4]=64;hw['systemController:0'][3]=2;hw['setup:0'][0]=1;hw['setup:0'][18]=64;hw['setup:0'][19]=64;window.auditHardware=hw;Array.from('Piano + Pad').forEach((c,i)=>hw['common:0'][i]=c.charCodeAt(0));for(const [i,name] of ['Piano','Pad','Strings','Baixo'].entries()){hw['patch:'+i]=Array(80).fill(0);Array.from(name).forEach((c,j)=>hw['patch:'+i][j]=c.charCodeAt(0));}
    for(let i=0;i<16;i++){const p=Array(80).fill(0),z=Array(40).fill(0);p[0]=i;p[1]=1;p[4]=87;p[5]=64;p[7]=100;p[21]=64;z[1]=1;z[13]=127;hw['part:'+i]=p;hw['zone:'+i]=z;}
    hw['zone:0'][12]=36;hw['zone:0'][13]=59;hw['zone:1'][12]=60;hw['zone:1'][13]=96;
    for(let i=0;i<3;i++){const b=Array(160).fill(0);b[0]=1;for(let n=17;n<b.length;n+=4)b[n]=8;hw['mfx:'+i]=b;}
    window.receive('xpsConnection',true);window.receive('armed',true);window.receive('hardware',hw);
   });
   // Expanded controls reuse Central Parts; selection alone never sends MIDI.
   await tab(page,'sound');await page.locator('[data-central-tab="parts"]').click();
   const beforePartEdits=await page.evaluate(midiCalls);await page.locator('#central-part').selectOption('3');
   assert.equal((await page.evaluate(midiCalls)).length,beforePartEdits.length);
   assert.equal(await page.locator('[data-part-field]').count(),35);
   assert.match(await page.locator('#central-part-edit-title').innerText(),/Parte 4/);
   const coarse=page.locator('[data-part-field="part:9"]');assert(await coarse.isDisabled(),'Invalid readback is unavailable');
   await page.evaluate(()=>{const p=window.auditHardware['part:3'];p[9]=64;p[10]=64;p[11]=2;p[12]=2;p[13]=25;p[14]=2;p[15]=8;p[16]=0;p[22]=64;window.receive('hardware',window.auditHardware);});
   assert(await coarse.isEnabled());assert.equal(await coarse.inputValue(),'0');
   await coarse.fill('12');await coarse.dispatchEvent('change');
   const portamento=page.locator('[data-part-field="partPortamento:15"]');assert.equal(await portamento.inputValue(),'128');
   await portamento.fill('100');await portamento.dispatchEvent('change');
   await page.locator('#central-part').selectOption('0');await page.locator('#central-part').selectOption('3');assert.equal(await coarse.inputValue(),'12','Draft follows the selected part');
   const countBeforeApply=(await page.evaluate(midiCalls)).length;assert.equal(countBeforeApply,beforePartEdits.length,'Preparing knobs sends nothing');
   await page.locator('#central-apply').click();const partRequest=(await page.evaluate(midiCalls)).at(-1);assert.deepEqual(JSON.parse(partRequest.args[0]),[{section:'part',index:3,offset:9,value:76},{section:'partPortamento',index:3,offset:15,value:100}]);
   await page.evaluate(()=>window.receive('hardwareBusy',true));assert(await portamento.isDisabled());
   await page.evaluate(()=>{const p=window.auditHardware['part:3'];p[9]=76;p[15]=6;p[16]=4;window.receive('hardware',window.auditHardware);window.receive('hardwareBusy',false);});
   assert.match(await page.locator('#central-status').innerText(),/correspondem/);assert(await page.locator('#central-apply').isDisabled());
   await page.locator('#central-open-synthesis').click();assert.equal(await page.locator('.gx-synth-part-select select').inputValue(),'3','Detailed editor inherits central part');
   await page.locator('[data-central-tab="parts"]').click();await noOverflow(page,'part control '+size.width);await page.screenshot({path:path.join(out,size.width+'-part-control.png'),fullPage:true});
   await page.locator('[data-central-tab="system"]').click();await page.locator('#central-coverage').locator('..').evaluate(n=>n.open=true);assert.match(await page.locator('#central-coverage').innerText(),/35 \/ 35 valores recebidos/);
   const beforeDiagnostic=(await page.evaluate(midiCalls)).length;await page.locator('#central-open-diagnostic').click();assert(await page.locator('.gx-synth-capture').evaluate(n=>n.open));assert.equal((await page.evaluate(midiCalls)).length,beforeDiagnostic,'Opening diagnosis does not send edits');
   await editor(page,'effects');await page.locator('.sound-flow-details').evaluate(n=>n.open=true);
   const input=page.locator('#mfxParameters input').first();assert(await input.count());
   await input.fill('1');await page.evaluate(()=>window.receive('hardwareBusy',true));assert.equal(await input.inputValue(),'1','Busy may not erase a prepared MFX value');
   await page.evaluate(()=>window.receive('userReadState',{running:true,sent:1,received:0,total:256,message:'USER: 0 respondidas / 1 consulta enviada'}));
   assert(await page.locator('#cancelHardware').isEnabled(),'Cancel stays enabled during USER scan');assert(await page.locator('#readUserTones').isDisabled());
   const cancelCount=await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='cancelHardware').length);await page.locator('#cancelHardware').click();assert.equal(await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='cancelHardware').length),cancelCount+1);
   await page.evaluate(()=>window.receive('userReadState',{running:false,sent:1,received:0,total:256,message:'Primeira posição sem resposta; cache preservado.'}));assert(await page.locator('#cancelHardware').isDisabled());assert(await page.locator('#readUserTones').isEnabled());

   await page.evaluate(()=>window.receive('hardwareBusy',false));
   await page.locator('#mfxParameters button').first().click();const sent=(await page.evaluate(midiCalls)).at(-1);assert.equal(sent.method,'editHardware');assert.equal(JSON.parse(sent.args[0])[0].section,'mfxparam');
   await page.evaluate(()=>window.receive('status','Não foi possível confirmar todos os valores enviados.'));assert.match(await page.locator('#sound-flow-response').innerText(),/Não foi possível/);
   await page.locator('#gx-return').click();await tab(page,'stage');
   // Cancel destructive loop actions; the exact bridge call requires confirmation.
   await page.evaluate(()=>window.receive('loopState',{playing:false,recording:false,queued:false,track:-1,counts:[2,0,0,0],muted:[false,false,false,false],position:0,bpm:72,beats:4,bars:2,message:'Loop parado'}));
   await page.locator('.gx-loop-options').evaluate(n=>n.open=true);
   page.once('dialog',d=>d.dismiss());await page.locator('#loop-clear-all').click();assert.equal(await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='loopClearAll').length),0);
   page.once('dialog',d=>d.accept());await page.locator('#loop-clear-all').click();assert.equal(await page.evaluate(()=>window.nativeCalls.filter(c=>c.method==='loopClearAll').length),1);
   // Real central UI: Timbres and Performances open the existing editors in the top navigation.
   await tab(page,'sound');
   assert.equal(await page.locator('.central-nav [data-central-tab]').count(),9,'Nine top tools including working Favoritos');
   await page.locator('[data-central-tab="tones"]').click();
   assert(await page.locator('#central-existing-editors').evaluate(n=>n.open),'Timbres editor opened');
   assert(await page.locator('[data-gx-sound="tones"]').evaluate(n=>n.classList.contains('on')),'Timbres selected');
   
   // Live quick rig: one tap requests a real sound, then Dual/Split writes both keyboard zones.
   const qrTones=await page.evaluate(()=>window.ToneLibrary.list().slice(0,2));
   await page.locator('#gx-tone-search').fill(qrTones[0].code);
   await page.locator('#gx-tone-list .gx-tone-pick').first().click();
   let qrCall=(await page.evaluate(midiCalls)).at(-1);
   assert.equal(qrCall.method,'selectTone');
   assert.deepEqual(qrCall.args,[qrTones[0].msb,qrTones[0].lsb,qrTones[0].program,0]);
   await page.locator('[data-gx-quick-mode="dual"]').click();
   await page.locator('#gx-quick-second-search').fill(qrTones[1].code);
   await page.locator('#gx-quick-second').selectOption(qrTones[1].code);
   await page.locator('#gx-quick-main-volume').fill('97');
   await page.locator('#gx-quick-second-volume').fill('62');
   const qrBeforeBusy=(await page.evaluate(midiCalls)).length;
   await page.evaluate(()=>window.receive('hardwareBusy',true));
   await page.locator('#gx-quick-apply').click();
   assert.equal((await page.evaluate(midiCalls)).length,qrBeforeBusy);
   await page.evaluate(()=>window.receive('hardwareBusy',false));
   page.once('dialog',d=>d.accept());
   await page.locator('#gx-quick-apply').click();
   qrCall=(await page.evaluate(midiCalls)).at(-1);
   assert.equal(qrCall.method,'editHardware');
   assert.equal(JSON.parse(qrCall.args[0]).length,16);
   await page.locator('[data-gx-quick-mode="split"]').click();
   await page.locator('#gx-quick-split-note').fill('61');
   page.once('dialog',d=>d.accept());
   await page.locator('#gx-quick-apply').click();
   const qrSplit=JSON.parse((await page.evaluate(midiCalls)).at(-1).args[0]);
   assert.deepEqual(qrSplit.filter(x=>x.section==='zone'&&x.offset===13).map(x=>x.value),[60,127]);
   await page.locator('#gx-quick-bank').selectOption('0');
   await page.locator('#gx-quick-slot').selectOption('2');
   const qrBeforeSave=(await page.evaluate(midiCalls)).length;
   await page.locator('#gx-quick-save').click();
   const qrStored=await page.evaluate(()=>window.lastSaved.favoriteBanks['0-2']);
   assert.equal(qrStored.type,'rig');assert.equal(qrStored.mode,'split');assert.equal(qrStored.point,61);
   assert.equal((await page.evaluate(midiCalls)).length,qrBeforeSave);
   await page.locator('[data-central-tab="favorites"]').click();
   await page.locator('.central-favorite-pick').nth(2).click();
   assert.deepEqual(JSON.parse((await page.evaluate(midiCalls)).at(-1).args[0]),qrSplit);
   await page.locator('.central-favorite-slot .central-favorite-edit').nth(2).click();
   assert.equal(await page.locator('#gx-quick-split-note').inputValue(),'61');
   await page.evaluate(()=>window.receive('xpsConnection',false));
   const qrOff=(await page.evaluate(midiCalls)).length;
   await page.locator('#gx-quick-apply').click();
   assert.equal((await page.evaluate(midiCalls)).length,qrOff,'Disconnected quick editor must not write');
   await page.evaluate(()=>window.receive('xpsConnection',true));
   await page.locator('[data-central-tab="performance"]').click();
   assert(await page.locator('#central-existing-editors').evaluate(n=>n.open),'Performances editor opened');
   assert(await page.locator('[data-gx-sound="performance"]').evaluate(n=>n.classList.contains('on')),'Performances selected');
   assert(await page.locator('#gx-performance-banks').isVisible(),'Existing USER/PRESET list visible');

   // Working local Favorites (10 banks x 10 slots) must persist and send only on an explicit tap.
   await page.locator('[data-central-tab="favorites"]').click();
   assert.equal(await page.locator('#central-favorite-banks button').count(),10);
   assert.equal(await page.locator('.central-favorite-slot').count(),10);
   const firstTone=await page.evaluate(()=>window.ToneLibrary.list()[0]);
   assert(firstTone?.code,'A real tone must be available');
   await page.locator('.central-favorite-slot .central-favorite-edit').first().click();
   await page.locator('#central-favorite-tone-search').fill(firstTone.code);
   await page.locator('#central-favorite-tone-picker').selectOption(firstTone.code);
   await page.locator('#central-favorite-part').selectOption('1');
   const beforeFavorite=(await page.evaluate(midiCalls)).length;
   await page.locator('#central-favorite-save').click();
   const stored=await page.evaluate(()=>window.lastSaved.favoriteBanks['0-0']);
   assert.equal(stored.type,'tone');assert.equal(stored.code,firstTone.code);assert.equal(stored.part,1);
   assert.equal((await page.evaluate(midiCalls)).length,beforeFavorite,'Saving a favorite never sends MIDI');
   await page.evaluate(()=>{window.receive('armed',false);window.receive('xpsConnection',false);});
   await page.locator('.central-favorite-pick').first().click();
   assert.equal((await page.evaluate(midiCalls)).length,beforeFavorite,'Offline tap does not send MIDI');
   assert.match(await page.locator('#central-favorite-status').innerText(),/USB desconectado/);
   await page.evaluate(()=>{window.receive('armed',true);window.receive('xpsConnection',true);});
   await page.locator('.central-favorite-pick').first().click();
   let favoriteCall=(await page.evaluate(midiCalls)).at(-1);
   assert.equal(favoriteCall.method,'selectTone');assert.deepEqual(favoriteCall.args,[firstTone.msb,firstTone.lsb,firstTone.program,1]);
   await page.locator('.central-favorite-slot .central-favorite-edit').nth(1).click();
   await page.locator('#central-favorite-kind').selectOption('performance');
   await page.locator('#central-favorite-performance-type').selectOption('user');
   await page.locator('#central-favorite-performance-number').fill('12');
   await page.locator('#central-favorite-save').click();
   const savedPerformance=await page.evaluate(()=>window.lastSaved.favoriteBanks['0-1']);
   assert.deepEqual(savedPerformance,{type:'performance',user:true,number:12});
   await page.locator('.central-favorite-pick').nth(1).click();
   favoriteCall=(await page.evaluate(midiCalls)).at(-1);
   assert.equal(favoriteCall.method,'selectPerformance');assert.deepEqual(favoriteCall.args,[12,true]);
   await page.locator('#central-favorite-banks button').nth(9).click();
   assert.equal(await page.locator('.central-favorite-slot .central-favorite-pick').first().innerText().then(t=>t.includes('Não cadastrado')),true,'Other bank stays independent');
   await page.locator('#central-favorite-banks button').first().click();
   assert.match(await page.locator('.central-favorite-pick').first().innerText(),new RegExp(firstTone.code));
   page.once('dialog',d=>d.accept());
   await page.locator('.central-favorite-remove').first().click();
   assert.equal(await page.evaluate(()=>window.lastSaved.favoriteBanks['0-0']),undefined);
   assert.equal(await page.locator('.central-favorite-slot').count(),10);

   await page.locator('[data-central-tab="overview"]').click();
   assert(await page.locator('#central-existing-editors').evaluate(n=>!n.open),'Legacy editors hidden in overview');
   assert(await page.locator('#central-scene-shortcuts button').count()===3,'Scene shortcuts retained');
   // Real central UI, simulated transport. Drafts must not send prematurely.
   await page.locator('[data-central-tab="parts"]').click();
   await page.locator('#central-parts').evaluate(n=>n.closest('details').open=true);
   const beforeDraft=(await page.evaluate(midiCalls)).length;
   await page.locator('[data-central-level="0"]').fill('99');await page.locator('[data-central-level="0"]').dispatchEvent('change');assert.equal((await page.evaluate(midiCalls)).length,beforeDraft);
   // Going home must preserve the prepared level without transmitting it.
   await page.locator('#central-exit').click();await tab(page,'sound');await page.locator('[data-central-tab="parts"]').click();
   assert.equal(await page.locator('[data-central-level="0"]').inputValue(),'99');assert.equal((await page.evaluate(midiCalls)).length,beforeDraft);
   await page.locator('#central-apply').click();let centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(JSON.parse(centralSent.args[0])[0].value,99);
   await page.evaluate(()=>{window.auditHardware['part:0'][7]=99;window.receive('hardware',window.auditHardware);});assert.match(await page.locator('#central-pending').innerText(),/Nenhum/);
   await page.locator('[data-central-tab="scenes"]').click();await page.locator('#central-scene-name').fill('Verso');await page.locator('#central-scene-save').click();
   assert.equal(await page.evaluate(()=>window.lastSaved.centralScenes.length),1);await page.locator('#central-scenes .central-scene button').first().click();await page.locator('#central-apply').click();centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(JSON.parse(centralSent.args[0]).length,119);await page.locator('#central-discard').click();
   await page.locator('[data-central-tab="sequence"]').click();await page.locator('#central-seq-steps').selectOption('64');await page.locator('#central-seq-grid [aria-label="Bumbo passo 1"]').click();await page.locator('#central-seq-play').click();
   centralSent=(await page.evaluate(midiCalls)).at(-1);assert.equal(centralSent.method,'startPhraseSequence');const seqPayload=JSON.parse(centralSent.args[0]);assert.equal(seqPayload.tracks.length,8);assert.equal(seqPayload.tracks[4].velocities.length,64);assert.equal(seqPayload.tracks[4].velocities[0],100);
   await page.evaluate(()=>window.receive('phraseState',{playing:true,step:0,muted:Array(8).fill(false),message:'Sequenciador tocando'}));assert(await page.locator('#central-seq-grid [aria-label="Bumbo passo 1"]').isDisabled());await page.locator('#central-seq-stop').click();await page.evaluate(()=>window.receive('phraseState',{playing:false,step:-1,muted:Array(8).fill(false),message:'Sequenciador parado'}));
   await noOverflow(page,'central sequencer '+size.width);await page.screenshot({path:path.join(out,size.width+'-central-sequence.png'),fullPage:true});
   await page.locator('[data-central-tab="system"]').click();assert.equal(await page.locator('.central-limits button:disabled').count(),2);
   assert.equal(await page.locator('[data-system-field]').count(),32);
   const applyPosition=await page.locator('#central-apply').evaluate(n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:innerHeight};});assert(applyPosition.top>=0&&applyPosition.bottom<=applyPosition.height,'Global Apply stays visible');
   const tuning=page.locator('[data-system-field="masterTune:0"]'),globalLevel=page.locator('[data-system-field="system:5"]');
   assert.equal(await tuning.inputValue(),'0');const beforeSystem=(await page.evaluate(midiCalls)).length;
   await tuning.fill('12.3');await tuning.dispatchEvent('change');assert.equal((await page.evaluate(midiCalls)).length,beforeSystem,'Global draft must stay passive');
   await page.locator('#central-apply').click();let globalSent=(await page.evaluate(midiCalls)).at(-1);assert.deepEqual(JSON.parse(globalSent.args[0]),[{section:'masterTune',index:0,offset:0,value:1147}]);
   await page.evaluate(()=>{window.auditHardware['system:0'].splice(0,4,0,4,7,11);window.receive('hardware',window.auditHardware);});assert.match(await page.locator('#central-pending').innerText(),/Nenhum/);
   await page.evaluate(()=>{window.auditHardware['setup:0'][0]=0;window.receive('hardware',window.auditHardware);});assert(await globalLevel.isEnabled());assert(await page.locator('[data-central-level="0"]').isDisabled());
   await globalLevel.fill('77');await globalLevel.dispatchEvent('change');await page.locator('#central-apply').click();globalSent=(await page.evaluate(midiCalls)).at(-1);assert.deepEqual(JSON.parse(globalSent.args[0]),[{section:'system',index:0,offset:5,value:77}]);
   await page.evaluate(()=>{window.auditHardware['system:0'][5]=77;window.receive('hardware',window.auditHardware);window.receive('hardwareBusy',true);});assert(await globalLevel.isDisabled());assert(await page.locator('#central-apply').isDisabled());
   await page.evaluate(()=>{window.receive('hardwareBusy',false);window.auditHardware['setup:0'][0]=1;window.receive('hardware',window.auditHardware);});
   await page.screenshot({path:path.join(out,size.width+'-central-system.png'),fullPage:true});

   await page.locator('[data-central-tab="overview"]').click();await page.locator('#central-chord-buttons button').first().click();assert.equal(await page.evaluate(()=>window.nativeCalls.at(-1).method),'playAssistChord');
   await page.evaluate(()=>{window.receive('midi',[144,60,90]);window.receive('midi',[145,60,80]);window.receive('midi',[128,60,0]);});assert.equal(await page.locator('#central-keys rect[data-note="60"]').getAttribute('fill'),'#9aebc6');await page.evaluate(()=>window.receive('midi',[129,60,0]));assert.notEqual(await page.locator('#central-keys rect[data-note="60"]').getAttribute('fill'),'#9aebc6');
   assert.equal(await page.locator('[data-quick-part]').count(),4);
   assert.equal(await page.locator('#central-chord-buttons button').count(),4);
   const beforeQuick=(await page.evaluate(midiCalls)).length;
   await page.locator('[data-quick-part="0"]').fill('87');await page.locator('[data-quick-part="0"]').dispatchEvent('change');
   assert.equal((await page.evaluate(midiCalls)).length,beforeQuick,'Fader only prepares');
   assert.equal(await page.locator('.central-quick-part output').first().innerText(),'87');
   await page.locator('.central-quick-part>button').first().click();assert.equal(await page.locator('.central-quick-part output').first().innerText(),'0');
   await page.locator('.central-quick-part>button').first().click();assert.equal(await page.locator('.central-quick-part output').first().innerText(),'87');
   await page.locator('#central-discard').click();
   await page.locator('#central-scene-shortcuts button').nth(1).click();assert.equal(await page.locator('#central-scene-name').inputValue(),'Refrão');assert.equal((await page.evaluate(midiCalls)).length,beforeQuick);
   await page.locator('[data-central-tab="overview"]').click();
   await page.locator('#central-save-open').click();assert(await page.locator('#central-scene-name').isVisible());await page.locator('[data-central-tab="overview"]').click();
   if(size.width>=760){const pos=await page.evaluate(()=>{const r=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,right:b.right,y:b.y,bottom:b.bottom};};return {nav:r('.central-nav'),mix:r('.central-mix-card'),chord:r('.central-chords'),fx:r('.central-quick-effects'),footer:r('.central-toolbar'),seq:r('.central-sequence-preview')};});assert(pos.nav.right<=pos.mix.x+2,'Menu à esquerda');assert(pos.mix.right<=pos.chord.x+2,'Acordes à direita');assert(pos.fx.y>=pos.chord.bottom,'Efeitos sob acordes');assert(pos.footer.y>=pos.seq.bottom,'Ações abaixo da sequência');}
   if(size.width===1672){const height=await page.locator('#gx-control-center').evaluate(n=>n.getBoundingClientRect().height);assert(height<=size.height,'Central fits reference height: '+height);}
   await noOverflow(page,'central overview '+size.width);await page.screenshot({path:path.join(out,size.width+'-central.png'),fullPage:true});await tab(page,'stage');
   await page.screenshot({path:path.join(out,size.width+'-stage.png'),fullPage:true});
   results.push({viewport:size,pass:true});await page.close();
  }
  // Direct live workflow: visible score transpose, explicit XPS transpose,
  // searchable tones and captured scenes without leaving the live screen.
  for(const size of [{width:390,height:844},{width:844,height:390},{width:1366,height:900}]){
   const page=await browser.newPage({viewport:size});page.on('pageerror',e=>errors.push('direct stage '+size.width+': '+e.stack));await boot(page);
   await page.locator('#gx-live-song-select').selectOption('0');const passive=(await page.evaluate(midiCalls)).length;
   await page.locator('#gx-up').click();assert.match(await page.locator('#gx-live-score').innerText(),/C#\s+F#/,'Visible score follows transpose');assert.match(await page.locator('#gx-stage-key-label').innerText(),/C#/);assert.equal((await page.evaluate(midiCalls)).length,passive,'Score transpose remains passive');assert(await page.locator('#gx-stage-apply-key').isDisabled());
   await page.locator('#gx-down').click();assert.match(await page.locator('#gx-live-score').innerText(),/C\s+F/);await page.locator('#gx-up').click();
   await page.evaluate(()=>{const hw={'setup:0':Array(52).fill(0),'common:0':Array(56).fill(32),'system:0':Array(30).fill(0),validSysexPackets:58,completeBlocks:58,availableBlocks:58};hw['setup:0'][0]=1;hw['setup:0'][18]=64;hw['setup:0'][19]=64;hw['system:0'][4]=64;for(let i=0;i<16;i++){hw['part:'+i]=Array(49).fill(0);hw['part:'+i][0]=i;hw['part:'+i][1]=1;hw['part:'+i][4]=87;hw['part:'+i][5]=64;hw['part:'+i][7]=100;}window.directHardware=hw;window.receive('xpsConnection',true);window.receive('armed',true);window.receive('hardware',hw);});
   await page.locator('#gx-stage-apply-key').click();let sent=(await page.evaluate(midiCalls)).at(-1);assert.equal(sent.method,'editHardware');assert.deepEqual(JSON.parse(sent.args[0]),[{section:'system',index:0,offset:4,value:65}]);
   await page.evaluate(()=>{window.receive('hardwareBusy',true);window.directHardware['system:0'][4]=65;window.receive('hardwareBusy',false);window.receive('hardware',window.directHardware);});assert.match(await page.locator('#gx-stage-direct-status').innerText(),/confirmada/);assert(await page.locator('#gx-stage-apply-key').isDisabled());
   await page.locator('#gx-show-mode').click();await page.locator('#gx-stage-tones').click();assert(await page.locator('#gx-stage-tone-dialog').isVisible());assert.equal(await page.locator('[data-stage-tone]').count(),40);await page.locator('#gx-stage-tone-more').click();assert.equal(await page.locator('[data-stage-tone]').count(),80);
   await page.locator('#gx-stage-tone-search').fill('órgão');assert(await page.locator('[data-stage-tone]').count()>0,'Portuguese tone category aliases');const code=await page.locator('[data-stage-tone]').first().getAttribute('data-stage-tone');await page.locator('.gx-live-tone-row>button:last-child').first().click();await page.locator('[data-stage-tone]').first().click();sent=(await page.evaluate(midiCalls)).at(-1);assert.equal(sent.method,'selectTone');assert.equal(sent.args[3],0);assert(await page.locator('[data-gx-screen="stage"]').evaluate(n=>n.classList.contains('on')));assert(await page.locator('#gx-shell').evaluate(n=>n.classList.contains('gx-live-mode')));
   await page.evaluate(()=>{const c=window.nativeCalls.filter(c=>c.method==='selectTone').at(-1);const p=window.directHardware['part:'+c.args[3]];p[4]=c.args[0];p[5]=c.args[1];p[6]=c.args[2]-1;window.receive('hardware',window.directHardware);});
   await page.locator('#gx-stage-tones').click();await page.locator('[data-stage-tone-category="recent"]').click();assert.equal(await page.locator('[data-stage-tone]').first().getAttribute('data-stage-tone'),code);await page.locator('#gx-stage-tone-dialog .gx-live-dialog-head button').click();
   await page.locator('#gx-stage-scenes').click();await page.locator('#gx-stage-scene-name').fill('Verso palco');await page.locator('#gx-stage-scene-capture').click();assert.equal(await page.evaluate(()=>window.lastSaved.centralScenes.length),1);await page.locator('#gx-stage-scene-results button').first().click();sent=(await page.evaluate(midiCalls)).at(-1);assert.equal(JSON.parse(sent.args[0]).length,119);await page.evaluate(()=>window.receive('hardware',window.directHardware));assert.match(await page.locator('#gx-stage-direct-status').innerText(),/Cena Verso palco confirmada/);
   await page.locator('#gx-next').click();assert.match(await page.locator('#gx-song-name').innerText(),/Mesmo nome/);assert.match(await page.locator('#gx-live-score').innerText(),/D\s+G/);assert.equal(await page.locator('#gx-transpose').innerText(),'0');
   const beforeLoop=(await page.evaluate(midiCalls)).length;await page.locator('#gx-stage-looper').click();assert.equal((await page.evaluate(midiCalls)).length,beforeLoop,'Looper shortcut must not start recording');assert(await page.locator('#loop-rec').evaluate(n=>n===document.activeElement));
   await page.evaluate(()=>window.scrollTo(0,0));await noOverflow(page,'direct stage '+size.width);await page.screenshot({path:path.join(out,size.width+'-stage-direct.png'),fullPage:true});results.push({viewport:size,directStage:true,pass:true});await page.close();
  }
  // Regression: Louve status/retry controls used to consume a 290px capped
  // library after its details wrapper broke the old direct-child CSS fix.
  for(const size of [{width:390,height:844},{width:360,height:740},{width:844,height:390},{width:1366,height:900}]){
   const page=await browser.newPage({viewport:size});page.on('pageerror',e=>errors.push('library '+size.width+': '+e.stack));
   const songs=Array.from({length:35},(_,i)=>({...notes[0],loopId:'library-'+i,title:'Música '+String(i+1).padStart(2,'0')+' — Louvor e Adoração'}));
   const items=songs.slice(0,3).map((s,i)=>({title:s.title,key:'C',bpm:72,status:i===2?'failed':'done',keyMatched:true,error:i===2?'Importação pendente':''}));
   await boot(page,{songs,scenes:[],louveSetlist:{title:'Louvor e Adoração',items}});await tab(page,'repertoire');
   const list=page.locator('#gx-songs');assert.equal(await list.locator('.gx-song-pick').count(),35);assert(await page.locator('#gx-louve-retry').isVisible());
   const measure=await list.evaluate(n=>{const p=n.parentElement,b=n.getBoundingClientRect(),r=p.getBoundingClientRect();return{height:n.clientHeight,content:n.scrollHeight,top:b.top,bottom:b.bottom,parentBottom:r.bottom,screen:innerHeight};});
   assert(measure.height>=Math.min(150,size.height*.40),'Songs retain usable height: '+JSON.stringify(measure));assert(measure.content>measure.height,'Long list scrolls');assert(measure.bottom<=measure.parentBottom+2,'List is not clipped by library');
   await list.scrollIntoViewIfNeeded();await list.evaluate(n=>n.scrollTop=n.scrollHeight);await list.locator('.gx-song-pick').last().click();
   assert.match(await page.locator('#gx-cifra-title').innerText(),/Música 35/,'Last song remains selectable');
   await page.locator('#gx-search').fill('Música 02');assert.equal(await list.locator('.gx-song-pick').count(),1);await list.locator('.gx-song-pick').click();assert.match(await page.locator('#gx-cifra-title').innerText(),/Música 02/);
   await page.locator('#gx-search').fill('');await list.scrollIntoViewIfNeeded();await list.evaluate(n=>n.scrollTop=0);await noOverflow(page,'long repertoire '+size.width);
   await page.screenshot({path:path.join(out,size.width+'-repertoire-list.png'),fullPage:true});
   await page.locator('.gx-repertoire-library>summary').click();assert(!await list.isVisible());await page.locator('.gx-repertoire-library>summary').click();assert(await list.isVisible());
   assert.equal((await page.evaluate(midiCalls)).length,0,'Library browsing remains passive');results.push({viewport:size,repertoire35:true,pass:true});await page.close();
  }
  // Valid JSON that is not a state object must not break startup.
  for(const value of [null,[],{songs:[null,{title:'Inválida'},...notes],scenes:[null]}]){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.stack));await boot(p,value);if(value?.songs?.includes(null)){const recovery=await p.evaluate(()=>window.lastSaved);assert.equal(recovery.recoverySongs.length,2);assert.equal(recovery.recoveryScenes.length,1);assert.equal(recovery.songs.length,2);}await p.close();}
  assert.deepEqual(errors,[],'Browser runtime errors');
 }catch(e){for(const page of browser.contexts().flatMap(c=>c.pages())){await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'failure.html'),await page.content());}throw e;}finally{fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({results,errors},null,2));await browser.close();}
 console.log('Browser audit PASS: 4 viewports, all pages, editor routes, identities, drafts, confirmation and passive idle. Hardware bridge simulated.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
