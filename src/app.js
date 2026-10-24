import {botPlay,deckDraw} from './bots.js';
import {SU,RK,pts,CON,desc,shuf,mkDeck,classify,meets,gen,solve,rm,sides,put} from './engine.js';
import {unlock,play,setMuted,isMuted} from './audio.js';
import {JOKER} from './joker.js';
import {ROSTER,LEVELS,bustOf,roundOf,pickBots} from './roster.js';
import {phrase} from './lines.js';
const NM=['Tú','Ana','Beto'];
// Fija los dos rivales de la partida (G.bots guarda solo el id del roster y el nivel)
function setMe(){NM[0]=PN;G.meId=ME;G.meName=PN}
function setBots(bs){G.bots=bs;NM[1]=ROSTER[bs[1].id].name;NM[2]=ROSTER[bs[2].id].name}
const sleep=t=>new Promise(r=>setTimeout(r,t));
let G={round:0,scores:[],sort:true,log:[]};
const reqOf=()=>[...CON[G.round]].sort((a,b)=>b-a);
const log=t=>{G.log.unshift(t);G.log=G.log.slice(0,4)};
const drawDeck=()=>deckDraw(G);
function start(){const d=mkDeck();G.hands=[0,1,2].map(()=>d.splice(0,12));G.deck=d;G.disc=[d.pop()];
 G.down=[0,0,0];G.taken=[[],[],[]];G.reshuf=0;G.justDown=0;G.melds=[[],[],[]];G.staged=[];G.sel=new Set();G.phase='draw';G.log=[];G.dealAnim=1;G.win=null;play('deal');G.peek=0;G.showScore=0;G.msg='Tu turno: roba del mazo o del descarte.';
 const st=G.round%3;if(st){G.phase='bots';G.turn=(st+2)%3;G.msg='';render();advance()}else{startTurn();render()}}
async function advance(){stopTurn();G.phase='bots';G.turn=(G.turn+1)%3;
 while(G.turn!=0){const p=G.turn;G.thinking=true;G.say=phrase(G,p);G.thinkStart=Date.now();render();await sleep(THINK);G.thinking=false;
  const top0=G.disc[G.disc.length-1],dk0=G.deck.length,r=botMove(p);if(G.phase=='roundEnd')return;if(G.reshuf>=2){endRound(-1);return}
  G.vis={top:top0,deck:dk0};G.note={p,kind:r.drew,card:r.drewCard};G.fly={p,src:r.drew,card:r.drewCard};play(r.drew=='disc'?'flip':'draw');render();await sleep(1300);
  G.vis=null;G.dropId=r.discard&&r.discard.id;G.note=r.laid?{p,kind:'lay'}:null;if(r.laid)play('down');setTimeout(()=>play('discard'),r.laid?450:0);render();await sleep(1300);G.turn=(G.turn+1)%3}
 G.note=null;G.phase='draw';G.msg='Tu turno: roba del mazo o del descarte.';startTurn();play('turn');render()}
function attach(p,c){for(const pl of G.melds)for(const m of pl){const s=sides(m,c);if(s.length){put(m,c,s[0]);return true}}return false}
function botMove(p){const r=botPlay(G,p,(q,m,c)=>log(NM[q]+' '+m+(c?' '+cn(c):'')),LEVELS[G.bots[p].lvl]);if(r.out){if(r.discard)G.dropId=r.discard.id;endRound(p)}return r}
const attachTry=c=>attach(0,c);
function endRound(w){stopTurn();const row=G.hands.map(h=>h.reduce((a,c)=>a+pts(c.r),0));G.scores.push(row);G.phase='roundEnd';G.win=w;if(G.round==9)finish();if(w==0)play('win');else if(w>0)play('lose');
 G.msg=w<0?'Se acabó el mazo: nadie salió. Se cuentan las cartas en mano.':(w?NM[w]+' se queda':'Te quedas')+' sin cartas y gana la ronda.';render()}
