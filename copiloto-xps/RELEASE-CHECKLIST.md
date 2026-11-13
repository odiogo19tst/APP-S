# Grauê XPS 1.30.3 — critérios para aprovar a versão no celular
**Pacote:** br.com.dodigital.copilotoxps | **versionCode:** 48 | **Assinatura SHA-256 esperada:** 0236ff9f602daa3ad99c90b66fcf7bedc363dd511e8d4f2f51b6181081aa127f

## Antes de instalar
- [ ] Exportar repertório, bibliotecas e kits de bateria; guardar backup fora do app.
- [ ] Gerar APK a partir do GitHub Actions da branch de desenvolvimento com CI verde.
- [ ] Assinar com o JKS permanente privado; conferir certificado com apksigner.
- [ ] Instalar **por cima da 1.30.2**, sem desinstalação; confirmar preservação de repertórios, preferências e favoritos.

## Ensaios visuais e fluxos offline
- [ ] Abrir Palco: cifra imediatamente visível; botão Ocultar cifra funciona.
- [ ] Entrar/sair de Ao Vivo e rotacionar o Samsung: controles não se sobrepõem e cifra continua legível.
- [ ] Favoritos físicos: bancos 0–9, cada um com dez posições 00–09; não mostrar dados falsos.
- [ ] Repertório e kits: editar um item, fechar/reabrir o app e confirmar que dados de outros módulos permanecem.
- [ ] Drum pads locais, sequenciador e temporizador operam sem travar a interface.

## Com Roland XPS-10 conectado
- [ ] USB conectado antes de abrir o app: conectar sem solicitar ação adicional quando houver só um dispositivo.
- [ ] Desconectar durante a conexão; não deve haver porta fantasma nem envio MIDI.
- [ ] Reconectar e alternar com o botão Atualizar MIDI; entrada, saída e instrumentos respondem.
- [ ] Enviar mudança de timbre de teste em volume baixo e confirmar por leitura SysEx.
- [ ] Ler USER e Performance somente após resposta válida; conferir favoritos físicos em backup real.
- [ ] Testar pedal, filtros e 3 MFX sem salvar em banco USER sem confirmação.

## IA e serviços externos
- [ ] Verificar modelo .task realmente compatível e carregado; na ausência, guia determinístico sem prometer resposta neural.
- [ ] Validar Cifra Club (cookies/login) e Louve com dados públicos; nenhuma API privada assumida.
- [ ] Em show, Jarvis não deve tocar áudio/falar ou enviar MIDI por conta própria.

**Status:** software testado por CI quando aprovar; **teste físico e instalação de atualização ainda precisam de confirmação do proprietário**. A existência de código/ferramentas não implica validação de dispositivos.
