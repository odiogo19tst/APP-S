# Copiloto XPS 0.2 — prévia funcional Android

Aplicativo para acompanhar um Roland XPS-10 por MIDI USB e analisar o ambiente pelo microfone. Não altera o áudio enviado ao PA. Android 8+; alvo de teste físico: Samsung S25 FE.

## Funções implementadas
- Palco: notas MIDI, sustain por canal, acordes (tríades, sétimas, suspensos e add9), inversões, graus, teclado gráfico e histórico de velocidades.
- Áudio: captura local, nota monofônica e estimativa heurística de tom. Banda polifônica/ruído pode confundir a análise. Índice de confiança não é probabilidade.
- Repertório persistente: edição, importação JSON/ChordPro, exportação JSON, transposição da cifra, BPM/tap tempo, avanço programado, rolagem da letra, aviso antecipado, voicing sugerido e exemplo de empréstimo modal.
- Sons: envio MIDI explicitamente ativado, canal 1–16, CC7/10/11/71/72/73/74/91/93, preparação e aplicação de cenas de controles. Não são patches completos.
- Copiloto: guia harmônico determinístico e runtime neural offline MediaPipe 0.10.27 com importação de modelo .task. O modelo não está incluído. GGUF não é compatível. Respostas neurais nunca executam comandos.
- Temas claro/escuro, processamento local, sem permissão de internet.

## Usar
1. Instale o APK de `Copiloto-XPS-0.2-APK` nos artifacts do GitHub Actions.
2. Conecte o XPS-10 por USB e toque em Conectar USB; selecione o dispositivo.
3. Toque notas e confira o teclado gráfico. O cabo USB transporta MIDI, não o áudio do XPS-10.
4. Ative Ouvir ambiente e autorize o microfone. Confirme o tom manualmente; a estimativa não muda a referência sozinha.
5. Salve uma música em Repertório. Iniciar segue o BPM, não a execução da banda. Ajuste o ponto com as setas.
6. Sons: escolha canal, prepare sliders, ative envio e toque em Aplicar. Confira o efeito no teclado. 64 é neutro nos offsets de cutoff/ressonância/attack/release.
7. IA: obtenha modelo .task compatível conforme documentação Google, aceite a licença do fornecedor e importe em Ajustes. Primeira pergunta carrega o modelo. Compatibilidade/memória/latência ainda precisam de teste físico.

## Limitações / trabalho ainda pendente
- Sem sincronização direta LouveApp/Cifra Club; depende de documentação, credenciais e permissão de integração. Assinatura Pro não é uma credencial API.
- Sem leitura da tela do editor EXE/APK; o EXE fornecido não contém o código-fonte Android.
- Sem leitura SysEx do estado real do teclado, editor MFX completo, seleção de patches, splits/camadas ou undo do estado externo. Os sliders são valores preparados no app.
- Sem correção automática de notas no PA, reconhecimento robusto da posição da banda na música ou tempo estimado do áudio.
- O teclado gráfico mostra C3–C5; notas fora da faixa aparecem no texto.
- Modelo neural não acompanha o APK. Nenhuma promessa de inteligência ilimitada ou desempenho por tamanho de arquivo.
- Build/lint e testes automatizados não substituem validação USB/microfone/modelo no S25 e XPS-10.

## Desenvolvimento e fontes
JDK 21 (fonte Java 17) / Gradle 8.9 / SDK35. `gradle :app:assembleDebug :app:lintDebug`; `node tests/music.test.js`. Workflow também executa testes Java de áudio/harmonia/parser MIDI.

- Roland MIDI implementation: https://static.roland.com/assets/media/pdf/XPS-10_MIDI_Imple_e01.pdf
- Runtime local: https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android
- LouveApp: https://louveapp.com.br/

WebView carrega apenas assets locais, não navega sites e não usa HTML interpretado para letras/importações/respostas. Bridge MIDI valida canal, CC e valores. Importação musical limitada a 1 MB; modelos copiados em streaming. Nenhum executável de terceiros redistribuído.
