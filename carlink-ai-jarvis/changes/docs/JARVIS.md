# CarLink AI — Jarvis Edition: protótipo de desenvolvimento 0.1

Alvo: multimídia Android 11, aproximadamente 2 GB de RAM, ARMv7 ou ARM64, e Samsung
com Android 11 ou posterior. A compatibilidade final depende dos modelos, firmware,
papéis Bluetooth disponíveis, adaptador e veículo. Ainda não foi validado no carro.

## O que esta revisão implementa

| Recurso | Implementação e limite |
|---|---|
| Android Auto sem fio e USB | Motores originais preservados. Sem nova implementação do protocolo e sem certificação Google. Wi-Fi Direct/Bluetooth do fabricante precisam funcionar. |
| Jarvis na multimídia | Segundo ícone “Jarvis • sessão” no mesmo APK do CarLink. Sessão explícita, com expiração de 15 minutos. |
| Voz no Samsung | APK `jarvis-phone`, reconhecedor Android via activity, gramática determinística em português. A central não carrega modelos. |
| Comandos offline | Interpretação local, OBD e Bluetooth não precisam de internet. Reconhecimento pede `EXTRA_PREFER_OFFLINE`, que o fornecedor pode ignorar. Instale português offline e teste em modo avião com Bluetooth reativado. Não há garantia de voz offline em todo Samsung. |
| Respostas no carro | TTS do Samsung com uso de orientação por voz. A saída efetiva é a selecionada pelo Android/Android Auto/A2DP. O app não força um perfil ou alto-falante externo. |
| Botão play | `MediaSession` na central e `dispatchKeyEvent` quando a activity recebe o evento; debounce de 1 segundo. A recepção depende do controle, MCU, mapeamento e concorrência com o player/Android Auto. |
| Observar interface | Árvore semântica de acessibilidade, consultada sob demanda, somente IDs aprovados de controles no Maps/Spotify nativos da central. Sem OCR, captura contínua ou textos pessoais. |
| Operar interface | Abrir Maps/Spotify, início, voltar e clique em ID visível, único, habilitado, não editável e previamente aprovado localmente. Tudo bloqueado em movimento/estado desconhecido. |
| OBD2 | ELM327 Bluetooth clássico SPP: modos 01 (0C RPM, 05 líquido de arrefecimento, 0D km/h) e 03 (DTC armazenados). Sem limpeza de falhas, codificação, escrita CAN ou controle de atuadores. |
| “AI” | Esta revisão usa comandos limitados e verificáveis, sem LLM. Planejamento em linguagem livre e visão computacional são evolução futura, não recurso pronto. |

## Arquitetura

`app` mantém a projeção do CarLink e acrescenta `jarvis/`. `jarvis-phone` usa
reconhecimento/TTS e consulta o ELM no Samsung. `jarvis-core` contém a gramática,
enquadramento limitado de mensagens, trava de condução e decodificadores OBD,
com testes de fronteira. Nenhum motor em `vendor/` foi alterado.

Central ↔ Samsung: RFCOMM seguro (`listenUsingRfcommWithServiceRecord` /
`createRfcommSocketToServiceRecord`), com vínculo Bluetooth criado nas configurações
e endereço do par aprovado manualmente. A central só aceita o MAC escolhido naquela
sessão. Sem listener TCP, nuvem ou descoberta em rede. Proteção depende da segurança
do pareamento do Android; Bluetooth legado com PIN fraco e aparelhos comprometidos
continuam sendo riscos. O endereço MAC não é um segredo nem substitui o vínculo.

Mensagens UTF-8 terminadas por LF, entrada limitada a 2048 bytes e saída a 500
caracteres. Central envia `LISTEN`, `SAY ...` e `POLL nonce`. Samsung envia apenas
comandos da gramática e `VELOCITY nonce kmh`. Uma amostra no Samsung expira em
1500 ms; respostas precisam corresponder à consulta atual e chegar em até 900 ms.
Consultas repetidas/atrasadas não renovam a autorização. A central invalida velocidade
após 3 segundos, usando relógio monotônico. Não se depende de relógios sincronizados.

