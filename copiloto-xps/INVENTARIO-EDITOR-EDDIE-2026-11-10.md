# Inventário técnico — funções demonstradas no XPS Mobile Editor antigo (Eddie Tavares)

**Fonte:** sequência de capturas de tela enviada pelo proprietário do projeto em 10/11/2026, referente ao XPS Mobile Editor antigo. O objetivo é registrar o conjunto de funções e a organização para **não reduzir o Grauê a leitura ou troca de timbre**. Referência funcional e de taxonomia; não copiar interface, marca, assets ou código de terceiros.

**Evidência e limite:** nas capturas aparece **MIDI OFF**. Elas comprovam as telas/opções disponíveis no editor exibido, **não** comprovam que cada parâmetro é controlável por USB/SysEx no XPS-10, nem que há leitura e escrita corretas na nossa versão. Nomes/limites devem ser confrontados com MIDI Implementation + dumps válidos e testados fisicamente antes de permitir WRITE.

## Navegação/organização do aplicativo de referência

- Seções principais: **Patch**, **Perform**, **MFX**, **Opções** e **Live**.
- Ferramentas gerais: **Exportar**, **Importar**, **Ler** e **Reset** (Reset deve ser desambiguado: reset local da tela vs alteração do instrumento, sem comando destrutivo implícito).
- Dentro de Patch: abas **PCH | WG | TVA | TVF | Vel/Key | LFO | MTX | Ctrl | MFX**; subabas específicas (por exemplo TVA / TVA Envelope / BIAS; TVF / TVF Envelope; WG / Pitch Envelope; MFX / Chorus-Reverb).
- Para WG, TVA, TVF, Vel/Key e Ctrl, parâmetros estão visivelmente agrupados por **TONE 1–4**, com indicadores **SW** e **SELECT**. LFO/MTX têm outra organização, por fontes e destinos.
- Mixer em **paisagem**, visão simultânea das partes e acesso rápido ao editor. Aproveitar lógica de hierarquia e legibilidade, não o desenho visual literal.

## Inventário detalhado de funções observadas

