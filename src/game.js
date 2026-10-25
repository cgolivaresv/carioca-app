// Reglas de una partida de carioca de 2 a 5 asientos, sin pantalla, sonido ni almacenamiento.
// La app (navegador) y, más adelante, el servidor usan este mismo módulo: así las jugadas se validan igual en los dos lados.
//
// El estado S es un objeto simple y serializable:
//   n (asientos), round (0..9), scores (una fila por ronda), hands, deck, disc, melds, down, taken, reshuf,
//   turn (asiento que juega), phase ('draw' = debe robar · 'play' = ya robó · 'roundEnd'), justDown, drawn, win.
// Cada acción recibe el asiento `p` que la hace y devuelve {err:'motivo'} si no es válida (sin tocar el estado)
// o un resultado con lo ocurrido. Las cartas se piden por id, como llegarían desde un cliente.
import {CON,pts,mkDeck,classify,meets,rm,sides,put} from './engine.js';
import {botPlay,deckDraw} from './bots.js';

export const MIN_SEATS=2,MAX_SEATS=5,HAND=12,ROUNDS=10;
const seats=(n,f)=>Array.from({length:n},f);
const err=m=>({err:m});

export const validSeats=n=>Number.isInteger(n)&&n>=MIN_SEATS&&n<=MAX_SEATS;
export const firstSeat=S=>S.round%S.n;            // quien juega primero en la ronda
export const dealerOf=S=>(S.round+S.n-1)%S.n;     // quien reparte: el asiento anterior al primero
export const contract=S=>CON[S.round];
export const totals=S=>seats(S.n,(_,i)=>S.scores.reduce((a,r)=>a+r[i],0));
// Asientos con el menor puntaje total (más de uno = empate)
export const winners=S=>{const t=totals(S),m=Math.min(...t);return t.flatMap((x,i)=>x===m?[i]:[])};

export function newGame(n){if(!validSeats(n))throw new RangeError('La mesa es de 2 a 5 jugadores');
 const S={n,round:0,scores:[]};deal(S);return S}

// Reparte la ronda S.round: 12 cartas por asiento y una al descarte. Devuelve el asiento que juega primero.
export function deal(S){const d=mkDeck(),f=firstSeat(S);
 S.hands=seats(S.n,()=>d.splice(0,HAND));S.deck=d;S.disc=[d.pop()];
 S.down=seats(S.n,()=>0);S.taken=seats(S.n,()=>[]);S.melds=seats(S.n,()=>[]);
 S.reshuf=0;S.justDown=0;S.drawn=null;S.win=null;S.turn=f;S.phase='draw';return f}

export function nextRound(S){if(S.round>=ROUNDS-1)return err('La partida terminó');S.round++;deal(S);return{first:S.turn}}

const turnErr=(S,p,phase)=>S.phase=='roundEnd'?err('La ronda terminó')
 :S.turn!==p?err('No es tu turno')
 :S.phase!==phase?err(phase=='draw'?'Ya robaste en este turno':'Primero debes robar'):null;

// Robar del mazo (deck=true) o tomar el descarte. {end:true} si no queda ninguna carta (la ronda debe cerrarse sin ganador).
export function drawCard(S,p,deck){const e=turnErr(S,p,'draw');if(e)return e;
 const c=deck?deckDraw(S):S.disc.pop();if(!c)return{end:true};
 if(!deck)S.taken[p].push(c);
 S.hands[p].push(c);S.drawn=c.id;S.justDown=0;S.phase='play';return{card:c,fromDeck:!!deck}}

// Bajarse con combinaciones ya armadas (cartas que ya no están en la mano). La usa la app, que arma las combinaciones de a una.
export function commitLay(S,p,melds){const e=turnErr(S,p,'play');if(e)return e;
 if(S.down[p])return err('Ya te bajaste');
 if(!meets(melds,CON[S.round]))return err('No cumples el contrato');
 S.melds[p]=melds;S.down[p]=1;S.justDown=1;return{melds,out:!S.hands[p].length}}

