# Aula 2 — Microcontroladores e Programação Embarcada

Versão web e interativa da aula: 20 telas, cada uma com sua simulação, e 2 perguntas de Peer Instruction (a resposta só aparece ao clicar em “Revelar resposta”).

## Conteúdo
1. Capa
2. O que é um microcontrolador (diagrama de blocos clicável)
3. Arquitetura e funcionamento (ciclo busca → decodifica → executa)
4. Arduino Uno (foto com pontos clicáveis + especificações)
5. ESP32 (DevKit e módulo aberto + especificações)
6. Arduino Uno × ESP32 (comparativo e “qual placa para o projeto?”)
7. Pinos digitais e analógicos (ADC de 10 e 12 bits, limiares HIGH/LOW)
8. Interfaces e periféricos (UART, I²C e SPI enviando um byte)
9. Peer Instruction 1: sensor de 5 V no ESP32
10. Leitura de sensores e acionamento de atuadores (LDR → map → PWM/servo)
11. C/C++: compilada × interpretada (pipeline, erro de compilação × erro em execução)
12. Tipos de dados e variáveis (tamanhos no Uno/ESP32, estouro)
13. Operações com bits (calculadora sobre o PORTB)
14. Peer Instruction 2: estouro de `int`
15. Estruturas condicionais e de repetição
16. Funções e organização do código (pilha de chamadas)
17. Programação orientada a objetos em C++ (classe `Led`)
18. Entradas e saídas digitais (INPUT_PULLUP e debounce)
19. Temporização e interrupções (`delay()` × `millis()` × ISR)
20. Leitura de sensores no tempo (amostragem e média móvel)

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, deslizar no celular.
- Link direto para um slide: `index.html#12`.

## Estrutura
```
index.html        conteúdo dos slides
css/style.css     tema da aula (mesma identidade visual da Aula 1)
js/app.js         navegação
js/sims.js        utilitários + simulações de hardware (telas 1–10)
js/sims-prog.js   simulações de programação e E/S (telas 11–20)
assets/img/       imagens
```

Para editar o texto de um slide, procure o `<section>` correspondente em `index.html`.

## Créditos das imagens
- Arduino UNO: mesma foto da Aula 1 (extraída do .pptx original), recortada.
- ESP32 DevKit: Edwiyanto, Wikimedia Commons (CC BY-SA 4.0), recortada e girada.
- Módulo ESP32-WROOM-32: Brian Krent, Wikimedia Commons (CC BY-SA 4.0).
