/* ==========================================================
   Simulações — atuadores: servomotor (pulso de 50 Hz),
   motor DC com ponte H e motor de passo.
   Mostram o sinal e o movimento; nada aqui se conecta a uma placa.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, clamp, fmt, fmtN, stageOf, txt, wire, canvas2d, seg, pill, toggleBtn } = window.KIT;
  const rad = a => a * Math.PI / 180;

  /* ======================================================
     Servo: largura do pulso → ângulo
     ====================================================== */
  SIMS.servo = root => {
    const svg = stageOf(root);
    const cv = canvas2d($(root, 'canvas'));
    const aIn = inp(root, 'a');
    const CX = 130, CY = 140;
    let real = 90, sweep = false, sDir = 1;

    // escala de 0° a 180°
    S('path', { d: `M${CX - 100} ${CY} A100 100 0 0 1 ${CX + 100} ${CY}`, fill: 'none', stroke: C.surf3, 'stroke-width': 2, 'stroke-dasharray': '3 5' }, svg);
    [0, 45, 90, 135, 180].forEach(a => {
      const x = CX - Math.cos(rad(a)) * 112, y = CY - Math.sin(rad(a)) * 112;
      txt(svg, x, y + 4, a + '°', { size: 11 });
    });
    // corpo do servo
    S('rect', { x: CX - 58, y: CY - 22, width: 116, height: 62, rx: 8, fill: '#2b6fd6', stroke: '#1c4f9e', 'stroke-width': 2 }, svg);
    S('rect', { x: CX - 74, y: CY - 6, width: 148, height: 12, rx: 3, fill: '#2b6fd6', stroke: '#1c4f9e', 'stroke-width': 2 }, svg);
    S('text', { x: CX + 18, y: CY + 28, text: 'SG90', fill: '#dfe9ff', 'font-size': 12, 'font-family': 'IBM Plex Mono, monospace', 'font-weight': 700, 'text-anchor': 'middle' }, svg);
    const horn = S('g', {}, svg);
    S('path', { d: 'M-8 0 L-5 -78 Q0 -86 5 -78 L8 0 Z', fill: '#f2f2f2', stroke: '#b9b9c4', 'stroke-width': 1.5 }, horn);
    S('circle', { cx: 0, cy: 0, r: 13, fill: '#f2f2f2', stroke: '#b9b9c4', 'stroke-width': 1.5 }, horn);
    S('circle', { cx: 0, cy: 0, r: 4, fill: '#8a8399' }, horn);
    const tgt = S('line', { x1: CX, y1: CY, x2: CX, y2: CY - 100, stroke: C.yellow, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg);
    // os três fios
    [['#7a4b2a', 'GND'], ['#e0452f', '5 V'], ['#f2a33a', 'sinal']].forEach(([c, n], i) => {
      wire(svg, `M${CX + 58} ${CY + 18 + i * 7} H${CX + 112}`, { color: c, w: 3 });
    });
    txt(svg, CX + 116, CY + 40, 'GND · 5 V · sinal', { size: 9.5, anchor: 'end' });

    const pulse = a => 1 + a / 180;                      // ms (faixa didática 1–2 ms)
    function drawWave() {
      const { ctx, w, h } = cv;
      const pad = { l: 40, r: 10, t: 16, b: 24 };
      ctx.fillStyle = C.plot; ctx.fillRect(0, 0, w, h);
      const W = w - pad.l - pad.r, T = 40, p = pulse(+aIn.value);
      const yH = pad.t, yL = h - pad.b, X = ms => pad.l + ms / T * W;
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText('3,3 V', pad.l - 4, yH + 4); ctx.fillText('0 V', pad.l - 4, yL + 4);
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), yH);
      [0, 20].forEach((t0, i) => {
        if (i) { ctx.lineTo(X(t0), yL); ctx.lineTo(X(t0), yH); }
        ctx.lineTo(X(t0 + p), yH); ctx.lineTo(X(t0 + p), yL);
      });
      ctx.lineTo(X(T), yL); ctx.stroke();
      // marcações
      ctx.strokeStyle = C.surf3; ctx.lineWidth = 1; ctx.setLineDash([3, 4]);
      [20, 40].forEach(ms => { ctx.beginPath(); ctx.moveTo(X(ms), yH - 6); ctx.lineTo(X(ms), yL); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.fillStyle = C.orange; ctx.textAlign = 'left'; ctx.font = '600 12px IBM Plex Mono, monospace';
      ctx.fillText(`← pulso ${fmtN(p, 2)} ms`, X(p) + 6, yH + 14);
      ctx.fillStyle = C.muted; ctx.font = '11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillText('0', X(0), h - 6); ctx.fillText('20 ms', X(20), h - 6); ctx.fillText('40 ms', X(40) - 18, h - 6);
      ctx.fillStyle = C.text2; ctx.fillText('um pulso a cada 20 ms (50 Hz)', X(30), yL - 10);
    }
    function update() {
      const a = +aIn.value, p = pulse(a);
      out(root, 'av', a + '°');
      out(root, 'pw', fmtN(p, 2) + ' ms');
      out(root, 'dt', fmtN(p / 20 * 100, 1) + '%');
      out(root, 'cnt', Math.round(p / 20 * 65535));
      tgt.setAttribute('x2', CX - Math.cos(rad(a)) * 100); tgt.setAttribute('y2', CY - Math.sin(rad(a)) * 100);
      out(root, 'cap', a === 90 ? 'Pulso de <b>1,5 ms</b>: o servo vai para o <b>meio</b> (90°) e fica lá, fazendo força para não sair.' :
        `Pulso de <b>${fmtN(p, 2)} ms</b> → <b>${a}°</b>. O que importa é a <b>largura</b> do pulso, não a média: a frequência fica fixa em 50 Hz.`);
      drawWave();
    }
    root.querySelectorAll('[data-ang]').forEach(b => b.addEventListener('click', () => { aIn.value = b.dataset.ang; sweep = false; toggleBtn(btnSw, false); update(); }));
    const btnSw = act(root, 'sweep', () => { sweep = !sweep; toggleBtn(btnSw, sweep); });
    aIn.addEventListener('input', () => { sweep = false; toggleBtn(btnSw, false); update(); });
    update();
    return {
      redraw: drawWave,
      tick(dt) {
        if (sweep) {
          let a = +aIn.value + sDir * 60 * dt * 1.5;
          if (a >= 180) { a = 180; sDir = -1; } if (a <= 0) { a = 0; sDir = 1; }
          aIn.value = Math.round(a); update();
        }
        const a = +aIn.value, step = 300 * dt;          // ~300°/s
        real += clamp(a - real, -step, step);
        horn.setAttribute('transform', `translate(${CX} ${CY}) rotate(${real - 90})`);
        pill(out(root, 'ang'), Math.abs(a - real) < 0.5 ? 'on' : 'warn', Math.abs(a - real) < 0.5 ? `parado em ${a}°` : `girando… ${Math.round(real)}°`);
      }
    };
  };

  /* ======================================================
     Motor DC + ponte H
     ====================================================== */
  SIMS.ponteh = root => {
    const svg = stageOf(root);
    const vIn = inp(root, 'v');
    let modo = 'frente', ang = 0, speed = 0, dash = 0;
    const L = 150, R = 370, TOP = 34, BOT = 226, MID = 130, BX = 56;

    // trilhos e bateria
    wire(svg, `M${BX} ${TOP} H${R}`, { w: 3 }); wire(svg, `M${BX} ${BOT} H${R}`, { w: 3 });
    wire(svg, `M${BX} ${TOP} V${MID - 18} M${BX} ${MID + 18} V${BOT}`, { w: 3 });
    S('path', { d: `M${BX - 18} ${MID - 18} H${BX + 18} M${BX - 10} ${MID - 8} H${BX + 10} M${BX - 18} ${MID + 2} H${BX + 18} M${BX - 10} ${MID + 12} H${BX + 10}`, stroke: C.text2, 'stroke-width': 3 }, svg);
    txt(svg, BX - 2, TOP - 12, 'V+ do motor (6–12 V)', { size: 11, anchor: 'start', fill: C.red });
    txt(svg, BX - 2, BOT + 22, 'GND', { size: 11, anchor: 'start' });
    // pernas
    wire(svg, `M${L} ${TOP} V${BOT} M${R} ${TOP} V${BOT}`, { w: 3 });
    wire(svg, `M${L} ${MID} H${260 - 36} M${260 + 36} ${MID} H${R}`, { w: 3 });
    const path = S('path', { d: '', fill: 'none', stroke: C.orange, 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.85, 'stroke-dasharray': '10 12' }, svg);
    // chaves
    const SW = {};
    [['S1', L, (TOP + MID) / 2], ['S3', R, (TOP + MID) / 2], ['S2', L, (MID + BOT) / 2], ['S4', R, (MID + BOT) / 2]].forEach(([n, x, y]) => {
      const g = S('g', {}, svg);
      const r = S('rect', { x: x - 20, y: y - 15, width: 40, height: 30, rx: 7, fill: C.plot, stroke: C.border, 'stroke-width': 2.5 }, g);
      const t = txt(g, x, y + 5, n, { size: 12, weight: 700, fill: C.muted });
      SW[n] = { r, t };
    });
    // motor
    S('circle', { cx: 260, cy: MID, r: 36, fill: C.plot, stroke: C.blue, 'stroke-width': 3 }, svg);
    const rotor = S('g', {}, svg);
    S('path', { d: 'M-24 0 H24 M0 -24 V24', stroke: C.blue, 'stroke-width': 4, 'stroke-linecap': 'round' }, rotor);
    S('circle', { cx: 0, cy: -24, r: 5, fill: C.orange }, rotor);
    txt(svg, 260, MID + 56, 'M', { size: 13, weight: 700, fill: C.blue });

    const M = {
      frente: { on: ['S1', 'S4'], d: `M${BX} ${TOP} H${L} V${MID} H${R} V${BOT} H${BX}`, col: C.orange, in: [1, 0], dir: 1,
        cap: '<b>Frente</b>: S1 e S4 fechadas. A corrente entra pela esquerda do motor e sai pela direita.' },
      re: { on: ['S3', 'S2'], d: `M${BX} ${TOP} H${R} V${MID} H${L} V${BOT} H${BX}`, col: C.orange, in: [0, 1], dir: -1,
        cap: '<b>Ré</b>: S3 e S2 fechadas. A corrente atravessa o motor no sentido contrário, e ele gira ao contrário.' },
      freio: { on: ['S2', 'S4'], d: `M${L} ${MID} V${BOT} H${R} V${MID} H${L}`, col: C.mint, in: [1, 1], dir: 0, brake: true,
        cap: '<b>Freio</b>: S2 e S4 fechadas ligam os dois lados do motor no GND. O motor vira gerador contra si mesmo e para rápido.' },
      solto: { on: [], d: '', col: C.mint, in: [0, 0], dir: 0,
        cap: '<b>Solto</b>: todas abertas. Sem corrente, o motor vai parando sozinho, pela inércia.' },
      curto: { on: ['S1', 'S2'], d: `M${BX} ${TOP} H${L} V${BOT} H${BX}`, col: C.red, in: null, dir: 0,
        cap: '<b>Curto‑circuito</b>: S1 e S2 juntas ligam o V+ direto no GND, sem passar pelo motor. Queima os transistores. Os módulos prontos (L298N, DRV8833) impedem isso pela lógica de IN1/IN2.' }
    };
    function update() {
      const m = M[modo], v = +vIn.value;
      Object.entries(SW).forEach(([n, s]) => {
        const on = m.on.includes(n);
        s.r.setAttribute('fill', on ? (modo === 'curto' ? C.red : C.mint) : C.plot);
        s.r.setAttribute('stroke', on ? (modo === 'curto' ? C.red : C.mint) : C.border);
        s.t.setAttribute('fill', on ? C.bg : C.muted);
      });
      path.setAttribute('d', m.d);
      path.setAttribute('stroke', m.col);
      out(root, 'vv', v + '%');
      out(root, 'in1', m.in ? m.in[0] : '–');
      out(root, 'in2', m.in ? m.in[1] : '–');
      out(root, 'en', m.dir ? `${v}%` : modo === 'freio' ? '100%' : modo === 'solto' ? '0%' : '–');
      out(root, 'cap', m.cap + (m.dir ? ` O <b>PWM</b> no pino de habilitação (EN) liga e desliga a ponte rapidamente: ${v}% do tempo ligada → ~${v}% da velocidade.` : ''));
    }
    seg(root, 'm', v => { modo = v; update(); });
    vIn.addEventListener('input', update);
    update();
    return {
      tick(dt) {
        const m = M[modo];
        const alvo = m.dir * (+vIn.value / 100);
        const k = m.brake ? 6 : m.dir ? 2.2 : 0.6;        // freio para rápido; solto vai parando
        speed += (alvo - speed) * Math.min(1, k * dt);
        if (Math.abs(speed) < 0.002 && !m.dir) speed = 0;
        ang += speed * 720 * dt;
        rotor.setAttribute('transform', `translate(260 ${MID}) rotate(${ang})`);
        const flow = modo === 'curto' ? 1.5 : m.brake ? Math.abs(speed) : m.dir ? +vIn.value / 100 : 0;
        dash -= flow * 90 * dt * (m.brake && speed < 0 ? -1 : 1);   // cada caminho já é desenhado no sentido da corrente
        path.setAttribute('stroke-dashoffset', dash);
        path.setAttribute('opacity', flow > 0.01 ? 0.85 : 0);
        out(root, 'rpm', Math.round(Math.abs(speed) * 6000) + ' rpm');
      }
    };
  };

  /* ======================================================
     Motor de passo: uma bobina por vez
     ====================================================== */
  SIMS.passo = root => {
    const svg = stageOf(root);
    const sIn = inp(root, 's');
    const CX = 120, CY = 120;
    const NOMES = ['A', 'B', 'A’', 'B’'];
    const coils = [];
    let n = 0, dir = 1, run = false, acc = 0, ang = 0;
    S('circle', { cx: CX, cy: CY, r: 98, fill: 'none', stroke: C.border, 'stroke-width': 2 }, svg);
    NOMES.forEach((nm, i) => {
      const a = i * 90;
      const g = S('g', { transform: `translate(${CX} ${CY}) rotate(${a})` }, svg);
      const r = S('rect', { x: -18, y: -96, width: 36, height: 34, rx: 6, fill: C.plot, stroke: C.border, 'stroke-width': 2.5 }, g);
      for (let k = 0; k < 4; k++) S('path', { d: `M-18 ${-90 + k * 7} H18`, stroke: C.wire, 'stroke-width': 1.5, opacity: 0.6 }, g);
      const tx = CX + Math.sin(rad(a)) * 52, ty = CY - Math.cos(rad(a)) * 52;
      const t = txt(svg, tx, ty + 5, nm, { size: 13, weight: 700, fill: C.muted });
      coils.push({ r, t });
    });
    const rotor = S('g', {}, svg);
    S('circle', { cx: 0, cy: 0, r: 30, fill: C.surf2, stroke: C.border, 'stroke-width': 2 }, rotor);
    S('path', { d: 'M-8 0 L0 -40 L8 0 Z', fill: C.red }, rotor);
    S('path', { d: 'M-8 0 L0 40 L8 0 Z', fill: C.blue }, rotor);
    txt(rotor, 0, -14, 'N', { size: 10, weight: 700, fill: '#fff' });
    const rows = Array.from(root.querySelectorAll('tbody tr'));

    function update() {
      const k = ((n % 4) + 4) % 4;
      coils.forEach((c, i) => {
        c.r.setAttribute('fill', i === k ? C.orange : C.plot);
        c.r.setAttribute('stroke', i === k ? C.orange : C.border);
        c.t.setAttribute('fill', i === k ? C.orange : C.muted);
      });
      rows.forEach((r, i) => r.classList.toggle('hot', i === k));
      pill(out(root, 'cnt'), 'info', `passos: ${n}`);
      out(root, 'sv', sIn.value + ' passos/s');
      out(root, 'cap', `Bobina <b>${NOMES[k]}</b> ligada: o ímã do rotor se alinha com ela. No desenho, 4 passos dão uma volta; num motor real de <b>200 passos/volta</b>, ${Math.abs(n)} passo${Math.abs(n) === 1 ? '' : 's'} = <b>${fmtN(n * 1.8, 1)}°</b>. A posição é conhecida contando os passos, sem sensor.`);
    }
    function step() { n += dir; update(); }
    act(root, 'step', () => { run = false; toggleBtn(btnRun, false, ['Parar', 'Girar']); step(); });
    const btnRun = act(root, 'run', () => { run = !run; toggleBtn(btnRun, run, ['Parar', 'Girar']); acc = 0; });
    act(root, 'zero', () => { n = 0; ang = 0; update(); });
    seg(root, 'dir', v => { dir = +v; });
    sIn.addEventListener('input', update);
    update();
    return {
      tick(dt) {
        if (run) { acc += dt * +sIn.value; while (acc >= 1) { acc -= 1; step(); } }
        const alvo = n * 90;
        ang += (alvo - ang) * Math.min(1, dt * 14);
        rotor.setAttribute('transform', `translate(${CX} ${CY}) rotate(${ang})`);
      },
      pause() { run = false; toggleBtn(btnRun, false, ['Parar', 'Girar']); }
    };
  };
})();