// Bajarse desde la mano: `groups` es una lista de combinaciones, cada una una lista de ids de la mano
// (o {ids,st}, con st = carta inicial de la escala si importa). El servidor usa esta forma.
export function layDown(S,p,groups){const e=turnErr(S,p,'play');if(e)return e;
 if(S.down[p])return err('Ya te bajaste');
 if(!Array.isArray(groups)||!groups.length)return err('Faltan combinaciones');
 const used=new Set(),ms=[];
 for(const g of groups){const ids=Array.isArray(g)?g:g&&g.ids,st=Array.isArray(g)?undefined:g&&g.st;
  if(!Array.isArray(ids)||ids.some(i=>!Number.isInteger(i)||used.has(i)))return err('Combinación inválida');
  const cs=ids.map(i=>S.hands[p].find(c=>c.id===i));
  if(cs.some(c=>!c))return err('Esa carta no está en tu mano');
  ids.forEach(i=>used.add(i));
  const m=classify(cs,st);if(!m)return err('Combinación inválida');ms.push(m)}
 if(!meets(ms,CON[S.round]))return err('No cumples el contrato');
 S.hands[p]=rm(S.hands[p],ms.flatMap(m=>m.cs));
 S.melds[p]=ms;S.down[p]=1;S.justDown=1;return{melds:ms,out:!S.hands[p].length}}

// Pegar una carta de tu mano a la combinación `mi` del asiento `owner`. `side`: 't' trío, 's' inicio o 'e' final de escala
// (obligatorio solo si es un comodín que cabe en los dos extremos).
export function attachCard(S,p,owner,mi,cardId,side){const e=turnErr(S,p,'play');if(e)return e;
 if(!S.down[p])return err('Primero debes bajarte');
 if(S.justDown)return err('No puedes pegar en el turno en que te bajas');
 const m=S.melds[owner]&&S.melds[owner][mi],c=S.hands[p].find(x=>x.id===cardId);
 if(!m)return err('Esa combinación no existe');if(!c)return err('Esa carta no está en tu mano');
 const ss=sides(m,c);if(!ss.length)return err('Esa carta no encaja ahí');
 if(side===undefined){if(ss.length>1)return err('Falta elegir el lado');side=ss[0]}
 if(!ss.includes(side))return err('Ese lado no es válido');
 put(m,c,side);S.hands[p]=rm(S.hands[p],[c]);return{out:!S.hands[p].length}}

// Descartar una carta para terminar el turno. No avanza el turno: eso lo hace endTurn (o la app, con su animación).
export function discard(S,p,cardId){const e=turnErr(S,p,'play');if(e)return e;
 const c=S.hands[p].find(x=>x.id===cardId);if(!c)return err('Esa carta no está en tu mano');
 S.hands[p]=rm(S.hands[p],[c]);S.disc.push(c);S.justDown=0;
 return{card:c,out:!S.hands[p].length,exhausted:S.reshuf>=2}}

export function endTurn(S){S.turn=(S.turn+1)%S.n;S.phase='draw';S.drawn=null;S.justDown=0;return S.turn}

// Turno completo de un bot (el estilo es un nivel de roster.LEVELS). `end` indica si la ronda debe cerrarse:
// el asiento que salió, o -1 si ya no hay cartas para robar o el mazo se agotó dos veces. No cierra la ronda ni avanza el turno.
export function botTurn(S,p,style,log){const r=botPlay(S,p,log,style);
 r.end=r.out?p:(!r.drew||S.reshuf>=2)?-1:null;return r}

// Cierra la ronda: suma los puntos de las cartas que quedan en cada mano. w = asiento que salió, o -1 sin ganador.
export function closeRound(S,w){const row=S.hands.map(h=>h.reduce((a,c)=>a+pts(c.r),0));
 S.scores.push(row);S.phase='roundEnd';S.win=w;return row}

// Juega el turno de un bot de punta a punta (robar, bajarse, descartar) y deja la mesa lista para el siguiente.
// Pensado para el servidor; la app lo hace por pasos para poder animarlo.
export function playBotSeat(S,p,style,log){if(S.phase=='roundEnd'||S.turn!==p)return err('No es el turno de ese asiento');
 const r=botTurn(S,p,style,log);
 if(r.end!==null){closeRound(S,r.end);return r}
 endTurn(S);return r}

// Lo que un asiento puede ver: su mano completa; de los demás, solo cuántas cartas tienen. Del mazo, solo cuántas quedan,
// y del descarte, la carta de arriba. Las combinaciones bajadas y lo que cada uno tomó del descarte son públicos.
export function viewFor(S,p){return{
 n:S.n,seat:p,round:S.round,scores:S.scores,turn:S.turn,phase:S.phase,win:S.win,justDown:S.justDown,
 hand:S.hands[p],counts:S.hands.map(h=>h.length),
 deckCount:S.deck.length,discTop:S.disc[S.disc.length-1]||null,discCount:S.disc.length,
 melds:S.melds,down:S.down,taken:S.taken,reshuf:S.reshuf,drawn:S.turn===p?S.drawn:null,
 // al terminar la ronda se muestran todas las manos (se cuentan los puntos)
 hands:S.phase=='roundEnd'?S.hands:undefined}}
