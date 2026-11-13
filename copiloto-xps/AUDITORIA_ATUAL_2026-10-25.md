# Auditoria Grauê XPS — versão atual (base 1.14)

Esta revisão parte da branch `feat/copiloto-xps` na versão 1.14, não de builds antigos. **Não é prova de 100% de funcionamento em hardware.** Os testes do GitHub não conseguem operar o Roland XPS-10 físico nem um celular Samsung real.

## Correções realizadas na versão 1.15
- Persistência: `xpsToneCache` agora é salvo junto com repertório, favoritos, performances e DrumStudio. Antes, salvar qualquer outra alteração podia eliminar o cache JS de USER.
- Catálogo: leitura `userTones` só substitui o cache se retornar entradas válidas. Sem resposta SysEx, o último cache e os timbres de fábrica são preservados.
- CI: checagem sintática de **todos os JavaScript** do app, auditoria do catálogo completo de 1564 timbres e verificação das pontes Android existentes (pads de amostras, biblioteca de ZIP, MIDI, memória e estado).
- Mantidas sem regressão as melhorias já existentes na base 1.14 (DrumStudio, faders físicos, performances, backups, API OpenAI, Gemma e fluxos do Palco).

## Resultado por módulo

| Módulo | Situação por inspeção do código | Verificação física necessária |
|---|---|---|
| USB-MIDI | Conexão e envio automático; fluxo `initialSync` investiga SysEx antes de fazer leituras longas | Confirmar driver USB GENERIC, autorização, ida e volta, Device ID e canal |
| Catálogo factory | Contém os 1564 timbres XPS-10, disponível offline | Validar as Bank Select + Program Change em Patch e Performance |
| USER | Cache persistido, preservado em timeout | Verificar os dados recebidos em consulta SysEx real |
| Favoritos do Grauê | Os bancos locais 0–9 pertencem ao app | Conferir carregamento e reabertura |
| FAVORITE físico Roland | Os 100 favoritos do instrumento **ainda não foram importados**. O manual documenta painel FAVORITE e backups; não foi validado um endereço SysEx de leitura desse cadastro | Fornecer backup real não sensível para análise somente leitura e mapear formato |
| DrumStudio / biblioteca | Motor Android `PadSampleEngine`: 5 bancos, 8 pads, sons WAV originais Grauê, importação de áudio individual, até 8 arquivos e ZIP | Testar reprodução, latência e saída do celular para mesa de som |
| Drums XPS | Kit MIDI Roland controlado no canal indicado | Testar som gerado pelo teclado, independente da saída do celular |
| Cifra e repertório | Parser, persistência, transposição e navegação WebView implementados | Login Cifra Club e importação podem depender do site |
| Performance / mixer / faders | Leitura/edição com proteção e readback parcial | Validar partes, efeitos e latência em hardware |
| IA local e OpenAI | Integração preparada para Gemma e API direta; memória personalizada | Instalar modelo e verificar chave, saldo, capacidade e respostas no dispositivo |
| Backups | Importação e cópia sem escrever no teclado | Leitura do formato proprietário, favoritos e mesclagem **não implementadas** |
| Ao vivo | Palco, pads, repertório, atalhos e sugestões silenciosas | Conferir usabilidade sob pressão, sem depender de menus |

## Itens não comprovados pela auditoria de código
1. Que comandos MIDI de troca realmente alteram o timbre audível do XPS-10.
2. Que os 100 favoritos físicos do Roland podem ser lidos via USB-MIDI — **não reivindicar importação**.
3. Que a Gemma roda com desempenho adequado no Samsung e que a chave OpenAI tem créditos ativos.
4. Que todos os WAV/MP3/OGG e ZIP de terceiros importam e reproduzem sem falhas.
5. Que todas as telas estão livres de problemas visuais em retrato e paisagem.

**Teste recomendado:** conecte o XPS-10 com driver `GENERIC`, confirme a leitura SysEx, escolha Pf001 e outro timbre, depois abra DrumPads, teste os sons originais do Grauê com áudio no celular e reconfirme USER após fechar/reabrir. Guarde os backups antes de alterações.
