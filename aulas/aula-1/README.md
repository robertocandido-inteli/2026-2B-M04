# Aula 1 — Introdução à Eletrônica e IoT

Versão web e interativa da aula, com os mesmos 25 slides do `.pptx`, simulações em cada tema e 5 perguntas de Peer Instruction (a resposta só aparece ao clicar em “Revelar resposta”).

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, deslizar no celular.
- Link direto para um slide: `index.html#12`.

## Publicar no GitHub Pages
1. Crie um repositório e envie o conteúdo desta pasta (`index.html` na raiz).
2. No GitHub: **Settings → Pages → Build and deployment → Deploy from a branch**, escolha `main` e `/ (root)`.
3. O site fica em `https://<usuario>.github.io/<repositorio>/`.

## Estrutura
```
index.html        conteúdo dos slides
css/style.css     tema (cores e fontes do deck original)
js/app.js         navegação
js/sims.js        simulações (uma função por data-sim)
assets/img/       imagens extraídas do .pptx
```

Para editar o texto de um slide, procure o `<section>` correspondente em `index.html`.
A imagem de pinagem do Arduino UNO é de arduino.cc (CC BY-SA 4.0).
