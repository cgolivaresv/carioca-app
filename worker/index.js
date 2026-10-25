// Servidor multijugador de Carioca en Cloudflare Workers.
//   GET  /api/health          → comprobación
//   GET  /api/diag            → diagnóstico: versión, orígenes aceptados y si el Durable Object responde
//   GET  /api/new             → {code}: un código de sala de 4 letras al azar
//   GET  /api/room/<CODE>/ws  → WebSocket de la sala (un Durable Object por código)
// La lógica de la sala está en worker/core.js; aquí solo se conectan sockets, temporizadores y almacenamiento.
import {RoomCore} from './core.js';

const LETTERS='ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O para no confundirlas con 1 y 0
const MAX_MSG=8192,MAX_CONNS=12,RATE=40,ROOM_TTL=6*3600*1000;
const newCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>LETTERS[b%LETTERS.length]).join('');

// Las páginas oficiales siempre se aceptan; ALLOWED_ORIGINS (wrangler.toml) puede sumar otras, por ejemplo para pruebas locales
const BASE_ORIGINS=['https://cgolivaresv.github.io'];
const allowed=env=>[...new Set([...BASE_ORIGINS,...(env.ALLOWED_ORIGINS||'').split(',').map(s=>s.trim()).filter(Boolean)])];
const VERSION='0.5.0'; // no se exporta: un Worker solo puede exportar manejadores y clases
function cors(req,env){const o=req.headers.get('Origin');
 return o&&allowed(env).includes(o)?{'Access-Control-Allow-Origin':o,'Vary':'Origin'}:{}}
const json=(o,req,env,status=200)=>new Response(JSON.stringify(o),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store',...cors(req,env)}});

export default{
 async fetch(req,env){
  const url=new URL(req.url);
  if(req.method=='OPTIONS')return new Response(null,{status:204,headers:{...cors(req,env),'Access-Control-Allow-Methods':'GET','Access-Control-Max-Age':'86400'}});
  if(url.pathname=='/api/health')return json({ok:true,v:VERSION},req,env);
  if(url.pathname=='/api/diag'){let room='sin probar';
   try{const r=await env.ROOMS.get(env.ROOMS.idFromName('DIAG')).fetch('https://room/diag');room=r.ok?'responde':'error '+r.status}catch(e){room='falla: '+(e&&e.message||e)}
   return json({ok:true,v:VERSION,origins:allowed(env),origin:req.headers.get('Origin'),room},req,env)}
  if(url.pathname=='/api/new')return json({code:newCode()},req,env);
  const m=url.pathname.match(/^\/api\/room\/([A-Z]{4})\/ws$/);
  if(!m)return json({error:'not found'},req,env,404);
  if(req.headers.get('Upgrade')!=='websocket')return json({error:'se esperaba un WebSocket'},req,env,426);
  const o=req.headers.get('Origin'); // los navegadores siempre envían Origin: solo se aceptan las páginas del juego
  if(o&&!allowed(env).includes(o))return json({error:'origen no permitido'},req,env,403);
  return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req)}
};

export class Room{
 constructor(state,env){this.state=state;this.env=env;
  this.core=new RoomCore({thinkMax:Number(env.THINK_MAX)||0,setTimer:(f,ms)=>setTimeout(f,ms),clearTimer:t=>clearTimeout(t),onChange:()=>this.save()});
  state.blockConcurrencyWhile(async()=>{const snap=await state.storage.get('R');if(snap)this.core.restore(snap)})}

 save(){const snap=this.core.snapshot();
  if(!snap){this.state.storage.deleteAll();return}
  this.state.storage.put('R',snap);this.state.storage.setAlarm(Date.now()+ROOM_TTL)}

 // Pasadas 6 horas sin actividad se borra la sala (si nadie está conectado)
 async alarm(){if(this.core.empty){await this.state.storage.deleteAll();this.core.R=null;this.core.clear()}
  else await this.state.storage.setAlarm(Date.now()+ROOM_TTL)}

 async fetch(req){try{return await this.open(req)}catch(e){console.log('error abriendo la sala',e&&e.stack||e);return new Response('error: '+(e&&e.message||e),{status:500})}}
 async open(req){
  if(req.headers.get('Upgrade')!=='websocket')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}}); // diagnóstico
  if(this.core.conns.size>=MAX_CONNS)return new Response('sala llena de conexiones',{status:503});
  const [client,server]=Object.values(new WebSocketPair());server.accept();
  const code=new URL(req.url).pathname.split('/')[3];
  const conn={send:o=>{try{server.send(JSON.stringify(o))}catch(e){}},close:()=>{try{server.close(1000)}catch(e){}}};
  let n=0,t0=Date.now();
  const hi=setTimeout(()=>{if(!this.core.conns.has(conn))server.close(1008,'sin saludo')},10000); // debe saludar en 10 s
  server.addEventListener('message',ev=>{
   const now=Date.now();if(now-t0>1000){t0=now;n=0}
   if(++n>RATE)return server.close(1008,'demasiados mensajes');
   if(typeof ev.data!='string'||ev.data.length>MAX_MSG)return server.close(1009,'mensaje muy grande');
   let m;try{m=JSON.parse(ev.data)}catch(e){return conn.send({t:'err',msg:'Mensaje inválido'})}
   if(m&&m.t=='hello')m.code=code; // el código de la sala es el de la URL, no el que diga el cliente
   try{this.core.message(conn,m)}catch(e){console.log('error en la sala',code,e&&e.stack||e);conn.send({t:'err',msg:'Error interno'})}});
  const bye=()=>{clearTimeout(hi);try{this.core.close(conn)}catch(e){}};
  server.addEventListener('close',bye);server.addEventListener('error',bye);
  return new Response(null,{status:101,webSocket:client})}
}