const cn=c=>c.r?RK[c.r]+SU[c.s]:'🃏';
const me=()=>G.phase=='play'&&G.turn==0;
function sel(id){if(!me())return;play('select');G.choose=null;G.sel.has(id)?G.sel.delete(id):G.sel.add(id);render()}
function take(deck){if(G.phase!='draw')return;unlock();play(deck?'draw':'flip');const c=deck?drawDeck():G.disc.pop();if(!deck)G.taken[0].push(c);G.drawn=c.id;G.justDown=0;G.hands[0].push(c);G.fresh=new Set([c.id]);G.phase='play';G.turn=0;G.msg='Arma combinaciones, pega cartas o descarta una.';render()}
const picked=()=>G.hands[0].filter(c=>G.sel.has(c.id));
function armar(){if(!me()||G.down[0])return;const m=classify(picked());
 if(!m){play('error');G.msg='Inválida: trío = mismo número (3+); escala = mismo palo consecutivo (4+); comodines menos que naturales.';return render()}
 play('lay');G.hands[0]=rm(G.hands[0],m.cs);G.staged.push(m);G.sel=new Set();G.msg='Combinación lista. Cuando tengas el contrato, pulsa Bajarme.';render()}
function deshacer(){G.staged.forEach(m=>G.hands[0].push(...m.cs));G.staged=[];render()}
function bajar(){if(!me()||G.down[0])return;const p=picked();
 if(p.length){const m=classify(p);
  if(m){G.hands[0]=rm(G.hands[0],m.cs);G.staged.push(m);G.sel=new Set()}
  else if(!G.staged.length){const s=solve(p,reqOf());if(s){s.forEach(x=>G.hands[0]=rm(G.hands[0],x));G.staged=s.map(m=>classify(m,m.st0));G.sel=new Set()}}}
 if(!meets(G.staged,CON[G.round])){play('error');G.msg='Aún no cumples el contrato ('+desc(CON[G.round])+'). Llevas '+G.staged.length+' combinación(es) armada(s).';return render()}
 play('down');G.melds[0]=G.staged;G.staged=[];G.down[0]=1;log('Te bajaste');G.justDown=1;G.msg='¡Bajado! Para terminar tu jugada, descarta una carta. Podrás pegar cartas desde tu próximo turno.';if(!G.hands[0].length)return endRound(0);render()}
function pegar(p,i){if(!me()||!G.down[0])return;if(G.justDown){G.msg='No puedes pegar cartas en el turno en que te bajas: descarta para terminar tu jugada.';return render()}if(picked().length!=1)return;const c=picked()[0],m=G.melds[p][i],s=sides(m,c);
 if(!s.length){G.msg='Esa carta no encaja ahí.';return render()}
 if(s.length>1&&!c.r){G.choose={p,i,id:c.id};G.msg='';return render()}
 doPut(p,i,c,s[0])}
function doPut(p,i,c,sd){play('lay');put(G.melds[p][i],c,sd);G.hands[0]=rm(G.hands[0],[c]);G.sel=new Set();G.choose=null;if(!G.hands[0].length)return endRound(0);render()}
function elegir(sd){const x=G.choose;doPut(x.p,x.i,G.hands[0].find(c=>c.id==x.id),sd)}
function chooser(){const m=G.melds[G.choose.p][G.choose.i],e=(m.st+m.len-2)%13+1;
 return `<div class="box row"><span>Comodín en la escala (${RK[m.st]} … ${RK[e]}): ¿dónde va?</span><button class="b" onclick="elegir('s')">Al inicio</button><button class="b" onclick="elegir('e')">Al final</button><button class="b g" onclick="cancelar()">Cancelar</button></div>`}
function descartar(){if(!me())return;if(G.staged.length){G.msg='Tienes combinaciones sin bajar (Deshacer o Bajarme).';return render()}
 const p=picked();if(p.length!=1){play('error');G.msg='Elige 1 carta para descartar.';return render()}
 play('discard');G.hands[0]=rm(G.hands[0],p);G.disc.push(p[0]);G.dropId=p[0].id;G.justDown=0;G.sel=new Set();if(!G.hands[0].length)return endRound(0);if(G.reshuf>=2)return endRound(-1);advance()}
