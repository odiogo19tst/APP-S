# Copiloto XPS — laboratório Android 0.1

Aplicativo independente para Samsung S25 FE + Roland XPS-10 via USB MIDI e microfone. Base de análise de áudio reaproveitada do Grauê Live 0.4 do mesmo repositório. Pacote novo; não substitui o Grauê.

## Implementado no código
- Seleção de dispositivo USB MIDI pelo serviço Android, leitura das teclas por canal e tratamento de desconexão.
- Parser MIDI com running status, pacotes fragmentados e descarte de SysEx/realtime.
- Microfone com análise local de nota predominante, acordes simples e hipótese de tonalidade; confirmação manual do tom.
- Painel escuro de alto contraste: teclas MIDI separadas da nota estimada no áudio; graus cromáticos relativos à tônica estimada.
- Sem envio de comandos ao teclado, reprodução de áudio, rede ou armazenamento de gravações.

## Limites desta versão
Ainda não existe IA generativa ou modelo neural embarcado. O algoritmo musical existente é heurístico e a confiança exibida não é probabilidade calibrada. Não separa instrumentos de uma banda. O painel MIDI mostra teclas pressionadas (não prolonga pelo sustain). Compilação e teste físico devem ser verificados antes de uso em palco.

## Teste no celular
1. Instale o APK de depuração gerado pelo workflow Copiloto XPS.
2. Conecte o teclado por cabo USB com suporte a dados/host. Toque em Conectar teclado USB e selecione o dispositivo.
3. Toque notas/acordes; confirme que notas aparecem e desaparecem corretamente. Teste desconectar e reconectar.
4. Inicie a escuta e autorize o microfone. Teste primeiro notas isoladas, depois acordes e música ambiente.
5. Confira os dois painéis simultaneamente. A saída física do teclado continua diretamente na mesa.
6. Saia do app e confirme que o microfone para.

## Escopo acordado / próximas etapas
- Analisar protocolo e parâmetros do editor XPS, implementar somente comandos documentados com leitura de estado, confirmação e desfazer.
- Timbres: filtros, envelopes, MFX, camadas, splits, cenas e comparação A/B.
- LouveApp: verificar documentação da API e acesso do administrador, campos de tom/cifra e compartilhamento autorizado. Nenhum token no Git/APK.
- Repertório offline, rolagem ajustável, posição da música e avisos antecipados sincronizados. Rolagem não equivale a seguir a banda.
- Inversões, condução de vozes e empréstimos modais com contexto e aviso de possível conflito com banda/melodia.
- IA local: selecionar modelo/licença/runtime, avaliar RAM, latência e temperatura no S25 FE. Não prometer capacidades antes dos testes.
- Modo palco/estudo, temas claro/escuro, teclado gráfico, intensidade de sugestões e revisão MIDI.
- Áudio externo/efeitos e correção de notas exigem outro roteamento e validação de latência.

## Editor recebido
O ZIP recebido contém apenas XPS 10 Editor.exe (92.541.766 bytes), PE32 Windows x86. Não contém APK nem código-fonte. Não executado nem redistribuído; a análise inicial não confirmou framework ou protocolo. Os prints são referência visual, não evidência dos comandos.

## Build
JDK 17, Android SDK 35, Gradle 8.9 e Android Gradle Plugin 8.6.1. Execute `gradle :app:assembleDebug` nesta pasta ou use o workflow GitHub. Não existem chaves de serviço ou credenciais nesta implementação.
