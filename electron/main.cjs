// Proceso principal de Electron: empaqueta Carioca como app de escritorio (.exe).
// En vez de abrir el juego con file:// (que rompe módulos ES y service worker),
// levanta un servidor estático local en 127.0.0.1 y carga el juego desde ahí,
// igual que el sitio real. El multijugador sigue conectándose al Worker de Cloudflare.
const { app, BrowserWindow, shell } = require('electron');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..'); // raíz del proyecto (donde está index.html)
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// Sirve los archivos del juego desde la raíz, en un puerto efímero local.
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p;
      try { p = decodeURIComponent(req.url.split('?')[0]); }
      catch { res.writeHead(400).end('Solicitud inválida'); return; }
      if (p.includes('\0')) { res.writeHead(400).end('Solicitud inválida'); return; }
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(ROOT, path.normalize(p));
      if (!f.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404).end('No encontrado'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }).end(data);
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

async function createWindow() {
  const port = await startServer();
  const win = new BrowserWindow({
    width: 480,
    height: 860,
    minWidth: 360,
    minHeight: 600,
    backgroundColor: '#07060d',
    title: 'Carioca',
    autoHideMenuBar: true, // oculta la barra de menú (se ve con Alt)
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Los enlaces externos (p. ej. compartir una sala) se abren en el navegador del sistema.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
