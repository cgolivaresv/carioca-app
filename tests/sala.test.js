// Sala en línea (worker/core.js): lobby, partida completa con personas y bots, reconexión, salida y entradas hostiles
import test from 'node:test';
import assert from 'node:assert/strict';
import {CON,solve,sides,pts} from '../src/engine.js';
import {RoomCore,AWAY_MS} from '../worker/core.js';

function mkRoom(){let id=0;const timers=new Map(),saved=[];
 const env={setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id},clearTimer:i=>timers.delete(i),onChange:()=>saved.push(1)};
 const core=new RoomCore(env);
 const fire=()=>{const k=[...timers.keys()][0];if(k===undefined)return false;const t=timers.get(k);timers.delete(k);t.fn();return true};
 return{core,timers,fire,saved}}
function mkConn(){const c={sent:[],closed:false,send(m){c.sent.push(JSON.parse(JSON.stringify(m)))},close(){c.closed=true}};
 c.last=t=>[...c.sent].reverse().find(m=>m.t===t);c.errs=()=>c.sent.filter(m=>m.t=='err');return c}
const hello=(core,c,o={})=>core.message(c,{t:'hello',name:'Ana',avatar:1,...o});

function lobby(nHumans,seatsN){const r=mkRoom(),cs=[];
 for(let i=0;i<nHumans;i++){const c=mkConn();hello(r.core,c,i?{name:'J'+i,avatar:i+1}:{create:true,code:'ABCD',name:'Host',avatar:0});cs.push(c);
  if(!i)r.core.message(c,{t:'config',seats:seatsN})}
 return{...r,cs}}

// Una persona que juega solo con mensajes, mirando solo su vista
function jugar(core,c){const v=c.last('state').view,seat=c.last('state').seat,send=m=>core.message(c,m);
 if(v.turn!==seat||v.phase=='roundEnd')return false;
 if(v.phase=='draw'){send({t:'draw',deck:true});if(c.errs().length)throw new Error(c.errs().at(-1).msg)}
 let w=c.last('state').view;if(w.phase!='play')return true;
 if(!w.down[seat]){const sol=solve(w.hand,[...CON[w.round]].sort((a,b)=>b-a));
  if(sol)send({t:'lay',groups:sol.map(m=>({ids:m.map(x=>x.id),st:m.st0}))})}
 else if(!w.justDown){for(const card of [...w.hand]){const cur=c.last('state').view;if(cur.phase!='play'||!cur.hand.some(x=>x.id==card.id))continue;
  for(let o=0;o<cur.n;o++)for(let i=0;i<cur.melds[o].length;i++){const k=c.last('state').view;if(!k.hand.some(x=>x.id==card.id))continue;
   const ss=sides(k.melds[o][i],card);if(ss.length)send({t:'attach',owner:o,mi:i,id:card.id,side:ss[0]})}}}
 w=c.last('state').view;if(w.phase=='roundEnd')return true;
 const h=w.hand,d=[...h].sort((a,b)=>pts(b.r)-pts(a.r)).find(x=>x.r)||h[0];send({t:'discard',id:d.id});return true}

test('lobby: crear, unirse, configurar y errores',()=>{
 const{core}=mkRoom(),a=mkConn(),b=mkConn(),x=mkConn();
 hello(core,x);assert.equal(x.errs()[0].code,'nofound','sala inexistente');
 hello(core,a,{create:true,code:'ABCD',name:'Host',avatar:0});assert.ok(a.last('welcome').token);assert.ok(a.last('lobby').you.host);
 const y=mkConn();hello(core,y,{create:true,code:'ABCD'});assert.equal(y.errs()[0].code,'taken');
 hello(core,b,{name:'Beto',avatar:2});assert.ok(!b.last('lobby').you.host);assert.equal(a.last('lobby').room.players.length,2);
 core.message(b,{t:'config',seats:4});assert.match(b.errs().at(-1).msg,/anfitrión/);
 core.message(a,{t:'config',seats:1});assert.ok(a.errs().length);core.message(a,{t:'config',seats:6});assert.equal(a.errs().length,2);
 core.message(a,{t:'config',seats:2});assert.equal(a.last('lobby').room.seatsN,2);
 const c=mkConn();hello(core,c);assert.equal(c.errs()[0].code,'full');
 core.message(b,{t:'start'});assert.match(b.errs().at(-1).msg,/anfitrión/)});