| Domínio | Subdivisão | Controles e conceitos vistos nas capturas | Trabalho necessário no Grauê |
|---|---|---|---|
| **PCH** | Patch Common | Nome, categoria; volume; pan; prioridade Last/Loudest; output; pitch bend Up/Down; coarse/fine tune; octave; stretch tune; analog feel; mono/poly; legato, retrigger e portamento (modo, rate/time, início pitch/note, time); offsets de cutoff, resonance, attack, release e velocity | Expor configuração comum do Patch, com limites oficiais e edição/undo por leitura comprovada |
| **WG** | Wave Generator | Wave Number L/R, Delay Mode, Delay, Gain, FXM, FXM Sync, Color, Depth, Coarse, Fine, KF por **cada tone** | Ler estrutura de cada tone, identificar mapa de ondas e seus IDs; não confundir forma de onda com áudio baixado |
| **WG** | Pitch Envelope | Aba separada de envelope de afinação observada (parâmetros detalhados não mostrados) | Investigar e mapear antes de habilitar edição |
| **TVA** | Amplificação | Level, Vel, Sens, Pan, Pan Key, Out, Cho, Rev, Asgn, tone on/off/seleção (quatro tones) | Mixer individual dos quatro tones e envio/roteamento documentado |
| **TVA Envelope** | Envelope/tempo | Time KF, T1 Sens, T4 Sens, T1–T4 e L1–L3 (quatro tones) | Editor de envelope com unidades/valores e prévia visual não enganosa |
| **TVA BIAS** | Sensibilidade por posição | Level, Position (ex.: C4), Direction (ex.: All) e representação gráfica da curva, quatro tones | Editor de bias por nota/direção com mapa MIDI validado |
| **TVF** | Filtro | Filter Type, Cut, Res, Res Vel, Cut KF, Vel, Sens por tone | Filtros e tracking por nota/velocidade, não só CC74 global |
| **TVF Envelope** | Envelope do filtro | Depth, Time KF, Vel Curve, Vel Sens, T1–T4, L0–L4 por tone | Editor completo de profundidade, tempos e níveis |
| **Vel/Key** | Faixa por tone | Velocity Fade Lower/Upper, Lower/Upper; Key Range Fade Lower/Upper e Lower/Upper com teclado gráfico; quatro tones independentes | Mapa visual de regiões de tecla e dinâmica para Patch, distinto das zones da Performance |
| **LFO** | LFO1 e LFO2 | Waveform (ex.: SIN), Offset, Rate Value, Detune, Delay Time, KF, Fade Time, Mode, Key Trigger, intensidades Pitch/TVF/TVA/Pan | Dois LFOs por Patch/tone conforme endereços oficiais |
| **LFO** | Step | Tipo e 16 passos 1–16, com níveis individuais | Modelar step modulation com valores documentados; não confundir com sequenciador do Grauê |
| **MTX** | Matrix Control | Quatro **Sources 1–4**; até **4 Destinations** por fonte, com sensibilidade/curva em cada destino | Matriz de modulação roteável, com enums e validação |
| **MTX sources** | Fontes visíveis | OFF, CC01 Modulation, CC02 Breath, CC04 Foot Type, CC05 Portamento Time, CC06 Data Entry, CC07 Volume, CC10 Pan, CC11 Expression, CC16–19 General, CC71 Resonance, CC72 Release, CC73 Attack, CC74 Cutoff, CC75 Decay, CC76–78 Vibrato, CC80–82 General, e índices especiais 96 Pitch Bend, 97 Aftertouch, 98–101 SysCtrl1–4, 102 Velocity, 103 Keyfollow, 104 Tempo, 105 LFO1, 106 LFO2, 107 Pitch Env | **Atenção:** 96–107 nessa lista são *índices de fontes do editor*, não necessariamente números CC MIDI; CC80–82 aparecem como GENERAL, logo não inferir “volume dos quatro tones” a partir dessas telas. Confirmar enums na documentação |
| **Ctrl** | Receive por tone | Receive Pitch Bend, Receive Expression, Receive Sustain, Redamper; Receive Pan Mode (Key-On/Continuous), Env Mode (Sustain/No-Sus) | Habilitar/desabilitar recepção musical separadamente quando suportado: piano com sustain e strings sem |
| **MFX no Patch** | Efeito | ON/OFF, algoritmo, Out, Cho, Rev; quatro Control Source / Destination / Sens; aba Chorus/Reverb | Encadear efeito com Patch e roteamento sem confundir com os três MFX da Performance |
| **MFX catalog** | 78 algoritmos | Capturas incluem Equalizer, Spectrum, Isolator, Low Boost, Super Filter, Step Filter, Enhancer, Auto Wah, Humanizer, Speaker Simulator, Phaser, Ring Modulator, Tremolo, Chorus, Flanger, 3D efeitos, Overdrive, Distortion, Guitar Amp Simulator, Compressor, Limiter, Gate, Delay, Multi Tap/Reverse/Analog/Tape, Pitch Shifter, Reverb, combinações de 2 algoritmos, Sympathetic Resonance (#78) | Catálogo e editor dinâmico de parâmetros por algoritmo; distinguir tipo disponível de parâmetros realmente lidos/testados |
| **PERFORM** | Mixer de 16 partes | Parte 1–16, seleção de saída MFX1/MFX2/MFX3, Attack, Release, Cutoff, Resonance; parte por parte | Painel de 16 partes com leitura real, feedback, mudanças de camada e efeitos |
| **PERFORM** | Roteamento global | Seleção por parte e roteamento **MFX1/MFX2/MFX3**, Chorus e Reverb, diagrama de estrutura de efeito | Grafo de fluxo validado e configuração em lote reversível |
| **Mixer em paisagem** | Ao Vivo/Editor | Colunas por parte, quick edit (ex. Attack), sliders de volume, Mute, Mod e Oct, navegação horizontal e abrir editor | Interface responsiva original para edição; não poluir Palco com botões de preparação |

## Como a IA deve agir (não substituir o catálogo)

A **IA é a camada de orquestração**: entende intenções musicais, o estado **realmente lido** do Roland e os parâmetros disponíveis; cruza Wave/TVA/TVF/Modulação, Performance, MFX, repertório e preferências; transforma uma orientação como "strings suaves sem sustain" num plano estruturado com **parâmetros específicos, limites, ordem de aplicação e comparação antes/depois**.

A IA **não cria** endereço SysEx ou parâmetro que o instrumento não aceite. Cada controle precisa existir no **motor determinístico** mesmo quando não há IA/modelo. Cada operação deve ser distinguida por estado: *proposto*, *salvo para a música*, *enviado via MIDI*, *confirmado por leitura*, *falhou*.

## Fluxo definitivo: preparação antes do culto → um toque no repertório

1. Preparar a música e timbres com os editores detalhados (16 partes + até 4 tones por Patch, efeitos, zones, transposição, sustain, MFX), com ajuda opcional da IA.
2. Salvar **setup por música**, primeiro Performance USER/PRESET e depois uma evolução para snapshot de parâmetros reversíveis, preferencialmente com ordem, diff e rollback.
3. No culto, **tocar a música no repertório/Palco** carrega automaticamente as configurações autorizadas anteriormente, sem pedir confirmação repetitiva. Se não houver USB, não fingir sucesso; se não houver setup, não disparar MIDI.
4. Não executar WRITE permanente, factory reset, destruição de banco USER ou Test Mode na simples seleção de música.

## Checklist para cada controle que ainda falte

- [ ] Nome e semântica no inventário (e grupo no UX)
- [ ] Fonte primária: endereço SysEx, enum, intervalo e escala/offset do XPS-10 (versão do manual)
- [ ] Estado de leitura e verificação do firmware/teclado físico; evitar transportar cegamente endereços JUNO-Di
- [ ] UI com valores válidos, indicação não lido vs lido, edição e reset local
- [ ] Teste automático de codec, limites, ordem e proteção de escrita
- [ ] Teste com equipamento (leitura → aplicar na RAM → readback → undo)
- [ ] Registro da função como disponível para planejamento da IA

**Prioridade atual definida pelo músico:** estudar e controlar o próprio XPS-10. **Não priorizar** uso como hub universal para controladores externos, loja/download de timbres ou clone visual do editor de Eddie.
