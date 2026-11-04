# CarLink — Jarvis Edition: configuração do teste 0.1.1

## Escolha o APK pelo aparelho

- `CarLink-Celular-Samsung.apk`: Samsung com Android 11 ou posterior.
- `CarLink-Central-Multimidia.apk`: central Android do carro; alvo Android 11,
  aproximadamente 2 GB de RAM, ARM32 ou ARM64.

Confira `SHA256SUMS.txt` antes de instalar. A assinatura é de teste, sem certificação
Google. Mantenha o Play Protect ativado; se o bloqueio continuar, interrompa a
instalação e registre o aviso. A correção não comprova aprovação pelo Google.

## Recursos retirados e preservados

Esta edição não declara serviços de Acessibilidade. Remove leitura/cliques de tela
Jarvis, atalhos globais de volante por Acessibilidade e confirmação automática de
diálogos USB. Início, voltar, ler tela e acionar controles não são mais comandos.
Atalhos especiais BYD/Siri/zoom/chamadas dependentes do serviço global ficam
indisponíveis. Confirmações de USB pertencem ao usuário. A permissão de instalar
outros pacotes foi removida, incluindo a declaração herdada do motor; o atualizador
oficial já não atendia à identidade/assinatura Jarvis. Não há mecanismo alternativo
para reativar essas capacidades.

Projeção Android Auto, Bluetooth, voz/TTS e OBD somente leitura permanecem.
Compatibilidade depende de firmware, Wi-Fi, áudio e perfis Bluetooth da central.
CarPlay exige recursos privados de identidade do acessório não incluídos nesta
compilação comum. Nenhuma credencial de terceiros é distribuída.

## Configure estacionado

1. Instale o app Celular Samsung no telefone e o app Central Multimídia no carro.
2. Pareie Samsung e central pelas configurações Bluetooth Android. A ponte usa
   RFCOMM clássico e par previamente aprovado. Algumas centrais expõem Bluetooth
   apenas ao MCU proprietário; a ponte não funciona nelas.
3. Abra CarLink na central e configure Android Auto por USB ou sem fio, confirmando
   pessoalmente os diálogos USB. A projeção é independente da sessão Jarvis.
4. Abra “Jarvis • Central Multimídia”, conceda Bluetooth, escolha o Samsung pareado
   e inicie a sessão. No app Samsung escolha a central pareada e conecte.
5. Para OBD, pareie um ELM327 Bluetooth clássico no Samsung, selecione-o e conecte.
   BLE, Wi-Fi, USB e respostas ambíguas de múltiplas ECUs não são suportados.
6. Para abrir Maps/Spotify locais na central, confirme estacionamento nela. A
   autorização dura dois minutos e exige velocidade OBD zero recente. Movimento,
   dados ausentes/inválidos, desconexão, expiração ou “parar” revogam a autorização.
7. Fale pelo botão do Samsung ou teste o play do volante. MediaSession e eventos da
   tela dependem de firmware, outros players e da projeção; não há captura global
   garantida dos controles.

Comandos: “abrir mapas”, “abrir spotify”, “rotação”, “temperatura”, “velocidade”,
“falhas” e “parar”. Nenhum comando limpa falhas ou escreve no veículo.
OBD é informativo; um código de falha não é diagnóstico mecânico.

O reconhecedor e TTS são os configurados no Samsung. A preferência offline pode
ser ignorada pelo fornecedor; instale português offline e valide sem internet.
Selecione no Android a saída de áudio do carro. O app não força perfil Bluetooth,
alto-falante nem exclusividade de microfone.

## Sessão e limites

A sessão pertence à tela, dura até quinze minutos e pode encerrar por rotação,
processo morto, economia de bateria ou fechamento. Deixe Jarvis aberto no Samsung
para reconhecer voz. Não há serviço permanente, palavra de ativação, gravação
contínua, OCR, captura de tela, LLM ou envio adicional de OBD à nuvem.
Reconhecedor/TTS e os motores de projeção têm políticas próprias.

A ponte aceita somente o par aprovado, mensagens limitadas e comandos conhecidos.
A segurança depende também do pareamento e dos aparelhos. Velocidade zero não
prova estacionamento; a confirmação humana continua necessária. A trava experimental
não substitui os sistemas de segurança do veículo.

Valide nos aparelhos: instalação e Play Protect, pareamento/reconexão, Android Auto
USB/Wi-Fi prolongado, volante com player/projeção, áudio/microfone com chamadas,
voz offline, ELM real, timeout/dados ausentes, revogação, RAM e temperatura.
Não configure nem teste interação de telas enquanto dirige.

## Compilação e identificação

JDK25 para Gradle, JDK17 para testes Java; SDK36/37.0; NDK29.0.14206865 e
28.2.13676358; CMake3.22.1. A opção `-Pjarvis.phoneOnly=true` compila o Samsung sem
configurar motores nativos. Consulte `BUILDING.md`.

Execute testes do núcleo, testes relevantes dos motores, lint do celular e
`scripts/jarvis_manifest_contract.py` nos dois manifestos mesclados.
Esse contrato inclui permissões/componentes herdados das dependências.

Pacotes preservados: central `io.github.odiogo19tst.carlink.jarvis.hudtest`;
Samsung `io.github.odiogo19tst.jarvis.phone`. Os nomes distinguem o destino do APK;
a identidade não mudou para evitar análise de instalação.
Distribua APKs, checksums, licença/créditos e fonte completa correspondente juntos.
Não publique chaves privadas nem use a identidade de assinatura original.