function next(){if(G.round==9){G={round:0,scores:[],sort:true,log:[]};setBots(pickBots(DIFF,ME));setMe()}else G.round++;start()}
// Disposición clásica de las pintas (x, y en %) como en un mazo Bicycle
const PIPS={2:[[50,22],[50,78]],3:[[50,22],[50,50],[50,78]],4:[[36,22],[64,22],[36,78],[64,78]],5:[[36,22],[64,22],[50,50],[36,78],[64,78]],6:[[36,22],[64,22],[36,50],[64,50],[36,78],[64,78]],7:[[36,22],[64,22],[50,36],[36,50],[64,50],[36,78],[64,78]],8:[[36,22],[64,22],[50,36],[36,50],[64,50],[50,64],[36,78],[64,78]],9:[[36,22],[64,22],[36,40],[64,40],[50,50],[36,60],[64,60],[36,78],[64,78]],10:[[36,22],[64,22],[50,30],[36,40],[64,40],[36,60],[64,60],[50,70],[36,78],[64,78]]};
const pipsOf=(r,s)=>r==1?`<span class="big">${s}</span>`:r>=11?`<span class="fc"><b>${RK[r]}</b><u>${s}</u></span>`:(PIPS[r]||[]).map(([x,y])=>`<span class="pp${y>50?' f':''}" style="left:${x}%;top:${y}%">${s}</span>`).join('');
const card=(c,x='',d=0)=>{const r=RK[c.r],s=SU[c.s],cl=x.split(' '),sm=cl.includes('sm'),label=c.r?`${r} de ${({'♠':'picas','♥':'corazones','♦':'diamantes','♣':'tréboles'})[s]}`:'comodín';
 const inner=sm?(c.r?`<span class="t">${r}<br>${s}</span><span class="ct">${s}</span><span class="t b">${r}<br>${s}</span>`:`<span class="jk">${JOKER}</span>`)
  :(c.r?`<span class="ix${c.r==10?' t10':''}">${r}<i>${s}</i></span>${pipsOf(c.r,s)}<span class="ix b${c.r==10?' t10':''}">${r}<i>${s}</i></span>`:`<span class="jk">${JOKER}</span>`);
 return `<button type="button" class="c k${c.s} ${x}" data-id="${c.id}" aria-label="${label}" aria-pressed="${cl.includes('s')}"${d?` style="animation-delay:${d}ms"`:''}>${inner}</button>`};
const small=c=>card(c,'sm').replace('<button','<span').replace('</button>','</span>');
const mel=(p,list)=>list.map((m,i)=>`<div class="m" onclick="pegar(${p},${i})">${m.cs.map(small).join('')}</div>`).join('');
let THINK=(()=>{try{return +localStorage.getItem('carioca:think')||6000}catch(e){return 6000}})();
function setThink(s){THINK=s*1000;try{localStorage.setItem('carioca:think',THINK)}catch(e){}render()}
const thinkChips=()=>`<div class="row" style="margin-top:8px"><span class="chip2">Tiempo de los bots:</span>${[2,4,6,10].map(s=>`<button class="chip ${THINK==s*1000?'on':''}" onclick="setThink(${s})">${s} s</button>`).join('')}</div>`;
function flyEl(){const f=G.fly,st=`--dx:${f.p==1?-110:110}px;--sx:${f.src=='disc'?34:-34}px`;
 return f.src=='disc'?card(f.card,'sm fly face').replace('<button','<button style="'+st+'"'):`<i class="fly" style="${st}"></i>`}
function toast(){const n=G.note,nm=NM[n.p];
 return `<div class="toast">${n.kind=='deck'?`<i class="mini"></i><span>${nm} robó una carta del <b>mazo</b></span>`:n.kind=='disc'?`${small(n.card)}<span>${nm} tomó del <b>descarte</b></span>`:`<span>✅ ${nm} se <b>bajó</b></span>`}</div>`}
let TURN=(()=>{try{const v=localStorage.getItem('carioca:turn');return v==null?20000:+v}catch(e){return 20000}})(),tt=0;
const inTurn=()=>G.phase=='draw'||G.phase=='play';
function startTurn(){clearTimeout(tt);if(TURN>0&&inTurn()){G.turnStart=Date.now();tt=setTimeout(timeUp,TURN)}else G.turnStart=null}
function stopTurn(){clearTimeout(tt);G.turnStart=null}
// Tiempo agotado: roba del mazo si no había robado, devuelve las combinaciones sin bajar y descarta (la carta robada o la de más puntos)
function timeUp(){if(!inTurn()||G.showScore)return;
 if(G.phase=='draw')take(1);
 if(G.staged.length)deshacer();
 const h=G.hands[0];let w=h.find(c=>c.id==G.drawn);
 if(!w||(!w.r&&h.length>1))w=[...h].filter(c=>c.r).sort((x,y)=>pts(y.r)-pts(x.r))[0]||h[0];
 G.choose=null;G.sel=new Set([w.id]);G.msg='⏰ Se acabó tu tiempo: jugada automática.';descartar()}
