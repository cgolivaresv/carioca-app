// Conexión con una sala del servidor: WebSocket con reconexión automática y latido.
const FATAL=new Set(['nofound','full','started','left','replaced','taken']); // errores que no se arreglan reintentando
const KEY='carioca:online';
export const savedRoom=()=>{try{const o=JSON.parse(localStorage.getItem(KEY));return o&&/^[A-Z]{4}$/.test(o.code)&&typeof o.token=='string'?o:null}catch(e){return null}};
export const forgetRoom=()=>{try{localStorage.removeItem(KEY)}catch(e){}};
const remember=(code,token)=>{try{localStorage.setItem(KEY,JSON.stringify({code,token}))}catch(e){}};

export async function newCode(server){let r;try{r=await fetch(server+'/api/new',{cache:'no-store'})}catch(e){throw new Error('no se pudo alcanzar el servidor')}
 if(!r.ok)throw new Error('el servidor respondió '+r.status);return (await r.json()).code}

// opts: {server, code, create, name, avatar, token, onMsg(m), onStatus('connecting'|'open'|'reconnecting'|'closed')}
export function openRoom(opts){
 const url=opts.server.replace(/^http/,'ws')+'/api/room/'+opts.code+'/ws';
 let ws=null,closed=false,tries=0,ping=0,retry=0,opened=false,lastCode=0,token=opts.token||null,create=!!opts.create;
 const status=s=>opts.onStatus&&opts.onStatus(s);
 const send=m=>{if(ws&&ws.readyState===1)ws.send(JSON.stringify(m))};
 function open(){status(tries?'reconnecting':'connecting');ws=new WebSocket(url);const mine=ws;
  mine.onopen=()=>{tries=0;opened=true;status('open');send({t:'hello',name:opts.name,avatar:opts.avatar,token:token||undefined,create:create&&!token||undefined});
   clearInterval(ping);ping=setInterval(()=>send({t:'ping'}),25000)};
  mine.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(x){return}
   if(m.t=='welcome'){token=m.token;create=false;remember(opts.code,token)}
   if(m.t=='err'&&FATAL.has(m.code)){closed=true;clearInterval(ping);if(m.code!='replaced'&&m.code!='taken')forgetRoom();status('closed')}
   opts.onMsg(m)};
  mine.onclose=e=>{lastCode=e&&e.code||0;clearInterval(ping);if(closed||mine!==ws)return;
   if(++tries>(opened?8:3)){ // si nunca llegó a abrirse, no se insiste mucho: el problema no es un corte pasajero
    closed=true;status('closed');opts.onMsg({t:'err',msg:'Se perdió la conexión con el servidor',code:'lost',detail:{opened,closeCode:lastCode}});return}
   status('reconnecting');retry=setTimeout(open,Math.min(8000,500*2**tries))};
  mine.onerror=()=>{}}
 open();
 return{send,get token(){return token},close(){closed=true;clearInterval(ping);clearTimeout(retry);status('closed');try{ws&&ws.close()}catch(e){}}}}
