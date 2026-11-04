# CarLink — Jarvis Edition, teste 0.1.1

| Arquivo | Onde instalar | Nome no Android |
|---|---|---|
| `CarLink-Celular-Samsung.apk` | Celular Samsung, Android 11 ou posterior | CarLink • Celular Samsung |
| `CarLink-Central-Multimidia.apk` | Central multimídia Android do carro | CarLink • Central Multimídia |

O APK da central não é o companheiro do celular. Baixe os arquivos identificados
na [página de versões do APP-S](https://github.com/odiogo19tst/APP-S/releases).
São APKs de teste com assinatura de depuração, sem certificação Google.
Mantenha o Play Protect ativado. Esta revisão precisa de teste físico de instalação
e funcionamento; remoção de permissões não garante aprovação nem segurança total.

## Permissões e recursos

Esta edição remove dos APKs os três serviços de Acessibilidade, a automação de
consentimento USB e a permissão de instalar outros aplicativos, incluindo as
declarações herdadas dos motores. Mantém projeção Android Auto, Bluetooth,
voz/TTS no Samsung e OBD somente leitura.

Não oferece mais início/voltar, leitura ou cliques de tela, nem atalhos globais
de volante dependentes de Acessibilidade. Confirme autorizações USB manualmente.
O play do Jarvis via MediaSession/teclas da tela depende do mapeamento da central.
Abrir Maps/Spotify nativos da central exige estacionamento aprovado e velocidade
OBD zero recente. Não há LLM nem controle da projeção remota.

Leia [GUIDE.md](GUIDE.md) para configuração e limites e
[VALIDATION.md](VALIDATION.md) para verificações realmente executadas.

## Fonte e compilação

Base: [F-e-n-y-x/CarLink](https://github.com/F-e-n-y-x/CarLink), revisão
`cfba71424d04b33c6b62f873766af2564c1d177e`. Licenças e créditos preservados em
[CREDITS.md](CREDITS.md). Os pequenos ajustes DiPlay de disponibilidade de serviços
estão identificados na fonte reconstruída em `docs/VENDOR_CHANGES.md`.
Os outros projetos do APP-S são independentes desta edição.

`changes/` e `UPSTREAM.json` contêm as alterações e seus checksums.
Reconstrua a fonte completa em um diretório novo:

```sh
python3 carlink-ai-jarvis/prepare.py carlink-build
cd carlink-build
./gradlew -Pjarvis.phoneOnly=true :jarvis-core:test :jarvis-phone:assembleDebug :jarvis-phone:lintDebug
python3 scripts/jarvis_manifest_contract.py --target phone
./gradlew :app:assembleDebug :app:testDebugUnitTest
python3 scripts/jarvis_manifest_contract.py --target headunit
```

O script verifica a revisão original e as alterações, cria um commit local e não
envia nada ao projeto original. Distribua a fonte completa correspondente, licença,
créditos e `SHA256SUMS.txt` junto aos APKs. Chaves privadas de teste não fazem parte
da fonte nem da entrega. A combinação segue AGPL-3.0/GPL-3.0.
