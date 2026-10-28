/* ==========================================================
   Simulações — memória e ponteiros.
   Usa os utilitários publicados em window.KIT por kit.js.
   ========================================================== */
(function () {
  const { C, S, $, $$, out, inp, act, clamp, fmt, stageOf, txt, canvas2d, seg, pill, toggleBtn, renderCode } = window.KIT;
  const hex = (n, d = 8) => '0x' + (n >>> 0).toString(16).toUpperCase().padStart(d, '0');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const flash = el => { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); };

  // ---------- heap: blocos {start, size, cls, label} em unidades ----------
  function heapSegs(total, blocks) {
    const segs = []; let p = 0;
    blocks.slice().sort((a, b) => a.start - b.start).forEach(b => {
      if (b.start > p) segs.push({ start: p, size: b.start - p, free: true });
      segs.push(b); p = b.start + b.size;
    });
    if (p < total) segs.push({ start: p, size: total - p, free: true });
    return segs;
  }
  const largestFree = (total, blocks) => Math.max(0, ...heapSegs(total, blocks).filter(s => s.free).map(s => s.size));
  const freeTotal = (total, blocks) => total - blocks.reduce((a, b) => a + b.size, 0);
  function firstFit(total, blocks, size) {
    const s = heapSegs(total, blocks).find(s => s.free && s.size >= size);
    return s ? s.start : -1;
  }
  function renderHeap(el, total, blocks, freeLabel) {
    const segs = heapSegs(total, blocks), big = largestFree(total, blocks);
    el.innerHTML = segs.map(s => s.free
      ? `<span class="free${s.size === big ? ' big' : ''}" style="flex-grow:${s.size}">${freeLabel(s.size)}</span>`
      : `<span class="${s.cls}${s.isNew ? ' new' : ''}" style="flex-grow:${s.size}">${s.label || ''}</span>`).join('');
    blocks.forEach(b => { b.isNew = false; });
  }

  // motor de passos para simulações “Executar / Passo”
  function stepper(root, n, draw, period = 1.6) {
    const playBtn = act(root, 'play');
    let k = 0, playing = false, acc = 0;
    const step = () => { k = (k + 1) % n(); draw(k); };
    playBtn.addEventListener('click', () => { playing = !playing; toggleBtn(playBtn, playing, ['Pausar', 'Executar']); acc = 0; });
    act(root, 'step', () => { if (playing) playBtn.click(); step(); });
    return {
      reset() { k = 0; draw(0); },
      get k() { return k; },
      tick(dt) { if (playing) { acc += dt; if (acc > period) { acc = 0; step(); } } },
      pause() { if (playing) playBtn.click(); }
    };
  }

  /* ======================================================
     2. Estática, stack e heap
     ====================================================== */
  SIMS.memmap = root => {
    const svg = stageOf(root), codeEl = out(root, 'code');
    const LINES = [
      'const char NOME[] = "estacao-01";',
      'int leituras = 0;',
      'float media;',
      'void loop() {',
      '  static int chamadas = 0;',
      '  float t = lerTemp();',
      '  char linha[32];',
      '  int* v = new int[50];',
      '  String msg = "T=" + String(t);',
      '  delete[] v;',
      '}'
    ];
    const INFO = [
      { r: { cst: 'NOME · 11 B' }, d: '<b>Constante global</b>: no ESP32 fica na Flash e não gasta RAM. No Uno ela iria para a RAM, a menos que se use <code>PROGMEM</code> ou <code>F()</code>.' },
      { r: { st: 'leituras · 4 B' }, d: '<b>Global inicializada</b> (.data): o valor inicial é copiado da Flash para a RAM no boot. Existe do começo ao fim do programa.' },
      { r: { st: 'media · 4 B' }, d: '<b>Global sem valor inicial</b> (.bss): zerada no boot. Também vive o tempo todo.' },
      { r: { code: 'loop()' }, d: 'O <b>código</b> das funções fica na Flash (.text). A CPU busca as instruções de lá.' },
      { r: { st: 'chamadas · 4 B' }, d: '<b>static local</b>: mora na memória estática, como uma global, mas só é visível dentro de loop(). É inicializada uma única vez.' },
      { r: { stk: 't · 4 B' }, d: '<b>Variável local</b>: criada na stack ao entrar na função e descartada ao sair. Não custa nada gerenciar.' },
      { r: { stk: 'linha[32] · 32 B' }, d: 'Array local: 32 bytes na stack. Cuidado com arrays locais grandes: a tarefa do loop() no ESP32 tem só 8 KB de stack.' },
      { r: { stk: 'v · 4 B', heap: 'int[50] · 200 B' }, arrow: true, d: 'O ponteiro <b>v</b> (4 bytes) está na stack; os 200 bytes estão no <b>heap</b>. Se o <code>delete</code> for esquecido, eles nunca voltam.' },
      { r: { stk: 'msg · objeto', heap: '"T=23.40"' }, arrow: true, d: 'O objeto String fica na stack, mas o texto vai para o <b>heap</b>, alocado e realocado em tempo de execução.' },
      { r: { heap: '200 B devolvidos' }, d: '<code>delete[]</code> devolve os 200 bytes ao heap. Alocar e liberar em ordens variadas é o que fragmenta o heap.' },
      { r: { stk: 'quadro descartado' }, d: 'Fim da função: t, linha, v e msg deixam de existir (o destrutor de msg libera o texto). NOME, leituras, media e chamadas continuam.' }
    ];
    const REG = {};
    function region(k, x, y, w, h, label, col, dashed) {
      const g = S('g', {}, svg);
      const rect = S('rect', { x, y, width: w, height: h, rx: 7, fill: col, 'fill-opacity': 0.06, stroke: C.border, 'stroke-width': 2, ...(dashed ? { 'stroke-dasharray': '6 5' } : {}) }, g);
      txt(g, x + 8, y + 16, label, { anchor: 'start', size: 11, fill: C.text2 });
      const chip = txt(g, x + w / 2, y + h / 2 + 12, '', { size: 11.5, weight: 700, fill: col });
      REG[k] = { rect, chip, col };
    }
    txt(svg, 65, 16, 'Flash', { size: 12, weight: 600, fill: C.blue });
    txt(svg, 222, 16, 'SRAM', { size: 12, weight: 600, fill: C.mint });
    S('rect', { x: 6, y: 26, width: 118, height: 324, rx: 10, fill: 'none', stroke: C.surf3, 'stroke-width': 2 }, svg);
    S('rect', { x: 132, y: 26, width: 182, height: 324, rx: 10, fill: 'none', stroke: C.surf3, 'stroke-width': 2 }, svg);
    region('code', 12, 34, 106, 182, '.text (código)', C.blue);
    region('cst', 12, 222, 106, 120, '.rodata', C.blue);
    region('st', 138, 34, 170, 72, '.data/.bss · estática', C.mint);
    region('heap', 138, 112, 170, 86, 'heap ↓ (new, malloc)', C.orange);
    region('free', 138, 204, 170, 40, '', C.wire, true);
    txt(svg, 223, 228, '↓ livre ↑', { size: 11, fill: C.muted });
    region('stk', 138, 250, 170, 92, 'stack ↑ (locais)', C.yellow);
    const arrow = S('g', { opacity: 0 }, svg);
    S('path', { d: 'M300 262 C 326 250, 326 200, 302 190', fill: 'none', stroke: C.orange, 'stroke-width': 2.5 }, arrow);
    S('path', { d: 'M302 190 l 9 -1 l -4 8 z', fill: C.orange }, arrow);
    let cur = 0;
    function show(i) {
      cur = i;
      renderCode(codeEl, LINES, i);
      $$(codeEl, '.ln').forEach((ln, j) => ln.addEventListener('click', () => show(j)));
      const inf = INFO[i];
      for (const k in REG) {
        const on = k in inf.r;
        REG[k].rect.setAttribute('stroke', on ? REG[k].col : C.border);
        REG[k].rect.setAttribute('fill-opacity', on ? 0.2 : 0.06);
        REG[k].chip.textContent = inf.r[k] || '';
      }
      arrow.setAttribute('opacity', inf.arrow ? 1 : 0);
      out(root, 'desc', inf.d);
    }
    act(root, 'next', () => show((cur + 1) % LINES.length));
    show(0);
    return {};
  };

  /* ======================================================
     3. Locais, globais e static
     ====================================================== */
  SIMS.scope = root => {
    const codeEl = out(root, 'code'), logEl = out(root, 'log');
    const LINES = [
      'int total = 0;                // global',
      'void contar() {',
      '  int local = 0;              // recriada a cada chamada',
      '  static int vezes = 0;       // inicializada uma só vez',
      '  local++; vezes++; total++;',
      '  Serial.printf("local=%d vezes=%d total=%d\\n",',
      '                local, vezes, total);',
      '}',
      'void outra() { total = 999; } // qualquer função altera'
    ];
    let total = 0, vezes = 0, life = 0;
    const box = k => out(root, k);
    function log(cls, h) { logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${h}</div>`); logEl.scrollTop = logEl.scrollHeight; }
    function hot(keys) { ['bTotal', 'bLocal', 'bVezes'].forEach(k => box(k).classList.toggle('hot', keys.includes(k))); }
    function vals(local) {
      out(root, 'vTotal', total); out(root, 'vVezes', vezes);
      out(root, 'vLocal', local === null ? '—' : local);
      box('bLocal').classList.toggle('gone', local === null);
    }
    act(root, 'call', () => {
      vezes++; total++; life = 1.4;
      vals(1); hot(['bTotal', 'bLocal', 'bVezes']);
      renderCode(codeEl, LINES, [2, 3, 4]);
      log('ok', `local=1 vezes=${vezes} total=${total}`);
      out(root, 'desc', `<b>local</b> nasceu valendo 0 e terminou em 1, como sempre. <b>vezes</b> lembra as ${vezes} chamada${vezes > 1 ? 's' : ''}. Ao sair da função, local deixa de existir.`);
    });
    act(root, 'other', () => {
      total = 999; hot(['bTotal']);
      renderCode(codeEl, LINES, [8]);
      log('warn', 'outra(): total = 999');
      out(root, 'desc', 'Uma global pode ser alterada por <b>qualquer função</b>, em qualquer arquivo. Quando ela assume um valor errado, é difícil descobrir quem mudou.');
      vals(null);
    });
    act(root, 'reset', () => {
      total = 0; vezes = 0; life = 0; hot([]);
      renderCode(codeEl, LINES, [0]);
      log('dim', '--- reset: globais e static voltam ao valor inicial ---');
      out(root, 'desc', 'Um reset reinicia toda a RAM: as variáveis estáticas são recriadas com o valor inicial.');
      vals(null);
    });
    renderCode(codeEl, LINES, []);
    vals(null);
    log('dim', '// clique em contar() algumas vezes');
    out(root, 'desc', 'Três variáveis, três tempos de vida diferentes.');
    return {
      tick(dt) { if (life > 0) { life -= dt; if (life <= 0) { vals(null); hot([]); } } }
    };
  };

  /* ======================================================
     4. Heap e fragmentação
     ====================================================== */
  SIMS.heap = root => {
    const TOTAL = 32, heapEl = out(root, 'heap');
    let blocks = [], id = 0, msg = '';
    function alloc(size) {
      const st = firstFit(TOTAL, blocks, size);
      if (st < 0) return false;
      blocks.push({ start: st, size, cls: 'h' + (id++ % 3), label: size + 'K', isNew: true });
      return true;
    }
    function render() {
      renderHeap(heapEl, TOTAL, blocks, s => s >= 2 ? s + 'K' : '');
      const fr = freeTotal(TOTAL, blocks), big = largestFree(TOTAL, blocks);
      out(root, 'free', fr + ' KB'); out(root, 'big', big + ' KB');
      out(root, 'frag', fr ? Math.round((1 - big / fr) * 100) + ' %' : '–');
      out(root, 'msg', msg);
    }
    function reset() { blocks = []; id = 0; [3, 2, 4, 1, 2].forEach(alloc); msg = 'Cada bloco colorido é uma alocação. Os tracejados são espaço livre.'; render(); }
    act(root, 'alloc', () => {
      const size = 1 + Math.floor(Math.random() * 4);
      msg = alloc(size) ? `malloc(${size} KB) → bloco no primeiro espaço livre que coube.` : `<span class="c-red">malloc(${size} KB) devolveu nullptr</span>: nenhum espaço contínuo de ${size} KB.`;
      render();
    });
    act(root, 'free', () => {
      if (!blocks.length) { msg = 'Nada para liberar.'; render(); return; }
      const b = blocks.splice(Math.floor(Math.random() * blocks.length), 1)[0];
      msg = `free(): ${b.size} KB devolvidos. Blocos livres vizinhos se juntam; separados, não.`;
      render();
    });
    act(root, 'frag', () => {
      blocks = []; id = 0;
      for (let i = 0; i < 16; i++) alloc(2);
      blocks = blocks.filter((b, i) => i % 2);
      msg = '16 blocos de 2 KB alocados e liberados um sim, um não: <b>metade do heap livre</b>, mas em pedaços de 2 KB.';
      render();
    });
    act(root, 'big', () => {
      const fr = freeTotal(TOTAL, blocks);
      if (alloc(6)) msg = 'malloc(6 KB) funcionou: havia um bloco contínuo de 6 KB.';
      else msg = `<span class="c-red">malloc(6 KB) devolveu nullptr</span>: há <b>${fr} KB livres</b>, mas o maior bloco contínuo tem ${largestFree(TOTAL, blocks)} KB.`;
      render(); if (msg.includes('nullptr')) flash(out(root, 'msg'));
    });
    act(root, 'reset', reset);
    reset();
    return {};
  };

  /* ======================================================
     5. String e concatenação
     ====================================================== */
  SIMS.strcat = root => {
    const TOTAL = 192, heapEl = out(root, 'heap'), codeEl = out(root, 'code');
    const F = [['T=', '23.40'], [';U=', '55'], [';P=', '1013'], [';L=', '812'], [';B=', '3.71'], [';ID=', 'est01']];
    const NAMES = ['t', 'u', 'p', 'luz', 'bat', 'id'];
    const CODE = {
      plus: ['String msg = "";', ...F.map((f, i) => `msg += "${f[0]}" + String(${NAMES[i]});`), '// cada linha cria 2 Strings temporárias'],
      reserve: ['String msg;', 'msg.reserve(64);            // uma alocação, no início', ...F.map((f, i) => `msg += "${f[0]}"; msg += ${NAMES[i]};`)],
      buf: ['char msg[64];               // stack ou global: sem heap', 'snprintf(msg, sizeof(msg),', '  "T=%.2f;U=%d;P=%d;L=%d;B=%.2f;ID=%s",', '  t, u, p, luz, bat, id);', '// zero alocações, tamanho conhecido']
    };
    let mode = 'plus', blocks, msgB, txtS, allocs, copied, k, playing = false, acc = 0;
    const playBtn = act(root, 'play');
    const nSteps = () => mode === 'buf' ? 2 : F.length * 2 + 1;
    function freeAfter(end) {
      const nx = blocks.filter(b => b.start >= end).map(b => b.start);
      return (nx.length ? Math.min(...nx) : TOTAL) - end;
    }
    function alloc(size, cls, label) {
      const st = firstFit(TOTAL, blocks, size);
      if (st < 0) return null;
      const b = { start: st, size, cls, label, isNew: true };
      blocks.push(b); allocs++;
      return b;
    }
    function realloc(b, size) {
      allocs++;
      if (b.size + freeAfter(b.start + b.size) >= size) { b.size = size; return 0; }
      // o bloco antigo continua ocupado enquanto o novo é procurado (os dados ainda serão copiados)
      const st = firstFit(TOTAL, blocks, size);
      if (st < 0) return 0;
      const moved = b.size - 1;
      b.start = st; b.size = size; b.isNew = true;
      copied += moved;
      return moved;
    }
    function reset() {
      blocks = [{ start: 96, size: 20, cls: 'sys', label: 'Wi‑Fi' }];
      msgB = null; txtS = ''; allocs = 0; copied = 0; k = 0;
      if (mode === 'reserve') { msgB = alloc(65, 'h0', 'msg (64)'); }
      renderCode(codeEl, CODE[mode], []);
      out(root, 'desc', {
        plus: 'Cada <code>+</code> e cada <code>String()</code> pede memória ao heap, copia bytes e devolve. Clique em Executar.',
        reserve: '<code>reserve()</code> reserva espaço uma vez; os <code>+=</code> seguintes escrevem no mesmo bloco.',
        buf: 'Um <code>char[]</code> de tamanho fixo e <code>snprintf()</code> montam a linha sem tocar no heap.'
      }[mode]);
      draw();
    }
    function draw() {
      renderHeap(heapEl, TOTAL, blocks, s => s >= 14 ? s + ' B' : '');
      out(root, 'msg', `<span class="muted">msg =</span> "${esc(txtS)}"`);
      out(root, 'allocs', allocs); out(root, 'copied', copied);
      out(root, 'big', largestFree(TOTAL, blocks) + ' B');
    }
    function step() {
      if (k >= nSteps() - 1) { reset(); return; }
      if (mode === 'buf') {
        txtS = F.map(f => f[0] + f[1]).join(''); copied += txtS.length + 1;
        renderCode(codeEl, CODE.buf, [1, 2, 3]);
        out(root, 'desc', `Linha pronta com <b>0 alocações</b>. O buffer de 64 bytes foi reservado na compilação; <code>snprintf</code> garante que nada passa do fim.`);
        k++; draw(); return;
      }
      const i = Math.floor(k / 2), sub = k % 2, [L, V] = F[i];
      if (mode === 'plus') {
        if (sub === 0) {
          const tv = alloc(V.length + 1, 'h1', '');
          const ts = alloc(L.length + 1, 'h1', '');
          if (ts) realloc(ts, L.length + V.length + 1);
          copied += V.length + L.length;
          const before = txtS.length;
          txtS += L + V;
          let moved = 0;
          if (!msgB) msgB = alloc(txtS.length + 1, 'h0', 'msg');
          else moved = realloc(msgB, txtS.length + 1);
          copied += (L + V).length;
          msgB.tv = tv; msgB.ts = ts;
          renderCode(codeEl, CODE.plus, [i + 1]);
          out(root, 'desc', `<code>String(${NAMES[i]})</code> e <code>"${L}" + …</code> criam <b>2 Strings temporárias</b>. msg cresce de ${before} para ${txtS.length} caracteres ${moved ? `e <b class="c-orange">muda de lugar</b>, copiando ${moved} bytes` : 'no mesmo lugar'}.`);
        } else {
          blocks = blocks.filter(b => b !== msgB.tv && b !== msgB.ts);
          out(root, 'desc', 'As temporárias são liberadas e deixam <b>buracos</b> entre os blocos.');
        }
      } else {
        if (sub === 0) {
          txtS += L + V; copied += (L + V).length;
          renderCode(codeEl, CODE.reserve, [i + 2]);
          out(root, 'desc', `<code>+=</code> escreve “${L}${V}” no espaço já reservado: nenhuma alocação nova.`);
        } else out(root, 'desc', 'Mesmo bloco, mesmo lugar. O número de alocações não muda.');
      }
      k++;
      if (k >= nSteps() - 1) {
        const day = (allocs * 864000).toLocaleString('pt-BR');
        out(root, 'desc', `Linha pronta: <b>${allocs} alocação${allocs === 1 ? '' : 'ões'}</b> e ${copied} bytes copiados. A 10 linhas por segundo, são <b>${day}</b> alocações por dia.`);
      }
      draw();
    }
    seg(root, 'mode', v => { mode = v; reset(); });
    playBtn.addEventListener('click', () => { playing = !playing; toggleBtn(playBtn, playing, ['Pausar', 'Executar']); acc = 0.6; });
    act(root, 'step', () => { if (playing) playBtn.click(); step(); });
    reset();
    return {
      tick(dt) { if (playing) { acc += dt; if (acc > 0.9) { acc = 0; step(); if (k === 0) playBtn.click(); } } },
      pause() { if (playing) playBtn.click(); }
    };
  };

  /* ======================================================
     6. snprintf × sprintf
     ====================================================== */
  SIMS.snprintf = root => {
    let fn = 'sn';
    const nIn = inp(root, 'n'), tIn = inp(root, 't');
    const LIM = [0x1E, 0, 0, 0];
    function render() {
      const N = +nIn.value, t = +tIn.value;
      const s = `est01;T=${t.toFixed(1)};U=55`, len = s.length;
      out(root, 'n', N + ' bytes'); out(root, 't', fmt(t, 1) + ' °C');
      out(root, 'call', fn === 'sn'
        ? `<span class="tok-f">snprintf</span>(linha, <span class="tok-n">${N}</span>, <span class="tok-s">"%s;T=%.1f;U=%d"</span>, ID, t, u);`
        : `<span class="tok-f">sprintf</span>(linha, <span class="tok-s">"%s;T=%.1f;U=%d"</span>, ID, t, u); <span class="tok-c">// e o tamanho?</span>`);
      // memória: N bytes de linha + 4 bytes de limite (int, little-endian)
      const mem = [];
      for (let i = 0; i < N; i++) mem.push({ v: null, kind: 'buf' });
      LIM.forEach(b => mem.push({ v: b, kind: 'nb', hex: true }));
      const w = fn === 'sn' ? Math.min(len, N - 1) : len;
      for (let i = 0; i < w; i++) {
        if (i < mem.length) { mem[i].v = s[i]; mem[i].hex = false; mem[i].bad = i >= N; }
      }
      if (w < mem.length) { mem[w].v = '\\0'; mem[w].nul = true; mem[w].hex = false; mem[w].bad = w >= N; }
      const ovf = fn === 's' && len + 1 > N;
      const limBytes = mem.slice(N, N + 4).map(c => c.hex ? c.v : c.nul ? 0 : c.v.charCodeAt(0));
      const lim = (limBytes[0] | limBytes[1] << 8 | limBytes[2] << 16 | limBytes[3] << 24);
      let h = '';
      mem.forEach((c, i) => {
        if (i === N) h += '<span class="gap"></span>';
        const label = c.hex ? c.v.toString(16).toUpperCase().padStart(2, '0') : c.v === null ? '·' : esc(c.v);
        const cls = [c.v !== null && !c.hex && !c.nul ? 'ch' : '', c.nul ? 'nul' : '', c.bad ? 'bad' : ''].join(' ');
        h += `<span class="cell ${c.kind}"><i class="${cls}" style="${c.hex ? 'font-size:11px' : ''}">${label}</i><small>${i < N ? i : '+' + (i - N)}</small></span>`;
      });
      h += `<span class="lab"><span class="b1">■ char linha[${N}]</span><span class="b2">■ int limite (4 bytes, little-endian)</span></span>`;
      out(root, 'mem', h);
      let r;
      if (fn === 'sn') {
        r = `n = <b>${len}</b> · ${len >= N ? `<span class="c-orange">truncado</span>: cabem ${N - 1} caracteres + '\\0'. O código detecta porque n ≥ sizeof(linha).` : `cabe: ${len} caracteres + '\\0' = ${len + 1} bytes.`}<br>limite = <b class="c-mint">30</b> · intacta`;
      } else if (ovf) {
        r = `<span class="c-red">estouro de ${len + 1 - N} byte${len + 1 - N > 1 ? 's' : ''}</span>: sprintf escreveu além do fim de linha.<br>limite = <b class="c-red">${lim}</b> · era 30. Nenhum erro, nenhum aviso.`;
      } else {
        r = `coube por sorte: ${len + 1} bytes em ${N}. Basta a temperatura ganhar um dígito para estourar.<br>limite = <b class="c-mint">30</b>`;
      }
      out(root, 'res', r);
    }
    seg(root, 'fn', v => { fn = v; render(); });
    nIn.addEventListener('input', render); tIn.addEventListener('input', render);
    render();
    return {};
  };

  /* ======================================================
     7. Monitoramento do heap
     ====================================================== */
  SIMS.heapmon = root => {
    const pl = canvas2d($(root, '[data-c="plot"]')), logEl = out(root, 'log');
    const WIN = 48;
    let mode = 'fixo', h, bootH, data, boots, minB, lastLog, acc, tlsWarn, resets;
    function log(cls, s) { logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${s}</div>`); logEl.scrollTop = logEl.scrollHeight; while (logEl.children.length > 40) logEl.firstChild.remove(); }
    function reset() {
      h = 0; bootH = 0; data = []; boots = 0; minB = Infinity; lastLog = -4; acc = 0; tlsWarn = false; resets = [];
      logEl.innerHTML = ''; log('dim', { fixo: '// buffers fixos: nada é alocado no loop()', frag: '// String montada a cada leitura, com temporárias', leak: '// new Amostra a cada leitura, sem delete' }[mode]);
      out(root, 'boots', 0);
    }
    function model() {
      const hb = h - bootH, n = () => Math.random() - 0.5;
      let free, max;
      if (mode === 'fixo') { free = 182 + n() * 3; max = 108 + n() * 2; }
      else if (mode === 'frag') { free = 176 - 6 * (1 - Math.exp(-hb / 12)) + n() * 6; max = Math.max(6, 10 + 98 * Math.exp(-hb / 9) + n() * 3); }
      else { free = 182 - 6 * hb + n() * 2; max = Math.min(108, free * 0.55); }
      return { free, max };
    }
    function sample() {
      let { free, max } = model();
      if (mode === 'leak' && free < 6) {
        log('err', `[${h.toFixed(0).padStart(3)} h] abort(): new falhou · reiniciando…`);
        boots++; out(root, 'boots', boots); bootH = h; minB = Infinity; resets.push(h);
        ({ free, max } = model());
      }
      minB = Math.min(minB, free);
      data.push({ h, free, min: minB, max });
      while (data.length && data[0].h < h - WIN) data.shift();
      if (mode === 'frag' && max < 16 && !tlsWarn) { tlsWarn = true; log('err', `[${h.toFixed(0).padStart(3)} h] E TLS: falha ao alocar 16384 bytes (maxAlloc=${Math.round(max)} KB)`); }
      if (h - lastLog >= 4) {
        lastLog = h;
        log(max < 16 ? 'warn' : '', `[${h.toFixed(0).padStart(3)} h] free=${Math.round(free)} KB min=${Math.round(minB)} KB maxAlloc=${Math.round(max)} KB`);
      }
      out(root, 'free', Math.round(free) + ' KB'); out(root, 'min', Math.round(minB) + ' KB'); out(root, 'max', Math.round(max) + ' KB');
    }
    function draw() {
      const { ctx, w, h: H } = pl, L = 44, R = 10, T = 12, B = 22, pw = w - L - R, ph = H - T - B;
      const t0 = Math.max(0, h - WIN), X = v => L + (v - t0) / WIN * pw, Y = kb => T + ph - kb / 200 * ph;
      ctx.clearRect(0, 0, w, H);
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.lineWidth = 1;
      ctx.strokeStyle = '#2a2238'; ctx.fillStyle = '#6d6585'; ctx.textAlign = 'right';
      [0, 50, 100, 150, 200].forEach(kb => { ctx.beginPath(); ctx.moveTo(L, Y(kb)); ctx.lineTo(w - R, Y(kb)); ctx.stroke(); ctx.fillText(kb + ' KB', L - 4, Y(kb) + 4); });
      ctx.textAlign = 'center';
      for (let s = Math.ceil(t0 / 12) * 12; s <= t0 + WIN; s += 12) ctx.fillText(s + ' h', X(s), H - 6);
      ctx.strokeStyle = C.red; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(L, Y(16)); ctx.lineTo(w - R, Y(16)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.red; ctx.textAlign = 'left'; ctx.fillText('16 KB: bloco que o TLS precisa', L + 6, Y(16) - 5);
      resets.filter(r => r > t0).forEach(r => { ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(X(r), T); ctx.lineTo(X(r), T + ph); ctx.stroke(); ctx.fillText('reset', X(r) + 4, T + 10); });
      [['free', C.mint], ['min', C.orange], ['max', C.blue]].forEach(([k, col]) => {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        data.forEach((d, i) => { const x = X(d.h), y = Y(d[k]); if (i && d.h - data[i - 1].h > 0.5) ctx.moveTo(x, y); else if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
        ctx.stroke();
      });
    }
    seg(root, 'mode', v => { mode = v; reset(); });
    act(root, 'reset', reset);
    reset();
    return {
      tick(dt) {
        acc += dt;
        while (acc >= 0.1) { acc -= 0.1; h += 0.1; sample(); }
        draw();
      },
      redraw: draw
    };
  };

  /* ======================================================
     9. Ponteiros e endereços
     ====================================================== */
  SIMS.ptr = root => {
    const svg = stageOf(root), BASE = 0x3FFB0010;
    const NAMES = ['x', 'v[0]', 'v[1]', 'v[2]', 'v[3]', 'p'];
    let vals, pAddr, crashed;
    const idxOf = a => (a - BASE) % 4 === 0 && a >= BASE && a < BASE + 24 ? (a - BASE) / 4 : -1;
    function reset() { vals = [10, 1, 2, 3, 4]; pAddr = BASE; crashed = false; draw(); say('int* p = &amp;x;', 'O ponteiro <b>p</b> também é uma variável, com endereço próprio. O valor dele é o endereço de x.'); }
    function read() {
      if (!pAddr) return '<span class="c-red">nullptr!</span>';
      const i = idxOf(pAddr);
      return i < 0 ? '<span class="c-red">?</span>' : i === 5 ? hex(pAddr) : vals[i];
    }
    function say(stmt, desc) {
      out(root, 'expr', `<span class="c-orange">${stmt}</span> &nbsp; x = <b>${vals[0]}</b> · &amp;x = ${hex(BASE)} · p = <b class="c-blue">${hex(pAddr)}</b> · *p = <b>${read()}</b>`);
      out(root, 'desc', desc);
    }
    function crash(addr, what) {
      crashed = true; draw();
      out(root, 'desc', `<span class="c-red">Guru Meditation Error: Core 1 panic'ed (${what})</span> · EXCVADDR: ${hex(addr)}. A placa reinicia. Clique em ↺.`);
    }
    function write(v, stmt) {
      if (!pAddr) { say(stmt, ''); return crash(0, 'StoreProhibited'); }
      const i = idxOf(pAddr);
      if (i < 0) { say(stmt, ''); return crash(pAddr, 'StoreProhibited'); }
      if (i === 5) { pAddr = v; draw(); return say(stmt, '<span class="c-orange">p passou do fim de v e apontava para si mesmo</span>: a escrita sobrescreveu o próprio ponteiro. Agora p contém lixo.'); }
      vals[i] = v; draw();
      say(stmt, i === 0 ? '<b>*p</b> escreve no endereço guardado em p: x mudou sem que o nome x aparecesse.' : `*p escreveu em <b>${NAMES[i]}</b>, a célula para onde p aponta agora.`);
    }
    function draw() {
      svg.innerHTML = '';
      const cx = i => 18 + i * 90, W = 80, Y = 70;
      txt(svg, cx(0) + W / 2, 186, 'r = apelido de x', { size: 10.5, fill: C.mint });
      const tgt = idxOf(pAddr);
      NAMES.forEach((n, i) => {
        const isP = i === 5, on = i === tgt && !crashed;
        S('rect', { x: cx(i), y: Y, width: W, height: 48, rx: 8, fill: isP ? '#1c2341' : C.plot, stroke: on ? C.orange : isP ? C.blue : C.border, 'stroke-width': on ? 3 : 2 }, svg);
        txt(svg, cx(i) + W / 2, Y + 68, i ? n : 'x · r', { size: 13, weight: 600, fill: isP ? C.blue : C.text2 });
        txt(svg, cx(i) + W / 2, Y + 30, isP ? hex(pAddr) : String(vals[i]), { size: isP ? 10.5 : 18, weight: 700, fill: isP ? C.blue : C.text });
        txt(svg, cx(i) + W / 2, Y + 84, hex(BASE + 4 * i).replace('0x3FFB', '…'), { size: 10.5, fill: C.muted });
      });
      S('path', { d: `M${cx(1)} 164 v6 H${cx(4) + W} v-6`, fill: 'none', stroke: C.wire, 'stroke-width': 1.5 }, svg);
      txt(svg, (cx(1) + cx(4) + W) / 2, 186, 'int v[4] · 16 bytes contínuos', { size: 11, fill: C.muted });
      // seta do ponteiro
      const px = cx(5) + W / 2;
      if (crashed) txt(svg, px, 46, '💥', { size: 26 });
      else if (!pAddr) {
        S('path', { d: `M${px} ${Y} V 28`, stroke: C.blue, 'stroke-width': 2.5, fill: 'none' }, svg);
        S('path', { d: `M${px - 14} 28 h28 M${px - 9} 22 h18 M${px - 4} 16 h8`, stroke: C.blue, 'stroke-width': 2.5 }, svg);
        txt(svg, px - 22, 26, 'nullptr', { size: 12, fill: C.blue, anchor: 'end' });
      } else if (tgt < 0) {
        S('path', { d: `M${px} ${Y} C ${px} 30, ${px + 40} 20, 548 12`, stroke: C.red, 'stroke-width': 2.5, fill: 'none', 'stroke-dasharray': '5 4' }, svg);
        txt(svg, px - 20, 30, 'endereço inválido', { size: 12, fill: C.red, anchor: 'end' });
      } else {
        const tx = cx(tgt) + W / 2;
        const d = tgt === 5 ? `M${px + 20} ${Y} C ${px + 50} 20, ${px - 50} 20, ${px - 20} ${Y - 4}` : `M${px} ${Y} C ${px} 6, ${tx} 6, ${tx} ${Y - 4}`;
        S('path', { d, stroke: C.orange, 'stroke-width': 2.5, fill: 'none' }, svg);
        const ex = tgt === 5 ? px - 20 : tx;
        S('path', { d: `M${ex - 6} ${Y - 12} L${ex} ${Y - 2} L${ex + 6} ${Y - 12} Z`, fill: C.orange }, svg);
      }
    }
    const OPS = {
      addr: () => { pAddr = BASE; draw(); say('p = &amp;x;', '<b>&amp;x</b> é o endereço de x. p passa a apontar para x.'); },
      deref: () => write(42, '*p = 42;'),
      ref: () => { vals[0]++; draw(); say('r = r + 1;', 'Uma <b>referência</b> é outro nome para a mesma variável: mexer em r é mexer em x. Não ocupa célula própria.'); },
      arr: () => { pAddr = BASE + 4; draw(); say('p = v;', 'O nome de um array vale o endereço do primeiro elemento: <b>p = v</b> é o mesmo que p = &amp;v[0].'); },
      inc: () => { pAddr = (pAddr + 4) >>> 0; draw(); say('p++;', `p++ soma <b>sizeof(int) = 4</b> ao endereço, não 1. ${idxOf(pAddr) === 5 ? '<span class="c-orange">p passou do fim de v[3]</span>: o C++ não impede.' : ''}`); },
      w7: () => write(7, '*p = 7;'),
      null: () => { pAddr = 0; draw(); say('p = nullptr;', 'p não aponta para nada. Ler ou escrever em *p agora trava a placa: verifique <code>if (p)</code> antes.'); }
    };
    $$(root, '[data-op]').forEach(b => b.addEventListener('click', () => {
      if (crashed) { out(root, 'desc', '<span class="c-red">A placa travou.</span> Clique em ↺ para reiniciar.'); return; }
      OPS[b.dataset.op]();
    }));
    act(root, 'reset', reset);
    reset();
    return {};
  };

  /* ======================================================
     10. Valor × referência × ponteiro
     ====================================================== */
  SIMS.pass = root => {
    const codeEl = out(root, 'code'), frEl = out(root, 'frames');
    let mode = 'val', lastDepth = 0;
    const SIG = { val: 'int v', ref: 'int&amp; v', ptr: 'int* v' };
    const code = () => [
      { val: 'void zerar(int v) {', ref: 'void zerar(int& v) {', ptr: 'void zerar(int* v) {' }[mode],
      { val: '  v = 0;         // só a cópia', ref: '  v = 0;         // é o próprio x', ptr: '  if (v) *v = 0; // no endereço' }[mode],
      '}',
      'void loop() {',
      '  int x = 37;',
      mode === 'ptr' ? '  zerar(&x);' : '  zerar(x);',
      '  Serial.println(x);',
      '}'
    ];
    const AX = '0x3FFB1F2C';
    function steps() {
      const vIn = { val: '37', ref: `→ x (${AX})`, ptr: AX }[mode];
      const vOut = { val: '0', ref: `→ x (${AX})`, ptr: AX }[mode];
      const x2 = mode === 'val' ? 37 : 0;
      return [
        [4, [['loop()', { x: 37 }]], `x = 37 na stack de loop(), no endereço ${AX}.`],
        [5, [['loop()', { x: 37 }], [`zerar(${SIG[mode]})`, { v: vIn }]], {
          val: 'v recebe uma <b>cópia</b> de x: outra variável, em outro endereço.',
          ref: 'v é um <b>apelido</b> de x: nada é copiado, os dois nomes indicam o mesmo endereço.',
          ptr: `v recebe o <b>endereço</b> de x (${AX}): 4 bytes copiados.`
        }[mode]],
        [1, [['loop()', { x: x2 }], [`zerar(${SIG[mode]})`, { v: vOut }]], {
          val: 'v = 0 altera só a cópia. O x de loop() continua 37.',
          ref: 'v = 0 escreve direto em x.',
          ptr: '*v = 0 escreve no endereço de x. O if (v) protege contra nullptr.'
        }[mode]],
        [2, [['loop()', { x: x2 }]], 'zerar() retorna e o quadro com v é descartado.'],
        [6, [['loop()', { x: x2 }]], `Serial mostra <b>${x2}</b>. ${mode === 'val' ? 'O original não mudou.' : 'A função alterou a variável de quem a chamou.'}`]
      ];
    }
    function draw(k) {
      const [line, frames, desc] = steps()[k];
      renderCode(codeEl, code(), line);
      frEl.innerHTML = frames.map(([fn, v]) => `<div class="frame"><div class="fn">${fn}</div><div class="lv">${Object.entries(v).map(([a, b]) => `${a} = <b>${b}</b>`).join(' · ')}</div></div>`).join('');
      $$(frEl, '.frame').forEach((f, i) => { if (i < lastDepth) f.style.animation = 'none'; });
      lastDepth = frames.length;
      out(root, 'desc', desc);
    }
    const st = stepper(root, () => 5, draw, 1.8);
    seg(root, 'mode', v => { mode = v; lastDepth = 0; st.reset(); });
    st.reset();
    return st;
  };

  /* ======================================================
     12. Fora dos limites
     ====================================================== */
  SIMS.bounds = root => {
    const codeEl = out(root, 'code');
    let cmp = 'le', mem;
    const code = () => [
      'int leituras[5] = {21, 22, 23, 24, 25};',
      'int limite = 30;               // alarme acima de 30 °C',
      `for (int i = 0; i ${cmp === 'le' ? '<=' : '<'} 5; i++) {`,
      '  leituras[i] = 0;',
      '}',
      'if (temperatura > limite) alarme();'
    ];
    const last = () => cmp === 'le' ? 5 : 4;
    const n = () => last() + 3;
    function draw(k) {
      mem = [21, 22, 23, 24, 25, 30];
      const bad = [];
      let cur = -1, line = 0, desc;
      const wrote = Math.min(k - 1, last() + 1);
      for (let i = 0; i < wrote; i++) { mem[i] = 0; if (i === 5) bad.push(5); }
      if (k === 0) { line = 0; desc = 'Cinco leituras e, logo depois na memória, a variável <b>limite</b>.'; }
      else if (k <= last() + 1) {
        cur = k - 1; line = 3; mem[cur] = 0; if (cur === 5) bad.push(5);
        desc = cur === 5 ? '<span class="c-red">i = 5</span>: leituras[5] não existe. A escrita cai em <b>limite</b>, que vira 0.' : `i = ${cur}: leituras[${cur}] = 0.`;
      } else {
        line = 5;
        desc = cmp === 'le' ? '<span class="c-red">limite agora vale 0</span>: o alarme dispara com qualquer temperatura. Nenhum erro foi mostrado.' : 'Laço termina em i = 4. <b>limite</b> continua 30.';
      }
      renderCode(codeEl, code(), line);
      let h = '';
      mem.forEach((v, i) => {
        if (i === 5) h += '<span class="gap"></span>';
        const cls = [bad.includes(i) ? 'bad' : '', i === cur ? 'cur' : '', i < 5 && v === 0 ? 'ch' : ''].join(' ');
        h += `<span class="cell wide ${i < 5 ? 'buf' : 'nb'}"><i class="${cls}">${v}</i><small>${i < 5 ? `[${i}] · …${(0x10 + 4 * i).toString(16).toUpperCase()}` : `limite · …${(0x10 + 4 * i).toString(16).toUpperCase()}`}</small></span>`;
      });
      h += '<span class="lab"><span class="b1">■ int leituras[5]</span><span class="b2">■ int limite</span></span>';
      out(root, 'mem', h);
      out(root, 'desc', desc);
    }
    const st = stepper(root, n, draw, 1.1);
    seg(root, 'cmp', v => { cmp = v; st.reset(); });
    st.reset();
    return st;
  };

  /* ======================================================
     13. Ponteiros inválidos
     ====================================================== */
  SIMS.dangling = root => {
    const codeEl = out(root, 'code');
    let sc = 'local';
    const fl = new DataView(new Uint8Array([0x73, 0x74, 0x61, 0x74]).buffer).getFloat32(0, true);
    const CODE = {
      local: [
        'char* formatar(float t) {',
        '  char buf[16];',
        '  snprintf(buf, sizeof(buf), "%.1f C", t);',
        '  return buf;          // endereço de algo que vai morrer',
        '}',
        'void loop() {',
        '  char* s = formatar(23.4);',
        '  int r = lerSensor();  // reutiliza a mesma stack',
        '  Serial.println(s);',
        '}'
      ],
      free: [
        'struct Leitura { float valor; };',
        'Leitura* l = new Leitura{23.4};',
        'Leitura* copia = l;     // dois ponteiros, um objeto',
        'delete l;',
        'l = nullptr;            // só l foi anulado',
        'String s = "stat ok";   // o heap reaproveita o bloco',
        'Serial.println(copia->valor);'
      ]
    };
    const A = '0x3FFB1F10', H = '0x3FFC2A10';
    const box = (fn, name, val, addr, o = {}) => ({ fn, name, val, addr, ...o });
    const STEPS = {
      local: [
        [6, [box('loop()', 's', '?', '0x3FFB1F40')], [], 'loop() vai chamar formatar().', ''],
        [2, [box('loop()', 's', '?', '0x3FFB1F40'), box('formatar()', 'buf[16]', '"23.4 C"', A)], [], '<b>buf</b> é local de formatar(): mora no quadro dela, na stack.', ''],
        [3, [box('loop()', 's', '→ ' + A, '0x3FFB1F40'), box('formatar()', 'buf[16]', '"23.4 C"', A, { tgt: 1 })], [], '<code>return buf</code> devolve só o endereço ' + A + '.', ''],
        [6, [box('loop()', 's', '→ ' + A, '0x3FFB1F40'), box('formatar() · encerrada', 'buf[16]', '"23.4 C"', A, { tgt: 1, st: 'dead' })], [], 'formatar() terminou e o quadro foi descartado, mas s continua apontando para lá: um <b>ponteiro pendente</b> (dangling).', ''],
        [7, [box('loop()', 's', '→ ' + A, '0x3FFB1F40'), box('lerSensor()', 'raw, k', '2731, 0.81', A, { tgt: 1, st: 'reused' })], [], 'lerSensor() usa o mesmo espaço da stack e sobrescreve os bytes de buf.', ''],
        [8, [box('loop()', 's', '→ ' + A, '0x3FFB1F40'), box('lerSensor() · encerrada', 'raw, k', '2731, 0.81', A, { tgt: 1, st: 'reused' })], [], '<span class="c-red">println(s)</span> lê o que sobrou ali: lixo, ou um travamento se não houver \'\\0\'. Nada avisa.', '<span class="c-red">«\u00ab\u00aa+@\u00ff\u00b7…</span> <span class="muted">(lixo)</span>']
      ],
      free: [
        [1, [box('global', 'l', '→ ' + H, '0x3FFB0040')], [box('Leitura', 'valor', '23.4', H, { tgt: 1 })], '<code>new</code> cria o objeto no heap; l guarda o endereço.', ''],
        [2, [box('global', 'l', '→ ' + H, '0x3FFB0040'), box('global', 'copia', '→ ' + H, '0x3FFB0044')], [box('Leitura', 'valor', '23.4', H, { tgt: 1 })], 'Dois ponteiros para o <b>mesmo</b> objeto.', ''],
        [3, [box('global', 'l', '→ ' + H, '0x3FFB0040'), box('global', 'copia', '→ ' + H, '0x3FFB0044')], [box('Leitura · liberada', 'valor', '23.4', H, { tgt: 1, st: 'dead' })], '<code>delete</code> devolve o bloco ao heap. Os ponteiros não ficam sabendo.', ''],
        [4, [box('global', 'l', 'nullptr', '0x3FFB0040'), box('global', 'copia', '→ ' + H, '0x3FFB0044')], [box('Leitura · liberada', 'valor', '23.4', H, { tgt: 1, st: 'dead' })], 'l foi anulado, mas <b>copia</b> ainda aponta para o bloco liberado.', ''],
        [5, [box('global', 'l', 'nullptr', '0x3FFB0040'), box('global', 'copia', '→ ' + H, '0x3FFB0044')], [box('String s', 'texto', '"stat ok"', H, { tgt: 1, st: 'reused' })], 'O heap entrega o mesmo bloco para a String: os bytes agora são "stat ok".', ''],
        [6, [box('global', 'l', 'nullptr', '0x3FFB0040'), box('global', 'copia', '→ ' + H, '0x3FFB0044')], [box('String s', 'texto', '"stat ok"', H, { tgt: 1, st: 'reused' })], '<span class="c-red">copia-&gt;valor</span> interpreta os bytes de "stat" como float. Em outro momento, a mesma linha poderia travar ou corromper o heap.', `<span class="c-red">${fl.toExponential(2)}</span> <span class="muted">(lixo: era 23.4)</span>`]
      ]
    };
    const html = b => `<div class="mbox ${b.st || ''} ${b.tgt ? 'tgt' : ''}"><span class="fn">${b.fn}</span><span>${b.name} = <b>${esc(b.val)}</b></span><span class="a">${b.addr}</span></div>`;
    function draw(k) {
      const [line, stk, hp, desc, o] = STEPS[sc][k];
      renderCode(codeEl, CODE[sc], line);
      out(root, 'stack', '<span class="h">stack</span>' + stk.map(html).join(''));
      out(root, 'heap', '<span class="h">heap</span>' + hp.map(html).join(''));
      out(root, 'desc', desc);
      out(root, 'out', '<span class="muted">Serial:</span> ' + o);
    }
    const st = stepper(root, () => STEPS[sc].length, draw, 2);
    seg(root, 'sc', v => { sc = v; st.reset(); });
    st.reset();
    return st;
  };

})();
