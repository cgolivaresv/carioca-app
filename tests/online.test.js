// Traducción del estado del servidor a la vista local (src/online.js): tú siempre eres el asiento 0
import test from 'node:test';
import assert from 'node:assert/strict';
import {RoomCore} from '../worker/core.js';
import {localPatch,toLocal,toSeat} from '../src/online.js';
import {closeRound} from '../src/game.js';

function sala(humans,seatsN){let id=0;const core=new RoomCore({setTimer:()=>++id,clearTimer(){},onChange(){}}),cs=[];
 const mk=()=>{const c={sent:[],send(m){c.sent.push(JSON.parse(JSON.stringify(m)))},close(){}};c.last=t=>[...c.sent].reverse().find(m=>m.t===t);return c};
 for(let i=0;i<humans;i++){const c=mk();core.message(c,{t:'hello',name:'Persona'+i,avatar:i,create:i==0||undefined,code:'TEST'});cs.push(c);if(!i)core.message(c,{t:'config',seats:seatsN})}
 core.message(cs[0],{t:'start'});return{core,cs}}

test('toLocal y toSeat son inversas',()=>{for(const n of [2,3,4,5])for(let me=0;me<n;me++)for(let s=0;s<n;s++){assert.equal(toSeat(toLocal(s,me,n),me,n),s);assert.equal(toLocal(me,me,n),0)}});

for(const [h,n] of [[1,2],[2,3],[3,5]])test(`${h} personas, ${n} asientos: cada una se ve como asiento 0`,()=>{
 const{core,cs}=sala(h,n);
 for(const c of cs){const m=c.last('state'),{patch,newRound}=localPatch(m,{}),v=m.view;
  assert.ok(newRound);assert.equal(patch.n,n);assert.equal(patch.hands.length,n);
  assert.deepEqual(patch.hands[0].map(x=>x.id).sort(),v.hand.map(x=>x.id).sort());
  for(let i=1;i<n;i++)assert.equal(patch.hands[i].length,v.counts[toSeat(i,m.seat,n)]);
  assert.equal(patch.names[0],m.seats[m.seat].name);
  assert.equal(patch.bots.length,n);assert.equal(patch.bots[0].id,m.seats[m.seat].avatar);
  assert.equal(patch.deck.length,v.deckCount);assert.equal(patch.disc.length,v.discCount);assert.deepEqual(patch.disc.at(-1),v.discTop);
  assert.equal(patch.turn===0,v.turn===m.seat);
  assert.equal(patch.phase,v.turn===m.seat?'draw':'bots');
  assert.equal(patch.round,0);assert.deepEqual(patch.down,Array(n).fill(0))}});

test('al terminar la ronda: fase roundEnd, ganador en índice local y puntajes rotados',()=>{
 const{core,cs}=sala(2,3);const S=core.R.S;
 // cierra la ronda como si el asiento 1 hubiera salido
 S.hands[1]=[];closeRound(S,1);core.broadcast();
 for(const c of cs){const m=c.last('state'),{patch}=localPatch(m,{});
  assert.equal(patch.phase,'roundEnd');assert.equal(patch.win,toLocal(1,m.seat,3));
  assert.deepEqual(patch.scores[0],[0,1,2].map(i=>S.scores[0][toSeat(i,m.seat,3)]))}});

test('conserva el orden de tu mano y marca la carta nueva',()=>{
 const{core,cs}=sala(1,2);const c=cs[0],m0=c.last('state'),p0=localPatch(m0,{});
 const G={...p0.patch,hands:[[...p0.patch.hands[0]].reverse(),...p0.patch.hands.slice(1)]}; // el jugador reordenó
 const S=core.R.S,seat=m0.seat;
 // fuerza que le toque y robe
 S.turn=seat;S.phase='draw';const nueva=S.deck.at(-1);S.hands[seat].push(S.deck.pop());S.phase='play';S.drawn=nueva.id;core.broadcast();
 const m1=c.last('state'),p1=localPatch(m1,G);
 assert.ok(!p1.newRound);
 assert.deepEqual(p1.patch.hands[0].slice(0,12).map(x=>x.id),G.hands[0].map(x=>x.id),'mismo orden de antes');
 assert.equal(p1.patch.hands[0].at(-1).id,nueva.id);assert.deepEqual(p1.fresh,[nueva.id])});

test('las combinaciones armadas sin bajar no vuelven a la mano mientras sea tu turno',()=>{
 const{core,cs}=sala(1,2);const c=cs[0],m0=c.last('state'),seat=m0.seat,S=core.R.S;
 S.turn=seat;S.phase='draw';S.hands[seat].push(S.deck.pop());S.phase='play';core.broadcast();
 const m=c.last('state'),p=localPatch(m,{});
 const tres=p.patch.hands[0].slice(0,3),staged=[{cs:tres,k:'T',len:3}];
 const G={...p.patch,hands:[p.patch.hands[0].slice(3),...p.patch.hands.slice(1)],staged};
 const q=localPatch(m,G);assert.equal(q.patch.hands[0].length,p.patch.hands[0].length-3);
 assert.equal(q.patch.staged.length,1);
 // si ya no es tu turno, se descartan
 S.turn=(seat+1)%2;core.broadcast();const r=localPatch(c.last('state'),G);assert.equal(r.patch.staged.length,0);assert.equal(r.patch.hands[0].length,13)});

test('los eventos de otros jugadores llegan con índice local',()=>{
 const{core,cs}=sala(2,3);const m=cs[0].last('state');
 const q=localPatch({...m,events:[{e:'discard',seat:(m.seat+1)%3,card:{id:1,s:0,r:5}}]},{});
 assert.equal(q.events[0].p,1)});
