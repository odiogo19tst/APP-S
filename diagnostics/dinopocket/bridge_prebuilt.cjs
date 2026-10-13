// Use the official Zeus upload/download/packagePush flow with an already built
// ZAB. Compiling 982 images inside the live WebSocket stalled it in the control.
// No uninstall, save edits, changed payload, or alternative server is involved.
const fs=require('fs'), path=require('path'), crypto=require('crypto');
const archive=path.resolve(process.argv[2]||'');
if(!fs.statSync(archive).isFile()||!archive.endsWith('.zab'))throw Error('Expected a compiled .zab');
const zeus=process.env.DINO_ZEUS_BIN||'/usr/local/share/npm-global/bin/zeus';
const cli=path.dirname(path.dirname(fs.realpathSync(zeus)));
const app=JSON.parse(fs.readFileSync('app.json'));
if(app.app.appId!==29318764)throw Error('Wrong app ID');
const digest=crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
console.log('PREBUILT',JSON.stringify({sha256:digest,appId:app.app.appId,version:app.app.version}));
const wsmod=require(path.join(cli,'private-modules/zeppos-app-utils/dist/websocket.js'));
const Original=wsmod.WebSocketClass;
const redact=x=>String(x).replace(/https?:\/\/[^\s"']+/g,'[package URL]').slice(0,1400);
wsmod.WebSocketClass=class extends Original{
  constructor(options){
    super(options);
    this.socket.prependListener('close',(code,reason)=>console.log('BRIDGE_CLOSE',code,redact(reason)));
    const handle=this.handleListenMsgEventReturn;
    this.handleListenMsgEventReturn=data=>{
      try{
        const msg=JSON.parse(data.toString('utf8'));
        let method=msg.method;
        if(!method)method=Object.keys(this.msgEventIDs).find(k=>this.msgEventIDs[k]===msg.id);
        if(method==='packagePush')console.log('PACKAGE_PUSH_ACK',redact(JSON.stringify({result:msg.result,error:msg.error,params:msg.params})));
        if(['sysMessagePush','sysSettingPush'].includes(method))console.log('DEVICE_INSTALL_EVENT',redact(JSON.stringify(msg)));
      }catch{}
      return handle(data);
    };
  }
};
const build=require(path.join(cli,'modules/build.js'));
build.buildPreview=async(args,callback)=>{
  const utils=require(path.join(cli,'private-modules/zeppos-app-utils/dist/index.js'));
  const sources=Object.values(app.targets).flatMap(t=>t.platforms.map(p=>p.deviceSource));
  console.log('UPLOADING_PREBUILT; no image conversion in live Bridge');
  const params=await utils.modules.previewBuild(process.cwd(),{...args,sources},archive,app.app.appType,'install');
  if(params.appid!==29318764)throw Error('Wrong push identity');
  console.log('SENDING_PACKAGE_PUSH',JSON.stringify({appId:params.appid,devices:params.devices,target:params.target}));
  callback(params);
  console.log('PACKAGE_PUSH_SENT; wait for device response, this is not installation success');
};
process.argv=[process.execPath,path.join(cli,'bin/main.js'),'bridge'];
require(path.join(cli,'bin/main.js'));
