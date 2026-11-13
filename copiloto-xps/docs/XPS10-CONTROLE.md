# Controle do Roland XPS-10 no Grauê

Versão 1.34.2. Referência: Roland XPS-10 MIDI Implementation e01, páginas 11–12.
Fonte oficial: https://static.roland.com/assets/media/pdf/XPS-10_MIDI_Imple_e01.pdf

## Ampliação desta versão

32 parâmetros globais acrescentados; nenhuma contagem representa cobertura de 100% do instrumento.

| Bloco | Endereço | Novos controles |
|---|---|---|
| System Common | 02 00 00 00 | Afinação geral em quatro nibbles; transposição; volume; microafinação ativa; Patch Remain; canal de controle de Performance; canal Rx/Tx Patch; 12 afinações por nota; quatro fontes de System Control; recepção de Program Change e Bank Select |
| System Controller | 02 00 40 00 | Transmissão de Program Change e Bank Select; velocidade fixa; curva de teclas; polaridade; meio pedal; 25 funções selecionáveis do pedal |

A leitura inicial passa de 56 a 58 blocos ativos. Campos sem resposta ficam indisponíveis. Todos os novos controles apenas preparam ajustes até Aplicar. O retorno MIDI confirma os valores; Desfazer usa os bytes anteriormente recebidos. Os globais funcionam sem exigir modo Performance; edição de partes mantém essa exigência. Cenas de Performance não podem conter parâmetros globais.

Afinação geral: valor bruto 24–2024, centro 1024 (440 Hz), passo 0,1 cent. O envio é uma única região de quatro nibbles. Bytes reservados não são graváveis.

## Cobertura e pendências

| Área | Situação |
|---|---|
| Sistema global acima | Implementado nesta versão; testes de protocolo e interface; validação física pendente |
| Partes, zonas, bancos/programas, efeitos e arpejo | Controles existentes; cobertura parcial do mapa, sem alegação de controle total |
| Síntese dos quatro Tones | Editor existente com mapa validado de 244 campos; confirmar comportamento no instrumento |
| Gravação permanente em USER | O fluxo comum edita buffers; WRITE continua no teclado |
| Bancos FAVORITE 0–9 | Leitura completa diretamente pelo USB ainda não comprovada; não confundir catálogo/backup com leitura física |
| Local Switch, Tx Edit Data, Sync Mode e USB Driver | Menus presentes no instrumento; esta versão não atribui endereços SysEx sem documentação comprovada |
| LEDs físicos e botão Power | Sem comando MIDI implementado ou endereço confirmado |
| Áudio, biblioteca/sample import e operações de arquivos no teclado | MIDI não substitui transferência de áudio ou manipulação do pendrive |

## Validação

Testes automatizados cobrem limites, bytes reservados, pacote SysEx de referência, rascunho sem envio, confirmação da afinação pelo retorno, edição global em modo Patch e bloqueio durante operação MIDI. A ponte MIDI nos testes de navegador é simulada. Nenhum teste aqui certifica áudio, USB físico, persistência após desligar ou comportamento de firmware do XPS-10.
