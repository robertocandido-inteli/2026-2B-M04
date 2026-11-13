/* ==========================================================
   Simulações — MQTT: broker publish/subscribe, tópicos e curingas,
   e QoS 0/1/2.
   Usa os utilitários de kit.js e de sims-redes.js (along, seqd, consoleLog, node).
   ========================================================== */
(function () {
  const { C, S, $, out, inp, act, fmt, stageOf, txt, wire, seg, pill, toggleBtn, glow, along, pathLen, seqd, consoleLog, node } = window.KIT;

  // filtro MQTT × tópico (com + e #)
  function match(filter, topic) {
    const f = filter.split('/'), t = topic.split('/');
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return true;
      if (i >= t.length) return false;
      if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return f.length === t.length;
  }
  function invalid(filter) {
    if (!filter) return 'filtro vazio';
    const f = filter.split('/');
    for (let i = 0; i < f.length; i++) {
      if (f[i].includes('#') && (f[i] !== '#' || i !== f.length - 1)) return '# só pode aparecer sozinho, no último nível';
      if (f[i].includes('+') && f[i] !== '+') return '+ precisa ocupar o nível inteiro (ex.: casa/+/led)';
    }
    return null;
  }
  // por que não combinou
  function why(filter, topic) {
    const f = filter.split('/'), t = topic.split('/');
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return '';
      if (i >= t.length) return 'níveis a menos';
      if (f[i] !== '+' && f[i] !== t[i]) return f[i].toLowerCase() === t[i].toLowerCase() ? `“${t[i]}” ≠ “${f[i]}” (maiúscula)` : `nível ${i + 1}: “${t[i]}” ≠ “${f[i]}”`;
    }
    return f.length === t.length ? '' : 'níveis a mais';
  }

  // mensagem animada ao longo de um caminho; drop em [0,1] para perder no meio
  function flyer(layer) {
    let list = [];
    return {
      send(pts, label, col, onArrive, drop, speed = 300) {
        const g = S('g', {}, layer);
        S('circle', { r: 7, fill: col }, g);
        if (label) txt(g, 0, -11, label, { fill: col, size: 11, weight: 600 });
        list.push({ g, pts, u: 0, sp: speed / pathLen(pts), onArrive, drop, dead: 0 });
      },
      tick(dt) {
        // quem chegou é tratado depois do filtro: se onArrive enviar uma mensagem nova
        // durante o filtro, ela entraria na lista antiga e se perderia
        const arrived = [];
        list = list.filter(m => {
          if (m.dead) {
            m.dead += dt; m.g.setAttribute('opacity', Math.max(0, 1 - m.dead / 1.2));
            if (m.dead > 1.2) { m.g.remove(); return false; }
            return true;
          }
          m.u += dt * m.sp;
          if (m.drop != null && m.u >= m.drop) {
            m.u = m.drop; m.dead = 0.001;
            txt(m.g, 0, 6, '✗', { fill: C.red, size: 22, weight: 700 });
          }
          const [x, y] = along(m.pts, Math.min(1, m.u));
          m.g.setAttribute('transform', `translate(${x} ${y})`);
          if (!m.dead && m.u >= 1) { m.g.remove(); if (m.onArrive) arrived.push(m.onArrive); return false; }
          return true;
        });
        arrived.forEach(f => f());
      },
      clear() { list.forEach(m => m.g.remove()); list = []; }
    };
  }

  /* ======================================================
     Broker publish/subscribe
     ====================================================== */
  SIMS.pubsub = root => {
    const svg = stageOf(root);
    const log = consoleLog(out(root, 'log'), 40);
    const B = [260, 145];
    const CL = [
      { n: 'Celular', x: 88, y: 46, col: C.blue, subs: ['casa/+/temp'], tag: 'assina casa/+/temp' },
      { n: 'ESP32 LED', x: 88, y: 244, col: C.mint, subs: ['casa/sala/led'], tag: 'assina casa/sala/led' },
      { n: 'ESP32 sensor', x: 432, y: 244, col: C.mint, subs: [], tag: 'só publica' },
      { n: 'Painel', x: 432, y: 46, col: C.blue, subs: ['casa/#'], tag: 'assina casa/#' }
    ];
    const gLinks = S('g', {}, svg);
    const links = CL.map(c => wire(gLinks, `M${c.x} ${c.y} L${B[0]} ${B[1]}`, { color: C.border, w: 3 }));
    S('rect', { x: B[0] - 62, y: B[1] - 28, width: 124, height: 56, rx: 12, fill: C.surf2, stroke: C.orange, 'stroke-width': 3 }, svg);
    txt(svg, B[0], B[1] - 2, 'BROKER', { fill: C.orange, size: 14, weight: 700 });
    const bSub = txt(svg, B[0], B[1] + 15, 'aguardando', { size: 10.5 });
    const nodes = CL.map(c => {
      const g = node(svg, c.x, c.y, c.n, c.tag, c.col, { w: 150, h: 44 });
      return g;
    });
    // estado visível nos clientes
    const ledHalo = S('circle', { cx: 184, cy: 244, r: 34, fill: glow(svg, C.red), opacity: 0 }, svg);
    const led = S('circle', { cx: 184, cy: 244, r: 11, fill: C.red, 'fill-opacity': 0.2, stroke: C.red, 'stroke-width': 2 }, svg);
    const ledT = txt(svg, 88, 282, 'LED apagado', { fill: C.text2, size: 11 });
    const phoneT = txt(svg, 88, 84, 'temp: –', { fill: C.text2, size: 11 });
    // painel (dashboard): mostra tudo de casa/#
    const panelBox = S('rect', { x: 362, y: 74, width: 140, height: 44, rx: 8, fill: C.plot, stroke: C.border }, svg);
    const panelTemp = txt(svg, 432, 92, 'temp  –', { fill: C.text2, size: 11.5, weight: 600 });
    const panelLed = txt(svg, 432, 109, 'LED   –', { fill: C.text2, size: 11.5, weight: 600 });
    const sensT = txt(svg, 432, 282, '', { fill: C.text2, size: 11 });
    const fl = flyer(S('g', {}, svg));

    let ledOn = false, nextLed = 'ON', temp = 24.5, panelOn = true, tAuto = 2, delivered = 0, t = 0;
    const bPanel = act(root, 'panel');
    function cnt() { pill(out(root, 'cnt'), 'info', `cópias entregues: ${delivered}`); }
    function publish(from, topic, payload) {
      const c = CL[from];
      log(`${c.n} → PUBLISH ${topic} = ${payload}`, 'dim');
      fl.send([[c.x, c.y], B], payload, C.orange, () => {
        const subs = CL.map((s, i) => i).filter(i => i !== from && (i !== 3 || panelOn) && CL[i].subs.some(f => match(f, topic)));
        bSub.textContent = `${topic} → ${subs.length} assinante${subs.length === 1 ? '' : 's'}`;
        log(subs.length ? `broker: ${topic} combina com ${subs.map(i => CL[i].n).join(', ')}` : `broker: ninguém assina ${topic}; mensagem descartada`, subs.length ? 'ok' : 'warn');
        subs.forEach(i => fl.send([B, [CL[i].x, CL[i].y]], payload, C.blue, () => { delivered++; cnt(); deliver(i, topic, payload); }));
      });
    }
    function deliver(i, topic, payload) {
      if (i === 1) {
        ledOn = payload === 'ON';
        led.setAttribute('fill-opacity', ledOn ? 1 : 0.2); ledHalo.setAttribute('opacity', ledOn ? 1 : 0);
        ledT.textContent = ledOn ? 'LED aceso' : 'LED apagado';
        ledT.setAttribute('fill', ledOn ? C.red : C.text2);
      }
      if (i === 0) phoneT.textContent = `temp: ${payload} °C`;
      if (i === 3) {
        if (topic.endsWith('/temp')) { panelTemp.textContent = `temp  ${payload} °C`; panelTemp.setAttribute('fill', C.blue); }
        if (topic.endsWith('/led')) { panelLed.textContent = `LED   ${payload}`; panelLed.setAttribute('fill', payload === 'ON' ? C.mint : C.text2); }
      }
    }
    act(root, 'led', () => {
      publish(0, 'casa/sala/led', nextLed);
      nextLed = nextLed === 'ON' ? 'OFF' : 'ON';
      out(root, 'nx', nextLed);
    });
    function pubTemp() {
      temp = Math.max(21, Math.min(28, temp + (Math.random() - 0.5) * 0.8));
      const v = fmt(temp, 1).replace(',', '.');
      sensT.textContent = `lido: ${v} °C`;
      publish(2, 'casa/sala/temp', v);
    }
    act(root, 'temp', () => { tAuto = 6; pubTemp(); });
    bPanel.addEventListener('click', () => {
      panelOn = !panelOn;
      toggleBtn(bPanel, !panelOn, ['Reconectar painel', 'Desconectar painel']);
      links[3].setAttribute('stroke-dasharray', panelOn ? 'none' : '4 6');
      [nodes[3], panelBox, panelTemp, panelLed].forEach(e => e.setAttribute('opacity', panelOn ? 1 : 0.35));
      log(panelOn ? 'Painel conectou e assinou casa/#' : 'Painel desconectou (o sensor nem fica sabendo)', panelOn ? 'ok' : 'warn');
    });
    cnt();
    return {
      tick(dt) {
        t += dt; tAuto -= dt;
        if (tAuto <= 0) { tAuto = 6; pubTemp(); }
        fl.tick(dt);
      }
    };
  };

  /* ======================================================
     Tópicos e curingas
     ====================================================== */
  SIMS.topics = root => {
    const fIn = inp(root, 'f');
    const TOPICS = ['casa/sala/led', 'casa/sala/temp', 'casa/quarto/led', 'casa/quarto/temp', 'casa/sala/led/state', 'casa/cozinha/gas', 'escritorio/sala/temp', 'Casa/sala/led'];
    const PRE = ['casa/sala/led', 'casa/+/led', 'casa/#', '+/+/temp', 'casa/+', 'casa/sala/#', '#', 'casa/#/led'];
    const EXPL = {
      'casa/sala/led': 'Sem curinga: só o tópico idêntico, letra por letra.',
      'casa/+/led': '<b>+</b> vale exatamente um nível: sala, quarto, qualquer um. Mas não pega <code>casa/sala/led/state</code>, que tem um nível a mais.',
      'casa/#': '<b>#</b> pega tudo abaixo de <code>casa</code>, com qualquer número de níveis. Não pega <code>Casa/…</code>: maiúsculas importam.',
      '+/+/temp': 'Temperatura de qualquer cômodo de qualquer prédio: o <code>escritorio</code> também entra.',
      'casa/+': 'Só tópicos com <b>exatamente dois</b> níveis começando por casa. Nenhum da lista tem só dois níveis.',
      'casa/sala/#': 'Tudo da sala, inclusive <code>casa/sala/led/state</code>.',
      '#': 'Assina <b>tudo</b> o que passa pelo broker. Num broker público, isso mostra as mensagens de todo mundo.',
      'casa/#/led': 'Inválido: o <b>#</b> só pode ficar no último nível. O broker recusa essa assinatura.'
    };
    const preBox = out(root, 'pre');
    PRE.forEach(p => {
      const b = document.createElement('button');
      b.className = 'btn ghost sm'; b.textContent = p;
      b.addEventListener('click', () => { fIn.value = p; draw(); });
      preBox.appendChild(b);
    });
    const ul = out(root, 'list');
    function draw() {
      const f = fIn.value.trim();
      const bad = invalid(f);
      let n = 0;
      ul.innerHTML = TOPICS.map(t => {
        const ok = !bad && match(f, t);
        if (ok) n++;
        const r = bad ? '' : ok ? 'combina' : why(f, t);
        return `<li class="${ok ? 'hit' : ''}"><i>${ok ? '✓' : '✗'}</i><span>${t}</span><small>${r}</small></li>`;
      }).join('');
      out(root, 'ok', bad ? '<span class="c-red">inválido</span>' : 'válido');
      pill(out(root, 'n'), bad ? 'off' : n ? 'on' : 'warn', bad ? 'filtro inválido' : `${n} de ${TOPICS.length} tópicos`);
      out(root, 'why', bad ? `<span class="c-red">${bad}.</span> ${EXPL[f] || ''}` : (EXPL[f] || 'Digite um filtro ou escolha um exemplo acima.'));
    }
    fIn.addEventListener('input', draw);
    draw();
    return {};
  };

  /* ======================================================
     QoS 0, 1 e 2 num enlace com perdas
     ====================================================== */
  SIMS.qos = root => {
    const svg = stageOf(root), lIn = inp(root, 'l');
    const sq = seqd(svg, 'cliente', 'broker', { idle: 'Escolha o QoS e publique as 5 mensagens', dur: 0.4 });
    let qos = 0, got, dup, pk;
    const N = 5;
    seg(root, 'qos', v => { qos = +v; sq.reset(); clear(); });
    const showL = () => out(root, 'l', lIn.value + ' %');
    lIn.addEventListener('input', showL); showL();
    function clear() { ['ok', 'lost', 'dup', 'pk'].forEach(k => out(root, k, '–')); }
    function upd(final) { out(root, 'ok', got.size); out(root, 'lost', final ? N - got.size : '…'); out(root, 'dup', dup); out(root, 'pk', pk); }
    const loss = p => Math.random() < p;
    function* q0(p) {
      for (let i = 1; i <= N; i++) {
        const l = loss(p); pk++;
        yield { dir: 'r', label: `PUBLISH ${i}`, color: C.orange, lost: l };
        if (!l) got.add(i);
        upd();
      }
    }
    function* q1(p) {
      for (let i = 1; i <= N; i++) {
        let done = false, tries = 0;
        while (!done && tries < 8) {
          const l = loss(p); pk++;
          yield { dir: 'r', label: `PUBLISH ${i}${tries ? ' DUP' : ''}`, color: C.orange, lost: l };
          if (!l) {
            if (got.has(i)) { dup++; upd(); yield { note: `entregou a ${i} de novo!`, side: 'r', color: C.red }; }
            got.add(i); upd();
            const la = loss(p); pk++;
            yield { dir: 'l', label: `PUBACK ${i}`, color: C.blue, lost: la };
            if (!la) done = true;
          }
          if (!done) { tries++; yield { note: '⏱ sem PUBACK: reenvia', side: 'l', color: C.orange }; }
        }
        upd();
      }
    }
    function* q2(p) {
      for (let i = 1; i <= N; i++) {
        let rec = false, tries = 0;
        while (!rec && tries < 8) {
          const l = loss(p); pk++;
          yield { dir: 'r', label: `PUBLISH ${i}${tries ? ' DUP' : ''}`, color: C.orange, lost: l };
          if (!l) {
            if (got.has(i)) yield { note: `id ${i} já visto: não entrega de novo`, side: 'r', color: C.muted };
            got.add(i); upd();
            const lr = loss(p); pk++;
            yield { dir: 'l', label: `PUBREC ${i}`, color: C.blue, lost: lr };
            if (!lr) rec = true;
          }
          if (!rec) { tries++; yield { note: '⏱ sem PUBREC: reenvia', side: 'l', color: C.orange }; }
        }
        let comp = false; tries = 0;
        while (rec && !comp && tries < 8) {
          const l = loss(p); pk++;
          yield { dir: 'r', label: `PUBREL ${i}`, color: C.mint, lost: l };
          if (!l) {
            const lc = loss(p); pk++;
            yield { dir: 'l', label: `PUBCOMP ${i}`, color: C.blue, lost: lc };
            if (!lc) comp = true;
          }
          if (!comp) { tries++; yield { note: '⏱ sem PUBCOMP: reenvia PUBREL', side: 'l', color: C.orange }; }
        }
        upd();
      }
    }
    act(root, 'go', () => {
      if (sq.busy) return;
      got = new Set(); dup = 0; pk = 0; upd();
      const p = +lIn.value / 100;
      sq.run([q0, q1, q2][qos](p), () => upd(true));
    });
    clear();
    return { tick(dt) { sq.tick(dt); } };
  };

})();
