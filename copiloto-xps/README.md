# Copiloto XPS 0.6 — prévia funcional Android

Aplicativo para acompanhar um Roland XPS-10 por MIDI USB e analisar o ambiente pelo microfone. Não processa o áudio do PA; comandos MIDI e pads podem alterar ou produzir som no teclado. Android 8+; alvo de teste físico: Samsung S25 FE.

## Funções implementadas
- Palco: notas MIDI, sustain por canal, acordes (tríades, sétimas, suspensos e add9), inversões, graus, teclado gráfico e histórico de velocidades.
- Áudio: captura local, nota monofônica e estimativa heurística de tom. Banda polifônica/ruído pode confundir a análise. Índice de confiança não é probabilidade.
- Repertório persistente: edição, importação JSON/ChordPro, exportação JSON, transposição da cifra, BPM/tap tempo, avanço programado, rolagem da letra, aviso antecipado, voicing sugerido e exemplo de empréstimo modal.
- Sons: envio MIDI explicitamente ativado, canal 1–16, CC7/10/11/71/72/73/74/91/93, preparação e aplicação de cenas de controles. Não são patches completos.
- Copiloto: guia harmônico determinístico e runtime neural offline MediaPipe 0.10.27 com importação de modelo .task. O modelo não está incluído. GGUF não é compatível. Respostas neurais nunca executam comandos.
- Temas claro/escuro e análise musical local. Permissão de internet usada pelo navegador Cifra Club.

## Usar
1. Instale o APK de `Copiloto-XPS-0.6-APK` nos artifacts do GitHub Actions.
2. Conecte o XPS-10 por USB e toque em Conectar USB; selecione o dispositivo.
3. Toque notas e confira o teclado gráfico. O cabo USB transporta MIDI, não o áudio do XPS-10.
4. Ative Ouvir ambiente e autorize o microfone. Confirme o tom manualmente; a estimativa não muda a referência sozinha.
5. Salve uma música em Repertório. Iniciar segue o BPM, não a execução da banda. Ajuste o ponto com as setas.
6. Sons: escolha canal, prepare sliders, ative envio e toque em Aplicar. Confira o efeito no teclado. 64 é neutro nos offsets de cutoff/ressonância/attack/release.
7. IA: obtenha modelo .task compatível conforme documentação Google, aceite a licença do fornecedor e importe em Ajustes. Primeira pergunta carrega o modelo. Compatibilidade/memória/latência ainda precisam de teste físico.

## Limitações / trabalho ainda pendente
- Sem sincronização direta LouveApp/Cifra Club; depende de documentação, credenciais e permissão de integração. Assinatura Pro não é uma credencial API.
- Sem leitura da tela do editor EXE/APK; o EXE fornecido não contém o código-fonte Android.
- Leitura e edição SysEx implementadas para Performance, partes, zonas e controles gerais MFX/chorus/reverb. Parâmetros específicos de cada algoritmo MFX ainda não possuem editor. Undo restaura somente os campos da última edição SysEx com leitura anterior conhecida. Sliders CC continuam sendo valores preparados no app.
- Sem correção automática de notas no PA, reconhecimento robusto da posição da banda na música ou tempo estimado do áudio.
- O teclado gráfico mostra C3–C5; notas fora da faixa aparecem no texto.
- Modelo neural não acompanha o APK. Nenhuma promessa de inteligência ilimitada ou desempenho por tamanho de arquivo.
- Build/lint e testes automatizados não substituem validação USB/microfone/modelo no S25 e XPS-10.

## Desenvolvimento e fontes
JDK 21 (fonte Java 17) / Gradle 8.9 / SDK35. `gradle :app:assembleDebug :app:lintDebug`; `node tests/music.test.js`. Workflow também executa testes Java de áudio/harmonia/parser MIDI.

- Roland MIDI implementation: https://static.roland.com/assets/media/pdf/XPS-10_MIDI_Imple_e01.pdf
- Runtime local: https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference/android
- LouveApp: https://louveapp.com.br/

