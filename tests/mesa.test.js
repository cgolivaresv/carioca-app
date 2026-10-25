// Mesas de 2 a 5 jugadores: reparto, turnos y guardado
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkDeck,CON,pts} from '../src/engine.js';
import {botPlay} from '../src/bots.js';
import {pickBots} from '../src/roster.js';
import {validSave} from '../src/safe.js';

const seats=(n,f)=>Array.from({length:n},f);
function mesa(n,round){const d=mkDeck();return{round,hands:seats(n,()=>d.splice(0,12)),deck:d,disc:[d.pop()],down:seats(n,()=>0),melds:seats(n,()=>[]),taken:seats(n,()=>[]),reshuf:0}}

for(const n of [2,3,4,5])test(`${n} jugadores: el mazo alcanza para repartir y jugar`,()=>{
 for(let round=0;round<10;round++){const S=mesa(n,round);
  assert.equal(S.deck.length+S.disc.length+S.hands.flat().length,108);
  let p=round%n,fin=false;
  for(let t=0;t<600&&!fin&&S.reshuf<2;t++){const r=botPlay(S,p);if(r.out)fin=true;p=(p+1)%n}
  const ids=new Set([...S.deck,...S.disc,...S.hands.flat(),...S.melds.flat().flatMap(m=>m.cs)].map(c=>c.id));
  assert.equal(ids.size,108,'ninguna carta se pierde ni se duplica');
  S.hands.forEach(h=>assert.ok(h.reduce((a,c)=>a+pts(c.r),0)>=0))}});

test('pickBots entrega la cantidad pedida, sin repetir ni usar el avatar del jugador',()=>{
 for(const k of [1,2,3,4]){const b=pickBots('Aleatoria',3,k);
  assert.equal(b.length,k+1);assert.equal(b[0],null);
  const ids=b.slice(1).map(x=>x.id);assert.equal(new Set(ids).size,k);assert.ok(!ids.includes(3))}});

test('validSave acepta mesas de 2 a 5 y rechaza largos incoherentes',()=>{
 for(const n of [2,3,4,5]){const S=mesa(n,0),sv={...S,v:1,phase:'bots',pend:n-1,scores:[seats(n,()=>5)],staged:[]};
  assert.ok(validSave(sv),`n=${n}`);
  assert.ok(!validSave({...sv,pend:n}),'pend fuera de rango');
  assert.ok(!validSave({...sv,down:[...sv.down,0]}),'down largo');
  assert.ok(!validSave({...sv,scores:[[1]]}),'puntaje corto')}
 const S=mesa(6,0);assert.ok(!validSave({...S,v:1,phase:'draw',scores:[]}),'6 jugadores');
 const U=mesa(1,0);assert.ok(!validSave({...U,v:1,phase:'draw',scores:[]}),'1 jugador')});
