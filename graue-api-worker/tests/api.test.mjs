import assert from 'node:assert/strict';
import gateway from '../src/index.mjs';
const env={OPENAI_API_KEY:'sk-test-not-real',GRAUE_DEVICE_TOKEN:'device-secret-1234567890-long-enough'};
const host='https://graue.test';
const req=(path,headers={},body=null,method='POST')=>new Request(host+path,{method,headers,body});
const saved=globalThis.fetch;
let invoked=0;
globalThis.fetch=async(url,config)=>{
 invoked++;
 assert.equal(url,'https://api.openai.com/v1/responses');
 const body=JSON.parse(config.body);
 assert.equal(body.store,false);
 assert(body.max_output_tokens<=240);
 assert(['gpt-6-luna','gpt-6.1-sol'].includes(body.model));
 assert(!config.body.includes('sk-test-not-real'));
 return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'Use pad suave após confirmar.'}]}]}),{status:200});
};
try {
 let r=await gateway.fetch(req('/ask',{'Content-Type':'application/json'},JSON.stringify({prompt:'Faça sugestão'})),env);
 assert.equal(r.status,401);
 assert.equal(invoked,0);
 r=await gateway.fetch(req('/ask',{'Authorization':'Bearer '+env.GRAUE_DEVICE_TOKEN,'Content-Type':'application/json'},JSON.stringify({model:'gpt-6-luna',prompt:'Sugira um pad'})),env);
 assert.equal(r.status,200);
 assert.equal((await r.json()).answer,'Use pad suave após confirmar.');
 assert.equal(invoked,1);
 r=await gateway.fetch(req('/ask',{'Authorization':'Bearer '+env.GRAUE_DEVICE_TOKEN},JSON.stringify({model:'evil-model',prompt:'hello'})),env);
 assert.equal(r.status,400);
 assert.equal(invoked,1);
 r=await gateway.fetch(req('/health',{},null,'GET'),env);
 assert.equal((await r.json()).ready,true);
 console.log('Grauê gateway API: auth, model allowlist, limited payload and responses passed');
}finally{globalThis.fetch=saved;}
