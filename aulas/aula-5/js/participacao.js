/* ==========================================================
   Participação na aula: senha da aula no topo, identificação do aluno,
   quizzes formativos e (quando houver) atividade prática.
   Cada resposta vai para a API assim que é dada (mede o engajamento).
   Nos quizzes formativos o aluno vê a correção logo depois de responder. Sem conexão, as respostas ficam
   guardadas no navegador e são reenviadas quando o servidor voltar.
   ========================================================== */
(function () {
  const CFG = window.AULA_CONFIG || {};
  const API = (CFG.apiUrl || '').trim().replace(/\/+$/, '');
  const ACT = CFG.activityId || 'm04-aula-5';
  const $ = id => document.getElementById(id);

  const store = {
    get(k, session) { try { return (session ? sessionStorage : localStorage).getItem(`${ACT}:${k}`); } catch (_) { return null; } },
    set(k, v, session) { try { const s = session ? sessionStorage : localStorage; v == null ? s.removeItem(`${ACT}:${k}`) : s.setItem(`${ACT}:${k}`, v); } catch (_) { /* sem armazenamento */ } }
  };
  const json = (k, def) => { try { return JSON.parse(store.get(k) || 'null') || def; } catch (_) { return def; } };

  let code = store.get('senha', true) || '';
  let aluno = json('aluno', null);                  // {name, email, turma, grupo}
  let answers = json('respostas', {});
  let pending = store.get('pendente') === '1';
  let online = false;

  /* ---------- API ---------- */
  async function call(path, body) {
    if (!/^https?:\/\//.test(API)) return { status: 0, data: { ok: false, error: 'endereço da API não configurado' } };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 10000);
    try {
      const opt = { headers: { 'ngrok-skip-browser-warning': '1' }, signal: ctl.signal };
      if (body !== undefined) { opt.method = 'POST'; opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
      const r = await fetch(API + path, opt);
      let data = null;
      try { data = await r.json(); } catch (_) { /* sem JSON */ }
      return { status: r.status, data: data || { ok: false, error: `resposta inesperada (${r.status})` } };
    } catch (e) {
      return { status: 0, data: { ok: false, error: 'sem conexão com o servidor' } };
    } finally { clearTimeout(timer); }
  }
  const ACTP = `/api/public/activities/${encodeURIComponent(ACT)}`;

  /* ---------- topo: online + senha ---------- */
  function setOnline(on) {
    online = on;
    const d = $('netDot');
    d.className = 'net-dot ' + (on ? 'on' : 'off');
    d.title = on ? 'Servidor da aula online' : 'Servidor da aula offline';
    $('netLabel').textContent = on ? 'online' : 'offline';
  }
  async function health() {
    const r = await call('/api/public/health');
    setOnline(!!r.data.ok);
    if (r.data.ok && pending && ready()) send();
  }

  function showHeader() {
    const logged = !!code;
    $('accForm').hidden = logged;
    $('accWho').hidden = !logged;
    if (logged) $('accName').textContent = aluno ? aluno.name.split(' ')[0] : 'identifique-se';
  }

  async function tryCode(c) {
    const btn = $('accBtn');
    btn.disabled = true;
    const r = await call(`${ACTP}/access`, { accessCode: c });
    btn.disabled = false;
    if (r.data.ok) {
      code = c.trim().toUpperCase();
      store.set('senha', code, true);
      $('accCode').value = '';
      showHeader();
      if (!aluno) openIdent(); else send();
    } else {
      toast(r.data.error || 'Senha não aceita.', true);
      $('accCode').select();
    }
  }
  $('accForm').addEventListener('submit', e => {
    e.preventDefault();
    const c = $('accCode').value.trim();
    if (c) tryCode(c);
  });
  $('accWho').addEventListener('click', () => openIdent());

  /* ---------- identificação ---------- */
  const dlg = $('identDlg');
  function openIdent() {
    const f = $('identForm');
    if (aluno) { f.nome.value = aluno.name; f.email.value = aluno.email; f.turma.value = aluno.turma || ''; f.grupo.value = aluno.grupo || ''; }
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    setTimeout(() => f.nome.focus(), 50);
  }
  $('identForm').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    if (!f.checkValidity()) { f.reportValidity(); return; }
    aluno = { name: f.nome.value.trim(), email: f.email.value.trim().toLowerCase(), turma: f.turma.value.trim(), grupo: f.grupo.value.trim() };
    store.set('aluno', JSON.stringify(aluno));
    dlg.close ? dlg.close() : dlg.removeAttribute('open');
    showHeader();
    send();
  });
  $('identCancel').addEventListener('click', () => dlg.close ? dlg.close() : dlg.removeAttribute('open'));

  const ready = () => !!code && !!aluno;
  function needLogin() {
    if (!code) { toast('Digite a senha da aula no topo da página para registrar sua resposta.', true); $('accCode').focus(); return true; }
    if (!aluno) { openIdent(); return true; }
    return false;
  }

  /* ---------- envio ---------- */
  let sendT = null, sending = false;
  function send() {
    store.set('respostas', JSON.stringify(answers));
    if (!ready() || !Object.keys(answers).length) return;
    pending = true; store.set('pendente', '1');
    clearTimeout(sendT);
    sendT = setTimeout(doSend, 250);
  }
  async function doSend() {
    if (sending) { sendT = setTimeout(doSend, 400); return; }
    sending = true;
    const uid = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
    const r = await call(`${ACTP}/submissions`, { clientId: uid, accessCode: code, student: aluno, answers });
    sending = false;
    if (r.data.ok) {
      pending = false; store.set('pendente', null);
      setOnline(true);
      renderStatus('ok');
      return;
    }
    if (r.status === 403 && /senha/i.test(r.data.error || '')) {
      code = ''; store.set('senha', null, true); showHeader();
      toast(r.data.error + ' Digite a senha atual no topo.', true);
    } else if (r.status === 0) {
      setOnline(false);
      toast('Sem conexão: sua resposta ficou guardada e será enviada quando o servidor voltar.');
    } else {
      toast(r.data.error || 'Não foi possível registrar.', true);
    }
    renderStatus('pend');
  }

  /* ---------- Quizzes formativos ----------
     Cada pergunta (.qz[data-q]) aceita uma resposta só: a primeira vale.
     Ao responder, o aluno vê na hora se acertou e a explicação (.qz-exp).
     A resposta é guardada no navegador e enviada à plataforma assim que
     houver senha da aula e identificação. */
  const quizzes = Array.from(document.querySelectorAll('.qz[data-q]'));
  const quizSlides = Array.from(new Set(quizzes.map(q => q.closest('.slide'))));
  quizzes.forEach(qz => {
    const k = qz.dataset.q;
    qz.querySelectorAll('.opt').forEach(o => o.addEventListener('click', () => {
      if (answers[k]) return;
      answers[k] = o.dataset.v;
      renderQuiz(qz);
      renderQuizSlide(qz.closest('.slide'));
      if (!code) toast('Resposta guardada neste navegador. Digite a senha da aula no topo para registrá-la.', true);
      else if (!aluno) openIdent();
      send();
    }));
  });
  function renderQuiz(qz) {
    const v = answers[qz.dataset.q];
    const right = qz.querySelector('.opt[data-ok]');
    const hit = !!v && right && right.dataset.v === v;
    qz.classList.toggle('done', !!v);
    qz.classList.toggle('miss', !!v && !hit);
    qz.querySelectorAll('.opt').forEach(o => {
      o.classList.toggle('chosen', o.dataset.v === v);
      o.classList.toggle('right', !!v && o.hasAttribute('data-ok'));
      o.classList.toggle('wrong', o.dataset.v === v && !hit);
      o.setAttribute('aria-disabled', String(!!v));
    });
    const vd = qz.querySelector('.qz-verdict');
    if (vd) vd.innerHTML = !v ? '' : hit ? '<b class="c-mint">✓ Isso mesmo.</b>' : `<b class="c-orange">✗ Não é essa.</b> A resposta é a <b>${right.dataset.v.toUpperCase()}</b>.`;
  }
  function renderQuizSlide(slide) {
    const qs = Array.from(slide.querySelectorAll('.qz[data-q]'));
    const done = qs.filter(q => answers[q.dataset.q]);
    const hits = done.filter(q => { const r = q.querySelector('.opt[data-ok]'); return r && r.dataset.v === answers[q.dataset.q]; });
    const st = slide.querySelector('.qz-status');
    if (!st) return;
    st.innerHTML = !done.length ? `Responda as ${qs.length} perguntas. Vale a <b>primeira</b> resposta de cada uma.`
      : done.length < qs.length ? `Respondidas <b>${done.length} de ${qs.length}</b> · acertos ${hits.length}`
      : `Respondidas <b>${qs.length} de ${qs.length}</b> · acertos <b>${hits.length}</b>. Leia as explicações antes de seguir.`;
  }

  /* ---------- atividade prática ----------
     Só o necessário para o professor ligar e desligar o LED do aluno pelo broker dele:
     endereço, usuário, senha, tópico de comando e as duas mensagens. Além dos campos,
     vai pr_entrega: uma linha JSON com tudo isso, para copiar no comando_led.py (pasta teste-emqx). */
  const pf = $('praticaForm');
  const fields = pf ? Array.from(new Set(Array.from(pf.elements).map(e => e.name).filter(n => /^pr_/.test(n)))) : [];
  const val = k => { const el = pf.querySelector(`[name="${k}"]`); return el ? el.value.trim() : ''; };
  const canon = s => { try { return JSON.stringify(JSON.parse(s)); } catch (_) { return s.trim(); } };
  function problemas() {
    const p = [], host = val('pr_host'), top = val('pr_t_comando');
    if (/^(mqtts?|wss?|https?):\/\//i.test(host) || /[:/]/.test(host)) p.push('No endereço, coloque só o nome do servidor, sem <code>mqtts://</code>, porta nem caminho.');
    else if (host && !/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/.test(host)) p.push('O endereço parece incompleto. Copie o <b>Address</b> da tela Overview do deployment.');
    if (/[+#]/.test(top)) p.push('O tópico de comando não pode ter curingas <code>+</code> ou <code>#</code>.');
    if (/\s/.test(top)) p.push('Evite espaços no tópico.');
    if (val('pr_cmd_ligar') && canon(val('pr_cmd_ligar')) === canon(val('pr_cmd_desligar'))) p.push('As mensagens de ligar e desligar estão iguais.');
    return p;
  }
  if (pf) {
    const saved = Object.assign({}, json('rascunho-pratica', {}), Object.fromEntries(fields.filter(k => answers[k] != null).map(k => [k, answers[k]])));
    fields.forEach(k => { const el = pf.querySelector(`[name="${k}"]`); if (el && saved[k] != null) el.value = saved[k]; });
    pf.addEventListener('input', () => store.set('rascunho-pratica', JSON.stringify(Object.fromEntries(fields.map(k => [k, val(k)])))));
    pf.addEventListener('submit', e => {
      e.preventDefault();
      if (needLogin()) return;
      pf.classList.add('was-validated');
      const box = $('praticaErros');
      if (!pf.checkValidity()) {
        box.hidden = true;
        toast('Preencha os campos marcados em vermelho.', true);
        const first = pf.querySelector(':invalid'); if (first) first.focus();
        return;
      }
      const errs = problemas();
      box.hidden = !errs.length;
      box.innerHTML = errs.length ? '<b>Corrija antes de enviar:</b><ul>' + errs.map(x => `<li>${x}</li>`).join('') + '</ul>' : '';
      if (errs.length) return;
      fields.forEach(k => { answers[k] = val(k); });
      answers.pr_entrega = JSON.stringify({
        aluno: aluno ? aluno.name : '', host: val('pr_host'), usuario: val('pr_usuario'), senha: val('pr_senha'),
        topico: val('pr_t_comando'), ligar: val('pr_cmd_ligar'), desligar: val('pr_cmd_desligar')
      });
      send();
      $('praticaStatus').textContent = 'Enviando…';
    });
  }

  function renderStatus(kind) {
    const ps = $('praticaStatus');
    if (ps && answers.pr_entrega) ps.textContent = kind === 'ok' ? 'Entrega registrada. Pode reenviar se mudar algo; vale a última.' : 'Guardada no navegador; será enviada quando o servidor responder.';
    quizSlides.forEach(s => {
      const st = s.querySelector('.qz-status');
      if (st) st.classList.toggle('pend', kind === 'pend');
    });
  }

  /* ---------- aviso flutuante ---------- */
  let toastT;
  function toast(msg, err) {
    const t = $('toast');
    t.textContent = msg;
    t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT);
    toastT = setTimeout(() => { t.className = 'toast'; }, 4200);
  }

  /* ---------- início ---------- */
  showHeader();
  quizzes.forEach(renderQuiz);
  quizSlides.forEach(renderQuizSlide);
  health();
  setInterval(health, 30000);
  if (code) call(`${ACTP}/access`, { accessCode: code }).then(r => {
    if (!r.data.ok && r.status !== 0) { code = ''; store.set('senha', null, true); showHeader(); }
  });
})();
