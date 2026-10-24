// Servidor local mínimo (solo Node, sin dependencias). Uso: npm start
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),port=process.env.PORT||8080;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
 let p=decodeURIComponent(req.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
 const f=path.join(root,path.normalize(p));
 if(!f.startsWith(root)){res.writeHead(403).end();return}
 fs.readFile(f,(err,data)=>{if(err){res.writeHead(404).end('No encontrado');return}
  res.writeHead(200,{'Content-Type':types[path.extname(f)]||'application/octet-stream','Cache-Control':'no-cache'}).end(data)})
}).listen(port,()=>console.log('Carioca en http://localhost:'+port+'  (Ctrl+C para detener)'));
