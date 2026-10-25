// Reglas de partida sin pantalla (src/game.js): acciones, turnos, validaciones y vista por jugador
import test from 'node:test';
import assert from 'node:assert/strict';
import {CON,solve,sides,pts} from '../src/engine.js';
import {LEVELS} from '../src/roster.js';
import * as g from '../src/game.js';

const idsOf=ms=>ms.map(m=>m.map(c=>c.id));
const allCards=S=>[...S.deck,...S.disc,...S.hands.flat(),...S.melds.flat().flatMap(m=>m.cs)];

// Jugador "automático" que solo usa la API pública de acciones
function turnoSimple(S,p){
 let r=g.drawCard(S,p,true);if(r.err)throw new Error(r.err);if(r.end)return g.closeRound(S,-1),'fin';
 const h=S.hands[p];
 if(!S.down[p]){const sol=solve(h,[...CON[S.round]].sort((a,b)=>b-a));
  if(sol){const l=g.layDown(S,p,sol.map(m=>({ids:m.map(c=>c.id),st:m.st0})));assert.ok(!l.err,l.err);if(l.out)return g.closeRound(S,p),'sale'}}
 else if(!S.justDown){for(const c of [...S.hands[p]]){for(let o=0;o<S.n;o++)for(let i=0;i<S.melds[o].length;i++){
   if(!S.hands[p].some(x=>x.id==c.id))continue;const ss=sides(S.melds[o][i],c);
   if(ss.length){const a=g.attachCard(S,p,o,i,c.id,ss[0]);assert.ok(!a.err,a.err);if(a.out)return g.closeRound(S,p),'sale'}}}}
 const w=[...S.hands[p]].sort((a,b)=>pts(b.r)-pts(a.r)).find(c=>c.r)||S.hands[p][0];
 const d=g.discard(S,p,w.id);assert.ok(!d.err,d.err);
 if(d.out)return g.closeRound(S,p),'sale';if(d.exhausted)return g.closeRound(S,-1),'fin';
 g.endTurn(S);return null}

for(const n of [2,3,4,5])test(`${n} asientos: partida completa solo con acciones`,()=>{
 const S=g.newGame(n);let rondas=0;
 while(true){assert.equal(S.turn,g.firstSeat(S));
  for(let t=0;t<800&&S.phase!='roundEnd';t++){turnoSimple(S,S.turn);
   if(S.phase!='roundEnd')assert.equal(new Set(allCards(S).map(c=>c.id)).size,108,'se conservan las 108 cartas')}
  assert.equal(S.phase,'roundEnd');assert.equal(S.scores.length,rondas+1);rondas++;
  if(S.round==9)break;assert.ok(!g.nextRound(S).err)}
 assert.equal(rondas,10);assert.ok(g.nextRound(S).err,'no hay ronda 11');
 const t=g.totals(S);assert.equal(t.length,n);assert.ok(g.winners(S).length>=1)});

test('dealerOf es el asiento anterior al primero',()=>{
 for(const n of [2,3,4,5]){const S=g.newGame(n);for(let r=0;r<10;r++){S.round=r;assert.equal((g.dealerOf(S)+1)%n,g.firstSeat(S))}}});

test('solo juega el asiento del turno y en el orden robar → descartar',()=>{
 const S=g.newGame(3),o=(S.turn+1)%3,mano=S.hands[S.turn];
 assert.ok(g.drawCard(S,o,true).err,'otro asiento no roba');
 assert.ok(g.discard(S,S.turn,mano[0].id).err,'no se descarta sin robar');
 assert.ok(!g.drawCard(S,S.turn,true).err);
 assert.ok(g.drawCard(S,S.turn,true).err,'no se roba dos veces');
 assert.ok(g.discard(S,S.turn,-5).err,'carta inexistente');
 const ajena=S.hands[o][0].id;assert.ok(g.discard(S,S.turn,ajena).err,'carta de otro');
 assert.equal(S.hands[S.turn].length,13);
 assert.ok(!g.discard(S,S.turn,mano[0].id).err);assert.equal(S.hands[S.turn].length,12);
 g.endTurn(S);assert.equal(S.turn,o);assert.equal(S.phase,'draw')});

