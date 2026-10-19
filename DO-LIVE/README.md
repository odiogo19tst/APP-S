# DO LIVE — MVP Android (0.1.0)

Aplicativo nativo para Android, baseado no projeto visual DO LIVE (DO Digital), com identidade escura e neon, 12 áreas navegáveis e recursos **locais de demonstração**.

## Já implementado

- 12 telas: Login, Início, Modo Show, Cenas, Fontes/Camadas, Chat, Batalhas, Alertas, Temas/Overlays, Estatísticas, Configurações e Copiloto IA.
- Prévia da câmera do aparelho (Camera2, sujeita a permissão do Android) e alternância entre câmeras.
- Cenas e camadas de texto/imagens/vídeos selecionados no celular, com armazenamento local.
- Painel de batalhas como modo de interface — transição sem recriar a câmera enquanto o Modo Show está aberto.
- Copiloto offline demonstrativo com 3 modos, respostas predeterminadas e síntese de voz Android (TTS).
- Eventos simulados (chat, presentes, entrada de espectadores), alertas, tema selecionável e estatísticas locais.
- Exportação e importação de backup JSON via seletor de documentos do Android.

## Não implementado / não simular como real

- Autenticação TikTok, transmissão RTMP/TikTok ou captura da live em segundo plano.
- WebSocket/API oficial para chat, presentes, placares, batalhas ou moderação.
- Renderização/mixagem de áudio/vídeo para um sinal de saída publicável.
- Modelo de IA remoto/LLM; a demonstração do Copiloto usa regras locais. A voz reproduz no aparelho, **não** no áudio de uma transmissão.
- Importação de projetos OBS e chroma key.

A aplicação exibe claramente `PRÉVIA LOCAL — SEM TRANSMISSÃO` para evitar confundir recursos de demonstração com conexão real.

## Compilação

Requisitos: Java 17, Android SDK API 35, Gradle 8.11.1 e Android Gradle Plugin 8.9.2.

1. Abra a pasta `DO-LIVE-Android` no Android Studio.
2. Instale Android SDK 35 nas configurações do SDK.
3. Execute `gradle :app:assembleDebug` na raiz com Gradle 8.11.1 ou use o fluxo CI incluído.
4. O APK, quando compilado, fica em `app/build/outputs/apk/debug/app-debug.apk`.

Se o projeto estiver dentro do repositório APP-S no caminho `DO-LIVE/`, a workflow em `.github/workflows/do-live-android.yml` é acionada por push na branch `do-live-mvp`.

## Próximas etapas técnicas

- Encoder de vídeo MediaCodec/CameraX, mixer de áudio, compositor OpenGL/Surface e cliente RTMP autenticado quando houver endpoint permitido.
- Integrações TikTok autorizadas, com escopos e termos adequados; nunca enviar credenciais para o cliente ou fazer scraping não autorizado.
- Copiloto LLM via backend com tokens temporários, consentimento e regras de moderação; síntese de voz mixada ao sinal de transmissão.
- Comparação visual pixel a pixel com a imagem oficial de 12 telas antes do design final; a imagem original não consta neste pacote.
