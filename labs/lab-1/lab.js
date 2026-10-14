/* Lab 1 — esquema interativo, blocos de código e formulário de entrega */
(function () {
  const CFG = window.LAB_CONFIG || {};
  const NS = 'http://www.w3.org/2000/svg';
  const C = { wire: '#8c84a3', text2: '#dedde6', muted: '#a9a3bd', mint: '#80e6c6', orange: '#ff9148', blue: '#7caaff', red: '#ff5d5d' };

  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); }
    if (parent) parent.appendChild(e);
    return e;
  }
  const wire = (g, d, col) => S('path', { d, fill: 'none', stroke: col || C.wire, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
  const txt = (g, x, y, t, o = {}) => S('text', { x, y, text: t, fill: o.fill || C.muted, 'font-size': o.size || 13, 'text-anchor': o.anchor || 'middle', 'font-family': 'IBM Plex Mono, monospace', 'font-weight': o.weight || 500 }, g);
  const gnd = (g, x, y) => wire(g, `M${x - 14} ${y} H${x + 14} M${x - 8} ${y + 6} H${x + 8} M${x - 3} ${y + 12} H${x + 3}`);

  /* ---------------- Esquema elétrico ---------------- */
  const svg = document.getElementById('schematic');
  if (svg) {
    const defs = S('defs', {}, svg);
    const grad = S('radialGradient', { id: 'ledGlow' }, defs);
    S('stop', { offset: 0, 'stop-color': C.red, 'stop-opacity': 0.95 }, grad);
    S('stop', { offset: 0.5, 'stop-color': C.red, 'stop-opacity': 0.3 }, grad);
    S('stop', { offset: 1, 'stop-color': C.red, 'stop-opacity': 0 }, grad);

    // Arduino
    S('rect', { x: 20, y: 30, width: 150, height: 240, rx: 12, fill: '#11606b', stroke: '#0c4a53', 'stroke-width': 2 }, svg);
    txt(svg, 80, 160, 'UNO', { fill: 'rgba(255,255,255,.6)', size: 22, weight: 700 });
    txt(svg, 80, 182, 'U1', { fill: 'rgba(255,255,255,.5)', size: 12 });
    [['D8', 200], ['GND', 250]].forEach(([n, y]) => {
      S('rect', { x: 164, y: y - 4, width: 8, height: 8, fill: '#ddd' }, svg);
      txt(svg, 156, y + 4, n, { fill: '#fff', size: 12, anchor: 'end', weight: 600 });
    });
    wire(svg, 'M172 250 H200 V258'); gnd(svg, 200, 258);

    // Forma de onda do pino D8 (200 ms em HIGH a cada 2 s)
    txt(svg, 340, 52, 'D8 · 2 ciclos', { fill: C.mint, size: 12, weight: 600 });
    txt(svg, 238, 84, 'HIGH', { size: 10, anchor: 'end' }); txt(svg, 238, 124, 'LOW', { size: 10, anchor: 'end' });
    const X0 = 246, W = 230, per = W / 2, on = per * 0.1;
    let wd = `M${X0} 120`;
    for (let k = 0; k < 2; k++) { const s = X0 + k * per; wd += ` H${s} V80 H${s + on} V120 H${s + per}`; }
    wire(svg, wd, C.mint);
    txt(svg, X0 + on / 2, 72, '200 ms', { size: 10, fill: C.orange });
    txt(svg, X0 + (on + per) / 2, 140, '1800 ms', { size: 10 });
    const cursor = S('line', { x1: X0, y1: 70, x2: X0, y2: 128, stroke: C.text2, 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, svg);

    // LED com resistor no D8
    wire(svg, 'M172 200 H250 M330 200 H370 M410 200 H450 V215');
    gnd(svg, 450, 215);
    S('path', { d: 'M250 200 l5 -10 l10 20 l10 -20 l10 20 l10 -20 l10 20 l10 -20 l10 20 l5 -10', fill: 'none', stroke: C.blue, 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
    txt(svg, 290, 180, 'R1 · 220 Ω', { fill: C.blue, size: 12, weight: 600 });
    const halo = S('circle', { cx: 390, cy: 200, r: 40, fill: 'url(#ledGlow)', opacity: 0 }, svg);
    wire(svg, 'M370 200 H378 M402 200 H410');
    const body = S('path', { d: 'M378 187 L402 200 L378 213 Z', fill: C.red, 'fill-opacity': 0.25, stroke: C.red, 'stroke-width': 2.5, 'stroke-linejoin': 'round' }, svg);
    S('line', { x1: 402, y1: 186, x2: 402, y2: 214, stroke: C.red, 'stroke-width': 3.5 }, svg);
    S('path', { d: 'M392 183 l9 -9 m-5 0 h5 v5 M400 187 l9 -9 m-5 0 h5 v5', stroke: C.red, 'stroke-width': 2, fill: 'none' }, svg);
    txt(svg, 390, 236, 'LED1', { fill: C.red, size: 12, weight: 600 });
    txt(svg, 378, 176, 'A', { size: 11 }); txt(svg, 404, 176, 'K', { size: 11 });

    const hint = document.getElementById('schemHint');
    const t0 = performance.now();
    (function loop(now) {
      const ms = (now - t0) % 2000, lit = ms < 200;
      halo.setAttribute('opacity', lit ? 1 : 0);
      body.setAttribute('fill-opacity', lit ? 1 : 0.25);
      const x = X0 + ((now - t0) % 4000) / 4000 * W;
      cursor.setAttribute('x1', x); cursor.setAttribute('x2', x);
      hint.textContent = `${lit ? 'Aceso' : 'Apagado'} · ${(ms / 1000).toFixed(1).replace('.', ',')} s do ciclo de 2 s (200 ms aceso + 1800 ms apagado).`;
      requestAnimationFrame(loop);
    })(t0);
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

  // validações específicas
  const wokwi = form.elements.cons_wokwi;
  const checkWokwi = () => wokwi.setCustomValidity(!wokwi.value || /wokwi\.com\/projects\/[\w-]+/i.test(wokwi.value) ? '' : 'Use o link do projeto salvo no Wokwi (wokwi.com/projects/…).');
  wokwi.addEventListener('input', checkWokwi); checkWokwi();

  const optText = (name, value) => {
    const el = form.querySelector(`input[name="${name}"][value="${value}"]`);
    return el ? el.parentElement.textContent.trim() : '—';
  };

  function markdown(d) {
    const L = (t) => (t && t !== 'não' ? t : '—');
    return `# PROCESSO.md — Lab 1 · Pisca-LED

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
- **Trecho / cálculo:** ${L(d.conf_trecho)}
- **Veredito:** ${L(d.conf_veredito)}
- **ADR:** ${L(d.conf_adr)}

## 4. Construir
- **Wokwi:** ${L(d.cons_wokwi)}
- **Repositório / commit:** ${L(d.cons_repo)}
- **Ciclo medido:** ${L(d.cons_ciclo)} s
- **Corrente calculada com 220 Ω:** ${L(d.cons_corrente220)} mA
- **Projeto funcionando:** ${d.cons_funciona}

## 5. Comprovar (sem IA)
1. **Corrente com 330 Ω:** ${L(d.comp_i330)} mA — cálculo: ${L(d.comp_i330_calc)}
2. **Resistor de 0 Ω:** ${d.comp_zero ? optText('comp_zero', d.comp_zero) : '—'} — ${L(d.comp_zero_just)}
3. **LED no pino 12:** ${d.comp_pino12 ? optText('comp_pino12', d.comp_pino12) : '—'}
4. **TEMPO_APAGADO para 500 ms a cada 3 s:** ${L(d.comp_transfer)} ms

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
    const payload = Object.assign(collect(), { id: uid(), labId: CFG.labId || 'lab-1' });
    btnSend.disabled = true; btnSend.textContent = 'Enviando…';
    try {
      const res = await post(payload);
      if (!res.ok) throw new Error(res.error || 'erro desconhecido');
      const quando = new Date().toLocaleString('pt-BR');
      show('ok', res.unconfirmed
        ? `<b>Respostas enviadas</b> em ${quando}. O navegador não conseguiu ler a confirmação; se tiver dúvida, avise o professor e informe o código <span class="mono">${payload.id.slice(0, 8)}</span>.`
        : `<b>Respostas recebidas!</b> ${quando} · código <span class="mono">${(res.id || payload.id).slice(0, 8)}</span>.<br>Você pode reenviar se precisar corrigir algo: vale o último envio. Não esqueça de versionar o PROCESSO.md no repositório do grupo.`);
    } catch (err) {
      show('err', `<b>Não foi possível enviar.</b> ${err.message}. Suas respostas continuam salvas neste navegador; tente de novo em instantes.`);
    } finally {
      btnSend.disabled = false; btnSend.textContent = 'Enviar respostas';
    }
  });
})();
