import test from 'node:test';
import assert from 'node:assert/strict';
import {botPlay,deckDraw,value,effort,thinkTime} from '../src/bots.js';
import {mkDeck,classify} from '../src/engine.js';
let id=5000;const mk=(r,s=0)=>({id:id++,r,s});
const estado=(round,hand,extra={})=>{const d=mkDeck();return{round,hands:[hand,d.splice(0,12),d.splice(0,12)],deck:d,disc:[d.pop()],down:[0,0,0],melds:[[],[],[]],taken:[[],[],[]],reshuf:0,...extra}};
test('el bot se baja cuando cumple el contrato',()=>{
 const h=[mk(3),mk(3,1),mk(3,2),mk(9),mk(9,1),mk(9,2),mk(1),mk(5,3),mk(7,2),mk(12),mk(13,1),mk(11,3)];
 const S=estado(0,h);const r=botPlay(S,0);assert.equal(S.down[0],1);assert.equal(S.melds[0].length,2);assert.ok(r.discard||r.out)});
test('el bot nunca descarta un comodín si tiene otras cartas',()=>{
 for(let i=0;i<30;i++){const S=estado(3,[mk(0,-1),mk(2),mk(4,1),mk(6,2),mk(8,3),mk(10),mk(12,1),mk(1,2),mk(3,3),mk(5),mk(7,1),mk(9,2)]);const r=botPlay(S,0);if(r.discard)assert.ok(r.discard.r!==0)}});
test('más cartas útiles = mayor valor',()=>{
 const hid=()=>2,req=[0,0],a=[mk(4),mk(4,1),mk(9),mk(9,1),mk(2),mk(6,2)],b=[mk(4),mk(4,1),mk(4,2),mk(9),mk(9,1),mk(6,2)];
 assert.ok(value(b,req,hid)>value(a,req,hid))});
test('el mazo se rebaraja y cuenta las veces',()=>{const S=estado(0,[]);S.deck=[];S.disc=[mk(1),mk(2),mk(3)];assert.ok(deckDraw(S));assert.equal(S.reshuf,1)});
test('sin cartas para robar: deckDraw devuelve undefined y el bot no rompe el turno',()=>{
 const S=estado(0,[mk(2),mk(4,1),mk(6,2),mk(8,3),mk(10),mk(12,1),mk(1,2),mk(3,3),mk(5),mk(7,1),mk(9,2),mk(11)]);
 S.deck=[];S.disc=[mk(13)];
 assert.equal(deckDraw({deck:[],disc:[mk(5)],reshuf:0}),undefined);
 const r=botPlay(S,0,()=>{},{danger:5,spec:0});
 assert.equal(!!r.drew,false); // la app lo usa para terminar la ronda
 assert.equal(S.hands[0].length,12)});
test('el bot no ve cartas ocultas: juega igual con cualquier mazo',()=>{
 const S=estado(0,[mk(3),mk(3,1),mk(9),mk(9,1),mk(1),mk(5,3),mk(7,2),mk(12),mk(13,1),mk(11,3),mk(2,2),mk(8)]);
 const n=S.hands[0].length;botPlay(S,0);assert.equal(S.hands[0].length,n)});
test('al bajarse el bot no pega cartas ese mismo turno',()=>{
 const h=[mk(3),mk(3,1),mk(3,2),mk(3,3),mk(9),mk(9,1),mk(9,2),mk(1),mk(5,3),mk(7,2),mk(12),mk(13,1)];
 const S=estado(0,h);S.disc=[mk(2,3)];botPlay(S,0);
 assert.equal(S.down[0],1);assert.ok(S.melds[0].every(m=>m.len==3));assert.ok(S.hands[0].some(c=>c.r==3||c.r==9))});
test('el bot informa si robó del mazo o del descarte',()=>{
 for(let i=0;i<20;i++){const S=estado(1,[mk(2),mk(4,1),mk(6,2),mk(8,3),mk(10),mk(12,1),mk(1,2),mk(3,3),mk(5),mk(7,1),mk(9,2),mk(11)]);
  const r=botPlay(S,0);assert.ok(r.drew=='deck'||r.drew=='disc');assert.equal(!!r.drewCard,r.drew=='disc');assert.equal(typeof r.laid,'boolean')}});

test('effort: más alto cuando puede bajarse que con una mano sin juego, y siempre entre 0 y 1',()=>{
 const lista=[mk(3),mk(3,1),mk(3,2),mk(9),mk(9,1),mk(9,2),mk(1),mk(5,3),mk(7,2),mk(12),mk(13,1),mk(11,3)];
 const suelta=[mk(2),mk(4,1),mk(6,2),mk(8,3),mk(10),mk(12,1),mk(1,2),mk(3,3),mk(5),mk(7,1),mk(9,2),mk(11)];
 const a=estado(0,lista),b=estado(0,suelta);
 a.disc=[mk(2,3)];b.disc=[mk(13,3)];
 const ea=effort(a,0),eb=effort(b,0);
 assert.ok(ea>eb,`${ea} deberia ser > ${eb}`);
 for(const e of [ea,eb])assert.ok(e>=0&&e<=1)});
test('effort: ya bajado es una jugada rápida, salvo con pocas cartas',()=>{
 const S=estado(0,[mk(2),mk(4,1),mk(6,2),mk(8,3),mk(10),mk(12,1)]);S.down[0]=1;
 assert.equal(effort(S,0),.2);
 const T=estado(0,[mk(2),mk(4,1),mk(6,2)]);T.down[0]=1;
 assert.equal(effort(T,0),.5)});
test('effort no modifica el estado',()=>{
 const S=estado(0,[mk(3),mk(3,1),mk(9),mk(9,1),mk(1),mk(5,3),mk(7,2),mk(12),mk(13,1),mk(11,3),mk(2,2),mk(8)]);
 const antes=JSON.stringify(S);effort(S,0);assert.equal(JSON.stringify(S),antes)});
test('thinkTime: nunca pasa del máximo, nunca baja de 1,5 s y las jugadas difíciles tardan más',()=>{
 for(const max of [7000,10000,15000,20000])for(let i=0;i<500;i++)for(const e of [0,.2,.6,1]){
  const t=thinkTime(e,max);assert.ok(t>=1500&&t<=max,`${t} fuera de rango para max ${max}`)}
 const fijo=()=>.5; // sin duda y sin variación
 assert.ok(thinkTime(.9,7000,fijo)>thinkTime(.1,7000,fijo));
 assert.equal(thinkTime(.1,7000,()=>0),7000)}); // el turno "indeciso" dura el máximo
test('thinkTime: 1 de cada 5 turnos aproximadamente tarda el máximo',()=>{
 let tope=0,N=5000;for(let i=0;i<N;i++)if(thinkTime(.5,7000)==7000)tope++;
 assert.ok(tope/N>.15&&tope/N<.25,`proporcion ${tope/N}`)});
