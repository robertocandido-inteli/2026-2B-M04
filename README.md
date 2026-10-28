# M04 · 2026-2B — Eletrônica, Sistemas Embarcados e IoT

Material do módulo: aulas interativas e laboratórios práticos.

**Professor Doutor Roberto Cândido** · Inteli

Site: <https://robertocandido-inteli.github.io/2026-2B-M04/>

## Aulas

| # | Aula | Conteúdo | Link |
|---|---|---|---|
| 1 | Introdução à Eletrônica e IoT | Tensão, corrente e resistência; Lei de Ohm; LED, resistor, potenciômetro, capacitor, diodo, transistor e relé; Arduino e pinos; sensores, atuadores e IoT. Inclui simulações e perguntas de Peer Instruction. | [Abrir aula 1](https://robertocandido-inteli.github.io/2026-2B-M04/aulas/aula-1/) |
| 2 | Microcontroladores e Programação Embarcada | Arquitetura e funcionamento de sistemas embarcados; Arduino Uno e ESP32; comparação de hardware; pinos digitais e analógicos; ADC, PWM, interfaces e periféricos; sensores e atuadores; programação em C/C++; tipos de dados, variáveis e estruturas de controle. Inclui simulações interativas e perguntas de Peer Instruction. | [Abrir aula 2](https://robertocandido-inteli.github.io/2026-2B-M04/aulas/aula-2/) |
| 3 | Memória, Ponteiros e Robustez | Memória do Arduino Uno × ESP32 (Flash, SRAM, EEPROM e PSRAM); organização da RAM em memória estática (`.data`/`.bss`), stack e heap; estouro de stack, alocação dinâmica e fragmentação; `String` × buffer fixo com `snprintf()`; FreeRTOS e `ESP.getFreeHeap()`; Flash, `const` e `PROGMEM`; ponteiros, referências e passagem por valor, referência e ponteiro; erros comuns (`nullptr`, fora dos limites, ponteiro pendente); falhas de sensores, validação de leituras e verificação de I²C e SPI; `millis()` e timeouts; watchdog; detecção, registro e resposta; estado seguro. 25 telas, com simulações onde ajudam a ver o mecanismo e 3 perguntas de Peer Instruction. | [Abrir aula 3](https://robertocandido-inteli.github.io/2026-2B-M04/aulas/aula-3/) |

## Laboratórios

| # | Laboratório | Atividade | Link |
|---|---|---|---|
| 1 | Pisca-LED | LED de status no Wokwi (pulso de 200 ms a cada 2 s, pino 8), com uso de IA guiado pelos 5C e entrega pelo formulário da página. | [Abrir lab 1](https://robertocandido-inteli.github.io/2026-2B-M04/labs/lab-1/) |
| 2 | Debounce por software e hardware | Investigar a trepidação de um botão mecânico; comparar a contagem de apertos sem debounce e com debounce por software usando `millis()`; implementar um filtro RC com resistor e capacitor; realizar testes na bancada com Arduino Uno. Inclui simulação interativa, uso de IA guiado pelos 5C e entrega de evidências pelo formulário. | [Abrir lab 2](https://robertocandido-inteli.github.io/2026-2B-M04/labs/lab-2/) |
| 3 | Falhas e watchdog | Provocar duas falhas na bancada (sensor ultrassônico HC-SR04 sem eco e LCD 16×2 I²C sem alimentação); comparar a versão ingênua com a que detecta e se recupera usando timeout no `pulseIn()`, validação por faixa com falha confirmada após 3 leituras, verificação de ACK no I²C e reinicialização do LCD; adicionar o watchdog do Arduino Uno com contador de boots na EEPROM. Inclui uso de IA guiado pelos 5C e entrega de evidências pelo formulário. | [Abrir lab 3](https://robertocandido-inteli.github.io/2026-2B-M04/labs/lab-3/) |

## Como usar

- **Aulas:** navegue com `←`, `→` ou espaço, `G` abre a visão geral e `F` a tela cheia. No celular, deslize para os lados. Para abrir um slide específico, acrescente `#número` ao link (ex.: `.../aulas/aula-1/#9`).
- **Laboratórios:** leia a página inteira antes de começar. As respostas ficam salvas como rascunho no seu navegador até você clicar em **Enviar respostas**. Use **Baixar PROCESSO.md** para versionar o registro no repositório do grupo.

## Estrutura do repositório

```
aulas/
  aula-1/   Introdução à Eletrônica e IoT
  aula-2/   Microcontroladores e Programação Embarcada
  aula-3/   Memória, Ponteiros e Robustez
labs/
  lab-1/    Pisca-LED (Wokwi)
  lab-2/    Debounce por software e hardware (bancada)
  lab-3/    Falhas e watchdog (bancada)
```

Cada aula abre direto pelo `index.html`, sem servidor. Cada lab tem um `config.js` com o identificador do lab e a URL de envio do formulário.
