# Grauê XPS — referência de continuidade

Versão 1.28.0-consolidado, versionCode 43.

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
