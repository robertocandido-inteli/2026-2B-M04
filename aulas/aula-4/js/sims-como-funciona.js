/* ==========================================================
   Animações — como cada sensor funciona por dentro.
   Usa os utilitários publicados em window.KIT por kit.js.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, clamp, fmt, stageOf, txt, wire, canvas2d, seg, pill, toggleBtn, glow } = window.KIT;
  const FONT11 = '11px IBM Plex Mono, monospace';
  const fmtR = r => r >= 1e6 ? fmt(r / 1e6, 2) + ' MΩ' : r >= 1000 ? fmt(r / 1000, r < 10000 ? 2 : 1) + ' kΩ' : Math.round(r) + ' Ω';
  const rnd = (a, b) => a + Math.random() * (b - a);
  // posição ao longo de uma poligonal, u em [0,1)
  function along(pts, u) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const d = (u % 1) * L[L.length - 1];
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  }

  /* ======================================================
     Analógico × digital
     ====================================================== */
  SIMS.anadig = root => {
    const pl = canvas2d($(root, '[data-c="plot"]'));
    const DT = 0.03, WIN = 12, LIM = 0.55;
    let t = 0, acc = 0, data = [];
    const f = t => clamp(0.5 + 0.3 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 1.9 + 1) + 0.02 * Math.sin(t * 9), 0.02, 0.98);
    function sample() {
      t += DT; const v = f(t);
      data.push({ t, v, d: v > LIM });
      while (data.length && data[0].t < t - WIN) data.shift();
    }
    function draw() {
      const { ctx, w, h } = pl, L = 92, R = 12, T = 12, gap = 26, ph = h - T - 10 - gap, hA = ph * 0.62, hD = ph * 0.38;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * (w - L - R);
      const YA = v => T + hA - v * hA, y0D = T + hA + gap, YD = b => y0D + (b ? 0.1 : 0.9) * hD;
      ctx.clearRect(0, 0, w, h);
      ctx.font = FONT11; ctx.textAlign = 'left';
      ctx.fillStyle = C.mint; ctx.fillText('ANALÓGICO', 10, T + 14);
      ctx.fillStyle = C.muted; ctx.fillText('infinitos', 10, T + 30); ctx.fillText('valores', 10, T + 44);
      ctx.fillStyle = C.orange; ctx.fillText('DIGITAL', 10, y0D + 14);
      ctx.fillStyle = C.muted; ctx.fillText('só 0 ou 1', 10, y0D + 30);
      ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1;
      [[T, T + hA], [y0D, y0D + hD]].forEach(([a, b]) => { ctx.strokeRect(L, a, w - L - R, b - a); });
      ctx.strokeStyle = C.red; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(L, YA(LIM)); ctx.lineTo(w - R, YA(LIM)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.red; ctx.textAlign = 'right'; ctx.fillText('limiar', w - R - 4, YA(LIM) - 5);
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.5; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = YA(d.v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.strokeStyle = C.orange; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = YD(d.d); if (!i) ctx.moveTo(x, y); else { ctx.lineTo(x, YD(data[i - 1].d)); ctx.lineTo(x, y); } }); ctx.stroke();
      const last = data[data.length - 1];
      out(root, 'a', Math.round(last.v * 4095)); out(root, 'd', last.d ? '1 · HIGH' : '0 · LOW');
    }
    for (let i = 0; i < WIN / DT; i++) sample();
    return { tick(dt) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } draw(); }, redraw: draw };
  };

  /* ======================================================
     ADC: tensão → número
     ====================================================== */
  SIMS.adc = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), vIn = inp(root, 'v');
    let bits = 3;
    seg(root, 'bits', v => { bits = +v; });
    function draw() {
      const V = +vIn.value, N = 1 << bits, code = Math.min(N - 1, Math.floor(V / 3.3 * N));
      out(root, 'v', fmt(V, 2) + ' V');
      out(root, 'n', code.toLocaleString('pt-BR'));
      out(root, 'max', (N - 1).toLocaleString('pt-BR'));
      out(root, 'step', bits === 3 ? '≈ 412 mV' : '≈ 0,8 mV');
      out(root, 'bits', code.toString(2).padStart(bits, '0').split('').map(b => `<span class="${b === '1' ? 'one' : ''}">${b}</span>`).join(''));
      const { ctx, w, h } = pl, L = 48, R = 24, T = 12, B = 24, pw = w - L - R, ph = h - T - B;
      const X = v => L + v / 3.3 * pw, Y = c => T + ph - c / (N - 1) * ph;
      ctx.clearRect(0, 0, w, h);
      ctx.font = FONT11; ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1; ctx.fillStyle = '#6d6585';
      ctx.textAlign = 'center';[0, 1, 2, 3, 3.3].forEach(v => { ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.fillText(fmt(v, v === 3.3 ? 1 : 0) + ' V', X(v), h - 6); });
      ctx.textAlign = 'right';[0, N - 1].forEach(c => ctx.fillText(c, L - 6, Y(c) + 4));
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath();
      for (let c = 0; c < N; c++) { const a = X(c * 3.3 / N), b = X((c + 1) * 3.3 / N); c ? ctx.lineTo(a, Y(c)) : ctx.moveTo(a, Y(c)); ctx.lineTo(b, Y(c)); }
      ctx.stroke();
      ctx.strokeStyle = C.orange; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.2; ctx.beginPath();
      ctx.moveTo(X(V), T + ph); ctx.lineTo(X(V), Y(code)); ctx.lineTo(L, Y(code)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(X(V), Y(code), 6, 0, 7); ctx.fill();
      if (bits === 12) { ctx.fillStyle = C.muted; ctx.textAlign = 'left'; ctx.fillText('4096 degraus: tão pequenos que parecem uma rampa', L + 8, T + 14); }
    }
    return { tick: draw, redraw: draw };
  };

  /* ======================================================
     LDR: luz libera elétrons, a resistência cai
     ====================================================== */
  SIMS.ldr = root => {
    const svg = stageOf(root), lIn = inp(root, 'l');
    const CX = 250, CY = 128;
    const sunG = glow(svg, C.yellow);
    const halo = S('circle', { cx: 64, cy: 52, r: 60, fill: sunG }, svg);
    const sun = S('circle', { cx: 64, cy: 52, r: 22, fill: C.yellow }, svg);
    txt(svg, 64, 112, 'luz', { size: 12, fill: C.yellow });
    // corpo do LDR
    S('path', { d: `M${CX - 30} ${CY + 60} V218 M${CX + 30} ${CY + 60} V218`, stroke: C.wire, 'stroke-width': 4 }, svg);
    S('circle', { cx: CX, cy: CY, r: 70, fill: C.surf3, stroke: C.border, 'stroke-width': 3 }, svg);
    S('path', { d: `M${CX - 58} ${CY - 34} A70 70 0 0 1 ${CX + 58} ${CY - 34} Z`, fill: C.wire, opacity: 0.55 }, svg);
    S('path', { d: `M${CX - 58} ${CY + 34} A70 70 0 0 0 ${CX + 58} ${CY + 34} Z`, fill: C.wire, opacity: 0.55 }, svg);
    const snake = [];
    for (let i = 0; i < 6; i++) {
      const y = CY - 30 + i * 12;
      if (i % 2 === 0) snake.push([CX - 52, y], [CX + 52, y]); else snake.push([CX + 52, y], [CX - 52, y]);
    }
    S('path', { d: 'M' + snake.map(p => p.join(' ')).join(' L'), fill: 'none', stroke: C.orange, 'stroke-width': 7, 'stroke-linejoin': 'round', opacity: 0.85 }, svg);
    txt(svg, CX, 30, 'trilha de sulfeto de cádmio (CdS)', { size: 11, fill: C.orange });
    txt(svg, CX - 30, 236, 'terminais', { size: 10, fill: C.muted });
    // fótons e elétrons
    const phot = Array.from({ length: 18 }, () => ({ el: S('circle', { r: 3.5, fill: C.yellow, opacity: 0 }, svg), k: Math.random(), tx: 0, ty: 0 }));
    const elec = Array.from({ length: 26 }, (_, i) => ({ el: S('circle', { r: 4, fill: C.blue, opacity: 0 }, svg), u: i / 26 }));
    // painel de leitura
    const rT = txt(svg, 430, 70, '', { size: 18, weight: 700, fill: C.orange });
    txt(svg, 430, 50, 'resistência', { size: 11 });
    txt(svg, 430, 104, 'analogRead()', { size: 11 });
    const nT = txt(svg, 430, 124, '', { size: 18, weight: 700, fill: C.mint });
    // poste
    S('path', { d: 'M430 228 V168 H462', stroke: C.wire, 'stroke-width': 4, fill: 'none' }, svg);
    const lampG = glow(svg, C.yellow);
    const lampHalo = S('circle', { cx: 462, cy: 176, r: 34, fill: lampG, opacity: 0 }, svg);
    const lamp = S('path', { d: 'M450 168 H474 L468 178 H456 Z', fill: C.surf3, stroke: C.wire, 'stroke-width': 1.5 }, svg);
    const lampT = txt(svg, 430, 152, '', { size: 11 });
    let noite = false;
    function respawn(p) { p.k = 0; p.tx = CX + rnd(-50, 50); p.ty = CY + rnd(-30, 30); }
    phot.forEach(p => { respawn(p); p.k = Math.random(); });
    return {
      tick(dt) {
        const l = +lIn.value, lux = Math.pow(10, l), k = (l + 1) / 5;
        const r = clamp(10000 * Math.pow(lux / 10, -0.7), 100, 1e6), n = Math.round(4095 * 10000 / (r + 10000));
        out(root, 'l', lux < 10 ? fmt(lux, 1) + ' lux' : Math.round(lux).toLocaleString('pt-BR') + ' lux');
        out(root, 'amb', lux < 3 ? 'noite' : lux < 50 ? 'anoitecer / interior escuro' : lux < 1000 ? 'sala iluminada' : 'dia');
        sun.setAttribute('opacity', 0.25 + 0.75 * k); halo.setAttribute('opacity', k);
        rT.textContent = fmtR(r); nT.textContent = n;
        if (!noite && n < 1500) noite = true;
        if (noite && n > 1800) noite = false;
        lampHalo.setAttribute('opacity', noite ? 1 : 0); lamp.setAttribute('fill', noite ? C.yellow : C.surf3);
        lampT.textContent = noite ? 'lâmpada ACESA' : 'lâmpada apagada';
        const nPh = Math.round(18 * k), nEl = Math.round(2 + 24 * k * k);
        phot.forEach((p, i) => {
          if (i >= nPh) { p.el.setAttribute('opacity', 0); return; }
          p.k += dt * 0.9; if (p.k >= 1) respawn(p);
          p.el.setAttribute('cx', 64 + (p.tx - 64) * p.k); p.el.setAttribute('cy', 52 + (p.ty - 52) * p.k); p.el.setAttribute('opacity', 0.9);
        });
        elec.forEach((e, i) => {
          if (i >= nEl) { e.el.setAttribute('opacity', 0); return; }
          e.u += dt * 0.08; const [x, y] = along(snake, e.u);
          e.el.setAttribute('cx', x); e.el.setAttribute('cy', y); e.el.setAttribute('opacity', 1);
        });
      }
    };
  };

  /* ======================================================
     Termistor: NTC (mais portadores) × PTC (mais colisões)
     ====================================================== */
  SIMS.ntc = root => {
    const svg = stageOf(root), tIn = inp(root, 't');
    let tipo = 'ntc';
    seg(root, 'tipo', v => { tipo = v; });
    const X0 = 40, X1 = 330, Y0 = 46, Y1 = 186;
    S('path', { d: `M10 116 H${X0} M${X1} 116 H350`, stroke: C.wire, 'stroke-width': 4 }, svg);
    const box = S('rect', { x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0, rx: 14, fill: C.plot, stroke: C.border, 'stroke-width': 2 }, svg);
    const titleT = txt(svg, (X0 + X1) / 2, 32, '', { size: 11.5, fill: C.muted });
    const atoms = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 8; c++) {
      const x = X0 + 22 + c * 35, y = Y0 + 20 + r * 33;
      atoms.push({ x, y, ph: Math.random() * 6, el: S('circle', { cx: x, cy: y, r: 9, fill: C.surf3, stroke: C.wire, 'stroke-width': 1.5 }, svg) });
    }
    const elec = Array.from({ length: 34 }, () => ({ x: rnd(X0, X1), y: rnd(Y0 + 8, Y1 - 8), vy: 0, el: S('circle', { r: 4, fill: C.blue, opacity: 0 }, svg) }));
    txt(svg, (X0 + X1) / 2, 210, 'elétrons livres levando corrente →', { size: 11, fill: C.blue });
    // termômetro e leitura
    S('rect', { x: 362, y: 40, width: 18, height: 140, rx: 9, fill: C.surf3, stroke: C.border }, svg);
    S('circle', { cx: 371, cy: 190, r: 16, fill: C.red }, svg);
    const merc = S('rect', { x: 366, y: 100, width: 8, height: 90, fill: C.red }, svg);
    const tT = txt(svg, 456, 70, '', { size: 18, weight: 700, fill: C.red });
    txt(svg, 456, 110, 'resistência', { size: 11 });
    const rT = txt(svg, 456, 132, '', { size: 18, weight: 700, fill: C.orange });
    const arrT = txt(svg, 456, 160, '', { size: 11.5, weight: 600 });
    let tm = 0;
    return {
      tick(dt) {
        tm += dt;
        const T = +tIn.value, k = (T + 20) / 120;
        out(root, 't', T + ' °C');
        tT.textContent = T + ' °C';
        merc.setAttribute('y', 176 - 130 * k); merc.setAttribute('height', 14 + 130 * k);
        const R = tipo === 'ntc' ? 10000 * Math.exp(3950 * (1 / (T + 273.15) - 1 / 298.15)) : 1000 * (1 + 0.00385 * T);
        rT.textContent = fmtR(R);
        titleT.textContent = tipo === 'ntc' ? 'semicondutor (óxidos metálicos)' : 'metal (platina)';
        arrT.textContent = tipo === 'ntc' ? 'esquentou → R cai' : 'esquentou → R sobe';
        arrT.setAttribute('fill', tipo === 'ntc' ? C.mint : C.orange);
        const amp = 0.6 + 4.5 * k;
        atoms.forEach(a => {
          a.el.setAttribute('cx', a.x + amp * Math.sin(tm * 17 + a.ph)); a.el.setAttribute('cy', a.y + amp * Math.cos(tm * 13 + a.ph * 1.7));
          a.el.setAttribute('fill', tipo === 'ntc' ? C.surf3 : C.wire);
        });
        const n = tipo === 'ntc' ? Math.round(3 + 29 * Math.pow(k, 1.6)) : 28;
        const v = tipo === 'ntc' ? 70 : 85 - 60 * k, scat = tipo === 'ntc' ? 20 : 30 + 160 * k;
        elec.forEach((e, i) => {
          if (i >= n) { e.el.setAttribute('opacity', 0); return; }
          e.vy += (Math.random() - 0.5) * scat * dt * 6; e.vy *= 0.9;
          e.x += v * dt * (tipo === 'ntc' ? 1 : (0.6 + 0.4 * Math.random())); e.y += e.vy * dt;
          if (e.y < Y0 + 8 || e.y > Y1 - 8) { e.vy = -e.vy; e.y = clamp(e.y, Y0 + 8, Y1 - 8); }
          if (e.x > X1 - 6) { e.x = X0 + 6; e.y = rnd(Y0 + 8, Y1 - 8); }
          e.el.setAttribute('cx', e.x); e.el.setAttribute('cy', e.y); e.el.setAttribute('opacity', 1);
        });
        out(root, 'desc', tipo === 'ntc'
          ? 'No <b>NTC</b>, o calor “solta” mais elétrons dos átomos do semicondutor. Mais portadores de carga → a corrente passa com mais facilidade → <b>a resistência cai</b>.'
          : 'No <b>PTC de metal</b>, os elétrons livres já são muitos. O calor faz os átomos vibrarem mais e os elétrons <b>trombam</b> mais neles → <b>a resistência sobe</b>, quase em linha reta.');
      }
    };
  };

  /* ======================================================
     Sensor de gás MQ: oxigênio prende elétrons, o gás devolve
     ====================================================== */
  SIMS.mq = root => {
    const svg = stageOf(root), bGas = act(root, 'gas'), bHeat = act(root, 'heat');
    let gas = false, heat = true, mols = [], puffs = [], tSpawn = 0;
    bGas.addEventListener('click', () => { gas = !gas; toggleBtn(bGas, gas, ['Fechar o gás', 'Liberar gás']); });
    bHeat.addEventListener('click', () => { heat = !heat; toggleBtn(bHeat, !heat, ['Ligar aquecedor', 'Desligar aquecedor']); });
    const XL = 50, XR = 390, YS = 150;
    const hg = glow(svg, C.orange);
    const heatHalo = S('ellipse', { cx: (XL + XR) / 2, cy: YS + 16, rx: 200, ry: 46, fill: hg, opacity: 0.6 }, svg);
    S('rect', { x: XL, y: YS, width: XR - XL, height: 30, rx: 6, fill: C.surf3, stroke: C.orange, 'stroke-width': 2 }, svg);
    txt(svg, XL + 6, YS + 48, 'camada de óxido de estanho (SnO₂)', { size: 10.5, fill: C.orange, anchor: 'start' });
    let coil = `M${XL + 10} ${YS + 66}`;
    for (let x = XL + 10; x < XR - 10; x += 20) coil += ` l10 -8 l10 8`;
    const heater = S('path', { d: coil, fill: 'none', stroke: C.red, 'stroke-width': 3 }, svg);
    const heatT = txt(svg, XR - 4, YS + 88, '', { size: 10.5, anchor: 'end' });
    txt(svg, 64, 24, 'ar', { size: 11 });
    const sites = Array.from({ length: 9 }, (_, i) => {
      const x = XL + 22 + i * 37;
      const g = S('g', {}, svg);
      S('circle', { cx: x, cy: YS - 8, r: 7, fill: C.red }, g);
      txt(g, x, YS - 4.5, 'O', { size: 9.5, fill: C.bg, weight: 700 });
      return { x, o: true, g };
    });
    const elec = Array.from({ length: 32 }, () => ({ x: rnd(XL + 6, XR - 6), y: rnd(YS + 7, YS + 23), v: rnd(30, 60), el: S('circle', { r: 3.4, fill: C.blue, opacity: 0 }, svg) }));
    const rT = txt(svg, 460, 74, '', { size: 18, weight: 700, fill: C.orange });
    txt(svg, 460, 52, 'resistência', { size: 11 });
    txt(svg, 460, 54 + 52, 'elétrons livres', { size: 11 });
    const eT = txt(svg, 460, 128, '', { size: 18, weight: 700, fill: C.blue });
    function newMol() {
      const g = S('g', {}, svg);
      S('circle', { cx: 0, cy: 0, r: 6, fill: C.mint }, g);
      S('circle', { cx: 7, cy: -3, r: 3.5, fill: C.mint }, g);
      S('circle', { cx: -6, cy: 4, r: 3.5, fill: C.mint }, g);
      return { x: rnd(XL + 10, XR - 10), y: 10, vx: rnd(-15, 15), vy: rnd(35, 60), g };
    }
    return {
      tick(dt) {
        heater.setAttribute('stroke', heat ? C.red : C.wire);
        heatHalo.setAttribute('opacity', heat ? 0.6 : 0);
        heatT.textContent = heat ? 'aquecedor ligado · ~300 °C' : 'aquecedor desligado';
        heatT.setAttribute('fill', heat ? C.red : C.muted);
        tSpawn += dt;
        if (gas && tSpawn > 0.18) { tSpawn = 0; mols.push(newMol()); }
        mols.forEach(m => {
          m.x += m.vx * dt; m.y += m.vy * dt;
          if (m.x < XL + 8 || m.x > XR - 8) m.vx = -m.vx;
          if (m.y >= YS - 16 && m.vy > 0) {
            const s = sites.find(s => s.o && Math.abs(s.x - m.x) < 20);
            if (s && heat) {
              s.o = false; s.g.setAttribute('opacity', 0); m.dead = true;
              const p = S('circle', { cx: m.x, cy: YS - 14, r: 6, fill: C.muted, opacity: 0.8 }, svg);
              puffs.push({ el: p, y: YS - 14, a: 0.8 });
            } else { m.vy = -m.vy * 0.8; }
          }
          if (m.y < 0) m.dead = true;
          m.g.setAttribute('transform', `translate(${m.x} ${m.y})`);
        });
        mols = mols.filter(m => { if (m.dead) m.g.remove(); return !m.dead; });
        puffs.forEach(p => { p.y -= 30 * dt; p.a -= 0.6 * dt; p.el.setAttribute('cy', p.y); p.el.setAttribute('opacity', Math.max(0, p.a)); });
        puffs = puffs.filter(p => { if (p.a <= 0) p.el.remove(); return p.a > 0; });
        // o oxigênio do ar volta a se prender na superfície aquecida
        sites.forEach(s => { if (!s.o && heat && Math.random() < dt * (gas ? 0.12 : 0.5)) { s.o = true; s.g.setAttribute('opacity', 1); } });
        const freed = sites.filter(s => !s.o).length, n = heat ? 4 + freed * 3 : 2;
        elec.forEach((e, i) => {
          if (i >= n) { e.el.setAttribute('opacity', 0); return; }
          e.x += e.v * dt; if (e.x > XR - 6) e.x = XL + 6;
          e.el.setAttribute('cx', e.x); e.el.setAttribute('cy', e.y); e.el.setAttribute('opacity', 1);
        });
        const R = heat ? 60000 / (1 + 1.3 * freed) : 2e6;
        rT.textContent = fmtR(R); eT.textContent = n;
      }
    };
  };

  /* ======================================================
     Reed switch: o ímã fecha o contato
     ====================================================== */
  SIMS.reed = root => {
    const svg = stageOf(root), dIn = inp(root, 'd');
    S('rect', { x: 110, y: 62, width: 300, height: 52, rx: 26, fill: C.blue, 'fill-opacity': 0.08, stroke: C.blue, 'stroke-opacity': 0.6, 'stroke-width': 2 }, svg);
    txt(svg, 260, 52, 'ampola de vidro', { size: 10.5, fill: C.blue });
    S('path', { d: 'M40 84 H120 M400 92 H480', stroke: C.wire, 'stroke-width': 4 }, svg);
    const left = S('path', { d: '', stroke: C.text2, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, svg);
    const right = S('path', { d: '', stroke: C.text2, 'stroke-width': 5, 'stroke-linecap': 'round', fill: 'none' }, svg);
    const spark = S('circle', { cx: 260, cy: 88, r: 5, fill: C.mint, opacity: 0 }, svg);
    const mag = S('g', {}, svg);
    S('rect', { x: -60, y: 0, width: 60, height: 26, fill: C.red, rx: 4 }, mag);
    S('rect', { x: 0, y: 0, width: 60, height: 26, fill: C.blue, rx: 4 }, mag);
    txt(mag, -30, 18, 'N', { size: 13, weight: 700, fill: '#ffffff' });
    txt(mag, 30, 18, 'S', { size: 13, weight: 700, fill: '#ffffff' });
    const st = txt(svg, 260, 222, '', { size: 12.5, weight: 600 });
    let b = 0;
    return {
      tick(dt) {
        const d = +dIn.value, closed = d <= 15;
        out(root, 'd', d + ' mm');
        b += ((closed ? 1 : 0) - b) * Math.min(1, dt * 14);
        left.setAttribute('d', `M120 84 L${255 + 2 * b} ${84 + 4 * b}`);
        right.setAttribute('d', `M400 92 L${265 - 2 * b} ${92 - 4 * b}`);
        spark.setAttribute('opacity', closed ? 1 : 0);
        mag.setAttribute('transform', `translate(260 ${122 + d * 1.4})`);
        st.textContent = closed ? 'contato FECHADO · digitalRead = LOW (com INPUT_PULLUP)' : 'contato aberto · digitalRead = HIGH (com INPUT_PULLUP)';
        st.setAttribute('fill', closed ? C.mint : C.muted);
        pill(out(root, 'st'), closed ? 'on' : 'warn', closed ? 'porta FECHADA' : 'porta ABERTA');
      }
    };
  };

  /* ======================================================
     PIR: detecta MUDANÇA de calor entre zonas
     ====================================================== */
  SIMS.pir = root => {
    const svg = stageOf(root), pl = canvas2d($(root, '[data-c="plot"]'));
    const SX = 470, SY = 105, LX = 170;
    const ZONES = [-0.28, -0.17, -0.06, 0.06, 0.17, 0.28].map((a, i) => ({ a, s: i % 2 ? -1 : 1, y: SY + (SX - LX) * Math.tan(a) }));
    ZONES.forEach(z => {
      const w = 0.035, l = 470;
      const p = (ang) => [SX - l * Math.cos(ang), SY + l * Math.sin(ang)];
      const [x1, y1] = p(z.a - w), [x2, y2] = p(z.a + w);
      S('path', { d: `M${SX} ${SY} L${x1} ${y1} L${x2} ${y2} Z`, fill: z.s > 0 ? C.blue : C.orange, opacity: 0.16 }, svg);
    });
    S('path', { d: `M${LX} 0 V210`, stroke: C.wire, 'stroke-dasharray': '3 6', 'stroke-width': 1.5 }, svg);
    txt(svg, LX + 6, 14, 'caminho da pessoa', { size: 10, fill: C.muted, anchor: 'start' });
    S('rect', { x: SX, y: SY - 20, width: 40, height: 40, rx: 4, fill: C.surf3, stroke: C.border }, svg);
    S('path', { d: `M${SX} ${SY - 16} A18 18 0 0 0 ${SX} ${SY + 16} Z`, fill: C.text2, opacity: 0.85 }, svg);
    txt(svg, SX + 20, SY + 36, 'PIR', { size: 11, weight: 700, fill: C.text });
    const hg = glow(svg, C.red);
    const person = S('g', {}, svg);
    S('circle', { cx: 0, cy: 0, r: 30, fill: hg }, person);
    S('ellipse', { cx: 0, cy: 0, rx: 9, ry: 16, fill: C.red, opacity: 0.85 }, person);
    S('circle', { cx: 0, cy: 0, r: 7, fill: C.yellow }, person);
    let py = -30, target = -30, speed = 60, raw = 0, lp = 0, hold = 0, t = 0, acc = 0, data = [];
    act(root, 'cross', () => { py = -30; target = 240; });
    act(root, 'stop', () => { py = -30; target = SY + 4; });
    const DT = 0.03, WIN = 10;
    function sample() {
      t += DT;
      if (Math.abs(target - py) > 0.5) py += Math.sign(target - py) * Math.min(Math.abs(target - py), speed * DT);
      raw = ZONES.reduce((s, z) => s + z.s * Math.exp(-Math.pow((py - z.y) / 11, 2)), 0);
      lp += (raw - lp) * DT / 0.7;
      const sig = raw - lp;
      if (Math.abs(sig) > 0.3) hold = 3;
      hold = Math.max(0, hold - DT);
      data.push({ t, sig, o: hold > 0 });
      while (data.length && data[0].t < t - WIN) data.shift();
    }
    function draw() {
      person.setAttribute('transform', `translate(${LX} ${py})`);
      person.setAttribute('opacity', py > -12 && py < 222 ? 1 : 0);
      const { ctx, w, h } = pl, L = 70, R = 10, T = 8, ph = h - T - 8, hS = ph * 0.6, hO = ph * 0.3;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * (w - L - R), YS = v => T + hS / 2 - clamp(v, -1.1, 1.1) / 1.1 * hS / 2, YO = o => T + hS + 10 + (o ? 0 : hO);
      ctx.clearRect(0, 0, w, h);
      ctx.font = FONT11; ctx.textAlign = 'left'; ctx.fillStyle = C.mint; ctx.fillText('sinal', 8, T + 14); ctx.fillStyle = C.orange; ctx.fillText('saída OUT', 8, T + hS + 22);
      ctx.strokeStyle = '#2a2238'; ctx.beginPath(); ctx.moveTo(L, YS(0)); ctx.lineTo(w - R, YS(0)); ctx.stroke();
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = YS(d.sig); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
      ctx.strokeStyle = C.orange; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t); if (!i) ctx.moveTo(x, YO(d.o)); else { ctx.lineTo(x, YO(data[i - 1].o)); ctx.lineTo(x, YO(d.o)); } }); ctx.stroke();
      const on = hold > 0;
      pill(out(root, 'out'), on ? 'off' : '', on ? 'OUT = HIGH · movimento!' : 'OUT = LOW');
      const parado = Math.abs(target - py) < 0.5 && py > 0 && py < 210;
      out(root, 'msg', parado ? '<span class="c-orange">A pessoa parou dentro da área: o calor não muda mais, o sinal volta a zero e o PIR “esquece” que ela está ali.</span>' : 'Cada faixa azul ou laranja é uma “janela” da lente. Ao passar de uma para a outra, o calor que chega a cada metade do sensor muda, e é <b>essa mudança</b> que gera o sinal.');
    }
    for (let i = 0; i < WIN / DT; i++) sample();
    return { tick(dt) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } draw(); }, redraw: draw };
  };

  /* ======================================================
     Ultrassônico: o eco mede a distância
     ====================================================== */
  SIMS.ultra = root => {
    const svg = stageOf(root), dIn = inp(root, 'd');
    S('rect', { x: 10, y: 50, width: 104, height: 70, rx: 6, fill: C.blue, 'fill-opacity': 0.35, stroke: C.blue, 'stroke-width': 2 }, svg);
    [[38, 'T'], [86, 'R']].forEach(([x, n]) => {
      S('circle', { cx: x, cy: 85, r: 21, fill: C.surf3, stroke: C.text2, 'stroke-width': 3 }, svg);
      S('circle', { cx: x, cy: 85, r: 13, fill: C.plot }, svg);
      txt(svg, x, 136, n === 'T' ? 'emissor' : 'receptor', { size: 10, fill: C.muted });
    });
    const wall = S('rect', { x: 0, y: 30, width: 18, height: 110, rx: 3, fill: C.wire }, svg);
    const dimL = S('path', { d: '', stroke: C.muted, 'stroke-width': 1, 'stroke-dasharray': '3 4' }, svg);
    const dimT = txt(svg, 0, 22, '', { size: 11, fill: C.muted });
    const arcs = [0, 1, 2].map(() => S('path', { d: '', fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, svg));
    // linha do tempo TRIG / ECHO
    txt(svg, 10, 180, 'TRIG', { size: 10.5, fill: C.orange, anchor: 'start' });
    txt(svg, 10, 206, 'ECHO', { size: 10.5, fill: C.mint, anchor: 'start' });
    const trig = S('path', { d: 'M56 184 H70 V172 H76 V184 H500', fill: 'none', stroke: C.orange, 'stroke-width': 2 }, svg);
    const echo = S('path', { d: '', fill: 'none', stroke: C.mint, 'stroke-width': 2 }, svg);
    let phase = 0, xf = 0, wait = 0.6, shown = null;
    const VIS = 320; // px/s, só para a animação
    function geom() {
      const d = +dIn.value; return { d, xw: 130 + d / 200 * 360 };
    }
    return {
      tick(dt) {
        const { d, xw } = geom();
        out(root, 'd', d + ' cm');
        wall.setAttribute('x', xw);
        dimL.setAttribute('d', `M114 26 H${xw}`); dimT.setAttribute('x', (114 + xw) / 2); dimT.textContent = d + ' cm';
        if (phase === 0) { wait -= dt; if (wait <= 0) { phase = 1; xf = 60; } }
        else if (phase === 1) { xf += VIS * dt; if (xf >= xw) { xf = xw; phase = 2; } }
        else if (phase === 2) { xf -= VIS * dt; if (xf <= 86) { phase = 0; wait = 0.9; shown = d; } }
        arcs.forEach((a, i) => {
          if (phase === 0) { a.setAttribute('d', ''); return; }
          const r = 16 + i * 9;
          if (phase === 1) { const x = xf - i * 12; a.setAttribute('d', x > 64 ? `M${x - 6} ${85 - r} Q${x + 8} 85 ${x - 6} ${85 + r}` : ''); }
          else { const x = xf + i * 12; a.setAttribute('d', x < xw ? `M${x + 6} ${85 - r} Q${x - 8} 85 ${x + 6} ${85 + r}` : ''); }
          a.setAttribute('opacity', 1 - i * 0.28);
        });
        if (shown !== null) {
          const us = 2 * shown / 0.0343;
          const wpx = 8 + us / 11662 * 400;
          echo.setAttribute('d', `M56 210 H82 V198 H${82 + wpx} V210 H500`);
          out(root, 'us', Math.round(us).toLocaleString('pt-BR') + ' µs');
          out(root, 'cm', fmt(us * 0.0343 / 2, 1) + ' cm');
        }
      }
    };
  };
})();
