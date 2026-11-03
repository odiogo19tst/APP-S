# Registro de validação desta revisão

Data: 2 de novembro de 2026. Ambiente Windows, sem central Android, Samsung ou
adaptador OBD conectado a esta sessão.

Verificações concluídas:

- `scripts/resource_collisions.py --check`: 72 colisões já reconhecidas pelo
  original, **0 não revisadas**.
- JUnit 4.13.2/JDK 17, classes `jarvis-core`: **5 testes passaram**. Abrangem
  expiração e revogação da trava, fórmulas OBD/DTC, respostas ausentes/ambíguas,
  limite das mensagens e rejeição de comandos fora da gramática.
- `:jarvis-core:test` também passou pelo Gradle, com 5 testes, zero falhas/erros.
- `-Pjarvis.phoneOnly=true :jarvis-phone:assembleDebug :jarvis-phone:lintDebug`:
  **BUILD SUCCESSFUL**. Lint: **No issues found**. APK do Samsung gerado.
- Assinatura debug do APK verificada por `apksigner` (esquema v2); pacote
  `io.github.odiogo19tst.jarvis.phone`, minSdk 30, targetSdk 37. Isso não equivale
  a instalação/teste no Samsung nem a assinatura de produção.
- Novas classes Java da central e do Samsung compiladas com `javac` JDK 25 e
  `android.jar` APIs 36 e 37.0. Sem erros; avisos de APIs de compatibilidade obsoletas.
  Isso é verificação de tipos, não montagem/instalação de APK.
- Licença e motores `vendor/` preservados sem alterações.

Na primeira tentativa de instalação das ferramentas, `platforms;android-37` não
foi encontrado. A consulta ao catálogo oficial mostrou a identificação correta
`platforms;android-37.0`; o workflow foi corrigido para esse pacote.

Não executados: instalação e testes instrumentados, Android Auto em hardware,
reconexão sem fio, concorrência de áudio/microfone, recepção real do volante,
consumo de RAM da central, validação de um ELM e veículo reais. A ausência desses
testes impede classificar a edição como pronta para uso diário.

A montagem completa da central não foi concluída: a instalação local de NDKs
ficou incompleta, sem `source.properties`; a configuração nativa retornou CXX1101.
O workflow instala as duas versões explicitamente em ambiente Linux. Ele precisa
de uma execução bem-sucedida no GitHub antes de ser considerado validado em CI.
Os testes Kotlin do app original, incluindo a expectativa de URL de diagnóstico
ajustada para o fork, ainda dependem dessa configuração completa e não foram rodados.

A publicação não ocorreu. O conector não oferece criar/forkar repositórios e o
navegador recusou GitHub por uma permissão salva. Nenhum comando de envio foi
executado contra o repositório original.
