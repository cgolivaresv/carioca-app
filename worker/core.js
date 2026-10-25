// Lógica de una sala de carioca en línea. No depende de Cloudflare: el Durable Object (worker/index.js) solo le presta
// sockets, temporizadores y almacenamiento. Así se puede probar entera en Node.
//
// El servidor es la única fuente de verdad: guarda el mazo y las manos, valida cada jugada con src/game.js y envía a cada
// jugador solo lo que puede ver (viewFor). Los bots y los jugadores desconectados juegan desde aquí.
import {newGame,nextRound,drawCard,layDown,attachCard,discard,endTurn,closeRound,playBotSeat,viewFor,validSeats,MAX_SEATS} from '../src/game.js';
import {effort,thinkTime} from '../src/bots.js';
import {ROSTER,LEVELS,LEVEL_NAMES} from '../src/roster.js';

export const THINK_MAX=7000;      // espera máxima de un bot (ms), igual que el valor por defecto de la app
export const AWAY_MS=4000;        // un jugador desconectado juega solo, con esta espera
export const MAX_NAME=12;
const AVATARS=ROSTER.length;
const hex=n=>Array.from(crypto.getRandomValues(new Uint8Array(n)),b=>b.toString(16).padStart(2,'0')).join('');
const cleanName=v=>(typeof v=='string'?v:'').replace(/[\u0000-\u001f\u007f<>&"'`]/g,'').trim().slice(0,MAX_NAME)||'Jugador';
const cleanAvatar=v=>Number.isInteger(v)&&v>=0&&v<AVATARS?v:0;
const shuffle=(a,rnd)=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};

export class RoomCore{
 // env: {setTimer(fn,ms)→id, clearTimer(id), rnd?, onChange?()} · onChange se llama tras cada cambio que haya que guardar
 constructor(env){this.env=env;this.rnd=env.rnd||Math.random;this.thinkMax=env.thinkMax||THINK_MAX;this.R=null;this.conns=new Map();this.timer=null;this.think=null;this.pending=[]}

 // ---- estado guardable ----
 snapshot(){return this.R?JSON.parse(JSON.stringify(this.R)):null}
 restore(snap){this.R=snap;if(this.R)this.R.players.forEach(p=>p.connected=false);this.schedule()}
 get exists(){return !!this.R}
 get empty(){return !this.R||!this.R.players.some(p=>p.connected)}

 // ---- conexiones ----
 // conn: {send(obj), close()}. Devuelve nada; todo se responde por conn.send.
 message(conn,m){
  if(!m||typeof m!='object'||typeof m.t!='string')return this.err(conn,'Mensaje inválido');
  if(m.t=='ping')return conn.send({t:'pong'});
  if(m.t=='hello')return this.hello(conn,m);
  const p=this.player(conn);if(!p)return this.err(conn,'Primero debes entrar a la sala');
  switch(m.t){
   case 'config':return this.config(conn,p,m);
   case 'start':return this.start(conn,p);
   case 'draw':return this.act(conn,p,S=>S.phase=='draw'?this.doDraw(S,p,!!m.deck):{err:'Ya robaste'});
   case 'lay':return this.act(conn,p,S=>this.doLay(S,p,m.groups));
   case 'attach':return this.act(conn,p,S=>this.doAttach(S,p,m));
   case 'discard':return this.act(conn,p,S=>this.doDiscard(S,p,m.id));
   case 'next':return this.next(conn,p);
   case 'leave':return this.leave(conn,p);
   default:return this.err(conn,'Mensaje desconocido')}}

 close(conn){const p=this.player(conn);this.conns.delete(conn);if(!p)return;
  // si el mismo jugador ya tiene otra conexión (se reconectó), sigue conectado
  p.connected=[...this.conns.values()].some(id=>id===p.id);
  if(!this.R)return;this.change();this.broadcast();this.schedule()}

 player(conn){const id=this.conns.get(conn);return this.R&&this.R.players.find(p=>p.id===id)}
 err(conn,msg,code){conn.send({t:'err',msg,code})}
 change(){this.R.updated=Date.now();if(this.env.onChange)this.env.onChange()}

 hello(conn,m){
  if(!this.R){
   if(!m.create)return conn.send({t:'err',msg:'Esa sala no existe',code:'nofound'});
   this.R={code:String(m.code||''),phase:'lobby',seatsN:3,players:[],S:null,seats:null,created:Date.now(),updated:Date.now()}}
  else if(m.create&&!this.R.players.some(p=>p.token===m.token))return conn.send({t:'err',msg:'Ese código ya está en uso',code:'taken'});
  const R=this.R;let p=typeof m.token=='string'&&R.players.find(x=>x.token===m.token);
  if(p&&R.phase=='playing'&&this.seatOf(p)<0)return conn.send({t:'err',msg:'Saliste de esta partida',code:'left'});
  if(p){p.name=cleanName(m.name??p.name);p.avatar=cleanAvatar(m.avatar??p.avatar)} // reconexión
  else{
   if(R.phase!='lobby')return conn.send({t:'err',msg:'La partida ya empezó',code:'started'});
   if(R.players.length>=R.seatsN)return conn.send({t:'err',msg:'La sala está llena',code:'full'});
   p={id:R.players.length?Math.max(...R.players.map(x=>x.id))+1:0,token:hex(16),name:cleanName(m.name),avatar:cleanAvatar(m.avatar),connected:false,host:!R.players.length};
   R.players.push(p)}
  // una sola conexión viva por jugador: la anterior se cierra
  for(const [c,id] of this.conns)if(id===p.id&&c!==conn){this.conns.delete(c);try{c.send({t:'err',msg:'Entraste desde otro lugar',code:'replaced'});c.close()}catch(e){}}
  this.conns.set(conn,p.id);p.connected=true;
  if(!R.players.some(x=>x.host))p.host=true; // si el anfitrión se fue, lo toma quien vuelve
  conn.send({t:'welcome',token:p.token,code:R.code,id:p.id});
  this.change();this.broadcast();this.schedule()}

 config(conn,p,m){const R=this.R;if(!p.host)return this.err(conn,'Solo el anfitrión cambia la mesa');
  if(R.phase!='lobby')return this.err(conn,'La partida ya empezó');
  const n=m.seats;if(!validSeats(n))return this.err(conn,'La mesa es de 2 a 5 jugadores');
  if(n<R.players.length)return this.err(conn,'Ya hay más jugadores que asientos');
  R.seatsN=n;this.change();this.broadcast()}

 start(conn,p){const R=this.R;if(!p.host)return this.err(conn,'Solo el anfitrión empieza la partida');
  if(R.phase!='lobby')return this.err(conn,'La partida ya empezó');
  const humans=R.players,n=R.seatsN,nb=n-humans.length;
  if(nb>MAX_SEATS-1)return this.err(conn,'Demasiados bots');
  const used=new Set(humans.map(h=>h.avatar)),free=shuffle(ROSTER.map((_,i)=>i).filter(i=>!used.has(i)),this.rnd);
  const lvl=()=>LEVEL_NAMES[Math.floor(this.rnd()*LEVEL_NAMES.length)];
  const seats=[...humans.map(h=>({pid:h.id,name:h.name,avatar:h.avatar,bot:false})),
   ...Array.from({length:nb},(_,i)=>({pid:null,name:ROSTER[free[i]].name,avatar:free[i],bot:true,level:lvl()}))];
  // el orden de la mesa es al azar, así el anfitrión no siempre juega primero
  shuffle(seats,this.rnd);
  R.seats=seats;R.S=newGame(n);R.phase='playing';this.pending=[];
  this.change();this.broadcast();this.schedule()}

 seatOf(p){return this.R.seats?this.R.seats.findIndex(s=>s.pid===p.id):-1}

 // ---- jugadas de personas ----
 act(conn,p,fn){const R=this.R;if(R.phase!='playing')return this.err(conn,'No hay partida en curso');
  const seat=this.seatOf(p);if(seat<0||R.seats[seat].bot)return this.err(conn,'No tienes asiento');
  const r=fn(R.S);if(r.err)return this.err(conn,r.err);
  this.change();this.broadcast();this.schedule()}

 doDraw(S,p,deck){const seat=this.seatOf(p),r=drawCard(S,seat,deck);if(r.err)return r;
  if(r.end){closeRound(S,-1);return{done:1}}
  this.ev({e:'draw',seat,from:deck?'deck':'disc',card:deck?undefined:r.card});return r}
 doLay(S,p,groups){const seat=this.seatOf(p),r=layDown(S,seat,groups);if(r.err)return r;
  this.ev({e:'lay',seat});if(r.out)closeRound(S,seat);return r}
 doAttach(S,p,m){const seat=this.seatOf(p);
  if(!Number.isInteger(m.owner)||!Number.isInteger(m.mi)||!Number.isInteger(m.id))return{err:'Jugada inválida'};
  const side=m.side===undefined?undefined:m.side;if(side!==undefined&&!['t','s','e'].includes(side))return{err:'Jugada inválida'};
  const r=attachCard(S,seat,m.owner,m.mi,m.id,side);if(r.err)return r;
  this.ev({e:'attach',seat,owner:m.owner});if(r.out)closeRound(S,seat);return r}
 doDiscard(S,p,id){const seat=this.seatOf(p);if(!Number.isInteger(id))return{err:'Jugada inválida'};
  const r=discard(S,seat,id);if(r.err)return r;
  this.ev({e:'discard',seat,card:r.card});
  if(r.out)closeRound(S,seat);else if(r.exhausted)closeRound(S,-1);else endTurn(S);return r}
 ev(e){this.pending.push(e)}

 next(conn,p){const R=this.R;if(R.phase!='playing'||R.S.phase!='roundEnd')return this.err(conn,'La ronda no ha terminado');
  if(!p.host)return this.err(conn,'Solo el anfitrión sigue a la siguiente ronda');
  if(R.S.round>=9){R.phase='lobby';R.S=null;R.seats=null} // fin de la partida: de vuelta a la sala
  else nextRound(R.S);
  this.change();this.broadcast();this.schedule()}

 leave(conn,p){const R=this.R;this.conns.delete(conn);p.connected=false;
  if(R.phase=='lobby'){R.players=R.players.filter(x=>x.id!==p.id);if(p.host&&R.players.length)R.players[0].host=true;
   if(!R.players.length){this.R=null;this.clear();if(this.env.onChange)this.env.onChange();try{conn.close()}catch(e){}return}}
  else{const s=this.R.seats[this.seatOf(p)];if(s){s.bot=true;s.level='Normal';s.pid=null} // su asiento lo toma un bot
   if(p.host){const h=R.players.find(x=>x.connected&&x.id!==p.id);if(h){p.host=false;h.host=true}}}
  this.change();this.broadcast();this.schedule();try{conn.close()}catch(e){}}

 // ---- bots y jugadores ausentes ----
 clear(){if(this.timer!=null){this.env.clearTimer(this.timer);this.timer=null}this.think=null}
 // Si le toca a un bot (o a una persona desconectada) agenda su jugada para cuando "termine de pensar".
 schedule(){this.clear();const R=this.R;if(!R||R.phase!='playing'||R.S.phase=='roundEnd')return;
  const S=R.S,seat=S.turn,s=R.seats[seat],pl=s.bot?null:R.players.find(x=>x.id===s.pid);
  const away=!s.bot&&!(pl&&pl.connected);if(!s.bot&&!away)return;
  const ms=away?AWAY_MS:thinkTime(effort(S,seat),this.thinkMax,this.rnd);
  this.think={seat,ms,since:Date.now()};
  const token=this.timer=this.env.setTimer(()=>{if(this.timer!==token)return;this.timer=null;this.botMove(seat)},ms);
  this.broadcast()}
 botMove(seat){const R=this.R;if(!R||R.phase!='playing'||R.S.turn!==seat||R.S.phase=='roundEnd')return;
  const s=R.seats[seat],style=LEVELS[s.level||'Normal']||LEVELS.Normal;this.think=null;
  const r=playBotSeat(R.S,seat,style);if(r.err)return;
  if(r.drew)this.ev({e:'draw',seat,from:r.drew,card:r.drew=='disc'?r.drewCard:undefined});
  if(r.laid)this.ev({e:'lay',seat});
  if(r.discard)this.ev({e:'discard',seat,card:r.discard});
  this.change();this.broadcast();this.schedule()}

 // ---- difusión ----
 meta(){const R=this.R;return{code:R.code,phase:R.phase,seatsN:R.seatsN,
  players:R.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,host:!!p.host,connected:p.connected}))}}
 broadcast(){if(!this.R)return;const R=this.R,evs=this.pending;this.pending=[];
  for(const [conn,id] of this.conns){const p=R.players.find(x=>x.id===id);if(!p)continue;
   const msg={t:R.phase=='lobby'?'lobby':'state',room:this.meta(),you:{id:p.id,host:!!p.host}};
   if(R.phase=='playing'){const seat=this.seatOf(p);
    msg.seat=seat;msg.view=viewFor(R.S,seat);msg.events=evs;msg.think=this.think?{seat:this.think.seat,ms:this.think.ms}:null;
    msg.seats=R.seats.map(s=>({name:s.name,avatar:s.avatar,bot:s.bot,
     connected:s.bot?true:!!(R.players.find(x=>x.id===s.pid)||{}).connected}))}
   try{conn.send(msg)}catch(e){}}}
}
