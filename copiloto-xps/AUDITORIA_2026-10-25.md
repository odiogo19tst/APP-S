# Grauê XPS — Auditoria de integridade e funcionalidades
**Revisão de código e testes automatizados em 25/10/2026.**
Este relatório não é uma certificação de 100% de funcionamento no hardware; validação do Roland XPS-10 e de um dispositivo Samsung ainda é indispensável.

## Diagnóstico por área

| Área | Constatação | Correção/estado |
|---|---|---|
| Inicialização / persistência | O estado serializado descartava `xpsToneCache`, `assistChannel` e `padKit` | **Corrigido:** itens incluídos na persistência |
| Catálogo de timbres | Lista vazia em Sons ao permanecer no filtro Favoritos, apesar de `XPS_TONES` presente | Correção de seleção de categoria já incluída na base v1.6; novo teste verifica catálogo embarcado |
| Timbres USER | Falha/timeout podia descartar nomes recebidos anteriormente | **Corrigido:** persiste USER após leitura válida; mantém último cache quando não há respostas |
| Favoritos do app | 10 bancos × 10 posições locais; não equivalem a favoritos físicos | Situação explicitada; sem falsa leitura Roland |
| Favoritos físicos 0–9 | O manual descreve `FAVORITE UTIL` no painel; não foi validado um protocolo para consultar atribuições pelo USB-MIDI | **Pendente:** backup original do teclado + documentação de formato + teste físico; nada é escrito na memória USER |
| USB | Porta detectada não é prova de SysEx recebido; falhas de Device ID e modo não diagnosticadas suficientemente | **Melhorado:** contador de respostas SysEx aceitas; permanece dependente de teste Roland |
| MIDI automático | Usuário não quer habilitar MIDI toda vez | Na base, `armed=ready` após portas abrir; `onResume` restaura estado |
| Timbres com um toque | SysEx temporário em Performance; Bank Select/Program Change no canal 1 quando Performance desconhecida | **Parcial:** sem resposta do XPS não é possível afirmar que o som local foi trocado |
| Pads MIDI | Oito pads em canal MIDI e kit de percussão do Roland; som depende do programa/part selecionado | Implementação existente; sem áudio pelo USB |
| Pads com áudio | Faltava biblioteca independente de amostras semelhante ao app de referência | **Implementado:** quatro bancos personalizáveis WAV/MP3/OGG, oito posições, importação Android e reprodução no celular via SoundPool |
| Kits de áudio comerciais | O app de referência exibe opções que não estão incluídas nos arquivos do Grauê | **Não embarcadas:** os bancos novos começam vazios e recebem arquivos do usuário |
| Cifra / repertório | Importação WebView pode depender do site, autenticação e estrutura da página | Pendente teste real de login/importação e transposição |
| Copiloto / Gemma | Modelo precisa ter sido baixado, passar hash e iniciar no aparelho | Pendente teste real do motor e de respostas |
| OpenAI direta | Chave digitada após instalação, cifrada no Android Keystore | Implementada; integração real, saldo, proteção contra extração e limites de consumo precisam ser testados |
| Ao vivo / UI | Botões de palco, favoritos, bancos, editor e faders | Sintaxe JavaScript + regressões; ergonomia e latência exigem validação no smartphone |
| Backups | Copiar, exportar e checar SHA-256; mesclagem proprietária não implementada | Seguro para arquivo original; **não** restaura/mescla dados do teclado |

## Testes automatizados do pipeline
- `node --check` em **todos os JavaScript** do `app/src/main/assets`.
- Testes da lógica musical, MIDI, protocolo Roland, cifras/transposição, interface principal, IA offline, IA online, timbres e favoritos.
- Novo `comprehensive-audit.test.js` validando catálogo físico embutido, formato dos códigos e parâmetros MIDI, persistência e os caminhos reais de sample pads.
- `gradle :app:assembleDebug :app:lintDebug` verificando compilação Android e lint.

## Testes obrigatórios no aparelho (não realizados neste pipeline)
1. Instalar por atualização sem desinstalar nem perder repertório, favs ou credenciais.
2. Conectar XPS-10 (USB MIDI), verificar entrada/saída e contador de respostas SysEx. Testar a troca de banco por um toque em Patch e Performance, SEM gravar na memória.
3. Carregar amostra WAV curta no banco local, pressionar pad, verificar saída de som no telefone e latência com áudio externo/mixer.
4. Importar 2 amostras e fechar/reabrir o app; verificar mapeamento e som sem internet.
5. Verificar o fluxo da cifra real, favoritos, IA local e API (sem divulgar credencial).

**Não trate build aprovado como comprovação de operação ao vivo.** Se o usuário fornecer um backup XPS-10 real, analisar primeiro em modo somente leitura para verificar se contém favoritos físicos; nunca presumir que são mapeados via SysEx.
