# Aula 6 — Como o ESP32 age no mundo: dispositivos de saída e atuadores

Versão web da aula: 25 telas sobre as saídas do ESP32. Para cada dispositivo, a aula mostra sempre as mesmas coisas: **como funciona por dentro**, **que sinal sai do pino** e **o que precisa ficar entre o pino e ele** (resistor, transistor, relé, ponte H, módulo I²C). As simulações mostram o sinal e o efeito (a onda no pino, o pulso do servo, o byte do display). Nenhuma delas se conecta a uma placa. Inclui 3 quizzes formativos (10 perguntas) para resolver durante a aula; as respostas vão para a plataforma de aulas e provas (pasta `plataforma-atividades`), que mede o engajamento.

## Conteúdo
1. Capa
2. Saídas e atuadores: sensor → ESP32 → pino → driver → atuador; saída digital, “analógica” e de informação; limite de corrente do pino
3. **LED**: tensão direta, resistor limitador, cálculo do resistor (simulação: cor do LED × resistor → corrente e brilho)
4. **Drivers**: transistor, MOSFET, relé, ponte H; fonte externa, GND comum e diodo de proteção
5. **Som**: buzzer ativo × passivo (simulação: o sinal no pino, notas e som pelo navegador)
6. **Alarme**: máquina de estados e padrões no tempo com `millis()` (simulação: bip, sirene, 3 bipes)
7. Quiz formativo 1: LED, drivers e som
8. Saída analógica: **DAC × PWM**
9. **PWM**: frequência, duty e resolução (simulação: onda, média, LED piscando a 1 Hz e “meio aceso” a 1 kHz)
10. Cada uso do PWM, uma frequência (LED, motor, servo, buzzer, ventoinha); frequência × resolução
11. **LED RGB** com 3 PWMs, cátodo/ânodo comum e LED endereçável WS2812 (simulação: mistura de cores)
12. **Servomotor**: pulso de 1–2 ms a cada 20 ms (simulação: ângulo, pulso e braço do servo)
13. **Motor DC e ponte H** (simulação: frente, ré, freio, solto e o curto S1+S2)
14. **Motor de passo** (simulação: bobinas em sequência e contagem de passos)
15. Outros atuadores: relé, solenoide, válvula, bomba, ventoinha, motor de vibração, fitas de LED
16. Quiz formativo 2: PWM e motores
17. **Displays**: 7 segmentos, matriz, LCD 16×2, OLED, TFT, e‑paper
18. **7 segmentos**: um byte por dígito (simulação: segmentos clicáveis, bits e hexadecimal)
19. **Display I²C**: SDA/SCL, endereços (0x27, 0x3C), scanner I²C
20. **LCD 16×2 com módulo I²C** (simulação: texto nas duas linhas, código de cada caractere, posição na memória e os bytes no barramento)
21. **OLED 128×64** (simulação: pixels clicáveis; cada coluna de 8 pixels é um byte)
22. Quiz formativo 3: displays
23. Qual saída usar (comparativo)
24. Síntese
25. **Glossário** com busca e filtro por assunto

## Atividade prática
Esta versão não tem atividade prática: ela será definida pelo professor. O `participacao.js` já aceita um formulário de entrega (`#praticaForm`, campos `pr_*`), como na Aula 5, se for preciso acrescentar.

## Participação dos alunos
- No topo: indicador **online/offline** do servidor e o campo **senha da aula**. O professor libera e projeta a senha no painel; ao entrar, o aluno informa nome e e-mail (uma vez por navegador).
- **Quizzes formativos**: cada pergunta aceita uma resposta só (vale a primeira). Logo depois de responder, o aluno vê se acertou e a explicação. O gabarito fica na própria página (atributo `data-ok`), de propósito: o quiz é formativo.
- Sem senha, a resposta fica guardada no navegador e é enviada quando o aluno entrar. Sem conexão, é reenviada quando o servidor voltar.
- Barema na plataforma (`plataforma-atividades/conteudo/aulas/m04-aula-6.json`, módulo `modulo-4`): 4 pontos por responder as 10 perguntas (proporcional) + 0,6 por acerto. As chaves são `f1_1` … `f3_3`.
- O endereço da API fica só em `js/config.js` (o `iniciar.bat` da plataforma preenche com o domínio do ngrok).

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, `T` tema claro/escuro, deslizar no celular.
- Link direto para um slide: `index.html#12`.
- Nos slides de som e alarme, o botão **Ouvir** toca o som pelo navegador (volume baixo); ele para ao trocar de slide.

## Estrutura
```
index.html             conteúdo dos slides
css/style.css          tema da aula (mesma identidade visual das Aulas 2 a 5) + estilos da Aula 6 no fim
js/theme.js            tema claro/escuro
js/app.js              navegação
js/kit.js              utilitários, realce de código e capa
js/sims-saidas.js      LED e resistor, buzzer, alarme, PWM e LED RGB
js/sims-atuadores.js   servo, ponte H e motor de passo
js/sims-displays.js    7 segmentos, LCD 16×2 I²C, OLED e busca do glossário
js/participacao.js     senha da aula, identificação e quizzes formativos
assets/img/            logo
```

As simulações são didáticas: o servo usa a faixa de 1–2 ms, o motor de passo é desenhado com 4 passos por volta e as rotações estão desaceleradas. Todos os diagramas são desenhados na própria página; não há imagens externas além do logo.
