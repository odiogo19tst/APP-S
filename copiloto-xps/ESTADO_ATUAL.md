# Grauê XPS — referência de continuidade

Versão em desenvolvimento: 1.32.0-palco, versionCode 58.
Base confirmada: 1.31.2 / PR #71 integrado (ee2aff6033ce32bc816596ca325d4696e61216c1).

## Layout 1.32

Nova camada de apresentação layout-v3.js/css sobre os serviços existentes. Painéis grafite, acento verde suave, menos gradientes, tipografia e hierarquia consistentes. No celular, navegação inferior: Palco / Repertório / Sons / Pads / Mais. Mais mantém Jarvis, Backups, Ajustes e Atualizar MIDI. Os botões originais são movidos com seus IDs e callbacks, nunca clonados; nenhum comando MIDI é emitido pela camada visual.

Palco destaca música, transporte e cifra. Metrônomo, favoritos, sugestões, acorde de apoio e preparação ficam recolhíveis. Atalho Favoritos abre o painel antes de rolar até ele. O looper preserva REC/PLAY/STOP e quatro pistas à vista; BPM, compassos, mute, apagar e instruções ficam em opções. Sons usa seletor compacto de editor; controles internos são agrupados em cartões. Acessibilidade: nomes nos ícones, foco, Escape no menu, áreas de toque e preferência de movimento reduzido. Indicador USB distingue desconectado, MIDI e SysEx usando os eventos reais.

Verificação: regressões existentes e teste funcional da navegação/movimentação de controles. Prévia pelo navegador indisponível neste ambiente: política recusou URL file://; não foi feita tentativa de contornar. Aparência final ainda deve ser conferida no Android real. Looper, edição SysEx, repertório, timbres e IA preservados.

Base: 1.31.1 com MIDI Looper / PR #70 integrado.

## Editor interno: mapa original recuperado

Implementados 244 parâmetros do MIDI Implementation XPS-10 e01 (29 páginas), grupos Patch Common/Matrix, TMT e Patch Tone. WG, Pitch Envelope, TVA Envelope/BIAS, TVF/Envelope, LFO1/LFO2/16 steps, fontes/destinos Matrix e switches por Tone, recepção e faixas por Tone estão no catálogo.

Sons → Editor 4 Tones → selecione parte → Ler Patch completo. O app lê seis blocos (Common, TMT e quatro Tones) da memória temporária da parte de Performance. Exige Performance real e Patch melódico; rejeita Rhythm e não usa o mapa de Patch Mode 1F. Depois da leitura, escolha grupo/Tone, prepare valores MIDI e aplique. Validação Java por ID do catálogo, largura e limites; endereços são calculados internamente. Escrita sempre no buffer temporário 11–14; nunca USER 20/30/40. Releitura confirma valores; Desfazer conserva bytes anteriores e bloqueia se o teclado mudou.

A referência persistente é spec/patch-parameters.json, com URL/hash do PDF e páginas. scripts/generate-patch-catalog.py gera o mesmo catálogo para Java e WebView. Valores multibyte são nibbles, endereços em base128. Parâmetros reservados/ignorados e opções de saída marcadas --- são rejeitados. Fontes Matrix mantêm CC33 no índice 33 (não comprimir o buraco de CC32).

A Gemma pode propor operações kind=patch somente por IDs e valores do catálogo. A aplicação é manual, só aceita leitura MIDI real e revisão do Patch vigente. A IA não gera SysEx. Inferência real, ajustes sonoros e latência ainda requerem validação no Android/XPS-10 físico; não declarar essas validações concluídas. Favoritos físicos continuam pendentes.

