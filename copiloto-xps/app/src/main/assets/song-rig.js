'use strict';
/* Grauê: saved, musician-approved Keyboard Setup per repertoire song.
 * Pure logic; NEVER send MIDI when merely rendering or restoring a song. */
(function(scope){
  function normalize(raw){
    if(!raw||typeof raw!=='object'||!['user','preset'].includes(raw.type))return null;
    const number=Number(raw.number);
    if(!Number.isInteger(number)||number<1||number>(raw.type==='user'?128:16))return null;
    return {type:raw.type,number,auto:raw.auto!==false};
  }
  function assign(song,raw){
    if(!song||typeof song!=='object')throw new Error('Selecione uma música válida');
    const value=normalize(raw);
    if(raw!==null&&!value)throw new Error('Performance inválida. USER 1–128 ou PRESET 1–16.');
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