O protótipo não tem serviço permanente: sessões pertencem às activities e podem
terminar por rotação, processo morto, economia de bateria ou fechamento. Isso revoga
a operação da interface. O Samsung precisa estar com Jarvis aberto para iniciar a
activity de reconhecimento; uma solicitação em segundo plano informa essa limitação.
Reconhecer voz pode pausar a activity e disputar microfone/áudio com Android Auto.

## Instalação e configuração, com o carro estacionado

1. Compile ou obtenha os dois APKs do workflow e confira `SHA256SUMS.txt`.
   Instale `CarLink-AI-Jarvis-headunit-debug.apk` na central e
   `Jarvis-Samsung-debug.apk` no Samsung. São builds de teste com chave debug;
   não são atualizações oficiais do CarLink nem builds de produção.
2. Pareie Samsung e central pelas configurações Bluetooth. Não confunda o Bluetooth
   Android exposto aos apps com o módulo MCU proprietário do aparelho. Se a central
   não expuser RFCOMM ao Android, esta ponte não funcionará nela.
3. Abra CarLink e faça o pareamento de Android Auto pelo telefone. Prefira 720p/H.264,
   efeitos automáticos/lite e evite decodificação HEVC por software. Compare também
   USB antes do teste sem fio. A conexão de projeção é independente da sessão Jarvis.
4. Abra “Jarvis • sessão” na central, escolha o Samsung na lista de já pareados ou informe seu endereço Bluetooth,
   conceda Bluetooth quando aplicável e inicie a sessão. No Samsung informe o MAC da
   central e conecte. Endereços devem ser os apresentados pelos dispositivos pareados,
   não um MAC Wi-Fi ou BLE aleatório. Não ficam persistidos por este protótipo.
5. Ative manualmente o serviço Jarvis em Acessibilidade na central, após ler sua
   descrição. Essa permissão é opcional e ampla no Android: desative-a ao terminar.
   Não há root, ADB, Shizuku ou concessão automática no módulo Jarvis. Os motores
   originais podem ter recursos próprios opcionais que não são usados por ele.
6. Pareie um ELM327 clássico no Samsung; informe o MAC e conecte OBD. Faça isso
   com a alimentação do veículo adequada. BLE, Wi-Fi, USB, adaptadores proprietários
   e respostas de múltiplas ECUs não estão implementados. Respostas ambíguas, PID
   não suportado, `NO DATA` e timeout são rejeitados; nenhum número é inventado.
7. Com veículo realmente estacionado e velocidade OBD válida igual a zero, confirme
   a liberação de 2 minutos na central. A leitura zero não prova freio de mão ou
   câmbio em P; a confirmação humana é necessária. Movimento, dados inválidos,
   desconexão, expiração ou “parar” revogam a liberação.
8. Fale pelo botão no app Samsung ou teste o play do volante. Comandos: “início”,
   “voltar”, “abrir mapas”, “abrir spotify”, “ler tela”, “rotação”, “temperatura”,
   “velocidade”, “falhas”, “parar”. A consulta de falhas não interpreta diagnóstico
   mecânico. OBD é informativo, não um instrumento de segurança do veículo.
9. Para acionar elementos, aprove IDs estáveis no campo local da central, separados
   por espaço, por exemplo `com.spotify.music:id/ID_REAL_VERIFICADO`. IDs mudam por
   versão e devem ser inspecionados no app instalado. “Acionar pacote:id/elemento”
   só funciona com correspondência exata e controles aprovados. Não aprove controles
   de compra, envio de mensagens, permissões ou outras operações sensíveis.
10. Selecione a saída de áudio do carro no Samsung e teste TTS junto de música,
    chamadas e navegação. Se play só controlar música, o fabricante precisa oferecer
    mapeamento adequado. Não há promessa de interceptar todos os controles universais.

A interface projetada por Android Auto é em geral uma superfície de vídeo: seus
botões não são nós de acessibilidade da central. Este módulo opera apps Android
nativos da central; não promete observar ou controlar a interface remota do Samsung.
Apps customizados podem não publicar IDs/nós, e telas protegidas não ficam acessíveis.

## Condução, recursos e privacidade

