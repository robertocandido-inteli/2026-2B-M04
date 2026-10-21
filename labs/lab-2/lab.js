/* Lab 2 — esquemas, simulação do filtro RC, blocos de código e formulário de entrega */
(function () {
  const CFG = window.LAB_CONFIG || {};
  const NS = 'http://www.w3.org/2000/svg';
  const C = { wire: '#8c84a3', text2: '#dedde6', muted: '#a9a3bd', mint: '#80e6c6', orange: '#ff9148', blue: '#7caaff', red: '#ff5d5d', yellow: '#ffd166', plot: '#1d1729' };

  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  const wire = (g, d, col) => S('path', { d, fill: 'none', stroke: col || C.wire, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const txt = (g, x, y, t, o = {}) => S('text', { x, y, text: t, fill: o.fill || C.muted, 'font-size': o.size || 13, 'text-anchor': o.anchor || 'middle', 'font-family': 'IBM Plex Mono, monospace', 'font-weight': o.weight || 500 }, g);
  const gnd = (g, x, y) => wire(g, `M${x - 14} ${y} H${x + 14} M${x - 8} ${y + 6} H${x + 8} M${x - 3} ${y + 12} H${x + 3}`);
  const resH = (g, x, y, col) => S('path', { d: `M${x} ${y} l5 -10 l10 20 l10 -20 l10 20 l10 -20 l10 20 l10 -20 l10 20 l5 -10`, fill: 'none', stroke: col || C.blue, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  const resV = (g, x, y, h, col) => {
    const step = (h - 10) / 7;
    let d = `M${x} ${y} l10 5`;
    for (let i = 0; i < 7; i++) d += ` l${i % 2 ? 20 : -20} ${step}`;
    return S('path', { d: d + ' l10 5', fill: 'none', stroke: col || C.blue, 'stroke-width': 3, 'stroke-linejoin': 'round' }, g);
  };

  /* ---------------- Esquema da bancada (botão clicável) ---------------- */
  const svg = document.getElementById('schematic');
  if (svg) {
    const defs = S('defs', {}, svg);
    const grad = S('radialGradient', { id: 'ledGlow' }, defs);
    S('stop', { offset: 0, 'stop-color': C.red, 'stop-opacity': 0.95 }, grad);
    S('stop', { offset: 0.5, 'stop-color': C.red, 'stop-opacity': 0.3 }, grad);
    S('stop', { offset: 1, 'stop-color': C.red, 'stop-opacity': 0 }, grad);

    S('rect', { x: 20, y: 30, width: 150, height: 240, rx: 12, fill: '#11606b', stroke: '#0c4a53', 'stroke-width': 2 }, svg);
    txt(svg, 80, 160, 'UNO', { fill: 'rgba(255,255,255,.6)', size: 22, weight: 700 });
    txt(svg, 80, 182, 'U1', { fill: 'rgba(255,255,255,.5)', size: 12 });
    [['D2', 110], ['D8', 200], ['GND', 250]].forEach(([n, y]) => {
      S('rect', { x: 164, y: y - 4, width: 8, height: 8, fill: '#ddd' }, svg);
      txt(svg, 156, y + 4, n, { fill: '#fff', size: 12, anchor: 'end', weight: 600 });
    });
    // pull-up interno
    wire(svg, 'M120 60 V70', 'rgba(255,255,255,.55)');
    S('path', { d: 'M120 70 l6 3 l-12 6 l12 6 l-12 6 l12 6 l-6 3', fill: 'none', stroke: 'rgba(255,255,255,.55)', 'stroke-width': 2 }, svg);
    wire(svg, 'M120 100 V110 H164', 'rgba(255,255,255,.55)');
    txt(svg, 120, 54, '5 V', { fill: 'rgba(255,255,255,.7)', size: 10 });
    txt(svg, 84, 90, 'pull-up', { fill: 'rgba(255,255,255,.7)', size: 10 });
    txt(svg, 84, 102, 'interno', { fill: 'rgba(255,255,255,.7)', size: 10 });
    wire(svg, 'M172 250 H200 V258'); gnd(svg, 200, 258);

    // botão SW1 entre D2 e GND
    wire(svg, 'M172 110 H262 M318 110 H360 V128'); gnd(svg, 360, 128);
    S('circle', { cx: 268, cy: 110, r: 5, fill: '#191426', stroke: C.wire, 'stroke-width': 2.5 }, svg);
    S('circle', { cx: 312, cy: 110, r: 5, fill: '#191426', stroke: C.wire, 'stroke-width': 2.5 }, svg);
    const lever = S('g', { style: 'cursor:pointer', tabindex: 0, role: 'button', 'aria-label': 'Apertar o botão SW1' }, svg);
    S('rect', { x: 250, y: 56, width: 80, height: 60, fill: 'transparent' }, lever);
    const bar = S('path', { d: 'M260 96 H320 M290 96 V78 M280 78 H300', stroke: C.mint, 'stroke-width': 3.5, 'stroke-linecap': 'round', fill: 'none' }, lever);
    txt(svg, 290, 66, 'SW1 · clique', { fill: C.mint, size: 11, weight: 600 });
    const level = txt(svg, 230, 140, '', { size: 11, weight: 600 });

    // LED com resistor no D8
    wire(svg, 'M172 200 H250 M330 200 H370 M410 200 H450 V215');
    gnd(svg, 450, 215);
    resH(svg, 250, 200);
    txt(svg, 290, 180, 'R1 · 220 Ω', { fill: C.blue, size: 12, weight: 600 });
    const halo = S('circle', { cx: 390, cy: 200, r: 40, fill: 'url(#ledGlow)', opacity: 0 }, svg);
    wire(svg, 'M370 200 H378 M402 200 H410');
    const body = S('path', { d: 'M378 187 L402 200 L378 213 Z', fill: C.red, 'fill-opacity': 0.25, stroke: C.red, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
    S('line', { x1: 402, y1: 186, x2: 402, y2: 214, stroke: C.red, 'stroke-width': 3.5 }, svg);
    S('path', { d: 'M392 183 l9 -9 m-5 0 h5 v5 M400 187 l9 -9 m-5 0 h5 v5', stroke: C.red, 'stroke-width': 2, fill: 'none' }, svg);
    txt(svg, 390, 236, 'LED1', { fill: C.red, size: 12, weight: 600 });

    let down = false, led = false;
    function draw() {
      bar.setAttribute('transform', down ? 'translate(0 12)' : '');
      level.textContent = down ? 'D2 = LOW (apertado)' : 'D2 = HIGH (solto)';
      level.setAttribute('fill', down ? C.orange : C.mint);
      halo.setAttribute('opacity', led ? 1 : 0);
      body.setAttribute('fill-opacity', led ? 1 : 0.25);
    }
    const press = v => { if (v === down) return; down = v; if (v) led = !led; draw(); };
    lever.addEventListener('pointerdown', e => { e.preventDefault(); press(true); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => lever.addEventListener(ev, () => press(false)));
    lever.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(true); } });
    lever.addEventListener('keyup', () => press(false));
    draw();
  }

  /* ---------------- Esquema da rede RC ---------------- */
  const rcs = document.getElementById('rcSchematic');
  if (rcs) {
    txt(rcs, 120, 22, '5 V', { fill: C.orange, size: 13, weight: 700 });
    wire(rcs, 'M100 30 H140 M120 30 V40');
    resV(rcs, 120, 40, 80);
    txt(rcs, 146, 78, 'R', { fill: C.blue, size: 14, weight: 700, anchor: 'start' });
    txt(rcs, 146, 94, '10 kΩ', { fill: C.blue, size: 11, anchor: 'start' });
    wire(rcs, 'M120 120 V150 H330');
    S('circle', { cx: 120, cy: 150, r: 4.5, fill: C.wire }, rcs);
    S('circle', { cx: 220, cy: 150, r: 4.5, fill: C.wire }, rcs);
    txt(rcs, 104, 146, 'Vc', { fill: C.mint, size: 12, weight: 600, anchor: 'end' });
    S('rect', { x: 330, y: 136, width: 66, height: 28, rx: 7, fill: '#11606b' }, rcs);
    txt(rcs, 363, 155, 'D2', { fill: '#fff', size: 13, weight: 700 });
    txt(rcs, 363, 182, 'INPUT', { size: 10 });
    // capacitor
    wire(rcs, 'M120 150 V196 M120 206 V250'); gnd(rcs, 120, 250);
    wire(rcs, 'M98 196 H142 M98 206 H142', C.mint);
    txt(rcs, 150, 196, 'C', { fill: C.mint, size: 14, weight: 700, anchor: 'start' });
    txt(rcs, 150, 212, '1 µF', { fill: C.mint, size: 11, anchor: 'start' });
    // ramo do botão: 100 Ω + SW1
    wire(rcs, 'M220 150 V164');
    resV(rcs, 220, 164, 40, C.orange);
    txt(rcs, 246, 190, '100 Ω', { fill: C.orange, size: 11, anchor: 'start' });
    wire(rcs, 'M220 204 V216 M220 258 V266'); gnd(rcs, 220, 266);
    S('circle', { cx: 220, cy: 220, r: 4.5, fill: '#191426', stroke: C.wire, 'stroke-width': 2.5 }, rcs);
    S('circle', { cx: 220, cy: 254, r: 4.5, fill: '#191426', stroke: C.wire, 'stroke-width': 2.5 }, rcs);
    wire(rcs, 'M206 214 V260 M206 237 H192 M192 228 V246', C.text2);
    txt(rcs, 246, 242, 'SW1', { fill: C.text2, size: 12, weight: 600, anchor: 'start' });
    txt(rcs, 300, 230, 'aperta: C descarrega', { size: 10, anchor: 'start' });
    txt(rcs, 300, 244, 'pelo ramo de 100 Ω', { size: 10, anchor: 'start' });
    txt(rcs, 300, 70, 'solta: C carrega', { size: 10, anchor: 'start' });
    txt(rcs, 300, 84, 'por R (τ = R·C)', { size: 10, anchor: 'start' });
  }

  /* ---------------- Simulação do filtro RC ---------------- */
  const plot = document.getElementById('rcPlot');
  if (plot) {
    const RS = [1000, 2200, 4700, 10000, 22000, 47000];
    const CS = [0.1, 0.22, 0.47, 1, 2.2, 4.7];   // µF
    const VCC = 5, VIH = 3, VIL = 1.5, R2 = 100, T_END = 140, T_PRESS = 10, T_REL = 70, DT = 0.01;
    const iR = document.getElementById('rcR'), iC = document.getElementById('rcC'), iB = document.getElementById('rcB');
    const $ = id => document.getElementById(id);
    const ctx = plot.getContext('2d');
    const H0 = +plot.getAttribute('height');   // altura em CSS px, lida uma vez (o atributo muda com o DPR)
    let mode = 'rc', seed = 7, data = null;
    const nf = (x, d = 1) => x.toLocaleString('pt-BR', { maximumFractionDigits: d });
    const fmtR = r => r >= 1000 ? nf(r / 1000) + ' kΩ' : r + ' Ω';

    function contact(tb) {
      let s = seed;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      const ev = [];
      const bounce = (t0, target) => {
        let t = t0, closed = target;
        ev.push([t, closed]);
        while (t < t0 + tb) { t += 0.2 + rnd() * 1.3; closed = !closed; ev.push([t, closed]); }
        if (closed !== target) ev.push([t + 0.3, target]);
      };
      bounce(T_PRESS, true);
      bounce(T_REL, false);
      return ev;
    }
    function simulate() {
      const R = RS[+iR.value], Cuf = CS[+iC.value], tb = +iB.value;
      const ev = contact(tb);
      const tauOpen = R * Cuf * 1e-3;                          // Ω·µF = µs → ms
      const tauClosed = (R * R2 / (R + R2)) * Cuf * 1e-3;
      const vClosed = VCC * R2 / (R + R2);
      let V = VCC, dig = 1, k = 0, closed = false, falls = 0, back = null;
      const pts = [];
      for (let i = 0; i <= T_END / DT; i++) {
        const t = i * DT;
        while (k < ev.length && ev[k][0] <= t) closed = ev[k++][1];
        if (mode === 'raw') V = closed ? 0 : VCC;
        else {
          const target = closed ? vClosed : VCC, tau = closed ? tauClosed : tauOpen;
          V = target + (V - target) * Math.exp(-DT / tau);
        }
        if (dig && V < VIL) { dig = 0; falls++; }
        else if (!dig && V > VIH) { dig = 1; if (t >= T_REL) back = back === null ? t : back; }
        if (i % 10 === 0) pts.push([t, closed, V, dig]);
      }
      const rawFalls = ev.filter((e, j) => e[1] && (j === 0 || !ev[j - 1][1])).length;
      data = { pts, ev, R, Cuf, tb, tauOpen, falls, rawFalls, back, endDig: dig };
    }
    function fit() {
      const dpr = window.devicePixelRatio || 1, w = plot.clientWidth || 600, h = H0;
      plot.style.height = h + 'px'; plot.width = Math.round(w * dpr); plot.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    function draw() {
      const { w, h } = fit(), L = 96, Rm = 10, pw = w - L - Rm;
      const X = t => L + t / T_END * pw;
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = C.plot; ctx.fillRect(0, 0, w, h);
      ctx.font = '11px IBM Plex Mono, monospace';
      // faixas de trepidação e marcos
      const tbEnd = t0 => { const e = data.ev.filter(x => x[0] >= t0 && x[0] < t0 + 40); return e[e.length - 1][0]; };
      [[T_PRESS, 'aperta'], [T_REL, 'solta']].forEach(([t0, lab]) => {
        ctx.fillStyle = 'rgba(255,145,72,.08)'; ctx.fillRect(X(t0), 4, X(tbEnd(t0)) - X(t0) + 1, h - 26);
        ctx.fillStyle = C.orange; ctx.textAlign = 'left'; ctx.fillText(lab, X(t0) + 3, 14);
      });
      // eixo de tempo
      ctx.textAlign = 'center'; ctx.fillStyle = '#6d6585'; ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1;
      for (let t = 0; t <= T_END; t += 20) { ctx.beginPath(); ctx.moveTo(X(t), 20); ctx.lineTo(X(t), h - 20); ctx.stroke(); ctx.fillText(t + ' ms', X(t), h - 6); }
      const rows = { c: [24, 60], v: [80, 210], d: [226, 262] };
      ctx.textAlign = 'left'; ctx.fillStyle = C.text2;
      ctx.fillText('contato', 8, 46); ctx.fillText('tensão D2', 8, 148); ctx.fillText('leitura', 8, 248);
      const Yv = v => rows.v[1] - v / VCC * (rows.v[1] - rows.v[0]);
      // limiares
      [[VIH, 'VIH 3 V', C.orange], [VIL, 'VIL 1,5 V', C.blue]].forEach(([v, lab, col]) => {
        ctx.strokeStyle = col; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(L, Yv(v)); ctx.lineTo(L + pw, Yv(v)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = col; ctx.textAlign = 'right'; ctx.fillText(lab, L - 6, Yv(v) + 4);
      });
      ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('5 V', L - 6, Yv(5) + 4); ctx.fillText('0 V', L - 6, Yv(0) + 4);
      const line = (col, f) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        data.pts.forEach((p, i) => { const y = f(p); if (!i) ctx.moveTo(X(p[0]), y); else ctx.lineTo(X(p[0]), y); });
        ctx.stroke();
      };
      line(C.text2, p => p[1] ? rows.c[1] : rows.c[0]);
      line(C.mint, p => Yv(p[2]));
      line(C.orange, p => p[3] ? rows.d[0] : rows.d[1]);
      ctx.fillStyle = C.muted; ctx.textAlign = 'right';
      ctx.fillText('aberto', L - 6, rows.c[0] + 4); ctx.fillText('fechado', L - 6, rows.c[1] + 4);
      ctx.fillText('HIGH', L - 6, rows.d[0] + 4); ctx.fillText('LOW', L - 6, rows.d[1] + 4);
    }
    function update() {
      simulate(); draw();
      const d = data, tvih = 0.916 * d.tauOpen;
      $('rcRo').textContent = fmtR(d.R); $('rcCo').textContent = nf(d.Cuf, 2) + ' µF'; $('rcBo').textContent = d.tb + ' ms';
      $('rcTau').textContent = mode === 'raw' ? '—' : nf(d.tauOpen, 2) + ' ms';
      $('rcRaw').textContent = d.rawFalls;
      $('rcPin').textContent = d.falls;
      $('rcBack').textContent = mode === 'raw' ? '—' : d.back === null ? 'não voltou' : nf(d.back - T_REL, 1) + ' ms';
      const v = $('rcVerdict');
      if (mode === 'raw') v.innerHTML = `<span class="bad">Sem filtro, o pino segue o contato:</span> as ${d.rawFalls} bordas de descida do contato viram ${d.falls} apertos lidos.`;
      else if (d.back === null) v.innerHTML = `<span class="warn">Lento demais:</span> ${T_END - T_REL} ms depois de soltar, o pino ainda lê LOW. O capacitor leva ${nf(tvih, 1)} ms para chegar a 3 V e o botão parece “grudado”. Diminua R·C.`;
      else if (d.falls > 1) v.innerHTML = `<span class="bad">Ainda trepida:</span> ${d.falls} apertos lidos. O capacitor chega a 3 V em ${nf(tvih, 2)} ms, menos que a trepidação de ${d.tb} ms. Aumente R·C.`;
      else v.innerHTML = `<b>1 aperto lido.</b> O capacitor leva 0,92·τ = ${nf(tvih, 2)} ms para chegar a VIH, mais que a trepidação de ${d.tb} ms, e o pino volta a HIGH ${nf(d.back - T_REL, 1)} ms após soltar.`;
    }
    [iR, iC, iB].forEach(el => el.addEventListener('input', update));
    $('rcNew').addEventListener('click', () => { seed = (seed * 48271) % 2147483647; update(); });
    document.querySelectorAll('#rcMode button').forEach(b => b.addEventListener('click', () => {
      mode = b.dataset.v;
      document.querySelectorAll('#rcMode button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      update();
    }));
    if (window.ResizeObserver) { let lw = 0; new ResizeObserver(() => { if (Math.abs(plot.clientWidth - lw) > 1) { lw = plot.clientWidth; if (data) draw(); } }).observe(plot); }
    update();
  }

  /* ---------------- Copiar / baixar código ---------------- */
  const codeText = id => document.getElementById(id).textContent;
  function download(name, text, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', async () => {
    const t = codeText(b.dataset.copy);
    try { await navigator.clipboard.writeText(t); }
    catch (_) { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
    const old = b.textContent; b.textContent = 'Copiado!'; setTimeout(() => (b.textContent = old), 1400);
  }));
  document.querySelectorAll('[data-download]').forEach(b => b.addEventListener('click', () => download(b.dataset.name, codeText(b.dataset.download))));

  /* ---------------- Formulário ---------------- */
  const form = document.getElementById('labForm');
  if (!form) return;
  const KEY = `${CFG.labId || 'lab'}-rascunho`;
  const btnSend = document.getElementById('btnSend');
  const receipt = document.getElementById('receipt');
  const status = document.getElementById('formStatus');
  const endpoint = (CFG.endpoint || '').trim();

  if (!endpoint) {
    btnSend.disabled = true;
    status.hidden = false;
    status.textContent = 'O envio ainda não foi ativado pelo professor. Você já pode preencher (o rascunho fica salvo neste navegador) e baixar o PROCESSO.md.';
  }

  function collect() {
    const o = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox') o[el.name] = el.checked ? 'sim' : 'não';
      else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; else if (!(el.name in o)) o[el.name] = ''; }
      else o[el.name] = el.value.trim();
    }
    return o;
  }
  function restore() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (_) {}
    if (!d) return;
    for (const el of form.elements) {
      if (!el.name || !(el.name in d)) continue;
      if (el.type === 'checkbox') el.checked = d[el.name] === 'sim';
      else if (el.type === 'radio') el.checked = d[el.name] === el.value;
      else el.value = d[el.name];
    }
  }
  let saveT;
  form.addEventListener('input', () => {
    clearTimeout(saveT);
    saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(collect())); } catch (_) {} }, 400);
  });
  restore();

  const optText = (name, value) => {
    const el = form.querySelector(`input[name="${name}"][value="${value}"]`);
    return el ? el.parentElement.textContent.trim() : '—';
  };

  function markdown(d) {
    const L = (t) => (t && t !== 'não' ? t : '—');
    return `# PROCESSO.md — Lab 2 · Debounce

**Aluno:** ${L(d.nome)} · ${L(d.email)}
**Turma / grupo:** ${L(d.turma)} · ${L(d.grupo)}

## 1. Contextualizar
- **Objetivo:** ${L(d.ctx_objetivo)}
- **Comportamento esperado:** ${L(d.ctx_comportamento)}
- **Critério de aceitação:** ${L(d.ctx_criterio)}
- **Delegação à IA × feito sozinho:** ${L(d.ctx_delegacao)}

## 2. Consultar
- **Ferramenta:** ${L(d.con_ferramenta)}
- **Pergunta (exata):** ${L(d.con_pergunta)}
- **Resposta resumida:** ${L(d.con_resposta)}

## 3. Confrontar
- **Afirmação conferida:** ${L(d.conf_afirmacao)}
- **Fonte primária:** ${L(d.conf_fonte)}
- **Trecho / cálculo / resultado:** ${L(d.conf_trecho)}
- **Veredito:** ${L(d.conf_veredito)}
- **ADR:** ${L(d.conf_adr)}

## 4. Construir
- **10 apertos sem debounce (Parte A):** ${L(d.cons_sem)} contagens
- **10 apertos com debounce por software (Parte B):** ${L(d.cons_com)} contagens
- **10 apertos com filtro RC (Parte C):** ${L(d.cons_rc_cont)} contagens
- **Filtro RC montado:** ${L(d.cons_rc)}
- **Partes B e C funcionando:** ${d.cons_funciona}

## 5. Comprovar (sem IA)
1. **τ com 10 kΩ e 1 µF:** ${L(d.comp_tau)} ms — cálculo: ${L(d.comp_tau_calc)}
2. **Causa das contagens extras:** ${d.comp_bounce ? optText('comp_bounce', d.comp_bounce) : '—'} — ${L(d.comp_bounce_just)}
3. **Tempo até VIH = 3 V:** ${L(d.comp_tvih)} ms — cálculo: ${L(d.comp_tvih_calc)}
4. **Menor capacitor para trepidação de 15 ms:** ${d.comp_cap ? optText('comp_cap', d.comp_cap) : '—'}

Declaro que respondi a etapa Comprovar sem IA: ${d.decl_sem_ia}
`;
  }
  document.getElementById('btnMd').addEventListener('click', () => download('PROCESSO.md', markdown(collect()), 'text/markdown'));
  document.getElementById('btnClear').addEventListener('click', () => {
    if (!confirm('Apagar todas as respostas deste formulário?')) return;
    form.reset(); form.classList.remove('was-validated'); receipt.hidden = true;
    try { localStorage.removeItem(KEY); } catch (_) {}
  });

  function show(kind, html) {
    receipt.hidden = false;
    receipt.className = 'receipt' + (kind === 'err' ? ' err' : '');
    receipt.innerHTML = html;
    receipt.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  async function post(payload) {
    const body = JSON.stringify(payload);
    try {
      const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, redirect: 'follow' });
      return await r.json();
    } catch (_) {
      // Sem resposta legível (CORS): reenvia sem leitura; o servidor ignora IDs repetidos.
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
      return { ok: true, unconfirmed: true, id: payload.id };
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!endpoint) return;
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      const first = form.querySelector(':invalid');
      show('err', 'Há campos obrigatórios em branco ou inválidos (destacados em vermelho).');
      if (first) { first.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(() => first.focus({ preventScroll: true }), 400); }
      return;
    }
    const payload = Object.assign(collect(), { id: uid(), labId: CFG.labId || 'lab-2' });
    btnSend.disabled = true; btnSend.textContent = 'Enviando…';
    try {
      const res = await post(payload);
      if (!res.ok) throw new Error(res.error || 'erro desconhecido');
      const quando = new Date().toLocaleString('pt-BR');
      show('ok', res.unconfirmed
        ? `<b>Respostas enviadas</b> em ${quando}. O navegador não conseguiu ler a confirmação; se tiver dúvida, avise o professor e informe o código <span class="mono">${payload.id.slice(0, 8)}</span>.`
        : `<b>Respostas recebidas!</b> ${quando} · código <span class="mono">${(res.id || payload.id).slice(0, 8)}</span>.<br>Você pode reenviar se precisar corrigir algo: vale o último envio.`);
    } catch (err) {
      show('err', `<b>Não foi possível enviar.</b> ${err.message}. Suas respostas continuam salvas neste navegador; tente de novo em instantes.`);
    } finally {
      btnSend.disabled = false; btnSend.textContent = 'Enviar respostas';
    }
  });
})();
