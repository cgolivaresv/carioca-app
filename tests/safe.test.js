import test from 'node:test';
import assert from 'node:assert/strict';
import {esc,validSave} from '../src/safe.js';
import {mkDeck,classify} from '../src/engine.js';

// Una partida guardada realista, pasada por JSON como hace localStorage
const guardada=(extra={})=>{const d=mkDeck();
 const S={v:1,round:0,scores:[],phase:'draw',hands:[0,1,2].map(()=>d.splice(0,12)),deck:d,disc:[d.pop()],down:[0,0,0],taken:[[],[],[]],melds:[[],[],[]],staged:[],log:[],...extra};
 return JSON.parse(JSON.stringify(S))};

test('esc neutraliza HTML en nombres',()=>{
 assert.equal(esc('<img src=x onerror=1>'),'&lt;img src=x onerror=1&gt;');
 assert.equal(esc(`a&b"c'd`),'a&amp;b&quot;c&#39;d');
 assert.equal(esc('Valentina'),'Valentina');
 assert.equal(esc(null),'');
 assert.equal(esc(12),'12')});

test('una partida guardada válida se acepta',()=>{
 assert.equal(validSave(guardada()),true);
 const m=classify([1,2,3,4].map((r,i)=>({id:900+i,r,s:0})));
 assert.equal(validSave(guardada({phase:'play',melds:[[JSON.parse(JSON.stringify(m))],[],[]],scores:[[10,20,30]]})),true)});

test('una partida guardada en turno de bots necesita saber quién sigue',()=>{
 assert.equal(validSave(guardada({phase:'bots',pend:2})),true);
 assert.equal(validSave(guardada({phase:'bots'})),false);
 assert.equal(validSave(guardada({phase:'bots',pend:3})),false)});

test('guardados corruptos se rechazan',()=>{
 assert.equal(validSave(null),false);
 assert.equal(validSave('x'),false);
 assert.equal(validSave(guardada({v:2})),false);
 assert.equal(validSave(guardada({round:10})),false);
 assert.equal(validSave(guardada({phase:'otra'})),false);
 assert.equal(validSave(guardada({hands:[[],[]]})),false);
 assert.equal(validSave(guardada({melds:undefined})),false);
 assert.equal(validSave(guardada({scores:[[1,2]]})),false);
 const s=guardada();s.hands[0][0].r=99;assert.equal(validSave(s),false);
 const t=guardada();t.deck.push(null);assert.equal(validSave(t),false)});
