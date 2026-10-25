// Traduce lo que manda el servidor (asientos del servidor, solo tu mano) a la forma que dibuja la pantalla:
// tú siempre eres el asiento 0 y los demás siguen en el orden de la mesa. Sin DOM: se puede probar en Node.
export const toLocal=(seat,me,n)=>(seat-me+n)%n;
export const toSeat=(i,me,n)=>(me+i)%n;
const ph=(k,top)=>Array.from({length:k},(_,i)=>({id:-1-i,s:-1,r:0})).map((c,i,a)=>top&&i===a.length-1?top:c);

// m: mensaje {t:'state'} del servidor · prev: el estado local G actual (para conservar tu orden de cartas y las combinaciones sin bajar)
export function localPatch(m,prev={}){
 const v=m.view,n=v.n,me=m.seat,rot=a=>Array.from({length:n},(_,i)=>a[(me+i)%n]);
 const newRound=prev.olRound!==v.round||!prev.hands;
 const myTurn=v.turn===me&&v.phase==='play'&&!v.down[me];
 const staged=!newRound&&myTurn?(prev.staged||[]):[];
 const stagedIds=new Set(staged.flatMap(x=>x.cs.map(c=>c.id)));
 let mine=v.hand;
 if(!newRound&&prev.hands&&prev.hands[0]){const have=new Map(v.hand.map(c=>[c.id,c])),kept=prev.hands[0].filter(c=>have.has(c.id)).map(c=>have.get(c.id)),ids=new Set(kept.map(c=>c.id));
  mine=[...kept,...v.hand.filter(c=>!ids.has(c.id))]}
 mine=mine.filter(c=>!stagedIds.has(c.id));
 const before=new Set(((!newRound&&prev.hands&&prev.hands[0])||[]).map(c=>c.id));
 const seats=rot(m.seats);
 return{newRound,patch:{
  n,me,olRound:v.round,round:v.round,scores:v.scores.map(rot),
  hands:[mine,...rot(v.counts).slice(1).map(k=>ph(k))],
  deck:ph(v.deckCount),disc:ph(v.discCount,v.discTop),melds:rot(v.melds),down:rot(v.down),taken:rot(v.taken),
  reshuf:v.reshuf,justDown:v.justDown,drawn:v.drawn,staged,
  phase:v.phase==='roundEnd'?'roundEnd':v.turn===me?v.phase:'bots',
  turn:toLocal(v.turn,me,n),win:v.win==null?null:v.win<0?-1:toLocal(v.win,me,n),
  bots:seats.map(s=>({id:s.avatar,lvl:'Normal',bot:s.bot,connected:s.connected})),names:seats.map(s=>s.name)},
  fresh:newRound?[]:mine.filter(c=>!before.has(c.id)).map(c=>c.id),
  events:(m.events||[]).map(e=>({...e,p:toLocal(e.seat,me,n)})),
  think:m.think?{p:toLocal(m.think.seat,me,n),ms:m.think.ms}:null}}
