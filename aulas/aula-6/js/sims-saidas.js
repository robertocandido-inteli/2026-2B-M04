/* ==========================================================
   Simulações — saídas digitais e PWM: LED com resistor, buzzer,
   padrões de alarme, sinal PWM e LED RGB.
   Mostram o sinal no pino e o efeito; nada aqui se conecta a uma placa.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, clamp, fmt, fmtN, stageOf, txt, wire, diode, canvas2d, seg, pill, toggleBtn } = window.KIT;

  /* ---------- som pelo navegador (uma voz, onda quadrada, volume baixo) ---------- */
  const SOM = (() => {
    let ctx = null, osc = null, gain = null;
    function ensure() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      if (!ctx) {
        ctx = new AC();
        gain = ctx.createGain(); gain.gain.value = 0; gain.connect(ctx.destination);
        osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = 440; osc.connect(gain); osc.start();
      }
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    return {
      start: ensure,
      set(freq, on) {
        if (!ctx) return;
        const t = ctx.currentTime;
        if (freq > 0) osc.frequency.setTargetAtTime(freq, t, 0.004);
        gain.gain.setTargetAtTime(on ? 0.035 : 0, t, 0.004);
      },
      stop() { if (ctx) gain.gain.setTargetAtTime(0, ctx.currentTime, 0.01); }
    };
  })();
  window.SOM = SOM;

  // eixo de um gráfico de sinal (0 V e 3,3 V)
  function axes(ctx, w, h, pad, labels) {
    ctx.fillStyle = C.plot; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = C.surf3; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, pad.t); ctx.lineTo(w - pad.r, pad.t); ctx.moveTo(pad.l, h - pad.b); ctx.lineTo(w - pad.r, h - pad.b); ctx.stroke();
    ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
    ctx.fillText(labels[0], pad.l - 6, pad.t + 4); ctx.fillText(labels[1], pad.l - 6, h - pad.b + 4);
  }

  /* ======================================================
     LED + resistor: quanto passa de corrente
     ====================================================== */
  SIMS.ledres = root => {
    const svg = stageOf(root);
    const RS = [0, 33, 68, 100, 150, 220, 330, 470, 1000, 4700];
    const LEDS = {
      r: { vf: 2.0, col: '#ff4a4a', nome: 'vermelho' }, y: { vf: 2.1, col: '#ffcf33', nome: 'amarelo' },
      g: { vf: 2.2, col: '#46dd6a', nome: 'verde' }, b: { vf: 3.0, col: '#4f8bff', nome: 'azul' }, w: { vf: 3.0, col: '#fff6d6', nome: 'branco' }
    };
    const rIn = inp(root, 'r');
    let cor = 'r', I = 0;

    // placa → resistor → LED → GND
    const box = S('g', {}, svg);
    S('rect', { x: 14, y: 58, width: 104, height: 84, rx: 10, fill: C.plot, stroke: C.mint, 'stroke-width': 2.5 }, box);
    txt(box, 66, 88, 'ESP32', { fill: C.mint, size: 14, weight: 700 });
    txt(box, 66, 106, 'GPIO 2', { size: 11 });
    txt(box, 66, 124, '3,3 V', { fill: C.text2, size: 12, weight: 600 });
    wire(svg, 'M118 100 H160', { w: 3 });
    const resG = S('g', {}, svg);
    wire(svg, 'M240 100 H296', { w: 3 });
    const ledG = S('g', {}, svg);
    wire(svg, 'M340 100 H430 V150', { w: 3 });
    S('path', { d: 'M412 150 H448 M418 158 H442 M424 166 H436', stroke: C.wire, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
    txt(svg, 430, 186, 'GND · 0 V', { size: 11 });
    const vR = txt(svg, 200, 66, '', { fill: C.orange, size: 12, weight: 600 });
    const vL = txt(svg, 318, 66, '', { fill: C.blue, size: 12, weight: 600 });
    const iTxt = txt(svg, 260, 186, '', { fill: C.text2, size: 12, weight: 600 });
    const dots = [];
    const PATH = [[118, 100], [430, 100], [430, 150]];
    for (let i = 0; i < 8; i++) dots.push(S('circle', { r: 3.2, fill: C.yellow, opacity: 0 }, svg));
    let led = null, phase = 0;

    function drawRes(r) {
      resG.textContent = '';
      if (!r) { wire(resG, 'M160 100 H240', { color: C.red, w: 3, dash: '6 5' }); txt(resG, 200, 126, 'sem resistor!', { fill: C.red, size: 11, weight: 700 }); return; }
      let d = 'M160 100 h8';
      for (let i = 0; i < 6; i++) d += ` l5 ${i % 2 ? 12 : -12} l5 ${i % 2 ? -12 : 12}`;
      d += ' H240';
      S('path', { d, fill: 'none', stroke: C.orange, 'stroke-width': 3, 'stroke-linejoin': 'round' }, resG);
      txt(resG, 200, 130, r >= 1000 ? fmtN(r / 1000, 1) + ' kΩ' : r + ' Ω', { fill: C.orange, size: 12, weight: 700 });
    }
    function draw() {
      const L = LEDS[cor], r = RS[+rIn.value];
      ledG.textContent = '';
      led = diode(svg, ledG, 318, 100, 0, { led: true, color: L.col });
      drawRes(r);
      const vr = Math.max(0, 3.3 - L.vf);
      I = r ? vr / r * 1000 : 60;                         // mA (sem resistor: o pino tenta dar tudo)
      out(root, 'rv', r ? (r >= 1000 ? fmtN(r / 1000, 1) + ' kΩ' : r + ' Ω') : '0 Ω (nenhum)');
      vR.textContent = r ? `${fmt(vr, 1)} V` : '';
      vL.textContent = `${fmt(L.vf, 1)} V`;
      iTxt.textContent = r ? `I = ${fmt(vr, 1)} V ÷ ${r} Ω = ${fmt(I, 1)} mA` : 'I = sem limite';
      const b = clamp(Math.pow(I / 15, 0.6), 0, 1);
      led.setOn(b);
      out(root, 'vf', fmt(L.vf, 1) + ' V');
      out(root, 'vr', r ? fmt(vr, 1) + ' V' : '–');
      out(root, 'i', r ? fmt(I, 1) + ' mA' : '≫ 40 mA');
      const st = out(root, 'st');
      let cap;
      if (!r) { st.innerHTML = '<span class="c-red">queima</span>'; cap = 'Sem resistor, nada limita a corrente: o LED e o pino do ESP32 podem <b>queimar</b>. O resistor é obrigatório.'; }
      else if (I > 40) { st.innerHTML = '<span class="c-red">excesso</span>'; cap = 'Acima de 40 mA o pino do ESP32 passa do limite absoluto. Use um resistor maior.'; }
      else if (I > 20) { st.innerHTML = '<span class="c-orange">no limite</span>'; cap = 'Funciona, mas acima de ~20 mA o LED esquenta e o pino trabalha no limite. Prefira um resistor um pouco maior.'; }
      else if (I < 1) { st.innerHTML = '<span class="c-orange">fraco</span>'; cap = cor === 'b' || cor === 'w' ? `O LED ${L.nome} precisa de ~3,0 V e o pino só tem 3,3 V: sobra muito pouco para o resistor, e o brilho fica fraco. Diminua o resistor.` : 'Corrente muito baixa: o LED quase não acende. Diminua o resistor.'; }
      else { st.innerHTML = '<span class="c-mint">ok</span>'; cap = `Faixa boa (1 a 20 mA). O resistor fica com a sobra de tensão: 3,3 − ${fmt(L.vf, 1)} = ${fmt(vr, 1)} V.`; }
      out(root, 'cap', cap);
    }
    seg(root, 'cor', v => { cor = v; draw(); });
    rIn.addEventListener('input', draw);
    draw();
    return {
      tick(dt) {
        const v = clamp(I / 20, 0, 3);
        phase = (phase + dt * 60 * v) % 40;
        const len = 312 + 50;
        dots.forEach((d, i) => {
          const s = (i * 46 + phase * 1.15) % len;
          const [x, y] = s < 312 ? [118 + s, 100] : [430, 100 + (s - 312)];
          d.setAttribute('cx', x); d.setAttribute('cy', y);
          d.setAttribute('opacity', I > 0.2 ? 0.9 : 0);
          d.setAttribute('fill', I > 40 ? C.red : C.yellow);
        });
      }
    };
  };

  /* ======================================================
     Buzzer ativo × passivo
     ====================================================== */
  SIMS.buzzer = root => {
    const cv = canvas2d($(root, 'canvas'));
    const NOTAS = [['Dó', 262], ['Ré', 294], ['Mi', 330], ['Fá', 349], ['Sol', 392], ['Lá', 440], ['Si', 494], ['Dó⁺', 523]];
    let tipo = 'ativo', sinal = 'high', freq = 440, playing = false, active = true;
    const box = out(root, 'notas');
    box.innerHTML = NOTAS.map(([n, f]) => `<button type="button" class="btn ghost sm" data-f="${f}" aria-pressed="${f === freq}">${n} · ${f}</button>`).join('');
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      freq = +b.dataset.f;
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      if (sinal !== 'onda') { sinal = 'onda'; setSinal('onda'); }
      draw();
    }));
    const btnSom = act(root, 'som', () => {
      playing = !playing;
      if (playing && !SOM.start()) playing = false;
      toggleBtn(btnSom, playing, ['🔊 Som ligado', '🔈 Ouvir']);
      draw();
    });
    const setTipo = seg(root, 'tipo', v => { tipo = v; draw(); });
    const setSinal = seg(root, 'sinal', v => { sinal = v; draw(); });

    function som() {
      if (tipo === 'ativo') return 2300;                 // oscilador interno: a nota não muda
      return sinal === 'onda' ? freq : 0;                // passivo com nível fixo: silêncio
    }
    function draw() {
      const { ctx, w, h } = cv;
      const pad = { l: 46, r: 12, t: 18, b: 26 };
      axes(ctx, w, h, pad, ['3,3 V', '0 V']);
      const W = w - pad.l - pad.r, T = 10;              // janela de 10 ms
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.5; ctx.beginPath();
      if (sinal === 'high') { ctx.moveTo(pad.l, pad.t); ctx.lineTo(w - pad.r, pad.t); }
      else {
        const per = 1000 / freq;
        let lvl = 1, x0 = pad.l; ctx.moveTo(pad.l, pad.t);
        for (let t = per / 2; t <= T + 1e-9; t += per / 2) {
          const x = pad.l + Math.min(t, T) / T * W;
          const y = lvl ? pad.t : h - pad.b;
          ctx.lineTo(x, y); lvl = 1 - lvl; ctx.lineTo(x, lvl ? pad.t : h - pad.b); x0 = x;
        }
        ctx.lineTo(w - pad.r, lvl ? pad.t : h - pad.b);
      }
      ctx.stroke();
      ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillText('0 ms', pad.l, h - 8); ctx.textAlign = 'right'; ctx.fillText('10 ms', w - pad.r, h - 8);
      ctx.textAlign = 'center'; ctx.fillStyle = C.text2;
      ctx.fillText(sinal === 'high' ? 'digitalWrite(pino, HIGH): nível fixo' : `tone(pino, ${freq}): onda quadrada, período ${fmt(1000 / freq, 2)} ms`, pad.l + W / 2, h - 8);

      const f = som();
      pill(out(root, 'f'), f ? 'on' : 'off', f ? `som: ${f} Hz` : 'sem som');
      const caps = {
        'ativo-high': 'Buzzer <b>ativo</b>: tem um oscilador dentro. Basta ligar o pino (HIGH) e ele apita, sempre na mesma nota (~2,3 kHz). Bom para bipes de aviso.',
        'ativo-onda': 'Mandar uma onda para o buzzer ativo não troca a nota: quem decide o tom é o oscilador interno. Para ele, basta liga/desliga.',
        'passivo-high': 'Buzzer <b>passivo</b> com nível fixo: a membrana se mexe uma vez (um clique) e fica parada. Sem vibração, <b>sem som</b>.',
        'passivo-onda': `Buzzer <b>passivo</b>: a membrana vibra a cada subida e descida da onda. <b>Frequência = nota</b>: ${freq} Hz. É assim que se toca melodia.`
      };
      out(root, 'cap', caps[tipo + '-' + sinal]);
      SOM.set(f, playing && active && f > 0);
    }
    if (window.ResizeObserver) new ResizeObserver(draw).observe($(root, 'canvas'));
    draw();
    return {
      redraw: draw,
      pause() { active = false; SOM.stop(); },
      resume() { active = true; draw(); }
    };
  };

  /* ======================================================
     Alarme: padrões de LED e som no tempo
     ====================================================== */
  SIMS.alarme = root => {
    const cv = canvas2d($(root, 'canvas'));
    const ledEl = out(root, 'led');
    let pad = 'bip', armed = false, playing = false, active = true, t = 0;
    const hist = [];                                     // [t, on, f]
    const WIN = 4;
    const P = {
      bip: { f: t => { const p = t % 0.5; return { on: p < 0.2, f: 2000, led: p < 0.2 }; },
        cap: '<b>Bip intermitente</b>: 0,2 s ligado, 0,3 s desligado, sempre 2 kHz. O LED pisca junto. É o padrão de “porta aberta”.' },
      sirene: { f: t => ({ on: true, f: 1000 - 450 * Math.cos(2 * Math.PI * t / 1.4), led: (t % 0.5) < 0.25 }),
        cap: '<b>Sirene</b>: o som nunca para, mas a frequência sobe e desce (de ~550 a ~1450 Hz). Só dá para fazer com buzzer <b>passivo</b>, mudando a nota com o tempo.' },
      tres: { f: t => { const p = t % 2; const on = p < 0.66 && (p % 0.22) < 0.12; return { on, f: 2600, led: p < 0.66 }; },
        cap: '<b>3 bipes + pausa</b>: um padrão diferente para cada evento ajuda a saber o que aconteceu sem olhar (ex.: bateria fraca).' }
    };
    const btnArm = act(root, 'arm', () => {
      armed = !armed;
      toggleBtn(btnArm, armed, ['Silenciar', 'Disparar']);
      pill(out(root, 'st'), armed ? 'off' : 'on', armed ? 'DISPARADO' : 'armado · em silêncio');
    });
    const btnSom = act(root, 'som', () => {
      playing = !playing;
      if (playing && !SOM.start()) playing = false;
      toggleBtn(btnSom, playing, ['🔊 Som ligado', '🔈 Ouvir']);
    });
    seg(root, 'p', v => { pad = v; out(root, 'cap', P[v].cap); });
    pill(out(root, 'st'), 'on', 'armado · em silêncio');
    out(root, 'cap', P.bip.cap);

    function draw() {
      const { ctx, w, h } = cv;
      const pd = { l: 52, r: 12, t: 14, b: 24 };
      ctx.fillStyle = C.plot; ctx.fillRect(0, 0, w, h);
      const W = w - pd.l - pd.r, H = h - pd.t - pd.b, FM = 3000;
      ctx.strokeStyle = C.surf3; ctx.lineWidth = 1; ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      [0, 1000, 2000, 3000].forEach(f => {
        const y = pd.t + H - f / FM * H;
        ctx.beginPath(); ctx.moveTo(pd.l, y); ctx.lineTo(w - pd.r, y); ctx.stroke();
        ctx.fillText(f ? (f / 1000) + ' kHz' : 'mudo', pd.l - 6, y + 4);
      });
      ctx.textAlign = 'left'; ctx.fillText('−4 s', pd.l, h - 6); ctx.textAlign = 'right'; ctx.fillText('agora', w - pd.r, h - 6);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.lineCap = 'round';
      let open = false; ctx.beginPath();
      for (const [ht, on, f] of hist) {
        const x = pd.l + (1 - (t - ht) / WIN) * W, y = pd.t + H - f / FM * H;
        if (on) { open ? ctx.lineTo(x, y) : ctx.moveTo(x, y); open = true; } else open = false;
      }
      ctx.stroke();
    }
    return {
      tick(dt) {
        t += dt;
        const s = armed ? P[pad].f(t) : { on: false, f: 0, led: false };
        hist.push([t, s.on, s.on ? s.f : 0]);
        while (hist.length && t - hist[0][0] > WIN) hist.shift();
        ledEl.classList.toggle('on', s.led);
        SOM.set(s.f, playing && active && s.on);
        draw();
      },
      pause() { active = false; SOM.stop(); },
      resume() { active = true; },
      redraw: draw
    };
  };

  /* ======================================================
     PWM: duty, frequência e resolução
     ====================================================== */
  SIMS.pwm = root => {
    const cv = canvas2d($(root, 'canvas'));
    const dIn = inp(root, 'd');
    const ledEl = out(root, 'led');
    let f = 1000, bits = 8, t = 0;
    const FCAP = {
      1: 'A <b>1 Hz</b> dá para ver o LED piscar: liga e desliga uma vez por segundo. Ainda não parece “meio aceso”.',
      10: 'A <b>10 Hz</b> o pisca‑pisca fica rápido e incômodo, mas o olho ainda percebe.',
      1000: 'A <b>1 kHz</b> o olho não acompanha: você vê só a <b>média</b>, um brilho fixo proporcional ao duty. É a faixa usada para LEDs.',
      20000: 'A <b>20 kHz</b>, acima do que o ouvido escuta: é a frequência usada em <b>motores</b>, para eles não zumbirem.'
    };
    const fTxt = v => v >= 1000 ? (v / 1000) + ' kHz' : v + ' Hz';
    function draw() {
      const { ctx, w, h } = cv;
      const pad = { l: 46, r: 12, t: 18, b: 28 };
      axes(ctx, w, h, pad, ['3,3 V', '0 V']);
      const d = +dIn.value / 100, W = w - pad.l - pad.r, N = 4;
      const yH = pad.t, yL = h - pad.b;
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k = 0; k < N; k++) {
        const x0 = pad.l + k / N * W, x1 = x0 + d / N * W, x2 = pad.l + (k + 1) / N * W;
        if (d <= 0) { k ? ctx.lineTo(x2, yL) : (ctx.moveTo(x0, yL), ctx.lineTo(x2, yL)); continue; }
        if (d >= 1) { k ? ctx.lineTo(x2, yH) : (ctx.moveTo(x0, yH), ctx.lineTo(x2, yH)); continue; }
        k ? ctx.lineTo(x0, yH) : ctx.moveTo(x0, yH);
        ctx.lineTo(x1, yH); ctx.lineTo(x1, yL); ctx.lineTo(x2, yL);
      }
      ctx.stroke();
      // média
      const ym = yL - d * (yL - yH);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = C.orange; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pad.l, ym); ctx.lineTo(w - pad.r, ym); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.orange; ctx.textAlign = 'right'; ctx.font = '600 12px IBM Plex Mono, monospace';
      ctx.fillText(`média ${fmt(3.3 * d, 2)} V`, w - pad.r - 4, ym > pad.t + 20 ? ym - 6 : ym + 16);
      // eixo do tempo: 4 períodos
      const per = 1000 / f;                              // ms
      ctx.fillStyle = C.muted; ctx.font = '11px IBM Plex Mono, monospace';
      ctx.textAlign = 'left'; ctx.fillText('0', pad.l, h - 9);
      ctx.textAlign = 'right'; ctx.fillText(per >= 1 ? `${fmtN(per * N, 1)} ms` : `${fmtN(per * N * 1000, 0)} µs`, w - pad.r, h - 9);
      ctx.textAlign = 'center'; ctx.fillStyle = C.text2;
      ctx.fillText(`período T = ${per >= 1 ? fmtN(per, 2) + ' ms' : fmtN(per * 1000, 1) + ' µs'} · 4 períodos na tela`, pad.l + W / 2, h - 9);
      // cursor do tempo real nas frequências lentas
      if (f <= 10) {
        const ph = (t * f) % N;
        const x = pad.l + ph / N * W;
        ctx.strokeStyle = C.yellow; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, pad.t - 6); ctx.lineTo(x, yL + 4); ctx.stroke();
      }
    }
    function update() {
      const d = +dIn.value / 100, max = 2 ** bits - 1;
      out(root, 'dv', `${dIn.value}%`);
      out(root, 'cnt', `${Math.round(d * max)} <small class="muted">de ${max}</small>`);
      out(root, 'vm', fmt(3.3 * d, 2) + ' V');
      const per = 1000 / f;
      out(root, 'ton', per * d >= 1 ? fmtN(per * d, 2) + ' ms' : fmtN(per * d * 1000, 1) + ' µs');
      out(root, 'cap', FCAP[f]);
      draw();
    }
    seg(root, 'f', v => { f = +v; update(); });
    seg(root, 'res', v => { bits = +v; update(); });
    dIn.addEventListener('input', update);
    update();
    return {
      redraw: draw,
      tick(dt) {
        t += dt;
        const d = +dIn.value / 100;
        let b;
        if (f <= 10) { const ph = (t * f) % 1; b = ph < d ? 1 : 0; draw(); }
        else b = Math.pow(d, 0.55);                      // o olho vê a média (com curva de percepção)
        ledEl.style.background = b ? `rgba(255, 74, 74, ${0.22 + 0.78 * b})` : '';
        ledEl.style.boxShadow = b ? `0 0 ${8 + 28 * b}px ${2 + 8 * b}px rgba(255, 74, 74, ${0.6 * b})` : 'none';
      }
    };
  };

  /* ======================================================
     LED RGB: três PWMs misturam a cor
     ====================================================== */
  SIMS.rgb = root => {
    const ins = ['r', 'g', 'b'].map(k => inp(root, k));
    const an = inp(root, 'anodo');
    const sw = out(root, 'sw');
    const PRE = [['vermelho', 255, 0, 0], ['amarelo', 255, 160, 0], ['verde', 0, 255, 0], ['ciano', 0, 255, 255], ['azul', 0, 0, 255], ['roxo', 160, 0, 255], ['branco', 255, 255, 255], ['apagado', 0, 0, 0]];
    const pb = out(root, 'presets');
    pb.innerHTML = PRE.map(([n, r, g, b], i) => `<button type="button" class="btn ghost sm" data-i="${i}"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:6px;background:rgb(${r},${g},${b});border:1px solid var(--border)"></span>${n}</button>`).join('');
    pb.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      const p = PRE[+b.dataset.i];
      ins.forEach((el, k) => { el.value = p[k + 1]; });
      draw();
    }));
    const H2 = n => n.toString(16).toUpperCase().padStart(2, '0');
    const COL = ['#ff4a4a', '#46dd6a', '#4f8bff'];
    function draw() {
      const v = ins.map(el => +el.value);
      ['rv', 'gv', 'bv'].forEach((k, i) => out(root, k, v[i]));
      // o olho soma as três luzes
      sw.style.background = `rgb(${v.join(',')})`;
      const lum = Math.max(...v) / 255;
      sw.style.boxShadow = lum ? `0 0 ${10 + 30 * lum}px ${4 + 8 * lum}px rgba(${v.join(',')}, ${0.55 * lum})` : 'none';
      const inv = an.checked;
      const sent = v.map(x => inv ? 255 - x : x);
      out(root, 'duty', ['R', 'G', 'B'].map((n, i) => `<div class="duty"><span style="color:${COL[i]}">${n} · pino</span><div class="tr"><i style="width:${sent[i] / 2.55}%;background:${COL[i]}"></i></div><b>${sent[i]} (${Math.round(sent[i] / 2.55)}%)</b></div>`).join(''));
      out(root, 'hex', `#${v.map(H2).join('')}`);
      out(root, 'cap', inv
        ? 'No <b>ânodo comum</b> a perna comum vai no 3,3 V e o LED acende quando o pino vai a 0 V. A lógica se inverte: para mais brilho, o duty enviado é <b>menor</b> (255 − valor).'
        : 'No <b>cátodo comum</b> a perna comum vai no GND: mais duty, mais brilho. Cada cor tem o seu canal PWM e o seu resistor; o olho mistura as três luzes.');
    }
    ins.forEach(el => el.addEventListener('input', draw));
    an.addEventListener('change', draw);
    draw();
    return {};
  };
})();
