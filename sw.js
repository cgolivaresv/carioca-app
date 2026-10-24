// Cambia V cada vez que publiques una versión nueva para renovar la caché.
const V='carioca-v35',FILES=['./','./index.html','./style.css','./src/app.js','./src/engine.js','./src/bots.js','./src/audio.js','./src/avatars.js','./src/lines.js','./src/roster.js','./src/joker.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
// Avatares WebP (28 bustos y 28 retratos): se precargan sin bloquear la instalación si alguno falla
const AV=[];for(let i=1;i<=28;i++){const n=String(i).padStart(2,'0');AV.push(`./avatars/busts/avatar-${n}.webp`,`./avatars/portraits/avatar-${n}.webp`)}
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES).then(()=>Promise.allSettled(AV.map(u=>c.add(u))))));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
// Primero la red (así los cambios se ven en la primera carga); sin conexión, la caché.
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;
 e.respondWith(fetch(e.request,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp))}return res}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
