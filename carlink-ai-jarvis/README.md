# CarLink AI — Jarvis Edition

Protótipo Android para central Android 11/2 GB e companheiro Samsung.
Desenvolvimento isolado nesta pasta do APP-S; os projetos DinoPocket e Graue não
foram substituídos. O nome do repositório continua APP-S.

## Fonte, licença e reconstrução

Base original: [F-e-n-y-x/CarLink](https://github.com/F-e-n-y-x/CarLink), commit
`cfba71424d04b33c6b62f873766af2564c1d177e`, AGPL-3.0. Veja [CREDITS.md](CREDITS.md).
Os motores DiPlay/DiAuto e seus avisos permanecem na fonte original fixada.

`changes/` contém todos os arquivos adicionados ou modificados pelo Jarvis;
`UPSTREAM.json` fixa a revisão original e o SHA-256 de cada alteração. Esta pasta
é uma distribuição de alterações sobre a fonte original, não um fork GitHub.
O histórico completo original está disponível no repositório de origem; a cópia
Git completa preparada localmente também foi preservada na entrega deste trabalho.

Para obter a fonte completa reproduzível em uma pasta nova:

```sh
python3 carlink-ai-jarvis/prepare.py carlink-build
cd carlink-build
./gradlew -Pjarvis.phoneOnly=true :jarvis-core:test :jarvis-phone:assembleDebug
```

O script verifica o commit original e checksums das alterações, copia os arquivos
e cria um commit exclusivamente local. Não envia nada ao repositório original.
Os artifacts do workflow incluem a fonte completa reconstruída com o APK.
A licença desta pasta e da combinação é AGPL-3.0; isso não declara nova licença
para os demais projetos independentes do APP-S.

## APKs e estado real

O workflow `.github/workflows/carlink-ai-jarvis.yml` compila central e Samsung
em jobs independentes. APKs debug, fonte correspondente e checksums ficam nos
artifacts do run. Uma configuração de CI ainda precisa de execução bem-sucedida.

Localmente: APK Samsung compilado, assinatura debug verificada, lint sem problemas
e 5 testes do núcleo aprovados. APK completo da central ainda não compilado na
máquina local porque os NDKs ficaram incompletos. Consulte [VALIDATION.md](VALIDATION.md).
Esse registro descreve a validação local anterior à publicação desta pasta.

Sem teste real de Android Auto, volante, microfone/áudio ou OBD no carro.
ELM327 Bluetooth clássico implementado; BLE/Wi-Fi não. Comandos limitados,
sem LLM ou controle visual livre da projeção Android Auto. Todas as ações de
tela exigem estacionamento aprovado e velocidade OBD zero recente.
Leia [GUIDE.md](GUIDE.md) antes de instalar ou testar.
