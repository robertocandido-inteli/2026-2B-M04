/* Aula 3 — tema claro/escuro
   Carregado no <head>: aplica a preferência salva antes da pintura e recolore as
   simulações. Os desenhos (SVG e canvas) são escritos com a paleta escura; no tema
   claro, cada cor da paleta é trocada pela equivalente clara no momento em que é
   aplicada. Cores "físicas" (placa, resistor, faixas de cor, textos brancos sobre a
   placa) ficam fora do mapa e não mudam. */
(function () {
  const KEY = 'tema-aula-3';
  const root = document.documentElement;

  // paleta escura → clara (hex sem #, minúsculo)
  const LIGHT = {
    // fundos e superfícies
    '191426': 'f5f3f9', '1d1729': 'f0edf6', '211a30': 'fbfafd', '261f36': 'ffffff',
    '2a2238': 'e6e1ef', '2b2339': 'e6e1ef', '2d2540': 'e2dcec', '322943': 'e9e5f1',
    '352c4a': 'ddd7e8', '3a3050': 'd6cfe3', '3a3150': 'd6cfe3', '3d3352': 'd9d3e5',
    '463b5e': 'c9c0da', '4a4060': 'bdb4d0', '5a5070': 'a69ebb', '5f5677': '8a82a0',
    // textos e fios
    '6d6585': '7d7594', '8a8399': '9f98ae', '8c84a3': '7d7596', 'a9a3bd': '655d7e',
    'b9b9c4': '9b9ba8', 'dedde6': '3d3552', 'f8f7fa': '1d1729',
    // destaques
    '80e6c6': '0b7d5e', 'ff9148': 'b04a0a', '7caaff': '2f5fcc', 'ff5d5d': 'd23333',
    'ffd166': 'a87800', 'ff8a8a': 'd94a4a',
    // LEDs e displays apagados, bobina, tubo da analogia hidráulica
    '5a2a2a': 'f0cccc', '3a2a2a': 'ecdede', '6b3030': 'f2c9c9',
    '4a3326': 'f7dccb', '3b4f86': '9fb3e6', '1c2341': 'e3e9f8'
  };
  const COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'color', 'flood-color'];
  const RGB = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/;

  try { if (localStorage.getItem(KEY) === 'light') root.dataset.theme = 'light'; } catch (e) { /* armazenamento indisponível */ }
  const isLight = () => root.dataset.theme === 'light';

  // cor da paleta escura → cor do tema atual
  function cor(c) {
    if (!isLight() || typeof c !== 'string') return c;
    const s = c.trim().toLowerCase();
    if (s[0] === '#') {
      const h = s.length === 4 ? s[1] + s[1] + s[2] + s[2] + s[3] + s[3] : s.slice(1);
      return LIGHT[h] ? '#' + LIGHT[h] : c;
    }
    const m = RGB.exec(s);
    if (!m) return c;
    const l = LIGHT[[m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('')];
    if (!l) return c;
    const [r, g, b] = [0, 2, 4].map(i => parseInt(l.slice(i, i + 2), 16));
    return m[4] === undefined ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${m[4]})`;
  }

  // Canvas: toda cor atribuída passa pelo mapa
  const P = CanvasRenderingContext2D.prototype;
  ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(prop => {
    const d = Object.getOwnPropertyDescriptor(P, prop);
    Object.defineProperty(P, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) { d.set.call(this, cor(v)); } });
  });
  const addStop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (o, c) { return addStop.call(this, o, cor(c)); };

  // SVG: guarda a cor original (escura) e aplica a do tema atual
  const ORIG = new WeakMap();
  const setAttr = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (name, value) {
    if (this instanceof SVGElement && COLOR_ATTRS.includes(name)) {
      let o = ORIG.get(this);
      if (!o) ORIG.set(this, o = {});
      o[name] = String(value);
      value = cor(o[name]);
    }
    return setAttr.call(this, name, value);
  };
  function recolor(el) {
    let o = ORIG.get(el);
    for (const a of COLOR_ATTRS) {
      if (!el.hasAttribute(a)) continue;
      if (!o) ORIG.set(el, o = {});
      if (!(a in o)) o[a] = el.getAttribute(a);
      setAttr.call(el, a, cor(o[a]));
    }
  }
  function recolorTree(node) {
    if (node instanceof SVGElement) recolor(node);
    node.querySelectorAll('svg, svg *').forEach(recolor);
  }
  // SVG inserido via innerHTML ou pelo parser
  new MutationObserver(list => {
    if (!isLight()) return;
    for (const m of list) m.addedNodes.forEach(n => { if (n.nodeType === 1) recolorTree(n); });
  }).observe(root, { childList: true, subtree: true });

  function setTheme(t) {
    if (t === 'light') root.dataset.theme = 'light';
    else delete root.dataset.theme;
    try { localStorage.setItem(KEY, t); } catch (e) { /* armazenamento indisponível */ }
    recolorTree(document);
    document.getElementById('btnTheme')?.setAttribute('aria-pressed', String(t === 'light'));
    document.dispatchEvent(new CustomEvent('temachange')); // canvas desenhados só por evento se redesenham
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (isLight()) recolorTree(document);
    const btn = document.getElementById('btnTheme');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(isLight()));
    btn.addEventListener('click', () => setTheme(isLight() ? 'dark' : 'light'));
  });

  window.TEMA = { cor };
})();