Não configure nem teste cliques enquanto dirige. Durante movimento ou sem OBD
válido, todas as ações de tela desta edição ficam bloqueadas. Voz/telemetria podem
continuar, mas não há assistente autônomo de direção nem substituição de sistemas
do veículo. A trava é uma barreira de software experimental, não certificação de
segurança; OBD pode atrasar ou retornar dados incorretos.

Sem gravação contínua, palavra de ativação, LLM na central, screenshots ou histórico
de fala Jarvis. O reconhecedor e TTS escolhidos no Samsung têm políticas próprias;
esta edição não controla eventual tráfego deles. O CarLink original mantém seus
diagnósticos e recursos de rede; não compartilhe logs sem revisão. Sem analytics
adicional no Jarvis. OBD consulta velocidade em série, a cada segundo; uma leitura
adicional pode suspender a atualização e fechar temporariamente a trava.

Os 2 GB são RAM total do sistema. Preserve as otimizações low-end do original,
teste memória de ambos os processos CarLink e não use `largeHeap` como promessa
de desempenho. Essa opção já pertence ao original. Este protótipo não foi medido
na sua central; metas devem ser aferidas por `adb shell dumpsys meminfo` e testes
longos com projeção, áudio e OBD simultâneos.

## Compilação e validação

JDK 25, SDK 36/37, build-tools 35/36, NDK 29.0.14206865 e 28.2.13676358, CMake
3.22.1, conforme `BUILDING.md`. O módulo Java de testes usa JDK 17 (resolução de
toolchain automática já configurada pelo projeto).

```
python3 scripts/resource_collisions.py --check
./gradlew :jarvis-core:test :app:assembleDebug :jarvis-phone:assembleDebug
./gradlew :app:testDebugUnitTest :jarvis-phone:lintDebug
```

Para compilar somente o companheiro Samsung, sem configurar/baixar os motores
nativos da central, use `./gradlew -Pjarvis.phoneOnly=true :jarvis-core:test
:jarvis-phone:assembleDebug`. SDK 37 corresponde ao pacote `platforms;android-37.0`
no sdkmanager; instale também build-tools 37.0.0. O APK completo da central continua
exigindo ambos os NDKs do original.

O workflow `.github/workflows/jarvis-apk.yml` executa esses passos em push para
`main`/`jarvis/**`, pull requests e acionamento manual. Publica artifacts privados
do run conforme a visibilidade do repositório, sem criar Release nem exigir secrets.
Os APKs da central e do Samsung têm jobs independentes, para que uma falha na
compilação nativa da central não interrompa a verificação do companheiro.
Inclui APKs debug, checksums, licença, créditos e fonte correspondente. Um workflow
configurado só é validado após execução bem-sucedida; não confunda configuração com
APK já compilado. Retenção e acesso aos artifacts seguem as políticas GitHub.

O pacote da central é `io.github.odiogo19tst.carlink.jarvis.hudtest`; o do Samsung,
`io.github.odiogo19tst.jarvis.phone`. O updater oficial do CarLink permanece
desabilitado pela identidade diferente e verificação de assinatura original.
Não use o script de release upstream para publicar esta edição: signing e destino
precisam de uma configuração de produção própria.

Antes de uma versão usável, valide: instalação limpa em Android 11 ARM32/64;
pareamento/reconexão; Android Auto USB e Wi-Fi por 30 minutos; play fora/dentro
da projeção e com player ativo; cancelamento/perda Bluetooth; suspensão/rotação;
microfone e áudio com chamada; comandos offline com dados móveis desligados;
PID ausente, timeout, falhas/múltiplas ECUs; revogação imediata em movimento e
expiração; rejeição de outro par; IDs ausentes/duplicados; memória e temperatura.
Sem estes testes no hardware, o resultado é um protótipo de desenvolvimento.

## Informações para a próxima etapa

Modelo/CPU e arquitetura real da central, build Android, modelo/versão One UI do
Samsung, tipo/marca do controle, códigos Android recebidos pelo play, modelo/ano/
motorização do carro e adaptador OBD. Essas informações determinam o que se pode
integrar e validar sem depender de APIs privadas do fabricante.
