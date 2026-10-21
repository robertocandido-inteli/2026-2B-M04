/* ==========================================================
   Simulações interativas — uma função por data-sim.
   Cada função recebe o elemento raiz e pode devolver
   { tick(dt, t), pause(), resume() }.
   Este arquivo: utilitários + hardware (telas 1–10).
   ========================================================== */
window.SIMS = {};
(function () {
  const C = {
    bg: '#191426', surf: '#261f36', surf2: '#322943', surf3: '#3d3352', border: '#463b5e',
    text: '#f8f7fa', text2: '#dedde6', muted: '#a9a3bd', wire: '#8c84a3',
    mint: '#80e6c6', orange: '#ff9148', blue: '#7caaff', red: '#ff5d5d', yellow: '#ffd166', plot: '#1d1729'
  };
  const NS = 'http://www.w3.org/2000/svg';
  const FONT = 'IBM Plex Mono, ui-monospace, monospace';

  // ---------- utilidades ----------
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) {
      if (k === 'text') e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (parent) parent.appendChild(e);
    return e;
  }
  const $ = (root, sel) => root.querySelector(sel);
  const $$ = (root, sel) => Array.from(root.querySelectorAll(sel));
  const out = (root, k, html) => { const e = $(root, `[data-o="${k}"]`); if (e && html !== undefined) e.innerHTML = html; return e; };
  const inp = (root, k) => $(root, `[data-in="${k}"]`);
  const act = (root, k, fn) => { const b = $(root, `[data-act="${k}"]`); if (b && fn) b.addEventListener('click', fn); return b; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmt = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtN = (x, max = 2) => x.toLocaleString('pt-BR', { maximumFractionDigits: max });
  const stageOf = root => $(root, 'svg.stage') || root;

  let gid = 0;
  function glow(svg, color) {
    const defs = svg.querySelector('defs') || S('defs', {}, svg);
    const id = 'glow' + (++gid);
    const g = S('radialGradient', { id }, defs);
    S('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0.95 }, g);
    S('stop', { offset: 0.45, 'stop-color': color, 'stop-opacity': 0.35 }, g);
    S('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, g);
    return `url(#${id})`;
  }
  function wire(g, d, o = {}) {
    return S('path', { d, fill: 'none', stroke: o.color || C.wire, 'stroke-width': o.w || 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...(o.dash ? { 'stroke-dasharray': o.dash } : {}) }, g);
  }
  function txt(g, x, y, t, o = {}) {
    return S('text', { x, y, text: t, fill: o.fill || C.muted, 'font-size': o.size || 13, 'text-anchor': o.anchor || 'middle', 'font-family': FONT, 'font-weight': o.weight || 500 }, g);
  }
  // diodo / LED, aponta para +x no sistema local; rot em graus
  function diode(svg, g, cx, cy, rot, o = {}) {
    const col = o.color || C.red;
    const grp = S('g', { transform: `translate(${cx} ${cy}) rotate(${rot})` }, g);
    let halo = null;
    if (o.led) halo = S('circle', { cx: 0, cy: 0, r: 46, fill: glow(svg, col), opacity: 0 }, grp);
    S('path', { d: 'M-20 0 H-12 M12 0 H20', stroke: C.wire, 'stroke-width': 3 }, grp);
    const body = S('path', { d: 'M-12 -13 L12 0 L-12 13 Z', fill: col, 'fill-opacity': o.led ? 0.25 : 0.9, stroke: col, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, grp);
    S('line', { x1: 12, y1: -14, x2: 12, y2: 14, stroke: col, 'stroke-width': 3.5 }, grp);
    if (o.led) S('path', { d: 'M0 -17 l9 -9 m-5 0 h5 v5 M8 -13 l9 -9 m-5 0 h5 v5', stroke: col, 'stroke-width': 2, fill: 'none' }, grp);
    return {
      grp, body, halo,
      setOn(b) { if (halo) halo.setAttribute('opacity', b); body.setAttribute('fill-opacity', 0.25 + 0.75 * b); }
    };
  }
  function canvas2d(cv) {
    const ctx = cv.getContext('2d');
    const h = +cv.getAttribute('height');
    const o = { ctx, w: 300, h };
    o.fit = () => {
      const dpr = window.devicePixelRatio || 1;
      o.w = cv.clientWidth || 300;
      cv.style.height = h + 'px';
      cv.width = Math.round(o.w * dpr);
      cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    o.fit();
    if (window.ResizeObserver) new ResizeObserver(() => { if (cv.clientWidth && Math.abs(cv.clientWidth - o.w) > 1) o.fit(); }).observe(cv);
    return o;
  }
  function seg(root, k, fn) {
    const box = $(root, `[data-seg="${k}"]`);
    const set = v => {
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === v)));
    };
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { set(b.dataset.v); fn(b.dataset.v); }));
    return set;
  }
  function pill(el, cls, html) { el.className = 'pill ' + (cls || ''); el.innerHTML = html; }
  function toggleBtn(btn, on, labels) {
    btn.setAttribute('aria-pressed', String(on));
    if (labels) btn.textContent = on ? labels[0] : labels[1];
  }

  // ---------- realce de sintaxe (C++ e Python) ----------
  const KW = new Set(('void int float bool byte char long unsigned const if else for while return class public private ' +
    'true false HIGH LOW OUTPUT INPUT INPUT_PULLUP uint8_t int8_t int16_t uint16_t uint32_t volatile double static ' +
    'FALLING RISING CHANGE A0 def True False import from in and or not').split(' '));
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function hl(src, py) {
    const re = new RegExp(`(${py ? '#.*$' : '\\/\\/.*$'})|("[^"]*"|'[^']*')|(\\b0[bx][0-9a-fA-F]+\\b|\\b\\d+(?:\\.\\d+)?\\b)|([A-Za-z_]\\w*)|([\\s\\S])`, 'g');
    let o = '', m;
    while ((m = re.exec(src))) {
      if (m[1]) o += `<span class="tok-c">${esc(m[1])}</span>`;
      else if (m[2]) o += `<span class="tok-s">${esc(m[2])}</span>`;
      else if (m[3]) o += `<span class="tok-n">${m[3]}</span>`;
      else if (m[4]) {
        const next = src.slice(re.lastIndex).match(/^\s*\(/);
        if (KW.has(m[4])) o += `<span class="tok-k">${m[4]}</span>`;
        else if (next) o += `<span class="tok-f">${m[4]}</span>`;
        else o += m[4];
      } else o += esc(m[5]);
    }
    return o;
  }
  // cls: número (linha atual), array de linhas ou objeto {linha: classe}
  function renderCode(el, lines, cls, py) {
    let map = {};
    if (typeof cls === 'number') map[cls] = 'cur';
    else if (Array.isArray(cls)) cls.forEach(i => { map[i] = 'cur'; });
    else if (cls) map = cls;
    el.innerHTML = lines.map((l, i) => `<span class="ln ${map[i] || ''}">${hl(l, py) || ' '}</span>`).join('');
  }

  window.KIT = { C, S, $, $$, out, inp, act, clamp, lerp, fmt, fmtN, stageOf, glow, wire, txt, diode, canvas2d, seg, pill, toggleBtn, hl, renderCode, FONT };

  /* ======================================================
     1. Capa — trilhas de circuito com pulsos
     ====================================================== */
  SIMS.traces = svg => {
    let seed = 23;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = [C.mint, C.orange, C.blue];
    const cx = 1240, cy = 450;
    for (let i = 0; i < 30; i++) {
      const side = i % 4, k = Math.floor(i / 4) - 3;
      let x = cx, y = cy, pts;
      if (side === 0) { x = cx - 110; y = cy + k * 30; pts = [[x, y], [x - 80 - rnd() * 160, y]]; }
      else if (side === 1) { x = cx + 110; y = cy + k * 30; pts = [[x, y], [x + 60 + rnd() * 120, y]]; }
      else if (side === 2) { x = cx + k * 30; y = cy - 110; pts = [[x, y], [x, y - 60 - rnd() * 160]]; }
      else { x = cx + k * 30; y = cy + 110; pts = [[x, y], [x, y + 60 + rnd() * 160]]; }
      let [px, py] = pts[1];
      let horiz = side >= 2, len = Math.hypot(pts[1][0] - x, pts[1][1] - y);
      const segs = 1 + Math.floor(rnd() * 3);
      for (let s = 0; s < segs; s++) {
        const d = (2 + Math.floor(rnd() * 5)) * 40 * (rnd() < 0.5 ? -1 : 1);
        if (horiz) px += d; else py += d;
        pts.push([px, py]); len += Math.abs(d); horiz = !horiz;
      }
      const d = 'M' + pts.map(p => p.map(v => Math.round(v)).join(' ')).join(' L');
      S('path', { d, class: 'base' }, svg);
      S('circle', { cx: px, cy: py, r: 6, class: 'pad' }, svg);
      const pulse = S('path', { d, class: 'pulse', stroke: cols[i % 3], color: cols[i % 3], 'stroke-dasharray': `60 ${Math.round(len + 60)}` }, svg);
      pulse.style.setProperty('--len', Math.round(len) + 'px');
      pulse.style.setProperty('--seg', '60px');
      pulse.style.setProperty('--dur', (2.5 + rnd() * 4).toFixed(2) + 's');
      pulse.style.setProperty('--delay', (-rnd() * 6).toFixed(2) + 's');
    }
    S('rect', { x: cx - 110, y: cy - 110, width: 220, height: 220, rx: 18, fill: '#211a30', stroke: C.border, 'stroke-width': 3 }, svg);
    S('rect', { x: cx - 70, y: cy - 70, width: 140, height: 140, rx: 10, fill: 'none', stroke: '#352c4a', 'stroke-width': 2 }, svg);
    txt(svg, cx, cy - 4, 'MCU', { fill: C.mint, size: 40, weight: 700 });
    txt(svg, cx, cy + 32, '{ C++ }', { fill: C.orange, size: 22, weight: 600 });
    return {};
  };

  /* ======================================================
     2. Dentro do microcontrolador — blocos clicáveis
     ====================================================== */
  SIMS.mcu = root => {
    const svg = stageOf(root);
    const B = {
      cpu: { x: 210, y: 96, w: 140, h: 80, c: C.mint, t: 'CPU', s: 'processamento', side: 0 },
      flash: { x: 52, y: 40, w: 118, h: 56, c: C.blue, t: 'Flash', s: 'programa', side: -1 },
      sram: { x: 52, y: 122, w: 118, h: 56, c: C.blue, t: 'SRAM', s: 'variáveis', side: -1 },
      eeprom: { x: 52, y: 204, w: 118, h: 56, c: C.blue, t: 'EEPROM', s: 'configurações', side: -1 },
      gpio: { x: 390, y: 36, w: 118, h: 44, c: C.orange, t: 'GPIO', s: 'pinos digitais', side: 1 },
      adc: { x: 390, y: 88, w: 118, h: 44, c: C.orange, t: 'ADC', s: 'analógico → número', side: 1 },
      timer: { x: 390, y: 140, w: 118, h: 44, c: C.orange, t: 'Timers · PWM', s: 'tempo', side: 1 },
      com: { x: 390, y: 192, w: 118, h: 44, c: C.orange, t: 'UART·I²C·SPI', s: 'comunicação', side: 1 },
      clock: { x: 220, y: 214, w: 120, h: 44, c: C.yellow, t: 'Clock', s: 'oscilador', side: 2 }
    };
    const INFO = {
      cpu: '<b>CPU</b> — busca as instruções na Flash e as executa: contas, comparações e desvios. Uno: AVR de 8 bits a 16 MHz. ESP32: Xtensa de 32 bits, 2 núcleos, até 240 MHz.',
      flash: '<b>Flash</b> — guarda o programa (firmware) e não se apaga ao desligar. Uno: 32 KB · ESP32: 4 MB.',
      sram: '<b>SRAM</b> — memória de trabalho: variáveis e pilha de chamadas. Rápida, mas se apaga ao desligar. Uno: 2 KB · ESP32: 520 KB.',
      eeprom: '<b>EEPROM</b> — pequena memória não volátil para configurações e calibração. Uno: 1 KB. No ESP32 é emulada na Flash (biblioteca Preferences).',
      gpio: '<b>GPIO</b> — pinos de entrada e saída de uso geral: ler botões, acionar LEDs e relés.',
      adc: '<b>ADC</b> — conversor analógico-digital: transforma uma tensão em número. Uno: 10 bits (0–1023) · ESP32: 12 bits (0–4095).',
      timer: '<b>Timers / PWM</b> — contam pulsos do clock por conta própria: medem tempo, geram PWM e disparam interrupções sem ocupar a CPU.',
      com: '<b>UART · I²C · SPI</b> — interfaces seriais para conversar com o computador, sensores, displays e outros chips.',
      clock: '<b>Clock</b> — oscilador que dita o ritmo: cada pulso avança um passo da CPU. Uno: 16 MHz · ESP32: até 240 MHz.'
    };
    // corpo do chip e pinos
    S('rect', { x: 30, y: 18, width: 500, height: 264, rx: 16, fill: '#211a30', stroke: C.border, 'stroke-width': 2.5 }, svg);
    for (let x = 60; x <= 500; x += 30) {
      S('rect', { x: x - 5, y: 6, width: 10, height: 12, rx: 2, fill: '#6d6585' }, svg);
      S('rect', { x: x - 5, y: 282, width: 10, height: 12, rx: 2, fill: '#6d6585' }, svg);
    }
    for (let y = 44; y <= 260; y += 30) {
      S('rect', { x: 18, y: y - 5, width: 12, height: 10, rx: 2, fill: '#6d6585' }, svg);
      S('rect', { x: 530, y: y - 5, width: 12, height: 10, rx: 2, fill: '#6d6585' }, svg);
    }
    // barramentos
    const busC = '#5f5677';
    wire(svg, 'M190 68 V232 M170 68 H190 M170 150 H190 M170 232 H190 M190 136 H210', { color: busC, w: 4 });
    wire(svg, 'M370 58 V214 M370 58 H390 M370 110 H390 M370 162 H390 M370 214 H390 M350 136 H370', { color: busC, w: 4 });
    wire(svg, 'M280 176 V214', { color: busC, w: 4 });
    const els = {};
    for (const k in B) {
      const b = B[k];
      const g = S('g', { class: 'blk', tabindex: 0, role: 'button', 'aria-label': b.t }, svg);
      const r = S('rect', { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: C.surf2, stroke: b.c, 'stroke-opacity': 0.5, 'stroke-width': 2 }, g);
      txt(g, b.x + b.w / 2, b.y + b.h / 2 - (k === 'cpu' ? 2 : 1), b.t, { fill: b.c, size: k === 'cpu' ? 22 : 14, weight: 700 });
      txt(g, b.x + b.w / 2, b.y + b.h / 2 + (k === 'cpu' ? 20 : 15), b.s, { fill: C.muted, size: 10.5 });
      g.addEventListener('click', () => { setTour(false); sel(k); });
      g.addEventListener('keydown', e => { if (e.key === 'Enter') { setTour(false); sel(k); } });
      els[k] = r;
    }
    // pacotes que viajam entre a CPU e o bloco selecionado
    const path = S('path', { fill: 'none', stroke: 'none' }, svg);
    const dots = [0, 1, 2].map(() => S('circle', { r: 4, fill: C.mint, opacity: 0 }, svg));
    let cur = null, L = 0, ph = 0;
    function sel(k) {
      cur = k;
      for (const j in els) {
        els[j].setAttribute('stroke-opacity', j === k ? 1 : 0.45);
        els[j].setAttribute('stroke-width', j === k ? 3 : 2);
        els[j].setAttribute('fill', j === k ? '#3a3050' : C.surf2);
      }
      const b = B[k], cy = b.y + b.h / 2;
      let d = '';
      if (b.side === -1) d = `M210 136 H190 V${cy} H170`;
      else if (b.side === 1) d = `M350 136 H370 V${cy} H390`;
      else if (b.side === 2) d = 'M280 176 V214';
      path.setAttribute('d', d || 'M0 0');
      L = d ? path.getTotalLength() : 0;
      dots.forEach(c => { c.setAttribute('fill', b.c); c.setAttribute('opacity', d ? 1 : 0); });
      out(root, 'desc', INFO[k]);
    }
    const tourBtn = act(root, 'tour', () => setTour(tourBtn.getAttribute('aria-pressed') !== 'true'));
    const order = Object.keys(B);
    let tour = true, tt = 0;
    function setTour(on) { tour = on; tt = 0; toggleBtn(tourBtn, on); }
    sel('cpu');
    return {
      tick(dt) {
        if (tour) { tt += dt; if (tt > 3.2) { tt = 0; sel(order[(order.indexOf(cur) + 1) % order.length]); } }
        if (!L) return;
        ph = (ph + dt * 0.7) % 1;
        dots.forEach((c, i) => {
          const u = (ph + i / 3) % 1, k = u < 0.5 ? u * 2 : 2 - u * 2;
          const p = path.getPointAtLength(k * L);
          c.setAttribute('cx', p.x.toFixed(1)); c.setAttribute('cy', p.y.toFixed(1));
        });
      }
    };
  };

  /* ======================================================
     3. Ciclo busca → decodifica → executa
     ====================================================== */
  SIMS.cycle = root => {
    const svg = stageOf(root);
    const PROG = [
      ['LDI  r17, 1', 'r17 ← 1', 'Coloca a constante 1 no registrador r17.'],
      ['LDS  r16, cont', 'r16 ← cont', 'Lê a variável <b>cont</b> da SRAM para o registrador r16 (barramento de dados).'],
      ['ADD  r16, r17', 'r16 ← r16 + r17', 'A ULA soma os dois registradores: r16 passa a valer r16 + 1.'],
      ['STS  cont, r16', 'cont ← r16', 'Grava o resultado de volta na variável <b>cont</b> da SRAM.'],
      ['RJMP 1', 'PC ← 1', 'Salta de volta para o endereço 1: é o <b>loop()</b> em linguagem de máquina.']
    ];
    // memória de programa
    S('rect', { x: 8, y: 26, width: 204, height: 206, rx: 12, fill: C.surf2, stroke: C.blue, 'stroke-opacity': 0.6, 'stroke-width': 2 }, svg);
    txt(svg, 110, 16, 'Flash · programa', { fill: C.blue, size: 12, weight: 600 });
    const rows = PROG.map((p, i) => {
      const y = 40 + i * 37;
      const r = S('rect', { x: 16, y, width: 188, height: 30, rx: 7, fill: C.plot }, svg);
      txt(svg, 26, y + 20, '0x0' + i, { anchor: 'start', size: 11, fill: '#6d6585' });
      txt(svg, 66, y + 20, p[0], { anchor: 'start', size: 13, fill: C.text2, weight: 600 });
      return r;
    });
    // CPU
    const cpuBox = S('rect', { x: 240, y: 26, width: 140, height: 206, rx: 12, fill: C.surf2, stroke: C.mint, 'stroke-opacity': 0.6, 'stroke-width': 2 }, svg);
    txt(svg, 310, 16, 'CPU', { fill: C.mint, size: 12, weight: 600 });
    const regRow = (y, lab) => {
      txt(svg, 252, y, lab, { anchor: 'start', size: 11, fill: C.muted });
      S('rect', { x: 290, y: y - 15, width: 80, height: 22, rx: 5, fill: C.plot }, svg);
      return txt(svg, 330, y, '', { size: 13, fill: C.text, weight: 600 });
    };
    const tPC = regRow(56, 'PC');
    txt(svg, 252, 88, 'IR', { anchor: 'start', size: 11, fill: C.muted });
    S('rect', { x: 250, y: 96, width: 120, height: 24, rx: 5, fill: C.plot }, svg);
    const tIR = txt(svg, 310, 113, '', { size: 12, fill: C.yellow, weight: 600 });
    const tR16 = regRow(150, 'r16');
    const tR17 = regRow(182, 'r17');
    const tClk = txt(svg, 310, 220, '', { size: 10.5, fill: C.muted });
    // SRAM
    S('rect', { x: 410, y: 26, width: 142, height: 206, rx: 12, fill: C.surf2, stroke: C.orange, 'stroke-opacity': 0.6, 'stroke-width': 2 }, svg);
    txt(svg, 481, 16, 'SRAM · dados', { fill: C.orange, size: 12, weight: 600 });
    const vars = [['0x100', 'cont'], ['0x101', 'limiar'], ['0x102', 'estado']];
    const vRows = vars.map((v, i) => {
      const y = 40 + i * 37;
      const r = S('rect', { x: 418, y, width: 126, height: 30, rx: 7, fill: C.plot }, svg);
      txt(svg, 426, y + 19, v[0], { anchor: 'start', size: 10, fill: '#6d6585' });
      txt(svg, 466, y + 19, v[1], { anchor: 'start', size: 12, fill: C.text2 });
      return { r, t: txt(svg, 536, y + 19, '', { anchor: 'end', size: 13, fill: C.text, weight: 700 }) };
    });
    vRows[1].t.textContent = '30'; vRows[2].t.textContent = '1';
    // barramentos
    const busP = wire(svg, 'M212 100 H240', { color: '#5f5677', w: 5 });
    const busD = wire(svg, 'M380 100 H410', { color: '#5f5677', w: 5 });
    txt(svg, 226, 92, 'instr.', { size: 9, fill: '#6d6585' });
    txt(svg, 395, 92, 'dados', { size: 9, fill: '#6d6585' });
    // fases
    const phases = ['BUSCA', 'DECODIFICA', 'EXECUTA'].map((p, i) => {
      const x = 120 + i * 112;
      const r = S('rect', { x, y: 248, width: 100, height: 30, rx: 15, fill: C.plot, stroke: C.border, 'stroke-width': 1.5 }, svg);
      const t = txt(svg, x + 50, 268, p, { size: 11, weight: 700 });
      if (i < 2) txt(svg, x + 106, 268, '→', { size: 12, fill: '#6d6585' });
      return { r, t };
    });
    const playBtn = act(root, 'play');
    let pc, phase, r16, r17, cont, ir, clocks, playing = false, acc = 0;
    function reset() { pc = 0; phase = 0; r16 = 0; r17 = 0; cont = 0; ir = '—'; clocks = 0; draw(null, 'Pressione <b>Passo</b> ou <b>Executar</b> para ver a CPU trabalhar.'); }
    function draw(bus, desc) {
      rows.forEach((r, i) => r.setAttribute('fill', i === pc ? 'rgba(124,170,255,.22)' : C.plot));
      tPC.textContent = '0x0' + pc; tIR.textContent = ir;
      tR16.textContent = r16; tR17.textContent = r17;
      vRows[0].t.textContent = cont;
      vRows[0].r.setAttribute('fill', bus === 'data' ? 'rgba(255,145,72,.25)' : C.plot);
      busP.setAttribute('stroke', bus === 'prog' ? C.blue : '#5f5677');
      busD.setAttribute('stroke', bus === 'data' ? C.orange : '#5f5677');
      cpuBox.setAttribute('fill', phase === 2 && bus !== null ? '#3a3050' : C.surf2);
      tClk.textContent = clocks + ' ciclos';
      const shown = bus === null && clocks === 0 ? -1 : (phase + 2) % 3;
      phases.forEach((p, i) => {
        p.r.setAttribute('fill', i === shown ? C.mint : C.plot);
        p.r.setAttribute('stroke', i === shown ? C.mint : C.border);
        p.t.setAttribute('fill', i === shown ? C.bg : C.muted);
      });
      out(root, 'desc', desc);
    }
    function step() {
      clocks++;
      const p = PROG[pc];
      if (phase === 0) {
        ir = p[0]; phase = 1;
        draw('prog', `<b>Busca</b>: a CPU lê a instrução do endereço 0x0${pc} da Flash, apontado pelo contador de programa (PC).`);
      } else if (phase === 1) {
        phase = 2;
        draw('none', `<b>Decodifica</b>: <span class="c-yellow">${p[0]}</span> significa “${p[1]}”.`);
      } else {
        let bus = 'none', next = pc + 1;
        if (pc === 0) r17 = 1;
        if (pc === 1) { r16 = cont; bus = 'data'; }
        if (pc === 2) r16 = (r16 + r17) & 255;
        if (pc === 3) { cont = r16; bus = 'data'; }
        if (pc === 4) next = 1;
        const desc = `<b>Executa</b>: ${p[2]}`;
        pc = next; phase = 0;
        draw(bus, desc);
      }
    }
    playBtn.addEventListener('click', () => { playing = !playing; toggleBtn(playBtn, playing, ['Pausar', 'Executar']); });
    act(root, 'step', () => { if (playing) playBtn.click(); step(); });
    act(root, 'reset', reset);
    reset();
    return {
      tick(dt) { if (playing) { acc += dt; if (acc > 0.9) { acc = 0; step(); } } },
      pause() { if (playing) playBtn.click(); }
    };
  };

  /* ======================================================
     4/5. Fotos das placas com pontos clicáveis
     ====================================================== */
  const SPOTS = {
    uno: [
      ['mcu', 42.2, 59.8, 55.7, 19.6, 'ATmega328P', 'o microcontrolador: CPU AVR de 8 bits a 16 MHz, 32 KB de Flash, 2 KB de SRAM e 1 KB de EEPROM. Vem em soquete e pode ser trocado.'],
      ['digital', 24.8, 1.6, 74.2, 9.8, 'Pinos digitais D0–D13', 'entradas ou saídas digitais. O “~” marca os pinos com PWM (3, 5, 6, 9, 10, 11). D0 e D1 são a serial RX/TX, compartilhada com a USB.'],
      ['analog', 73.5, 90.6, 25.5, 9, 'Entradas analógicas A0–A5', 'ligadas ao ADC de 10 bits: tensões de 0 a 5 V viram números de 0 a 1023. Também funcionam como pinos digitais.'],
      ['power', 38.7, 90.6, 32.5, 9, 'Pinos de alimentação', '3,3 V, 5 V, GND e Vin para alimentar sensores e módulos. IOREF informa aos shields a tensão lógica (5 V).'],
      ['usb', 0, 17.7, 15.5, 25.3, 'Conector USB‑B', 'alimenta a placa com 5 V, grava o programa e é a porta serial do Monitor Serial.'],
      ['u2', 24.8, 30.4, 8.1, 11.2, 'ATmega16U2', 'um segundo microcontrolador que apenas converte USB ↔ serial para o ATmega328P.'],
      ['jack', 0, 75.3, 19, 22.5, 'Jack de alimentação', 'entrada de 7–12 V (fonte ou bateria). O regulador reduz para os 5 V da placa.'],
      ['reg', 3.9, 58.4, 15.1, 15.4, 'Regulador de 5 V', 'converte a tensão do jack em 5 V estáveis: é ele que define a tensão lógica da placa.'],
      ['reset', 5.1, 2.3, 10.4, 14, 'Botão RESET', 'reinicia o programa do zero: o setup() roda de novo.'],
      ['led', 37.5, 19.1, 9.3, 19.6, 'LEDs L, TX e RX', 'o L está ligado ao pino 13 (o do Blink). TX e RX piscam durante a comunicação serial.'],
      ['icsp', 87.4, 41.6, 9.3, 15.4, 'Conector ICSP', 'programação direta do chip, sem bootloader. Também expõe os pinos do SPI.']
    ],
    devkit: [
      ['module', 50, 17, 37, 70, 'Módulo ESP32‑WROOM‑32', 'sob a blindagem metálica estão o chip ESP32, a Flash de 4 MB e o cristal. Opera em 3,3 V: um regulador na placa converte os 5 V da USB. Veja “Módulo aberto”.'],
      ['pins', 18, 0, 73, 13, 'Pinos GPIO', 'duas fileiras de pinos (aqui, a de cima). Quase todos podem ser entrada, saída, PWM ou ADC, mas confira o pinout: alguns têm restrições.'],
      ['usb', 1, 38, 11, 26, 'Micro‑USB', 'alimentação (5 V) e gravação do programa.'],
      ['uart', 19, 55, 13, 26, 'Conversor USB‑serial', 'chip CP2102 ou CH340 que faz a ponte entre a USB do computador e a UART0 do ESP32.'],
      ['en', 3, 14, 11, 14, 'Botão EN', 'reinicia (reset) o ESP32.'],
      ['boot', 4, 68, 10, 14, 'Botão BOOT', 'segurado durante o reset, coloca o ESP32 em modo de gravação. A maioria das IDEs faz isso sozinha.']
    ],
    wroom: [
      ['chip', 43, 36, 25, 25, 'Chip ESP32‑D0WD', 'o SoC: dois núcleos Xtensa LX6 de 32 bits a até 240 MHz, 520 KB de SRAM, rádio Wi‑Fi e Bluetooth e todos os periféricos.'],
      ['flash', 68, 34, 22, 24, 'Flash SPI de 4 MB', 'guarda o firmware e arquivos. Fica fora do chip, ligada por SPI, e por isso ocupa os GPIO 6–11, que não devem ser usados.'],
      ['xtal', 49, 23, 13, 11, 'Cristal de 40 MHz', 'referência de clock. Um PLL interno multiplica a frequência até 240 MHz.'],
      ['ant', 5, 18, 24, 59, 'Antena de PCB', 'trilha em zigue-zague sintonizada para 2,4 GHz (Wi‑Fi e Bluetooth). Evite metal e planos de cobre sob ela.'],
      ['pads', 28, 86, 70, 14, 'Terminais do módulo', 'são soldados na placa DevKit, que os leva até os pinos de encaixe.']
    ]
  };
  SIMS.hotspot = root => {
    const slide = root.closest('.slide');
    const figs = $$(root, '.photo');
    const btns = [];
    figs.forEach(fig => {
      (SPOTS[fig.dataset.board] || []).forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'hs';
        b.dataset.n = i + 1; b.dataset.k = s[0];
        b.style.cssText = `left:${s[1]}%;top:${s[2]}%;width:${s[3]}%;height:${s[4]}%`;
        b.setAttribute('aria-label', s[5]);
        b.addEventListener('click', () => sel(s[0], fig));
        fig.appendChild(b);
        btns.push(b);
      });
    });
    const rows = $$(slide, '[data-spot]');
    rows.forEach(r => r.addEventListener('click', () => sel(r.dataset.spot)));
    const view = $(root, '[data-seg="view"]') ? seg(root, 'view', v => show(v)) : null;
    function show(board) { figs.forEach(f => { f.hidden = f.dataset.board !== board; }); }
    function sel(k, fig) {
      fig = fig || figs.find(f => (SPOTS[f.dataset.board] || []).some(s => s[0] === k));
      if (!fig) return;
      if (fig.hidden) { show(fig.dataset.board); view?.(fig.dataset.board); }
      const s = SPOTS[fig.dataset.board].find(x => x[0] === k);
      btns.forEach(b => b.classList.toggle('sel', b.parentNode === fig && b.dataset.k === k));
      rows.forEach(r => r.classList.toggle('sel', r.dataset.spot === k));
      out(root, 'desc', `<b>${s[5]}</b> — ${s[6]}`);
    }
    sel(SPOTS[figs[0].dataset.board][0][0], figs[0]);
    return {};
  };

  /* ======================================================
     6. Uno × ESP32
     ====================================================== */
  SIMS.compare = root => {
    const M = {
      clock: { u: 16, e: 240, f: v => v + ' MHz', d: 'O ESP32 executa até 15× mais ciclos por segundo, com 2 núcleos de 32 bits contra 1 núcleo de 8 bits.' },
      sram: { u: 2, e: 520, f: v => v + ' KB', d: '260× mais memória de trabalho: cabem buffers de rede, JSON e imagens para displays.' },
      flash: { u: 32, e: 4096, f: v => v >= 1024 ? v / 1024 + ' MB' : v + ' KB', d: '4 MB contra 32 KB: espaço para a pilha Wi‑Fi, bibliotecas e até um sistema de arquivos.' },
      adc: { u: 1024, e: 4096, f: v => (v === 1024 ? '10 bits · ' : '12 bits · ') + v + ' níveis', d: '12 bits dão 4× mais níveis. Porém o ADC do ESP32 é menos linear perto de 0 V e de 3,3 V.' },
      gpio: { u: 20, e: 34, f: v => v + ' pinos', d: 'Uno: 14 digitais + 6 analógicos. ESP32: 34 GPIOs no chip, cerca de 25 livres na DevKit.' },
      volt: { u: 5, e: 3.3, f: v => fmtN(v, 1) + ' V', d: 'Aqui maior não é melhor: é a tensão lógica. Ligar 5 V em um pino do ESP32 pode danificá-lo.' }
    };
    const ANS = [
      ['Uno ou ESP32', 'Ambas servem. O Uno é mais tolerante a erros de ligação (5 V, 20 mA por pino) e tem mais material didático.'],
      ['ESP32', 'Wi‑Fi integrado e memória de sobra para HTTP e MQTT. Com o Uno seria preciso um módulo extra.'],
      ['Arduino Uno', 'Shields e sensores de 5 V ligam direto. No ESP32 seriam necessários conversores de nível.'],
      ['ESP32', 'Bluetooth Low Energy e modo deep sleep (~10 µA) para poupar a bateria.'],
      ['ESP32, com ressalvas', '12 bits de resolução, mas é preciso calibrar. Para precisão de verdade, use um ADC externo (ex.: ADS1115 de 16 bits).']
    ];
    function show(k) {
      const m = M[k], max = Math.max(m.u, m.e);
      out(root, 'uno').style.width = (m.u / max * 100) + '%';
      out(root, 'esp').style.width = (m.e / max * 100) + '%';
      out(root, 'unoL', m.f(m.u)); out(root, 'espL', m.f(m.e));
      out(root, 'desc', m.d);
    }
    seg(root, 'm', show);
    $$(root, '.scen button').forEach(b => b.addEventListener('click', () => {
      $$(root, '.scen button').forEach(x => x.classList.toggle('sel', x === b));
      const a = ANS[+b.dataset.k];
      out(root, 'ans', `<span class="pill ${a[0].startsWith('ESP') ? 'warn' : a[0].startsWith('Ard') ? 'info' : 'on'}">${a[0]}</span><br>${a[1]}`);
    }));
    show('clock');
    return {};
  };

  /* ======================================================
     7. Pinos: o mesmo sinal lido pelo ADC e como digital
     ====================================================== */
  SIMS.adc = root => {
    const BOARDS = { uno: { vref: 5, bits: 10, vil: 1.5, vih: 3.0 }, esp: { vref: 3.3, bits: 12, vil: 0.825, vih: 2.475 } };
    const iV = inp(root, 'v');
    const plot = canvas2d($(root, '[data-c="plot"]'));
    let board = 'uno', res = 'real';
    const B = () => BOARDS[board];
    const nb = () => res === 'real' ? B().bits : 3;
    seg(root, 'board', v => { const k = +iV.value / B().vref; board = v; iV.max = B().vref; iV.value = (k * B().vref).toFixed(2); upd(); });
    seg(root, 'res', v => { res = v; upd(); });
    iV.addEventListener('input', upd);
    function upd() {
      const b = B(), n = nb(), V = +iV.value, top = 2 ** n - 1;
      const code = Math.min(top, Math.floor(V / b.vref * 2 ** n));
      out(root, 'v', fmt(V, 2) + ' V');
      out(root, 'read', `${code} <span class="muted" style="font-size:14px">/ ${top}</span>`);
      out(root, 'bits', code.toString(2).padStart(n, '0').split('').map(c => `<span class="${c === '1' ? 'one' : ''}">${c}</span>`).join(''));
      const dig = V <= b.vil ? ['LOW', C.blue] : V >= b.vih ? ['HIGH', C.orange] : ['indefinido', C.muted];
      const d = out(root, 'dig', dig[0]); d.style.color = dig[1];
      out(root, 'step', `1 passo do ADC = ${fmt(b.vref / 2 ** n * 1000, 1)} mV<br><span class="muted">LOW ≤ ${fmt(b.vil, 2)} V · HIGH ≥ ${fmt(b.vih, 2)} V</span>`);
      draw(code);
    }
    function draw(code) {
      const { ctx, w, h } = plot, b = B(), n = nb(), top = 2 ** n - 1;
      const L = 62, R = 12, T = 12, Bm = 50, pw = w - L - R, ph = h - T - Bm;
      const X = v => L + v / b.vref * pw, Y = c => T + (1 - c / top) * ph;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.strokeStyle = '#2d2540'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
      ctx.setLineDash([4, 4]); ctx.strokeStyle = '#4a4060';
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(b.vref), Y(top)); ctx.stroke(); ctx.setLineDash([]);
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k <= top; k++) {
        const v0 = k * b.vref / 2 ** n, v1 = (k + 1) * b.vref / 2 ** n;
        if (!k) ctx.moveTo(X(v0), Y(k)); else ctx.lineTo(X(v0), Y(k));
        ctx.lineTo(X(Math.min(v1, b.vref)), Y(k));
      }
      ctx.stroke();
      const V = +iV.value, px = X(V), py = Y(code);
      ctx.strokeStyle = C.orange; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(px, T + ph); ctx.lineTo(px, py); ctx.lineTo(L, py); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.orange; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
      ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText(String(top), L - 6, T + 8); ctx.fillText('0', L - 6, T + ph);
      ctx.fillStyle = C.orange; ctx.fillText(String(code), L - 6, clamp(py + 4, T + 22, T + ph - 12));
      ctx.textAlign = 'center'; ctx.fillStyle = C.muted;
      ctx.fillText('0 V', L, T + ph + 14); ctx.fillText(fmtN(b.vref, 1) + ' V', L + pw - 8, T + ph + 14);
      // faixa de leitura digital
      const by = h - 22;
      const zone = (a, z, col) => { ctx.fillStyle = col; ctx.fillRect(X(a), by, X(z) - X(a), 10); };
      zone(0, b.vil, 'rgba(124,170,255,.55)'); zone(b.vil, b.vih, '#3d3352'); zone(b.vih, b.vref, 'rgba(255,145,72,.55)');
      ctx.fillStyle = C.text2; ctx.font = '10px IBM Plex Mono, monospace';
      ctx.fillText('LOW', X(b.vil / 2), by - 4); ctx.fillText('indefinido', X((b.vil + b.vih) / 2), by - 4); ctx.fillText('HIGH', X((b.vih + b.vref) / 2), by - 4);
      ctx.textAlign = 'right'; ctx.fillStyle = C.muted; ctx.fillText('digital', L - 6, by + 9);
      ctx.fillStyle = C.text; ctx.beginPath(); ctx.moveTo(px, by + 10); ctx.lineTo(px - 5, by + 18); ctx.lineTo(px + 5, by + 18); ctx.fill();
    }
    upd();
    return { resume: upd };
  };

  /* ======================================================
     8. UART · I²C · SPI — um byte no fio
     ====================================================== */
  SIMS.bus = root => {
    const wave = canvas2d($(root, '[data-c="wave"]'));
    const iCh = inp(root, 'ch');
    let proto = 'uart', slots = [], lines = [], p = 1, byte = 65;
    const GC = { ctl: C.orange, addr: C.blue, rw: C.yellow, ack: C.yellow, data: C.mint };
    const INFO = {
      uart: '<b>UART</b> · 2 fios (TX, RX) + GND<br>Assíncrona: não há clock; os dois lados combinam a velocidade (ex.: 9600 ou 115200 bps). Ponto a ponto. É o <code>Serial</code>.',
      i2c: '<b>I²C</b> · 2 fios (SDA dados, SCL clock) + GND<br>Vários dispositivos no mesmo par de fios, cada um com um endereço (aqui 0x3C, um display OLED). Quem recebe confirma com ACK.',
      spi: '<b>SPI</b> · 4 fios (SCK, MOSI, MISO, CS) + GND<br>Síncrona e rápida (vários MHz). Um pino CS por dispositivo escolhe com quem falar. Cartões SD e displays TFT.'
    };
    function build() {
      const ch = (iCh.value || 'A')[0];
      byte = ch.charCodeAt(0) > 255 ? 63 : ch.charCodeAt(0);
      const msb = v => [...Array(8)].map((_, i) => (v >> (7 - i)) & 1);
      slots = [];
      if (proto === 'uart') {
        lines = ['TX'];
        const idle = { lv: { TX: [1, 1] } };
        slots.push(idle, idle, { lab: 'S', sub: 'início', g: 'ctl', lv: { TX: [0, 0] } });
        for (let i = 0; i < 8; i++) { const b = (byte >> i) & 1; slots.push({ lab: String(b), sub: 'b' + i, g: 'data', lv: { TX: [b, b] } }); }
        slots.push({ lab: 'P', sub: 'fim', g: 'ctl', lv: { TX: [1, 1] } }, idle, idle);
      } else if (proto === 'i2c') {
        lines = ['SCL', 'SDA'];
        const idle = { lv: { SCL: [1, 1], SDA: [1, 1] } };
        const bit = (b, g, sub) => ({ lab: String(b), sub, g, lv: { SCL: [0, 1], SDA: [b, b] } });
        slots.push(idle, { lab: 'S', sub: 'início', g: 'ctl', lv: { SCL: [1, 1], SDA: [1, 0] } });
        msb(0x3C).slice(1).forEach((b, i) => slots.push(bit(b, 'addr', 'a' + (6 - i))));
        slots.push(bit(0, 'rw', 'W'), { ...bit(0, 'ack', 'ACK'), lab: 'A' });
        msb(byte).forEach((b, i) => slots.push(bit(b, 'data', 'b' + (7 - i))));
        slots.push({ ...bit(0, 'ack', 'ACK'), lab: 'A' }, { lab: 'P', sub: 'fim', g: 'ctl', lv: { SCL: [1, 1], SDA: [0, 1] } }, idle);
      } else {
        lines = ['CS', 'SCK', 'MOSI'];
        const idle = { lv: { CS: [1, 1], SCK: [0, 0], MOSI: [0, 0] } };
        slots.push(idle, { lab: 'CS↓', sub: 'seleciona', g: 'ctl', lv: { CS: [1, 0], SCK: [0, 0], MOSI: [0, 0] } });
        msb(byte).forEach((b, i) => slots.push({ lab: String(b), sub: 'b' + (7 - i), g: 'data', lv: { CS: [0, 0], SCK: [0, 1], MOSI: [b, b] } }));
        slots.push({ lab: 'CS↑', sub: 'libera', g: 'ctl', lv: { CS: [0, 1], SCK: [0, 0], MOSI: [0, 0] } }, idle);
      }
      out(root, 'info', INFO[proto]);
      const hex = '0x' + byte.toString(16).toUpperCase().padStart(2, '0');
      out(root, 'bits', `'${ch}' = ${byte} = ${hex} = <b>0b${byte.toString(2).padStart(8, '0')}</b><br>` +
        (proto === 'uart' ? '<span class="c-orange">UART envia primeiro o bit menos significativo (b0).</span>'
          : `<span class="c-orange">${proto === 'i2c' ? 'I²C' : 'SPI'} envia primeiro o bit mais significativo (b7).</span>` +
            (proto === 'i2c' ? '<br><span class="c-blue">endereço 0x3C</span> + <span class="c-yellow">W</span> + <span class="c-yellow">ACK</span> antes do dado' : '')));
      p = 0;
    }
    seg(root, 'p', v => { proto = v; build(); });
    act(root, 'send', build);
    iCh.addEventListener('input', build);
    function draw() {
      const { ctx, w, h } = wave;
      ctx.clearRect(0, 0, w, h);
      const L = 52, R = 10, labH = 44, n = slots.length, sw = (w - L - R) / n;
      const rh = (h - labH - 10) / lines.length;
      const xr = L + p * (w - L - R);
      ctx.font = '12px IBM Plex Mono, monospace';
      lines.forEach((ln, j) => {
        ctx.fillStyle = C.text2; ctx.textAlign = 'left';
        ctx.fillText(ln, 6, 10 + j * rh + rh / 2 + 4);
      });
      // separadores
      ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1;
      slots.forEach((s, i) => { if (s.g) { ctx.beginPath(); ctx.moveTo(L + i * sw, 6); ctx.lineTo(L + i * sw, h - labH + 34); ctx.stroke(); } });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, xr, h); ctx.clip();
      lines.forEach((ln, j) => {
        const yH = 10 + j * rh + 6, yL = 10 + (j + 1) * rh - 10;
        ctx.strokeStyle = ln === 'SCL' || ln === 'SCK' ? C.blue : ln === 'CS' ? C.yellow : C.mint;
        ctx.lineWidth = 2.2; ctx.beginPath();
        let prev = null;
        slots.forEach((s, i) => {
          s.lv[ln].forEach((v, k) => {
            const x0 = L + i * sw + k * sw / 2, y = v ? yH : yL;
            if (prev === null) ctx.moveTo(x0, y); else if (prev !== y) ctx.lineTo(x0, y);
            ctx.lineTo(x0 + sw / 2, y); prev = y;
          });
        });
        ctx.stroke();
      });
      ctx.textAlign = 'center';
      slots.forEach((s, i) => {
        if (!s.g) return;
        const cx = L + i * sw + sw / 2;
        ctx.fillStyle = GC[s.g]; ctx.font = '600 13px IBM Plex Mono, monospace';
        ctx.fillText(s.lab, cx, h - labH + 18);
        ctx.fillStyle = C.muted; ctx.font = '9.5px IBM Plex Mono, monospace';
        if (sw > 22 || i % 2 === 0) ctx.fillText(s.sub, cx, h - labH + 32);
      });
      ctx.restore();
      if (p < 1) { ctx.strokeStyle = C.orange; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(xr, 4); ctx.lineTo(xr, h - 6); ctx.stroke(); }
    }
    build();
    return {
      tick(dt) { if (p < 1) p = Math.min(1, p + dt / (slots.length * 0.2)); draw(); },
      resume() { p = 0; }
    };
  };

  /* ======================================================
     10. Sensor (LDR) → map() → LED (PWM) e servo
     ====================================================== */
  SIMS.sensact = root => {
    const svg = stageOf(root);
    const iL = inp(root, 'l');
    const codeEl = out(root, 'code');
    const pwm = canvas2d($(root, '[data-c="pwm"]'));
    const amb = S('rect', { x: 0, y: 0, width: 560, height: 250, rx: 14, fill: C.yellow, opacity: 0 }, svg);
    // sol
    const sun = S('g', {}, svg);
    S('circle', { cx: 70, cy: 46, r: 16, fill: C.yellow }, sun);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; S('line', { x1: 70 + Math.cos(a) * 22, y1: 46 + Math.sin(a) * 22, x2: 70 + Math.cos(a) * 30, y2: 46 + Math.sin(a) * 30, stroke: C.yellow, 'stroke-width': 3, 'stroke-linecap': 'round' }, sun); }
    // LDR
    S('circle', { cx: 70, cy: 128, r: 24, fill: '#e8c99b', stroke: '#b89a6a', 'stroke-width': 2 }, svg);
    S('path', { d: 'M56 118 h28 M56 125 h28 M56 132 h28 M56 139 h28 M84 118 v7 M56 125 v7 M84 132 v7', stroke: '#9b3b2a', 'stroke-width': 2, fill: 'none' }, svg);
    txt(svg, 70, 172, 'LDR', { size: 12, fill: C.text2, weight: 600 });
    // placa
    S('rect', { x: 180, y: 70, width: 150, height: 120, rx: 12, fill: '#11606b', stroke: '#0c4a53', 'stroke-width': 2 }, svg);
    txt(svg, 255, 136, 'UNO', { fill: 'rgba(255,255,255,.55)', size: 20, weight: 700 });
    txt(svg, 192, 132, 'A0', { fill: '#fff', size: 11, anchor: 'start' });
    txt(svg, 318, 100, 'D9', { fill: '#fff', size: 11, anchor: 'end' });
    txt(svg, 318, 172, 'D10', { fill: '#fff', size: 11, anchor: 'end' });
    wire(svg, 'M94 128 H180');
    wire(svg, 'M330 96 H370 V70 H392');
    wire(svg, 'M330 168 H405');
    const led = diode(svg, svg, 412, 70, 0, { led: true });
    wire(svg, 'M432 70 H470 V100');
    txt(svg, 476, 92, 'GND', { size: 9, anchor: 'start' });
    // servo
    S('rect', { x: 405, y: 150, width: 110, height: 46, rx: 8, fill: '#2b4fa8', stroke: '#4e74c0', 'stroke-width': 2 }, svg);
    txt(svg, 470, 214, 'servo · persiana', { size: 10.5, fill: C.text2 });
    S('path', { d: 'M395 150 A65 65 0 0 1 525 150', fill: 'none', stroke: '#3d3352', 'stroke-width': 1.5, 'stroke-dasharray': '3 4' }, svg);
    const arm = S('line', { x1: 460, y1: 150, x2: 410, y2: 150, stroke: C.text, 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
    S('circle', { cx: 460, cy: 150, r: 7, fill: C.text, stroke: '#2b4fa8', 'stroke-width': 2 }, svg);
    const tAng = txt(svg, 492, 184, '', { size: 13, fill: C.text, weight: 700 });
    let noise = 0, nt = 0, hlLine = 0, ht = 0, val = 0, brilho = 0, ang = 0;
    function compute() {
      const L = +iL.value;
      val = Math.round(clamp(30 + L * 9.6 + noise, 0, 1023));
      brilho = Math.trunc(val * (0 - 255) / 1023) + 255;
      ang = Math.trunc(val * 180 / 1023);
      out(root, 'l', L + ' %');
      amb.setAttribute('opacity', (L / 100 * 0.12).toFixed(3));
      sun.setAttribute('opacity', (0.15 + L / 100 * 0.85).toFixed(2));
      led.setOn(brilho / 255);
      const a = Math.PI - ang / 180 * Math.PI;
      arm.setAttribute('x2', (460 + Math.cos(a) * 50).toFixed(1));
      arm.setAttribute('y2', (150 - Math.sin(a) * 50).toFixed(1));
      tAng.textContent = ang + '°';
      renderCode(codeEl, [
        `int valor  = analogRead(A0);              // ${val}`,
        `int brilho = map(valor, 0, 1023, 255, 0); // ${brilho}`,
        `analogWrite(9, brilho);                   // ${Math.round(brilho / 255 * 100)} %`,
        `int angulo = map(valor, 0, 1023, 0, 180); // ${ang}°`,
        `servo.write(angulo);`
      ], hlLine);
      drawPwm();
    }
    function drawPwm() {
      const { ctx, w, h } = pwm, duty = brilho / 255, per = 46, L = 8;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2; ctx.beginPath();
      const yH = 14, yL = h - 10;
      ctx.moveTo(L, yL);
      for (let x = L; x < w - 6; x += per) {
        const on = per * duty;
        if (on > 0.5) { ctx.lineTo(x, yH); ctx.lineTo(Math.min(x + on, w - 6), yH); }
        ctx.lineTo(Math.min(x + on, w - 6), yL); ctx.lineTo(Math.min(x + per, w - 6), yL);
      }
      ctx.stroke();
      ctx.fillStyle = C.text2; ctx.font = '11px IBM Plex Mono, monospace'; ctx.textAlign = 'right';
      ctx.fillText(`D9 · PWM ${Math.round(duty * 100)} %`, w - 8, 11);
    }
    iL.addEventListener('input', compute);
    compute();
    return {
      tick(dt) {
        nt += dt; ht += dt;
        if (nt > 0.35) { nt = 0; noise = (Math.random() - 0.5) * 10; compute(); }
        if (ht > 0.7) { ht = 0; hlLine = (hlLine + 1) % 5; compute(); }
      }
    };
  };
})();
