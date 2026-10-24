import test from 'node:test';
import assert from 'node:assert/strict';
import {mkDeck,classify,meets,gen,solve,sides,put,CON,desc,pts} from '../src/engine.js';
let id=1000;const mk=(r,s=0)=>({id:id++,r,s}),J=()=>mk(0,-1);
const kind=cs=>classify(cs)?.k??null;
test('mazo: 108 cartas con 4 comodines',()=>{const d=mkDeck();assert.equal(d.length,108);assert.equal(d.filter(c=>!c.r).length,4);assert.equal(new Set(d.map(c=>c.id)).size,108)});
test('tríos',()=>{assert.equal(kind([mk(13),mk(13,1),mk(13,2)]),'T');assert.equal(kind([mk(13),mk(13,1),J()]),'T');assert.equal(kind([mk(13),J(),J()]),null)});
test('escalas normales y circulares',()=>{
 assert.equal(kind([10,11,12,13].map(r=>mk(r))),'E');
 assert.equal(kind([12,13,1,2].map(r=>mk(r))),'E');
 assert.equal(kind([13,1,2,3].map(r=>mk(r))),'E');
 assert.equal(kind([12,13,3,4].map(r=>mk(r))),null);
 assert.equal(kind([5,6,7,8].map((r,i)=>mk(r,i%2))),null)});
test('escala sucia y real',()=>{
 const real=[...Array(13)].map((_,i)=>mk(i+1,2)),suc=real.map((c,i)=>mk(c.r,i%4)),conJ=real.map((c,i)=>i==4?J():c);
 assert.equal(kind(real),'R');assert.equal(kind(suc),'S');assert.equal(kind(conJ),'S');
 assert.equal(meets([classify(suc)],[-1]),true);assert.equal(meets([classify(suc)],[-2]),false);
 assert.equal(meets([classify(real)],[-2]),true);
 assert.equal(kind([...suc.slice(0,12),mk(5)]),null)});
test('contratos',()=>{assert.equal(CON.length,10);assert.equal(desc(CON[9]),'escala real');
 const m=[classify([mk(5),mk(5,1),mk(5,2)]),classify([mk(9),mk(9,1),mk(9,2)])];
 assert.equal(meets(m,[0,0]),true);assert.equal(meets(m,[0,0,0]),false)});
test('pegar comodín: el jugador elige extremo',()=>{
 const m=classify([5,6,7,8].map(r=>mk(r,1)),5);
 assert.deepEqual(sides(m,J()).sort(),['e','s']);assert.deepEqual(sides(m,mk(9,1)),['e']);assert.deepEqual(sides(m,mk(4,1)),['s']);
 put(m,J(),'s');assert.equal(m.st,4);assert.equal(m.len,5)});
test('pegar cruzando la A',()=>{
 const m=classify([12,13,1,2].map(r=>mk(r)));assert.deepEqual(sides(m,mk(3)),['e']);put(m,mk(3),'e');assert.equal(m.len,5)});
test('solucionador de los bots',()=>{
 assert.ok(solve([mk(3),mk(3,1),mk(3,2),mk(8),mk(8,1),mk(8,2),mk(1)],[0,0]));
 assert.equal(solve([mk(3),mk(3,1),mk(8)],[0,0]),null);
 assert.ok(solve([...Array(13)].map((_,i)=>mk(i+1,3)),[-2]));
 assert.equal(pts(0),25)});

test('escala de 13 cartas admite palos mezclados, pero exige rangos únicos',()=>{
 const dirty=[...Array(13)].map((_,i)=>mk(i+1,i%4));
 assert.equal(classify(dirty).k,'S');
 const duplicate=[...dirty.slice(0,12),mk(12,3)];
 assert.equal(classify(duplicate),null);
});

test('contrato de escala sucia acepta escala real como variante válida',()=>{
 const real=classify([...Array(13)].map((_,i)=>mk(i+1,2)));
 assert.equal(meets([real],[-1]),true);
});