for(const [h,n] of [[1,2],[2,3],[2,5],[3,4],[5,5]])test(`partida completa en línea: ${h} personas, ${n} asientos`,()=>{
 const{core,fire,cs}=lobby(h,n);core.message(cs[0],{t:'start'});
 const S=()=>core.R.S,todas=()=>[...S().deck,...S().disc,...S().hands.flat(),...S().melds.flat().flatMap(m=>m.cs)];
 let rondas=0,pasos=0;
 while(core.R.phase=='playing'&&pasos++<30000){
  if(S().phase=='roundEnd'){rondas++;
   for(const c of cs)assert.ok(c.last('state').view.hands,'al terminar se ven todas las manos');
   core.message(cs[0],{t:'next'});continue}
  const turno=core.R.seats[S().turn];
  if(turno.bot){assert.ok(core.think&&core.think.seat==S().turn,'el bot anuncia que piensa');assert.ok(fire());}
  else{const c=cs[core.R.players.findIndex(p=>p.id==turno.pid)];assert.ok(jugar(core,c));}
  if(core.R.phase=='playing'&&S().phase!='roundEnd')assert.equal(new Set(todas().map(c=>c.id)).size,108)}
 assert.equal(rondas,10);assert.equal(core.R.phase,'lobby','al terminar vuelve a la sala');assert.equal(core.R.S,null)});

test('cada persona recibe solo su mano: ni manos ajenas ni el mazo',()=>{
 const{core,cs}=lobby(2,4);core.message(cs[0],{t:'start'});const S=core.R.S;
 cs.forEach((c,k)=>{const m=c.last('state'),txt=JSON.stringify(m);
  assert.equal(m.view.hand.length,12);assert.deepEqual(m.view.hand.map(x=>x.id),S.hands[m.seat].map(x=>x.id));
  S.hands.forEach((h,q)=>{if(q!==m.seat)for(const x of h)assert.ok(!txt.includes(`"id":${x.id},`)&&!txt.includes(`"id":${x.id}}`),'mano ajena filtrada')});
  for(const x of S.deck.slice(0,30))assert.ok(!txt.includes(`"id":${x.id},`),'mazo filtrado');
  assert.ok(!txt.includes('token'),'no se difunden los tokens')})});

test('jugadas fuera de turno o inventadas se rechazan sin romper nada',()=>{
 const{core,cs,fire}=lobby(2,3);core.message(cs[0],{t:'start'});
 const S=core.R.S,pidSeat=cs.map(c=>c.last('state').seat);
 const otro=cs.find((c,i)=>pidSeat[i]!==S.turn)||cs[0];
 const antes=JSON.stringify(S);
 core.message(otro,{t:'draw',deck:true});core.message(otro,{t:'discard',id:S.hands[pidSeat[cs.indexOf(otro)]][0].id});
 for(const m of [null,5,'x',{},{t:5},{t:'lay'},{t:'lay',groups:'x'},{t:'attach'},{t:'attach',owner:'a',mi:0,id:1},{t:'discard',id:'1'},{t:'discard',id:-1},{t:'config',seats:'4'},{t:'hello',token:5},{t:'zzz'}])core.message(otro,m);
 assert.equal(JSON.stringify(S),antes,'el estado de la partida no cambia');assert.ok(otro.errs().length>=5)});

test('un bot juega por sí solo y el reloj de pensar respeta el máximo',()=>{
 const{core,cs,fire,timers}=lobby(1,3);core.message(cs[0],{t:'start'});
 let vistos=0;for(let t=0;t<200&&core.R.S.phase!='roundEnd';t++){
  const s=core.R.seats[core.R.S.turn];
  if(s.bot){for(const x of timers.values())assert.ok(x.ms>=1000&&x.ms<=7000,`espera ${x.ms}`);fire();vistos++}else{jugar(core,cs[0])}}
 assert.ok(vistos>3);
 assert.ok(cs[0].sent.some(m=>m.events&&m.events.some(e=>e.e=='discard')),'se informan los descartes')});

