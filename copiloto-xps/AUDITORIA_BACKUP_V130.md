# Cobertura do backup e MIDI — Grauê XPS 1.30

Arquivo analisado: XPS10.SVD, 33.868.848 bytes.
SHA-256: f940404900fde718bfdba9f49620fe8c142e44324ae0cbd072ee782980f18afe.
O arquivo original não foi modificado e não está incluído no repositório nem no APK.

## Estrutura confirmada

Diretório SVD1/XPS0 com dez blocos, contínuos, terminando exatamente no fim do arquivo.
PRFbXPS0 contém 128 registros de 1.220 bytes; PATaXPS0 contém 256 registros de 664 bytes. Os nomes iniciais de cada registro usam caracteres de 7 bits empacotados, em ordem MSB-first. Todos os 128 nomes de Performances e 256 nomes de patches deste arquivo passaram na validação ASCII. O leitor Java foi testado com o arquivo real localmente; a CI usa somente um arquivo sintético.

Primeiros nomes de Performance observados: RhodesAffair, Grand Filmes, Lead & Ep.

RHYaXPS0 tem 8 registros; SYSaXPS0 tem 1 registro. VISaXPS0, SCSaXPS0, SPFbXPS0, WPFaXPS0, BSTaXPS0 e WVDaXPS0 também estão presentes. A existência de um bloco não comprova a semântica de cada bit dentro dele.

## O que faltava e o que foi implementado

Antes desta versão, o app apenas guardava a cópia binária e mostrava cabeçalho. Agora lê o diretório, valida limites e tamanhos e apresenta os nomes reais de Performance e USER. Nomes de Performances vindos do SVD aparecem como “backup”, em cache separado das respostas MIDI. Não representam a Performance ativa.

O motor MIDI existente cobre Setup, Performance Common, 16 partes/zonas, MFX, chorus, reverb, Rhythm Group e leitura de nomes de patches. Há um conjunto limitado e explícito de parâmetros permitidos para escrita. Não existe correspondência completa de todos os parâmetros SVD para o editor, nem restauração geral do arquivo via MIDI.

Os dados SVD são empacotados; não podem ser transmitidos diretamente como payload DT1. Os 100 FAVORITE físicos continuam sem decoder confirmado. Nenhuma tabela, nome ou posição é fabricada.

## Visor e sistema

O manual do proprietário lista LCD Contrast entre os ajustes de sistema, mas a implementação MIDI publicada não lista um endereço LCD/Display Contrast, nem uma tabela FAVORITE. Não afirmar que todo ajuste do painel está acessível via MIDI. A ausência no documento não prova impossibilidade por protocolos proprietários; requer evidência específica.

Fonte MIDI: https://static.roland.com/assets/media/pdf/XPS-10_MIDI_Imple_e01.pdf
Manual: https://static.roland.com/assets/media/pdf/XPS-10_e02_W.pdf

## LouveApp

Importa escala compartilhada ou colada: ordem, artista, tom, BPM, cifra, vídeo, letra e áudio. Não inventa acordes a partir de URLs. Uma fila abre os links HTTPS do Cifra Club no WebView existente e tenta o extrator do conteúdo exibido. Login, bloqueio ou conteúdo ausente geram pendência com opção de repetir; cancelar preserva as cifras já importadas. As músicas só entram no repertório após o parser identificar acordes reais. Transposição para o tom solicitado exige tom explícito na fonte; sem ele, o texto é preservado e a interface pede conferência. Não foi feita validação do lote no telefone físico.

## Assinatura

As assinaturas Android Debug anteriores eram efêmeras. A CI agora gera artifact UNSIGNED, e a entrega precisa ser assinada com a chave permanente documentada em SIGNING.md. Os dados privados de assinatura não estão no repositório.
