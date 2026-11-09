'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const appRoot=path.resolve(__dirname,'../app');
const js=name=>fs.readFileSync(path.join(appRoot,'src/main/assets',name),'utf8');
const native=name=>fs.readFileSync(path.join(appRoot,'src/main/java/br/com/doapps/grauelive',name),'utf8');
const app=js('app.js'),ui=js('ux-v2.js'),stage=js('live.js'),css=js('ux-v2.css'),usb=native('UsbMidi.java');
const gradle=fs.readFileSync(path.join(appRoot,'build.gradle'),'utf8');

// Reproduce one genuine persistence call; later modules must not lose their own fields.
const start=app.indexOf('function persist(){'),end=app.indexOf('\nfunction option',start);
assert(start>=0&&end>start,'Persist function must remain callable');
let stored;
const context={saved:{externalNewFeature:{active:true},songFavorites:['a'],scenes:[],songs:[]},
  songs:[{title:'Canção de ensaio'}],scenes:[],
  document:{body:{classList:{contains:()=>false}}},
  N:{save:payload=>{stored=JSON.parse(payload);}}};
vm.runInNewContext(app.slice(start,end)+'\npersist();',context,{timeout:1000});
assert.equal(stored.externalNewFeature.active,true,'Persist must retain unknown feature keys');
assert.equal(stored.songFavorites[0],'a','Persist must retain existing favourites');
assert.equal(stored.songs[0].title,'Canção de ensaio','Persist must store current songs');

// The stage score is usable when the user first opens the stage screen.
assert(ui.includes('let liveMode=false,stageScoreOpen=true;'),'Stage score must be expanded by default');
assert(ui.includes('id="gx-live-score-toggle" type="button" aria-expanded="true"'),'Score disclosure must match visible content');
assert(ui.includes('class="gx-live-score"></pre>'),'Stage score cannot be hidden initially');
assert(ui.includes('if(!stageScoreOpen)')&&ui.includes('gx-live-score-toggle'),'Show mode must still recover a manually hidden score');

// 10 banks x 10 positions: 0-9. Never pretend that unverified physical favorites are available.
assert(stage.includes('for(let i=0;i<=9;i++)'),'Missing physical FAVORITE zero');
assert(stage.includes('Dez favoritos do banco'),'Accessible label must describe ten slots');
assert(stage.includes('button.disabled=true'),'Unverified physical Favorites must remain disabled');
assert(css.includes('grid-template-columns:repeat(5,minmax(0,1fr))'),'Ten bank slots need a compact grid');

// Automatic/manual MIDI discovery must not race or resurrect a removed USB device.
assert(usb.includes('if(opening)return'),'Prevent duplicate concurrent USB port opening');
assert(usb.includes('opening&&openingId==info.getId()'),'Disconnected pending USB must invalidate open');
assert(usb.includes('if(request!=generation)'),'Stale Android open callback must not steal the session');
assert(usb.includes('opening=false;openingId=-1'),'Reset opening state on disconnect or completion');
assert(/versionCode\s+48/.test(gradle),'The new APK must upgrade versionCode 47');
console.log('Grauê v1.30.3: music persistence, visible score, 100 physical slots, USB race guards and version upgrade PASS');
