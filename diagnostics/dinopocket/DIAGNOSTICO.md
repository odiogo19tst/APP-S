# DinoPocket Retro: recuperação controlada da base 1.5.2

## Estado e limites

Uma tentativa de controle foi executada pelo Bridge, mas terminou antes do envio ao relógio. O teste físico de instalação ainda está pendente. **A causa real de “Failed to unzip the package” permanece não confirmada.** Nenhum pacote chegou à etapa de envio nessa tentativa; nenhuma desinstalação, limpeza ou edição do estado do pet foi executada. Firmware 4.6.0.3, API 402 e tela 390×450 são informações fornecidas pelo proprietário, não medidas remotamente.

## Evidências recuperadas

| Item | 1.5.2 original | 1.5.8 com falha relatada |
|---|---:|---:|
| Commit fonte | `74ad38a283df6d6799a2f1995981a894be99ebab` | `f6ee5118be3a3d8371660ff03d198c540a55bac3` |
| Actions run | `38195928183` | `38331120007` |
| Artifact ID | `11722894160` | `11782642497` |
| ZAB, bytes | 2.856.540 | 2.900.127 |
| ZPK, bytes | 930.290 | 916.756 |
| device.zip, bytes | 1.408.860 | 1.366.077 |
| Recursos descomprimidos, bytes | 47.688.590 | 32.140.629 |
| Entradas em device.zip | 1.272 | 1.272 |
| App ID | 29318764 | 29318764 |
| Version code | 8 | 14 |
| ZPM registrado no pacote | 3.4.2 | 3.4.2 |

SHA-256 do ZAB original 1.5.2: `318209cf977f36a7f0f39f5c5451d11cb173e17b22714ce7366acbf4a38480d2`.

SHA-256 do ZAB original 1.5.8: `0566158f398f20b559f522095a4db1a3fe75058a54856b38c41054480d7fba7c`.

Todos os CRCs passam nas quatro camadas: ZAB, ZPK, device.zip/app-side.zip e .ip-package. O MD5 do ZPK confere com manifest e nome. Os métodos de compressão são STORE/DEFLATE. O teste automatizado também rejeita caminhos inseguros, duplicados e arquivos criptografados. Portanto **não há evidência de ZIP corrompido nos artefatos originais**. Isso não prova que os mesmos bytes chegaram ao Android/relógio.

App ID, requisitos API 4.0, permissões e deviceSources 9765120/9765121/10158337 são iguais. A 1.5.8 muda 972 imagens do fonte, reduz canvas da animação para 230×132 e altera `spriteAnim` para `x+29,y+16`. `app-side.js`, `setting.js` e a lógica de persistência permanecem iguais. O código da página compilada difere; app.bin só difere pelo caminho temporário do compilador. A comparação normaliza exclusivamente `/tmp/zpm-XXXXXX`, sem ignorar outras mudanças em bytecode.

Os recursos descomprimidos da versão funcional já somam 47,7 MB. A versão com falha soma menos, 32,1 MB: não é válido atribuir a falha apenas ao tamanho do ZAB nem concluir falta de memória sem medir o espaço temporário necessário durante uma atualização que mantém a versão anterior instalada. Falha de transporte, extração/atualização no dispositivo e problema de ferramenta continuam hipóteses; a desconexão do Bridge por si só não distingue causa de consequência.

## Correção limitada de membros

`prepare.py` recupera ambos os fontes por commits imutáveis e aplica mudanças somente a duas linhas com as coordenadas dos braços levantados do renderer original. Reconstrói os quatro frames existentes com os ticks 0/2/4/6, conferindo pixel a pixel contra a base antes de cada edição. Após restringir a correção à perspectiva dos braços levantados, modifica apenas 56 dos 900 quadros de ações; os 72 quadros antigos auxiliares e demais recursos ficam intactos. Mantém canvas 288×164, escala, face/corpo originais fora das regiões antes cobertas pelos membros, posição da página, fps, contagem de frames, sons, efeitos, pés e cauda. Não foi feito redesenho geral ou redução de tamanho.

Todos os arquivos JS do runtime e o manifest da prévia precisam ser idênticos à 1.5.2. Os 67 testes existentes passaram tanto na base como na correção isolada, incluindo schema, chave de salvamento, migração e evolução do pet. Não foi acessado o save real do relógio, portanto a preservação física ainda precisa ser verificada após a atualização.

## Controle e ordem dos testes