test('layDown rechaza combinaciones inventadas, ajenas o que no cumplen el contrato',()=>{
 const S=g.newGame(2);S.round=0;g.deal(S);g.drawCard(S,S.turn,true);const p=S.turn,h=S.hands[p];
 assert.ok(g.layDown(S,p,[]).err);assert.ok(g.layDown(S,p,[[1,2,3]]).err);
 assert.ok(g.layDown(S,p,[h.slice(0,3).map(c=>c.id)]).err,'un grupo cualquiera no cumple');
 const otra=S.hands[1-p].slice(0,3).map(c=>c.id);assert.ok(g.layDown(S,p,[otra,otra]).err,'cartas de otro asiento');
 const dup=[h[0].id,h[0].id,h[0].id];assert.ok(g.layDown(S,p,[dup]).err,'carta repetida');
 assert.equal(S.hands[p].length,13,'una bajada rechazada no cambia nada');assert.equal(S.down[p],0)});

test('bajarse y pegar: no se pega en el turno en que te bajas',()=>{
 const S=g.newGame(2);S.round=0;
 // mano armada a mano: dos tríos (contrato de la ronda 1) y sobrantes
 let id=1000;const mk=(r,s)=>({id:id++,r,s});
 S.hands=[[mk(5,0),mk(5,1),mk(5,2),mk(9,0),mk(9,1),mk(9,2),mk(9,3),mk(2,0),mk(3,1),mk(4,2),mk(7,3),mk(11,0)],[mk(1,0)]];
 S.deck=[mk(12,3)];S.disc=[mk(13,3)];S.turn=0;S.phase='draw';
 assert.ok(!g.drawCard(S,0,true).err);
 const l=g.layDown(S,0,[S.hands[0].slice(0,3).map(c=>c.id),S.hands[0].slice(3,6).map(c=>c.id)]);assert.ok(!l.err,l.err);
 assert.equal(S.hands[0].length,13-6);
 const extra=S.hands[0].find(c=>c.r==9);assert.ok(extra,'queda un 9 para pegar');
 assert.ok(g.attachCard(S,0,0,1,extra.id).err,'no se pega al bajarse');
 assert.ok(g.layDown(S,0,[[1]]).err,'no se baja dos veces');
 assert.ok(!g.discard(S,0,S.hands[0].find(c=>c.r==11).id).err);g.endTurn(S);g.endTurn(S);
 g.drawCard(S,0,true);assert.ok(!g.attachCard(S,0,0,1,extra.id).err,'al turno siguiente sí');
 assert.ok(g.attachCard(S,0,0,1,extra.id).err,'la carta ya no está en la mano')});

test('viewFor oculta manos ajenas, el mazo y el descarte salvo la carta de arriba',()=>{
 const S=g.newGame(4);g.drawCard(S,S.turn,true);
 for(let p=0;p<4;p++){const v=g.viewFor(S,p),txt=JSON.stringify(v);
  assert.deepEqual(v.hand.map(c=>c.id),S.hands[p].map(c=>c.id));
  assert.equal(v.counts[p],S.hands[p].length);assert.equal(v.deckCount,S.deck.length);
  for(const q of [0,1,2,3])if(q!==p)for(const c of S.hands[q])assert.ok(!txt.includes(`"id":${c.id},`)&&!txt.includes(`"id":${c.id}}`),'carta ajena filtrada');
  for(const c of S.deck)assert.ok(!txt.includes(`"id":${c.id},`)&&!txt.includes(`"id":${c.id}}`),'mazo filtrado');
  assert.equal(v.drawn,S.turn===p?S.drawn:null);assert.equal(v.hands,undefined)}
 g.closeRound(S,-1);assert.equal(g.viewFor(S,0).hands.length,4,'al cerrar la ronda se ven todas las manos')});

test('playBotSeat: los bots juegan por el servidor igual que en la app',()=>{
 const S=g.newGame(5);let fin=0;
 for(let t=0;t<2000&&S.phase!='roundEnd';t++){const r=g.playBotSeat(S,S.turn,LEVELS.Normal);assert.ok(!r.err);
  assert.equal(new Set(allCards(S).map(c=>c.id)).size,108)}
 assert.equal(S.phase,'roundEnd');assert.equal(S.scores[0].length,5);
 assert.ok(g.playBotSeat(S,0,LEVELS.Normal).err,'con la ronda cerrada no se juega')});

test('newGame valida el tamaño de la mesa',()=>{for(const n of [0,1,6,2.5,'3'])assert.throws(()=>g.newGame(n),RangeError)});
