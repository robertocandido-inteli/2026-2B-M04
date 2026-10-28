/* ==========================================================
   Simulações interativas — uma função por data-sim.
   Cada função recebe o elemento raiz e pode devolver
   { tick(dt, t), pause(), resume() }.
   Este arquivo: utilitários + capa.
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
    'FALLING RISING CHANGE A0 A1 A2 def True False import from in and or not nullptr NULL sizeof size_t struct new delete auto String char int32_t uint64_t int64_t enum switch case break default continue nullptr_t extern').split(' '));
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

  // blocos de código estáticos: <pre class="code" data-hl="2,5"> com o código em texto puro
  // (data-hl opcional: linhas a destacar, contadas a partir de 1)
  $$(document, 'pre.code[data-hl]').forEach(el => {
    const lines = el.textContent.replace(/^\n/, '').replace(/\s+$/, '').split('\n');
    const mark = el.dataset.hl.split(',').filter(Boolean).map(n => +n - 1);
    renderCode(el, lines, mark);
  });

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
})();
