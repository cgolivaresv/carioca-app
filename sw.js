// Cambia V cada vez que publiques una versión nueva para renovar la caché.
const V='carioca-v10',FILES=['./','./index.html','./style.css','./src/app.js','./src/engine.js','./src/bots.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!=V).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!='GET')return;
 e.respondWith(caches.match(e.request).then(r=>{const net=fetch(e.request).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(e.request,cp))}return res}).catch(()=>r||caches.match('./index.html'));return r||net}))});
