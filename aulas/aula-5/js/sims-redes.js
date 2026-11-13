/* ==========================================================
   Simulações — arquiteturas de comunicação, encapsulamento TCP/IP
   e TCP × UDP.
   Usa os utilitários publicados em window.KIT por kit.js.
   Publica KIT.along, KIT.seqd e KIT.consoleLog para sims-mqtt.js.
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, clamp, lerp, fmt, stageOf, txt, wire, seg, pill, toggleBtn } = window.KIT;

  // posição ao longo de uma poligonal, u em [0,1]
  function along(pts, u) {
    const L = [0];
    for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const d = clamp(u, 0, 1) * L[L.length - 1];
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const k = (d - L[i - 1]) / (L[i] - L[i - 1] || 1);
    return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k];
  }
  const pathLen = pts => pts.reduce((s, p, i) => i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0, 0);

  // console estilo monitor serial: linhas com classe opcional, rolagem automática
  function consoleLog(el, max = 60) {
    return (text, cls) => {
      const sp = document.createElement('span');
      sp.textContent = text + '\n';
      if (cls) sp.className = cls;
      el.appendChild(sp);
      while (el.childNodes.length > max) el.removeChild(el.firstChild);
      el.scrollTop = el.scrollHeight;
    };
  }

  // caixa de nó com nome e subtítulo
  function node(g, x, y, name, sub, col, o = {}) {
    const w = o.w || 108, h = o.h || 46;
    const grp = S('g', { opacity: o.faded ? 0.35 : 1 }, g);
    S('rect', { x: x - w / 2, y: y - h / 2, width: w, height: h, rx: 10, fill: C.plot, stroke: col, 'stroke-width': 2.5 }, grp);
    txt(grp, x, y + (sub ? -3 : 5), name, { fill: col, size: 13, weight: 700 });
    if (sub) txt(grp, x, y + 13, sub, { size: 10.5 });
    if (o.cross) {
      S('path', { d: `M${x - 16} ${y - 16} l32 32 m0 -32 l-32 32`, stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    }
    return grp;
  }

  /* ======================================================
     Sequência animada (diagrama de setas entre duas linhas de vida).
     run(gerador): cada yield devolve uma linha
       { dir: 'r'|'l', label, color, lost } ou { note, side: 'l'|'r', color }
     e o gerador só continua quando a animação daquela linha termina.
     ====================================================== */
  function seqd(svg, nameL, nameR, o = {}) {
    const XL = 92, XR = 428, TOP = 54, RH = 22, MAXR = 10, H = 280;
    const DUR = o.dur || 0.45, NOTE = 0.35;
    S('rect', { x: XL - 62, y: 6, width: 124, height: 28, rx: 8, fill: C.plot, stroke: C.mint, 'stroke-width': 2 }, svg);
    txt(svg, XL, 25, nameL, { fill: C.mint, size: 12.5, weight: 700 });
    S('rect', { x: XR - 62, y: 6, width: 124, height: 28, rx: 8, fill: C.plot, stroke: C.orange, 'stroke-width': 2 }, svg);
    txt(svg, XR, 25, nameR, { fill: C.orange, size: 12.5, weight: 700 });
    wire(svg, `M${XL} 34 V${H - 4} M${XR} 34 V${H - 4}`, { color: C.border, w: 2, dash: '4 4' });
    const g = S('g', {}, svg);
    const idle = txt(svg, 260, 160, o.idle || 'Clique no botão para enviar', { size: 12 });
    let rows = [], cur = null, gen = null, onEnd = null;
    function next() {
      const r = gen.next();
      if (r.done) { gen = null; cur = null; onEnd && onEnd(); return; }
      cur = Object.assign({ p: 0 }, r.value);
      rows.push(cur);
    }
    function render() {
      g.textContent = '';
      const vis = rows.slice(-MAXR);
      vis.forEach((r, j) => {
        const y = TOP + j * RH;
        if (r.note) {
          const right = r.side === 'r';
          const t = txt(g, right ? XR - 8 : XL + 8, y + 4, r.note, { fill: r.color || C.muted, size: 10.5, anchor: right ? 'end' : 'start' });
          t.setAttribute('opacity', Math.min(1, r.p * 2));
          return;
        }
        const x0 = r.dir === 'r' ? XL : XR, x1 = r.dir === 'r' ? XR : XL;
        const full = r.lost ? lerp(x0, x1, 0.55) : x1 - Math.sign(x1 - x0) * 3;
        const xe = lerp(x0, full, r.p);
        S('path', { d: `M${x0} ${y} H${xe}`, stroke: r.color, 'stroke-width': 2, 'stroke-dasharray': r.lost ? '5 4' : 'none' }, g);
        if (r.p >= 1 && !r.lost) {
          const s = Math.sign(x1 - x0);
          S('path', { d: `M${xe} ${y} l${-8 * s} -4.5 v9 Z`, fill: r.color }, g);
        }
        if (r.p < 1) S('circle', { cx: xe, cy: y, r: 4.5, fill: r.color }, g);
        txt(g, (x0 + x1) / 2 + (r.lost ? (r.dir === 'r' ? -40 : 40) : 0), y - 5, r.label, { fill: r.color, size: 10.5, weight: 600 });
        if (r.lost && r.p >= 1) txt(g, xe + 2, y + 5, '✗', { fill: C.red, size: 15, weight: 700 });
      });
      if (rows.length > MAXR) txt(g, 260, TOP - 14, `↑ ${rows.length - MAXR} linhas anteriores`, { size: 10 });
    }
    return {
      run(generator, end) { rows = []; gen = generator; onEnd = end; idle.setAttribute('opacity', 0); next(); render(); },
      get busy() { return !!gen; },
      tick(dt) {
        if (!cur) return;
        cur.p = Math.min(1, cur.p + dt / (cur.note ? NOTE : DUR));
        render();
        if (cur.p >= 1) next();
      },
      reset(msg) { rows = []; gen = null; cur = null; render(); idle.textContent = msg || o.idle || 'Clique no botão para enviar'; idle.setAttribute('opacity', 1); }
    };
  }

  Object.assign(window.KIT, { along, pathLen, seqd, consoleLog, node });

  /* ======================================================
     Arquiteturas de comunicação com ESP32
     ====================================================== */
  SIMS.arch = root => {
    const svg = stageOf(root);
    const gBase = S('g', {}, svg), gPk = S('g', {}, svg);
    const MODES = {
      sta: {
        clouds: [[440, 70, 72, 46, 'Internet']],
        nodes: [[80, 200, 'ESP32', '192.168.0.23', C.mint], [260, 200, 'roteador', 'gateway', C.yellow], [440, 82, 'servidor', 'IP público', C.blue], [80, 70, 'celular', '192.168.0.10', C.blue]],
        links: [[0, 1, 'air'], [3, 1, 'air'], [1, 2, 'wire']],
        flows: [[[0, 1, 2], C.mint, 2.2, 0], [[2, 1, 0], C.blue, 2.2, 1.1]],
        pills: [['on', 'Internet: sim'], ['info', 'roteador: necessário'], ['info', 'alcance: o do roteador']],
        desc: 'O ESP32 é <b>mais um aparelho</b> da rede de casa. Recebe um IP privado do roteador e sai para a Internet por ele. É a base de quase todo projeto IoT: enviar leituras a um servidor ou conversar com um broker.'
      },
      ap: {
        clouds: [[440, 60, 64, 38, 'Internet', true]],
        range: [260, 150, 125],
        nodes: [[260, 150, 'ESP32 (AP)', '192.168.4.1', C.mint], [80, 70, 'celular', '192.168.4.2', C.blue], [80, 230, 'notebook', '192.168.4.3', C.blue]],
        links: [[1, 0, 'air'], [2, 0, 'air']],
        flows: [[[1, 0], C.blue, 2.6, 0], [[0, 1], C.mint, 2.6, 0.7], [[2, 0], C.blue, 3.4, 1.4], [[0, 2], C.mint, 3.4, 2.1]],
        pills: [['off', 'Internet: não'], ['info', 'roteador: o próprio ESP32'], ['warn', 'alcance: ~30–50 m']],
        desc: 'O ESP32 <b>vira o roteador</b>: cria a rede “ESP32‑LED” e responde em 192.168.4.1. O celular conecta nela e abre a página que o próprio ESP32 serve. Funciona no meio do campo, sem Internet, mas só para quem está perto.'
      },
      now: {
        nodes: [[90, 140, 'ESP32 A', 'controle', C.mint], [440, 70, 'ESP32 B', 'MAC …:3C:90', C.mint], [440, 215, 'ESP32 C', 'MAC …:7A:12', C.mint], [265, 40, 'roteador', 'não precisa', C.yellow, true]],
        links: [[0, 1, 'air'], [0, 2, 'air']],
        flows: [[[0, 1], C.yellow, 1.4, 0], [[0, 2], C.yellow, 1.4, 0.5], [[2, 0], C.orange, 2.8, 1.2]],
        pills: [['off', 'Internet: não'], ['info', 'roteador: não'], ['info', 'alcance: ~100–200 m']],
        desc: 'Protocolo da Espressif: um ESP32 manda um pacote <b>direto ao endereço MAC</b> do outro, sem entrar em rede nenhuma. Liga e transmite em milissegundos, bom para bateria. Mensagens de até 250 bytes; sozinho, não chega à Internet.'
      },
      mqtt: {
        clouds: [[260, 145, 100, 58, 'Internet']],
        nodes: [[260, 150, 'broker', 'MQTT', C.orange], [80, 50, 'celular', 'publica', C.blue], [80, 230, 'ESP32 LED', 'assina', C.mint], [440, 230, 'ESP32 sensor', 'publica', C.mint], [440, 50, 'painel', 'assina', C.blue]],
        links: [[1, 0, 'wire'], [2, 0, 'wire'], [3, 0, 'wire'], [4, 0, 'wire']],
        flows: [[[1, 0, 2], C.orange, 3, 0], [[3, 0, 4], C.blue, 2.4, 0.8], [[3, 0, 1], C.blue, 2.4, 0.8]],
        pills: [['on', 'Internet: sim'], ['info', 'roteador + broker'], ['on', 'alcance: o mundo']],
        desc: 'Cada aparelho conecta, como estação, a um <b>broker</b> na Internet. O celular publica em <code>casa/led</code>; o broker entrega ao ESP32 que assinou esse tópico. Ninguém precisa saber o IP de ninguém: funciona de qualquer lugar.'
      }
    };
    let M, flows = [], pk = [], t = 0;
    function build(k) {
      M = MODES[k];
      gBase.textContent = ''; gPk.textContent = ''; pk = [];
      (M.clouds || []).forEach(([x, y, rx, ry, lab, cross]) => {
        S('ellipse', { cx: x, cy: y, rx, ry, fill: C.surf, stroke: C.wire, 'stroke-width': 2, opacity: cross ? 0.4 : 1 }, gBase);
        txt(gBase, x, y - ry + 16, lab, { size: 11 });
        if (cross) {
          S('path', { d: `M${x - 18} ${y - 14} l36 32 m0 -32 l-36 32`, stroke: C.red, 'stroke-width': 4, 'stroke-linecap': 'round' }, gBase);
          txt(gBase, x, y + ry + 16, 'sem Internet', { fill: C.red, size: 11 });
        }
      });
      if (M.range) S('circle', { cx: M.range[0], cy: M.range[1], r: M.range[2], fill: 'none', stroke: C.mint, 'stroke-width': 1.5, 'stroke-dasharray': '3 6', opacity: 0.6 }, gBase);
      M.links.forEach(([a, b, kind]) => {
        const A = M.nodes[a], B = M.nodes[b];
        wire(gBase, `M${A[0]} ${A[1]} L${B[0]} ${B[1]}`, kind === 'air' ? { color: C.wire, w: 2, dash: '3 6' } : { color: C.border, w: 3 });
      });
      M.nodes.forEach(([x, y, n, s, c, cross]) => node(gBase, x, y, n, s, c, { faded: cross, cross }));
      flows = M.flows.map(([path, col, every, off]) => ({ pts: path.map(i => [M.nodes[i][0], M.nodes[i][1]]), col, every, next: t + off }));
      M.pills.forEach(([cls, html], i) => pill(out(root, 'p' + (i + 1)), cls, html));
      out(root, 'desc', M.desc);
    }
    seg(root, 'modo', build);
    build('sta');
    return {
      tick(dt) {
        t += dt;
        flows.forEach(f => {
          if (t >= f.next) {
            f.next = t + f.every;
            const c = S('circle', { r: 6, fill: f.col }, gPk);
            pk.push({ c, pts: f.pts, u: 0, sp: 150 / pathLen(f.pts) });
          }
        });
        pk = pk.filter(p => {
          p.u += dt * p.sp;
          if (p.u >= 1) { p.c.remove(); return false; }
          const [x, y] = along(p.pts, p.u);
          p.c.setAttribute('cx', x); p.c.setAttribute('cy', y);
          return true;
        });
      }
    };
  };

  /* ======================================================
     Encapsulamento: o pacote descendo e subindo as camadas
     ====================================================== */
  SIMS.encap = root => {
    const svg = stageOf(root);
    const ROWS = [50, 110, 170, 230, 272];
    const NAMES = [['APLICAÇÃO', C.orange], ['TRANSPORTE', C.mint], ['INTERNET', C.blue], ['REDE', C.yellow]];
    NAMES.forEach(([n, c], i) => {
      S('rect', { x: 0, y: ROWS[i] - 25, width: 520, height: 50, rx: 8, fill: C.plot }, svg);
      txt(svg, 10, ROWS[i] + 4, n, { fill: c, size: 11.5, weight: 700, anchor: 'start' });
    });
    txt(svg, 10, ROWS[4] + 4, 'NO AR', { fill: C.muted, size: 11.5, weight: 700, anchor: 'start' });
    const bits = S('g', {}, svg);
    const SEGS = {
      wifi: ['Wi‑Fi', 'MACs', 78, C.yellow, 30],
      ip: ['IP', 'orig. → dest.', 92, C.blue, 20],
      tcp: ['TCP', '51234 → 1883', 96, C.mint, 20],
      mqtt: ['MQTT', 'casa/led · ON', 112, C.orange, 14],
      fcs: ['FCS', '', 36, C.yellow, 4]
    };
    const ORDER = ['wifi', 'ip', 'tcp', 'mqtt', 'fcs'];
    const pkt = S('g', {}, svg);
    const el = {};
    ORDER.forEach(k => {
      const [lab, sub, w, col] = SEGS[k];
      const g = S('g', { opacity: 0 }, pkt);
      S('rect', { x: 0, y: -19, width: w - 3, height: 38, rx: 6, fill: C.surf, stroke: col, 'stroke-width': 2 }, g);
      txt(g, (w - 3) / 2, sub ? -2 : 5, lab, { fill: col, size: 12, weight: 700 });
      if (sub) txt(g, (w - 3) / 2, 12, sub, { size: 9.5 });
      el[k] = { g, x: 300, tx: 300, op: 0, w };
    });
    const ALL = ['wifi', 'ip', 'tcp', 'mqtt', 'fcs'];
    const STEPS = [
      [0, ['mqtt'], 'ESP32 · enviando', '<b>Aplicação</b>: a biblioteca MQTT monta um PUBLISH com o tópico <code>casa/led</code> e o conteúdo <code>ON</code>.'],
      [1, ['tcp', 'mqtt'], 'ESP32 · enviando', '<b>Transporte</b>: o TCP acrescenta as portas (de 51234, sorteada, para 1883, a do broker) e o número de sequência, para conferir a entrega.'],
      [2, ['ip', 'tcp', 'mqtt'], 'ESP32 · enviando', '<b>Internet</b>: o IP acrescenta o endereço de origem (192.168.0.23) e o de destino: o IP público do broker, descoberto pelo DNS.'],
      [3, ALL, 'ESP32 · enviando', '<b>Rede</b>: o Wi‑Fi põe tudo entre o MAC do ESP32 e o MAC do roteador, mais um código de verificação de erros (FCS) no fim.'],
      [4, ALL, 'no caminho', '<b>No ar</b>: os bits viram ondas de rádio até o roteador. Ele troca o envelope de rede (o NAT troca também o IP de origem) e o pacote segue, roteador a roteador, olhando só o IP.'],
      [3, ALL, 'broker · recebendo', '<b>Rede</b>: o pacote chega à placa de rede do servidor (por cabo, Ethernet). Ela confere o FCS e tira o envelope do enlace.'],
      [2, ['ip', 'tcp', 'mqtt'], 'broker · recebendo', '<b>Internet</b>: o IP de destino é o meu? Sim. Tira o cabeçalho IP e entrega o resto ao TCP.'],
      [1, ['tcp', 'mqtt'], 'broker · recebendo', '<b>Transporte</b>: o TCP confere a sequência, devolve a confirmação (ACK) e entrega à porta 1883, onde o programa do broker escuta.'],
      [0, ['mqtt'], 'broker · recebendo', '<b>Aplicação</b>: o broker lê o PUBLISH (<code>casa/led</code> = <code>ON</code>) e repassa a cada assinante. O caminho todo se repete até o celular ou o ESP32 que assinou.']
    ];
    let step = 0, py = ROWS[0], play = false, tPlay = 0, t = 0;
    const bPlay = act(root, 'play');
    function show(n) {
      step = (n + STEPS.length) % STEPS.length;
      const [row, have, side, cap] = STEPS[step];
      const segs = ORDER.filter(k => have.includes(k));
      const W = segs.reduce((s, k) => s + el[k].w, 0);
      let x = 112 + (404 - W) / 2;
      ORDER.forEach(k => {
        const on = segs.includes(k);
        if (on) { el[k].tx = x; x += el[k].w; if (el[k].op === 0) el[k].x = el[k].tx - 30; }
        el[k].top = on ? 1 : 0;
      });
      out(root, 'side', side);
      out(root, 'cap', cap);
      const bytes = segs.reduce((s, k) => s + SEGS[k][4], 0);
      pill(out(root, 'bytes'), bytes > 14 ? 'warn' : 'on', `${bytes} bytes${bytes > 14 ? ` · conteúdo útil: 2` : ''}`);
      bits.textContent = '';
      if (row === 4) for (let i = 0; i < 14; i++) S('text', { x: 0, y: ROWS[4] + 5, text: Math.random() < 0.5 ? '0' : '1', fill: C.yellow, 'font-size': 13, 'font-family': 'IBM Plex Mono, monospace', 'data-i': i }, bits);
    }
    act(root, 'next', () => { show(step + 1); tPlay = 0; });
    act(root, 'back', () => { show(step - 1); tPlay = 0; });
    bPlay.addEventListener('click', () => { play = !play; toggleBtn(bPlay, play, ['Pausar', 'Reproduzir']); tPlay = 0; });
    show(0);
    return {
      tick(dt) {
        t += dt;
        if (play) { tPlay += dt; if (tPlay > 3.2) { tPlay = 0; show(step + 1); } }
        const row = STEPS[step][0];
        const ty = row === 4 ? -100 : ROWS[row];
        py += (ty - py) * Math.min(1, dt * 7);
        pkt.setAttribute('transform', `translate(0 ${py})`);
        pkt.setAttribute('opacity', row === 4 ? 0 : 1);
        ORDER.forEach(k => {
          const e = el[k];
          e.x += (e.tx - e.x) * Math.min(1, dt * 7);
          e.op += (e.top - e.op) * Math.min(1, dt * 8);
          if (Math.abs(e.op) < 0.01 && e.top === 0) e.op = 0;
          e.g.setAttribute('transform', `translate(${e.x} 0)`);
          e.g.setAttribute('opacity', e.op);
        });
        Array.from(bits.childNodes).forEach(b => {
          const i = +b.getAttribute('data-i');
          b.setAttribute('x', 112 + ((t * 120 + i * 30) % 400));
        });
      }
    };
  };

  /* ======================================================
     Transporte: TCP × UDP num enlace com perdas
     ====================================================== */
  SIMS.tcpudp = root => {
    const svg = stageOf(root), lIn = inp(root, 'l');
    const sq = seqd(svg, 'ESP32', 'servidor', { idle: 'Escolha TCP ou UDP e envie as 6 leituras' });
    let proto = 'tcp', got, pk, ms;
    seg(root, 'proto', v => { proto = v; sq.reset(); clear(); });
    const showL = () => out(root, 'l', lIn.value + ' %');
    lIn.addEventListener('input', showL); showL();
    function clear() { ['ok', 'lost', 'pk', 'ms'].forEach(k => out(root, k, '–')); pill(out(root, 'rx'), '', 'servidor recebeu: –'); }
    function upd(final) {
      const N = 6;
      out(root, 'ok', got.size); out(root, 'lost', final ? N - got.size : '…'); out(root, 'pk', pk); out(root, 'ms', ms + ' ms');
      const list = [1, 2, 3, 4, 5, 6].map(i => got.has(i) ? i : '_').join(' ');
      pill(out(root, 'rx'), final ? (got.size === N ? 'on' : 'off') : 'info', 'servidor recebeu: ' + list);
    }
    function* tcp(p) {
      yield { dir: 'r', label: 'SYN', color: C.muted };
      yield { dir: 'l', label: 'SYN‑ACK', color: C.muted };
      yield { dir: 'r', label: 'ACK · conexão aberta', color: C.muted };
      pk += 3; ms += 90; upd();
      for (let i = 1; i <= 6; i++) {
        let ok = false, tries = 0;
        while (!ok && tries < 8) {
          const lost = Math.random() < p; pk++; ms += 30;
          yield { dir: 'r', label: `leitura ${i}${tries ? ' (reenvio)' : ''}`, color: C.mint, lost };
          if (!lost) {
            if (got.has(i)) yield { note: 'repetida: descarta e confirma', side: 'r', color: C.muted };
            got.add(i); upd();
            const al = Math.random() < p; pk++; ms += 30;
            yield { dir: 'l', label: `ACK ${i}`, color: C.blue, lost: al };
            if (!al) ok = true;
          }
          if (!ok) { ms += 200; tries++; upd(); yield { note: '⏱ sem ACK: reenviar', side: 'l', color: C.orange }; }
        }
        upd();
      }
    }
    function* udp(p) {
      for (let i = 1; i <= 6; i++) {
        const lost = Math.random() < p; pk++; ms += 30;
        yield { dir: 'r', label: `leitura ${i}`, color: C.orange, lost };
        if (!lost) got.add(i);
        upd();
      }
    }
    act(root, 'go', () => {
      if (sq.busy) return;
      got = new Set(); pk = 0; ms = 0; upd();
      const p = +lIn.value / 100;
      sq.run(proto === 'tcp' ? tcp(p) : udp(p), () => upd(true));
    });
    clear();
    return { tick(dt) { sq.tick(dt); } };
  };

})();
