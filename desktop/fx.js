// Solo escritorio: polvo dorado de ambiente. Los demás efectos (confeti, sonidos, avatares, reacciones, cierre)
// son compartidos con la versión web y viven en src/fx.js y fx.css. Lo inyecta Electron.
(() => {
  if (window.__dkdesk) return;
  window.__dkdesk = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const box = document.createElement('div');
  box.id = 'dk-dust'; box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 26; i++) {
    const e = document.createElement('i'), s = 2 + Math.random() * 3.5;
    e.style.cssText = `left:${rnd(0, 100).toFixed(1)}%;width:${s.toFixed(1)}px;height:${s.toFixed(1)}px;--dx:${rnd(-45, 45) | 0}px;` +
      `animation-duration:${rnd(20, 46).toFixed(1)}s;animation-delay:-${rnd(0, 40).toFixed(1)}s`;
    box.appendChild(e);
  }
  document.body.appendChild(box);
})();
