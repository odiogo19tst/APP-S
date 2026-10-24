# Grauê Jarvis — gateway seguro para a API OpenAI

Este serviço opcional permite usar modelos online no Grauê XPS, sem inserir uma chave da OpenAI no APK.

## Configuração privada (Cloudflare Workers)

1. Abra **https://dash.cloudflare.com/** → **Workers & Pages** → **Create application** → **GitHub**. Autorize somente o repositório `odiogo19tst/APP-S`, selecione a branch `feat/copiloto-xps`, diretório raiz **`graue-api-worker`** e nome **`graue-jarvis-api`**. Faça o primeiro deploy (ainda sem chave).
   Alternativa no Codespaces: `cd graue-api-worker && npx wrangler login && npx wrangler deploy`.
   Depois do primeiro deploy, o endpoint `/health` deve dizer `ready:false` até você adicionar os segredos.
2. No Worker criado, abra **Settings → Variables and Secrets → Add** e selecione o tipo **Secret**. Configure-os sem colocar valores no GitHub:
   - `OPENAI_API_KEY`: sua chave da OpenAI Platform.
   - `GRAUE_DEVICE_TOKEN`: uma senha aleatória e **diferente** da chave OpenAI, com pelo menos 20 caracteres (recomenda-se 32+).
3. Alternativa via terminal, depois do primeiro deploy:
   `npx wrangler secret put OPENAI_API_KEY` e `npx wrangler secret put GRAUE_DEVICE_TOKEN`.
4. Se usou GitHub, o Worker pode implantar automaticamente. Depois de salvar os Secrets, publique a versão se o painel solicitar; caso use terminal, rode `npx wrangler deploy`. O endereço será parecido com `https://graue-jarvis-api.<seu-subdominio>.workers.dev`.
5. Abra o Grauê XPS → Ajustes → Jarvis Online. Configure o endereço da implantação, **não o domínio da OpenAI**, e informe somente o `GRAUE_DEVICE_TOKEN` criado no Worker. Selecione Luna ou Sol. Nunca digite a chave OpenAI no aplicativo.
6. Mantenha o modo **Automático** para usar Gemma local quando estiver sem internet ou ocorrer erro de rede.

Segurança: o token do dispositivo autentica este Worker; se vazar, revogue-o no Cloudflare. O token não substitui o controle de gastos: configure limites no projeto OpenAI e ajuste a conta Cloudflare. O Worker limita a entrada a 3.300 caracteres e a saída a 240 tokens. O custo do uso online é separado da assinatura do ChatGPT.

Modelos permitidos: `gpt-6-luna` (econômico) e `gpt-6.1-sol` (maior capacidade). O envio de MIDI continua exigindo confirmação explícita no app.

O segredo `OPENAI_API_KEY` nunca deve ser colocado em código-fonte, Github Actions com publicação no APK, mensagens de chat, prints ou em `wrangler.jsonc`.

**Estado:** o código é um gateway preparado para deploy, não um servidor já ativo. O usuário deve implantar o Worker e configurar seus Secrets.
