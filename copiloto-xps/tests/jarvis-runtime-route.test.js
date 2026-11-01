// Detecta regressões no roteamento entre API OpenAI e Gemma local.
'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const code=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/MainActivity.java'),'utf8');
const ui=fs.readFileSync(path.join(__dirname,'../app/src/main/assets/ux-v2.js'),'utf8');
const direct=fs.readFileSync(path.join(__dirname,'../app/src/main/java/br/com/doapps/grauelive/JarvisDirectOpenAI.java'),'utf8');
assert.match(code,/modelInstallerWorker=Executors\.newSingleThreadExecutor\(\)/);
assert.match(code,/modelInstallerWorker\.execute\(\(\)=>\{\s*try\{\s*Gemma270Installer\.install\(/,'Instalar modelo não pode bloquear a fila de consultas');
const testMethod=code.split('@JavascriptInterface public void testModel()')[1]?.split('@JavascriptInterface public void readUserTones()')[0]||'';
assert.match(testMethod,/llm\.generateResponse\(sample\)/,'Teste Gemma deve usar somente modelo local');
assert.doesNotMatch(testMethod,/\bask\(/,'Teste Gemma não pode usar roteador híbrido da API');
assert.match(code,/emit\("aiSource","Gemma · Offline \(teste real\)"\)/);
assert.match(code,/modelInstallerWorker\.shutdownNow\(\)/);
assert.match(direct,/new URL\("https:\/\/api.openai.com\/v1\/responses"\)/);
assert.match(ui,/id="gx-ai-source-label"/);
assert.match(ui,/Origem: aguardando resposta/);
assert.doesNotMatch(ui,/A IA está elaborando a resposta offline…/,'Sem prometer offline quando selecionou API');
console.log('Jarvis: teste Gemma local independente; download não bloqueia GPT; fonte visível.');