test('reconexión con token, y quien se desconecta es reemplazado por un bot momentáneo',()=>{
 const{core,cs,fire,timers}=lobby(2,2);core.message(cs[0],{t:'start'});
 const tok=cs[1].last('welcome').token;
 core.close(cs[1]);assert.equal(cs[0].last('state').seats.filter(s=>!s.connected).length,1);
 // si le toca al ausente, juega solo tras AWAY_MS
 const S=core.R.S;let g=0;while(g++<10){const s=core.R.seats[S.turn];if(!s.bot&&s.pid===1){break}
  if(S.phase=='roundEnd')break;if(core.R.seats[S.turn].pid===0)jugar(core,cs[0]);else fire()}
 const aus=core.R.seats.findIndex(s=>s.pid===1);
 if(S.turn===aus){assert.ok([...timers.values()].some(t=>t.ms===AWAY_MS),'espera de ausente');fire();assert.notEqual(S.turn,aus)}
 const n=mkConn();hello(core,n,{token:tok});assert.ok(n.last('state'),'vuelve a la partida');assert.equal(n.last('state').seat,aus);
 const e=mkConn();hello(core,e,{token:'falso'});assert.equal(e.errs()[0].code,'started')});

test('una segunda conexión del mismo jugador reemplaza a la anterior',()=>{
 const{core,cs}=lobby(2,3);const tok=cs[1].last('welcome').token,n=mkConn();
 hello(core,n,{token:tok});assert.ok(cs[1].closed);assert.equal(cs[1].errs().at(-1).code,'replaced');assert.ok(n.last('lobby'))});

test('salir en plena partida deja su asiento a un bot y no se puede volver',()=>{
 const{core,cs}=lobby(2,3);core.message(cs[0],{t:'start'});const tok=cs[1].last('welcome').token;
 core.message(cs[1],{t:'leave'});assert.ok(cs[1].closed);
 assert.equal(core.R.seats.filter(s=>s.bot).length,2);
 const n=mkConn();hello(core,n,{token:tok});assert.equal(n.errs()[0].code,'left')});

test('salir del lobby traspasa el anfitrión y borra la sala vacía',()=>{
 const{core,cs}=lobby(2,3);core.message(cs[0],{t:'leave'});assert.ok(cs[1].last('lobby').you.host);
 core.message(cs[1],{t:'leave'});assert.equal(core.exists,false)});

