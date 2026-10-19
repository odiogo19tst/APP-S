# DO LIVE — Editor Android v0.2.0 (OBS-style)

**Estúdio local Android** para compor cenas em 9:16. A versão 0.2.0 transforma a tela CAMADAS em um editor visual, em vez de apenas cadastrar textos/imagens.

## Funções do editor que já afetam a prévia

1. Abrir `CAMADAS` ou `INÍCIO > EDITAR CAMADAS E POSIÇÕES`.
2. Escolher a cena; cada cena tem fontes próprias. Fontes de câmera, texto, imagem, vídeo local, cor sólida e relógio podem ser adicionadas.
3. Tocar numa camada para selecionar; arrastar na prévia para mover; puxar a alça `◢` para dimensionar.
4. Usar controles de transformação: X/Y, largura, altura, rotação, opacidade, recorte esquerdo/superior/direito/inferior. Alterações de geometria são persistidas.
5. Reordenar (subir/descer), duplicar, bloquear, ocultar ou excluir camadas. `Ajustar à tela`, `Centralizar` e `Resetar` agilizam o enquadramento.
6. Alterar cenas, fundo, câmera frontal/traseira e exibir/ocultar o placar local.

A prévia suporta imagens do seletor Android e busca reproduzir vídeos selecionados com `VideoView` (compatibilidade depende do codec do aparelho). A captura da câmera usa Camera2/TextureView. O áudio do vídeo é reproduzido somente na prévia.

## Configurações separadas em categorias

- **Geral:** grade de encaixe, guias de enquadramento e espelhamento da prévia.
- **Vídeo:** canvas 720×1280 / 1080×1920 e perfis para saída 720p/1080p, 24/30/60 FPS.
- **Áudio:** voz TTS local do copiloto, valores desejados de ganho de microfone e amostragem.
- **Saída:** presets H.264/AAC e bitrates salvos para implementação futura de encoder.
- **Projetos:** exportar/importar JSON esquema 2, com migração automática do esquema 1 sem apagar camadas antigas.

### O que NÃO está implementado

Não transmite para TikTok, não tem ingest RTMP/RTMPS nem encoder/mixer composto, não lê presentes/chat reais. **As opções de FPS, bitrate, ganho do microfone e resolução de saída são configurações preparatórias**, pois não existe um pipeline de broadcast. A voz IA sai no alto-falante, não no vídeo de saída. Chroma key, efeitos GPU avançados, importação do formato nativo do OBS e contas TikTok não fazem parte desta versão.

## Referências oficiais do OBS usadas como especificação

- [OBS Studio Overview](https://obsproject.com/kb/OBS-Studio-Overview) — cenas, fontes, transformação, settings e Studio Mode.
- [Sources Guide](https://obsproject.com/kb/sources-guide) — pilha de camadas, visibilidade, transformações e recorte.
- [Filters Guide](https://obsproject.com/kb/filters-guide) — catálogo para etapas seguintes.

## Compilação

Android Studio / Android Gradle Plugin 8.9.2 / Gradle 8.11.1 / Java 17 / compileSdk 35. Build: `gradle :app:assembleDebug` na raiz. Também há workflow GitHub Actions no repositório `APP-S` em `.github/workflows/do-live-android.yml` para branch `do-live-mvp`.

## Teste recomendado no aparelho

Abra CAMADAS, selecione a camada de texto, mova-a no editor, ajuste largura, rotação e opacidade, feche e reabra o aplicativo e confirme que o layout foi salvo. Em CENAS, escolha outra cena para verificar a separação das fontes. Teste importação/exportação de um backup. Em AJUSTES, altere a guia e o canvas; a prévia deve continuar 9:16. Para câmera, aceite permissão Android.

Design: preservação da paleta escura/neon e nomenclaturas do DO LIVE. A equivalência visual exata às 12 telas de referência ainda precisa de um teste visual usando a imagem original.