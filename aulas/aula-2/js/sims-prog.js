/* ==========================================================
   Simulações — programação e E/S (telas 11–20).
   Usa os utilitários publicados em window.KIT por sims.js.
   ========================================================== */
(function () {
  const { C, S, $, $$, out, inp, act, clamp, lerp, fmt, fmtN, stageOf, glow, wire, txt, diode, canvas2d, seg, pill, toggleBtn, renderCode } = window.KIT;
  const slideOf = root => root.closest('.slide');

  /* ======================================================
     11. Compilada × interpretada
     ====================================================== */
  SIMS.compile = root => {
    const codeEl = out(root, 'code'), pipeEl = out(root, 'pipe'), logEl = out(root, 'log');
    const bugBtn = act(root, 'bug'), runBtn = act(root, 'run');
    const SRC = {
      c: ok => ['int contador = 0;', 'void loop() {', `  contador = ${ok ? 'contador' : 'contadr'} + 1;`, '  Serial.println(contador);', '}'],
      py: ok => ['contador = 0', 'while True:', `    contador = ${ok ? 'contador' : 'contadr'} + 1`, '    print(contador)']
    };
    const STAGES = {
      c: ['sketch.ino', 'pré-processador', 'compilador', 'linker', 'firmware.bin', 'upload', 'CPU executa'],
      py: ['main.py', 'upload', 'interpretador', 'linha 1', 'linha 2', 'linha 3', 'linha 4']
    };
    let mode = 'c', bug = false, queue = [], qt = 0, stage = -1, bad = -1, errLine = -1, curLine = -1;
    const race = { c: { p: 0, run: false, dur: 0.25 }, py: { p: 0, run: false, dur: 7.5 } };
    function render() {
      const cls = {};
      if (curLine >= 0) cls[curLine] = 'cur';
      if (errLine >= 0) cls[errLine] = 'err';
      renderCode(codeEl, SRC[mode](!bug), cls, mode === 'py');
      pipeEl.innerHTML = STAGES[mode].map((s, i) =>
        `${i ? '<span class="arr">→</span>' : ''}<span class="pn ${i === bad ? 'bad' : i === stage ? 'hot' : i < stage ? 'done' : ''}">${s}</span>`).join('');
    }
    function log(cls, html) { logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${html}</div>`); logEl.scrollTop = logEl.scrollHeight; }
    function reset() {
      queue = []; stage = -1; bad = -1; errLine = -1; curLine = -1; logEl.innerHTML = '';
      log('dim', mode === 'c' ? '// C++: compila tudo antes, depois grava e executa' : '# MicroPython: o interpretador executa linha a linha');
      render();
    }
    function plan() {
      const E = (st, cls, msg, o = {}) => queue.push({ st, cls, msg, ...o });
      if (mode === 'c') {
        E(0, 'dim', '$ arduino-cli compile --fqbn arduino:avr:uno');
        E(1, '', 'Pré-processador: expande #include e #define');
        if (bug) {
          E(2, 'err', "sketch.ino:3:14: error: 'contadr' was not declared in this scope", { bad: true, err: 2 });
          E(2, 'warn', 'Compilação abortada: nada foi enviado à placa.', { end: true });
          return;
        }
        E(2, '', 'avr-g++: C++ → código de máquina do AVR');
        E(3, '', 'Linker: junta o seu código com o core Arduino e as bibliotecas');
        E(4, 'ok', 'O sketch usa 1 482 bytes (4%) da Flash · 188 bytes (9%) da SRAM');
        E(5, '', 'Gravando pela USB… 100%');
        E(6, 'ok', 'A CPU executa instruções nativas: 1, 2, 3, 4, 5…', { race: true });
      } else {
        E(0, 'dim', '$ mpremote cp main.py :');
        E(1, '', 'main.py copiado como texto, sem compilar');
        E(2, '', 'O interpretador (já gravado na placa) começa a ler o arquivo');
        E(3, 'ok', 'linha 1 ✓  contador = 0', { line: 0 });
        E(4, 'ok', 'linha 2 ✓  while True', { line: 1 });
        if (bug) {
          E(5, 'err', "Traceback (most recent call last):<br>&nbsp;&nbsp;File \"main.py\", line 3<br>NameError: name 'contadr' isn't defined", { bad: true, err: 2 });
          E(5, 'warn', 'As linhas 1 e 2 já tinham rodado: o erro só aparece durante a execução.', { end: true });
          return;
        }
        E(5, 'ok', 'linha 3 ✓  contador = 1', { line: 2 });
        E(6, 'ok', 'linha 4 ✓  print → 1 … e repete, traduzindo de novo a cada volta', { line: 3, race: true });
      }
    }
    seg(root, 'mode', v => { mode = v; reset(); });
    bugBtn.addEventListener('click', () => { bug = !bug; toggleBtn(bugBtn, bug, ['Erro inserido', 'Inserir erro']); reset(); });
    runBtn.addEventListener('click', () => { reset(); race[mode].p = 0; race[mode].run = false; plan(); qt = 0.2; });
    function drawRace() {
      ['c', 'py'].forEach(k => {
        const r = race[k];
        out(root, k === 'c' ? 'rc' : 'rp').style.width = (r.p * 100) + '%';
        out(root, k === 'c' ? 'rcL' : 'rpL', r.p >= 1 ? (k === 'c' ? '100 mil voltas · 1×' : '100 mil voltas · ~30× mais tempo') : r.run ? 'executando…' : '');
      });
    }
    reset(); drawRace();
    return {
      tick(dt) {
        if (queue.length) {
          qt -= dt;
          if (qt <= 0) {
            const e = queue.shift();
            stage = e.st;
            if (e.bad) bad = e.st;
            if (e.err !== undefined) { errLine = e.err; curLine = -1; }
            if (e.line !== undefined) curLine = e.line;
            log(e.cls, e.msg);
            if (e.race) race[mode].run = true;
            if (e.end) stage = -1;
            render();
            qt = 0.75;
          }
        }
        ['c', 'py'].forEach(k => { const r = race[k]; if (r.run) { r.p = Math.min(1, r.p + dt / r.dur); if (r.p >= 1) r.run = false; } });
        drawRace();
      }
    };
  };

  /* ======================================================
     12. Tipos de dados: tamanho, faixa e estouro
     ====================================================== */
  SIMS.types = root => {
    const T = {
      byte: { bits: () => 8, signed: false },
      int8_t: { bits: () => 8, signed: true },
      int: { bits: b => b === 'uno' ? 16 : 32, signed: true },
      'unsigned int': { bits: b => b === 'uno' ? 16 : 32, signed: false },
      long: { bits: () => 32, signed: true }
    };
    let board = 'uno', type = 'int', x = 32760;
    const bits = () => T[type].bits(board);
    const range = () => 2 ** bits();
    const min = () => T[type].signed ? -(2 ** (bits() - 1)) : 0;
    const max = () => min() + range() - 1;
    const wrap = v => ((v - min()) % range() + range()) % range() + min();
    const n = v => v.toLocaleString('pt-BR').replace(/-/g, '−');
    const valEl = out(root, 'val');
    function render(msg) {
      const nb = bits(), u = x < 0 ? x + range() : x;
      const s = u.toString(2).padStart(nb, '0');
      out(root, 'decl', `<span class="tok-k">${type}</span> x = <span class="tok-n">${x}</span>; <span class="tok-c">// ${nb / 8} byte${nb > 8 ? 's' : ''} · ${n(min())} … ${n(max())}</span>`);
      valEl.textContent = n(x);
      let html = '';
      for (let by = 0; by < nb / 8; by++) {
        const cells = s.slice(by * 8, by * 8 + 8).split('').map((c, i) =>
          `<i class="${c === '1' ? 'one' : ''} ${T[type].signed && by === 0 && i === 0 ? 'sign' : ''}">${c}</i>`).join('');
        html += `<div class="byte"><div class="cells">${cells}</div><small>byte ${by + 1}${by === 0 && T[type].signed ? ' · bit de sinal' : ''}</small></div>`;
      }
      out(root, 'mem', html);
      out(root, 'msg', msg || (T[type].signed ? 'Com sinal: o bit mais à esquerda indica negativo (complemento de dois).' : 'Sem sinal: todos os bits representam magnitude.'));
    }
    function add(d) {
      const raw = x + d, w = wrap(raw);
      x = w;
      if (raw !== w) {
        valEl.classList.add('ovf');
        valEl.classList.remove('flash'); void valEl.offsetWidth; valEl.classList.add('flash');
        render(`<span class="c-red">Estouro!</span> ${n(raw)} não cabe em ${bits()} bits: o valor deu a volta para <b>${n(w)}</b>. O compilador não avisa.`);
      } else { valEl.classList.remove('ovf'); render(); }
    }
    seg(root, 'board', v => { board = v; x = wrap(x); valEl.classList.remove('ovf'); render(); });
    seg(root, 't', v => { type = v; x = max() - 5; valEl.classList.remove('ovf'); render(); });
    act(root, 'inc', () => add(1));
    act(root, 'dec', () => add(-1));
    act(root, 'inc100', () => add(100));
    act(root, 'inc1k', () => add(10000));
    act(root, 'max', () => { x = max(); valEl.classList.remove('ovf'); render(); });
    act(root, 'zero', () => { x = 0; valEl.classList.remove('ovf'); render(); });
    render();
    return {};
  };

  /* ======================================================
     13. Operações com bits sobre PORTB
     ====================================================== */
  SIMS.bits = root => {
    let A = 0b00000100, B = 0b00100000, op = '|', preset = null;
    const PIN = ['XTAL', 'XTAL', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
    const regA = $(root, '[data-r="a"]'), regB = $(root, '[data-r="b"]'), regR = $(root, '[data-r="r"]');
    const setOp = seg(root, 'op', v => { op = v; preset = null; upd(); });
    const bin = v => '0b' + v.toString(2).padStart(8, '0');
    function res() {
      switch (op) {
        case '|': return A | B;
        case '&': return A & B;
        case '^': return A ^ B;
        case '~': return ~A & 255;
        case '<<': return (A << 1) & 255;
        default: return A >> 1;
      }
    }
    function row(el, name, sub, v, click, labels) {
      let h = `<span class="rn">${name}<small>${sub}</small></span>`;
      for (let i = 7; i >= 0; i--) h += `<button class="b ${(v >> i) & 1 ? 'one' : ''} ${i === 5 ? 'hl' : ''}" data-i="${i}" ${click ? '' : 'tabindex="-1"'}>${(v >> i) & 1}</button>`;
      if (labels) { h += '<span></span>'; for (let i = 7; i >= 0; i--) h += `<span class="lbl"><i>bit </i>${i}<br><b>${PIN[7 - i]}</b></span>`; }
      el.innerHTML = h;
      if (click) el.querySelectorAll('.b').forEach(b => b.addEventListener('click', () => { click(+b.dataset.i); preset = null; upd(); }));
    }
    function upd() {
      const r = res(), unary = ['~', '<<', '>>'].includes(op);
      row(regA, 'A', 'PORTB', A, i => { A ^= 1 << i; }, true);
      row(regB, 'B', 'máscara', B, i => { B ^= 1 << i; });
      regB.style.opacity = unary ? 0.3 : 1;
      row(regR, '=', 'resultado', r);
      const opTxt = { '|': 'A | B', '&': 'A &amp; B', '^': 'A ^ B', '~': '~A', '<<': 'A &lt;&lt; 1', '>>': 'A &gt;&gt; 1' }[op];
      const C_LINE = {
        set: '<span class="tok-c">// ligar o pino 13</span><br>PORTB |= (<span class="tok-n">1</span> &lt;&lt; <span class="tok-n">5</span>);',
        clr: '<span class="tok-c">// desligar o pino 13</span><br>PORTB &amp;= ~(<span class="tok-n">1</span> &lt;&lt; <span class="tok-n">5</span>);',
        tgl: '<span class="tok-c">// inverter o pino 13</span><br>PORTB ^= (<span class="tok-n">1</span> &lt;&lt; <span class="tok-n">5</span>);',
        rd: `<span class="tok-c">// ler o bit 5</span><br>(PORTB &gt;&gt; <span class="tok-n">5</span>) &amp; <span class="tok-n">1</span>  →  <b class="c-mint">${(A >> 5) & 1}</b>`
      };
      out(root, 'expr', (preset ? C_LINE[preset] + '<br>' : '') +
        `${opTxt.replace('A', bin(A)).replace('B', unary ? 'B' : bin(B))} = <b class="c-mint">${bin(r)}</b>` +
        ` <span class="muted">(${A}${unary ? '' : ' ' + op.replace('&', '&amp;') + ' ' + B} → ${r} · 0x${r.toString(16).toUpperCase().padStart(2, '0')})</span>`);
      const on = (A >> 5) & 1;
      pill(out(root, 'led'), on ? 'on' : '', `pino 13: ${on ? 'HIGH' : 'LOW'}`);
    }
    const P = { set: ['|', 0b00100000], clr: ['&', 0b11011111], tgl: ['^', 0b00100000], rd: ['&', 0b00100000] };
    $$(root, '[data-preset]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.preset; op = P[k][0]; B = P[k][1]; preset = k; setOp(op); upd();
    }));
    act(root, 'apply', () => { if (preset !== 'rd') A = res(); upd(); });
    upd();
    return {};
  };

  /* ======================================================
     15a. if / else if / else
     ====================================================== */
  SIMS.ifelse = root => {
    const iT = inp(root, 't'), codeEl = out(root, 'code'), svg = stageOf(root);
    // ventilador
    S('circle', { cx: 70, cy: 40, r: 30, fill: 'none', stroke: '#3d3352', 'stroke-width': 3 }, svg);
    const fan = S('g', { transform: 'translate(70 40)' }, svg);
    for (let i = 0; i < 3; i++) S('ellipse', { cx: 0, cy: -14, rx: 7, ry: 14, fill: C.blue, transform: `rotate(${i * 120})` }, fan);
    S('circle', { cx: 70, cy: 40, r: 5, fill: C.text }, svg);
    const tFan = txt(svg, 70, 86, 'ventilador', { size: 11 });
    // aquecedor
    const heat = S('path', { d: 'M180 40 l8 -16 l8 32 l8 -32 l8 32 l8 -32 l8 32 l8 -16', fill: 'none', stroke: '#6d6585', 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg);
    const heatGlow = S('circle', { cx: 212, cy: 40, r: 40, fill: glow(svg, C.orange), opacity: 0 }, svg);
    svg.insertBefore(heatGlow, heat);
    const tHeat = txt(svg, 212, 86, 'aquecedor', { size: 11 });
    // conforto
    const ok = S('path', { d: 'M332 40 l12 12 l24 -26', fill: 'none', stroke: '#6d6585', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const tOk = txt(svg, 350, 86, 'tudo desligado', { size: 11 });
    let br = 0, ang = 0, spd = 0;
    function upd() {
      const t = +iT.value;
      out(root, 't', fmt(t, 1) + ' °C');
      br = t > 30 ? 0 : t < 18 ? 1 : 2;
      const cls = {};
      [[1, 2], [3, 4], [5, 6]][br].forEach(i => { cls[i] = 'cur'; });
      if (br >= 1) cls[1] = 'dim';
      if (br === 2) cls[3] = 'dim';
      renderCode(codeEl, [
        `float t = lerTemperatura();  // ${fmtN(t, 1).replace(',', '.')}`,
        'if (t > 30) {',
        '  ligarVentilador();',
        '} else if (t < 18) {',
        '  ligarAquecedor();',
        '} else {',
        '  desligarTudo();',
        '}'
      ], cls);
      pill(out(root, 'st'), ['warn', 'info', 'on'][br], ['t > 30 → true', 't < 18 → true', 'nenhuma condição → else'][br]);
      heat.setAttribute('stroke', br === 1 ? C.orange : '#6d6585');
      heatGlow.setAttribute('opacity', br === 1 ? 0.6 : 0);
      ok.setAttribute('stroke', br === 2 ? C.mint : '#6d6585');
      [tFan, tHeat, tOk].forEach((e, i) => e.setAttribute('fill', i === br ? C.text : C.muted));
    }
    iT.addEventListener('input', upd);
    upd();
    return {
      tick(dt) {
        spd = lerp(spd, br === 0 ? 720 : 0, Math.min(1, dt * 3));
        ang = (ang + spd * dt) % 360;
        fan.setAttribute('transform', `translate(70 40) rotate(${ang.toFixed(1)})`);
      }
    };
  };

  /* ======================================================
     15b. for — passo a passo
     ====================================================== */
  SIMS.forloop = root => {
    const iN = inp(root, 'n'), codeEl = out(root, 'code'), ledsEl = out(root, 'leds'), playBtn = act(root, 'play');
    ledsEl.innerHTML = Array.from({ length: 8 }, (_, i) => `<span>${i}</span>`).join('');
    const leds = $$(ledsEl, 'span');
    const LINES = [
      'for (int i = 0; i < n; i++) {',
      '  digitalWrite(leds[i], HIGH);',
      '  delay(200);',
      '}',
      '// equivalente com while:',
      '// int i = 0; while (i < n) { ...; i++; }'
    ];
    let st, i, on, playing = false, acc = 0, msg;
    function restart() { st = 'init'; i = null; on = []; msg = 'pronto'; draw(-1); }
    function draw(line) {
      const n = +iN.value;
      out(root, 'n', n);
      renderCode(codeEl, LINES, line);
      leds.forEach((l, k) => { l.classList.toggle('on', on.includes(k)); l.classList.toggle('cur', k === i && (st === 'body2' || st === 'inc')); l.style.opacity = k < n ? 1 : 0.35; });
      const cond = i === null ? '' : `<span>i &lt; n → ${i} &lt; ${n} = <b class="${i < n ? 't' : 'f'}">${i < n}</b></span>`;
      out(root, 'vars', `<span>i = <b>${i === null ? '—' : i}</b></span><span>n = <b>${n}</b></span>${cond}<span class="muted">${msg}</span>`);
    }
    function step() {
      const n = +iN.value;
      if (st === 'init') { i = 0; st = 'cond'; msg = 'inicializa i = 0'; draw(0); }
      else if (st === 'cond') {
        if (i < n) { st = 'body1'; msg = 'condição verdadeira: entra no corpo'; draw(0); }
        else { st = 'end'; msg = 'condição falsa: sai do laço'; draw(3); }
      }
      else if (st === 'body1') { on.push(i); st = 'body2'; msg = `acende leds[${i}]`; draw(1); }
      else if (st === 'body2') { st = 'inc'; msg = 'espera 200 ms'; draw(2); }
      else if (st === 'inc') { i++; st = 'cond'; msg = 'i++ e volta a testar'; draw(0); }
      else { restart(); }
    }
    playBtn.addEventListener('click', () => { playing = !playing; toggleBtn(playBtn, playing, ['Pausar', 'Executar']); });
    act(root, 'step', () => { if (playing) playBtn.click(); step(); });
    iN.addEventListener('input', restart);
    restart();
    return {
      tick(dt) { if (playing) { acc += dt; if (acc > (st === 'end' ? 1.4 : 0.45)) { acc = 0; step(); } } },
      pause() { if (playing) playBtn.click(); }
    };
  };

  /* ======================================================
     16. Funções e a pilha de chamadas
     ====================================================== */
  SIMS.stack = root => {
    const codeEl = out(root, 'code'), frEl = out(root, 'frames'), playBtn = act(root, 'play');
    const LINES = [
      'float paraCelsius(int leitura) {',
      '  float volts = leitura * 5.0 / 1023;',
      '  return volts * 100;  // LM35: 10 mV/°C',
      '}',
      'float lerTemperatura() {',
      '  int leitura = analogRead(A0);',
      '  return paraCelsius(leitura);',
      '}',
      'void loop() {',
      '  float t = lerTemperatura();',
      '  Serial.println(t);',
      '  delay(1000);',
      '}'
    ];
    let steps = [], k = 0, playing = false, acc = 0, lastDepth = 0;
    const f2 = v => v.toFixed(2), f3 = v => v.toFixed(3);
    function build() {
      const r = 55 + Math.floor(Math.random() * 16), v = r * 5.0 / 1023, T = v * 100;
      const loop = (vars = {}) => ({ fn: 'loop()', v: vars });
      const lt = (vars = {}) => ({ fn: 'lerTemperatura()', v: vars });
      const pc = { fn: 'paraCelsius(int leitura)', v: { leitura: r, volts: f3(v) } };
      steps = [
        [9, [loop()], 'loop() chama <b>lerTemperatura()</b>: um novo quadro é empilhado.'],
        [5, [loop(), lt({ leitura: r })], `analogRead(A0) devolve <b>${r}</b>, guardado na variável local <b>leitura</b>.`],
        [6, [loop(), lt({ leitura: r })], `Chama <b>paraCelsius(${r})</b>: o valor é <b>copiado</b> para o parâmetro.`],
        [1, [loop(), lt({ leitura: r }), pc], `volts = ${r} × 5,0 / 1023 = <b>${fmt(v, 3)} V</b>. Repare: existem duas variáveis “leitura”, uma em cada quadro.`],
        [2, [loop(), lt({ leitura: r }), pc], `return <b>${fmt(T, 2)}</b>: o quadro de paraCelsius é descartado e suas variáveis deixam de existir.`],
        [6, [loop(), lt({ leitura: r })], `lerTemperatura recebe ${fmt(T, 2)} e devolve o valor para quem a chamou.`],
        [9, [loop({ t: f2(T) })], `De volta ao loop(): <b>t = ${fmt(T, 2)}</b>.`],
        [10, [loop({ t: f2(T) })], `Serial.println(t) → o Monitor Serial mostra <b>${f2(T)}</b>.`],
        [11, [loop({ t: f2(T) })], 'delay(1000): espera 1 s e o loop() recomeça com uma nova leitura.']
      ];
      k = 0;
    }
    function draw() {
      const [line, frames, desc] = steps[k];
      renderCode(codeEl, LINES, line);
      frEl.innerHTML = frames.map(f => `<div class="frame"><div class="fn">${f.fn}</div><div class="lv">${Object.keys(f.v).length ? Object.entries(f.v).map(([a, b]) => `${a} = <b>${b}</b>`).join(' · ') : '<span class="muted">sem variáveis locais ainda</span>'}</div></div>`).join('');
      // só o quadro recém-empilhado anima
      $$(frEl, '.frame').forEach((f, i) => { if (i < lastDepth) f.style.animation = 'none'; });
      lastDepth = frames.length;
      out(root, 'desc', desc);
    }
    function step() { k++; if (k >= steps.length) { build(); lastDepth = 0; } draw(); }
    playBtn.addEventListener('click', () => { playing = !playing; toggleBtn(playBtn, playing, ['Pausar', 'Executar']); });
    act(root, 'step', () => { if (playing) playBtn.click(); step(); });
    build(); draw();
    return {
      tick(dt) { if (playing) { acc += dt; if (acc > 1.8) { acc = 0; step(); } } },
      pause() { if (playing) playBtn.click(); }
    };
  };

  /* ======================================================
     17. Classe Led e seus objetos
     ====================================================== */
  SIMS.oop = root => {
    const svg = stageOf(root), objsEl = out(root, 'objs'), logEl = out(root, 'log'), newBtn = act(root, 'new');
    const ALL = [['vermelho', 13, C.red], ['verde', 12, C.mint], ['amarelo', 11, C.yellow], ['azul', 10, C.blue]];
    S('rect', { x: 10, y: 92, width: 400, height: 22, rx: 6, fill: '#11606b' }, svg);
    const slots = ALL.map(([name, pin, col], i) => {
      const x = 62 + i * 100;
      txt(svg, x, 108, 'D' + pin, { fill: '#fff', size: 11, weight: 600 });
      const g = S('g', { opacity: 0.18 }, svg);
      wire(g, `M${x} 92 V72`);
      const led = diode(svg, g, x, 50, -90, { led: true, color: col });
      const lab = txt(svg, x, 16, 'livre', { size: 11 });
      return { name, pin, col, g, led, lab, on: false, alive: false };
    });
    function log(cls, html) { logEl.insertAdjacentHTML('beforeend', `<div class="${cls}">${html}</div>`); logEl.scrollTop = logEl.scrollHeight; }
    function render() {
      objsEl.innerHTML = '';
      slots.filter(s => s.alive).forEach(s => {
        const d = document.createElement('div');
        d.className = 'obj';
        d.innerHTML = `<span class="on" style="color:${s.col}">Led ${s.name}(${s.pin})</span>
          <span class="attrs">pino = <b>${s.pin}</b> · aceso = <b>${s.on}</b></span>
          <div class="btn-row"><button class="btn sm" data-m="ligar">ligar()</button><button class="btn ghost sm" data-m="desligar">desligar()</button><button class="btn blue sm" data-m="alternar">alternar()</button></div>`;
        d.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => call(s, b.dataset.m)));
        objsEl.appendChild(d);
      });
      slots.forEach(s => {
        s.g.setAttribute('opacity', s.alive ? 1 : 0.18);
        s.led.setOn(s.alive && s.on ? 1 : 0);
        s.lab.textContent = s.alive ? s.name : 'livre';
        s.lab.setAttribute('fill', s.alive ? s.col : C.muted);
      });
      newBtn.disabled = slots.every(s => s.alive);
    }
    function call(s, m) {
      const was = s.on;
      if (m === 'ligar') s.on = true;
      else if (m === 'desligar') s.on = false;
      else s.on = !s.on;
      const inner = m === 'alternar' ? ` → ${was ? 'desligar()' : 'ligar()'}` : '';
      log('', `${s.name}.${m}();${inner}  <span class="dim">// digitalWrite(${s.pin}, ${s.on ? 'HIGH' : 'LOW'})</span>`);
      render();
    }
    function create(s) {
      s.alive = true; s.on = false;
      log('ok', `Led ${s.name}(${s.pin});  <span class="dim">// construtor: pinMode(${s.pin}, OUTPUT)</span>`);
      render();
    }
    newBtn.addEventListener('click', () => { const s = slots.find(x => !x.alive); if (s) create(s); });
    act(root, 'hack', () => {
      log('err', "error: 'int Led::pino' is private within this context");
      log('dim', '// encapsulamento: o compilador impede mudar o pino por fora da classe');
    });
    create(slots[0]); create(slots[1]);
    return {};
  };

  /* ======================================================
     18. Botão com INPUT_PULLUP e debounce
     ====================================================== */
  SIMS.debounce = root => {
    const slide = slideOf(root), codeEl = $(slide, '[data-o="code"]');
    const wave = canvas2d($(root, '[data-c="wave"]'));
    const btn = $(root, '.push'), ledEl = out(root, 'led');
    const CODE = {
      off: [
        'pinMode(BOTAO, INPUT_PULLUP);',
        '// no loop():',
        'bool agora = digitalRead(BOTAO);',
        'if (anterior == HIGH && agora == LOW) {  // borda',
        '  contador++;',
        '  digitalWrite(LED, !digitalRead(LED));',
        '}',
        'anterior = agora;'
      ],
      on: [
        'pinMode(BOTAO, INPUT_PULLUP);',
        '// no loop():',
        'bool leitura = digitalRead(BOTAO);',
        'if (leitura != ultima) mudou = millis();',
        'if (millis() - mudou > 50 && leitura != estado) {',
        '  estado = leitura;            // estável há 50 ms',
        '  if (estado == LOW) { contador++; alternarLed(); }',
        '}',
        'ultima = leitura;'
      ]
    };
    let db = false, t = 0, raw = 1, stable = 1, lastChange = 0, pressed = false;
    let real = 0, cnt = 0, led = false, events = [], hRaw = [[0, 1]], hSt = [[0, 1]];
    const WIN = 2.2, DB = 0.05;
    seg(root, 'db', v => { db = v === 'on'; renderCode(codeEl, CODE[v], db ? [4, 5] : [3]); });
    renderCode(codeEl, CODE.off, [3]);
    function schedule(target) {
      const extra = 2 * (target === 0 ? 1 + Math.floor(Math.random() * 3) : Math.floor(Math.random() * 2));
      let tt = t;
      events.push([tt, target]);
      for (let j = 1; j <= extra; j++) { tt += 0.004 + Math.random() * 0.01; events.push([tt, j % 2 ? 1 - target : target]); }
    }
    function phys(p) {
      if (p === pressed) return;
      pressed = p; btn.classList.toggle('down', p);
      if (p) { real++; out(root, 'real', real); }
      schedule(p ? 0 : 1);
    }
    function accept(v, at) {
      if (v === stable) return;
      stable = v; hSt.push([at, v]);
      if (v === 0) { cnt++; led = !led; out(root, 'cnt', cnt); ledEl.classList.toggle('on', led); }
    }
    btn.addEventListener('pointerdown', e => { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (_) { /* sem ponteiro ativo */ } phys(true); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, () => phys(false)));
    btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); phys(true); } });
    btn.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') phys(false); });
    function draw() {
      const { ctx, w, h } = wave, L = 92, R = 8, pw = w - L - R;
      ctx.clearRect(0, 0, w, h);
      const X = s => L + (s - (t - WIN)) / WIN * pw;
      const rows = [['pino (bruto)', hRaw, C.mint, 12], ['programa', hSt, C.orange, h / 2 + 8]];
      ctx.font = '11px IBM Plex Mono, monospace';
      rows.forEach(([lab, hist, col, y0]) => {
        const rh = h / 2 - 22, Y = v => v ? y0 : y0 + rh;
        ctx.fillStyle = C.text2; ctx.textAlign = 'left'; ctx.fillText(lab, 6, y0 + rh / 2 + 4);
        ctx.fillStyle = C.muted; ctx.textAlign = 'right'; ctx.fillText('HIGH', L - 6, y0 + 8); ctx.fillText('LOW', L - 6, y0 + rh);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
        let started = false, prev = 1;
        hist.forEach(([s, v]) => {
          const x = Math.max(L, X(s));
          if (!started) { ctx.moveTo(L, Y(v)); started = true; } else { ctx.lineTo(x, Y(prev)); ctx.lineTo(x, Y(v)); }
          prev = v;
        });
        ctx.lineTo(X(t), Y(prev)); ctx.stroke();
      });
    }
    return {
      tick(dt) {
        t += dt;
        events.sort((a, b) => a[0] - b[0]);
        while (events.length && events[0][0] <= t) {
          const [at, v] = events.shift();
          if (v !== raw) {
            raw = v; lastChange = at; hRaw.push([at, v]);
            if (!db) accept(v, at);
          }
        }
        if (db && raw !== stable && t - lastChange >= DB) accept(raw, lastChange + DB);
        while (hRaw.length > 2 && hRaw[1][0] < t - WIN) hRaw.shift();
        while (hSt.length > 2 && hSt[1][0] < t - WIN) hSt.shift();
        draw();
      },
      pause() { phys(false); }
    };
  };

  /* ======================================================
     19. delay() × millis() × interrupção
     ====================================================== */
  SIMS.timing = root => {
    const codeEl = out(root, 'code'), tl = canvas2d($(root, '[data-c="tl"]'));
    const CODE = {
      delay: [
        'void loop() {',
        '  digitalWrite(LED, !digitalRead(LED));',
        '  delay(1000);                 // CPU parada aqui',
        '  if (digitalRead(BOTAO) == LOW)',
        '    contador++;                // lido 1× por segundo',
        '}'
      ],
      millis: [
        'unsigned long antes = 0;',
        'void loop() {',
        '  if (millis() - antes >= 1000) {   // já passou 1 s?',
        '    antes = millis();',
        '    digitalWrite(LED, !digitalRead(LED));',
        '  }',
        '  if (bordaDescida(BOTAO)) contador++;  // lido sempre',
        '}'
      ],
      isr: [
        'volatile int contador = 0;',
        'void contar() { contador++; }      // ISR: curta!',
        'void setup() {',
        '  attachInterrupt(digitalPinToInterrupt(2), contar, FALLING);',
        '}',
        'void loop() {',
        '  digitalWrite(LED, !digitalRead(LED));',
        '  delay(1000);                     // e nada se perde',
        '}'
      ]
    };
    const DESC = {
      delay: 'Com <b>delay()</b> a CPU fica parada 1 s esperando. O botão só é lido uma vez por segundo: apertos rápidos se perdem.',
      millis: 'Com <b>millis()</b> o loop nunca para: ele só confere se já passou 1 s. O botão é lido milhares de vezes por segundo.',
      isr: 'A <b>interrupção</b> é disparada pelo hardware na borda do sinal: a CPU pausa o que estava fazendo, roda a ISR e volta. Funciona até durante o delay().'
    };
    const HL = { delay: [2], millis: [2, 6], isr: [1, 3] };
    let mode = 'delay', t = 6, led = 0, ledHist = [[0, 0]], presses = [], isrs = [], reads = [], nextRead = 7, nOk = 0, nMiss = 0, nAll = 0;
    const WIN = 6, PULSE = 0.15;
    function setMode(m) {
      mode = m; presses = []; isrs = []; reads = []; nOk = nMiss = nAll = 0;
      renderCode(codeEl, CODE[m], HL[m]); out(root, 'desc', DESC[m]); stats();
    }
    function stats() { out(root, 'n', nAll); out(root, 'ok', nOk); out(root, 'miss', nMiss); }
    seg(root, 'mode', setMode);
    act(root, 'press', () => {
      const p = { t0: t, t1: t + PULSE, st: 'pend', det: null };
      presses.push(p); nAll++;
      if (mode !== 'delay') { p.st = 'ok'; p.det = t + 0.002; nOk++; if (mode === 'isr') isrs.push(t); }
      stats();
    });
    setMode('delay');
    function draw() {
      const { ctx, w, h } = tl, L = 86, R = 10, pw = w - L - R, t0 = t - WIN;
      const X = s => L + (s - t0) / WIN * pw;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px IBM Plex Mono, monospace';
      const rowY = [14, 66, 120], rh = 30;
      ['LED', 'botão', 'CPU'].forEach((s, i) => { ctx.fillStyle = C.text2; ctx.textAlign = 'left'; ctx.fillText(s, 8, rowY[i] + rh / 2 + 4); });
      // grade de segundos
      ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1; ctx.fillStyle = '#6d6585'; ctx.textAlign = 'center';
      for (let s = Math.ceil(t0); s <= t; s++) { const x = X(s); ctx.beginPath(); ctx.moveTo(x, 6); ctx.lineTo(x, h - 14); ctx.stroke(); ctx.fillText(s + ' s', x, h - 2); }
      // LED
      ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.beginPath();
      let prev = null;
      ledHist.forEach(([s, v]) => { const x = Math.max(L, X(s)), y = v ? rowY[0] : rowY[0] + rh; if (prev === null) ctx.moveTo(L, y); else { ctx.lineTo(x, prev); ctx.lineTo(x, y); } prev = y; });
      ctx.lineTo(X(t), prev); ctx.stroke();
      // botão (ativo em LOW, desenhado como pulso para baixo)
      ctx.strokeStyle = C.blue; ctx.beginPath(); ctx.moveTo(L, rowY[1]);
      presses.filter(p => p.t1 > t0).forEach(p => {
        const a = Math.max(L, X(p.t0)), b = X(Math.min(p.t1, t));
        ctx.lineTo(a, rowY[1]); ctx.lineTo(a, rowY[1] + rh); ctx.lineTo(b, rowY[1] + rh); if (p.t1 <= t) ctx.lineTo(b, rowY[1]);
      });
      const lastOpen = presses.length && presses[presses.length - 1].t1 > t;
      ctx.lineTo(X(t), lastOpen ? rowY[1] + rh : rowY[1]); ctx.stroke();
      // CPU
      const cy = rowY[2];
      if (mode === 'millis') {
        ctx.fillStyle = 'rgba(128,230,198,.25)'; ctx.fillRect(L, cy + 6, X(t) - L, rh - 12);
        ctx.fillStyle = C.mint; ctx.textAlign = 'left'; ctx.fillText('loop livre: confere tempo e botão sem parar', L + 8, cy + rh / 2 + 4);
      } else {
        ctx.fillStyle = 'rgba(255,145,72,.28)'; ctx.fillRect(L, cy + 6, X(t) - L, rh - 12);
        ctx.fillStyle = C.orange; ctx.textAlign = 'left'; ctx.fillText('delay(1000): CPU esperando', L + 8, cy + rh / 2 + 4);
        if (mode === 'delay') { ctx.fillStyle = C.mint; reads.filter(s => s > t0).forEach(s => ctx.fillRect(X(s) - 2, cy + 2, 4, rh - 4)); }
        else { ctx.fillStyle = C.yellow; isrs.filter(s => s > t0).forEach(s => { ctx.fillRect(X(s) - 2, cy - 4, 4, rh + 8); ctx.fillText('ISR', X(s) + 5, cy + 2); }); }
      }
      // marcas de detecção
      presses.filter(p => p.t1 > t0 - 0.5).forEach(p => {
        if (p.st === 'ok') { ctx.fillStyle = C.mint; ctx.beginPath(); ctx.arc(X(p.det), rowY[1] + rh + 8, 6, 0, 7); ctx.fill(); ctx.fillStyle = C.bg; ctx.textAlign = 'center'; ctx.fillText('✓', X(p.det), rowY[1] + rh + 12); }
        if (p.st === 'miss') { ctx.fillStyle = C.red; ctx.textAlign = 'center'; ctx.font = '700 14px IBM Plex Mono, monospace'; ctx.fillText('✕', X(p.t1), rowY[1] + rh + 13); ctx.font = '11px IBM Plex Mono, monospace'; }
      });
    }
    return {
      tick(dt) {
        t += dt;
        while (t >= nextRead) {
          led = 1 - led; ledHist.push([nextRead, led]);
          if (mode === 'delay') {
            reads.push(nextRead);
            presses.forEach(p => { if (p.st === 'pend' && p.t0 <= nextRead && p.t1 >= nextRead) { p.st = 'ok'; p.det = nextRead; nOk++; } });
          }
          nextRead += 1;
        }
        presses.forEach(p => { if (p.st === 'pend' && p.t1 < t) { p.st = 'miss'; nMiss++; } });
        stats();
        while (ledHist.length > 2 && ledHist[1][0] < t - WIN) ledHist.shift();
        while (presses.length && presses[0].t1 < t - WIN - 1) presses.shift();
        while (reads.length && reads[0] < t - WIN) reads.shift();
        while (isrs.length && isrs[0] < t - WIN) isrs.shift();
        draw();
      }
    };
  };

  /* ======================================================
     20. Amostragem com millis() e média móvel
     ====================================================== */
  SIMS.sampling = root => {
    const slide = slideOf(root), codeEl = $(slide, '[data-o="code"]');
    const plot = canvas2d($(root, '[data-c="plot"]'));
    const iI = inp(root, 'i'), iN = inp(root, 'n'), bumpBtn = act(root, 'bump');
    let t = 0, acc = 0, bump = false, bumpLv = 0, buf = [], samples = [], truth = [], last = null;
    const WIN = 8, YMIN = 18, YMAX = 34;
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const f = s => 24 + 1.5 * Math.sin(s * 0.6) + bumpLv;
    function code() {
      const I = +iI.value, N = +iN.value;
      out(root, 'i', I + ' ms'); out(root, 'n', N);
      out(root, 'sps', fmtN(1000 / I, 1));
      renderCode(codeEl, [
        `const unsigned long INTERVALO = ${I};  // ms`,
        `const int N = ${N};                    // janela`,
        'float janela[N]; int pos = 0;',
        'unsigned long antes = 0;',
        'void loop() {',
        '  if (millis() - antes >= INTERVALO) {',
        '    antes += INTERVALO;',
        '    janela[pos] = lerTemperatura();',
        '    pos = (pos + 1) % N;',
        '    float media = somar(janela, N) / N;',
        '    Serial.println(media);',
        '  }',
        '  // ...livre para outras tarefas',
        '}'
      ], [5, 9]);
    }
    iI.addEventListener('input', () => { acc = 0; code(); });
    iN.addEventListener('input', () => { buf = buf.slice(-iN.value); code(); });
    bumpBtn.addEventListener('click', () => { bump = !bump; toggleBtn(bumpBtn, bump, ['Soltar o sensor', 'Segurar o sensor 🖐']); });
    code();
    function draw() {
      const { ctx, w, h } = plot, L = 40, R = 8, T = 10, B = 22, pw = w - L - R, ph = h - T - B, t0 = t - WIN;
      const X = s => L + (s - t0) / WIN * pw, Y = v => T + (1 - (v - YMIN) / (YMAX - YMIN)) * ph;
      ctx.clearRect(0, 0, w, h);
      ctx.font = '11px IBM Plex Mono, monospace'; ctx.textAlign = 'right'; ctx.fillStyle = C.muted;
      ctx.strokeStyle = '#2a2238'; ctx.lineWidth = 1;
      for (let v = 20; v <= 32; v += 4) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.fillText(v + '°', L - 6, Y(v) + 4); }
      ctx.save(); ctx.beginPath(); ctx.rect(L, 0, pw, h); ctx.clip();
      ctx.strokeStyle = 'rgba(169,163,189,.45)'; ctx.setLineDash([4, 4]); ctx.beginPath();
      truth.forEach(([s, v], i) => { if (!i) ctx.moveTo(X(s), Y(v)); else ctx.lineTo(X(s), Y(v)); }); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.mint;
      samples.forEach(([s, r]) => { ctx.beginPath(); ctx.arc(X(s), Y(r), 2.4, 0, 7); ctx.fill(); });
      ctx.strokeStyle = C.orange; ctx.lineWidth = 2.6; ctx.beginPath();
      samples.forEach(([s, , m], i) => { if (!i) ctx.moveTo(X(s), Y(m)); else ctx.lineTo(X(s), Y(m)); }); ctx.stroke();
      ctx.restore();
      ctx.textAlign = 'left'; ctx.fillStyle = C.muted; ctx.fillText('- - real', L + 6, h - 6);
      ctx.fillStyle = C.mint; ctx.fillText('● amostras', L + 80, h - 6);
      ctx.fillStyle = C.orange; ctx.fillText('— média móvel', L + 178, h - 6);
    }
    return {
      tick(dt) {
        t += dt;
        bumpLv = lerp(bumpLv, bump ? 6 : 0, Math.min(1, dt / 1.2));
        truth.push([t, f(t)]);
        acc += dt;
        const I = +iI.value / 1000, N = +iN.value;
        while (acc >= I) {
          acc -= I;
          const ts = t - acc, raw = f(ts) + gauss() * 0.9;
          buf.push(raw); if (buf.length > N) buf.shift();
          const m = buf.reduce((a, b) => a + b, 0) / buf.length;
          samples.push([ts, raw, m]); last = [raw, m];
        }
        while (truth.length && truth[0][0] < t - WIN - 0.2) truth.shift();
        while (samples.length && samples[0][0] < t - WIN - 0.2) samples.shift();
        if (last) { out(root, 'raw', fmt(last[0], 1) + '°'); out(root, 'flt', fmt(last[1], 1) + '°'); }
        draw();
      }
    };
  };
})();
