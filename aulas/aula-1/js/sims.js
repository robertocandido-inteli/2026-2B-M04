/* ==========================================================
   Simulações interativas — uma função por data-sim.
   Cada função recebe o elemento raiz e pode devolver
   { tick(dt, t), pause(), resume() }.
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
  const out = (root, k, html) => { const e = $(root, `[data-o="${k}"]`); if (e && html !== undefined) e.innerHTML = html; return e; };
  const inp = (root, k) => $(root, `[data-in="${k}"]`);
  const act = (root, k, fn) => { const b = $(root, `[data-act="${k}"]`); if (b && fn) b.addEventListener('click', fn); return b; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const fmt = (x, d = 1) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtN = (x, max = 2) => x.toLocaleString('pt-BR', { maximumFractionDigits: max });
  function fmtOhm(r) {
    if (r >= 1e6) return fmtN(r / 1e6) + ' MΩ';
    if (r >= 1e3) return fmtN(r / 1e3) + ' kΩ';
    return fmtN(r) + ' Ω';
  }
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
  function node(g, x, y) { return S('circle', { cx: x, cy: y, r: 4.5, fill: C.wire }, g); }
  // resistor horizontal (80 px de largura)
  function resH(g, x, y, col = C.blue) {
    return S('path', { d: `M${x} ${y} l5 -10 l10 20 l10 -20 l10 20 l10 -20 l10 20 l10 -20 l10 20 l5 -10`, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  }
  // resistor vertical (h px de altura)
  function resV(g, x, y, h = 80, col = C.blue) {
    const n = 7, step = (h - 10) / n;
    let d = `M${x} ${y} l10 5`;
    for (let i = 0; i < n; i++) d += ` l${i % 2 ? 20 : -20} ${step}`;
    d += ` l10 5`;
    return S('path', { d, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  }
  // fonte (vertical): placa longa (+) em y, curta (−) em y+20
  function battery(g, x, y, label) {
    S('line', { x1: x - 22, y1: y, x2: x + 22, y2: y, stroke: C.text, 'stroke-width': 3 }, g);
    S('line', { x1: x - 12, y1: y + 20, x2: x + 12, y2: y + 20, stroke: C.text, 'stroke-width': 6 }, g);
    txt(g, x - 32, y + 5, '+', { fill: C.orange, size: 18, weight: 700 });
    txt(g, x - 32, y + 27, '−', { fill: C.blue, size: 18, weight: 700 });
    if (label !== undefined) return txt(g, x + 30, y + 15, label, { fill: C.orange, anchor: 'start', size: 14, weight: 600 });
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
      setRot(r) { grp.setAttribute('transform', `translate(${cx} ${cy}) rotate(${r})`); },
      setOn(b) { if (halo) halo.setAttribute('opacity', b); body.setAttribute('fill-opacity', 0.25 + 0.75 * b); }
    };
  }
  function gnd(g, x, y) {
    wire(g, `M${x - 18} ${y} H${x + 18} M${x - 11} ${y + 7} H${x + 11} M${x - 4} ${y + 14} H${x + 4}`, { w: 2.5 });
  }
  // pontos que percorrem um caminho (sentido convencional da corrente)
  function flow(svg, d, o = {}) {
    const p = S('path', { d, fill: 'none', stroke: 'none' }, svg);
    const L = p.getTotalLength();
    const g = S('g', { opacity: 0 }, svg);
    const n = o.n || Math.max(4, Math.round(L / 34));
    const dots = [];
    for (let i = 0; i < n; i++) dots.push(S('circle', { r: o.r || 3.6, fill: o.color || C.mint }, g));
    let off = 0, alpha = 0;
    const f = {
      speed: 0, on: false,
      tick(dt) {
        alpha = lerp(alpha, f.on ? 1 : 0, Math.min(1, dt * 10));
        g.setAttribute('opacity', alpha.toFixed(3));
        if (alpha < 0.01) return;
        off = (off + f.speed * dt) % L;
        for (let i = 0; i < n; i++) {
          const pt = p.getPointAtLength((off + (i * L) / n) % L);
          dots[i].setAttribute('cx', pt.x.toFixed(1));
          dots[i].setAttribute('cy', pt.y.toFixed(1));
        }
      }
    };
    f.tick(0);
    return f;
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
    box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      fn(b.dataset.v);
    }));
  }
  function pill(el, cls, html) { el.className = 'pill ' + (cls || ''); el.innerHTML = html; }

  /* ======================================================
     1. Capa — trilhas de circuito com pulsos
     ====================================================== */
  SIMS.traces = svg => {
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = [C.mint, C.orange, C.blue];
    // chip decorativo
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
    txt(svg, cx, cy + 12, 'µC', { fill: C.mint, size: 44, weight: 700 });
    return {};
  };

  /* ======================================================
     2. Entrada → processo → saída
     ====================================================== */
  SIMS.io = root => {
    const b = $(root, '.push');
    const on = () => root.classList.add('on');
    const off = () => root.classList.remove('on');
    b.addEventListener('pointerdown', e => { on(); try { b.setPointerCapture(e.pointerId); } catch (_) {} });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => b.addEventListener(ev, off));
    b.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); on(); } });
    b.addEventListener('keyup', off);
    b.addEventListener('blur', off);
    return { pause: off };
  };

  /* ======================================================
     3. Analogia hidráulica
     ====================================================== */
  SIMS.hydro = root => {
    const svg = stageOf(root);
    const path = 'M90 115 V45 H470 V185 H90 Z';
    wire(svg, path, { color: '#3b4f86', w: 30 });
    wire(svg, path, { color: '#1c2341', w: 20 });
    const top = S('path', { fill: '#3b4f86' }, svg);
    const bot = S('path', { fill: '#3b4f86' }, svg);
    const water = flow(svg, 'M90 115 V45 H470 V185 H90 V115', { n: 40, r: 3.2, color: C.blue });
    water.on = true;
    // bomba
    S('circle', { cx: 90, cy: 115, r: 32, fill: C.surf2, stroke: C.orange, 'stroke-width': 3 }, svg);
    const imp = S('g', {}, svg);
    for (let a = 0; a < 3; a++) S('path', { d: 'M0 0 Q10 -8 20 -2', stroke: C.orange, 'stroke-width': 4, fill: 'none', 'stroke-linecap': 'round', transform: `rotate(${a * 120})` }, imp);
    txt(svg, 150, 112, 'bomba', { fill: C.orange, anchor: 'start', size: 14, weight: 600 });
    txt(svg, 150, 130, '= fonte (tensão)', { anchor: 'start', size: 12 });
    txt(svg, 285, 18, 'estreitamento = resistência', { fill: C.blue, size: 13, weight: 600 });
    txt(svg, 380, 122, 'vazão = corrente', { fill: C.mint, size: 13, weight: 600 });
    S('path', { d: 'M366 140 l28 0 m-6 -6 l6 6 l-6 6', stroke: C.mint, 'stroke-width': 2, fill: 'none' }, svg);
    const iP = inp(root, 'p'), iR = inp(root, 'r');
    let ang = 0;
    function upd() {
      const p = +iP.value, r = +iR.value;
      const k = ((r - 1) / 9) * 8.5;
      top.setAttribute('d', `M228 30 L250 ${35 + k} L320 ${35 + k} L342 30 Z`);
      bot.setAttribute('d', `M228 60 L250 ${55 - k} L320 ${55 - k} L342 60 Z`);
      out(root, 'p', fmt(p, 1));
      out(root, 'r', fmt(r, 1));
      out(root, 'q', fmt(p / r, 2) + ' <span class="muted" style="font-size:14px">(unidades relativas)</span>');
      water.speed = (p / r) * 34;
    }
    iP.addEventListener('input', upd); iR.addEventListener('input', upd); upd();
    return {
      tick(dt) {
        water.tick(dt);
        ang = (ang + (+iP.value) * 70 * dt) % 360;
        imp.setAttribute('transform', `translate(90 115) rotate(${ang})`);
      }
    };
  };

  /* ======================================================
     4. Lei de Ohm
     ====================================================== */
  SIMS.ohm = root => {
    const svg = stageOf(root);
    wire(svg, 'M60 120 V50 H170 M250 50 H360 V108 M360 152 V210 H60 V140');
    const vLbl = battery(svg, 60, 120, '');
    resH(svg, 170, 50);
    S('circle', { cx: 360, cy: 130, r: 22, fill: C.surf2, stroke: C.mint, 'stroke-width': 3 }, svg);
    txt(svg, 360, 136, 'A', { fill: C.mint, size: 17, weight: 700 });
    const rLbl = txt(svg, 210, 30, '', { fill: C.blue, size: 15, weight: 600 });
    const iLbl = txt(svg, 325, 136, '', { fill: C.mint, anchor: 'end', size: 18, weight: 700 });
    txt(svg, 210, 240, 'pontos = sentido convencional da corrente', { size: 11 });
    const f = flow(svg, 'M60 120 V50 H360 V210 H60 V140', { n: 18 });
    const iV = inp(root, 'v'), iR = inp(root, 'r');
    const slide = root.closest('.slide');
    const flash = rule => { const li = slide.querySelector(`[data-rule="${rule}"]`); if (!li) return; li.classList.remove('flash'); void li.offsetWidth; li.classList.add('flash'); };
    function upd() {
      const v = +iV.value, r = +iR.value, i = v / r;
      vLbl.textContent = fmt(v, 1) + ' V';
      rLbl.textContent = r + ' Ω';
      iLbl.textContent = fmt(i * 1000, 1) + ' mA';
      out(root, 'v', fmt(v, 1) + ' V');
      out(root, 'r', r + ' Ω');
      out(root, 'calc', `I = V / R = ${fmt(v, 1)} / ${r} ≈ ${fmt(i, 3)} A<br>I ≈ <span class="big">${fmt(i * 1000, 1)} mA</span>` +
        (i > 0.04 ? `<br><span class="c-orange">⚠ Corrente alta: confira os limites dos componentes e da placa.</span>` : ''));
      f.on = i > 0;
      f.speed = Math.min(420, 900 * Math.sqrt(i));
    }
    iV.addEventListener('input', () => { upd(); flash('v'); });
    iR.addEventListener('input', () => { upd(); flash('r'); });
    act(root, 'ex', () => { iV.value = 5; iR.value = 220; upd(); });
    upd();
    return { tick: dt => f.tick(dt) };
  };

  /* ======================================================
     5. Circuito fechado × aberto
     ====================================================== */
  SIMS.loop = root => {
    const svg = stageOf(root);
    wire(svg, 'M60 120 V50 H170 M250 50 H360 V110 M360 150 V210 H240 M180 210 H60 V140');
    battery(svg, 60, 120, 'Fonte');
    resH(svg, 170, 50);
    txt(svg, 210, 30, 'Resistor', { fill: C.blue, weight: 600 });
    const led = diode(svg, svg, 360, 130, 90, { led: true });
    txt(svg, 392, 135, 'LED', { fill: C.red, anchor: 'start', weight: 600 });
    node(svg, 180, 210); node(svg, 240, 210);
    const lever = S('line', { x1: 180, y1: 210, x2: 240, y2: 210, stroke: C.mint, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    const swLbl = txt(svg, 210, 242, 'Chave', { fill: C.mint, weight: 600 });
    const f = flow(svg, 'M60 120 V50 H360 V210 H60 V140', { n: 18 });
    f.speed = 110;
    const hit = S('rect', { x: 165, y: 170, width: 90, height: 60, fill: 'transparent', style: 'cursor:pointer' }, svg);
    const btn = act(root, 'toggle');
    const st = out(root, 'state');
    let closed = true, ang = 0, b = 0;
    function set(c) {
      closed = c;
      btn.setAttribute('aria-pressed', String(c));
      btn.textContent = c ? 'Chave fechada' : 'Chave aberta';
      swLbl.textContent = c ? 'Chave fechada' : 'Chave aberta';
      if (c) pill(st, 'on', 'Caminho fechado · corrente circula');
      else pill(st, 'off', 'Circuito aberto · sem corrente');
    }
    btn.addEventListener('click', () => set(!closed));
    hit.addEventListener('click', () => set(!closed));
    set(true);
    return {
      tick(dt) {
        ang = lerp(ang, closed ? 0 : -30, Math.min(1, dt * 14));
        lever.setAttribute('transform', `rotate(${ang.toFixed(2)} 180 210)`);
        const flowing = closed && ang > -1;
        f.on = flowing; f.tick(dt);
        b = lerp(b, flowing ? 1 : 0, Math.min(1, dt * 10));
        led.setOn(b);
      }
    };
  };

  /* ======================================================
     7. Calculadora do resistor do LED
     ====================================================== */
  SIMS.ledcalc = root => {
    const svg = stageOf(root);
    const x = 115;
    const vsLbl = txt(svg, x, 22, '+5 V', { fill: C.orange, size: 15, weight: 700 });
    node(svg, x, 36);
    wire(svg, `M${x} 36 V70 M${x} 150 V180 M${x} 220 V280`);
    const res = resV(svg, x, 70, 80);
    const shortW = wire(svg, `M${x} 70 V150`, { color: C.orange });
    shortW.style.display = 'none';
    const rLbl = txt(svg, x + 22, 114, '220 Ω', { fill: C.blue, anchor: 'start', size: 14, weight: 600 });
    const led = diode(svg, svg, x, 200, 90, { led: true });
    const dead = S('path', { d: `M${x - 14} 186 l28 28 M${x + 14} 186 l-28 28`, stroke: C.text, 'stroke-width': 3, opacity: 0 }, svg);
    txt(svg, x + 30, 205, 'LED', { fill: C.red, anchor: 'start', weight: 600 });
    gnd(svg, x, 280);
    txt(svg, x + 34, 294, 'GND', { anchor: 'start', size: 12 });
    const smoke = [];
    for (let i = 0; i < 6; i++) smoke.push(S('circle', { cx: x, cy: 190, r: 6, fill: '#8a8399', opacity: 0 }, svg));
    const f = flow(svg, `M${x} 36 V280`, { n: 8 });
    const iVf = inp(root, 'vf'), iI = inp(root, 'i');
    const st = out(root, 'state');
    const bBurn = act(root, 'burn'), bFix = act(root, 'fix');
    let vs = 5, mode = 'ok', b = 0, target = 0, burnT = 0;
    const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
    const nextE12 = r => { for (let d = 1; d <= 1e5; d *= 10) for (const e of E12) if (e * d >= r - 1e-9) return e * d; return 1e6; };
    function upd() {
      const vf = +iVf.value, I = +iI.value / 1000;
      vsLbl.textContent = '+' + fmtN(vs, 1) + ' V';
      out(root, 'vs', fmtN(vs, 1) + ' V');
      out(root, 'vf', fmt(vf, 1) + ' V');
      out(root, 'i', fmt(I, 3) + ' A');
      if (mode === 'burnt') return;
      if (vs <= vf) {
        target = 0; f.on = false; rLbl.textContent = '—';
        pill(st, 'warn', 'LED apagado');
        out(root, 'calc', `A fonte (${fmtN(vs, 1)} V) não supera a queda do LED (${fmt(vf, 1)} V): o LED não acende.`);
        return;
      }
      const R = (vs - vf) / I, Rc = nextE12(R), Ireal = (vs - vf) / Rc;
      rLbl.textContent = fmtOhm(Rc);
      target = clamp(Ireal / 0.02, 0.15, 1);
      f.on = true; f.speed = 40 + Ireal * 5000;
      pill(st, 'on', `LED aceso · ${fmt(Ireal * 1000, 1)} mA`);
      out(root, 'calc', `R = (${fmtN(vs, 1)} − ${fmt(vf, 1)}) / ${fmt(I, 3)} ≈ <b>${Math.round(R)} Ω</b><br>` +
        `Comercial (série E12, próximo acima): <span class="big">${fmtOhm(Rc)}</span><br>` +
        `<span class="muted">Corrente real com ${fmtOhm(Rc)}: ${fmt(Ireal * 1000, 1)} mA</span>`);
    }
    seg(root, 'vs', v => { vs = +v; upd(); });
    iVf.addEventListener('input', upd); iI.addEventListener('input', upd);
    bBurn.addEventListener('click', () => {
      if (mode !== 'ok') return;
      mode = 'burning'; burnT = 0;
      res.style.display = 'none'; shortW.style.display = ''; rLbl.textContent = 'sem resistor';
      f.on = true; f.speed = 700;
      pill(st, 'warn', 'Corrente sem limite!');
      out(root, 'calc', 'Sem resistor, só a fonte e o próprio LED limitam a corrente: ela passa muito do valor seguro…');
    });
    bFix.addEventListener('click', () => {
      mode = 'ok'; res.style.display = ''; shortW.style.display = 'none';
      dead.setAttribute('opacity', 0); led.body.setAttribute('stroke', C.red); led.body.setAttribute('fill', C.red);
      bFix.hidden = true; bBurn.hidden = false; upd();
    });
    upd();
    return {
      tick(dt) {
        if (mode === 'burning') {
          burnT += dt;
          b = burnT < 0.7 ? 1 + Math.random() * 0.6 : 0;
          if (burnT >= 0.7) {
            mode = 'burnt'; f.on = false;
            dead.setAttribute('opacity', 1); led.body.setAttribute('stroke', '#6d6585'); led.body.setAttribute('fill', '#6d6585');
            pill(st, 'off', 'LED queimado!');
            out(root, 'calc', '<span class="c-red"><b>O LED queimou.</b></span> Sem resistor em série, nada limitou a corrente. Coloque o resistor e troque o LED.');
            bBurn.hidden = true; bFix.hidden = false;
            smoke.forEach((s, i) => { s.dataset.t = -i * 0.25; });
          }
        } else if (mode === 'ok') b = lerp(b, target, Math.min(1, dt * 8));
        else b = 0;
        led.setOn(Math.min(1, b));
        if (mode === 'burnt') smoke.forEach((s, i) => {
          let t = (+s.dataset.t || 0) + dt; if (t > 1.6) t -= 1.6; s.dataset.t = t;
          const k = clamp(t / 1.6, 0, 1);
          s.setAttribute('cy', 190 - k * 70); s.setAttribute('cx', x + Math.sin(t * 4 + i) * 10);
          s.setAttribute('r', 5 + k * 10); s.setAttribute('opacity', t > 0 ? (0.6 * (1 - k)).toFixed(2) : 0);
        });
        else smoke.forEach(s => s.setAttribute('opacity', 0));
        f.tick(dt);
      }
    };
  };

  /* ======================================================
     8. Polarização do LED
     ====================================================== */
  SIMS.polarity = root => {
    const svg = stageOf(root);
    wire(svg, 'M60 120 V50 H170 M250 50 H360 V110 M360 150 V210 H60 V140');
    battery(svg, 60, 120, '5 V');
    resH(svg, 170, 50);
    txt(svg, 210, 30, '220 Ω', { fill: C.blue, weight: 600 });
    const led = diode(svg, svg, 360, 130, 90, { led: true });
    const tA = txt(svg, 384, 108, 'A (+)', { fill: C.orange, anchor: 'start', size: 13, weight: 700 });
    const tK = txt(svg, 384, 164, 'K (−)', { fill: C.blue, anchor: 'start', size: 13, weight: 700 });
    const f = flow(svg, 'M60 120 V50 H360 V210 H60 V140', { n: 18 });
    f.speed = 110;
    const st = out(root, 'state');
    let direct = true, rot = 90, b = 0;
    function set(d) {
      direct = d;
      tA.setAttribute('y', d ? 108 : 164); tK.setAttribute('y', d ? 164 : 108);
      if (d) { pill(st, 'on', 'Polarização direta · acende'); out(root, 'hint', 'Ânodo do lado positivo: o LED conduz.'); }
      else { pill(st, 'off', 'Invertido · não acende'); out(root, 'hint', 'Cátodo do lado positivo: o LED bloqueia.'); }
    }
    act(root, 'flip', () => set(!direct));
    set(true);
    return {
      tick(dt) {
        rot = lerp(rot, direct ? 90 : 270, Math.min(1, dt * 9));
        led.setRot(rot);
        const conducting = direct && Math.abs(rot - 90) < 2;
        f.on = conducting; f.tick(dt);
        b = lerp(b, conducting ? 1 : 0, Math.min(1, dt * 10));
        led.setOn(b);
      }
    };
  };

  /* ======================================================
     9. Código de cores
     ====================================================== */
  SIMS.rescode = root => {
    const svg = stageOf(root);
    const COL = [['preto', '#1b1b1b'], ['marrom', '#7b4a2a'], ['vermelho', '#e53935'], ['laranja', '#fb8c00'], ['amarelo', '#fdd835'], ['verde', '#43a047'], ['azul', '#1e88e5'], ['violeta', '#8e24aa'], ['cinza', '#9e9e9e'], ['branco', '#f5f5f5']];
    const GOLD = ['ouro', '#c9a227'], SILVER = ['prata', '#bdbdbd'];
    const MULT = COL.slice(0, 7).map((c, i) => ({ c, m: Math.pow(10, i), t: '×' + fmtN(Math.pow(10, i)) })).concat([{ c: GOLD, m: 0.1, t: '×0,1' }, { c: SILVER, m: 0.01, t: '×0,01' }]);
    const TOL = [{ c: COL[1], t: '±1%' }, { c: COL[2], t: '±2%' }, { c: GOLD, t: '±5%' }, { c: SILVER, t: '±10%' }];
    const st = { a: 2, b: 2, m: 1, t: 2 };
    S('line', { x1: 8, y1: 60, x2: 412, y2: 60, stroke: '#b9b9c4', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
    S('path', { d: 'M90 34 Q90 22 112 22 Q140 22 150 32 H270 Q280 22 308 22 Q330 22 330 34 V86 Q330 98 308 98 Q280 98 270 88 H150 Q140 98 112 98 Q90 98 90 86 Z', fill: '#e8c99b', stroke: '#c9a77a', 'stroke-width': 2 }, svg);
    const bx = [[118, 22, 76], [160, 32, 56], [196, 32, 56], [292, 22, 76]];
    const bands = bx.map(([x, y, h], i) => {
      const r = S('rect', { x, y, width: 16, height: h, fill: '#000', style: 'cursor:pointer' }, svg);
      r.addEventListener('click', () => selRow(i));
      return r;
    });
    const rowsBox = out(root, 'rows');
    const defs = [
      { k: 'a', lbl: '1ª faixa · dígito', items: COL.map((c, i) => ({ c, v: i, t: String(i) })) },
      { k: 'b', lbl: '2ª faixa · dígito', items: COL.map((c, i) => ({ c, v: i, t: String(i) })) },
      { k: 'm', lbl: '3ª faixa · multiplicador', items: MULT.map((x, i) => ({ c: x.c, v: i, t: x.t })) },
      { k: 't', lbl: '4ª faixa · tolerância', items: TOL.map((x, i) => ({ c: x.c, v: i, t: x.t })) }
    ];
    const rows = defs.map((d, ri) => {
      const row = document.createElement('div'); row.className = 'band-row';
      row.innerHTML = `<span class="lbl">${d.lbl}</span><div class="chips"></div>`;
      const chips = row.querySelector('.chips');
      d.items.forEach(it => {
        const b = document.createElement('button');
        b.className = 'chip'; b.style.background = it.c[1];
        b.title = `${it.c[0]} (${it.t})`; b.setAttribute('aria-label', `${d.lbl}: ${it.c[0]} ${it.t}`);
        b.addEventListener('click', () => { st[d.k] = it.v; selRow(ri); upd(); });
        b.dataset.v = it.v;
        chips.appendChild(b);
      });
      rowsBox.appendChild(row);
      return row;
    });
    function selRow(i) { rows.forEach((r, j) => r.classList.toggle('sel', i === j)); }
    function upd() {
      const cA = COL[st.a], cB = COL[st.b], M = MULT[st.m], T = TOL[st.t];
      [cA, cB, M.c, T.c].forEach((c, i) => bands[i].setAttribute('fill', c[1]));
      rows.forEach((r, i) => r.querySelectorAll('.chip').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.v === st[defs[i].k]))));
      const base = st.a * 10 + st.b, val = base * M.m;
      out(root, 'val', `${fmtOhm(Math.round(val * 100) / 100)} <span style="font-size:16px" class="muted">${T.t}</span>`);
      out(root, 'expl', `${cA[0]} (${st.a}) · ${cB[0]} (${st.b}) · ${M.c[0]} (${M.t}) · ${T.c[0]} (${T.t})<br><span class="muted">${st.a}${st.b} ${M.t} = ${fmtN(val)} Ω</span>`);
    }
    selRow(0); upd();
    return {};
  };

  /* ======================================================
     10. Potenciômetro
     ====================================================== */
  SIMS.pot = root => {
    const svg = stageOf(root);
    const cx = 105, cy = 140, R = 66;
    const pol = (a, r) => [cx + r * Math.sin(a * Math.PI / 180), cy - r * Math.cos(a * Math.PI / 180)];
    const arc = (a0, a1, r) => { const [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    S('path', { d: arc(-135, 135, R + 12), stroke: C.surf3, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, svg);
    const arcOn = S('path', { stroke: C.mint, 'stroke-width': 6, fill: 'none', 'stroke-linecap': 'round' }, svg);
    for (let a = -135; a <= 135; a += 27) { const [x0, y0] = pol(a, R + 20), [x1, y1] = pol(a, R + 26); S('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: C.muted, 'stroke-width': 2 }, svg); }
    txt(svg, pol(-135, R + 34)[0] - 6, pol(-135, R + 34)[1] + 10, '0', { size: 12 });
    txt(svg, pol(135, R + 34)[0] + 6, pol(135, R + 34)[1] + 10, 'máx', { size: 12 });
    const knob = S('g', { style: 'cursor:grab' }, svg);
    S('circle', { cx, cy, r: R, fill: C.surf2, stroke: C.border, 'stroke-width': 3 }, knob);
    S('circle', { cx, cy, r: R - 14, fill: '#2b2339' }, knob);
    const ptr = S('line', { x1: cx, y1: cy - 12, x2: cx, y2: cy - R + 8, stroke: C.mint, 'stroke-width': 6, 'stroke-linecap': 'round' }, knob);
    // esquema
    const X = 300, y0 = 60, H = 160;
    txt(svg, X, 26, '5 V', { fill: C.orange, size: 15, weight: 700 });
    node(svg, X, 38);
    wire(svg, `M${X} 38 V${y0} M${X} ${y0 + H} V236`);
    let d = `M${X} ${y0} l10 5`;
    const n = 11, stp = (H - 10) / n;
    for (let i = 0; i < n; i++) d += ` l${i % 2 ? 20 : -20} ${stp}`;
    d += ' l10 5';
    S('path', { d, fill: 'none', stroke: C.blue, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    gnd(svg, X, 236);
    txt(svg, X + 28, 250, 'GND', { anchor: 'start', size: 12 });
    const wiper = S('g', {}, svg);
    S('path', { d: `M${X + 16} 0 l12 -7 v14 Z`, fill: C.mint }, wiper);
    S('path', { d: `M${X + 28} 0 H${X + 70}`, stroke: C.mint, 'stroke-width': 3 }, wiper);
    S('circle', { cx: X + 72, cy: 0, r: 4.5, fill: C.mint }, wiper);
    const wl = txt(wiper, X + 82, -6, 'A0', { fill: C.mint, anchor: 'start', size: 14, weight: 700 });
    const wv = txt(wiper, X + 82, 12, '', { fill: C.text2, anchor: 'start', size: 13 });
    txt(svg, X - 26, y0 + H / 2, 'cursor', { anchor: 'end', size: 12, fill: C.muted });
    const range = inp(root, 'pos');
    let pos = 0.5;
    function set(p) {
      pos = clamp(p, 0, 1);
      const a = -135 + 270 * pos;
      ptr.setAttribute('transform', `rotate(${a} ${cx} ${cy})`);
      arcOn.setAttribute('d', pos > 0.002 ? arc(-135, a, R + 12) : '');
      const y = y0 + (1 - pos) * H;
      wiper.setAttribute('transform', `translate(0 ${y.toFixed(1)})`);
      const v = 5 * pos, val = Math.round(pos * 1023);
      wv.textContent = fmt(v, 2) + ' V';
      range.value = Math.round(pos * 1000);
      out(root, 'calc', `V<sub>cursor</sub> = 5 V × ${Math.round(pos * 100)}% = <b>${fmt(v, 2)} V</b><br>analogRead(A0) → <span class="big">${val}</span> <span class="muted">(0 a 1023)</span>`);
    }
    range.addEventListener('input', () => set(range.value / 1000));
    let drag = false;
    const angleAt = e => {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return Math.atan2(p.x - cx, -(p.y - cy)) * 180 / Math.PI;
    };
    knob.addEventListener('pointerdown', e => { drag = true; knob.setPointerCapture(e.pointerId); knob.style.cursor = 'grabbing'; e.preventDefault(); });
    knob.addEventListener('pointermove', e => {
      if (!drag) return;
      const a = angleAt(e);
      if (a < -135 && a > -180) return set(0);
      if (a > 135) return set(1);
      set((a + 135) / 270);
    });
    knob.addEventListener('pointerup', () => { drag = false; knob.style.cursor = 'grab'; });
    knob.style.touchAction = 'none';
    knob.addEventListener('wheel', e => { e.preventDefault(); set(pos - Math.sign(e.deltaY) * 0.03); }, { passive: false });
    set(0.5);
    return {};
  };

  /* ======================================================
     11. Circuito RC
     ====================================================== */
  SIMS.rc = root => {
    const cv = canvas2d($(root, '[data-c="plot"]'));
    const iR = inp(root, 'r'), iC = inp(root, 'c');
    const st = out(root, 'state');
    const TMAX = 10, VMAX = 5.5, VS = 5;
    let v = 0, v0 = 0, t = 0, mode = 'charge', trace = [];
    const tau = () => (+iR.value * 1e3) * (+iC.value * 1e-6);
    function restart(m) { mode = m || mode; v0 = v; t = 0; trace = [[0, v]]; }
    function upd() {
      out(root, 'r', iR.value + ' kΩ');
      out(root, 'c', iC.value + ' µF');
      out(root, 'tau', `τ = R × C = ${iR.value} kΩ × ${iC.value} µF = <b class="c-mint">${fmt(tau(), 2)} s</b>`);
    }
    iR.addEventListener('input', () => { upd(); restart(); });
    iC.addEventListener('input', () => { upd(); restart(); });
    act(root, 'charge', () => restart('charge'));
    act(root, 'discharge', () => restart('discharge'));
    upd(); restart('charge');
    function draw() {
      const { ctx, w, h } = cv;
      const L = 44, Rm = 12, T = 14, B = 28;
      const X = s => L + (s / TMAX) * (w - L - Rm), Y = u => T + (1 - u / VMAX) * (h - T - B);
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = C.muted; ctx.strokeStyle = '#2d2540'; ctx.lineWidth = 1;
      for (let s = 0; s <= TMAX; s += 2) { ctx.beginPath(); ctx.moveTo(X(s), T); ctx.lineTo(X(s), h - B); ctx.stroke(); ctx.textAlign = 'center'; ctx.fillText(s + ' s', X(s), h - 10); }
      for (let u = 0; u <= 5; u++) { ctx.beginPath(); ctx.moveTo(L, Y(u)); ctx.lineTo(w - Rm, Y(u)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(u + ' V', L - 6, Y(u) + 4); }
      const tt = tau(), target = mode === 'charge' ? VS : 0;
      // curva teórica
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(222,221,230,.35)'; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const s = (i / 200) * TMAX; const u = target + (v0 - target) * Math.exp(-s / tt); i ? ctx.lineTo(X(s), Y(u)) : ctx.moveTo(X(s), Y(u)); }
      ctx.stroke();
      // marcação τ
      if (tt <= TMAX) {
        const u = target + (v0 - target) * Math.exp(-1);
        ctx.strokeStyle = 'rgba(255,145,72,.7)'; ctx.beginPath(); ctx.moveTo(X(tt), h - B); ctx.lineTo(X(tt), Y(u)); ctx.lineTo(L, Y(u)); ctx.stroke();
        ctx.fillStyle = C.orange; ctx.textAlign = 'left'; ctx.fillText(`t = τ → ${fmt(u, 2)} V (${mode === 'charge' ? '63%' : '37%'})`, Math.min(X(tt) + 6, w - 170), Y(u) - 6);
      }
      ctx.setLineDash([]);
      // traço real
      ctx.strokeStyle = mode === 'charge' ? C.mint : C.blue; ctx.lineWidth = 3; ctx.beginPath();
      trace.forEach(([s, u], i) => i ? ctx.lineTo(X(s), Y(u)) : ctx.moveTo(X(s), Y(u)));
      ctx.stroke();
      const last = trace[trace.length - 1];
      if (last) { ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(X(last[0]), Y(last[1]), 5, 0, 7); ctx.fill(); }
      ctx.lineWidth = 1;
    }
    return {
      tick(dt) {
        t += dt;
        const target = mode === 'charge' ? VS : 0;
        v = target + (v0 - target) * Math.exp(-t / tau());
        if (t <= TMAX) trace.push([t, v]);
        const pct = Math.round((v / VS) * 100);
        pill(st, mode === 'charge' ? 'on' : '', `Vc = ${fmt(v, 2)} V · ${mode === 'charge' ? 'carregando' : 'descarregando'} (${pct}%)`);
        draw();
      }
    };
  };

  /* ======================================================
     12. Diodo — curva I × V
     ====================================================== */
  SIMS.diode = root => {
    const cv = canvas2d($(root, '[data-c="plot"]'));
    const iV = inp(root, 'v');
    const st = out(root, 'state');
    const VMIN = -6, VMAXX = 1, IMIN = -25, IMAX = 50, VBR = -5;
    const I = v => v >= 0 ? 5e-7 * (Math.exp(v / 0.035) - 1) : (v > VBR ? -0.002 * (1 - Math.exp(v / 0.2)) : -(VBR - v) * 60);
    function draw() {
      const { ctx, w, h } = cv;
      const L = 40, R = 12, T = 12, B = 28;
      const split = L + (w - L - R) * 0.42;
      const X = v => v < 0 ? L + (v - VMIN) / -VMIN * (split - L) : split + (v / VMAXX) * (w - R - split);
      const Y = i => T + (1 - (clamp(i, IMIN, IMAX) - IMIN) / (IMAX - IMIN)) * (h - T - B);
      ctx.clearRect(0, 0, w, h);
      // regiões
      ctx.fillStyle = 'rgba(255,93,93,.08)'; ctx.fillRect(L, T, X(VBR) - L, h - T - B);
      ctx.fillStyle = 'rgba(124,170,255,.07)'; ctx.fillRect(X(VBR), T, split - X(VBR), h - T - B);
      ctx.fillStyle = 'rgba(128,230,198,.08)'; ctx.fillRect(X(0.55), T, w - R - X(0.55), h - T - B);
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.textAlign = 'center';
      ctx.fillStyle = C.red; ctx.fillText('ruptura', (L + X(VBR)) / 2, T + 14);
      ctx.fillStyle = C.blue; ctx.fillText('reversa: bloqueia', (X(VBR) + split) / 2, T + 14);
      ctx.fillStyle = C.mint; ctx.fillText('conduz', (X(0.55) + w - R) / 2, T + 14);
      // eixos
      ctx.strokeStyle = '#3a3150'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(w - R, Y(0)); ctx.moveTo(split, T); ctx.lineTo(split, h - B); ctx.stroke();
      ctx.fillStyle = C.muted;
      [-6, -5, -4, -3, -2, -1, 0, 0.5, 1].forEach(v => { ctx.fillText(fmtN(v, 1), X(v), h - 10); ctx.beginPath(); ctx.moveTo(X(v), h - B); ctx.lineTo(X(v), h - B + 4); ctx.stroke(); });
      ctx.textAlign = 'right';
      [-20, 0, 20, 40].forEach(i => ctx.fillText(i + ' mA', L - 4, Y(i) + 4));
      ctx.textAlign = 'left'; ctx.fillText('V', w - R - 8, Y(0) - 6);
      // curva
      ctx.strokeStyle = C.text2; ctx.lineWidth = 2.5; ctx.beginPath();
      for (let k = 0; k <= 500; k++) { const v = VMIN + (k / 500) * (VMAXX - VMIN); const p = [X(v), Y(I(v))]; k ? ctx.lineTo(...p) : ctx.moveTo(...p); }
      ctx.stroke();
      // ponto
      const v = +iV.value, i = I(v);
      const col = v <= VBR ? C.red : v >= 0.55 ? C.mint : v >= 0 ? C.orange : C.blue;
      ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X(v), Y(0)); ctx.lineTo(X(v), Y(i)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(v), Y(i), 7, 0, 7); ctx.fill();
      ctx.lineWidth = 1;
    }
    function upd() {
      const v = +iV.value, i = I(v);
      out(root, 'v', `${fmt(v, 2)} V · I ≈ ${fmt(i, 1)} mA`);
      if (v <= VBR) pill(st, 'off', 'Ruptura: limite excedido!');
      else if (v < 0) pill(st, '', 'Reversa: bloqueia');
      else if (v < 0.55) pill(st, 'warn', 'Direta, abaixo de ~0,6 V: quase não conduz');
      else pill(st, 'on', 'Direta: conduz');
      draw();
    }
    iV.addEventListener('input', upd);
    upd();
    new ResizeObserver(() => draw()).observe($(root, 'canvas'));
    return { redraw: draw };
  };

  /* ======================================================
     13. Transistor como chave
     ====================================================== */
  SIMS.transistor = root => {
    const svg = stageOf(root);
    txt(svg, 360, 20, '+12 V · fonte da carga', { fill: C.orange, size: 13, weight: 700 });
    node(svg, 360, 32);
    wire(svg, 'M360 32 V64 M360 120 V158 M360 46 H440 V72 M440 112 V140 H360 M110 190 H170 M250 190 H280 M360 270 V280');
    S('circle', { cx: 360, cy: 92, r: 28, fill: C.surf2, stroke: C.orange, 'stroke-width': 3 }, svg);
    const rotor = S('g', {}, svg);
    S('path', { d: 'M-17 0 H17 M0 -17 V17', stroke: C.orange, 'stroke-width': 3, 'stroke-linecap': 'round' }, rotor);
    S('circle', { r: 5, fill: C.orange }, rotor);
    txt(svg, 398, 97, 'M', { fill: C.orange, size: 15, weight: 700, anchor: 'start' });
    diode(svg, svg, 440, 92, -90, { color: C.blue });
    txt(svg, 456, 96, 'flyback', { fill: C.blue, anchor: 'start', size: 11 });
    // Arduino
    S('rect', { x: 14, y: 166, width: 96, height: 48, rx: 8, fill: C.surf2, stroke: C.mint, 'stroke-width': 2 }, svg);
    txt(svg, 62, 186, 'Arduino', { fill: C.text2, size: 12, weight: 600 });
    txt(svg, 62, 204, 'pino D9', { fill: C.mint, size: 12, weight: 600 });
    resH(svg, 170, 190, C.blue);
    const rTxt = txt(svg, 210, 172, '', { fill: C.blue, size: 11 });
    // BJT
    const bjt = S('g', {}, svg);
    S('circle', { cx: 352, cy: 190, r: 30, fill: 'none', stroke: C.border, 'stroke-width': 2 }, bjt);
    wire(bjt, 'M280 190 H338 M338 180 L362 164 V158 M338 200 L362 216 V270', { color: C.text2 });
    S('line', { x1: 338, y1: 172, x2: 338, y2: 208, stroke: C.text2, 'stroke-width': 5 }, bjt);
    S('path', { d: 'M362 216 L350 214 L356 205 Z', fill: C.text2 }, bjt);
    txt(bjt, 326, 182, 'B', { fill: C.mint, size: 12, weight: 700 });
    txt(bjt, 378, 170, 'C', { fill: C.orange, size: 12, weight: 700 });
    txt(bjt, 378, 220, 'E', { fill: C.blue, size: 12, weight: 700 });
    // MOSFET (canal N)
    const mos = S('g', {}, svg);
    S('circle', { cx: 350, cy: 190, r: 30, fill: 'none', stroke: C.border, 'stroke-width': 2 }, mos);
    wire(mos, 'M280 190 H332 M342 175 H362 V158 M342 205 H362 V270 M342 190 H362 V205', { color: C.text2 });
    S('line', { x1: 332, y1: 172, x2: 332, y2: 208, stroke: C.text2, 'stroke-width': 3 }, mos);
    [[168, 182], [185, 195], [200, 212]].forEach(([a, b]) => S('line', { x1: 342, y1: a, x2: 342, y2: b, stroke: C.text2, 'stroke-width': 4 }, mos));
    S('path', { d: 'M343 190 L352 185 V195 Z', fill: C.text2 }, mos);
    txt(mos, 322, 182, 'G', { fill: C.mint, size: 12, weight: 700 });
    txt(mos, 378, 170, 'D', { fill: C.orange, size: 12, weight: 700 });
    txt(mos, 378, 220, 'S', { fill: C.blue, size: 12, weight: 700 });
    gnd(svg, 360, 280);
    wire(svg, 'M62 214 V280 H342', { dash: '6 5' });
    txt(svg, 200, 300, 'GND comum', { size: 11 });
    const fLoad = flow(svg, 'M360 32 V270', { n: 10, r: 4.2, color: C.orange });
    const fCtl = flow(svg, 'M110 190 H336', { n: 6, r: 2.6, color: C.mint });
    fCtl.speed = 60;
    const iD = inp(root, 'd');
    let type = 'bjt', ang = 0;
    function upd() {
      const d = +iD.value;
      bjt.style.display = type === 'bjt' ? '' : 'none';
      mos.style.display = type === 'mos' ? '' : 'none';
      rTxt.textContent = type === 'bjt' ? 'resistor de base' : 'resistor de gate';
      out(root, 'd', `${d}% · analogWrite(9, ${Math.round(d * 2.55)})`);
      fLoad.on = d > 0; fCtl.on = d > 0;
      fLoad.speed = 50 + 2.6 * d;
      out(root, 'calc', (type === 'bjt'
        ? '<b class="c-mint">BJT</b>: uma pequena corrente na <b>base</b> controla a condução entre <b>coletor</b> e <b>emissor</b>.'
        : '<b class="c-mint">MOSFET</b>: a <b>tensão no gate</b> controla o canal entre <b>drain</b> e <b>source</b>.') +
        `<br><span class="muted">${d === 0 ? 'Sinal em LOW: transistor cortado, motor parado.' : 'Pino fornece só o sinal; a corrente do motor vem da fonte de 12 V.'}</span>`);
    }
    seg(root, 'type', v => { type = v; upd(); });
    iD.addEventListener('input', upd);
    upd();
    return {
      tick(dt) {
        ang = (ang + (+iD.value) * 9 * dt) % 360;
        rotor.setAttribute('transform', `translate(360 92) rotate(${ang})`);
        fLoad.tick(dt); fCtl.tick(dt);
      }
    };
  };

  /* ======================================================
     14. Relé
     ====================================================== */
  SIMS.relay = root => {
    const svg = stageOf(root);
    // controle
    S('rect', { x: 40, y: 22, width: 110, height: 38, rx: 8, fill: C.surf2, stroke: C.mint, 'stroke-width': 2 }, svg);
    txt(svg, 95, 46, 'D7 + driver', { fill: C.mint, size: 12, weight: 600 });
    wire(svg, 'M95 60 V100 M95 190 V250 M95 80 H160 V110 M160 150 V215 H95');
    const field = [S('ellipse', { cx: 95, cy: 145, rx: 42, ry: 60, fill: 'none', stroke: C.orange, 'stroke-width': 1.5, 'stroke-dasharray': '5 6', opacity: 0 }, svg),
      S('ellipse', { cx: 95, cy: 145, rx: 54, ry: 74, fill: 'none', stroke: C.orange, 'stroke-width': 1.5, 'stroke-dasharray': '5 6', opacity: 0 }, svg)];
    const coil = S('rect', { x: 70, y: 100, width: 50, height: 90, rx: 6, fill: C.surf2, stroke: C.orange, 'stroke-width': 3 }, svg);
    S('path', { d: 'M74 112 L116 124 M74 128 L116 140 M74 144 L116 156 M74 160 L116 172 M74 176 L116 186', stroke: C.orange, 'stroke-width': 2 }, svg);
    txt(svg, 62, 150, 'bobina', { fill: C.orange, size: 12, anchor: 'end' });
    diode(svg, svg, 160, 130, -90, { color: C.blue });
    txt(svg, 174, 134, 'flyback', { fill: C.blue, anchor: 'start', size: 11 });
    gnd(svg, 95, 250);
    S('line', { x1: 228, y1: 18, x2: 228, y2: 268, stroke: C.border, 'stroke-width': 2, 'stroke-dasharray': '4 6' }, svg);
    txt(svg, 110, 284, 'circuito de controle', { size: 11 });
    txt(svg, 390, 284, 'circuito da carga', { size: 11 });
    // carga
    wire(svg, 'M270 130 V70 H310 V150 M270 150 V250 H510 V120 M376 120 H452 M488 120 H510 M376 180 H452 M488 180 H510');
    battery(svg, 270, 130, '');
    node(svg, 310, 150); node(svg, 376, 120); node(svg, 376, 180);
    txt(svg, 300, 172, 'COM', { fill: C.mint, anchor: 'end', size: 12, weight: 700 });
    txt(svg, 376, 106, 'NF', { fill: C.blue, size: 12, weight: 700 });
    txt(svg, 376, 202, 'NA', { fill: C.orange, size: 12, weight: 700 });
    const lamp = (y, lbl) => {
      const h = S('circle', { cx: 470, cy: y, r: 40, fill: glow(svg, C.yellow), opacity: 0 }, svg);
      S('circle', { cx: 470, cy: y, r: 18, fill: C.surf2, stroke: C.yellow, 'stroke-width': 2.5 }, svg);
      S('path', { d: `M457 ${y - 13} l26 26 M483 ${y - 13} l-26 26`, stroke: C.yellow, 'stroke-width': 2 }, svg);
      txt(svg, 470, y < 150 ? y - 26 : y + 34, lbl, { size: 11 });
      return h;
    };
    const l1 = lamp(120, 'lâmpada NF'), l2 = lamp(180, 'lâmpada NA');
    const arm = S('line', { x1: 310, y1: 150, x2: 373, y2: 120, stroke: C.mint, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
    const fNF = flow(svg, 'M270 130 V70 H310 V150 L376 120 H510 V250 H270 V150', { n: 16, color: C.yellow });
    const fNA = flow(svg, 'M270 130 V70 H310 V150 L376 180 H510 V250 H270 V150', { n: 16, color: C.yellow });
    const fCoil = flow(svg, 'M95 60 V250', { n: 6, r: 2.8, color: C.mint });
    fNF.speed = fNA.speed = 100; fCoil.speed = 60;
    const btn = act(root, 'toggle');
    const st = out(root, 'state');
    let on = false, ang = -25.4, b1 = 0, b2 = 0, dash = 0;
    function set(v) {
      on = v;
      btn.setAttribute('aria-pressed', String(v));
      btn.textContent = v ? 'Desenergizar bobina' : 'Energizar bobina';
      pill(st, v ? 'warn' : '', v ? 'Bobina energizada · COM → NA' : 'Bobina desligada · COM → NF');
    }
    btn.addEventListener('click', () => set(!on));
    set(false);
    return {
      tick(dt) {
        ang = lerp(ang, on ? 25.4 : -25.4, Math.min(1, dt * 16));
        const r = ang * Math.PI / 180;
        arm.setAttribute('x2', (310 + 70 * Math.cos(r)).toFixed(1));
        arm.setAttribute('y2', (150 + 70 * Math.sin(r)).toFixed(1));
        const atNF = ang < -24, atNA = ang > 24;
        fNF.on = atNF; fNA.on = atNA; fCoil.on = on;
        b1 = lerp(b1, atNF ? 1 : 0, Math.min(1, dt * 12)); b2 = lerp(b2, atNA ? 1 : 0, Math.min(1, dt * 12));
        l1.setAttribute('opacity', b1.toFixed(2)); l2.setAttribute('opacity', b2.toFixed(2));
        dash = (dash + dt * 20) % 22;
        field.forEach(f => { f.setAttribute('opacity', on ? 0.8 : 0); f.setAttribute('stroke-dashoffset', -dash); });
        coil.setAttribute('fill', on ? '#4a3326' : C.surf2);
        fNF.tick(dt); fNA.tick(dt); fCoil.tick(dt);
      }
    };
  };

  /* ======================================================
     16. Blink
     ====================================================== */
  SIMS.blink = root => {
    const codeEl = out(root, 'code');
    const iD = inp(root, 'd');
    const K = s => `<span class="tok-k">${s}</span>`, F = s => `<span class="tok-f">${s}</span>`, N = s => `<span class="tok-n">${s}</span>`;
    const lines = () => {
      const d = iD.value;
      return [
        `${K('void')} ${F('setup')}() {`,
        `  ${F('pinMode')}(${N(13)}, ${K('OUTPUT')});`,
        `}`,
        `${K('void')} ${F('loop')}() {`,
        `  ${F('digitalWrite')}(${N(13)}, ${K('HIGH')});`,
        `  ${F('delay')}(${N(d)});`,
        `  ${F('digitalWrite')}(${N(13)}, ${K('LOW')});`,
        `  ${F('delay')}(${N(d)});`,
        `}`
      ];
    };
    function renderCode() { codeEl.innerHTML = lines().map((l, i) => `<span class="ln" data-l="${i}">${l}</span>`).join(''); mark(); }
    const svg = stageOf(root);
    S('rect', { x: 8, y: 20, width: 132, height: 160, rx: 10, fill: '#11606b', stroke: '#0c4a53', 'stroke-width': 2 }, svg);
    txt(svg, 66, 110, 'UNO', { fill: 'rgba(255,255,255,.55)', size: 20, weight: 700 });
    S('rect', { x: 120, y: 32, width: 14, height: 136, rx: 3, fill: '#1b1b22' }, svg);
    for (let i = 0; i < 8; i++) S('rect', { x: 124, y: 38 + i * 16, width: 6, height: 6, fill: '#777' }, svg);
    txt(svg, 112, 48, '13', { fill: '#fff', size: 10, anchor: 'end' });
    txt(svg, 112, 160, 'GND', { fill: '#fff', size: 10, anchor: 'end' });
    const onboard = S('rect', { x: 40, y: 40, width: 14, height: 8, rx: 2, fill: '#5a4a1e' }, svg);
    txt(svg, 47, 62, 'L', { fill: '#fff', size: 10 });
    wire(svg, 'M134 44 H185 V70 M185 110 V130 M185 170 V182 H160 V153 H134');
    S('path', { d: 'M185 70 l8 4 l-16 8 l16 8 l-16 8 l16 8 l-8 4', fill: 'none', stroke: C.blue, 'stroke-width': 3 }, svg);
    txt(svg, 198, 94, '220 Ω', { fill: C.blue, size: 10, anchor: 'start' });
    const led = diode(svg, svg, 185, 150, 90, { led: true });
    const wave = canvas2d($(root, '[data-c="wave"]'));
    const playBtn = act(root, 'play');
    // sequência: [linha, duração em s]
    const seq = () => { const d = iD.value / 1000; return [[1, 0.35], [4, 0.3], [5, d], [6, 0.3], [7, d]]; };
    let pc = 0, tIn = 0, playing = true, pin = false, mode = false, hist = [], clock = 0;
    function mark() {
      const line = seq()[pc][0];
      codeEl.querySelectorAll('.ln').forEach(el => el.classList.toggle('cur', +el.dataset.l === line));
    }
    function exec() {
      const line = seq()[pc][0];
      if (line === 1) mode = true;
      if (line === 4 && mode) pin = true;
      if (line === 6 && mode) pin = false;
      led.setOn(pin ? 1 : 0);
      onboard.setAttribute('fill', pin ? C.yellow : '#5a4a1e');
    }
    function advance() { pc = pc + 1 >= seq().length ? 1 : pc + 1; tIn = 0; exec(); mark(); }
    iD.addEventListener('input', () => { out(root, 'd', iD.value + ' ms'); renderCode(); });
    playBtn.addEventListener('click', () => { playing = !playing; playBtn.setAttribute('aria-pressed', String(playing)); playBtn.textContent = playing ? 'Pausar' : 'Executar'; });
    act(root, 'step', () => { if (playing) playBtn.click(); advance(); });
    out(root, 'd', iD.value + ' ms');
    renderCode(); exec();
    function drawWave() {
      const { ctx, w, h } = wave;
      ctx.clearRect(0, 0, w, h);
      const span = 8, L = 54;
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.fillStyle = C.muted; ctx.textAlign = 'left';
      ctx.fillText('HIGH', 6, 20); ctx.fillText('LOW', 6, h - 12);
      ctx.fillStyle = C.orange; ctx.fillText('pino 13', 6, h / 2 + 4);
      ctx.strokeStyle = C.mint; ctx.lineWidth = 2.5; ctx.beginPath();
      const X = s => L + ((s - (clock - span)) / span) * (w - L - 8), Y = p => p ? 16 : h - 16;
      hist.forEach(([s, p], i) => { if (!i) ctx.moveTo(X(s), Y(p)); else { ctx.lineTo(X(s), Y(hist[i - 1][1])); ctx.lineTo(X(s), Y(p)); } });
      ctx.lineTo(X(clock), Y(pin)); ctx.stroke(); ctx.lineWidth = 1;
    }
    return {
      tick(dt) {
        if (playing) {
          clock += dt; tIn += dt;
          if (tIn >= seq()[pc][1]) advance();
          const lastP = hist.length ? hist[hist.length - 1][1] : null;
          if (lastP !== pin) hist.push([clock, pin]);
          while (hist.length > 2 && hist[1][0] < clock - 8) hist.shift();
        }
        drawWave();
      }
    };
  };

  /* ======================================================
     18. Dentro do microcontrolador
     ====================================================== */
  SIMS.inside = root => {
    const svg = stageOf(root);
    const slide = root.closest('.slide');
    S('rect', { x: 60, y: 30, width: 420, height: 250, rx: 16, fill: '#211a30', stroke: C.border, 'stroke-width': 3 }, svg);
    for (let x = 84; x <= 456; x += 24) { S('rect', { x: x - 4, y: 18, width: 8, height: 12, fill: '#6d6585' }, svg); S('rect', { x: x - 4, y: 280, width: 8, height: 12, fill: '#6d6585' }, svg); }
    wire(svg, 'M170 160 H370 M170 140 V180 M370 140 V180', { color: '#5a5070', w: 6 });
    txt(svg, 270, 152, 'barramento', { size: 11 });
    const blocks = {};
    const blk = (k, x, y, title, sub, col) => {
      const g = S('g', {}, svg);
      const r = S('rect', { x, y, width: 160, height: 80, rx: 10, fill: C.surf2, stroke: C.border, 'stroke-width': 2 }, g);
      txt(g, x + 80, y + 34, title, { fill: col, size: 14, weight: 700 });
      txt(g, x + 80, y + 54, sub, { size: 11 });
      blocks[k] = { r, col };
    };
    blk('cpu', 90, 60, 'CPU', 'executa instruções', C.mint);
    blk('mem', 290, 60, 'MEMÓRIA', 'programa e dados', C.blue);
    blk('io', 90, 180, 'ENTRADAS / SAÍDAS', 'sensores e atuadores', C.orange);
    blk('tmr', 290, 180, 'TEMPORIZADORES', 'conta tempo', C.yellow);
    const ledHalo = S('circle', { cx: 26, cy: 220, r: 26, fill: glow(svg, C.red), opacity: 0 }, svg);
    const ledDot = S('circle', { cx: 26, cy: 220, r: 10, fill: '#5a2a2a', stroke: C.red, 'stroke-width': 2 }, svg);
    txt(svg, 26, 252, 'LED', { fill: C.red, size: 11 });
    wire(svg, 'M36 220 H90', { color: C.orange });
    const pktPath = S('path', { fill: 'none', stroke: 'none' }, svg);
    const pkt = S('circle', { r: 7, fill: C.mint, opacity: 0 }, svg);
    let ledOn = false;
    const steps = [
      { d: 'M370 140 V160 H170 V140', hl: ['mem', 'cpu'], col: C.blue, cap: () => '<b>1. Buscar</b> — a CPU lê na memória a próxima instrução do programa.' },
      { d: 'M100 70 H240 V130 H100 Z', hl: ['cpu'], col: C.mint, cap: () => `<b>2. Executar</b> — a CPU executa a instrução: <span class="mono">digitalWrite(13, ${ledOn ? 'LOW' : 'HIGH'})</span>.` },
      { d: 'M170 140 V220 H36', hl: ['cpu', 'io'], col: C.orange, cap: () => `<b>3. Saída</b> — o resultado chega a um pino de E/S: o LED ${ledOn ? 'apaga' : 'acende'}.`, end: () => { ledOn = !ledOn; } },
      { d: 'M370 180 V160 H170 V140', hl: ['tmr', 'cpu'], col: C.yellow, cap: () => '<b>4. Tempo</b> — o temporizador conta o tempo (ex.: <span class="mono">delay</span>) e avisa a CPU quando seguir.' }
    ];
    let i = 0, t = 0, playing = true, L = 1, done = false;
    const MOVE = 1.3, HOLD = 1.1;
    function go(k) {
      i = (k + steps.length) % steps.length; t = 0; done = false;
      const s = steps[i];
      pktPath.setAttribute('d', s.d); L = pktPath.getTotalLength();
      pkt.setAttribute('fill', s.col);
      Object.entries(blocks).forEach(([k2, b]) => { const on = s.hl.includes(k2); b.r.setAttribute('stroke', on ? b.col : C.border); b.r.setAttribute('stroke-width', on ? 3 : 2); });
      slide.querySelectorAll('[data-blk]').forEach(c => { const on = s.hl.includes(c.dataset.blk); c.style.borderColor = on ? TEMA.cor(blocks[c.dataset.blk].col) : ''; });
      out(root, 'cap', s.cap());
    }
    const pb = act(root, 'play', () => { playing = !playing; pb.setAttribute('aria-pressed', String(playing)); pb.textContent = playing ? 'Pausar' : 'Executar'; });
    act(root, 'prev', () => go(i - 1));
    act(root, 'next', () => { if (!done && steps[i].end) steps[i].end(); go(i + 1); });
    go(0);
    return {
      tick(dt) {
        if (playing || t < MOVE) t += dt;
        const k = clamp(t / MOVE, 0, 1);
        const p = pktPath.getPointAtLength(k * L);
        pkt.setAttribute('cx', p.x); pkt.setAttribute('cy', p.y);
        pkt.setAttribute('opacity', k < 1 ? 1 : 0.4);
        if (k >= 1 && !done) { done = true; steps[i].end?.(); }
        ledHalo.setAttribute('opacity', ledOn ? 1 : 0);
        ledDot.setAttribute('fill', ledOn ? C.red : '#5a2a2a');
        if (playing && t > MOVE + HOLD) go(i + 1);
      }
    };
  };

  /* ======================================================
     20. Pinos digitais, analógicos e PWM
     ====================================================== */
  SIMS.pins = root => {
    const cD = canvas2d($(root, '[data-c="dig"]')), cA = canvas2d($(root, '[data-c="ana"]')), cP = canvas2d($(root, '[data-c="pwm"]'));
    const bD = act(root, 'dig'), iA = inp(root, 'ana'), iP = inp(root, 'pwm');
    let dig = false, phase = 0;
    const hD = [], hA = [];
    const setDig = v => { dig = v; bD.setAttribute('aria-pressed', String(v)); bD.textContent = v ? 'Botão: pressionado' : 'Botão: solto'; updText(); };
    bD.addEventListener('pointerdown', e => { setDig(true); try { bD.setPointerCapture(e.pointerId); } catch (_) {} });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => bD.addEventListener(ev, () => setDig(false)));
    bD.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); setDig(true); } });
    bD.addEventListener('keyup', () => setDig(false));
    function updText() {
      out(root, 'dig', `digitalRead(2) → <b>${dig ? 'HIGH' : 'LOW'}</b> <span class="muted">(${dig ? '5' : '0'} V)</span>`);
      const v = +iA.value;
      out(root, 'ana', `analogRead(A0) → <b>${Math.round(v / 5 * 1023)}</b> <span class="muted">(${fmt(v, 2)} V)</span>`);
      const p = +iP.value;
      out(root, 'pwm', `analogWrite(9, <b>${p}</b>) → ${Math.round(p / 2.55)}% <span class="muted">· média ≈ ${fmt(5 * p / 255, 2)} V</span>`);
    }
    iA.addEventListener('input', updText); iP.addEventListener('input', updText);
    updText();
    function axes(o, labels) {
      const { ctx, w, h } = o;
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = '#2d2540'; ctx.lineWidth = 1;
      [12, h - 12].forEach(y => { ctx.beginPath(); ctx.moveTo(34, y); ctx.lineTo(w - 6, y); ctx.stroke(); });
      ctx.fillStyle = C.muted; ctx.font = '10px IBM Plex Mono, monospace'; ctx.textAlign = 'right';
      ctx.fillText(labels[0], 30, 16); ctx.fillText(labels[1], 30, h - 8);
    }
    function series(o, arr, col, max) {
      const { ctx, w, h } = o;
      ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath();
      arr.forEach((v, i) => { const x = 34 + (i / 199) * (w - 40), y = h - 12 - (v / max) * (h - 24); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke(); ctx.lineWidth = 1;
    }
    return {
      tick(dt) {
        hD.push(dig ? 1 : 0); hA.push(+iA.value);
        if (hD.length > 200) hD.shift(); if (hA.length > 200) hA.shift();
        axes(cD, ['HIGH', 'LOW']); series(cD, hD, C.blue, 1);
        axes(cA, ['5 V', '0 V']); series(cA, hA, C.mint, 5);
        // PWM
        phase = (phase + dt * 0.6) % 1;
        const o = cP, { ctx, w, h } = o, duty = +iP.value / 255;
        axes(o, ['5 V', '0 V']);
        const x0 = 34, x1 = w - 52, per = (x1 - x0) / 4;
        ctx.save(); ctx.beginPath(); ctx.rect(x0, 0, x1 - x0, h); ctx.clip();
        ctx.strokeStyle = C.orange; ctx.lineWidth = 2.5; ctx.beginPath();
        const hi = 12, lo = h - 12;
        let started = false;
        for (let k = -1; k <= 4; k++) {
          const s = x0 + (k - phase) * per + per; // inicio do período
          const e = s + duty * per;
          if (!started) { ctx.moveTo(s, duty > 0 ? hi : lo); started = true; }
          if (duty > 0) { ctx.lineTo(s, hi); ctx.lineTo(e, hi); }
          if (duty < 1) { ctx.lineTo(e, lo); ctx.lineTo(s + per, lo); }
        }
        ctx.stroke(); ctx.restore();
        // média
        const ym = lo - duty * (lo - hi);
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(222,221,230,.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, ym); ctx.lineTo(x1, ym); ctx.stroke(); ctx.setLineDash([]);
        // LED
        const g = ctx.createRadialGradient(w - 24, h / 2, 2, w - 24, h / 2, 24);
        g.addColorStop(0, `rgba(255,93,93,${0.15 + 0.85 * duty})`); g.addColorStop(1, 'rgba(255,93,93,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(w - 24, h / 2, 24, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(255,93,93,${0.25 + 0.75 * duty})`; ctx.beginPath(); ctx.arc(w - 24, h / 2, 8, 0, 7); ctx.fill();
      }
    };
  };

  /* ======================================================
     21. Quiz de alimentação
     ====================================================== */
  SIMS.quiz = root => {
    const items = [
      ['Alimentar um protótipo de baixo consumo pela USB.', true, 'Pode: a USB serve para programar e alimentar protótipos de baixo consumo.'],
      ['Ligar um motor diretamente em um pino de I/O.', false, 'Não pode: use transistor ou driver e uma fonte adequada para o motor.'],
      ['Aplicar 5 V em um pino de 3,3 V que não é tolerante a 5 V.', false, 'Não pode: o pino pode ser danificado. Use divisor de tensão ou conversor de nível.'],
      ['Usar uma fonte separada para os motores, com GND comum à placa.', true, 'Pode: é a forma correta; o GND comum garante a mesma referência.'],
      ['Encostar um fio entre 5 V e GND para “testar” a fonte.', false, 'Não pode: isso é um curto-circuito e pode danificar a placa ou a fonte.']
    ];
    const list = out(root, 'list'), score = out(root, 'score');
    let right = 0, answered = 0;
    const upd = () => pill(score, answered === items.length ? 'on' : '', `${right} / ${items.length} acertos`);
    items.forEach(([q, ans, fb]) => {
      const el = document.createElement('div'); el.className = 'q';
      el.innerHTML = `<p>${q}</p><div class="btn-row"><button class="btn" data-a="1">✓ Pode</button><button class="btn orange" data-a="0">✗ Não pode</button></div><p class="fb"></p>`;
      el.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
        if (el.classList.contains('answered')) return;
        const ok = (b.dataset.a === '1') === ans;
        el.classList.add('answered', ok ? 'right' : 'wrong');
        el.querySelector('.fb').textContent = (ok ? 'Certo! ' : 'Atenção: ') + fb;
        b.setAttribute('aria-pressed', 'true');
        answered++; if (ok) right++; upd();
      }));
      list.appendChild(el);
    });
    upd();
    return {};
  };

  /* ======================================================
     22. Sensores
     ====================================================== */
  SIMS.sensors = root => {
    const V = k => $(root, `svg[data-v="${k}"]`);
    // luz
    const sl = V('light');
    const sun = S('g', {}, sl);
    S('circle', { cx: 38, cy: 43, r: 14, fill: C.yellow }, sun);
    for (let a = 0; a < 360; a += 45) S('line', { x1: 38, y1: 22, x2: 38, y2: 16, stroke: C.yellow, 'stroke-width': 3, 'stroke-linecap': 'round', transform: `rotate(${a} 38 43)` }, sun);
    S('circle', { cx: 100, cy: 43, r: 12, fill: '#c4744a', stroke: '#e0a080', 'stroke-width': 2 }, sl);
    S('path', { d: 'M92 39 h6 v8 h4 v-8 h6', stroke: '#5a2a1a', 'stroke-width': 2, fill: 'none' }, sl);
    txt(sl, 100, 72, 'LDR', { size: 10 });
    const bulbH = S('circle', { cx: 162, cy: 40, r: 28, fill: glow(sl, C.yellow), opacity: 0 }, sl);
    const bulb = S('circle', { cx: 162, cy: 40, r: 12, fill: C.surf3, stroke: C.yellow, 'stroke-width': 2 }, sl);
    S('rect', { x: 156, y: 52, width: 12, height: 8, rx: 2, fill: C.muted }, sl);
    // temperatura
    const stp = V('temp');
    S('rect', { x: 92, y: 10, width: 16, height: 56, rx: 8, fill: C.surf3 }, stp);
    const merc = S('rect', { x: 96, y: 40, width: 8, height: 30, rx: 4, fill: C.orange }, stp);
    S('circle', { cx: 100, cy: 70, r: 11, fill: C.orange }, stp);
    const bulbT = stp.lastChild;
    const tTxt = txt(stp, 150, 50, '', { fill: C.text2, size: 15, weight: 700 });
    // distância
    const sd = V('dist');
    const wall = S('rect', { x: 150, y: 14, width: 10, height: 60, rx: 2, fill: C.border }, sd);
    S('rect', { x: 8, y: 30, width: 26, height: 26, rx: 4, fill: C.blue }, sd);
    S('circle', { cx: 30, cy: 37, r: 4, fill: C.text }, sd); S('circle', { cx: 30, cy: 49, r: 4, fill: C.text }, sd);
    const ping = S('path', { fill: 'none', stroke: C.blue, 'stroke-width': 2 }, sd);
    const dTxt = txt(sd, 100, 82, '', { size: 10 });
    // umidade
    const sh = V('hum');
    const soil = S('rect', { x: 20, y: 56, width: 160, height: 26, rx: 4, fill: '#6b4a2e' }, sh);
    S('path', { d: 'M100 56 V32 M100 42 C88 40 84 32 84 26 C94 26 100 32 100 42 M100 38 C112 36 116 28 116 22 C106 22 100 28 100 38', fill: C.mint, stroke: C.mint, 'stroke-width': 2 }, sh);
    S('rect', { x: 150, y: 40, width: 6, height: 30, fill: C.muted }, sh);
    const drops = [0, 1, 2].map(i => S('circle', { cx: 60 + i * 16, cy: 10, r: 3, fill: C.blue, opacity: 0 }, sh));
    let pingT = 0, dropT = 0;
    const iL = inp(root, 'light'), iT = inp(root, 'temp'), iD = inp(root, 'dist'), iH = inp(root, 'hum');
    function upd() {
      const l = +iL.value / 100;
      const R = Math.pow(10, 6 - 3 * l), Vv = 5 * 1e4 / (R + 1e4), adc = Math.round(Vv / 5 * 1023);
      sun.setAttribute('opacity', 0.15 + 0.85 * l);
      const lit = adc < 300;
      bulbH.setAttribute('opacity', lit ? 1 : 0); bulb.setAttribute('fill', lit ? C.yellow : C.surf3);
      out(root, 'light', `R ≈ ${fmtOhm(Math.round(R / 100) * 100)} · analogRead → <b>${adc}</b>`);
      out(root, 'lightD', lit ? '<span class="c-mint">→ Escuro: acender a luz</span>' : '<span class="muted">→ Claro: luz apagada</span>');
      const T = +iT.value, k = T / 50;
      merc.setAttribute('y', 66 - k * 52); merc.setAttribute('height', 6 + k * 52);
      const tc = T > 35 ? C.red : T < 12 ? C.blue : C.orange;
      merc.setAttribute('fill', tc); bulbT.setAttribute('fill', tc);
      tTxt.textContent = fmt(T, 1) + ' °C';
      out(root, 'temp', `sensor → <b>${fmt(T, 1)} °C</b>`);
      out(root, 'tempD', T > 35 ? '<span class="c-red">→ Acima de 35 °C: alerta!</span>' : T < 12 ? '<span class="c-blue">→ Frio: abaixo de 12 °C</span>' : '<span class="muted">→ Faixa normal</span>');
      const d = +iD.value;
      wall.setAttribute('x', 44 + (d / 200) * 140);
      dTxt.textContent = d + ' cm';
      out(root, 'dist', `eco: ${d * 58} µs → <b>${d} cm</b>`);
      out(root, 'distD', d < 20 ? '<span class="c-orange">→ Obstáculo perto: virar!</span>' : '<span class="muted">→ Caminho livre: seguir</span>');
      const h = +iH.value;
      soil.setAttribute('fill', `rgb(${Math.round(150 - h * 0.9)},${Math.round(108 - h * 0.6)},${Math.round(70 - h * 0.4)})`);
      out(root, 'hum', `analogRead → <b>${Math.round(h / 100 * 1023)}</b> · ${h}%`);
      out(root, 'humD', h < 30 ? '<span class="c-blue">→ Solo seco: ligar irrigação</span>' : '<span class="muted">→ Umidade ok</span>');
    }
    [iL, iT, iD, iH].forEach(i => i.addEventListener('input', upd));
    upd();
    return {
      tick(dt) {
        const d = +iD.value, wx = 44 + (d / 200) * 140;
        pingT = (pingT + dt * 1.2) % 1;
        const x = 36 + pingT * (wx - 36);
        ping.setAttribute('d', `M${x} 30 Q${x + 8} 43 ${x} 56`);
        ping.setAttribute('opacity', (1 - pingT).toFixed(2));
        const dry = +iH.value < 30;
        dropT = (dropT + dt) % 1;
        drops.forEach((dr, i) => {
          const k = (dropT + i / 3) % 1;
          dr.setAttribute('cy', 8 + k * 44); dr.setAttribute('opacity', dry ? (1 - k).toFixed(2) : 0);
        });
      }
    };
  };

  /* ======================================================
     23. Atuadores
     ====================================================== */
  SIMS.actuators = root => {
    const V = k => $(root, `svg[data-v="${k}"]`);
    // display de 7 segmentos
    const sd = V('disp');
    const SEG = { a: 'M82 12 h36', b: 'M122 16 v24', c: 'M122 48 v24', d: 'M82 76 h36', e: 'M78 48 v24', f: 'M78 16 v24', g: 'M82 44 h36' };
    const DIG = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
    const segs = {};
    for (const k in SEG) segs[k] = S('path', { d: SEG[k], stroke: '#3a2a2a', 'stroke-width': 7, 'stroke-linecap': 'round' }, sd);
    const dot = S('circle', { cx: 134, cy: 76, r: 4, fill: '#3a2a2a' }, sd);
    let n = 0;
    function showDigit() {
      for (const k in segs) segs[k].setAttribute('stroke', DIG[n].includes(k) ? C.red : '#3a2a2a');
      dot.setAttribute('fill', n % 2 ? C.red : '#3a2a2a');
      out(root, 'disp', `display.mostrar(<b>${n}</b>)`);
    }
    act(root, 'disp', () => { n = (n + 1) % 10; showDigit(); });
    showDigit();
    // buzzer
    const sb = V('buzz');
    S('path', { d: 'M70 32 h14 l18 -14 v50 l-18 -14 h-14 Z', fill: C.blue }, sb);
    const waves = [0, 1, 2].map(i => S('path', { d: `M${112 + i * 12} ${28 - i * 6} q${10 + i * 4} ${15 + i * 6} 0 ${30 + i * 12}`, stroke: C.blue, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0.15 }, sb));
    const iF = inp(root, 'freq');
    let actx = null, buzzT = 0;
    const updBuzz = () => out(root, 'buzz', `tone(8, <b>${iF.value}</b>) · ${iF.value} Hz`);
    iF.addEventListener('input', updBuzz); updBuzz();
    act(root, 'buzz', () => {
      try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'square'; o.frequency.value = +iF.value;
        g.gain.setValueAtTime(0.0001, actx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.06, actx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + 0.35);
        o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + 0.36);
      } catch (_) {}
      buzzT = 0.4;
    });
    // servo
    const ss = V('servo');
    S('rect', { x: 60, y: 44, width: 80, height: 34, rx: 5, fill: C.surf3, stroke: C.mint, 'stroke-width': 2 }, ss);
    S('path', { d: 'M60 72 A40 40 0 0 1 140 72', fill: 'none', stroke: C.border, 'stroke-width': 1, 'stroke-dasharray': '3 4' }, ss);
    const horn = S('g', {}, ss);
    S('rect', { x: -4, y: -36, width: 8, height: 40, rx: 4, fill: C.mint }, horn);
    S('circle', { r: 7, fill: C.text2 }, horn);
    const iS = inp(root, 'servo');
    let sAng = 90;
    const updServo = () => out(root, 'servo', `servo.write(<b>${iS.value}</b>) → ${iS.value}°`);
    iS.addEventListener('input', updServo); updServo();
    // relé
    const sr = V('relay');
    const rH = S('circle', { cx: 130, cy: 40, r: 34, fill: glow(sr, C.yellow), opacity: 0 }, sr);
    const rB = S('circle', { cx: 130, cy: 40, r: 14, fill: C.surf3, stroke: C.yellow, 'stroke-width': 2 }, sr);
    S('rect', { x: 124, y: 54, width: 12, height: 9, rx: 2, fill: C.muted }, sr);
    S('rect', { x: 34, y: 24, width: 40, height: 34, rx: 5, fill: '#1f4fa3' }, sr);
    txt(sr, 54, 46, 'RELÉ', { fill: C.text, size: 9, weight: 700 });
    wire(sr, 'M74 34 H116 M74 48 H100 V62 H130 V63', { w: 2 });
    const rBtn = act(root, 'relay');
    let rOn = false;
    function updRelay() {
      rBtn.setAttribute('aria-pressed', String(rOn)); rBtn.textContent = rOn ? 'Desligar carga' : 'Ligar carga';
      rH.setAttribute('opacity', rOn ? 1 : 0); rB.setAttribute('fill', rOn ? C.yellow : C.surf3);
      out(root, 'relay', `digitalWrite(7, <b>${rOn ? 'HIGH' : 'LOW'}</b>) → ${rOn ? 'contato fechado' : 'contato aberto'}`);
    }
    rBtn.addEventListener('click', () => { rOn = !rOn; updRelay(); });
    updRelay();
    return {
      tick(dt) {
        sAng = lerp(sAng, +iS.value, Math.min(1, dt * 8));
        horn.setAttribute('transform', `translate(100 72) rotate(${(sAng - 90).toFixed(1)})`);
        buzzT = Math.max(0, buzzT - dt);
        waves.forEach((w, i) => w.setAttribute('opacity', buzzT > 0 ? (0.4 + 0.6 * Math.abs(Math.sin(buzzT * 20 + i))).toFixed(2) : 0.15));
      }
    };
  };

  /* ======================================================
     24. Do sensor ao dado
     ====================================================== */
  SIMS.data = root => {
    const serial = out(root, 'serial');
    const cv = canvas2d($(root, '[data-c="chart"]'));
    const stages = Array.from(root.querySelectorAll('.st'));
    const runBtn = act(root, 'run'), iAvg = inp(root, 'avg');
    let running = false, acc = 0, t = 0, samples = [];
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    function hello() { serial.innerHTML = '<span class="dim">// Monitor Serial · 9600 baud\n// tempo | sensor | leitura\n</span>'; }
    hello();
    function sample() {
      t += 5;
      let T = 24 + 1.2 * Math.sin(t / 120) + t * 0.002 + gauss() * 0.25;
      if (Math.random() < 0.05) T += (Math.random() < 0.5 ? -1 : 1) * (1 + Math.random());
      samples.push([t, T]);
      serial.insertAdjacentText('beforeend', `t=${String(t).padStart(4)} s | TMP01 | ${T.toFixed(2)} °C\n`);
      serial.scrollTop = serial.scrollHeight;
    }
    function setRun(v) { running = v; runBtn.setAttribute('aria-pressed', String(v)); runBtn.textContent = v ? 'Pausar coleta' : (samples.length ? 'Continuar coleta' : 'Iniciar coleta'); if (!v) stages.forEach(s => s.classList.remove('hot')); }
    runBtn.addEventListener('click', () => setRun(!running));
    act(root, 'clear', () => { samples = []; t = 0; acc = 0; hello(); setRun(false); draw(); });
    act(root, 'csv', () => {
      const csv = 'tempo_s,sensor,temperatura_c\n' + samples.map(([s, T]) => `${s},TMP01,${T.toFixed(2)}`).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'leituras_temperatura.csv'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    iAvg.addEventListener('change', () => draw());
    function draw() {
      const { ctx, w, h } = cv;
      ctx.clearRect(0, 0, w, h);
      const L = 44, R = 10, T0 = 12, B = 26;
      const data = samples.slice(-60);
      ctx.font = '11px IBM Plex Mono, monospace';
      if (!data.length) { ctx.fillStyle = C.muted; ctx.textAlign = 'center'; ctx.fillText('Clique em “Iniciar coleta”', w / 2, h / 2); return; }
      let mn = Math.min(...data.map(d => d[1])), mx = Math.max(...data.map(d => d[1]));
      mn = Math.floor(mn - 0.5); mx = Math.ceil(mx + 0.5);
      const ts = data[0][0], te = Math.max(data[data.length - 1][0], ts + 5 * 59);
      const X = s => L + ((s - ts) / (te - ts)) * (w - L - R), Y = v => T0 + (1 - (v - mn) / (mx - mn)) * (h - T0 - B);
      ctx.strokeStyle = '#2d2540'; ctx.fillStyle = C.muted;
      for (let v = mn; v <= mx; v++) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(w - R, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.fillText(v + '°', L - 6, Y(v) + 4); }
      ctx.textAlign = 'center';
      ctx.fillText(ts + ' s', X(ts), h - 8); ctx.fillText(te + ' s', X(te) - 14, h - 8);
      ctx.strokeStyle = 'rgba(128,230,198,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
      data.forEach(([s, v], i) => i ? ctx.lineTo(X(s), Y(v)) : ctx.moveTo(X(s), Y(v))); ctx.stroke();
      ctx.fillStyle = C.mint; data.forEach(([s, v]) => { ctx.beginPath(); ctx.arc(X(s), Y(v), 2.5, 0, 7); ctx.fill(); });
      if (iAvg.checked && data.length > 2) {
        ctx.strokeStyle = C.orange; ctx.lineWidth = 3; ctx.beginPath();
        data.forEach(([s], i) => { const win = data.slice(Math.max(0, i - 4), i + 1); const m = win.reduce((a, d) => a + d[1], 0) / win.length; i ? ctx.lineTo(X(s), Y(m)) : ctx.moveTo(X(s), Y(m)); });
        ctx.stroke();
        ctx.fillStyle = C.orange; ctx.textAlign = 'right'; ctx.fillText('média móvel (5)', w - R - 4, T0 + 10);
      }
      ctx.lineWidth = 1;
    }
    draw();
    return {
      tick(dt) {
        if (!running) return;
        acc += dt;
        const k = Math.floor(acc * 4) % 4;
        stages.forEach((s, i) => s.classList.toggle('hot', i === k));
        if (acc >= 1) { acc -= 1; sample(); draw(); }
      },
      redraw: draw,
      pause() { stages.forEach(s => s.classList.remove('hot')); }
    };
  };

  /* ======================================================
     25. Fluxo IoT
     ====================================================== */
  SIMS.iot = root => {
    const svg = stageOf(root);
    const P = [[70, 80], [210, 80], [350, 80], [490, 80], [490, 225], [350, 225], [210, 225], [70, 225]];
    const names = ['Sensores', 'Rede', 'Roteador', 'Internet', 'Servidor', 'Big data', 'Análise', 'Usuário'];
    const desc = [
      'Medem grandezas do ambiente (temperatura, umidade, luz…) e geram dados.',
      'Os dispositivos se comunicam por Wi-Fi, Bluetooth, LoRa, Zigbee ou cabo.',
      'Encaminha os dados da rede local para a internet.',
      'Transporta os dados até servidores em qualquer lugar.',
      'Recebe, processa e armazena as informações, muitas vezes na nuvem.',
      'Grandes volumes de dados históricos ficam disponíveis para consulta.',
      'Gráficos, regras, alertas e modelos transformam dados em decisões.',
      'Acompanha pelo app ou painel e pode enviar comandos de volta aos dispositivos.'
    ];
    const pathD = 'M70 80 H490 V225 H70';
    wire(svg, pathD, { color: C.surf3, w: 4, dash: '2 8' });
    const fwd = flow(svg, pathD, { n: 10, r: 4.5, color: C.mint });
    const back = flow(svg, 'M70 225 H490 V80 H70', { n: 6, r: 5, color: C.orange });
    fwd.on = true; fwd.speed = 70; back.speed = 150;
    const ic = {
      0: g => { S('rect', { x: -5, y: -18, width: 10, height: 24, rx: 5, fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, g); S('circle', { cx: 0, cy: 10, r: 7, fill: C.mint }, g); S('path', { d: 'M10 -16 q6 6 0 12 M15 -20 q10 10 0 20', stroke: C.mint, 'stroke-width': 2, fill: 'none' }, g); },
      1: g => { S('path', { d: 'M-13 10 L0 -12 L13 10 Z', stroke: C.mint, 'stroke-width': 2, fill: 'none' }, g); [[-13, 10], [0, -12], [13, 10]].forEach(([x, y]) => S('circle', { cx: x, cy: y, r: 5, fill: C.mint }, g)); },
      2: g => { S('rect', { x: -17, y: 0, width: 34, height: 13, rx: 3, fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, g); S('path', { d: 'M-9 0 L-13 -16 M9 0 L13 -16', stroke: C.mint, 'stroke-width': 2.5 }, g); [-8, 0, 8].forEach(x => S('circle', { cx: x, cy: 6.5, r: 2, fill: C.mint }, g)); },
      3: g => { S('circle', { r: 17, fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, g); S('ellipse', { rx: 7, ry: 17, fill: 'none', stroke: C.mint, 'stroke-width': 2 }, g); S('path', { d: 'M-17 0 H17 M-14 -9 H14 M-14 9 H14', stroke: C.mint, 'stroke-width': 1.5 }, g); },
      4: g => { [-17, -5, 7].forEach(y => { S('rect', { x: -15, y, width: 30, height: 10, rx: 2, fill: 'none', stroke: C.mint, 'stroke-width': 2.2 }, g); S('circle', { cx: 9, cy: y + 5, r: 1.8, fill: C.mint }, g); }); },
      5: g => { S('ellipse', { cx: 0, cy: -12, rx: 15, ry: 5, fill: 'none', stroke: C.mint, 'stroke-width': 2.2 }, g); S('path', { d: 'M-15 -12 V12 A15 5 0 0 0 15 12 V-12 M-15 0 A15 5 0 0 0 15 0', fill: 'none', stroke: C.mint, 'stroke-width': 2.2 }, g); },
      6: g => { [[-15, 6, 10], [-5, -2, 18], [5, -10, 26]].forEach(([x, y, hh]) => S('rect', { x, y, width: 7, height: hh, rx: 1.5, fill: C.mint }, g)); S('path', { d: 'M-16 -6 L-4 -12 L6 -16 L16 -20', stroke: C.orange, 'stroke-width': 2, fill: 'none' }, g); },
      7: g => { S('circle', { cx: 0, cy: -9, r: 7, fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, g); S('path', { d: 'M-14 16 Q0 -6 14 16', fill: 'none', stroke: C.mint, 'stroke-width': 2.5 }, g); }
    };
    const nodes = P.map(([x, y], i) => {
      const g = S('g', { class: 'iot-node', tabindex: 0, role: 'button', 'aria-label': names[i] }, svg);
      S('rect', { x: x - 46, y: y - 40, width: 92, height: 80, rx: 12, fill: C.surf2, stroke: C.border, 'stroke-width': 2 }, g);
      const ig = S('g', { transform: `translate(${x} ${y - 10})` }, g);
      ic[i](ig);
      txt(g, x, y + 28, names[i], { fill: C.text, size: 12, weight: 600 });
      const pick = () => { nodes.forEach((n, j) => n.classList.toggle('sel', j === i)); out(root, 'desc', `<b>${names[i]}</b> — ${desc[i]}`); };
      g.addEventListener('click', pick);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); pick(); } });
      return g;
    });
    out(root, 'desc', '<span class="muted">Clique em uma etapa para ver o que acontece nela.</span>');
    let cmdT = 0;
    act(root, 'cmd', () => {
      cmdT = 6;
      out(root, 'desc', '<b class="c-orange">Comando</b> — o usuário envia uma ação (ex.: ligar a irrigação) que volta pelo mesmo caminho até o dispositivo.');
    });
    return {
      tick(dt) {
        cmdT = Math.max(0, cmdT - dt);
        back.on = cmdT > 0;
        fwd.tick(dt); back.tick(dt);
      }
    };
  };
})();
