# Aula 3 — Memória, Ponteiros e Robustez

Versão web e interativa da aula: 25 telas. A maior parte dos conceitos é explicada com exemplos de código comentados; as simulações ficam só onde ajudam a ver o mecanismo (mapa da RAM, static, fragmentação do heap, monitoramento do heap, entrada flutuando, periféricos, watchdog e estado seguro). Inclui 3 perguntas de Peer Instruction (a resposta só aparece ao clicar em “Revelar resposta”).

## Conteúdo
1. Capa
2. Arduino Uno × ESP32: Flash, RAM e EEPROM
3. Como a RAM é organizada: estática, heap e stack (mapa clicável: onde mora cada variável)
4. Memória estática: globais, `.data`, `.bss` e `static` (simulação de chamadas)
5. Stack: cadeia de chamadas e estouro de stack no Uno
6. Heap: `new`/`delete` e fragmentação (simulação first-fit)
7. `String` × buffer fixo com `snprintf()`
8. O que muda no ESP32: FreeRTOS, stack por tarefa, `ESP.getFreeHeap()` (simulação de 48 h)
9. Flash, `const` e `PROGMEM`
10. Resumo dos tipos de memória
11. Peer Instruction 1: memória sobrando, malloc falhando
12. Ponteiros: `&`, `*` e referências
13. Passagem por valor, referência e ponteiro
14. Três erros comuns: `nullptr`, fora dos limites, ponteiro pendente
15. Peer Instruction 2: a mensagem de status
16. Como sensores e periféricos falham
17. Validação de leituras: suspeita × falha confirmada
18. Ausência de sinal e limites do diagnóstico por software (entrada flutuando e pull-down)
19. I²C (ACK/NACK) × SPI: verificação de LCD e microSD durante a execução
20. `millis()` em vez de `delay()`, timeouts e estouro em 49,7 dias
21. Watchdog Timer
22. Peer Instruction 3: alimentando o watchdog
23. Detectar, registrar, responder; estados normal, alerta e falha
24. Prazo de resposta e estado seguro (fail-safe de um aquecedor)
25. Síntese: checklist de robustez

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, `T` tema claro/escuro, deslizar no celular.
- Link direto para um slide: `index.html#12`.

## Estrutura
```
index.html          conteúdo dos slides
css/style.css       tema da aula (mesma identidade visual da Aula 2)
js/theme.js         tema claro/escuro
js/app.js           navegação
js/kit.js           utilitários, realce de código e capa
js/sims-mem.js      simulações de memória e ponteiros
js/sims-falhas.js   simulações de falhas e robustez
assets/img/         imagens
```

Para editar o texto de um slide, procure o `<section>` correspondente em `index.html`. Blocos de código com `data-hl` são escritos em texto puro e coloridos automaticamente; `data-hl="2,5"` destaca as linhas 2 e 5.
