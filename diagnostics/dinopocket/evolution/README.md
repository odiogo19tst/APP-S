# DinoPocket Retro 1.5.9 — evolução manual

Base obrigatória: `DinoPocket_Bip6_PRONTO_PARA_NUVEM.zip` no commit
`f6ee5118be3a3d8371660ff03d198c540a55bac3` (1.5.8, código 14).
O preparador exige o SHA-256 original antes de extrair uma nova área.
Saída: 1.5.9, código 16, app ID 29318764.

Menu → Mais → Testes → Avançar evolução: um toque avança uma fase.
Ovo → bebê → filhote → jovem → adulto. No adulto o botão desaparece;
o teste não reinicia o ciclo e não revive pets mortos. Não há chamada do
avanço de teste na inicialização. A evolução natural de 24 horas da base
continua funcionando; reabrir não executa o recurso de teste.

O teste ajusta fase, idade e nascimento virtual sem simular dias de abandono.
Preserva cuidados, conquistas, contadores, geração, sono, pausa e campos
desconhecidos. Mantém `dinopocket.state.v1`, schema 1. No adulto usa a seleção
de espécie existente por refeições ou a preferência do telefone.

O código do motor, sprites, sons e ponte de configurações da base permanece
idêntico. A única expectativa antiga de versão no teste é atualizada.
Os testes incluem a execução da página real com armazenamento e widgets
simulados, navegação no menu, toques, persistência e reabertura.
Testes simulados não confirmam funcionamento físico no Bip 6.

Reprodução em checkout Git isolado:

```sh
python diagnostics/dinopocket/evolution/prepare.py --out work/evolution-build/app
npm test --prefix work/evolution-build/app
cd work/evolution-build/app && zeus build
```

O workflow `dinopocket-evolution.yml` testa, compila com Zeus CLI 1.9.3,
valida CRC/MD5 e identidade no ZAB, e publica artefatos e uma release com
ZAB, fonte ZIP e relatórios. A release só é criada depois das verificações.

A 1.5.8 instalou após a desinstalação da 1.5.2, voltando como ovo, e depois
também foi desinstalada pelo proprietário. A causa do problema de atualização
é **não comprovada**. Esta mudança não pretende corrigir essa causa.
Não desinstalar, limpar dados, renomear a chave de save ou usar outro app ID.
Instalação requer confirmação no relógio; ACK do Bridge não basta.