function setTurn(s){TURN=s*1000;try{localStorage.setItem('carioca:turn',TURN)}catch(e){}if(G.showScore)G.left=TURN||null;else startTurn();render()}
const turnChips=()=>`<div class="row" style="margin-top:8px"><span class="chip2">Tu tiempo por turno:</span>${[[15,'15 s'],[20,'20 s'],[30,'30 s'],[0,'Sin límite']].map(([s,l])=>`<button class="chip ${TURN==s*1000?'on':''}" onclick="setTurn(${s})">${l}</button>`).join('')}</div>`;
function toggleScore(){G.showScore=!G.showScore;
 if(inTurn()){if(G.showScore){clearTimeout(tt);G.left=G.turnStart?Math.max(0,TURN-(Date.now()-G.turnStart)):null}
  else if(TURN>0){const l=G.left??TURN;G.turnStart=Date.now()-(TURN-l);tt=setTimeout(timeUp,l)}else G.turnStart=null}
 render()}
let lastTick=0;
setInterval(()=>{const e=document.getElementById('tt');if(e&&G.turnStart&&!G.showScore){const s=Math.max(0,Math.ceil((TURN-(Date.now()-G.turnStart))/1000));e.textContent=s;if(s>0&&s<=5&&s!=lastTick){lastTick=s;play('tick')}}},250);
const tots=()=>[0,1,2].map(i=>G.scores.reduce((a,r)=>a+r[i],0));
function plate(p){const tm=p==0&&TURN>0&&G.turnStart&&inTurn(),el=G.showScore&&G.left!=null?TURN-G.left:Date.now()-G.turnStart,secs=Math.max(0,Math.ceil((TURN-el)/1000)),tot=tots()[p],act=p?(G.phase=='bots'&&G.turn==p):(G.phase=='draw'||G.phase=='play'),dealer=(G.round+2)%3==p,
 say=p?(G.log.find(l=>l.startsWith(NM[p]))||'').slice(NM[p].length+1):'';
 const wl=G.phase=='roundEnd'&&G.win!=null&&G.win>=0?`<em class="wl ${G.win==p?'win':'lose'}">${G.win==p?'Gana':'Pierde'}</em>`:'';
 const bub=p?(act&&G.thinking?`<div class="bubble talk">${G.say||''}<span class="dots"><i></i><i></i><i></i></span></div>`:say?`<div class="bubble say">${say}</div>`:''):'';
 return `<div class="seat"><div class="av ${act?'turn':''} ${p&&act&&G.thinking?'th':''}" style="--ac2:${COL[p]}">${AVT()[p]}${dealer?'<i class="dlr">D</i>':''}</div>${bub}<div class="plate"><b>${NM[p]}</b><span>${G.hands[p].length} cartas · ${tot} pts${tm?` · <b class="tt" id="tt">${secs}</b> s`:''}</span>${wl}${p&&act&&G.thinking?`<u class="bar" style="animation:tbar ${THINK}ms linear forwards;animation-delay:-${Date.now()-G.thinkStart}ms"></u>`:''}${tm?`<u class="bar" style="animation:tbar ${TURN}ms linear forwards,tcol ${TURN}ms linear forwards;animation-delay:-${el}ms,-${el}ms"></u>`:''}</div></div>`}
function peek(){G.peek=1;G.showScore=0;render()}
// FLIP: guarda dónde estaban las cartas de la mano para que se deslicen suavemente a su nuevo sitio
function flipBefore(){const m=new Map();if(G.flip)document.querySelectorAll('#hand .c').forEach(el=>m.set(el.dataset.id,el.getBoundingClientRect()));G.flip=0;return m}
function flipAfter(m){if(!m.size)return;document.querySelectorAll('#hand .c').forEach(el=>{const o=m.get(el.dataset.id);if(!o)return;const n=el.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;
 if(Math.abs(dx)<1&&Math.abs(dy)<1)return;el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;el.getBoundingClientRect();
 el.style.transition='transform .34s cubic-bezier(.2,.8,.25,1)';el.style.transform='';setTimeout(()=>{el.style.transition=''},380)})}
