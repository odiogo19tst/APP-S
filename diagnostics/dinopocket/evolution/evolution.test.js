import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'
import * as game from '../src/game.js'
import * as settings from '../src/phone_settings.js'
import * as sound from '../src/sound_rules.js'
import * as visual from '../src/visual_rules.js'
import * as touch from '../src/touch_rules.js'
import { advanceForTest } from '../src/advance_for_test.js'

const now=Date.UTC(2026,9,13,12)
const egg=()=>game.enhance(game.newGame(now))

test('manual evolution advances exactly four times and stays adult',()=>{
  let pet=egg()
  for(let stage=1;stage<=4;stage++){
    pet=advanceForTest(pet,now)
    assert.equal(pet.stage,stage)
    assert.equal(game.advance(pet,now).stage,stage)
  }
  assert.equal(advanceForTest(pet,now),pet)
  assert.equal(game.advance(pet,now+game.HOUR).stage,4)
})
test('evolution preserves care, achievements, schema, generation and unknown fields',()=>{
  let pet={...egg(),hunger:33,joy:41,hygiene:25,energy:18,thirst:52,health:37,sick:true,
    intelligence:62,careCount:18,gamesWon:9,generation:7,lives:2,
    meals:{carne:5,vegetais:1,massa:0},achievements:{custom:['kept']},futureField:'retained'}
  const before=structuredClone(pet)
  const mutable=new Set(['stage','ageDays','bornAt','updatedAt','species','message'])
  for(let i=0;i<4;i++)pet=advanceForTest(pet,now)
  for(const key of Object.keys(before))if(!mutable.has(key))assert.deepEqual(pet[key],before[key],key)
  assert.deepEqual(before,{...egg(),hunger:33,joy:41,hygiene:25,energy:18,thirst:52,health:37,sick:true,
    intelligence:62,careCount:18,gamesWon:9,generation:7,lives:2,
    meals:{carne:5,vegetais:1,massa:0},achievements:{custom:['kept']},futureField:'retained'})
  assert.equal(pet.species,'rex')
})
test('paused and sleeping pets keep their settings and do not regress on resume',()=>{
  let pet={...egg(),pausedAt:now,awake:false,sleepingSince:now,sleepUntil:now+8*game.HOUR}
  pet=advanceForTest(pet,now+2*game.HOUR)
  assert.equal(pet.pausedAt,now);assert.equal(pet.awake,false)
  assert.equal(pet.sleepUntil,now+8*game.HOUR)
  pet=game.setPause(pet,false,now+3*game.HOUR)
  assert.equal(game.advance(pet,now+3*game.HOUR).stage,1)
})
test('invalid, dead and adult states are unchanged; no revival',()=>{
  for(const state of [null,{schema:2,stage:0},{...egg(),dead:true},
    {...egg(),stage:4},{...egg(),stage:7},{...egg(),stage:1.5}])assert.equal(advanceForTest(state,now),state)
})
test('adult species follows existing food rules and optional phone preference',()=>{
  for(const [meals,species] of [[{carne:4},'rex'],[{vegetais:4},'bronto'],[{},'trike']]){
    const pet={...egg(),stage:3,meals}
    assert.equal(advanceForTest(pet,now).species,species)
    assert.equal(settings.adjustNaturalEvolution(pet,advanceForTest(pet,now),{mode:'custom',species:'bronto'}).species,'bronto')
  }
})

function watch(saved){
  const values=new Map([[settings.PET_SAVE_KEY,structuredClone(saved)]])
  const widgets=new Set();let page
  class Storage {
    getItem(k,f){return values.has(k)?structuredClone(values.get(k)):f}
    setItem(k,v){values.set(k,structuredClone(v))}
  }
  class Clock extends Date {constructor(...a){super(...(a.length?a:[now]))}static now(){return now}}
  const enums=new Proxy({},{get:(_,key)=>key})
  const code=readFileSync(new URL('../page/index.js',import.meta.url),'utf8').replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"]\s*\r?\n/gm,'')
  vm.runInNewContext(code,{...game,...settings,...sound,...visual,...touch,advanceForTest,
    Date:Clock,LocalStorage:Storage,Page:p=>page=p,
    createWidget:(type,p)=>{const w={type,p,setProperty(){},addEventListener(){},createWidget(){return {setProperty(){},addEventListener(){}}}};widgets.add(w);return w},
    deleteWidget:w=>widgets.delete(w),widget:enums,align:enums,text_style:enums,prop:enums,anim_status:enums,event:enums,
    createConnect(){},disConnect(){},sendBluetooth(){},Accelerometer:class{setFreqMode(){}onChange(){}start(){}stop(){}offChange(){}},
    Vibrator:class{start(){}},FREQ_MODE_NORMAL:0,VIBRATOR_SCENE_SHORT_LIGHT:0,VIBRATOR_SCENE_NOTIFICATION:0,
    createMedia(){throw Error('No audio in mock')},mediaId:enums,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},console})
  page.onInit();page.build()
  return {values,page,widgets,click(label){const w=[...widgets].find(w=>w.type==='BUTTON'&&w.p.text===label);assert.ok(w,'button '+label);w.p.click_func()}}
}
test('real menu callback persists one phase per tap and reopening never triggers test evolution',()=>{
  const original=egg();let ui=watch(original)
  assert.equal(ui.values.get(settings.PET_SAVE_KEY).stage,0)
  ui.click('MENU');ui.click('MAIS');ui.click('TESTES')
  assert.equal(ui.values.get(settings.PET_SAVE_KEY).stage,0)
  for(let stage=1;stage<=4;stage++){
    ui.click('AVANCAR EVOLUCAO')
    const saved=ui.values.get(settings.PET_SAVE_KEY)
    assert.equal(saved.stage,stage);assert.equal(saved.schema,1)
    for(const key of ['hunger','joy','hygiene','energy','thirst','health','careCount','generation','gamesWon'])assert.equal(saved[key],original[key],key)
  }
  assert.ok(![...ui.widgets].some(w=>w.p.text==='AVANCAR EVOLUCAO'))
  ui.page.onDestroy()
  const adult=ui.values.get(settings.PET_SAVE_KEY)
  ui=watch(adult)
  assert.equal(ui.values.get(settings.PET_SAVE_KEY).stage,4)
  assert.equal(ui.values.get(settings.PET_SAVE_KEY).generation,adult.generation)
})
