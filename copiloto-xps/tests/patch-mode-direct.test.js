'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const assets=path.resolve(__dirname,'../app/src/main/assets');
const src=path.resolve(__dirname,'../app/src/main/java/br/com/doapps/grauelive');
const ux=fs.readFileSync(path.join(assets,'ux-v2.js'),'utf8');
const hardware=fs.readFileSync(path.join(assets,'hardware.js'),'utf8');
const main=fs.readFileSync(path.join(src,'MainActivity.java'),'utf8');
const controller=fs.readFileSync(path.join(src,'XpsController.java'),'utf8');
const router=fs.readFileSync(path.join(src,'PatchToneRouting.java'),'utf8');

assert(ux.includes('Modo Patch o Grauê usa o canal MIDI do teclado'),'Quick rig must allow Patch without Performance');
assert(ux.includes('window.Native.selectToneWithVolume(draft.msb,draft.lsb,draft.program,draft.part,draft.volume)'),
 'Single Quick Rig applies direct Patch choice with volume');
assert(!ux.includes('Leia uma Performance do XPS-10 antes da troca direta'),
 'Tone list must never block Patch mode waiting for Performance');
assert(!ux.includes("hw['setup:0']?.[0]!==1||!hw['part:'+part]"),
 'Tone list must not require Performance part');
assert(ux.includes("Dual/Split exige Performance ativa"),'Dual/Split must remain Performance-only');
assert(hardware.includes("field('applyTone').disabled=busy"),
 'Legacy single-tone apply must be available outside Performance');
assert(hardware.includes("call('selectTone',msb,lsb,program,selected())"),
 'Legacy single-tone action must send direct patch select');
assert(main.includes('requestToneChange(msb,lsb,program,part,volume)'),
 'Tone with volume must work in Patch mode too');
assert(main.includes('requestToneChange(msb,lsb,program,part,-1)'),
 'Tone without volume must share a mode-aware dispatch');
assert(!main.includes('int channel=0;\n    boolean ok=midi.send(0xb0+channel,0,msb)'),
 'No assumed channel 1');
assert(main.includes('PatchToneRouting.channel(mode,xps.observedPatchRxChannel(),physicalPatchRxChannel)'),
 'Use verified system Rx/Tx or physical MIDI note channel');
assert(main.includes('if((s&0xf0)==0x90&&b>0)'),'Passive real keyboard channel learning');
assert(main.includes('pendingToneChoice=new ToneChoice('),'Only latest requested sound may be queued');
assert(main.includes('acceptToneSelectionProbe(p)'), 'Fresh read-only Roland mode response must be consumed');
assert(main.includes('XpsProtocol.address(1,0,0,0),XpsProtocol.digits(1)'), 'Patch/Performance mode must be probed at selection time');
assert(main.includes('XpsProtocol.address(2,0,0,10),XpsProtocol.digits(1)'), 'Patch receive channel must be probed directly');
assert(main.includes('final int mode=choice.freshMode'), 'Stale Performance mode must never decide Patch routing');

assert(main.includes('xpsAudition.restoreThen(()->applyPendingTone(choice))'),
 'Restore temporary external sound before Patch switch');
assert(main.includes('pendingToneChoice=null;')&&main.includes('modeVerified'),
 'Switch status must be explicit, not silent assumed audio confirmation');
assert(controller.includes('observedSoundMode()'),'Mode must be obtained from the Roland');
assert(controller.includes('observedPatchRxChannel()'),'Channel must come from Roland system SysEx');
assert(controller.includes('state.remove(XpsProtocol.address(1,0,0,0))'),
 'Panel selection must invalidate stale mode cache');
assert(router.includes('if(soundMode==1)return -1'), 'Never touch Performance via Patch fallback');
assert(router.includes('{status,0,msb}')&&router.includes('{status,32,lsb}'),
 'Patch mode bank select must use CC0 and CC32');
console.log('Grauê 1.36.7: Patch direct selection, learned channel, volume, busy queue and Performance isolation PASS');