1. O Actions recupera o **ZAB original intacto**, verifica seu SHA-256 e o republica no artifact `DinoPocket-1.5.2-CONTROLE-ORIGINAL`, com retenção de 90 dias. Compila também o fonte exato da 1.5.2 e compara runtime, arquivos e orçamento descomprimido com o original. Não altera o version code do controle.
2. A primeira instalação deve usar o original, pelo mesmo caminho que falhou, mantendo o DinoPocket instalado. Se a ferramenta recusar a mesma versão, registrar a recusa: isso não equivale a “Failed to unzip”. Não desinstalar e não contornar com limpeza de dados.
3. Gravar Bridge desde a conexão até a resposta da instalação. Confirmar o alvo via `connect`, registrar os logs e a versão Zeus/Zepp, horário e pacote exato. A instalação do controle só será executada após reconectar o Zepp Android.
4. Se o controle falhar com o mesmo erro, parar: não compilar uma nova candidata. Verificar transporte e logs de extração do Android/relógio. Se o controle instalar e o pet mantiver nome, idade e evolução, então compilar a única candidata.
5. A candidata `1.5.2-limbfix`, code 15, só é compilada no workflow_dispatch quando `candidate=true` e `watch_control_passed=true`. Preserva app ID, runtime e armazenamento; só os membros e os metadados de versão diferem. Este sinal é declaração do resultado físico, não teste automático de hardware.
6. A instalação da candidata ainda exige teste físico e conferência do pet e poses. Não publicar como versão validada antes desse resultado.

## Automação e reprodução

Workflow: `.github/workflows/compilar-dinopocket.yml`. Execuções por push fazem controle e auditoria; não produzem candidata. Usa Node 22, Zeus CLI 1.9.3 e Pillow 11.3.0. O CLI é fixado, mas suas dependências transitivas e o catálogo de dispositivos podem variar; o relatório verifica versão ZPM efetiva e compara o resultado real. O download dos artefatos antigos falha explicitamente se expirarem, em vez de inventar um pacote original substituto. Depois desta execução, há cópias com retenção maior no novo run.

Reproduzir: `python diagnostics/dinopocket/prepare.py --out build-audit`, executar `npm test --prefix build-audit/control` e `npm test --prefix build-audit/limb-preview`; compilar controle com `zeus build` em `build-audit/control`. `packages.py BASE.zab OUTRO.zab --strict --report resultado.json` verifica todas as camadas e equivalência do runtime compilado.

## Ambiente local e Codespace

A compilação local encontrou inicialmente rejeições da revisão automática por chamadas externas do Zeus. A inspeção comprovou que a telemetria do comando build contém UUID aleatório, plataforma/release/arquitetura, Node, evento, horário e resultado; o catálogo de dispositivos é baixado por GET sem payload/credenciais. Uma tentativa posterior foi permitida, mas o GET do CDN retornou 502 neste ambiente. Não se trata de evidência sobre a instalação no Bip 6. A compilação será executada no Actions e no Codespace autorizado, sem alterar o compilador para contornar controles.

O Codespace `glowing-space-fortnight-694vg9955p7r35rrr` foi aberto. Os diretórios de versões e alterações locais existentes foram preservados. Na inspeção inicial não havia processo Zeus ativo nem log persistente da tentativa anterior disponível nos caminhos consultados. O Bridge precisa registrar uma tentativa nova de controle, com conexão do telefone.

Referências oficiais: https://docs.zepp.com/docs/guides/faq/developer-bridge-mode/ e https://docs.zepp.com/docs/guides/quick-start/preview/ .

## Resultados desta execução

- Commit de automação: `5bd3c08c372513b5b7c713ba8f99c00680f75d98`. Actions `38335897195`: **success**. Os 67 testes passaram nas duas árvores; a base 1.5.2 compilou e passou na comparação estrita de runtime normalizado, conjunto de arquivos e orçamento de recursos. A compilação da candidata foi pulada pelo gate de controle físico.
- O original intacto foi preservado também em `DinoPocket_Retro_1.5.2_CONTROLE_ORIGINAL.zab`, com SHA-256 conferido. Os artefatos novos do Actions expiram em 11/01/2027.
- No Codespace, a árvore de controle foi extraída diretamente do ZIP no commit 74ad38a e passou nos 67 testes. O Bridge conectou: `successfully connected to app-Android`. O log do Android indica `side-4.1.0-release.6-402`; isso não é leitura da versão de firmware do relógio.
- Controle pelo Bridge: comando `install`, alvo Amazfit Bip 6, fontes 9765120/9765121/10158337. O primeiro seletor recebeu o nome da pasta de assets, rejeitou-o e o alvo Amazfit Bip 6 foi explicitamente escolhido; não houve compilação para outro dispositivo. ROLLUP: 4 arquivos; PNG2TGA: **982 arquivos, 60.541 ms**; QJSC: 2 arquivos, 178 ms. Em seguida apareceu **Disconnected** e o CLI terminou, sem `getting package...` ou `packagePush`. Logo, essa tentativa **não chegou ao instalador do relógio**.
- A implementação oficial de `disConnectWSCB` em Zeus 1.9.3 faz `process.exit(1)` e não registra o motivo do WebSocket. Um timeout durante a compilação pesada é uma hipótese consistente com o ponto da queda; a causa exata da desconexão não foi comprovada. Esse resultado não prova nem resolve o erro anterior de unzip.
- Próximo controle: `zeus preview --target "Amazfit Bip 6"` no mesmo fonte intacto. Esse fluxo oficial compila primeiro e fornece QR para o Zepp; não depende de manter uma conexão Bridge durante a conversão de imagens. Só o proprietário consegue completar o scan e conferir o estado real do pet.
- Logs privados mantidos no Codespace: `/tmp/dinopocket-control-bridge.log` e `/tmp/dinopocket-control-preview.log`. Não publicar tokens, URL temporária de instalação ou logs de conta no repositório.

