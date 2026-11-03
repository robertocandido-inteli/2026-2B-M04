# Aula 4 — Sensores: como o ESP32 sente o mundo

Versão web da aula: 26 telas. Os sensores mais usados com ESP32 são apresentados com foto, explicação passo a passo de como funcionam por dentro, aplicações e uma animação do mecanismo (LDR, termistor, sensor de gás, reed switch, PIR, ultrassom). Inclui 3 perguntas de Peer Instruction (a resposta só aparece ao clicar em “Revelar resposta”).

## Conteúdo
1. Capa
2. O que é um sensor (os “sentidos” do ESP32)
3. Sensores no dia a dia: casa, celular, carro, agricultura, indústria, saúde
4. Analógico × digital (animação: a mesma grandeza lida dos dois jeitos)
5. ADC: de tensão para número (simulação: régua de 3 e de 12 bits)
6. O ADC do ESP32 na prática: ADC1 × ADC2, faixa confiável, `analogReadMilliVolts()`
7. Divisor de tensão: lendo sensores que mudam de resistência
8. Peer Instruction 1: o LDR parou com o Wi‑Fi
9. LDR: foto, como funciona e animação (luz libera elétrons; poste automático)
10. Ponte de Wheatstone com LDR (simulação: equilíbrio e oscilação da fonte)
11. Termistores NTC e PTC (animação: mais elétrons livres × mais colisões)
12. Lendo um NTC no ESP32: tabela, equação Beta e calibração
13. Sensor de gás MQ: como funciona (animação: oxigênio, gás e elétrons na camada aquecida) e família MQ
14. Peer Instruction 2: o alarme que dispara ao ligar
15. De leitura a alarme confiável (simulação: aquecimento, confirmação e histerese)
16. Outros analógicos comuns: potenciômetro, LM35, umidade do solo, microfone
17. Sensores liga/desliga e reed switch (animação: o ímã fecha o contato)
18. PIR (animação: pessoa atravessando as faixas da lente de Fresnel)
19. Ultrassom HC-SR04 (animação: ida e volta do som, TRIG e ECHO)
20. Sensores que mandam o número pronto: DHT22, DS18B20, BME280, MPU6050
21. Lendo com biblioteca: DHT22 e DS18B20
22. Mapa dos sensores mais usados
23. Requisitos não funcionais
24. RNF em conflito: rapidez × bateria (simulação com deep sleep)
25. Peer Instruction 3: qual requisito dá para testar?
26. Síntese

## Como usar
- Abra `index.html` no navegador (funciona direto do arquivo, sem servidor).
- Navegação: `←` `→` / espaço, `G` visão geral, `F` tela cheia, `T` tema claro/escuro, deslizar no celular.
- Link direto para um slide: `index.html#9`.

## Estrutura
```
index.html                conteúdo dos slides
css/style.css             tema da aula (mesma identidade visual da Aula 3)
js/theme.js               tema claro/escuro
js/app.js                 navegação
js/kit.js                 utilitários, realce de código e capa
js/sims-como-funciona.js  animações de como cada sensor funciona e do ADC
js/sims-sensores.js       ponte de Wheatstone, alarme de gás e requisitos não funcionais
assets/img/               fotos dos sensores
```

Os números de consumo da simulação de RNF são ordens de grandeza para comparar escolhas, não medições de uma placa específica.

## Créditos das imagens (Wikimedia Commons)
- `ldr.jpg`: Raimond Spekking, CC BY-SA 4.0 (“Photoresistor with orange background-7536.jpg”)
- `ntc.jpg`: Ansgar Hellwig, CC BY-SA 2.0 DE (“NTC bead.jpg”)
- `hcsr04.jpg`: Suyash Dwivedi, CC BY-SA 4.0 (“HC SR04 Ultrasonic Module.jpg”)
- `dht22.jpg`: Suyash Dwivedi, CC BY-SA 4.0 (“AM2302 (DHT22) digital temperature and humidity sensor module.jpg”)
- `ds18b20.jpg`: Leonardo Postay, CC BY-SA 4.0 (“Sensor DS18B20.jpg”)
- `bme280.jpg`: SparkFun, CC BY 2.0 (“SparkFun Atmospheric Sensor Breakout - BME280 13676.jpg”)
- `mpu6050.jpg`: Nevit Dilmen, CC BY-SA 3.0 (“GY-521 MPU-6050 Module 3 Axis Gyroscope + Accelerometer 0487.jpg”)
- `lm35.jpg`: Nevit Dilmen, CC BY-SA 3.0 (“LM35 temperature sensor semiconductor thermometer 1480374 5 6 HDR enhancer.jpg”)
- `reed.jpg`: André Karwath, CC BY-SA 2.5 (“Reed switch (aka).jpg”)

Sensor de gás MQ, PIR, potenciômetro, umidade do solo e microfone são ilustrações desenhadas na própria página.