A WebView dos controles carrega apenas assets locais, bloqueia rede e não usa HTML interpretado para letras/importações/respostas. O navegador online usa outra WebView sem bridge MIDI. Bridge MIDI valida canal, CC e valores. Importação musical limitada a 1 MB; modelos copiados em streaming. Nenhum executável de terceiros redistribuído.


## Novidades 0.3 — timbres e leitura do XPS-10

- Catálogo com 1.564 timbres, extraído da lista oficial Roland eng02: busca por nome, filtro por categoria e favoritos persistentes. Não redistribuímos o PDF nem amostras de áudio.
- Troca de timbre por parte, via MSB/LSB/programa. A tela mostra programas 1–128; o protocolo envia 0–127.
- Ler XPS-10 consulta Setup, Performance Common, 16 partes, 16 zonas, 3 MFX, chorus, reverb e 16 patches temporários. Somente blocos que responderam são exibidos como lidos.
- Ler timbres de usuário consulta as 256 posições User Patch e seus nomes (cerca de 30 segundos), sem trocar o timbre em uso. A lista desta leitura vale para a conexão atual. Não inclui biblioteca de samples de pendrive nem os 8 User Rhythm.
- Seleção de nome personalizado e envio para a parte escolhida. Dados de timbres de usuário não são confundidos com a lista de fábrica.
- Camada/split nas partes 1 e 2 e edição individual das zonas por canal. As partes precisam de canais diferentes. Outras zonas podem continuar soando; confira quais estão ativas.
- Tipo e envios MFX, roteamento da parte, tipos/níveis chorus e reverb. Aplicar MFX seleciona explicitamente a fonte Performance.
- Cada edição exige leitura anterior e envio ativado. Depois do envio, o app faz nova consulta e informa se os valores foram confirmados. Disconnect/background cancela a fila. Desfazer restaura os campos anteriores, não um backup completo da Performance.
- Nenhum comando grava bancos User. Para guardar alterações temporárias após desligar, use WRITE no teclado.

### Fluxo para trocar um timbre
1. Palco > Conectar USB.
2. Sons > Ler XPS-10. Device ID esperado: 17 (10h).
3. Se necessário, ative envio e toque em Entrar em Performance; aguarde a nova leitura.
4. Escolha a parte, busque o nome ou consulte os timbres de usuário e selecione um.
5. Ative envio MIDI e toque em Trocar timbre nesta parte. Aguarde a confirmação de leitura.

Fonte do catálogo: https://static.roland.com/assets/media/pdf/XPS-10_ToneList_eng02_W.pdf
Extração reproduzível: `python scripts/extract_tones.py /caminho/lista.pdf` (PyMuPDF).
Protocolos e testes usam o mapa Roland MIDI e01: endereços base-128, checksum, RQ1 com bloco/tamanho documentado e DT1 apenas em campos permitidos. Os testes incluem pacotes fragmentados, realtime, dados inválidos, faixas, catálogo e fluxo da interface. A validação no equipamento físico continua pendente.


## Novidades 0.4 — instalação da IA e compartilhamento

- O Android oferece Copiloto XPS como destino de compartilhamento `text/plain`. O texto recebido fica para revisão em Repertório; importar exige toque explícito. Links isolados não são buscados nem tratados como cifra.
- Importação de linhas de acordes e ChordPro. Ampliação da notação: maj9, 7M, m9, m11, m6, m7b5/m7(b5), dim7, aug, 6, 9, 11, 13, 7sus4.
- Botões abrem LouveApp/Cifra Club no navegador externo. Isso não é sincronização de contas/API. Não foi encontrada documentação oficial suficiente para implementar a sincronização nesta sessão.
- Tipos MFX pelo nome (78 algoritmos + sem efeito), conforme a lista Roland. O manual de parâmetros abre no navegador externo. A lista descreve controles, mas não fornece a correspondência completa de cada controle ao índice MIDI interno: editor detalhado ainda depende dessa validação.
- Instalação neural: botão para a página do modelo compatível, status/tamanho local, progresso de cópia, carregamento de verificação antes de substituir o modelo anterior e teste de uma resposta. Contexto limitado a 1024 tokens e pergunta a 1500 caracteres. O arquivo .task deve ser compatível com MediaPipe; formatos GGUF/.litertlm não são aceitos pelo runtime atual.
- A página Gemma exige login e aceite da licença do fornecedor. O modelo não é redistribuído pelo app. Sem um modelo importado, o guia musical determinístico funciona, mas não há conversa neural.