## Controle físico e escopo confirmado pelo proprietário

O proprietário informou que o controle por QR também apresentou a mesma falha. A **1.5.2 atualmente instalada continua funcionando**. A falha de uma tentativa de reenvio não invalida essa base nem comprova defeito nos PNGs. Não desinstalar, limpar dados ou zerar o relógio. A causa do erro do instalador ainda não foi identificada.

A solicitação é corrigir perspectiva: no gesto de alegria os braços parecem sair do rosto. A proposta inicial abrangia outras poses e foi restringida antes de compilar uma candidata. Agora altera exclusivamente duas linhas do renderer, usadas pelos braços levantados de happy/play/touch/wake. Afeta dois dos quatro quadros dessas quatro poses em sete formas (56 arquivos). Mantém todos os 982 arquivos de imagem e todos os demais frames idênticos em bytes. Nenhuma imagem nova é adicionada, nenhum canvas é reduzido e nenhuma posição da interface é deslocada. A versão candidata continua bloqueada porque o controle físico não passou.

Inventário dos fontes e device.zip: 1.5.2 e 1.5.8 têm 982 imagens (900 quadros de ações, 72 quadros antigos de caminhada e 10 imagens na raiz, incluindo o ícone). Os 72 quadros antigos não são referenciados pelo renderizador atual, que usa anim/<forma>/<pose>/frame_0..3. Há 316 cópias adicionais de PNGs byte a byte idênticos na 1.5.2 e 329 na 1.5.8; exemplos eat/eat_carne e quadros de ovo repetidos. Igualdade de bytes não torna uma cópia automaticamente dispensável: as ações acessam caminhos específicos. Os 72 arquivos antigos ocupam 3.711.744 bytes descomprimidos no pacote 1.5.2. Nada foi removido, pois limpeza e redução de recursos devem ser testadas separadamente da correção de perspectiva.

## Escopo final solicitado em 12/10/2026, 23h41–23h42

O proprietário pediu verificar todas as poses com membros saindo do rosto, melhorar o sono e tentar pelo Bridge até um resultado verificável. Isso amplia a revisão anterior dos 56 quadros. A única candidata final substitui 700 quadros existentes: 672 com correções de perspectiva de braços/mãos e 28 da pose de dormir. Mantém 982 arquivos PNG, canvas 288×164, escala, posição da página, temporização e todos os JS do jogo/armazenamento byte a byte. A pose de dormir mantém o estilo reclinado e as cores, separa braço/pés da face e preserva mandíbula do rex, chifres do trike e pescoço do bronto. As formas egg/ghost e 72 quadros antigos não mudam. A limpeza de imagens duplicadas não foi misturada à correção.

A candidata mantém o nome de versão **1.5.2**, com **version code 15** para permitir atualização da instalação atual, sem uma série de versões novas. Os 67 testes passaram depois de aplicar as alterações e os metadados. A confirmação explícita do proprietário de que a 1.5.2 instalada funciona pode autorizar a única compilação candidata por workflow_dispatch: candidate=true, installed_baseline_confirmed=true. Isso não representa sucesso do controle por QR: aquele controle falhou e continua registrado como tal.

`bridge_prebuilt.cjs` mantém o fluxo oficial Zeus de upload, downloadPackage e packagePush, mas usa um ZAB previamente compilado e auditado. Não altera o pacote, não recompila dentro da conexão, não chama uninstall e não acessa o save. Também registra código/motivo do close e ACK de packagePush, que o handler original não mostra. **PACKAGE_PUSH_SENT/ACK não são sucesso de instalação**; a validação exige resposta do instalador ou conferência posterior do relógio. Uma desconexão ou erro igual não justifica novas versões por tentativa.
