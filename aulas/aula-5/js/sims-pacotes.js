/* ==========================================================
   Simulações — o conteúdo das mensagens: pedido e resposta HTTP,
   os bytes de um PUBLISH do MQTT e uma struct do ESP‑NOW virando bytes.
   Só montam e mostram a mensagem; nada aqui se conecta a uma placa.
   Usa os utilitários de kit.js e de sims-redes.js (along, node).
   ========================================================== */
(function () {
  const { C, S, out, inp, act, fmt, stageOf, txt, wire, seg, pill, toggleBtn } = window.KIT;
  const H2 = n => n.toString(16).toUpperCase().padStart(2, '0');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const enc = new TextEncoder();
  const bytesOf = s => Array.from(enc.encode(s));
  const charOf = b => b >= 32 && b <= 126 ? String.fromCharCode(b) : b === 13 ? '\\r' : b === 10 ? '\\n' : '·';

  // grupo de bytes: rótulo em cima, células hex + caractere
  function group(lab, cls, bytes, o = {}) {
    const cells = bytes.map(b => `<i><b>${H2(b)}</b><small>${o.chars ? esc(charOf(b)) : o.sub ? o.sub(b) : '&nbsp;'}</small></i>`).join('');
    return `<div class="pg ${cls}"><span>${lab} · ${bytes.length} B</span><div class="cells">${cells}</div></div>`;
  }

  /* ======================================================
     HTTP: anatomia do pedido e da resposta
     ====================================================== */
  SIMS.http = root => {
    const svg = stageOf(root);
    const CX = 70, SX = 450, Y = 40;
    const cliN = S('g', {}, svg), srvN = S('g', {}, svg);
    function nodes(cli, srv) {
      cliN.textContent = ''; srvN.textContent = '';
      window.KIT.node(cliN, CX, Y, cli[0], cli[1], C.blue, { w: 124, h: 46 });
      window.KIT.node(srvN, SX, Y, srv[0], srv[1], C.orange, { w: 124, h: 46 });
    }
    wire(svg, `M${CX + 62} ${Y} H${SX - 62}`, { color: C.border, w: 2, dash: '4 5' });
    const dot = S('circle', { r: 7, fill: C.orange, opacity: 0 }, svg);
    const lab = txt(svg, 260, Y - 10, '', { size: 11, weight: 600 });

    const SC = {
      get: {
        cli: ['celular', 'navegador'], srv: ['servidor', 'api.exemplo.com'],
        req: ['GET /temperatura HTTP/1.1', 'Host: api.exemplo.com', 'Accept: application/json'], reqBody: '',
        res: 'HTTP/1.1 200 OK', resH: ['Content-Type: application/json'], resBody: '{"temp":24.5,"unidade":"C"}',
        cap: '<b>GET</b> pede um dado. O servidor responde <b>200 OK</b> e manda a leitura no corpo, em JSON.'
      },
      post: {
        cli: ['ESP32', 'cliente HTTP'], srv: ['servidor', 'api.exemplo.com'],
        req: ['POST /leituras HTTP/1.1', 'Host: api.exemplo.com', 'Content-Type: application/json'], reqBody: '{"sensor":"sala","temp":24.5}',
        res: 'HTTP/1.1 201 Created', resH: ['Content-Type: application/json'], resBody: '{"id":118}',
        cap: '<b>POST</b> envia um dado. A leitura vai no <b>corpo</b> do pedido; o servidor guarda e responde <b>201 Created</b> com o número do registro.'
      },
      e404: {
        cli: ['celular', 'navegador'], srv: ['servidor', 'api.exemplo.com'],
        req: ['GET /lampada HTTP/1.1', 'Host: api.exemplo.com'], reqBody: '',
        res: 'HTTP/1.1 404 Not Found', resH: ['Content-Type: text/plain'], resBody: 'rota não encontrada',
        cap: 'O caminho <code>/lampada</code> não existe nesse servidor: a resposta chega normalmente, mas com o código <b>404</b>. A conexão funcionou; o pedido é que não fazia sentido.'
      }
    };
    let sc = SC.get, an = null;
    function msg(first, headers, body) {
      const hs = headers.slice();
      if (body) hs.push('Content-Length: ' + enc.encode(body).length);
      const raw = [first, ...hs].join('\r\n') + '\r\n\r\n' + body;
      const html = `<span class="l">${esc(first)}</span>\n` +
        hs.map(h => { const i = h.indexOf(':'); return `<span class="h">${esc(h.slice(0, i + 1))}</span>${esc(h.slice(i + 1))}`; }).join('\n') +
        `\n<span class="e">⏎ linha em branco: acabaram os cabeçalhos</span>` + (body ? `\n<span class="bd">${esc(body)}</span>` : `\n<span class="e">(sem corpo)</span>`);
      return { html, n: enc.encode(raw).length };
    }
    function show(k) {
      sc = SC[k]; an = null; dot.setAttribute('opacity', 0); lab.textContent = '';
      nodes(sc.cli, sc.srv);
      const q = msg(sc.req[0], sc.req.slice(1), sc.reqBody);
      out(root, 'req', q.html);
      out(root, 'reqn', `pedido · ${q.n} bytes`);
      out(root, 'res', '<span class="e">aguardando o pedido…</span>');
      out(root, 'resn', 'resposta');
      out(root, 'cap', sc.cap);
    }
    function send() {
      out(root, 'res', '<span class="e">aguardando o pedido…</span>');
      an = { p: 0, back: false };
      lab.textContent = sc.req[0].split(' ').slice(0, 2).join(' ');
      lab.setAttribute('fill', C.blue);
    }
    seg(root, 'sc', show);
    act(root, 'send', send);
    show('get');
    return {
      tick(dt) {
        if (!an) return;
        an.p = Math.min(1, an.p + dt / 0.9);
        const x = an.back ? SX - 62 - (SX - CX - 124) * an.p : CX + 62 + (SX - CX - 124) * an.p;
        dot.setAttribute('cx', x); dot.setAttribute('cy', Y);
        dot.setAttribute('fill', an.back ? C.orange : C.blue);
        dot.setAttribute('opacity', 1);
        if (an.p >= 1) {
          if (!an.back) {
            an = { p: 0, back: true };
            lab.textContent = sc.res.split(' ').slice(1).join(' ');
            lab.setAttribute('fill', C.orange);
          } else {
            an = null; dot.setAttribute('opacity', 0);
            const r = msg(sc.res, sc.resH, sc.resBody);
            out(root, 'res', r.html);
            out(root, 'resn', `resposta · ${r.n} bytes`);
          }
        }
      }
    };
  };

  /* ======================================================
     MQTT: os bytes de um pacote PUBLISH
     ====================================================== */
  SIMS.mqttpkt = root => {
    const tIn = inp(root, 't'), pIn = inp(root, 'p'), rIn = inp(root, 'r');
    let qos = 0;
    function remLen(n) {               // comprimento variável: 7 bits por byte, bit 8 = “tem mais”
      const o = [];
      do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; o.push(b); } while (n > 0);
      return o;
    }
    function draw() {
      const topic = tIn.value, pay = pIn.value, ret = rIn.checked ? 1 : 0;
      const tb = bytesOf(topic), pb = bytesOf(pay);
      const b1 = 0x30 | (qos << 1) | ret;
      const rest = 2 + tb.length + (qos ? 2 : 0) + pb.length;
      const rl = remLen(rest);
      const parts = [
        ['tipo + opções', 'o', [b1], { sub: () => 'PUB' }],
        ['tamanho restante', 'y', rl, { sub: b => String(b & 127) }],
        ['tamanho do tópico', 'b', [tb.length >> 8, tb.length & 255], { sub: () => '' }],
        ['tópico', 'b', tb, { chars: true }]
      ];
      if (qos) parts.push(['nº do pacote', 'r', [0x00, 0x01], {}]);
      parts.push(['conteúdo (payload)', 'm', pb, { chars: true }]);
      out(root, 'pkt', parts.map(p => group(...p)).join(''));
      const all = parts.flatMap(p => p[2]);
      out(root, 'dump', all.map(H2).join(' '));
      out(root, 'b1', `<b class="c-orange">0011</b> <b>0</b> <b class="c-blue">${(qos >> 1) & 1}${qos & 1}</b> <b class="c-mint">${ret}</b> = 0x${H2(b1)}`);
      const bad = !topic ? 'tópico vazio' : /[+#]/.test(topic) ? 'curingas + e # não valem ao publicar' : null;
      pill(out(root, 'tot'), bad ? 'off' : 'info', bad || `${all.length} bytes no pacote · ${pb.length} de conteúdo`);
    }
    seg(root, 'qos', v => { qos = +v; draw(); });
    [tIn, pIn, rIn].forEach(e => e.addEventListener('input', draw));
    root.querySelectorAll('[data-ex]').forEach(b => b.addEventListener('click', () => {
      const [t, p] = b.dataset.ex.split('|');
      tIn.value = t; pIn.value = p; draw();
    }));
    draw();
    return {};
  };

  /* ======================================================
     ESP‑NOW: uma struct vira 8 bytes no quadro
     ====================================================== */
  SIMS.espnow = root => {
    const tIn = inp(root, 'temp'), uIn = inp(root, 'umid'), iIn = inp(root, 'id'), bIn = inp(root, 'bt'), bAlt = act(root, 'alt');
    let alt = false;
    const num = x => !isFinite(x) ? String(x) : (x !== 0 && (Math.abs(x) < 1e-3 || Math.abs(x) > 1e6)) ? x.toExponential(2).replace('.', ',') : fmt(x, Number.isInteger(x) ? 0 : 1);
    function draw() {
      const temp = +tIn.value, umid = +uIn.value, id = +iIn.value, bt = bIn.checked ? 1 : 0;
      out(root, 'tv', fmt(temp, 1) + ' °C'); out(root, 'uv', umid + ' %'); out(root, 'iv', id);
      const buf = new ArrayBuffer(8), dv = new DataView(buf);
      dv.setFloat32(0, temp, true); dv.setUint16(4, umid, true); dv.setUint8(6, id); dv.setUint8(7, bt);
      const b = Array.from(new Uint8Array(buf));
      out(root, 'pkt',
        group('temperatura · float', 'o', b.slice(0, 4)) +
        group('umidade · uint16', 'b', b.slice(4, 6)) +
        group('id', 'm', b.slice(6, 7)) +
        group('botão', 'y', b.slice(7, 8)));
      // receptor
      let rows;
      if (!alt) rows = [['temperatura', fmt(dv.getFloat32(0, true), 1) + ' °C'], ['umidade', dv.getUint16(4, true) + ' %'], ['id', dv.getUint8(6)], ['botão', dv.getUint8(7) ? 'apertado' : 'solto']];
      else rows = [['id', dv.getUint8(0)], ['botão', dv.getUint8(1)], ['umidade', dv.getUint16(2, true) + ' %'], ['temperatura', num(dv.getFloat32(4, true)) + ' °C']];
      out(root, 'rx', rows.map(([k, v]) => `<div class="stat ${alt ? 'red' : 'mint'}"><span>${k}</span><b style="font-size:15px">${v}</b></div>`).join(''));
      out(root, 'cap', alt
        ? 'O receptor usa uma struct com os campos <b>em outra ordem</b>. Os bytes chegaram perfeitos, mas ele lê cada pedaço como se fosse outra coisa: números sem sentido.'
        : `Os 4 bytes da temperatura saem “de trás para frente” (o ESP32 guarda o byte menos significativo primeiro). O receptor usa <b>a mesma struct</b> e recupera os valores exatos.`);
    }
    [tIn, uIn, iIn, bIn].forEach(e => e.addEventListener('input', draw));
    bAlt.addEventListener('click', () => { alt = !alt; toggleBtn(bAlt, alt); draw(); });
    draw();
    return {};
  };

  /* ======================================================
     Glossário: busca por texto e filtro por assunto
     ====================================================== */
  SIMS.glossario = root => {
    const qIn = inp(root, 'q');
    const cards = Array.from(root.querySelectorAll('.gl'));
    const chips = Array.from(root.querySelectorAll('[data-gcat]'));
    let cat = '';
    const norm = x => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/‑/g, '-');
    function draw() {
      const q = norm(qIn.value.trim());
      let n = 0;
      cards.forEach(c => {
        const ok = (!cat || c.dataset.cat === cat) && (!q || norm(c.dataset.busca).includes(q));
        c.hidden = !ok; if (ok) n++;
        // o termo cujo nome (ou sigla por extenso) bate vem primeiro
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