test('el nombre se limpia y el avatar se valida',()=>{
 const{core}=mkRoom(),c=mkConn();hello(core,c,{create:true,code:'ZZZZ',name:'<img src=x onerror=alert(1)>"\u0007Pepito Grandote',avatar:99});
 const p=c.last('lobby').room.players[0];assert.ok(!/[<>&"']/.test(p.name));assert.ok(p.name.length<=12);assert.equal(p.avatar,0)});

test('snapshot y restore: la partida sigue donde estaba',()=>{
 const a=lobby(2,3);a.core.message(a.cs[0],{t:'start'});
 for(let i=0;i<6;i++){const s=a.core.R.seats[a.core.R.S.turn];if(s.bot)a.fire();else jugar(a.core,a.cs[a.core.R.players.findIndex(p=>p.id==s.pid)])}
 const snap=a.core.snapshot(),b=mkRoom();b.core.restore(JSON.parse(JSON.stringify(snap)));
 assert.deepEqual(b.core.R.S.hands,a.core.R.S.hands);
 const c=mkConn();hello(b.core,c,{token:snap.players[0].token});assert.ok(c.last('state'));
 assert.ok(b.core.R.players.filter(p=>p.connected).length==1)});

// ---- límite de tiempo por turno ----
function esperaHumano(r,cs){const{core}=r;let g=0;while(g++<400){const S=core.R.S,s=core.R.seats[S.turn];if(S.phase=='roundEnd')return false;if(!s.bot&&s.pid!==null)return s;r.fire()}return false}

test('límite por turno: config válida, solo el anfitrión, y se informa en la sala',()=>{
 const r=lobby(2,3),{core,cs}=r;assert.equal(cs[0].last('lobby').room.limit,60);
 core.message(cs[0],{t:'config',limit:30});assert.equal(cs[0].last('lobby').room.limit,30);
 core.message(cs[0],{t:'config',limit:0});assert.equal(cs[1].last('lobby').room.limit,0);
 const n=cs[0].errs().length;core.message(cs[0],{t:'config',limit:17});core.message(cs[0],{t:'config',limit:'60'});core.message(cs[0],{t:'config'});assert.equal(cs[0].errs().length,n+3);
 core.message(cs[1],{t:'config',limit:45});assert.match(cs[1].errs().at(-1).msg,/anfitrión/)});

test('límite por turno: al agotarse la persona roba y descarta sola, y el turno pasa',()=>{
 const r=lobby(1,2),{core,cs,timers}=r;core.message(cs[0],{t:'config',limit:30});core.message(cs[0],{t:'start'});
 const S=core.R.S;let g=0;while(core.R.seats[S.turn].bot&&g++<10)r.fire();
 assert.equal(core.R.seats[S.turn].bot,false);
 const ms=[...timers.values()].map(t=>t.ms);assert.ok(ms.includes(30000),'corre el reloj de 30 s');
 assert.equal(cs[0].last('state').turn.limitMs,30000);assert.ok(cs[0].last('state').turn.remainMs>0);
 const yo=S.turn,antes=S.hands[yo].length;
 // vence el reloj
 const k=[...timers.keys()].find(i=>timers.get(i).ms===30000);const t=timers.get(k);timers.delete(k);t.fn();
 assert.notEqual(S.turn,yo,'el turno pasó');assert.equal(S.hands[yo].length,antes,'robó una y descartó una');
 assert.ok(cs[0].sent.some(m=>m.events&&m.events.some(e=>e.e=='discard'&&e.auto)),'se informa que fue automático');
 assert.equal(core.R.players[0].strikes,1)});

test('límite por turno: sin límite no corre reloj; actuar a tiempo reinicia las faltas',()=>{
 const r=lobby(1,2),{core,cs,timers}=r;core.message(cs[0],{t:'config',limit:0});core.message(cs[0],{t:'start'});
 let g=0;while(core.R.seats[core.R.S.turn].bot&&g++<10)r.fire();
 assert.ok(![...timers.values()].some(t=>t.ms>=30000),'sin reloj');assert.equal(cs[0].last('state').turn,null);
 core.R.players[0].strikes=1;jugar(core,cs[0]);assert.equal(core.R.players[0].strikes,0)});

test('límite por turno: el reloj no se reinicia con cada acción del mismo turno',()=>{
 const r=lobby(1,2),{core,cs,timers}=r;core.message(cs[0],{t:'config',limit:45});core.message(cs[0],{t:'start'});
 let g=0;while(core.R.seats[core.R.S.turn].bot&&g++<10)r.fire();
 const at=core.limitAt;assert.ok(at>0);core.message(cs[0],{t:'draw',deck:true});
 assert.equal(core.limitAt,at,'robar no reinicia el reloj')});

test('dos turnos agotados seguidos: la persona pasa a ausente y juega un bot por ella hasta que vuelva a jugar',()=>{
 const r=lobby(1,2),{core,cs,timers}=r;core.message(cs[0],{t:'config',limit:30});core.message(cs[0],{t:'start'});
 const vence=()=>{let g=0;while(core.R.seats[core.R.S.turn].bot&&g++<20)r.fire();
  const k=[...timers.keys()].find(i=>timers.get(i).ms===30000);if(k===undefined)return false;const t=timers.get(k);timers.delete(k);t.fn();return true};
 assert.ok(vence());assert.ok(vence());assert.equal(core.R.players[0].strikes,2);
 let g=0;while(core.R.seats[core.R.S.turn].bot&&g++<20)r.fire();
 assert.ok([...timers.values()].some(t=>t.ms===AWAY_MS),'ahora espera como ausente (sin reloj de 30 s)');
 assert.ok(![...timers.values()].some(t=>t.ms===30000))});

test('un bot nunca juega sobre un turno ya empezado por una persona',()=>{
 const r=lobby(1,2),{core,cs}=r;core.message(cs[0],{t:'start'});let g=0;while(core.R.seats[core.R.S.turn].bot&&g++<10)r.fire();
 core.message(cs[0],{t:'draw',deck:true});const n=core.R.S.hands[core.R.S.turn].length;
 core.botMove(core.R.S.turn);assert.equal(core.R.S.hands[core.R.S.turn].length,n,'no robó otra vez')});
