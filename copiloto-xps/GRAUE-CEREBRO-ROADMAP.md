# Grauê XPS — o cérebro do Roland XPS-10

Documento de continuidade do projeto. **Visão de produto e critérios**, não declaração de implementação pronta. Não reiniciar os módulos existentes; desenvolver sobre `feat/copiloto-xps` e preservar o applicationId e o keystore permanente.

## Referência funcional detalhada das capturas do Eddie

**Inventário obrigatório de funções:** [INVENTARIO-EDITOR-EDDIE-2026-11-10.md](INVENTARIO-EDITOR-EDDIE-2026-11-10.md).

As capturas enviadas em 10/11/2026 documentam as opções PCH, WG, TVA, TVF, Vel/Key, LFO, MTX, Ctrl e MFX com até quatro tones, além de mixer de 16 partes, roteamento de efeitos, faixas, envelopes e controles de recepção. Não reduzir o backlog a troca de timbre ou mera leitura. **A IA é a camada que conecta e coordena módulos com parâmetros tecnicamente verificados, não o substituto dos editores de síntese.** A existência da interface antiga não comprova suporte MIDI sem testes no Roland.

## Marco 1.30.7 — editor inicial dos quatro tones (implementação verificada pelo código, instrumento pendente)
- **TVA Level 1–4**: MIDI CC80, 81, 82 e 83, conforme implementação do XPS-10 *original* de 2014. Somente após leitura do modo Performance, identificação da parte e exclusividade de canal (partes com canais duplicados não recebem o CC).
- A UI **não preenche valores atuais que não tenham sido lidos**. Envio CC à porta USB não significa confirmação do instrumento. Nada escreve permanentemente USER.
- **A fazer:** ler e editar de forma individual WG, TVA Envelope, TVF, Vel/Key, LFO, MTX e Ctrl com endereços específicos do XPS-10, readback e desfazer. Não substituir endereços do XPS-10 por XPS-10X, XPS-30 ou JUNO-Di.
- Fontes: documentação oficial [Roland XPS-10](https://www.roland.com/global/support/by_product/xps-10/owners_manuals/) e implementação 2014 acessível em [Manualzz](https://manualzz.com/doc/html/51836047/roland-xps-10-expandable-synthesizer-owner-s-manual), seção *General Purpose Controller 5–8*.

## Experiência principal
O tecladista prepara cada música antes do culto e vincula um setup ao repertório. Durante o culto **basta escolher a música**, no Palco ou no Repertório, para o Grauê solicitar automaticamente a configuração já aprovada por ele, sem nova confirmação a cada troca. Cifra, tom, BPM e anotações acompanham a seleção. Se o USB estiver desconectado, exibir falha clara sem fingir mudança no teclado. Não disparar mudanças apenas ao renderizar um painel.

## Escopo funcional permanente
1. **Conhecer o XPS-10:** mapa confiável de parâmetros do MIDI Implementation, Service Notes, estrutura de backups SVD, sem extrapolar endereços de JUNO-Di ou outras variantes; pesquisar também comunidade, GitHub, fóruns e vídeos. Classificar cada função como documentada, inferida ou testada fisicamente. Manter o Test Mode fora da automação.
2. **Editor profundo:** Performance de 16 partes, zonas, split/layer, patches e até quatro tones por Patch, síntese (wave, TVF, TVA, LFO e envelopes quando documentados), articulação/velocity, recepção de sustain, pitch bend e modulação por parte, 78 algoritmos MFX, chorus, reverb, roteamentos e favoritos. Cada comando usa tipos e limites testados.
3. **Repertório como centro:** vínculo por música para Performance USER/PRESET, timbres, partes/zonas, volume, efeitos, pad, transposição e outros parâmetros previamente ensaiados. Evoluir para snapshots por música com versões, perfil do músico, comparação, restauração e possibilidade de ajustes distintos por seção.
4. **Cérebro/IA:** inferência local funcional com modelo compatível validado no aparelho; memória musical; compreensão do estado observável do teclado, áudio e cifras; planejamento técnico; sugestões e execuções dentro das permissões definidas antecipadamente por música. Respostas de IA não são prova de leitura ou envio MIDI. IA não deve inventar parâmetros nem usar menus técnicos destrutivos.
5. **Ao Vivo:** ação em um toque, seleção rápida do repertório, cifras legíveis e rolagem lenta, feedback de estado confiável, botões claros e bem agrupados. Separar preparação em casa do painel minimalista do culto.
6. **Instrumentos musicais do app:** bibliotecas originais de DrumPads, samples locais, roteamento para áudio do celular vs MIDI para o XPS; suporte a leitura de parâmetros do Roland, sequenciador e editor avançado; não afirmar que áudio do celular percorre cabo USB-MIDI.
7. **Importação:** LouveApp (texto compartilhado), navegador Cifra Club respeitando autenticação e permissões, backups não destrutivos, timbres de fábrica/USER e 100 FAVORITE físicos somente quando o mapeamento for comprovado; não inventar registros ausentes.

## Princípios de segurança e autonomia
- Selecionar uma música com **setup salvo para troca automática** é uma autorização prévia para selecionar aquela Performance e aplicar seus ajustes reversíveis configurados. Sem popup no culto para a mesma ação.
- Não escrever em bancos permanentes USER, sobrescrever backup, redefinir o instrumento ou alterar firmware sem autorização pontual e um backup conferido. Um toque no repertório nunca implica WRITE permanente.
- MIDI/USB sem conexão ou sem retorno SysEx deve ter estado real e explicável: "solicitado" não é "confirmado".
- Recuperar estados após reconexão e impedir envios duplicados durante startup ou troca de música; parar notas presas quando necessário.
- Identidade visual própria. Inspirar-se na organização hierárquica do XPS Mobile Editor, **sem copiar UI/código/ativos**.

## Ordem de entrega

| Fase | Meta | Estado |
|---|---|---|
| 1 | Vínculo persistente música → Performance USER/PRESET e troca em um toque, sem dupla confirmação | Implementação proposta em 1.30.4; exigir CI e teste físico |
| 2 | Snapshot por música (16 partes, layers, splits, volume, MFX), conferido por SysEx e aplicação ordenada | Pendente |
| 3 | Editor de Patch por quatro tones, com parâmetros efetivamente documentados e leitura/undo | Pendente |
| 4 | IA com modelo real, conhecimento técnico, memória e planejamento/aplicação de setups | Pendente validação end-to-end |
| 5 | Leitura dos 100 FAVORITE físicos via backup e prova com instrumento | Pendente mapeamento real |
| 6 | Ensaios físicos completos, legibilidade em palco, release assinado permanente | Pendente validação de campo |

**Fora da prioridade atual**, por decisão do músico: transformar o app em roteador universal de controladores externos; baixar/comprar timbres de lojas online.

### Teste de aceitação da fase 1
1. Salvar música A com Performance USER 006 (troca automática) e música B com PRESET 002.
2. Fechar/reabrir aplicativo: os vínculos persistem, sem disparar MIDI no carregamento.
3. Com USB conectado, tocar A no repertório: observar Bank Select e Program Change da USER 006; verificar resposta e som no teclado.
4. Tocar B no Palco: solicitar PRESET 002 **uma vez**; não exigir popup adicional.
5. Sem cabo, tocar A: mostrar estado "pendente/desconectado", sem simular sucesso nem conectar ao religar sem comando explícito.
6. Editar cifra A e reimportar mesma música: setup continua intacto.
7. Remover vínculo A: selecioná-la não envia troca MIDI.
8. Concluir CI Android/JS e empacotar com assinatura permanente do aplicativo instalado.

Arquivo de referência para desenvolvimento, não comprovação de que as fases 2–6 estão prontas.
