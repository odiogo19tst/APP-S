# Grauê 1.35.0 — revisão de uso e confiabilidade

1. Conexão: repetição do botão não reabre a conexão ativa; timeout ao abrir; detecção de falhas de envio; descarte de retorno de sessão encerrada; reconexão ao retomar e à identidade escolhida. Leitura de 256 USER passa a ser explícita, preservando cache e liberando o uso após a leitura ativa.
2. Retorno: operação SysEx tem identificador e estados enviado, confirmado, não confirmado, falhou e cancelado. A confirmação depende de releitura dos bytes de destino. CC sem retorno não recebe selo de confirmação.
3. Timbres: filtros de fábrica, USER e samples, categoria lembrada, busca sem acentos, favoritos e recentes existentes. O nome e origem aparecem juntos.
4. Snapshots: banco local de até 40 cópias, vinculadas pelo identificador estável da música. Guarda 51 ajustes documentados do Patch (12 por Tone e 3 de portamento), exige mesma identidade de Patch/parte, aplica diferenças pela ponte existente e preserva o estado anterior para restaurar. Não é backup integral do Patch nem gravação USER.
5. Palco: atalho de snapshots junto aos controles existentes de timbres, cenas, próxima música e looper; transposição do teclado observada separadamente da cifra. Em paisagem baixa, a barra deixa de ocupar permanentemente a tela.
6. Tom: acompanhamento opcional das próximas mudanças da cifra. Pedidos rápidos são agrupados; espera a operação MIDI e mantém apenas o último alvo. Desconexão, mudança de música e falha cancelam a fila. Não há transposição automática no mero início/render da tela.
7. Looper: identifica pistas/eventos, evita play sem pista audível e orienta reativar a pista; mensagens de exclusão distinguem sessão, pista e cópias salvas. Ajustes e arquivos respeitam os estados já existentes.
8. Recuperação: gravação local com confirmação de armazenamento, cópia anterior de alterações de repertório/cenas/snapshots, restauração explícita; exportação de backup completo e relatório limitado de diagnóstico sem repertório ou preferências/chaves API.

## Validação

Testes de lógica Node, fluxos Chromium com ponte nativa simulada, self-tests Java, assembleDebug e lintDebug. Resultados finais registrados no CI da revisão. Não confundir esses testes com validação sonora/elétrica no XPS-10 físico: esta depende do aparelho. A atualização mantém applicationId e usa a chave permanente ao distribuir o APK assinado.