Referência anterior: 1.31.0 (PR #69, fae8ddb51bb81c9e2696da0e5032684a32343e96).

## MIDI Looper preservado (PR #70)

Pedido do Diogo: gravar o que toca no XPS-10 em MIDI e repetir ao vivo com som saindo nas saídas do próprio teclado. Uma conexão USB global, sem habilitação extra de envio. Controles REC/PLAY/STOP no Palco e no Ao Vivo. Quatro pistas, overdub, BPM, batidas e compassos.

Implementado nesta revisão:
- REC captura um ciclo e inicia PLAY automaticamente; overdub é armado para a próxima volta.
- Quatro pistas, selecionar, silenciar e apagar com confirmação. Overdub adiciona sem apagar o conteúdo anterior.
- Notas, sustain CC64, modulação CC1, expressão CC11 e pitch bend; canais originais preservados. Program Change, Bank Select, SysEx e clock não são gravados nem repetidos. Entrada não é ecoada.
- Relógio MIDI separado da interface; timestamps capturados na recepção. Pausa longa do relógio ou falha de envio interrompe a reprodução.
- STOP, Panic, saída do app, mudança de Performance/música, atualização das portas e perda de USB encerram o loop. Reconectar nunca reinicia sozinho. Note Off e pedal pendentes são reenviados ao reconectar.
- BPM e duração editáveis com o loop parado; eventos são reescalados. Em reprodução os campos ficam bloqueados.
- Correções da 1.31.0 preservadas: Próxima música usa seleção automática do setup, Reaplicar setup, status USB versus SysEx, identidade por índice e cancelamento de respostas tardias.

Limites explícitos: gravações são da sessão e ficam na RAM; fechar/matar o app perde as pistas. Timbragem segue as partes/canais atualmente configurados no teclado; o looper não grava áudio nem congela timbres/Performance. Não há quantização, sincronização com clock MIDI externo ou backup de loops nesta revisão. Precisão Android/USB e saída física no XPS-10 precisam de teste no hardware.

## Referência anterior preservada


Resumo LouveApp compacto e recolhível; lista de músicas preserva altura no celular. Remove marcadores de paginação “Parte N de N” da exibição das cifras e das próximas importações. Mesma chave permanente da 1.30.

Escalas LouveApp: colar/compartilhar, fila de cifras no WebView, tons e BPM preservados; falhas ficam pendentes. SVD: diretório e 128 nomes de Performances/256 USER validados no arquivo real; sem decoder completo de parâmetros/FAVORITE. Ver AUDITORIA_BACKUP_V130.md.

Assinatura fixa: obrigatória em todas as entregas. A CI gera APK UNSIGNED; assinar com o material privado do proprietário conforme SIGNING.md. Não distribuir APK de debug com uma nova chave.

Palco: seletor de bancos 0–9 e nove botões 1–9 substituem a grade de 16 partes. Sem leitura física dos FAVORITE, os botões permanecem sem nomes inventados e desabilitados. Edição de partes continua em Sons.

Base: feat/copiloto-xps 1.27, commit c080afd8891e49cfa2f2e9a69fa81c3dc2f5f63c.
Integra as alterações do PR #44 sem remover os DrumPads cromáticos do PR #45.
Trabalhos posteriores devem partir desta versão ou de um descendente confirmado.
Não usar o PR #33 (obsoleto) nem recomeçar da versão 1.26.

## Entregue em código
- Uma conexão global USB, leitura e envio habilitados juntos, conexão automática quando há um único dispositivo.
- Ao Vivo separado da preparação, seleção de música e cifra no palco.
- Seletor dos 12 tons e ± semitom; transposição altera apenas a cifra, sem comando de transposição MIDI.
- Rolagem lenta com acumulação de frações de pixel, também disponível no palco.
- Bibliotecas e importação/exportação dos DrumPads preservadas; teclas C–B preservadas.
- Instalação Gemma em fila separada; teste local sem encaminhamento para API; origem da resposta visível.
- Chave pessoal configurável no APK, sem chave incorporada ao repositório.

## Não tratar como resolvido
- Importação dos 100 FAVORITE físicos do XPS-10: decoder não implementado; não são os timbres USER nem os favoritos locais.
- Não há backup físico verificável no repositório usado para este trabalho.
- Recepção SysEx e troca física de Performance exigem validação no XPS-10 real.
- Samples do telefone não são enviados como áudio via USB-MIDI. Exportação de Audio Pads usa pacote para pendrive; áudio ao vivo requer conexão de áudio.
- Build/testes aprovados não substituem validação no teclado e celular.

## Verificação
Workflow .github/workflows/copiloto-xps.yml: testes JS, testes Java, bibliotecas CC0, assembleDebug e lintDebug.
A regressão score-motion-v128 simula WebView que arredonda scrollTop e confirma avanço a 1 px/s, rolagem manual e troca de painel.