Fontes: https://huggingface.co/litert-community/Gemma3-1B-IT e https://static.roland.com/assets/media/pdf/XPS-10_EffectList_e01.pdf

Pendências reais: validação física da inferência/USB/áudio no S25; APIs dos serviços externos; mapeamento completo de parâmetros internos MFX; acompanhamento automático da posição e andamento da banda; correção de notas no áudio PA. Nenhuma dessas funções é simulada como concluída.


## Novidades 0.5 — operação ao vivo e pads

- Painel Ao vivo reúne repertório, timbres/favoritos, kits de bateria, leitura, ativação MIDI, parte e volume. Modo palco oculta gráficos de estudo e dicas extras.
- Seleção de timbre em janela dentro do Palco, por famílias equivalentes aos grupos do teclado; aplicação explícita na parte escolhida. A confirmação ainda exige retorno MIDI do equipamento.
- Músicas com categoria editável e filtro no Repertório; categorias preservadas na exportação/importação JSON. Timbres agrupados por Piano, Teclas, Cordas/Guitarra, Metais/Baixo, Synth, World, Bateria/FX, Sample e Usuário.
- Oito pads na tela enviam Note On/Off por MIDI, com canal, intensidade e notas configuráveis/persistentes. Ao abrir Kits de bateria após leitura, o canal dos pads acompanha o canal da parte escolhida. Selecione o kit e aplique antes de tocar. Os nomes dos pads são referências GM e podem variar nos kits eletrônicos.
- Pads exigem envio MIDI ativado. As notas emitidas são soltas após 120 ms, ao desativar envio ou ao sair do app. Botão Soltar notas dos pads encerra notas ainda mantidas pelo aplicativo.
- São pads MIDI na tela, não controle dos AUDIO PAD físicos, sequenciador de batidas, importador de samples ou editor de kits. Esses recursos não estão implementados.
- Testes da interface cobrem categorias, seleção de kits, troca de programa sem alterar outros campos, mapeamento dos pads e volume no canal lido. Validação física dos novos controles permanece necessária.


## Novidades 0.6 — Cifra Club e paisagem

- Navegador Cifra Club incorporado em painel separado: ao lado dos controles em paisagem e abaixo em retrato. Botões Voltar, Recarregar, Início, Externo e Fechar. Cookies próprios da WebView persistem; cookies de terceiros desativados. Sem bridge JavaScript, acesso a arquivos, captura de credenciais ou comandos MIDI no conteúdo remoto.
- Login feito diretamente no site. Compatibilidade de login e recursos Pro depende de teste físico; provedores como Google podem rejeitar WebViews. Externo abre o navegador do aparelho, mas não transfere sua sessão para o painel. Não contornamos restrições do provedor.
- Não extrai cifras nem entrega automaticamente a página à IA. Navegação autenticada não equivale a sincronização API ou acompanhamento da rolagem.
- Rotação liberada sem recriar a Activity nas mudanças de orientação/tamanho. Modo show solicita paisagem e preserva controles do Palco, tom, notas/acorde, acompanhamento, USB/microfone e acesso às demais abas. Sair do show devolve rotação automática.
- Atalhos para efeitos CC (cutoff, ressonância, ataque, release, reverb, chorus, expressão), desfazer última edição SysEx e liberar sustain/notas nos 16 canais. O último botão é de emergência e pode interromper notas tocadas; não restaura timbres/efeitos.
- No S25, validar rotação durante MIDI, proporções do painel, acesso ao Cifra Club, login, cookies e resposta dos controles. Testes de interface não substituem esses testes físicos.
