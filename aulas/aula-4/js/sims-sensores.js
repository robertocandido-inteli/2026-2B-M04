/* ==========================================================
   Simulações — ponte de Wheatstone, alarme de gás e requisitos não funcionais.
   Usa os utilitários publicados em window.KIT por kit.js.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, clamp, fmt, stageOf, txt, wire, canvas2d, seg, pill, toggleBtn } = window.KIT;
  const FONT11 = '11px IBM Plex Mono, monospace';
  function grid(ctx, L, R, w, ys, Y, lab) {
    ctx.font = FONT11; ctx.lineWidth = 1; ctx.strokeStyle = '#2a2238'; ctx.fillStyle = '#6d6585'; ctx.textAlign = 'right';
    ys.forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(lab(v), L - 4, Y(v) + 4); });
  }
  function hline(ctx, L, x1, y, color, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.setLineDash(dash || [5, 4]);
    ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(x1, y); ctx.stroke(); ctx.setLineDash([]);
  }
  const fmtR = r => r >= 1e6 ? fmt(r / 1e6, 2) + ' MΩ' : r >= 1000 ? fmt(r / 1000, r < 10000 ? 2 : 1) + ' kΩ' : Math.round(r) + ' Ω';
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  /* ======================================================
     Ponte de Wheatstone com LDR
     ====================================================== */
  SIMS.bridge = root => {
    const svg = stageOf(root), pl = canvas2d($(root, '[data-c="plot"]'));
    const lIn = inp(root, 'l'), rIn = inp(root, 'r'), rip = act(root, 'ripple');
    const DT = 0.02, WIN = 8;
    let ripple = false, t = 0, acc = 0, data = [];
    rip.addEventListener('click', () => { ripple = !ripple; toggleBtn(rip, ripple); });

    // desenho estático
    const XL = 90, XR = 350, YT = 28, YA = 115, YG = 205;
    wire(svg, `M${XL} ${YT} H${XR} M${XL} ${YT} V42 M${XR} ${YT} V42`);
    wire(svg, `M${XL} 98 V136 M${XR} 98 V136 M${XL} 190 V${YG} M${XR} 190 V${YG} M${XL} ${YG} H${XR}`);
    wire(svg, `M${XL} ${YA} H188 M${XR} ${YA} H252`, { color: C.mint, w: 2 });
    txt(svg, 220, 20, 'Vs', { fill: C.text, size: 13, weight: 600 });
    txt(svg, 220, YG - 6, 'GND', { size: 11 });
    const vsT = txt(svg, 262, 20, '', { size: 11, anchor: 'start' });
    [[XL, 42, 'R1 10 kΩ', C.blue], [XR, 42, 'R3 10 kΩ', C.blue]].forEach(([x, y, n, c]) => {
      S('rect', { x: x - 13, y, width: 26, height: 56, rx: 5, fill: C.plot, stroke: c, 'stroke-width': 2.5 }, svg);
      txt(svg, x < 200 ? x - 22 : x + 22, y + 32, n, { size: 11, fill: C.muted, anchor: x < 200 ? 'end' : 'start' });
    });
    S('rect', { x: XL - 13, y: 136, width: 26, height: 54, rx: 5, fill: C.plot, stroke: C.orange, 'stroke-width': 2.5 }, svg);
    S('rect', { x: XR - 13, y: 136, width: 26, height: 54, rx: 5, fill: C.plot, stroke: C.yellow, 'stroke-width': 2.5 }, svg);
    S('path', { d: `M${XR - 20} 182 L${XR + 20} 144 m-8 0 h8 v8`, fill: 'none', stroke: C.yellow, 'stroke-width': 2 }, svg);
    const rays = S('path', { d: `M${XL - 52} 136 l18 14 m-6 0 h6 v-6 M${XL - 52} 156 l18 14 m-6 0 h6 v-6`, fill: 'none', stroke: C.yellow, 'stroke-width': 2.2 }, svg);
    txt(svg, XL - 22, 205, 'LDR', { fill: C.orange, size: 12, weight: 600, anchor: 'end' });
    const ldrT = txt(svg, XL + 22, 168, '', { size: 11, fill: C.orange, anchor: 'start' });
    txt(svg, XR + 24, 205, 'R ajuste', { fill: C.yellow, size: 12, weight: 600, anchor: 'start' });
    const rajT = txt(svg, XR - 22, 168, '', { size: 11, fill: C.yellow, anchor: 'end' });
    S('circle', { cx: XL, cy: YA, r: 4, fill: C.mint }, svg);
    S('circle', { cx: XR, cy: YA, r: 4, fill: C.mint }, svg);
    txt(svg, XL - 10, YA + 4, 'A', { fill: C.mint, size: 13, weight: 700, anchor: 'end' });
    txt(svg, XR + 10, YA + 4, 'B', { fill: C.mint, size: 13, weight: 700, anchor: 'start' });
    const vaT = txt(svg, XL + 12, YA - 8, '', { size: 11, fill: C.orange, anchor: 'start' });
    const vbT = txt(svg, XR - 12, YA - 8, '', { size: 11, fill: C.blue, anchor: 'end' });
    S('circle', { cx: 220, cy: YA, r: 32, fill: C.surf, stroke: C.mint, 'stroke-width': 2.5 }, svg);
    txt(svg, 220, YA - 8, 'Vd', { size: 11, fill: C.muted });
    const vdT = txt(svg, 220, YA + 10, '', { size: 14, weight: 700, fill: C.mint });
    const doT = txt(svg, 220, YG + 30, '', { size: 11.5, weight: 600 });

    const rLdr = lux => clamp(10000 * Math.pow(lux / 10, -0.7), 100, 1e6);
    function sample() {
      t += DT;
      const lux = Math.pow(10, +lIn.value), rl = rLdr(lux), ra = Math.pow(10, +rIn.value);
      const vs = 3.3 * (1 + (ripple ? 0.08 * Math.sin(2 * Math.PI * 0.8 * t) : 0)) + gauss() * 0.004;
      const va = vs * rl / (10000 + rl), vb = vs * ra / (10000 + ra);
      data.push({ t, va, vb, vd: va - vb });
      while (data.length && data[0].t < t - WIN) data.shift();
      return { lux, rl, ra, vs, va, vb };
    }
    function paint(s) {
      out(root, 'l', (s.lux < 10 ? fmt(s.lux, 1) : Math.round(s.lux).toLocaleString('pt-BR')) + ' lux');
      out(root, 'r', fmtR(s.ra));
      rays.setAttribute('opacity', 0.15 + 0.85 * (+lIn.value / 4));
      ldrT.textContent = fmtR(s.rl); rajT.textContent = fmtR(s.ra);
      vsT.textContent = fmt(s.vs, 2) + ' V';
      vaT.textContent = 'VA ' + fmt(s.va, 2) + ' V'; vbT.textContent = 'VB ' + fmt(s.vb, 2) + ' V';
      const vd = (s.va - s.vb) * 1000;
      vdT.textContent = (Math.abs(vd) < 1000 ? Math.round(vd) + ' mV' : fmt(vd / 1000, 2) + ' V');
      const dark = vd > 0;
      doT.textContent = 'comparador: DO = ' + (dark ? 'HIGH (mais escuro que a referência)' : 'LOW (mais claro que a referência)');
      doT.setAttribute('fill', dark ? C.blue : C.yellow);
    }
    function draw() {
      const { ctx, w, h } = pl, L = 40, R = 10, T = 8, B = 8, pw = w - L - R, ph = h - T - B;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * pw, Y = v => T + ph - (clamp(v, -1.8, 3.7) + 1.8) / 5.5 * ph;
      ctx.clearRect(0, 0, w, h);
      grid(ctx, L, R, w, [-1, 0, 1, 2, 3], Y, v => v + ' V');
      [['va', C.orange, 2], ['vb', C.blue, 1.2], ['vd', C.mint, 2.4]].forEach(([k, col, lw]) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
        data.forEach((d, i) => { const x = X(d.t), y = Y(d[k]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.stroke();
      });
      ctx.font = FONT11; ctx.textAlign = 'left';
      ctx.fillStyle = C.orange; ctx.fillText('VA (divisor simples)', L + 6, T + 12);
      ctx.fillStyle = C.blue; ctx.fillText('VB', L + 160, T + 12);
      ctx.fillStyle = C.mint; ctx.fillText('Vd = VA − VB', L + 192, T + 12);
    }
    let last = null;
    for (let i = 0; i < WIN / DT; i++) last = sample();
    paint(last);
    return {
      tick(dt) { acc += dt; while (acc >= DT) { acc -= DT; last = sample(); } paint(last); draw(); },
      redraw: draw
    };
  };

  /* ======================================================
     Monitoramento de gás: aquecimento, confirmação, histerese
     ====================================================== */
  SIMS.gas = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), stEl = out(root, 'st');
    const bSmall = act(root, 'small'), bBig = act(root, 'big');
    const DT = 0.1, WIN = 60, LIGA = 1000, DESLIGA = 600, AQUEC = 15, CONF = 3;
    let modo = 'simples', leak = 0, t = 0, acc = 0, tBoot = 0, room = 40, sens = 40, alarme = false, tAcima = 0, n = 0, data = [];
    seg(root, 'modo', v => { modo = v; n = 0; alarme = false; tAcima = t; out(root, 'n', 0); });
    act(root, 'boot', () => { tBoot = t; alarme = false; tAcima = t; });
    function setLeak(v) {
      leak = leak === v ? 0 : v;
      toggleBtn(bSmall, leak === 1); toggleBtn(bBig, leak === 2);
    }
    bSmall.addEventListener('click', () => setLeak(1));
    bBig.addEventListener('click', () => setLeak(2));
    function sample() {
      t += DT;
      const alvo = leak === 2 ? 3000 : leak === 1 ? 1120 + 170 * Math.sin(0.9 * t) : 40;
      room += (alvo - room) * DT / 4;
      sens += (room - sens) * DT / (room > sens ? 2.5 : 6);
      const warm = 2600 * Math.exp(-(t - tBoot) / 4);
      const ppm = Math.max(0, (sens + warm) * (1 + 0.06 * gauss()) + 12 * gauss());
      let st;
      const was = alarme;
      if (modo === 'simples') {
        alarme = ppm > LIGA;
        st = alarme ? 'ALARME' : 'NORMAL';
      } else if (t - tBoot < AQUEC) {
        alarme = false; tAcima = t; st = 'AQUECENDO';
      } else {
        if (ppm < LIGA) tAcima = t;
        if (!alarme && t - tAcima >= CONF) alarme = true;
        if (alarme && ppm <= DESLIGA) alarme = false;
        st = alarme ? 'ALARME' : 'NORMAL';
      }
      if (alarme && !was) n++;
      data.push({ t, ppm, alarme, st });
      while (data.length && data[0].t < t - WIN) data.shift();
      pill(stEl, { NORMAL: 'on', AQUECENDO: 'info', ALARME: 'off' }[st], st);
      out(root, 'ppm', Math.round(ppm).toLocaleString('pt-BR'));
      out(root, 'n', n);
    }
    function draw() {
      const { ctx, w, h } = pl, L = 46, R = 10, T = 10, B = 10, pw = w - L - R, ph = h - T - B, MAX = 4000;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * pw, Y = v => T + ph - clamp(v, 0, MAX) / MAX * ph;
      const bw = pw / (WIN / DT) + 1;
      ctx.clearRect(0, 0, w, h);
      data.forEach(d => {
        if (d.alarme) { ctx.fillStyle = 'rgba(255,93,93,.14)'; ctx.fillRect(X(d.t) - bw / 2, T, bw, ph); }
        else if (d.st === 'AQUECENDO') { ctx.fillStyle = 'rgba(124,170,255,.10)'; ctx.fillRect(X(d.t) - bw / 2, T, bw, ph); }
      });
      grid(ctx, L, R, w, [0, 1000, 2000, 3000, 4000], Y, v => v);
      hline(ctx, L, w - R, Y(LIGA), C.red);
      ctx.font = FONT11; ctx.textAlign = 'right'; ctx.fillStyle = C.red; ctx.fillText(modo === 'simples' ? 'LIMITE 1000' : 'LIGA 1000', w - R - 4, Y(LIGA) - 5);
      if (modo === 'robusto') { hline(ctx, L, w - R, Y(DESLIGA), C.mint); ctx.fillStyle = C.mint; ctx.fillText('DESLIGA 600', w - R - 4, Y(DESLIGA) + 14); }
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = Y(d.ppm); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    return {
      tick(dt) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } draw(); },
      redraw: draw
    };
  };

  /* ======================================================
     RNF em conflito: intervalo × autonomia × latência
     ====================================================== */
  SIMS.rnf = root => {
    const iIn = inp(root, 'i');
    const INT = [1, 5, 10, 30, 60, 120, 300, 600, 1800];
    const BAT = 3000 * 0.8;                       // mAh utilizáveis
    const SLEEP = { dev: 10, lp: 0.02 };          // mA dormindo
    const SENS = { ntc: [0.05, 40], ds: [0.75, 41.5], mq: [0.05, 40] }; // s acordado lendo, mA
    const BOOT = [0.3, 40], WIFI = [2.5, 120], HEATER = 150;
    const RNF_AUT = 180, RNF_LAT = 120;
    let sensor = 'ntc', placa = 'lp', envio = 'cada';
    seg(root, 'sensor', v => { sensor = v; calc(); });
    seg(root, 'placa', v => { placa = v; calc(); });
    seg(root, 'envio', v => { envio = v; calc(); });
    iIn.addEventListener('input', calc);
    const fmtT = s => s < 60 ? fmt(s, s < 10 ? 1 : 0) + ' s' : s < 3600 ? fmt(s / 60, s % 60 ? 1 : 0) + ' min' : fmt(s / 3600, 1) + ' h';
    const fmtI = i => i < 1 ? fmt(i * 1000, 0) + ' µA' : fmt(i, i < 10 ? 2 : 1) + ' mA';
    function calc() {
      const iv = INT[+iIn.value], [ts, is] = SENS[sensor];
      const active = BOOT[0] + ts + (envio === 'cada' ? WIFI[0] : 0);
      const P = Math.max(iv, active);
      const parts = {
        sono: SLEEP[placa] * Math.max(0, P - active) / P,
        leitura: (BOOT[0] * BOOT[1] + ts * is) / P,
        wifi: envio === 'cada' ? WIFI[0] * WIFI[1] / P : WIFI[0] * WIFI[1] / 3600,
        aquecedor: sensor === 'mq' ? HEATER : 0
      };
      const I = parts.sono + parts.leitura + parts.wifi + parts.aquecedor;
      const hours = BAT / I, days = hours / 24;
      const lat = P + BOOT[0] + ts + WIFI[0];
      out(root, 'i', fmtT(iv));
      out(root, 'im', fmtI(I));
      out(root, 'aut', days >= 2 ? fmt(days, 0) + ' dias' : fmt(hours, 0) + ' h');
      out(root, 'lat', fmtT(lat));
      const ok1 = days >= RNF_AUT, ok2 = lat <= RNF_LAT;
      pill(out(root, 'r1'), ok1 ? 'on' : 'off', `RNF-01 autonomia ≥ 6 meses ${ok1 ? '✓' : '✗'}`);
      pill(out(root, 'r2'), ok2 ? 'on' : 'off', `RNF-02 alarme em ≤ 2 min ${ok2 ? '✓' : '✗'}`);
      const COL = { sono: C.wire, leitura: C.blue, wifi: C.orange, aquecedor: C.red };
      const NOME = { sono: 'sono', leitura: 'acordar + ler', wifi: 'Wi‑Fi', aquecedor: 'aquecedor MQ' };
      out(root, 'bar', Object.keys(parts).map(k => `<span style="flex-grow:${parts[k]};background:${window.TEMA ? TEMA.cor(COL[k]) : COL[k]}"></span>`).join(''));
      out(root, 'leg', Object.keys(parts).filter(k => parts[k] > 0).map(k =>
        `<span><i style="background:${window.TEMA ? TEMA.cor(COL[k]) : COL[k]}"></i>${NOME[k]} ${fmtI(parts[k])} · ${Math.round(parts[k] / I * 100)} %</span>`).join(''));
      let msg;
      if (sensor === 'mq') msg = '<span class="c-red">O aquecedor do MQ-2 consome ~150 mA o tempo todo</span>: nenhum intervalo salva a bateria. Aqui o RNF de autonomia muda a arquitetura: sensor de gás pede alimentação pela rede.';
      else if (placa === 'dev') msg = '<span class="c-orange">Dormindo, o regulador, o conversor USB-serial e o LED da DevKit consomem ~10 mA.</span> A escolha da placa limita a autonomia antes de qualquer linha de código.';
      else if (active > iv) msg = '<span class="c-orange">O ciclo (acordar, ler, transmitir) é mais longo que o intervalo</span>: a placa nem chega a dormir.';
      else if (ok1 && ok2) msg = '<span class="c-mint">Atende aos dois RNF.</span> Compare quanto cada parcela pesa: em geral, o rádio domina.';
      else if (sensor === 'ds') msg = 'O DS18B20 em 12 bits mantém o ESP32 acordado 750 ms por leitura. Ele atende aos dois RNF? Uma saída seria usar 9 bits (~94 ms), se a resolução de 0,5 °C bastar.';
      else if (!ok1) msg = 'A bateria não chega a 6 meses. Aumente o intervalo ou transmita só quando necessário, sem estourar o prazo do alarme.';
      else msg = 'Autonomia de sobra, mas o alarme demora demais. Encurte o intervalo entre leituras.';
      out(root, 'msg', msg);
    }
    calc();
    return { redraw: calc };
  };
})();
