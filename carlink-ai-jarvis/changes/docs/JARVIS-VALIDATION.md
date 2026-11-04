# Validação da revisão de permissões 0.1.1

Revisão de 4 de novembro de 2026. Não houve instalação nem execução de APK nos
aparelhos do usuário nesta sessão.

## Evidência inicial

O print do Samsung mostra o bloqueio de instalação pelo Play Protect para o APK
antigo chamado “CarLink AI — Jarvis Edition”, que pertence à central. O manifesto
da central declarava JarvisAccessibility e herdava WheelKeyService e
UsbAutoConfirmService dos motores. O APK Samsung não declarava Acessibilidade.

A [orientação oficial do Google](https://developers.google.com/android/play-protect/warning-dev-guidance)
associa essa categoria de bloqueio à instalação externa com certas capacidades
sensíveis, entre elas Acessibilidade. Isso sustenta a remoção de capacidades;
não permite garantir que este seja o único sinal considerado pelo Play Protect.

O APK antigo da central teve assinatura v2 validada com a biblioteca oficial
Android apksig, sem erros, certificado Android Debug. O checksum confere com o
arquivo incluído no pacote. Essa verificação é de integridade; não atesta ausência
de malware nem explica sozinha o bloqueio. O APK antigo não é a entrega corrigida.

## Correção e verificações

- Removidos do manifesto final os três serviços de Acessibilidade e a permissão
  de instalar outros pacotes, inclusive declarações herdadas.
- Retirados do código Jarvis os comandos início/voltar/ler tela/cliques.
- Serviços opcionais herdados ausentes não provocam autorização/restauração,
  conexão ADB ou botões de ativação.
- Pacotes Android preservados; nomes e arquivos distinguem central e celular.
- Testes do contrato de permissões e verificação de colisões de recursos passaram.
- Compilação, lint, testes Android e inspeção dos manifestos/APKs corrigidos devem
  ser registrados a partir do resultado da execução desta revisão. A configuração
  do workflow não equivale a build aprovado.

## Limites

Sem teste físico de instalação/Play Protect, Android Auto, volante, áudio/microfone,
ELM327, veículo, reconexão, RAM ou temperatura. Não se declara aprovação Google,
certificação, segurança total ou prontidão para uso diário.

Os APKs corrigidos são builds de teste com chave de depuração, sem identidade de
assinatura de produção. Não desative proteções do Android para instalar.
