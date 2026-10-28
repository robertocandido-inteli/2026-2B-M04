/* Navegação dos slides + ciclo de vida das simulações */
(function () {
  const slides = Array.from(document.querySelectorAll('.slide'));
  const counter = document.getElementById('counter');
  const progress = document.getElementById('progress');
  const overview = document.getElementById('overview');
  const overviewGrid = document.getElementById('overviewGrid');
  const instances = new Map(); // elemento [data-sim] -> instância
  let cur = -1;

  function simsOf(slide) {
    return Array.from(slide.querySelectorAll('[data-sim]'));
  }

  function ensureInit(slide) {
    simsOf(slide).forEach(el => {
      if (instances.has(el)) return;
      const factory = window.SIMS[el.dataset.sim];
      if (!factory) return;
      try { instances.set(el, factory(el) || {}); }
      catch (e) { console.error('Erro na simulação', el.dataset.sim, e); instances.set(el, {}); }
    });
  }

  function go(n, push = true) {
    n = Math.max(0, Math.min(slides.length - 1, n));
    if (n === cur) return;
    const prev = cur;
    slides.forEach((s, i) => {
      s.classList.toggle('active', i === n);
      s.classList.toggle('prev', i < n);
      s.setAttribute('aria-hidden', i === n ? 'false' : 'true');
    });
    if (prev >= 0) simsOf(slides[prev]).forEach(el => instances.get(el)?.pause?.());
    cur = n;
    ensureInit(slides[n]);
    simsOf(slides[n]).forEach(el => instances.get(el)?.resume?.());
    slides[n].scrollTop = 0;
    counter.textContent = `${n + 1} / ${slides.length}`;
    progress.style.width = `${((n + 1) / slides.length) * 100}%`;
    document.title = `${slides[n].dataset.title} · Aula 3`;
    if (push) history.replaceState(null, '', `#${n + 1}`);
    overviewGrid.querySelectorAll('button').forEach((b, i) => b.classList.toggle('cur', i === n));
  }

  // Visão geral
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span class="s">${s.dataset.section || ''}</span><span class="t">${s.dataset.title}</span>`;
    b.addEventListener('click', () => { toggleOverview(false); go(i); });
    overviewGrid.appendChild(b);
  });
  function toggleOverview(force) {
    const open = force ?? !overview.classList.contains('open');
    overview.classList.toggle('open', open);
    overview.setAttribute('aria-hidden', String(!open));
  }

  document.getElementById('btnPrev').addEventListener('click', () => go(cur - 1));
  document.getElementById('btnNext').addEventListener('click', () => go(cur + 1));
  document.getElementById('btnGrid').addEventListener('click', () => toggleOverview());
  document.getElementById('btnFull').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  });


  document.addEventListener('keydown', e => {
    const t = e.target;
    const typing = t.matches?.('input, select, textarea');
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (typing && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) return;
    switch (e.key) {
      case 'ArrowRight': case 'PageDown': go(cur + 1); e.preventDefault(); break;
      case ' ':
        if (t.matches?.('button')) return;
        go(cur + (e.shiftKey ? -1 : 1)); e.preventDefault(); break;
      case 'ArrowLeft': case 'PageUp': go(cur - 1); e.preventDefault(); break;
      case 'Home': go(0); break;
      case 'End': go(slides.length - 1); break;
      case 'g': case 'G': toggleOverview(); break;
      case 'f': case 'F': document.getElementById('btnFull').click(); break;
      case 't': case 'T': if (!typing) document.getElementById('btnTheme').click(); break;
      case 'Escape': toggleOverview(false); break;
    }
  });

  // Gesto de deslizar (ignora quando começa sobre controles/simulações)
  let tx = null, ty = null;
  document.getElementById('deck').addEventListener('touchstart', e => {
    if (e.target.closest('input, button, .sim, canvas, svg.stage, [data-sim]')) { tx = null; return; }
    tx = e.touches[0].clientX; ty = e.touches[0].clientY;
  }, { passive: true });
  document.getElementById('deck').addEventListener('touchend', e => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(cur + (dx < 0 ? 1 : -1));
    tx = null;
  }, { passive: true });

  // Troca de tema: simulações desenhadas só por evento se redesenham
  document.addEventListener('temachange', () => instances.forEach(inst => inst.redraw?.()));

  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (!isNaN(n)) go(n - 1, false);
  });

  // Peer Instruction: revelar / ocultar resposta
  document.querySelectorAll('[data-pi-reveal]').forEach(b => b.addEventListener('click', () => {
    const s = b.closest('.pi');
    const on = s.classList.toggle('revealed');
    b.textContent = on ? 'Ocultar resposta' : 'Revelar resposta';
  }));

  // Laço de animação: só a simulação do slide atual é atualizada
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (cur >= 0 && !document.hidden) {
      simsOf(slides[cur]).forEach(el => {
        const inst = instances.get(el);
        if (inst?.tick) { try { inst.tick(dt, now / 1000); } catch (e) { console.error(e); inst.tick = null; } }
      });
    }
    requestAnimationFrame(frame);
  }

  const start = parseInt(location.hash.slice(1), 10);
  go(isNaN(start) ? 0 : start - 1, false);
  requestAnimationFrame(frame);
})();
