/* ==========================================================
   Simulações — falhas de sensores e periféricos, robustez (telas 16–24).
   Usa os utilitários publicados em window.KIT por kit.js.
   ========================================================== */
(function () {
  const { C, S, $, $$, out, inp, act, clamp, fmt, stageOf, txt, canvas2d, seg, pill, toggleBtn, renderCode } = window.KIT;
  const FONT11 = '11px IBM Plex Mono, monospace';
  const stamp = t => `[${t.toFixed(1).padStart(6)} s]`;
  function logger(el, max = 60) {
    return (cls, s) => {
      el.insertAdjacentHTML('beforeend', `<div class="${cls}">${s}</div>`);
      while (el.children.length > max) el.firstChild.remove();
      el.scrollTop = el.scrollHeight;
    };
  }
  function grid(ctx, L, R, w, ys, Y, lab) {
    ctx.font = FONT11; ctx.lineWidth = 1; ctx.strokeStyle = '#2a2238'; ctx.fillStyle = '#6d6585'; ctx.textAlign = 'right';
    ys.forEach(v => { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.fillText(lab(v), L - 4, Y(v) + 4); });
  }

  /* ======================================================
     16. Leitura suspeita × falha confirmada
     ====================================================== */
  SIMS.validate = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), stEl = out(root, 'st');
    const DT = 0.25, WIN = 20;
    let val = true, t = 0, acc = 0, data = [], fault = null, consec = 0, good = 0, estado = 'NORMAL';
    let lastGood = 24, lastGoodT = 0, same = 0, prevRaw = null, nSus = 0, nFail = 0;
    const q = v => Math.round(v / 0.0625) * 0.0625;
    $$(root, '[data-f]').forEach(b => b.addEventListener('click', () => {
      const ty = b.dataset.f;
      fault = { ty, until: t + { spike: DT * 1.01, range: 3, stuck: 5, jump: 3 }[ty], v: prevRaw ?? 24 };
    }));
    seg(root, 'val', v => { val = v === 'on'; consec = 0; good = 0; estado = 'NORMAL'; });
    function sample() {
      t += DT;
      let raw = q(24 + 1.5 * Math.sin(t / 6) + (Math.random() - 0.5) * 0.25);
      if (fault && t <= fault.until) {
        if (fault.ty === 'spike') raw += 15;
        if (fault.ty === 'range') raw = -127;
        if (fault.ty === 'stuck') raw = fault.v;
        if (fault.ty === 'jump') raw += 12;
      } else fault = null;
      same = raw === prevRaw ? same + 1 : 0; prevRaw = raw;
      let cls = 'ok', used = raw;
      if (val) {
        const plaus = raw > -40 && raw < 85;
        const taxa = Math.abs(raw - lastGood) / Math.max(DT, t - lastGoodT) < 2;
        const travado = same >= 8;
        if (!plaus || !taxa || travado) {
          consec++; good = 0; nSus++;
          if (consec >= 3 && estado !== 'FALHA') { estado = 'FALHA'; nFail++; }
          else if (estado !== 'FALHA') estado = 'SUSPEITA';
          cls = estado === 'FALHA' ? 'fail' : 'sus';
        } else {
          consec = 0; good++; lastGood = raw; lastGoodT = t;
          if (estado === 'SUSPEITA' || (estado === 'FALHA' && good >= 4)) estado = 'NORMAL';
        }
        used = lastGood;
      }
      data.push({ t, raw, cls, used, st: estado });
      while (data.length && data[0].t < t - WIN) data.shift();
      pill(stEl, { NORMAL: 'on', SUSPEITA: 'warn', FALHA: 'off' }[estado], val ? estado : 'sem validação');
      out(root, 'sus', nSus); out(root, 'fail', nFail);
      out(root, 'use', fmt(used, 2) + ' °C');
    }
    function draw() {
      const { ctx, w, h } = pl, L = 40, R = 10, T = 10, B = 20, pw = w - L - R, ph = h - T - B;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * pw, Y = v => T + ph - (clamp(v, -12, 50) + 10) / 60 * ph;
      ctx.clearRect(0, 0, w, h);
      grid(ctx, L, R, w, [-10, 0, 10, 20, 30, 40, 50], Y, v => v + '°');
      // faixas de falha
      data.forEach((d, i) => { if (d.st === 'FALHA') { ctx.fillStyle = 'rgba(255,93,93,.12)'; ctx.fillRect(X(d.t) - pw / (WIN / DT) / 2, T, pw / (WIN / DT) + 1, ph); } });
      ctx.strokeStyle = C.blue; ctx.lineWidth = 2; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = Y(d.used); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      data.forEach((d, i) => {
        ctx.fillStyle = d.cls === 'ok' ? C.mint : d.cls === 'sus' ? C.orange : C.red;
        ctx.beginPath(); ctx.arc(X(d.t), Y(d.raw), d.cls === 'ok' ? 2.5 : 4, 0, 7); ctx.fill();
        if (d.raw < -12 && !(i && data[i - 1].raw < -12)) { ctx.textAlign = 'left'; ctx.fillText('−127 ↓', X(d.t), Y(d.raw) - 8); }
      });
    }
    for (let i = 0; i < WIN / DT; i++) sample();
    return {
      tick(dt) { acc += dt; while (acc >= DT) { acc -= DT; sample(); } draw(); },
      redraw: draw
    };
  };

  /* ======================================================
     17. Ausência de sinal: entrada flutuando
     ====================================================== */
  SIMS.floating = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), pIn = inp(root, 'p');
    const wBtn = act(root, 'wire'), pdBtn = act(root, 'pd');
    const LO = 410, HI = 3685, WIN = 10;
    let off = false, pd = false, t = 0, acc = 0, f = 1900, data = [];
    wBtn.addEventListener('click', () => { off = !off; toggleBtn(wBtn, off, ['Reconectar o fio', 'Soltar o fio']); });
    pdBtn.addEventListener('click', () => { pd = !pd; toggleBtn(pdBtn, pd); });
    function sample() {
      t += 0.05;
      const p = +pIn.value;
      let adc;
      if (!off) adc = (0.33 + p / 100 * 2.64) / 3.3 * 4095 + (Math.random() - 0.5) * 16;
      else if (pd) adc = Math.abs((Math.random() - 0.5) * 10);
      else { f += (Math.random() - 0.5) * 140 + (1900 - f) * 0.02; adc = f + 260 * Math.sin(t * 4.4) + (Math.random() - 0.5) * 120; }
      adc = Math.round(clamp(adc, 0, 4095));
      data.push({ t, adc });
      while (data.length && data[0].t < t - WIN) data.shift();
      out(root, 'p', p + ' %');
      out(root, 'raw', adc);
      const pc = Math.round((adc / 4095 * 3.3 - 0.33) / 2.64 * 100);
      let d;
      if (adc < 300) d = '<span class="c-red">abaixo de 10 %: sensor ausente ou fio solto</span>';
      else if (adc > 3790) d = '<span class="c-red">acima de 90 %: curto com 3,3 V</span>';
      else d = `<span class="c-mint">na faixa · pressão ${pc} %</span>` + (off ? '<br><span class="c-orange">o programa aceita, mas é ruído!</span>' : '');
      out(root, 'diag', d);
    }
    function draw() {
      const { ctx, w, h } = pl, L = 44, R = 10, T = 10, B = 12, pw = w - L - R, ph = h - T - B;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * pw, Y = v => T + ph - v / 4095 * ph;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = 'rgba(128,230,198,.08)'; ctx.fillRect(L, Y(HI), pw, Y(LO) - Y(HI));
      grid(ctx, L, R, w, [0, 1024, 2048, 3072, 4095], Y, v => v);
      ctx.fillStyle = C.mint; ctx.textAlign = 'left'; ctx.fillText('faixa útil do sensor (10–90 %)', L + 6, Y(HI) + 14);
      ctx.strokeStyle = off && !pd ? C.orange : off ? C.red : C.blue; ctx.lineWidth = 2; ctx.beginPath();
      data.forEach((d, i) => { const x = X(d.t), y = Y(d.adc); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
    }
    for (let i = 0; i < WIN / 0.05; i++) sample();
    return {
      tick(dt) { acc += dt; while (acc >= 0.05) { acc -= 0.05; sample(); } draw(); },
      redraw: draw
    };
  };

  /* ======================================================
     18. LCD/I2C e microSD/SPI
     ====================================================== */
  SIMS.periph = root => {
    const svg = stageOf(root), log = logger(out(root, 'log'));
    const bL = act(root, 'lcd'), bN = act(root, 'noise'), bS = act(root, 'sd');
    let lcdOff = false, noise = false, sdOff = false, t = 0, acc = 0, lf = 0, sf = 0, lines = 0, pend = 0, blink = 0;
    // desenho
    S('rect', { x: 20, y: 48, width: 150, height: 96, rx: 10, fill: '#211a30', stroke: C.border, 'stroke-width': 2 }, svg);
    txt(svg, 95, 92, 'ESP32', { size: 18, weight: 700, fill: C.mint });
    txt(svg, 95, 112, 'GPIO 21/22 · 18/19/23/5', { size: 9.5, fill: C.muted });
    const i2c = [], spi = [];
    ['SDA', 'SCL'].forEach((n, i) => {
      i2c.push(S('path', { d: `M170 ${66 + i * 12} H${270 + i * 10} V${34 + i * 14} H380`, fill: 'none', stroke: C.blue, 'stroke-width': 2.5 }, svg));
      txt(svg, 300, 30 + i * 14, n, { size: 9.5, fill: C.blue, anchor: 'start' });
    });
    ['MOSI', 'MISO', 'SCK', 'CS'].forEach((n, i) => {
      spi.push(S('path', { d: `M170 ${104 + i * 10} H${250 - i * 10} V${128 + i * 12} H380`, fill: 'none', stroke: C.orange, 'stroke-width': 2.5 }, svg));
      txt(svg, 300, 125 + i * 12, n, { size: 9.5, fill: C.orange, anchor: 'start' });
    });
    const lcdR = S('rect', { x: 380, y: 14, width: 160, height: 54, rx: 8, fill: '#1c2341', stroke: C.blue, 'stroke-width': 2 }, svg);
    const lcdT = txt(svg, 460, 38, 'T=24.1 C  OK', { size: 13, weight: 600, fill: C.text });
    txt(svg, 460, 58, 'LCD 16×2 · I²C 0x27', { size: 10, fill: C.muted });
    S('rect', { x: 380, y: 118, width: 160, height: 60, rx: 8, fill: C.plot, stroke: C.orange, 'stroke-width': 2 }, svg);
    const card = S('path', { d: 'M420 128 h40 l10 10 v32 h-50 z', fill: C.surf3, stroke: C.text2, 'stroke-width': 1.5 }, svg);
    const sdT = txt(svg, 505, 152, 'microSD', { size: 11, fill: C.text2 });
    function paint() {
      i2c.forEach((p, i) => { p.setAttribute('stroke', lcdOff ? C.red : noise && i === 0 && blink % 2 ? C.orange : C.blue); p.setAttribute('stroke-dasharray', lcdOff ? '4 6' : noise && i === 0 ? '10 3 2 3' : 'none'); });
      lcdR.setAttribute('stroke', lcdOff ? C.red : C.blue);
      lcdT.textContent = lcdOff ? '' : lf ? 'T=2#.░ C  ??' : `T=${(24 + Math.sin(t / 5)).toFixed(1)} C  OK`;
      card.setAttribute('opacity', sdOff ? 0 : 1);
      sdT.textContent = sdOff ? 'sem cartão' : 'microSD';
      sdT.setAttribute('fill', sdOff ? C.red : C.text2);
    }
    bL.addEventListener('click', () => { lcdOff = !lcdOff; toggleBtn(bL, lcdOff, ['Reconectar LCD', 'Desconectar LCD']); paint(); });
    bN.addEventListener('click', () => { noise = !noise; toggleBtn(bN, noise); paint(); });
    bS.addEventListener('click', () => { sdOff = !sdOff; toggleBtn(bS, sdOff, ['Inserir cartão', 'Remover cartão']); paint(); });
    log('dim', '[setup] Wire.begin() · LCD 0x27 respondeu');
    log('dim', '[setup] SD.begin(5) ok · FAT32 · 7,4 GB');
    log('ok', '[setup] tudo certo: mas o setup() roda uma vez só');
    function cycle() {
      t += 1;
      // LCD
      const err = lcdOff ? 2 : noise && Math.random() < 0.45 ? (Math.random() < 0.6 ? 2 : 5) : 0;
      if (err) {
        lf++;
        log(lf >= 3 ? 'err' : 'warn', `${stamp(t)} E LCD: endTransmission = ${err} (${err === 2 ? 'NACK no endereço' : 'timeout'}) · ${Math.min(lf, 3)}/3`);
        if (lf === 3) log('err', `${stamp(t)} E LCD: falha confirmada → status só pela serial e LED`);
      } else {
        if (lf >= 3) log('ok', `${stamp(t)} I LCD: respondeu de novo → lcd.init()`);
        lf = 0;
      }
      pill(out(root, 'pl'), !lf ? 'on' : lf < 3 ? 'warn' : 'off', !lf ? 'LCD ok' : lf < 3 ? 'LCD suspeito' : 'LCD em falha');
      // SD
      if (sdOff) {
        sf++; pend++;
        log(sf >= 3 ? 'err' : 'warn', `${stamp(t)} E SD: open("/log.csv") falhou · ${Math.min(sf, 3)}/3`);
        if (sf === 3) log('err', `${stamp(t)} E SD: falha confirmada → linhas guardadas na RAM`);
      } else {
        if (sf) { log('ok', `${stamp(t)} I SD: SD.end(); SD.begin(5) → ok · ${pend} linhas pendentes gravadas`); lines += pend; pend = 0; }
        sf = 0; lines++;
        if (t % 5 === 0 && !lf) log('', `${stamp(t)} I ciclo ok · LCD ok · SD ${lines} linhas`);
      }
      pill(out(root, 'ps'), !sf ? 'on' : sf < 3 ? 'warn' : 'off', !sf ? 'SD ok' : sf < 3 ? 'SD suspeito' : `SD em falha · ${pend} na RAM`);
    }
    paint();
    return {
      tick(dt) {
        acc += dt;
        if (acc >= 1) { acc -= 1; cycle(); paint(); }
        if (noise) { const b = Math.floor(performance.now() / 180); if (b !== blink) { blink = b; paint(); } }
      }
    };
  };

  /* ======================================================
     19. Estados de operação
     ====================================================== */
  SIMS.states = root => {
    const svg = stageOf(root), log = logger(out(root, 'log')), tIn = inp(root, 't');
    const bSe = act(root, 'sens'), bSd = act(root, 'sd');
    const ST = ['NORMAL', 'ALERTA', 'FALHA'], COL = [C.mint, C.yellow, C.red];
    let est = 0, sens = false, sd = false, t = 0, beat = 0;
    const nodes = ST.map((n, i) => {
      const x = 20 + i * 130;
      const r = S('rect', { x, y: 40, width: 100, height: 64, rx: 14, fill: COL[i], 'fill-opacity': 0.06, stroke: C.border, 'stroke-width': 2 }, svg);
      txt(svg, x + 50, 78, n, { size: 14, weight: 700, fill: COL[i] });
      return r;
    });
    [[120, 150], [250, 280]].forEach(([a, b]) => {
      S('path', { d: `M${a + 2} 62 H${b - 4}`, stroke: C.wire, 'stroke-width': 2 }, svg);
      S('path', { d: `M${b - 4} 57 l8 5 l-8 5 z`, fill: C.wire }, svg);
      S('path', { d: `M${b - 2} 84 H${a + 6}`, stroke: C.wire, 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg);
      S('path', { d: `M${a + 6} 79 l-8 5 l8 5 z`, fill: C.wire }, svg);
    });
    txt(svg, 200, 128, 'tracejado: volta quando a causa some (com histerese)', { size: 10, fill: C.muted });
    txt(svg, 200, 22, 'opera · opera degradado · estado seguro', { size: 10.5, fill: C.muted });
    function motivo(temp) {
      if (sens) return [2, 'sensor sem leitura válida'];
      if (est === 2 ? temp > 43 : temp >= 45) return [2, `temperatura ${fmt(temp, 1)} °C ≥ 45 (crítica)`];
      if (sd) return [1, 'cartão SD indisponível'];
      if (est >= 1 ? temp > 33 : temp >= 35) return [1, `temperatura ${fmt(temp, 1)} °C ≥ 35`];
      return [0, 'condições normais'];
    }
    bSe.addEventListener('click', () => { sens = !sens; toggleBtn(bSe, sens, ['Sensor reparado', 'Falha no sensor']); });
    bSd.addEventListener('click', () => { sd = !sd; toggleBtn(bSd, sd, ['SD reparado', 'Falha no SD']); });
    log('dim', '[     0.0 s] I boot · estado NORMAL');
    function paint() {
      nodes.forEach((r, i) => { r.setAttribute('stroke', i === est ? COL[i] : C.border); r.setAttribute('fill-opacity', i === est ? 0.22 : 0.06); r.setAttribute('stroke-width', i === est ? 3 : 2); });
    }
    paint();
    return {
      tick(dt) {
        t += dt;
        const temp = +tIn.value;
        out(root, 't', sens ? '<span class="c-red">sem leitura</span>' : fmt(temp, 1) + ' °C');
        const [nv, why] = motivo(temp);
        if (nv !== est) {
          log(nv === 2 ? 'err' : nv === 1 ? 'warn' : 'ok', `${stamp(t)} ${'IWE'[nv]} ${ST[est]} -> ${ST[nv]}: ${why}`);
          est = nv; paint();
        }
        if (t - beat >= 5) { beat = t; log('dim', `${stamp(t)} I ${ST[est]} · T=${sens ? '--' : fmt(temp, 1)} · SD ${sd ? 'off' : 'ok'}`); }
        const ms = t * 1000;
        out(root, 'lg').classList.toggle('on', est === 0);
        out(root, 'ly').classList.toggle('on', est === 1 && Math.floor(ms / 500) % 2 === 0);
        out(root, 'lr').classList.toggle('on', est === 2 && Math.floor(ms / 125) % 2 === 0);
        out(root, 'pat', ['verde fixo', 'amarelo · 1 Hz', 'vermelho · 4 Hz'][est]);
      }
    };
  };

  /* ======================================================
     20. Bloqueante × millis() com timeout
     ====================================================== */
  SIMS.nonblock = root => {
    const codeEl = out(root, 'code'), tl = canvas2d($(root, '[data-c="tl"]')), stuckBtn = act(root, 'stuck');
    const CODE = {
      block: [
        'void loop() {',
        '  iniciarConversao();',
        '  while (!conversaoPronta()) { } // 750 ms… ou nunca',
        '  float t = lerTemperatura();',
        '  atualizarLCD(t);               // ~30 ms',
        '  gravarSD(t);                   // ~40 ms',
        '  delay(200);',
        '  if (digitalRead(EMERG) == LOW) parar();',
        '}'
      ],
      nb: [
        'void loop() {',
        '  unsigned long agora = millis();',
        '  if (digitalRead(EMERG) == LOW) parar(); // sempre',
        '  if (!conv && agora - tUlt >= 1000) {',
        '    iniciarConversao(); tIni = agora; conv = true;',
        '  }',
        '  if (conv && conversaoPronta()) {',
        '    t = lerTemperatura(); conv = false; tUlt = agora;',
        '  } else if (conv && agora - tIni > 1000) {',
        '    falhaSensor(); conv = false; tUlt = agora; // timeout',
        '  }',
        '  if (agora - tLcd >= 500) { tLcd = agora; atualizarLCD(t); }',
        '  if (agora - tSd >= 2000) { tSd = agora; gravarSD(t); }',
        '}'
      ]
    };
    const HL = { block: [2, 6], nb: [2, 8, 9] };
    const LANES = ['sensor', 'LCD', 'SD', 'delay', 'botão'];
    const WIN = 4000;
    let mode, stuck = false, t, cur, bars, presses, si, conv, tIni, tUlt, tLcd, tSd, convBar, maxLat, loopsW, timeouts;
    function reset() {
      t = 0; cur = null; bars = []; presses = []; si = 0; conv = false; tIni = 0; tUlt = -1000; tLcd = 0; tSd = 0; convBar = null; maxLat = 0; loopsW = []; timeouts = [];
      out(root, 'lat', '–'); out(root, 'max', '–');
    }
    function setMode(m) {
      mode = m; reset();
      renderCode(codeEl, CODE[m], HL[m]);
      desc();
    }
    function desc() {
      out(root, 'desc', mode === 'block'
        ? 'Cada etapa espera a anterior e o botão é lido <b>uma vez por volta</b> (~1 s).' + (stuck ? ' <span class="c-red">Com o sensor mudo, o while nunca termina: nada mais roda, nem a emergência.</span>' : '')
        : 'A conversão acontece no sensor enquanto a CPU segue: o botão é lido em toda volta.' + (stuck ? ' <span class="c-orange">Sensor mudo: o timeout registra a falha a cada 1 s e o resto continua.</span>' : ''));
    }
    function detect(at) { presses.forEach(p => { if (p.det === null && p.t <= at) { p.det = at; const lat = at - p.t; maxLat = Math.max(maxLat, lat); out(root, 'lat', fmt(lat, lat < 10 ? 1 : 0) + ' ms'); out(root, 'max', fmt(maxLat, maxLat < 10 ? 1 : 0) + ' ms'); } }); }
    function next() {
      if (mode === 'block') {
        const SEQ = [['sensor', stuck ? Infinity : 750], ['LCD', 30], ['SD', 40], ['delay', 200], ['botão', 1]];
        const [lane, dur] = SEQ[si]; si = (si + 1) % SEQ.length;
        return { lane, t0: t, t1: t + dur, check: lane === 'botão' };
      }
      detect(t + 0.02);
      if (!conv && t - tUlt >= 1000) { conv = true; tIni = t; convBar = { lane: 'sensor', t0: t, t1: null, hollow: true }; bars.push(convBar); return { lane: 'sensor', t0: t, t1: t + 1 }; }
      if (conv && !stuck && t >= tIni + 750) { conv = false; tUlt = t; convBar.t1 = t; return { lane: 'sensor', t0: t, t1: t + 2 }; }
      if (conv && t - tIni > 1000) { conv = false; tUlt = t; convBar.t1 = t; convBar.bad = true; timeouts.push(t); return { lane: 'sensor', t0: t, t1: t + 1 }; }
      if (t - tLcd >= 500) { tLcd = t; return { lane: 'LCD', t0: t, t1: t + 30 }; }
      if (t - tSd >= 2000) { tSd = t; return { lane: 'SD', t0: t, t1: t + 40 }; }
      const nx = Math.min(conv ? (stuck ? tIni + 1001 : tIni + 750) : tUlt + 1000, tLcd + 500, tSd + 2000);
      return { lane: null, t0: t, t1: Math.max(t + 0.5, nx), idle: true };
    }
    function finish(s) {
      if (s.lane) bars.push(s);
      if (s.check) detect(s.t1);
      loopsW.push([s.t1, s.idle ? (s.t1 - s.t0) / 0.02 : s.lane === 'botão' || mode === 'nb' ? 1 : 0]);
    }
    seg(root, 'mode', setMode);
    stuckBtn.addEventListener('click', () => { stuck = !stuck; toggleBtn(stuckBtn, stuck, ['Sensor voltou', 'Sensor não responde']); if (!stuck && cur && cur.t1 === Infinity) cur.t1 = t + 1; desc(); });
    act(root, 'press', () => {
      presses.push({ t, det: null });
      if (mode === 'nb' && cur && cur.idle) detect(t + 0.05);
    });
    function draw() {
      const { ctx, w, h } = tl, L = 58, R = 8, rowH = 30, T = 6, pw = w - L - R, t0 = t - WIN;
      const X = s => L + (s - t0) / WIN * pw;
      ctx.clearRect(0, 0, w, h); ctx.font = FONT11;
      LANES.forEach((n, i) => { ctx.fillStyle = C.text2; ctx.textAlign = 'left'; ctx.fillText(n, 6, T + i * rowH + 19); });
      ctx.strokeStyle = '#2a2238'; ctx.fillStyle = '#6d6585'; ctx.textAlign = 'center'; ctx.lineWidth = 1;
      for (let s = Math.ceil(t0 / 1000) * 1000; s <= t; s += 1000) { const x = X(s); ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, h - 16); ctx.stroke(); ctx.fillText((s / 1000).toFixed(0) + ' s', x, h - 3); }
      const COLS = { sensor: C.orange, LCD: C.blue, SD: C.yellow, delay: '#5f5677', 'botão': C.mint };
      const all = cur && cur.lane ? bars.concat([cur]) : bars;
      all.forEach(b => {
        const i = LANES.indexOf(b.lane), x0 = Math.max(L, X(b.t0)), x1 = X(Math.min(b.t1 ?? t, t));
        if (x1 < L) return;
        const y = T + i * rowH + 6, bw = Math.max(2, x1 - x0);
        if (b.hollow) { ctx.strokeStyle = b.bad ? C.red : C.orange; ctx.setLineDash([4, 3]); ctx.strokeRect(x0, y + 2, bw, rowH - 16); ctx.setLineDash([]); }
        else { ctx.fillStyle = COLS[b.lane]; ctx.fillRect(x0, y, bw, rowH - 12); }
      });
      timeouts.filter(s => s > t0).forEach(s => { ctx.fillStyle = C.red; ctx.textAlign = 'left'; ctx.fillText('timeout', X(s) + 3, T + 4); });
      const by = T + 4 * rowH + 6;
      presses.filter(p => (p.det ?? t) > t0).forEach(p => {
        const x = X(p.t);
        ctx.fillStyle = C.orange; ctx.beginPath(); ctx.moveTo(x, by - 4); ctx.lineTo(x - 5, by - 12); ctx.lineTo(x + 5, by - 12); ctx.fill();
        const xe = X(p.det ?? t);
        ctx.strokeStyle = p.det === null ? C.red : C.mint; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, by + 8); ctx.lineTo(Math.max(x + 1, xe), by + 8); ctx.stroke(); ctx.lineWidth = 1;
        if (p.det !== null) { ctx.fillStyle = C.mint; ctx.textAlign = 'left'; ctx.fillText('✓ ' + Math.round(p.det - p.t) + ' ms', Math.max(x, xe) + 4, by + 12); }
      });
      const pend = presses.find(p => p.det === null);
      if (pend) out(root, 'lat', `<span class="c-red">esperando… ${Math.round(t - pend.t)} ms</span>`);
    }
    setMode('block');
    return {
      tick(dt) {
        const target = t + dt * 1000;
        let guard = 0;
        while (guard++ < 5000) {
          if (!cur) cur = next();
          if (cur.t1 > target) break;
          t = cur.t1; finish(cur); cur = null;
        }
        t = target;
        bars = bars.filter(b => (b.t1 ?? t) > t - WIN);
        presses = presses.filter(p => (p.det ?? t) > t - WIN);
        loopsW = loopsW.filter(l => l[0] > t - 1000);
        const lps = loopsW.reduce((a, l) => a + l[1], 0) * 1000 / Math.min(1000, Math.max(1, t));
        out(root, 'lps', mode === 'block' && stuck && cur && cur.t1 === Infinity ? '<span class="c-red">0</span>' : Math.round(lps).toLocaleString('pt-BR'));
        draw();
      },
      redraw: draw
    };
  };

  /* ======================================================
     21. Watchdog Timer
     ====================================================== */
  SIMS.wdt = root => {
    const fill = out(root, 'fill'), log = logger(out(root, 'log'));
    const TO = 3;
    let on = true, st = 'run', since = 0, up = 0, n = 0, rb = 0, beat = 0, volta = 0, ms = 0;
    seg(root, 'wdt', v => { on = v === 'on'; });
    act(root, 'hang', () => {
      if (st !== 'run') return;
      st = 'hang';
      log('warn', `${stamp(up)} → while (!sensor.pronto()) { }   // fio solto`);
    });
    log('dim', `${stamp(0)} I setup ok · esp_reset_reason() = ESP_RST_POWERON`);
    function render() {
      const k = Math.min(1, since / TO);
      fill.style.width = (k * 100) + '%';
      fill.className = 'fill' + (k > 0.9 ? ' bad' : k > 0.6 ? ' warn' : '');
      out(root, 'lbl', st === 'hang' && !on ? `${fmt(since, 1)} s · sem WDT, ninguém vai reiniciar` : `${fmt(Math.min(since, TO), 2)} s de ${fmt(TO, 2)} s`);
      out(root, 'st', { run: '<span class="c-mint">rodando</span>', hang: '<span class="c-red">travado</span>', boot: '<span class="c-orange">reiniciando</span>' }[st]);
      out(root, 'up', Math.floor(up) + ' s');
      out(root, 'n', n);
    }
    return {
      tick(dt) {
        ms += dt * 1000;
        if (st === 'run') {
          up += dt; since += dt;
          if (since >= 0.12) { since = 0; volta++; }
          if (up - beat >= 1.5) { beat = up; log('', `${stamp(up)} I volta ${volta} · T=${fmt(24 + Math.sin(up), 1)} °C · wdt ok`); }
        } else if (st === 'hang') {
          up += dt; since += dt;
          if (on && since >= TO) {
            const c = Math.round(up * 1000);
            log('err', `E (${c}) task_wdt: Task watchdog got triggered. The following tasks/users did not reset the watchdog in time:`);
            log('err', `E (${c}) task_wdt:  - loopTask (CPU 1)`);
            log('err', 'abort() was called at PC 0x400d8f3c on core 0');
            log('warn', 'Rebooting...');
            st = 'boot'; rb = 0; n++;
          }
        } else {
          rb += dt;
          if (rb >= 0.5 && rb - dt < 0.5) log('dim', 'rst:0xc (SW_CPU_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)');
          if (rb >= 1.3) {
            st = 'run'; up = 0; since = 0; beat = 0; volta = 0;
            log('warn', `${stamp(0)} W reiniciado pelo watchdog (ESP_RST_TASK_WDT) · total: ${n}`);
          }
        }
        render();
      }
    };
  };

  /* ======================================================
     23. Detecção, registro e resposta
     ====================================================== */
  SIMS.recover = root => {
    const modsEl = out(root, 'mods');
    const M = [
      { k: 'sensor', nm: 'Sensor DS18B20', det: 'leitura = −127 (fora da faixa)', fix: 'sensors.begin()', deg: 'aquecedor → desligado (seguro)', back: 'controle reativado' },
      { k: 'lcd', nm: 'LCD I²C 0x27', det: 'endTransmission(0x27) = 2', fix: 'Wire.end(); Wire.begin(); lcd.init()', deg: 'status só pela serial e LED', back: 'lcd.init() · tela restaurada' },
      { k: 'sd', nm: 'microSD (SPI)', det: 'SD.open("/log.csv") falhou', fix: 'SD.end(); SD.begin(5)', deg: 'linhas vão para fila na RAM', back: 'fila gravada no cartão' }
    ].map(m => ({ ...m, phys: true, st: 'ok', fails: 0, wait: 1000, next: 0 }));
    let t = 0, acc = 0, volta = 0, q = 0, ok = 0;
    const cols = { d: out(root, 'd'), l: out(root, 'l'), r: out(root, 'r') };
    function add(c, s) {
      const el = cols[c];
      el.querySelector('b').insertAdjacentHTML('afterend', `<p>${s}</p>`);
      while (el.querySelectorAll('p').length > 7) el.lastElementChild.remove();
    }
    const ts = () => `<span class="muted">${Math.round(t)}s</span>`;
    function renderMods() {
      modsEl.innerHTML = M.map((m, i) => {
        const sub = m.st === 'ok' ? 'operando' : m.st === 'sus' ? `suspeita · ${m.fails}/3` : `falhas: ${m.fails} · próxima tentativa em ${Math.max(0, Math.ceil((m.next - t * 1000) / 1000))} s`;
        return `<div class="mod ${m.st === 'fail' ? 'bad' : m.st === 'sus' ? 'retry' : ''}"><span class="nm">${m.nm}</span>
          <span class="pill ${m.st === 'ok' ? 'on' : m.st === 'sus' ? 'warn' : 'off'}">${m.st === 'ok' ? 'ok' : m.st === 'sus' ? 'suspeito' : 'em falha'}</span>
          <span class="sub">${sub}</span>
          <button class="btn ${m.phys ? 'orange' : ''} sm" data-i="${i}">${m.phys ? 'Quebrar' : 'Consertar'}</button></div>`;
      }).join('');
      $$(modsEl, 'button').forEach(b => b.addEventListener('click', () => { const m = M[+b.dataset.i]; m.phys = !m.phys; renderMods(); }));
      out(root, 'q', q); out(root, 'ok', ok);
    }
    function check(m) {
      const now = t * 1000;
      if (m.phys) {
        if (m.st !== 'ok') {
          add('d', `${ts()} ${m.k}: respondeu`);
          add('l', `${ts()} ${m.k}: recuperado após ${m.fails} falhas`);
          add('r', `${ts()} ${m.k}: ${m.back}`);
          if (m.k === 'sd' && q) { ok += q; q = 0; }
        }
        m.st = 'ok'; m.fails = 0; m.wait = 1000;
        return;
      }
      m.fails++;
      add('d', `${ts()} ${m.k}: ${m.det}`);
      add('l', `${ts()} ${m.k}: falha #${m.fails}`);
      if (m.fails < 3) { m.st = 'sus'; return; }
      if (m.st !== 'fail') { m.st = 'fail'; m.next = now; add('r', `${ts()} ${m.k}: <b style="color:var(--red)">${m.deg}</b>`); }
      if (now >= m.next) {
        add('r', `${ts()} ${m.k}: ${m.fix} · espera ${m.wait / 1000} s`);
        m.next = now + m.wait;
        m.wait = Math.min(m.wait * 2, 30000);
      }
    }
    renderMods();
    return {
      tick(dt) {
        t += dt; acc += dt; volta += Math.round(dt * 4000);
        pill(out(root, 'loop'), 'on', `loop() rodando · volta ${volta.toLocaleString('pt-BR')}`);
        if (acc >= 1) {
          acc -= 1;
          M.forEach(check);
          if (M[0].st === 'ok') { if (M[2].st === 'ok') ok++; else q = Math.min(50, q + 1); }
          renderMods();
        }
      }
    };
  };

  /* ======================================================
     24. Prazo de resposta e estado seguro
     ====================================================== */
  SIMS.failsafe = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), pIn = inp(root, 'p'), fBtn = act(root, 'fail');
    const WIN = 60, SP = 40, LIM = 60;
    let safe = false, t = 0, T = 38, heat = true, read = 38, lastValid = 0, want = false, failed = false, failT = null, tripT = null, tmax = null, data = [], acc = 0;
    seg(root, 'mode', v => { safe = v === 'on'; tripT = null; });
    fBtn.addEventListener('click', () => {
      if (want || failed) { want = false; failed = false; failT = null; tripT = null; tmax = null; lastValid = t; }
      else want = true;
      toggleBtn(fBtn, want, ['Reparar sensor', 'Sensor para de responder']);
    });
    function step(h) {
      t += h;
      // a falha acontece com o aquecedor ligado: o pior caso
      if (want && !failed && heat) { failed = true; failT = t; tmax = T; }
      if (!failed) { read = T + (Math.random() - 0.5) * 0.3; lastValid = t; }
      const prazo = +pIn.value;
      if (safe && t - lastValid > prazo) { heat = false; if (tripT === null) tripT = t; }
      else if (read < SP - 0.5) heat = true;
      else if (read > SP + 0.5) heat = false;
      T += h * ((heat ? 1.2 : 0) - 0.025 * (T - 20));
      if (failed) tmax = Math.max(tmax, T);
      data.push({ t, T, read, heat, failed });
      while (data.length && data[0].t < t - WIN) data.shift();
    }
    function draw() {
      const { ctx, w, h } = pl, L = 40, R = 10, Tp = 10, B = 30, pw = w - L - R, ph = h - Tp - B;
      const t0 = t - WIN, X = s => L + (s - t0) / WIN * pw, Y = v => Tp + ph - (clamp(v, 20, 80) - 20) / 60 * ph;
      ctx.clearRect(0, 0, w, h);
      grid(ctx, L, R, w, [20, 40, 60, 80], Y, v => v + '°');
      ctx.setLineDash([5, 4]); ctx.lineWidth = 1.5;
      ctx.strokeStyle = C.mint; ctx.beginPath(); ctx.moveTo(L, Y(SP)); ctx.lineTo(w - R, Y(SP)); ctx.stroke();
      ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(L, Y(LIM)); ctx.lineTo(w - R, Y(LIM)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.red; ctx.textAlign = 'left'; ctx.fillText('limite seguro', L + 6, Y(LIM) - 5);
      // aquecedor ligado
      data.forEach(d => { if (d.heat) { ctx.fillStyle = 'rgba(255,145,72,.35)'; ctx.fillRect(X(d.t), h - B + 14, pw / WIN * 0.26, 8); } });
      ctx.fillStyle = '#6d6585'; ctx.textAlign = 'left'; ctx.fillText('aquec.', 2, h - B + 22);
      [[C.blue, 'read', true], [C.orange, 'T', false]].forEach(([col, k, dash]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; if (dash) ctx.setLineDash([3, 3]);
        ctx.beginPath(); data.forEach((d, i) => { const x = X(d.t), y = Y(d[k]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
      });
      [[failT, C.red, 'falha'], [tripT, C.mint, 'estado seguro']].forEach(([s, col, lab]) => {
        if (s === null || s < t0) return;
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(s), Tp); ctx.lineTo(X(s), Tp + ph); ctx.stroke();
        ctx.fillStyle = col; ctx.textAlign = 'left'; ctx.fillText(lab, X(s) + 4, Tp + (lab === 'falha' ? 30 : 44));
      });
      ctx.textAlign = 'left';
      ctx.fillStyle = C.orange; ctx.fillText('— real', L + 6, Tp + 12);
      ctx.fillStyle = C.blue; ctx.fillText('··· lida', L + 66, Tp + 12);
    }
    for (let i = 0; i < WIN / 0.25; i++) step(0.25);
    return {
      tick(dt) {
        acc += dt * 2;
        while (acc >= 0.25) { acc -= 0.25; step(0.25); }
        out(root, 'p', pIn.value + ' s');
        out(root, 't', fmt(T, 1) + ' °C');
        out(root, 'tmax', tmax === null ? '–' : `<span class="${tmax > LIM ? 'c-red' : 'c-mint'}">${fmt(tmax, 1)} °C</span>`);
        out(root, 'h', heat ? '<span class="c-orange">ligado</span>' : 'desligado');
        draw();
      },
      redraw: draw
    };
  };
})();