// Ajusta el solapamiento de la mano midiendo el ancho real de las cartas y del contenedor
function fitHand(){const hd=document.getElementById('hand');if(!hd)return;const cs=hd.children,n=cs.length;if(n<2)return;
 const cw=cs[0].offsetWidth,avail=hd.clientWidth-4;hd.style.setProperty('--ov',Math.min(cw-14,Math.max(0,(n*cw-avail)/(n-1))).toFixed(1)+'px')}
function render(){
 const flipPrev=flipBefore();
 const h=G.hands[0],tot=tots(),end=G.phase=='roundEnd',fin=end&&G.round==9,top=G.vis?G.vis.top:G.disc[G.disc.length-1],can=G.phase=='draw',mine=me();
 const W=typeof innerWidth=='number'?innerWidth:400,avail=Math.min(W,560)-30,n=h.length,cw=W<=390?44:52,ov=n>1?Math.min(cw-14,Math.max(0,Math.round((n*cw-avail)/(n-1)))):0;
 const hint=G.round>7?' · '+['A–K, cualquier palo, con comodines','A–K de un solo palo, sin comodines'][G.round-8]:'';
 const t=`<table><tr><th>#</th><th>Contrato</th>${NM.map(x=>`<th>${x}</th>`).join('')}</tr>`+G.scores.map((r,i)=>`<tr><td>${i+1}</td><td>${desc(CON[i])}</td>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')+`<tfoot><tr><td></td><td>Total</td>${tot.map(x=>`<td>${x}</td>`).join('')}</tr></tfoot></table>`;
 const btn=(c,f,l,on)=>`<button class="act ${c}" ${on?'':'disabled'} onclick="${f}()">${l}</button>`;
 const bar=end?btn('go','next',fin?'Jugar de nuevo':'Siguiente ronda',1):btn('gh','deshacer','Deshacer',mine&&G.staged.length)+btn('blue','armar','Armar',mine&&!G.down[0])+btn('go','bajar','Bajarme',mine&&!G.down[0])+btn('red','descartar','Descartar',mine);
 const modal=G.showScore||(end&&!G.peek)?`<div class="modal"><div class="sheet"><h3>${fin?(tot.filter(x=>x===Math.min(...tot)).length>1?'Fin del juego · empate': 'Fin del juego · gana '+NM[tot.indexOf(Math.min(...tot))]):end?G.msg:'Puntaje'}</h3>${t}${statsBox()}${turnChips()}${thinkChips()}<div class="row">${end?btn('go','next',fin?'Jugar de nuevo':'Siguiente ronda',1)+`<button class="chip" onclick="peek()">Ver mesa</button>`:`<button class="act go" onclick="toggleScore()">Cerrar</button>`}</div></div></div>`:'';
 document.getElementById('app').innerHTML=`<div class="hud"><button class="rbtn" onclick="toggleScore()" aria-label="Puntaje">☰</button><div class="contract"><small>Ronda ${G.round+1} de 10</small><b>${desc(CON[G.round])}${hint}</b></div><button class="rbtn" onclick="toggleSound()" aria-label="${isMuted()?'Activar sonido':'Silenciar'}">${isMuted()?'🔇':'🔊'}</button></div>
 <div class="table">${G.fly?flyEl():''}${G.note?toast():''}<div class="seats">${plate(1)}${plate(2)}</div>
 <div class="melds2">${[1,2].map(p=>`<div class="mz">${mel(p,G.melds[p])}</div>`).join('')}</div>
 <div class="center"><div class="piles"><div class="pile ${can?'can':''} ${G.note&&G.note.kind=='deck'?'src':''}" onclick="take(1)"><div class="c back"><span class="cnt">${G.vis?G.vis.deck:G.deck.length}</span></div><small>MAZO</small></div><div class="pile ${can?'can':''} ${G.note&&G.note.kind=='disc'?'src':''}" onclick="take(0)">${top?card(top,G.dropId==top.id?'drop':''):'<div class="c"></div>'}<small>DESCARTE</small></div></div><div class="msgpill">${G.msg||G.log[0]||'…'}</div></div>
 <div class="mine"><div class="mz">${mel(0,G.melds[0])}${G.staged.map(m=>`<div class="m st">${m.cs.map(small).join('')}</div>`).join('')}</div></div></div>
 <div class="hero">${plate(0)}</div>${G.choose?chooser():''}
 <div id="hand" class="hand" style="--ov:${ov}px">${h.map((c,i)=>card(c,(G.sel.has(c.id)?'s ':'')+(G.dealAnim||G.fresh&&G.fresh.has(c.id)?'deal':''),G.dealAnim?i*50:0)).join('')}</div>
 <div class="tools"><button class="chip" onclick="ordenar('p')">♠ Por palo</button><button class="chip" onclick="ordenar('n')">A Por número</button></div>
 <div class="bar2">${bar}</div>${modal}`;
 fitHand();setupDrag();flipAfter(flipPrev);persist();G.dealAnim=0;G.fresh=null;G.dropId=null;G.fly=null}

function ordenar(m){G.flip=1;play('flip');G.hands[0].sort((a,b)=>!a.r-!b.r||(m=='p'?a.s-b.s||a.r-b.r:a.r-b.r||a.s-b.s));render()}
let ME=(()=>{try{const r=localStorage.getItem('carioca:avatar'),v=+r;return r!==null&&v>=0&&v<ROSTER.length?v:7}catch(e){return 7}})();
let PN=(()=>{try{return (localStorage.getItem('carioca:name')||'').trim().slice(0,12)||'Tú'}catch(e){return 'Tú'}})();
const DIFF='Aleatoria'; // los rivales siempre tienen un nivel al azar, que no se muestra
const AVT=()=>[bustOf(ME),bustOf(G.bots[1].id),bustOf(G.bots[2].id)],COL=['#3aa0ff','#e0709a','#e69a3c'];
function toggleSound(){unlock();setMuted(!isMuted());play('click');if(G.hands)render()}
function setupDrag(){document.querySelectorAll('#hand .c').forEach(el=>{el.style.touchAction='none';
 el.onpointerdown=e=>{const id=+el.dataset.id,x0=e.clientX,y0=e.clientY;let drag=false,lx=x0,lt=performance.now(),rot=0;el.setPointerCapture(e.pointerId);
  el.onpointermove=ev=>{const dx=ev.clientX-x0,dy=ev.clientY-y0;
   if(!drag&&Math.hypot(dx,dy)>8){drag=true;el.classList.add('dragging');play('flip')}
   if(drag){const now=performance.now(),v=(ev.clientX-lx)/Math.max(8,now-lt);lx=ev.clientX;lt=now;rot+=(Math.max(-12,Math.min(12,v*8))-rot)*.25;
    el.style.transform=`translate(${dx}px,${dy}px) scale(1.1) rotate(${rot.toFixed(1)}deg)`}};
  el.onpointercancel=()=>{el.onpointermove=null;el.onpointerup=null;G.flip=1;render()};
  el.onpointerup=ev=>{el.onpointermove=null;el.onpointerup=null;if(!drag){sel(id);return}
   G.flip=1;el.classList.remove('dragging');el.style.display='none';const t=document.elementFromPoint(ev.clientX,ev.clientY);el.style.display='';
   const tc=t&&t.closest&&t.closest('#hand .c');
   if(tc&&tc!==el){const hd=G.hands[0],ci=hd.findIndex(c=>c.id==id),card=hd.splice(ci,1)[0],r=tc.getBoundingClientRect();
    let ti=hd.findIndex(c=>c.id==+tc.dataset.id);if(ev.clientX>r.left+r.width/2)ti++;hd.splice(ti,0,card)}
   render()}}})}

function cancelar(){G.choose=null;render()}
// ---- Guardado y estadísticas (en este dispositivo) ----
const SAVE='carioca:save',STATS='carioca:stats',EMPTY=()=>({played:0,won:0,best:null,last:[]});
function persist(){try{if(G.phase=='roundEnd'&&G.round==9)localStorage.removeItem(SAVE);
 else if(['draw','play','roundEnd'].includes(G.phase)){const{sel,fresh,...rest}=G;localStorage.setItem(SAVE,JSON.stringify({...rest,v:1}))}}catch(e){}}
function restore(){try{const s=JSON.parse(localStorage.getItem(SAVE));if(s&&s.v==1&&s.hands){G=Object.assign({sort:true,log:[]},s);G.taken=G.taken||[[],[],[]];G.reshuf=G.reshuf||0;G.sel=new Set();G.fresh=null;G.dealAnim=0;G.dropId=null;
  setBots(G.bots&&G.bots[1]&&ROSTER[G.bots[1].id]&&G.bots[2]&&ROSTER[G.bots[2].id]?G.bots:[null,{id:0,lvl:'Normal'},{id:6,lvl:'Normal'}]);if(G.meId!=null&&ROSTER[G.meId])ME=G.meId;NM[0]=G.meName||'Tú';return true}}catch(e){}return false}
function loadStats(){try{return Object.assign(EMPTY(),JSON.parse(localStorage.getItem(STATS)))}catch(e){return EMPTY()}}
function finish(){if(G.statsDone)return;G.statsDone=1;const t=[0,1,2].map(i=>G.scores.reduce((x,r)=>x+r[i],0)),s=loadStats();
 s.played++;if(t[0]===Math.min(...t)&&t.filter(x=>x===t[0]).length===1)s.won++;s.best=s.best==null?t[0]:Math.min(s.best,t[0]);
 s.last=[{d:new Date().toISOString().slice(0,10),t,n:[NM[1],NM[2]]},...s.last].slice(0,5);try{localStorage.setItem(STATS,JSON.stringify(s))}catch(e){}}
function statsBox(){const s=loadStats();return `<div class="box"><b>Estadísticas</b> <span class="mu">(guardadas en este dispositivo)</span><div>Partidas: ${s.played} · Ganadas: ${s.won} · Mejor puntaje: ${s.best==null?'—':s.best}</div>${s.last.map(g=>`<div class="mu">${g.d}: Tú ${g.t[0]} · ${(g.n||['Ana','Beto'])[0]} ${g.t[1]} · ${(g.n||['Ana','Beto'])[1]} ${g.t[2]}</div>`).join('')}</div>`}
Object.assign(window,{sel,take,armar,deshacer,bajar,pegar,elegir,descartar,next,ordenar,cancelar,render,toggleScore,peek,setThink,setTurn,toggleSound});
// ---- Pantalla de inicio ----
const hasSave=()=>{try{const s=JSON.parse(localStorage.getItem(SAVE));return !!(s&&s.v==1&&s.hands)}catch(e){return false}};
function initHome(){const home=document.getElementById('home');if(!home)return newGame();
 const saved=hasSave(),$=s=>home.querySelector(s),cont=$('#bCont'),nw=$('#bNew'),snd=$('#bSnd'),pk=$('#picks'),nameIn=$('#pName');
 let menuTimer=0;const showMenu=()=>{clearTimeout(menuTimer);home.classList.add('menu-on')};
 const leave=()=>{home.classList.add('out');setTimeout(()=>home.remove(),900)};
 const sndLabel=()=>{snd.textContent=isMuted()?'🔇 Sonido: apagado':'🔊 Sonido: activado'};
 pk.innerHTML=ROSTER.map((r,i)=>`<button class="pick" data-me="${i}" type="button" aria-label="Avatar ${i+1}">${roundOf(i)}</button>`).join('');
 const picks=[...pk.children],paintPicks=()=>picks.forEach((b,i)=>b.classList.toggle('on',i==ME));
 const saveName=()=>{PN=nameIn.value.trim().slice(0,12)||'Tú';try{localStorage.setItem('carioca:name',PN)}catch(e){}};
 nameIn.value=PN=='Tú'?'':PN;nameIn.oninput=saveName;
 cont.hidden=!saved;$('#saveNote').hidden=!saved;nw.classList.toggle('gold',!saved);
 paintPicks();sndLabel();
 menuTimer=setTimeout(showMenu,2600);
 home.addEventListener('click',e=>{if(!home.classList.contains('menu-on')&&!e.target.closest('.menu')){home.classList.add('skip');showMenu()}});
 pk.onclick=ev=>{const b=ev.target.closest('.pick');if(!b)return;ME=+b.dataset.me;try{localStorage.setItem('carioca:avatar',ME)}catch(e){}unlock();play('click');paintPicks()};
 snd.onclick=()=>{unlock();setMuted(!isMuted());play('click');sndLabel()};
 nw.onclick=()=>{unlock();play('click');saveName();leave();newGame()};
 cont.onclick=()=>{unlock();play('click');if(restore()){leave();startTurn();render()}else{leave();saveName();newGame()}}}
function newGame(){try{localStorage.removeItem(SAVE)}catch(e){}G={round:0,scores:[],sort:true,log:[]};setBots(pickBots(DIFF,ME));setMe();start()}
initHome();
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(G.hands&&!G.showScore)render()},150)});
if(navigator.serviceWorker)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
