/* ==========================================================
   Simulações — displays: 7 segmentos (um byte por dígito),
   LCD 16×2 com módulo I²C (código de cada caractere e os bytes no
   barramento) e uma página do OLED (cada byte = 8 pixels em pé).
   Também a busca do glossário.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, stageOf, txt, seg, pill, toggleBtn } = window.KIT;
  const H2 = n => n.toString(16).toUpperCase().padStart(2, '0');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function group(lab, cls, bytes, sub) {
    const cells = bytes.map((b, i) => `<i><b>${H2(b)}</b><small>${sub ? sub[i] : '&nbsp;'}</small></i>`).join('');
    return `<div class="pg ${cls}"><span>${lab}</span><div class="cells">${cells}</div></div>`;
  }

  /* ======================================================
     Display de 7 segmentos
     ====================================================== */
  SIMS.seg7 = root => {
    const svg = stageOf(root);
    const an = inp(root, 'anodo');
    const CODES = { 0: 0x3F, 1: 0x06, 2: 0x5B, 3: 0x4F, 4: 0x66, 5: 0x6D, 6: 0x7D, 7: 0x07, 8: 0x7F, 9: 0x6F, A: 0x77, b: 0x7C, C: 0x39, d: 0x5E, E: 0x79, F: 0x71 };
    const OFF = '#3a2a2a', ON = '#ff4a4a';
    let v = CODES[8];
    S('rect', { x: 8, y: 8, width: 184, height: 264, rx: 12, fill: '#1a1214', stroke: C.border, 'stroke-width': 2 }, svg);
    const H = (x1, x2, y) => `M${x1} ${y} L${x1 + 10} ${y - 10} L${x2 - 10} ${y - 10} L${x2} ${y} L${x2 - 10} ${y + 10} L${x1 + 10} ${y + 10} Z`;
    const V = (x, y1, y2) => `M${x} ${y1} L${x + 10} ${y1 + 10} L${x + 10} ${y2 - 10} L${x} ${y2} L${x - 10} ${y2 - 10} L${x - 10} ${y1 + 10} Z`;
    // bit 0 = a … bit 6 = g, bit 7 = ponto
    const SEG = [
      ['a', H(52, 148, 36), 100, 22], ['b', V(152, 40, 136), 172, 90], ['c', V(152, 144, 240), 172, 196],
      ['d', H(52, 148, 244), 100, 270], ['e', V(48, 144, 240), 26, 196], ['f', V(48, 40, 136), 26, 90], ['g', H(52, 148, 140), 100, 128]
    ];
    const els = SEG.map(([n, d, lx, ly], i) => {
      const p = S('path', { d, fill: OFF, stroke: '#000', 'stroke-width': 1, style: 'cursor:pointer' }, svg);
      p.addEventListener('click', () => { v ^= 1 << i; draw(); });
      const t = S('text', { x: lx, y: ly, text: n, fill: '#d9b0b0', 'font-size': 11, 'font-family': 'IBM Plex Mono, monospace', 'text-anchor': 'middle', 'pointer-events': 'none' }, svg);
      return { p, t };
    });
    const dp = S('circle', { cx: 174, cy: 248, r: 8, fill: OFF, style: 'cursor:pointer' }, svg);
    dp.addEventListener('click', () => { v ^= 0x80; draw(); });

    const db = out(root, 'digs');
    db.innerHTML = Object.keys(CODES).map(k => `<button type="button" class="btn ghost sm" data-k="${k}">${k}</button>`).join('');
    db.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { v = CODES[b.dataset.k]; draw(); }));

    function draw() {
      els.forEach((e, i) => e.p.setAttribute('fill', v >> i & 1 ? ON : OFF));
      dp.setAttribute('fill', v & 0x80 ? ON : OFF);
      const inv = an.checked, sent = inv ? (~v & 0xFF) : v;
      const names = ['dp', 'g', 'f', 'e', 'd', 'c', 'b', 'a'];
      out(root, 'bits', names.map(n => `<span class="lb">${n}</span>`).join('') +
        names.map((n, i) => { const b = sent >> (7 - i) & 1; return `<span class="bt${b ? ' one' : ''}">${b}</span>`; }).join(''));
      const dig = Object.keys(CODES).find(k => CODES[k] === v);
      out(root, 'hex', `byte enviado = <b class="c-orange">0x${H2(sent)}</b>` + (dig !== undefined ? ` <span class="muted">· desenha “${dig}”</span>` : ' <span class="muted">· desenho livre</span>'));
      out(root, 'cap', inv
        ? '<b>Ânodo comum</b>: o comum vai no positivo e o segmento acende com <b>0</b>. O mesmo desenho vira o byte invertido.'
        : '<b>Cátodo comum</b>: o comum vai no GND e o segmento acende com <b>1</b>. Cada bit do byte liga um segmento: bit 0 = a … bit 6 = g, bit 7 = ponto.');
    }
    an.addEventListener('change', draw);
    draw();
    return {};
  };

  /* ======================================================
     LCD 16×2 com módulo I²C (PCF8574 no endereço 0x27)
     ====================================================== */
  SIMS.lcd = root => {
    const scr = out(root, 'scr');
    const ins = [inp(root, 'l0'), inp(root, 'l1')];
    let sel = [0, 0], bl = true;
    const cells = [];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 16; c++) {
      const el = document.createElement('span');
      el.className = 'c';
      el.addEventListener('click', () => { sel = [c, r]; draw(); });
      scr.appendChild(el); cells.push(el);
    }
    const btnBl = act(root, 'bl', () => { bl = !bl; toggleBtn(btnBl, bl); draw(); });
    // o LCD tem uma tabela de caracteres na própria memória (ROM): ASCII 32–125 e alguns extras
    const code = ch => {
      if (ch === '°') return 0xDF;                      // o “grau” está no código 0xDF da ROM
      const n = ch.codePointAt(0);
      return n >= 32 && n <= 125 ? n : null;
    };
    function draw() {
      scr.classList.toggle('off', !bl);
      const warn = [];
      ins.forEach((el, r) => {
        const s = Array.from(el.value);
        if (s.length > 16) warn.push(`linha ${r}: ${s.length - 16} caractere(s) passaram da coluna 15 e não aparecem`);
        for (let c = 0; c < 16; c++) {
          const ch = s[c] ?? ' ', k = code(ch), cell = cells[r * 16 + c];
          cell.textContent = k === null ? '▒' : ch;
          cell.classList.toggle('bad', k === null);
          cell.classList.toggle('sel', sel[0] === c && sel[1] === r);
          if (k === null) warn.push(`“${ch}” não existe na tabela do LCD`);
        }
      });
      const [c, r] = sel;
      const ch = Array.from(ins[r].value)[c] ?? ' ';
      const k = code(ch) ?? 0xFF;
      const addr = (r ? 0x40 : 0x00) + c;
      // PCF8574 → LCD em 4 bits: P0=RS, P1=RW, P2=EN, P3=luz, P4–P7 = D4–D7
      const base = 0x01 | (bl ? 0x08 : 0);
      const hi = k & 0xF0, lo = (k << 4) & 0xF0;
      const b = [hi | base | 0x04, hi | base, lo | base | 0x04, lo | base];
      out(root, 'info',
        `<div class="readout" style="padding:8px 12px;font-size:13.5px;line-height:1.6">coluna <b>${c}</b>, linha <b>${r}</b> · caractere <b class="c-orange">“${esc(ch === ' ' ? '␠' : ch)}”</b> = código <b class="c-orange">0x${H2(k)}</b> · posição na memória do LCD <b>0x${H2(addr)}</b></div>` +
        `<div class="pkt" style="margin-top:6px">${group('endereço 0x27 + escrita', 'y', [0x4E], ['0x27·W'])}${group('metade alta + pulso EN', 'o', b.slice(0, 2), ['EN=1', 'EN=0'])}${group('metade baixa + pulso EN', 'm', b.slice(2), ['EN=1', 'EN=0'])}</div>`);
      const w = Array.from(new Set(warn));
      pill(out(root, 'st'), w.length ? 'warn' : 'on', w.length ? w[0] : 'tudo cabe na tela');
    }
    ins.forEach(el => el.addEventListener('input', draw));
    draw();
    return {};
  };

  /* ======================================================
     OLED: uma página (8 linhas de pixels) do SSD1306
     ====================================================== */
  SIMS.oled = root => {
    const grid = out(root, 'grid'), bytesEl = out(root, 'bytes');
    const W = 16, Hh = 8;
    const px = Array.from({ length: Hh }, () => new Array(W).fill(0));
    let hot = -1;
    const els = [];
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const i = document.createElement('i');
      i.addEventListener('click', () => { px[y][x] ^= 1; hot = x; draw(); });
      grid.appendChild(i); els.push(i);
    }
    const ART = {
      heart: ['................', '....##.##.......', '...#######......', '...#######......', '....#####.......', '.....###........', '......#.........', '................'],
      arrow: ['........#.......', '........##......', '..#########.....', '..##########....', '..#########.....', '........##......', '........#.......', '................'],
      txt: ['.##..#..#.......', '#..#.#..#.......', '#..#.#..#.......', '#..#.####.......', '#..#.#..#.......', '#..#.#..#.......', '.##..#..#.......', '................']
    };
    function load(k) { const a = ART[k]; for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) px[y][x] = a ? +(a[y][x] === '#') : 0; hot = -1; draw(); }
    ['heart', 'arrow', 'txt'].forEach(k => act(root, k, () => load(k)));
    act(root, 'clear', () => load(null));
    const colByte = x => px.reduce((acc, row, y) => acc | (row[x] << y), 0);
    function draw() {
      for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
        const e = els[y * W + x];
        e.classList.toggle('on', !!px[y][x]);
        e.classList.toggle('col', x === hot);
      }
      bytesEl.innerHTML = Array.from({ length: W }, (_, x) => `<span class="${x === hot ? 'hot' : ''}">${H2(colByte(x))}</span>`).join('');
      if (hot >= 0) {
        const bits = px.map(r => r[hot]).join('');
        out(root, 'cap', `Coluna <b>${hot}</b>, de cima para baixo: <b>${bits}</b>. O pixel de cima é o bit 0, o de baixo é o bit 7: o byte fica <b>0x${H2(colByte(hot))}</b>. Um clique muda um bit dentro de um byte.`);
      } else out(root, 'cap', 'Clique nos pixels. Cada <b>coluna</b> desta faixa é <b>um byte</b>: 8 pixels em pé. A tela inteira tem 8 faixas como esta, com 128 colunas cada.');
    }
    load('heart');
    return {};
  };

  /* ======================================================
     Glossário: busca e filtro por assunto
     ====================================================== */
  SIMS.glossario = root => {
    const qIn = inp(root, 'q');
    const cards = Array.from(root.querySelectorAll('.gl'));
    const chips = Array.from(root.querySelectorAll('[data-gcat]'));
    let cat = '';
    const norm = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/‑/g, '-');
    cards.forEach(c => { c.dataset.busca = norm(c.textContent); });
    function draw() {
      const q = norm(qIn.value.trim());
      let n = 0;
      cards.forEach(c => {
        const ok = (!cat || c.dataset.cat === cat) && (!q || c.dataset.busca.includes(q));
        c.hidden = !ok; if (ok) n++;
        c.style.order = q && norm(c.querySelector('dt').textContent).includes(q) ? -1 : 0;
      });
      pill(out(root, 'n'), 'info', `${n} de ${cards.length} termos`);
      out(root, 'vazio').hidden = n > 0;
    }
    chips.forEach(b => b.addEventListener('click', () => {
      cat = b.dataset.gcat;
      chips.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      draw();
    }));
    qIn.addEventListener('input', draw);
    draw();
    return {};
  };
})();
