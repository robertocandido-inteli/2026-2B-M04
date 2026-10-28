/* Lab 3 — esquema de ligação, realce dos códigos e formulário de entrega */
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
  const dot = (g, x, y, col) => S('circle', { cx: x, cy: y, r: 4.5, fill: col || C.wire }, g);
  const pin = (g, x, y, label, side) => {
    S('rect', { x: x - 4, y: y - 4, width: 8, height: 8, fill: '#ddd' }, g);
    txt(g, side === 'left' ? x + 10 : x - 10, y + 4, label, { fill: '#fff', size: 11.5, anchor: side === 'left' ? 'start' : 'end', weight: 600 });
  };

  /* ---------------- Esquema de ligação ---------------- */
  const svg = document.getElementById('schematic');
  if (svg) {
    const P5 = C.orange, PG = C.wire, PT = C.mint, PE = C.yellow, PD = C.blue;

    // Arduino Uno
    S('rect', { x: 20, y: 30, width: 150, height: 300, rx: 12, fill: '#11606b', stroke: '#0c4a53', 'stroke-width': 2 }, svg);
    txt(svg, 78, 180, 'UNO', { fill: 'rgba(255,255,255,.6)', size: 22, weight: 700 });
    txt(svg, 78, 202, 'U1', { fill: 'rgba(255,255,255,.5)', size: 12 });
    [['5V', 70], ['GND', 110], ['D9', 160], ['D10', 200], ['A4 SDA', 280], ['A5 SCL', 310]].forEach(([n, y]) => pin(svg, 170, y, n, 'right'));

    // HC-SR04
    S('rect', { x: 430, y: 30, width: 170, height: 130, rx: 10, fill: '#1d5fa8', stroke: '#164a85', 'stroke-width': 2 }, svg);
    [490, 560].forEach(cx => { S('circle', { cx, cy: 80, r: 22, fill: '#c9ccd3', stroke: '#8d9099', 'stroke-width': 3 }, svg); S('circle', { cx, cy: 80, r: 12, fill: '#55585f' }, svg); });
    txt(svg, 525, 140, 'HC-SR04 · U2', { fill: 'rgba(255,255,255,.75)', size: 11.5, weight: 600 });
    [['VCC', 50], ['TRIG', 80], ['ECHO', 110], ['GND', 140]].forEach(([n, y]) => pin(svg, 430, y, n, 'left'));

    // LCD 16x2 I2C
    S('rect', { x: 400, y: 200, width: 200, height: 140, rx: 10, fill: '#2a6b3a', stroke: '#1f5230', 'stroke-width': 2 }, svg);
    S('rect', { x: 470, y: 224, width: 116, height: 50, rx: 4, fill: '#2e5fd6', stroke: '#1d3f96', 'stroke-width': 2 }, svg);
    txt(svg, 528, 245, 'Dist: 20 cm', { fill: '#fff', size: 11, weight: 600 });
    txt(svg, 528, 262, 'Sensor: OK', { fill: '#fff', size: 11, weight: 600 });
    txt(svg, 528, 316, 'LCD 16×2 I²C · U3', { fill: 'rgba(255,255,255,.75)', size: 11.5, weight: 600 });
    [['GND', 230], ['VCC', 260], ['SDA', 290], ['SCL', 320]].forEach(([n, y]) => pin(svg, 400, y, n, 'left'));

    // 5 V (trilho em x = 220)
    wire(svg, 'M174 70 H220 M220 50 V260 M220 50 H426 M220 260 H396', P5);
    dot(svg, 220, 70, P5);
    // GND (trilho em x = 245)
    wire(svg, 'M174 110 H245 M245 110 V230 M245 140 H426 M245 230 H396', PG);
    dot(svg, 245, 140, PG);
    // TRIG e ECHO
    wire(svg, 'M174 160 H300 V80 H426', PT);
    wire(svg, 'M174 200 H330 V110 H426', PE);
    // SDA e SCL
    wire(svg, 'M174 280 H190 V290 H396', PD);
    wire(svg, 'M174 310 H205 V320 H396', PD);

    txt(svg, 362, 72, 'TRIG', { fill: PT, size: 10.5, weight: 600 });
    txt(svg, 380, 102, 'ECHO', { fill: PE, size: 10.5, weight: 600 });
    txt(svg, 330, 284, 'SDA', { fill: PD, size: 10.5, weight: 600 });
    txt(svg, 330, 314, 'SCL', { fill: PD, size: 10.5, weight: 600 });
    txt(svg, 330, 44, '5 V', { fill: P5, size: 10.5, weight: 600 });
    txt(svg, 330, 224, 'GND', { fill: PG, size: 10.5, weight: 600 });
  }

  /* ---------------- Realce dos códigos ---------------- */
  const KW = 'const|unsigned|long|int|void|bool|char|if|else|return|while|true|false|uint8_t|uint16_t|HIGH|LOW|OUTPUT|INPUT|WDTO_2S|MCUSR';
  const TOK = new RegExp(`(\\/\\/[^\\n]*)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|(#include)|\\b(0x[0-9A-Fa-f]+|\\d+)\\b|\\b(${KW})\\b|\\b([A-Za-z_]\\w*)(?=\\()`, 'g');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function highlight(src) {
    let out = '', last = 0, m;
    TOK.lastIndex = 0;
    while ((m = TOK.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? 'tok-c' : m[2] ? 'tok-s' : m[3] ? 'tok-k' : m[4] ? 'tok-n' : m[5] ? 'tok-k' : 'tok-f';
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = TOK.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  document.querySelectorAll('pre.code-pre[id]').forEach(pre => { pre.innerHTML = highlight(pre.textContent); });

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
    const O = (n) => (d[n] ? optText(n, d[n]) : '—');
    return `# PROCESSO.md — Lab 3 · Falhas e watchdog

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
- **Parte A · volta do loop, sensor funcionando:** ${L(d.cons_volta_ok)} ms
- **Parte A · volta do loop, TRIG solto:** ${L(d.cons_volta_solto)} ms
- **Parte A · LCD religado:** ${L(d.cons_lcd_a)}
- **Parte B · 1º W SENSOR → E SENSOR:** ${L(d.cons_tempo_falha)} ms
- **Parte C · boots antes/depois do teste t:** ${L(d.cons_boots)}
- **Parte C · wdt_reset() dentro do while:** ${L(d.cons_wdt_errado)}
- **Repositório:** ${L(d.cons_repo)}
- **Parte B · falha do sensor detectada e recuperada:** ${d.cons_sensor}
- **Parte B · LCD recuperado sem reset:** ${d.cons_lcd}
- **Parte C · reset pelo watchdog:** ${d.cons_wdt}

## 5. Comprovar (sem IA)
1. **Por que char buf[17]:** ${O('comp_buf')} — ${L(d.comp_buf_just)}
2. **Maior distância com timeout de 30 000 µs:** ${L(d.comp_dist)} cm — cálculo: ${L(d.comp_dist_calc)}
3. **1ª suspeita → falha confirmada:** ${L(d.comp_tfalha)} ms — cálculo: ${L(d.comp_tfalha_calc)}
4. **wdt_reset() dentro do while:** ${O('comp_wdt')} — ${L(d.comp_wdt_just)}
5. **Parte A + WDTO_500MS com o TRIG solto:** ${O('comp_transf')} — correção: ${L(d.comp_transf_just)}

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
    const payload = Object.assign(collect(), { id: uid(), labId: CFG.labId || 'lab-3' });
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
