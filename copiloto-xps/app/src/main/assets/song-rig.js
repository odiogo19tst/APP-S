'use strict';
/* Grauê: saved, musician-approved Keyboard Setup per repertoire song.
 * Pure logic; NEVER send MIDI when merely rendering or restoring a song. */
(function(scope){
  const brain=scope?.GraueSetupBrain||(typeof require==='function'?require('./setup-brain.js'):null);
  function normalize(raw){
    if(!raw||typeof raw!=='object'||!['user','preset'].includes(raw.type))return null;
    const number=Number(raw.number);
    if(!Number.isInteger(number)||number<1||number>(raw.type==='user'?128:16))return null;
    const value={type:raw.type,number,auto:raw.auto!==false};
    if(raw.parts!==undefined){
      const clean=brain?.cleanParts(raw.parts);
      if(clean===null||clean===undefined)return null;
      if(clean.length)value.parts=clean;
    }
    return value;
  }
  function assign(song,raw){
    if(!song||typeof song!=='object')throw new Error('Selecione uma música válida');
    const previous=normalize(song.keyboardSetup);
    const same=previous&&raw&&raw.type===previous.type&&Number(raw.number)===previous.number;
    const preserving=same&&raw.parts===undefined&&Array.isArray(previous.parts)?{...raw,parts:previous.parts}:raw;
    const value=normalize(preserving);
    if(raw!==null&&!value)throw new Error('Performance inválida ou snapshot não reconhecido. USER 1–128 ou PRESET 1–16.');
    return {...song,keyboardSetup:value};
  }
  function activate(song,connected,send){
    const rig=normalize(song&&song.keyboardSetup);
    if(!rig)return {status:'not-configured'};
    if(!rig.auto)return {status:'manual',rig};
    if(!connected)return {status:'disconnected',rig};
    if(typeof send!=='function')return {status:'unsupported',rig};
    send(rig.number,rig.type==='user');
    return {status:'requested',rig}; // The native bridge must perform SysEx readback.
  }
  const api={normalize,assign,activate};
  if(scope)scope.GraueSongRig=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:null);
