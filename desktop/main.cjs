// Carioca para Windows (Electron). No modifica la versión web/móvil: carga los mismos archivos.
const {app, BrowserWindow, protocol, shell, Menu, screen, session} = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp','.woff2':'font/woff2'};
const NAV_BASE = 'app://carioca/';
const APP_ORIGIN = 'app://carioca';
// El servidor en línea solo acepta el origen oficial de la página (ver worker/index.js).
// La app de escritorio se presenta con ese origen únicamente hacia ese servidor, y se le añade el CORS de app://.
// Si cambia SERVER_DEFAULT en src/config.js o BASE_ORIGINS en el worker, actualiza estas dos constantes.
const SERVER_URLS = ['https://carioca-server.cg-olivaresv.workers.dev/*', 'wss://carioca-server.cg-olivaresv.workers.dev/*'];
const OFFICIAL_ORIGIN = 'https://cgolivaresv.github.io';

function allowOnlineServer() {
  const ses = session.defaultSession;
  ses.webRequest.onBeforeSendHeaders({urls: SERVER_URLS}, (d, cb) => {
    const h = {...d.requestHeaders};
    for (const k of Object.keys(h)) if (k.toLowerCase() === 'origin') delete h[k];
    h.Origin = OFFICIAL_ORIGIN;
    cb({requestHeaders: h});
  });
  ses.webRequest.onHeadersReceived({urls: SERVER_URLS}, (d, cb) => {
    const h = {...d.responseHeaders};
    for (const k of Object.keys(h)) if (k.toLowerCase() === 'access-control-allow-origin') delete h[k];
    h['Access-Control-Allow-Origin'] = [APP_ORIGIN];
    cb({responseHeaders: h});
  });
}

protocol.registerSchemesAsPrivileged([{scheme:'app', privileges:{standard:true, secure:true, supportFetchAPI:true}}]);

if (!app.requestSingleInstanceLock()) app.quit();

let win;
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');
const loadState = () => { try { return JSON.parse(fs.readFileSync(stateFile(), 'utf8')); } catch { return {}; } };
const saveState = () => {
  if (!win || win.isDestroyed()) return;
  try {
    const s = {maximized: win.isMaximized(), full: win.isFullScreen(), ...(win.isMaximized() || win.isFullScreen() ? {} : win.getBounds())};
    fs.writeFileSync(stateFile(), JSON.stringify({...loadState(), ...s}));
  } catch {}
};

function serve(request) {
  let p = decodeURIComponent(new URL(request.url).pathname);
  if (p === '/' || p === '') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  const rel = path.relative(ROOT, file);
  // sin service worker en escritorio (la app ya está empaquetada) y sin salir de la carpeta
  if (rel.startsWith('..') || path.isAbsolute(rel) || p === '/sw.js') return new Response('No encontrado', {status: 404});
  try {
    return new Response(fs.readFileSync(file), {headers: {'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache'}});
  } catch {
    return new Response('No encontrado', {status: 404});
  }
}

// Escala la mesa para que llene la ventana (el diseño es una columna de ~560 px).
function fit() {
  if (!win || win.isDestroyed()) return;
  const [w, h] = win.getContentSize();
  const z = Math.max(1, Math.min(h / 840, w / 600, 2.4));
  const zf = Math.round(z * 100) / 100;
  win.webContents.setZoomFactor(zf);
  win.webContents.executeJavaScript(`document.documentElement.style.setProperty('--dkz',${zf})`).catch(() => {});
}

async function dress() {
  const css = fs.readFileSync(path.join(__dirname, 'desktop.css'), 'utf8');
  // Se añade como <style> al final del <head> (no con insertCSS) para ganar los empates de especificidad a style.css.
  await win.webContents.executeJavaScript(`(()=>{if(document.getElementById('dk-css'))return;
    const s=document.createElement('style');s.id='dk-css';s.textContent=${JSON.stringify(css)};document.head.appendChild(s)})()`);
  await win.webContents.executeJavaScript(`(()=>{if(document.getElementById('dk-title'))return;
    const d=document.createElement('div');d.id='dk-title';d.innerHTML='<b>CARIOCA</b><span>Suite de lujo</span>';document.body.prepend(d)})()`);
  await win.webContents.executeJavaScript(fs.readFileSync(path.join(__dirname, 'fx.js'), 'utf8'));
  fit();
}

function create() {
  const st = loadState(), area = screen.getPrimaryDisplay().workArea;
  const ok = st.width && st.x >= area.x - 50 && st.y >= area.y - 50 && st.x < area.x + area.width - 100;
  win = new BrowserWindow({
    width: ok ? st.width : Math.min(1280, area.width), height: ok ? st.height : Math.min(920, area.height),
    ...(ok ? {x: st.x, y: st.y} : {}),
    minWidth: 720, minHeight: 640, show: false, backgroundColor: '#070d18', title: 'Carioca',
    icon: path.join(ROOT, 'icons', 'icon-512.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {color: '#070d18', symbolColor: '#d8b45a', height: 38},
    webPreferences: {contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false}
  });
  if (st.maximized) win.maximize();
  if (st.full) win.setFullScreen(true);
  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', dress);
  win.on('resize', fit);
  win.on('enter-full-screen', fit); win.on('leave-full-screen', fit);
  win.on('close', saveState);
  win.webContents.setWindowOpenHandler(({url}) => { if (/^https?:/.test(url)) shell.openExternal(url); return {action: 'deny'}; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(NAV_BASE)) e.preventDefault(); });
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
    else if (i.key === 'Escape' && win.isFullScreen()) { win.setFullScreen(false); e.preventDefault(); }
    else if (i.control && i.key.toLowerCase() === 'r') { win.webContents.reloadIgnoringCache(); e.preventDefault(); }
  });
  win.loadURL(NAV_BASE);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', serve);
  allowOnlineServer();
  create();
  app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) create(); });
});
app.on('window-all-closed', () => app.quit());
