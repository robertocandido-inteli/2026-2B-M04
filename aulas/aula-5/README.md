# Aula 5 — Como o ESP32 se comunica sem fio: do Wi‑Fi ao MQTT

Versão web da aula: 25 telas, só comunicação sem fio (a comunicação com fio — UART, I²C e SPI — foi dada antes). Para cada tipo de comunicação, a aula mostra sempre as mesmas coisas: que rádio e que alcance, quem começa a conversa, como o destino é escolhido e o **esquema da mensagem**. As simulações mostram só o pacote e a mensagem: o quadro bit a bit, os campos, os bytes. Nenhuma delas se conecta a uma placa. Inclui 3 quizzes formativos (10 perguntas) para resolver durante a aula e a atividade prática com a entrega no fim; as respostas vão para a plataforma de aulas e provas (pasta `plataforma-atividades`), que mede o engajamento.

## Conteúdo
1. Capa
2. O que é um protocolo: as partes de uma mensagem e as quatro escolhas (meio, ritmo, endereço, confirmação)
3. Mapa: pela Internet (Wi‑Fi + TCP/IP) e direto pelo ar (ESP‑NOW, BLE)
4. Pelo ar: estação, ponto de acesso, ESP‑NOW, BLE (animação: quem fala com quem)
5. Modelo TCP/IP: as quatro camadas e a analogia dos correios
6. Encapsulamento (animação passo a passo dos cabeçalhos)
7. Os três endereços do pacote: MAC, IP e porta; IP privado, NAT e DNS
8. Transporte: TCP × UDP com o esquema dos cabeçalhos (simulação de enlace com perdas)
9. Quiz formativo 1: camadas e pacotes
10. **HTTP**: anatomia do pedido e da resposta, códigos 200/201/404/500 (simulação: GET, POST e 404 com o texto completo das mensagens)
11. **MQTT**: publicar e assinar, broker, NAT
12. Anatomia de um PUBLISH byte a byte (simulação: digite tópico e conteúdo, escolha QoS e retain e veja os bytes)
13. O broker distribuindo mensagens (simulação com 4 clientes)
14. Tópicos e curingas `+` e `#` (simulação de filtros)
15. A conversa MQTT: CONNECT, SUBSCRIBE, PUBLISH, PINGREQ e keepalive
16. QoS 0/1/2, retain e último desejo (simulação de enlace com perdas)
17. Quiz formativo 2: HTTP e MQTT
18. **ESP‑NOW**: quadro com MAC e até 250 bytes (simulação: uma struct virando 8 bytes; receptor com outro molde)
19. **BLE**: anúncio, serviço e característica (GATT), notificação de temperatura byte a byte
20. Qual protocolo usar (comparativo dos sem fio)
21. Quiz formativo 3: escolha o protocolo
22. Síntese
23. **Atividade prática**: o sistema ESP32 ⇄ broker EMQX ⇄ dashboard, tópicos sugeridos e o que cada ponta deve fazer
24. **Entrega**: endereço do broker, usuário e senha para o professor, tópico de comando e as mensagens de ligar e desligar
25. **Glossário**: todas as siglas e termos da aula (NAT, TCP, UDP, MAC, QoS, GATT…) explicados em linguagem simples, com busca e filtro por assunto

## Atividade prática e entrega
O enunciado completo fica no documento da atividade. A entrega tem só o necessário para o professor ligar e desligar o LED do aluno pelo broker dele. Antes de enviar, a página confere o endereço (sem `mqtts://` nem porta), curingas no tópico e ligar ≠ desligar. Além dos campos (`pr_*`), vai o campo **`pr_entrega`**, uma linha JSON com tudo junto: no painel, copie esse campo e use o `comando_led.py` da pasta `teste-emqx`. Não há correção automática da prática; o teste é manual.

## Participação dos alunos
- No topo: indicador **online/offline** do servidor e o campo **senha da aula**. O professor libera e projeta a senha no painel; ao entrar, o aluno informa nome e e-mail (uma vez por navegador).
- **Quizzes formativos**: cada pergunta aceita uma resposta só (vale a primeira). Logo depois de responder, o aluno vê se acertou e a explicação. O gabarito fica na própria página (atributo `data-ok`), de propósito: o quiz é formativo.
- Sem senha, a resposta fica guardada no navegador e é enviada quando o aluno entrar. Sem conexão, é reenviada quando o servidor voltar.
- Barema na plataforma (`plataforma-atividades/conteudo/aulas/m04-aula-5.json`, módulo `modulo-4`): 4 pontos por responder as 10 perguntas (proporcional) + 0,6 por acerto. As chaves são `f1_1` … `f3_3`. A entrega da prática fica registrada, sem nota automática.
- O endereço da API fica só em `js/config.js` (o `iniciar.bat` da plataforma preenche com o domínio do ngrok).

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, `T` tema claro/escuro, deslizar no celular.
- Link direto para um slide: `index.html#12`.

## Estrutura
```
index.html           conteúdo dos slides
css/style.css        tema da aula (mesma identidade visual das Aulas 2 a 4)
js/theme.js          tema claro/escuro
js/app.js            navegação
js/kit.js            utilitários, realce de código e capa
js/sims-redes.js     arquiteturas sem fio, encapsulamento e TCP × UDP
js/sims-mqtt.js      broker publish/subscribe, tópicos e QoS
js/sims-pacotes.js   HTTP, bytes do PUBLISH, struct do ESP‑NOW e busca do glossário
js/participacao.js   senha da aula, identificação e quizzes formativos
assets/img/          logo
```

As simulações são didáticas: tempos estão desacelerados e as perdas de pacote são sorteadas. Todos os diagramas são desenhados na própria página; não há imagens externas além do logo.
