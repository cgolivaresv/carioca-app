// Efectos de escritorio: ambiente, sonido con personalidad, avatares vivos, reacciones y cierre de partida.
// Lo inyecta Electron; la versión web/móvil no lo usa. Todo vive fuera de #app (el juego lo repinta y borraría lo ajeno).
(() => {
  if (window.__dkfx) return;
  window.__dkfx = true;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[(Math.random() * a.length) | 0];
  // Modo de juego: el estado real está dentro del juego (no accesible), así que se deduce de lo último que elegiste en el menú.
  let mode = 'bots';
  const online = () => mode === 'online';
  document.addEventListener('click', e => {
    const b = e.target.closest && e.target.closest('#bCreate,#bJoin,#bBack,#bNew,#bCont');
    if (b) mode = (b.id === 'bNew' || b.id === 'bCont') ? 'bots' : 'online';
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'rCode') mode = 'online'; }, true);

  /* ================= Sonido (sintetizado, sin archivos) ================= */
  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null, noise = null;
  const isMuted = () => { try { return localStorage.getItem('carioca:mute') == '1'; } catch (e) { return false; } };
  function unlock() {
    if (!AC) return;
    if (!ctx) {
      ctx = new AC(); master = ctx.createGain(); master.gain.value = .7; master.connect(ctx.destination);
      const n = (ctx.sampleRate * .8) | 0, b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      noise = b;
    }
    if (ctx.state === 'suspended') ctx.resume();
  }
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);
  function tone(f, t0, dur, {type = 'sine', vol = .15, slide = 0, att = .005} = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t0 + dur);
    g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + att); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + .02);
  }
  function hiss(t0, dur, {f = 3000, f2 = 0, q = .7, vol = .2, type = 'highpass'} = {}) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; fl.type = type; fl.frequency.setValueAtTime(f, t0);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    fl.Q.value = q; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(fl); fl.connect(g); g.connect(master); s.start(t0, Math.random() * .1); s.stop(t0 + dur + .02);
  }
  const SFX = {
    // un sonido por avatar, a juego con su acción
    av1: t => { tone(1318, t, .35, {vol: .09}); tone(1760, t + .06, .4, {vol: .06}); },                               // guiño
    av2: t => { tone(900, t, .04, {type: 'square', vol: .05}); tone(1200, t + .09, .05, {type: 'square', vol: .05}); tone(1500, t + .2, .25, {type: 'triangle', vol: .06}); }, // sombrero
    av3: t => { tone(220, t, .7, {vol: .1, slide: 40}); tone(330, t, .7, {vol: .05}); },                               // mirada fría
    av4: t => hiss(t, .35, {f: 800, f2: 5000, type: 'bandpass', q: 1.2, vol: .2}),                                    // melena
    av5: t => { [523, 659, 784].forEach((f, i) => tone(f, t + i * .14, .22, {type: 'triangle', vol: .09})); },         // saludo
    av6: t => { hiss(t, .2, {f: 3500, f2: 300, type: 'lowpass', vol: .5}); tone(90, t, .28, {vol: .3, slide: -50}); },  // disparo
    av7: t => hiss(t, .28, {f: 1200, f2: 2600, type: 'bandpass', q: .6, vol: .14}),                                   // saco
    av8: t => { tone(2400, t, .18, {vol: .07}); tone(3100, t + .04, .25, {vol: .05}); tone(2400, t + .2, .15, {vol: .06}); }, // ficha
    av9: t => { hiss(t, .7, {f: 900, f2: 300, type: 'lowpass', vol: .18}); tone(110, t, .6, {vol: .05}); },            // calada
    av10: t => { tone(330, t, .13, {type: 'triangle', vol: .1, slide: -60}); tone(294, t + .17, .22, {type: 'triangle', vol: .09, slide: -40}); }, // hombros
    tick: t => tone(2000, t, .03, {type: 'sine', vol: .03}),
    pop: t => tone(700, t, .1, {type: 'triangle', vol: .09, slide: 520}),
    fanfare: t => { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * .11, .6, {type: 'triangle', vol: .13})); [523, 784, 1047].forEach(f => tone(f, t + .6, 1.1, {type: 'sine', vol: .09})); },
    sad: t => [392, 349, 311, 262].forEach((f, i) => tone(f, t + i * .2, .55, {type: 'triangle', vol: .11}))
  };
  function play(n) {
    if (!ctx || ctx.state !== 'running' || isMuted() || !SFX[n]) return;
    try { SFX[n](ctx.currentTime + .01); } catch (e) {}
  }
  window.__dkPlay = play;

  /* ================= Polvo dorado ================= */
  if (!reduce) {
    const box = document.createElement('div');
    box.id = 'dk-dust'; box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 26; i++) {
      const e = document.createElement('i'), s = 2 + Math.random() * 3.5;
      e.style.cssText = `left:${rnd(0, 100).toFixed(1)}%;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;--dx:${rnd(-45, 45) | 0}px;` +
        `animation-duration:${rnd(20, 46).toFixed(1)}s;animation-delay:-${rnd(0, 40).toFixed(1)}s`;
      box.appendChild(e);
    }
    document.body.appendChild(box);
  }

  /* ================= Confeti (física por tiempo real: igual a 60, 120 o 180 Hz) ================= */
  const COLORS = ['#f7e4a0', '#e6c35c', '#ffffff', '#d4264f', '#7a4dff', '#2ec85a'];
  function confetti() {
    if (reduce || $('#dk-confetti')) return;
    const cv = document.createElement('canvas'), dpr = window.devicePixelRatio || 1;
    cv.id = 'dk-confetti';
    cv.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:500;pointer-events:none';
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(dpr, dpr);
    const W = innerWidth, H = innerHeight, parts = [];
    for (let i = 0; i < 170; i++) {
      const left = i % 2 === 0, a = (left ? -62 : -118) * Math.PI / 180 + (Math.random() - .5) * .7, v = 11 + Math.random() * 13;
      parts.push({x: left ? W * .12 : W * .88, y: H * .92, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        w: 6 + Math.random() * 7, h: 3 + Math.random() * 5, r: Math.random() * 6.28, vr: (Math.random() - .5) * .45, c: pick(COLORS)});
    }
    const t0 = performance.now();
    let prev = t0;
    (function step(t) {
      const el = t - t0, k = Math.min(3, Math.max(0, (t - prev) / 16.667)), drag = Math.pow(.992, k);
      prev = t;
      g.clearRect(0, 0, W, H);
      for (const p of parts) {
        p.vy += .34 * k; p.vx *= drag; p.vy *= drag; p.x += p.vx * k; p.y += p.vy * k; p.r += p.vr * k;
        g.save(); g.globalAlpha = Math.max(0, Math.min(1, (4200 - el) / 1200)); g.translate(p.x, p.y); g.rotate(p.r);
        g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.r * 2) * .8 + .2)); g.restore();
      }
      if (el < 4200) requestAnimationFrame(step); else cv.remove();
    })(t0);
  }
  window.__dkConfetti = confetti;

  /* ================= Selección de personaje ================= */
  const setLook = (p, e) => {
    const r = p.getBoundingClientRect();
    p.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(2));
    p.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(2));
  };
  document.addEventListener('mousemove', e => { const p = e.target.closest && e.target.closest('.picks .pick'); if (p) setLook(p, e); }, {passive: true});
  document.addEventListener('mouseout', e => {
    const p = e.target.closest && e.target.closest('.picks .pick');
    if (p && !p.contains(e.relatedTarget)) { p.style.setProperty('--mx', 0); p.style.setProperty('--my', 0); }
  }, {passive: true});
  // sonido al pasar el cursor: uno por avatar y un tic muy suave en botones
  document.addEventListener('mouseover', e => {
    const t = e.target; if (!t || !t.closest) return;
    const p = t.closest('.picks .pick');
    if (p) { if (!p.contains(e.relatedTarget)) play('av' + (Array.prototype.indexOf.call(p.parentNode.children, p) + 1)); return; }
    const b = t.closest('.act:not(:disabled), .hbtn, .chip');
    if (b && !b.contains(e.relatedTarget)) play('tick');
  }, {passive: true});
  // en reposo, de vez en cuando un retrato hace su acción por su cuenta, como si estuviera vivo
  if (!reduce) setInterval(() => {
    const h = $('#home');
    if (!h || h.classList.contains('out') || document.hidden) return;
    const ps = $$('.picks .pick').filter(p => !p.matches(':hover'));
    if (!ps.length) return;
    const p = pick(ps), pic = p.querySelector('picture');
    if (!pic) return;
    pic.style.animation = `dkA${Array.prototype.indexOf.call(p.parentNode.children, p) + 1} 1s ease-in-out both`;
    pic.addEventListener('animationend', () => { pic.style.animation = ''; }, {once: true});
  }, 4200);

  /* ================= Reacciones (emojis sobre los avatares) ================= */
  const REPLY = {'👏': ['👏', '😎'], '😏': ['😏', '😅'], '😡': ['😅', '😂'], '😂': ['😂', '😏'], '😎': ['😏', '👏'], '🔥': ['😮', '🔥']};
  function floatEmoji(av, ch) {
    if (!av) return;
    const r = av.getBoundingClientRect(), e = document.createElement('div');
    e.className = 'dk-emo'; e.textContent = ch;
    e.style.left = (r.left + r.width / 2) + 'px'; e.style.top = (r.top + r.height * .12) + 'px';
    document.body.appendChild(e);
    setTimeout(() => e.remove(), 2600);
    play('pop');
  }
  const box = document.createElement('div');
  box.id = 'dk-emotes';
  box.innerHTML = '<div class="dk-ep" hidden>' + Object.keys(REPLY).map(c => `<button type="button" data-e="${c}" aria-label="Reaccionar ${c}">${c}</button>`).join('') +
    '</div><button type="button" class="dk-eb" aria-label="Reacciones" title="Reacciones (solo partidas contra bots)">😊</button>';
  document.body.appendChild(box);
  const panel = $('.dk-ep', box);
  let lastEmote = 0;
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('dk-eb')) { panel.hidden = !panel.hidden; return; }
    const ch = b.dataset.e, now = Date.now();
    if (!ch || now - lastEmote < 1200) return;
    lastEmote = now; panel.hidden = true;
    floatEmoji($('.hero .av'), ch);
    const rivals = $$('.table .seat .av');
    if (rivals.length && Math.random() < .7) setTimeout(() => floatEmoji(pick(rivals), pick(REPLY[ch])), rnd(800, 1700));
  });
  document.addEventListener('pointerdown', e => { if (!panel.hidden && !box.contains(e.target)) panel.hidden = true; }, true);
  function placeEmotes() {
    const av = $('.hero .av'), show = !!av && document.body.classList.contains('ingame') && !online() && !$('#dk-final');
    box.style.display = show ? 'block' : 'none';
    if (!show) { panel.hidden = true; return; }
    const r = av.getBoundingClientRect();
    box.style.left = Math.max(8, r.left + r.width / 2 - 17) + 'px';
    box.style.top = Math.max(46, r.top - 40) + 'px';
  }
  // los rivales reaccionan solos al ganar o perder la ronda
  const seen = {};
  function rivalsReact() {
    $$('.table .seat').forEach((s, i) => {
      const k = $('.wl.win', s) ? 'w' : $('.wl.lose', s) ? 'l' : '';
      if (k !== (seen[i] || '')) { seen[i] = k; if (k) setTimeout(() => floatEmoji($('.av', s), k === 'w' ? pick(['😎', '🎉', '😏']) : pick(['😤', '😩', '😅'])), rnd(150, 600)); }
    });
  }

  /* ================= Cierre de partida: el ganador, en grande ================= */
  let finalName = '';
  function finalCheck() {
    const h = $('.modal .sheet h3'), m = h && /^Fin del juego · gana (.+)$/.exec(h.textContent.trim());
    let ov = $('#dk-final');
    if (!m) { if (ov) ov.remove(); finalName = ''; return; }
    if (finalName === m[1]) return;
    finalName = m[1];
    if (ov) ov.remove();
    const plate = $$('.seat .plate b').find(b => b.textContent.trim() === m[1]);
    const img = plate && $('.avimg', plate.closest('.seat')), me = !!plate && !!plate.closest('.hero');
    ov = document.createElement('div');
    ov.id = 'dk-final';
    ov.innerHTML = '<div class="dkf-spot"></div><div class="dkf-who"><div class="crown">👑</div>' +
      (img ? `<img alt="" src="${img.currentSrc || img.src}">` : '') + `<b>CAMPEÓN</b><span></span></div>`;
    $('span', ov).textContent = m[1];
    document.body.appendChild(ov);
    if (me) { play('fanfare'); confetti(); } else play('sad');
  }

  /* ================= Observador del juego ================= */
  const app = $('#app');
  if (!app) return;
  let won = false, raf = 0;
  function check() {
    const w = !!$('.hero .wl.win');
    if (w && !won) confetti();
    won = w;
    rivalsReact(); finalCheck(); placeEmotes();
  }
  window.__dkCheck = check;
  new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); })
    .observe(app, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
  document.body.addEventListener('transitionend', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); }, true);
  addEventListener('resize', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); });
  new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(check); }).observe(document.body, {attributes: true, attributeFilter: ['class']});
  check();
})();
