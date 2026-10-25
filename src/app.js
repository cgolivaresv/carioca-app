import {effort,thinkTime} from './bots.js';
import {SU,RK,pts,CON,desc,classify,meets,solve,rm,sides} from './engine.js';
import {deal,drawCard,commitLay,attachCard,discard,botTurn,closeRound,totals,winners,dealerOf} from './game.js';
import {unlock,play,setMuted,isMuted} from './audio.js';
import {JOKER} from './joker.js';
import {ROSTER,LEVELS,bustOf,roundOf,pickBots,fallbackBust,fallbackRound} from './roster.js';
import {phrase} from './lines.js';
import {esc,validSave} from './safe.js';
import {localPatch,toSeat,toLocal} from './online.js';
import {openRoom,newCode,savedRoom,forgetRoom} from './net.js';
import {serverUrl} from './config.js';
// Los nombres se escapan al asignarlos: NM se inserta en innerHTML en toda la pantalla
const NM=['Tú','Ana','Beto']; // un nombre por asiento: su largo siempre es G.n (2 a 5)
// Fija los rivales de la partida (G.bots guarda solo el id del roster y el nivel; el asiento 0 es el jugador)
function setMe(){NM[0]=esc(PN);G.meId=ME;G.meName=PN}
function setBots(bs){G.bots=bs;G.n=bs.length;NM.length=G.n;for(let i=1;i<G.n;i++)NM[i]=ROSTER[bs[i].id].name}
const sleep=t=>new Promise(r=>setTimeout(r,t));
let SESSION=0,openHome=()=>{},hideHome=()=>{},homeNote=()=>{};
let NET=null,noteT=0; // NET: sala en línea actual (null = partida local contra bots)
let G={round:0,scores:[],sort:true,log:[]};
const reqOf=()=>[...CON[G.round]].sort((a,b)=>b-a);
const log=t=>{G.log.unshift(t);G.log=G.log.slice(0,4)};
const seats=(n,f)=>Array.from({length:n},f);
function start(){const n=G.n;deal(G); // reparto y estado de la mesa: src/game.js
 G.staged=[];G.sel=new Set();G.log=[];G.dealAnim=1;play('deal');G.peek=0;G.showScore=0;G.msg='Tu turno: roba del mazo o del descarte.';
 const st=G.round%n;if(st){G.phase='bots';G.turn=(st+n-1)%n;G.pend=st;G.msg='';render();advance()}else{startTurn();render()}}
async function advance(){const my=SESSION,n=G.n;stopTurn();G.phase='bots';G.turn=(G.turn+1)%n;
 while(G.turn!=0){const p=G.turn;G.pend=p;G.thinking=true;G.say=phrase(G,p);
  // El bot juega cuando termina de "pensar": las jugadas fáciles salen antes y algunos turnos al azar tardan el máximo (THINK)
  G.thinkMs=thinkTime(effort(G,p),THINK);G.thinkStart=Date.now();render();await sleep(G.thinkMs);if(my!=SESSION)return;G.thinking=false;
  const top0=G.disc[G.disc.length-1],dk0=G.deck.length,r=botMove(p);G.pend=(p+1)%n;if(G.phase=='roundEnd')return;if(r.end===-1){endRound(-1);return}
  G.vis={top:top0,deck:dk0};G.note={p,kind:r.drew,card:r.drewCard};G.fly={p,src:r.drew,card:r.drewCard};play(r.drew=='disc'?'flip':'draw');render();await sleep(1300);if(my!=SESSION)return;
  G.vis=null;G.dropId=r.discard&&r.discard.id;G.note=r.laid?{p,kind:'lay'}:null;if(r.laid)play('down');setTimeout(()=>play('discard'),r.laid?450:0);render();await sleep(1300);if(my!=SESSION)return;G.turn=(G.turn+1)%n}
 G.note=null;G.phase='draw';G.msg='Tu turno: roba del mazo o del descarte.';startTurn();play('turn');render()}
function botMove(p){const r=botTurn(G,p,LEVELS[G.bots[p].lvl],(q,m,c)=>log(NM[q]+' '+m+(c?' '+cn(c):'')));if(r.out){if(r.discard)G.dropId=r.discard.id;endRound(p)}return r}
function endRound(w){stopTurn();closeRound(G,w);if(G.round==9)finish();if(w==0)play('win');else if(w>0)play('lose');
 G.msg=w<0?'Se acabó el mazo: nadie salió. Se cuentan las cartas en mano.':(w?NM[w]+' se queda':'Te quedas')+' sin cartas y gana la ronda.';render()}
const cn=c=>c.r?RK[c.r]+SU[c.s]:'🃏';
const me=()=>G.phase=='play'&&G.turn==0;
function sel(id){if(!me())return;play('select');G.choose=null;G.sel.has(id)?G.sel.delete(id):G.sel.add(id);render()}
function take(deck){if(G.phase!='draw')return;unlock();play(deck?'draw':'flip');if(NET){NET.send({t:'draw',deck:!!deck});return}G.turn=0;const r=drawCard(G,0,deck);if(r.err)return;if(r.end){endRound(-1);return} // mazo y descarte agotados
 G.fresh=new Set([r.card.id]);G.msg='Arma combinaciones, pega cartas o descarta una.';render()}
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
 if(NET){NET.send({t:'lay',groups:G.staged.map(m=>({ids:m.cs.map(c=>c.id),st:m.st}))});return render()}
 G.turn=0;const lay=commitLay(G,0,G.staged);if(lay.err){play('error');G.msg=lay.err;return render()}
 play('down');G.staged=[];log('Te bajaste');G.msg='¡Bajado! Para terminar tu jugada, descarta una carta. Podrás pegar cartas desde tu próximo turno.';if(!G.hands[0].length)return endRound(0);render()}
function pegar(p,i){if(!me()||!G.down[0])return;if(G.justDown){G.msg='No puedes pegar cartas en el turno en que te bajas: descarta para terminar tu jugada.';return render()}if(picked().length!=1)return;const c=picked()[0],m=G.melds[p][i],s=sides(m,c);
 if(!s.length){G.msg='Esa carta no encaja ahí.';return render()}
 if(s.length>1&&!c.r){G.choose={p,i,id:c.id};G.msg='';return render()}
 doPut(p,i,c,s[0])}
function doPut(p,i,c,sd){if(NET){NET.send({t:'attach',owner:toSeat(p,G.me,G.n),mi:i,id:c.id,side:sd});G.sel=new Set();G.choose=null;return}G.turn=0;const r=attachCard(G,0,p,i,c.id,sd);if(r.err){G.msg=r.err;return render()}
 play('lay');G.sel=new Set();G.choose=null;if(r.out)return endRound(0);render()}
function elegir(sd){const x=G.choose;doPut(x.p,x.i,G.hands[0].find(c=>c.id==x.id),sd)}
function chooser(){const m=G.melds[G.choose.p][G.choose.i],e=(m.st+m.len-2)%13+1;
 return `<div class="box row"><span>Comodín en la escala (${RK[m.st]} … ${RK[e]}): ¿dónde va?</span><button class="b" onclick="elegir('s')">Al inicio</button><button class="b" onclick="elegir('e')">Al final</button><button class="b g" onclick="cancelar()">Cancelar</button></div>`}
function descartar(){if(!me())return;if(G.staged.length){G.msg='Tienes combinaciones sin bajar (Deshacer o Bajarme).';return render()}
 const p=picked();if(p.length!=1){play('error');G.msg='Elige 1 carta para descartar.';return render()}
 if(NET){NET.send({t:'discard',id:p[0].id});G.sel=new Set();return}G.turn=0;const r=discard(G,0,p[0].id);if(r.err){play('error');G.msg=r.err;return render()}
 play('discard');G.dropId=p[0].id;G.sel=new Set();if(r.out)return endRound(0);if(r.exhausted)return endRound(-1);advance()}
function next(){if(NET){if(NET.you&&NET.you.host)NET.send({t:'next'});return}if(G.round==9){G={round:0,scores:[],sort:true,log:[]};setBots(pickBots(DIFF,ME,NB));setMe()}else G.round++;start()}
// Disposición clásica de las pintas (x, y en %) como en un mazo Bicycle
const PIPS={2:[[50,22],[50,78]],3:[[50,22],[50,50],[50,78]],4:[[36,22],[64,22],[36,78],[64,78]],5:[[36,22],[64,22],[50,50],[36,78],[64,78]],6:[[36,22],[64,22],[36,50],[64,50],[36,78],[64,78]],7:[[36,22],[64,22],[50,36],[36,50],[64,50],[36,78],[64,78]],8:[[36,22],[64,22],[50,36],[36,50],[64,50],[50,64],[36,78],[64,78]],9:[[36,22],[64,22],[36,40],[64,40],[50,50],[36,60],[64,60],[36,78],[64,78]],10:[[36,22],[64,22],[50,30],[36,40],[64,40],[36,60],[64,60],[50,70],[36,78],[64,78]]};
const pipsOf=(r,s)=>r==1?`<span class="big">${s}</span>`:r>=11?`<span class="fc"><b>${RK[r]}</b><u>${s}</u></span>`:(PIPS[r]||[]).map(([x,y])=>`<span class="pp${y>50?' f':''}" style="left:${x}%;top:${y}%">${s}</span>`).join('');
const card=(c,x='',d=0)=>{const r=RK[c.r],s=SU[c.s],cl=x.split(' '),sm=cl.includes('sm'),label=c.r?`${r} de ${({'♠':'picas','♥':'corazones','♦':'diamantes','♣':'tréboles'})[s]}`:'comodín';
 const inner=sm?(c.r?`<span class="t">${r}<br>${s}</span><span class="ct">${s}</span><span class="t b">${r}<br>${s}</span>`:`<span class="jk">${JOKER}</span>`)
  :(c.r?`<span class="ix${c.r==10?' t10':''}">${r}<i>${s}</i></span>${pipsOf(c.r,s)}<span class="ix b${c.r==10?' t10':''}">${r}<i>${s}</i></span>`:`<span class="jk">${JOKER}</span>`);
 return `<button type="button" class="c k${c.s} ${x}" data-id="${c.id}" aria-label="${label}" aria-pressed="${cl.includes('s')}"${d?` style="animation-delay:${d}ms"`:''}>${inner}</button>`};
const small=c=>card(c,'sm').replace('<button','<span').replace('</button>','</span>');
const mel=(p,list)=>list.map((m,i)=>`<div class="m" onclick="pegar(${p},${i})">${m.cs.map(small).join('')}</div>`).join('');
let THINK=(()=>{try{return Math.max(7000,+localStorage.getItem('carioca:think')||7000)}catch(e){return 7000}})();
function setThink(s){THINK=s*1000;try{localStorage.setItem('carioca:think',THINK)}catch(e){}render()}
const thinkChips=()=>`<div class="row" style="margin-top:8px"><span class="chip2">Espera máx. de los bots:</span>${[7,10,15,20].map(s=>`<button class="chip ${THINK==s*1000?'on':''}" onclick="setThink(${s})">${s} s</button>`).join('')}</div>`;
function flyEl(){const f=G.fly,st=`--dx:${G.n==2?0:(f.p-1)%2?110:-110}px;--sx:${f.src=='disc'?34:-34}px`;
 return f.src=='disc'?card(f.card,'sm fly face').replace('<button','<button style="'+st+'"'):`<i class="fly" style="${st}"></i>`}
function toast(){const n=G.note,nm=NM[n.p];
 return `<div class="toast">${n.kind=='deck'?`<i class="mini"></i><span>${nm} robó una carta del <b>mazo</b></span>`:n.kind=='disc'?`${small(n.card)}<span>${nm} tomó del <b>descarte</b></span>`:`<span>✅ ${nm} se <b>bajó</b></span>`}</div>`}
let TURN=(()=>{try{const v=localStorage.getItem('carioca:turn');return v==null?0:Math.max(0,+v||0)}catch(e){return 0}})(),tt=0;
const inTurn=()=>G.phase=='draw'||G.phase=='play';
function startTurn(){clearTimeout(tt);if(TURN>0&&inTurn()&&!NET){G.turnStart=Date.now();tt=setTimeout(timeUp,TURN);tickOn()}else{G.turnStart=null;tickOff()}}
function stopTurn(){clearTimeout(tt);G.turnStart=null;tickOff()}
// Tiempo agotado: roba del mazo si no había robado, devuelve las combinaciones sin bajar y descarta (la carta robada o la de más puntos)
function timeUp(){if(!inTurn()||G.showScore)return;
 if(G.phase=='draw')take(1);
 if(!inTurn())return; // take() pudo terminar la ronda (mazo agotado)
 if(G.staged.length)deshacer();
 const h=G.hands[0];let w=h.find(c=>c.id==G.drawn);
 if(!w||(!w.r&&h.length>1))w=[...h].filter(c=>c.r).sort((x,y)=>pts(y.r)-pts(x.r))[0]||h[0];
 G.choose=null;G.sel=new Set([w.id]);G.msg='⏰ Se acabó tu tiempo: jugada automática.';descartar()}
function setTurn(s){TURN=s*1000;try{localStorage.setItem('carioca:turn',TURN)}catch(e){}if(G.showScore)G.left=TURN||null;else startTurn();render()}
const turnChips=()=>`<div class="row" style="margin-top:8px"><span class="chip2">Tu tiempo por turno:</span>${[[0,'Sin límite'],[20,'20 s'],[30,'30 s'],[45,'45 s']].map(([s,l])=>`<button class="chip ${TURN==s*1000?'on':''}" onclick="setTurn(${s})">${l}</button>`).join('')}</div>`;
function toggleScore(){G.showScore=!G.showScore;
 if(inTurn()&&!NET){if(G.showScore){clearTimeout(tt);G.left=G.turnStart?Math.max(0,TURN-(Date.now()-G.turnStart)):null}
  else if(TURN>0){const l=G.left??TURN;G.turnStart=Date.now()-(TURN-l);tt=setTimeout(timeUp,l)}else G.turnStart=null}
 render()}
// El reloj del turno solo "late" mientras hay un turno con tiempo límite (antes corría siempre, 4 veces por segundo)
let lastTick=0,tickId=0;
const tickFn=()=>{if(!G.turnStart||G.showScore||document.hidden)return;const e=document.getElementById('tt');if(e){const s=Math.max(0,Math.ceil((TURN-(Date.now()-G.turnStart))/1000));e.textContent=s;if(s>0&&s<=5&&s!=lastTick){lastTick=s;play('tick')}}};
const tickOn=()=>{if(!tickId)tickId=setInterval(tickFn,250)},tickOff=()=>{clearInterval(tickId);tickId=0};
const tots=()=>totals(G);
// Las barras de tiempo avanzan a 4 pasos por segundo (en vez de un fotograma por cada refresco de pantalla): ahorra GPU y batería
const stepsOf=ms=>Math.max(1,Math.ceil(ms/250));
function plate(p){const tm=p==0&&TURN>0&&G.turnStart&&inTurn(),el=G.showScore&&G.left!=null?TURN-G.left:Date.now()-G.turnStart,secs=Math.max(0,Math.ceil((TURN-el)/1000)),tot=tots()[p],act=p?(G.phase=='bots'&&G.turn==p):(G.phase=='draw'||G.phase=='play'),dealer=(NET?toLocal(dealerOf(G),G.me,G.n):dealerOf(G))==p,
 say=p?(G.log.find(l=>l.startsWith(NM[p]))||'').slice(NM[p].length+1):'';
 const wl=G.phase=='roundEnd'&&G.win!=null&&G.win>=0?`<em class="wl ${G.win==p?'win':'lose'}">${G.win==p?'Gana':'Pierde'}</em>`:'';
 const bub=p?(act&&G.thinking?`<div class="bubble talk">${G.say||''}<span class="dots"><i></i><i></i><i></i></span></div>`:say?`<div class="bubble say">${say}</div>`:''):'';
 return `<div class="seat"><div class="av ${act?'turn':''} ${p&&act&&G.thinking?'th':''}" style="--ac2:${COL[p]}">${AVT()[p]}${dealer?'<i class="dlr">D</i>':''}</div>${bub}<div class="plate"><b>${NM[p]}</b><span>${G.hands[p].length} cartas · ${tot} pts${tm?` · <b class="tt" id="tt">${secs}</b> s`:''}</span>${wl}${p&&act&&G.thinking?`<u class="bar" style="animation:tbar ${G.thinkMs||THINK}ms steps(${stepsOf(G.thinkMs||THINK)}) forwards;animation-delay:-${Date.now()-G.thinkStart}ms"></u>`:''}${tm?`<u class="bar" style="animation:tbar ${TURN}ms steps(${stepsOf(TURN)}) forwards,tcol ${TURN}ms steps(${stepsOf(TURN)}) forwards;animation-delay:-${el}ms,-${el}ms"></u>`:''}</div></div>`}
function peek(){G.peek=1;G.showScore=0;render()}
// FLIP: guarda dónde estaban las cartas de la mano para que se deslicen suavemente a su nuevo sitio
function flipBefore(){const m=new Map();if(G.flip)document.querySelectorAll('#hand .c').forEach(el=>m.set(el.dataset.id,el.getBoundingClientRect()));G.flip=0;return m}
function flipAfter(m){if(!m.size)return;document.querySelectorAll('#hand .c').forEach(el=>{const o=m.get(el.dataset.id);if(!o)return;const n=el.getBoundingClientRect(),dx=o.left-n.left,dy=o.top-n.top;
 if(Math.abs(dx)<1&&Math.abs(dy)<1)return;el.style.transition='none';el.style.transform=`translate(${dx}px,${dy}px)`;el.getBoundingClientRect();
 el.style.transition='transform .34s cubic-bezier(.2,.8,.25,1)';el.style.transform='';setTimeout(()=>{el.style.transition=''},380)})}
// Ajusta el solapamiento de la mano midiendo el ancho real de las cartas y del contenedor
function fitHand(){const hd=document.getElementById('hand');if(!hd)return;const cs=hd.children,n=cs.length;if(n<2)return;
 const cw=cs[0].offsetWidth,avail=hd.clientWidth-4;hd.style.setProperty('--ov',Math.min(cw-14,Math.max(0,(n*cw-avail)/(n-1))).toFixed(1)+'px')}
function keepMineVisible(){const t=document.querySelector('.table');if(t&&document.querySelector('.mine')&&t.scrollHeight>t.clientHeight+2)t.scrollTop=t.scrollHeight}
function render(){
 const flipPrev=flipBefore();
 const h=G.hands[0],tot=tots(),end=G.phase=='roundEnd',fin=end&&G.round==9,top=G.vis?G.vis.top:G.disc[G.disc.length-1],can=G.phase=='draw',mine=me();
 const W=typeof innerWidth=='number'?innerWidth:400,avail=Math.min(W,560)-30,n=h.length,cw=W<=390?44:52,ov=n>1?Math.min(cw-14,Math.max(0,Math.round((n*cw-avail)/(n-1)))):0;
 const rows=[];for(let p=1;p<G.n;p+=2)rows.push(p+1<G.n?[p,p+1]:[p]); // los rivales se muestran de a dos por fila
 const hint=G.round>7?' · '+['A–K, cualquier palo, con comodines','A–K de un solo palo, sin comodines'][G.round-8]:'';
 const t=`<table><tr><th>#</th><th>Contrato</th>${NM.map(x=>`<th>${x}</th>`).join('')}</tr>`+G.scores.map((r,i)=>`<tr><td>${i+1}</td><td>${desc(CON[i])}</td>${r.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')+`<tfoot><tr><td></td><td>Total</td>${tot.map(x=>`<td>${x}</td>`).join('')}</tr></tfoot></table>`;
 const btn=(c,f,l,on)=>`<button class="act ${c}" ${on?'':'disabled'} onclick="${f}()">${l}</button>`;
 const nextBtn=()=>{const w=NET&&!(NET.you&&NET.you.host);return btn('go','next',w?'Espera al anfitrión…':fin?'Jugar de nuevo':'Siguiente ronda',!w)};
 const bar=end?nextBtn():btn('gh','deshacer','Deshacer',mine&&G.staged.length)+btn('blue','armar','Armar',mine&&!G.down[0])+btn('go','bajar','Bajarme',mine&&!G.down[0])+btn('red','descartar','Descartar',mine);
 const modal=G.confirmExit?`<div class="modal"><div class="sheet"><h3>${NET?'¿Salir de la sala?':'¿Salir de la partida?'}</h3><p class="mu" style="font-size:14px;line-height:1.5">${NET?'Un bot ocupará tu lugar y no podrás volver a esta partida.':'Puedes guardar la partida y continuarla después desde el menú principal, o abandonarla para empezar una nueva.'}</p><div class="col">${NET?'<button class="act red" onclick="abandon()">Salir de la sala</button>':'<button class="act go" onclick="exitMenu()">Guardar y salir al menú</button><button class="act red" onclick="abandon()">Abandonar y empezar de nuevo</button>'}<button class="act gh" onclick="keepPlaying()">Seguir jugando</button></div></div></div>`:G.showScore||(end&&!G.peek)?`<div class="modal"><div class="sheet"><h3>${fin?(tot.filter(x=>x===Math.min(...tot)).length>1?'Fin del juego · empate': 'Fin del juego · gana '+NM[tot.indexOf(Math.min(...tot))]):end?G.msg:'Puntaje'}</h3>${t}${statsBox()}${NET?'':turnChips()+thinkChips()}<div class="row" style="margin-top:12px"><button class="chip" onclick="askExit()">🏠 Menú principal / abandonar partida</button></div><div class="row">${end?nextBtn()+`<button class="chip" onclick="peek()">Ver mesa</button>`:`<button class="act go" onclick="toggleScore()">Cerrar</button>`}</div></div></div>`:'';
 document.getElementById('app').innerHTML=`<div class="hud"><button class="rbtn" onclick="toggleScore()" aria-label="Puntaje">☰</button><div class="contract"><small>Ronda ${G.round+1} de 10</small><b>${desc(CON[G.round])}${hint}</b></div><button class="rbtn" onclick="toggleSound()" aria-label="${isMuted()?'Activar sonido':'Silenciar'}">${isMuted()?'🔇':'🔊'}</button></div>
 <div class="table${rows.length>1?' t4':''}">${G.fly?flyEl():''}${G.note?toast():''}${rows.map((r,i)=>`<div class="seats${r.length<2?' solo':''}${i?' b2':''}">${r.map(p=>plate(p)).join('')}</div>
 <div class="melds2${r.length<2?' solo':''}${i?' b2':''}">${r.map(p=>`<div class="mz${G.melds[p].length>2?' dense':''}">${mel(p,G.melds[p])}</div>`).join('')}</div>`).join('\n')}
 <div class="center"><div class="piles"><div class="pile ${can?'can':''} ${G.note&&G.note.kind=='deck'?'src':''}" onclick="take(1)"><div class="stk" style="--th:${Math.min(12,Math.max(3,Math.round((G.vis?G.vis.deck:G.deck.length)/9)))}px"><div class="c back"><span class="cnt">${G.vis?G.vis.deck:G.deck.length}</span></div></div><small>MAZO</small></div><div class="pile ${can?'can':''} ${G.note&&G.note.kind=='disc'?'src':''}" onclick="take(0)"><div class="stk" style="--th:${Math.min(10,Math.max(2,Math.round(G.disc.length/4)))}px">${top?card(top,G.dropId==top.id?'drop':''):'<div class="c"></div>'}</div><small>DESCARTE</small></div></div><div class="msgpill">${NET&&NET.status!='open'?'⚠ Sin conexión, reconectando…':G.msg||G.log[0]||'…'}</div></div>
 ${G.melds[0].length+G.staged.length?`<div class="mine"><div class="mz${G.melds[0].length+G.staged.length>4?' dense':''}">${mel(0,G.melds[0])}${G.staged.map(m=>`<div class="m st">${m.cs.map(small).join('')}</div>`).join('')}</div></div>`:''}</div>
 <div class="hero"><button class="chip sortb" onclick="ordenar('p')">♠ Palo</button>${plate(0)}<button class="chip sortb" onclick="ordenar('n')">A Número</button></div>${G.choose?chooser():''}
 <div id="hand" class="hand" style="--ov:${ov}px">${h.map((c,i)=>card(c,(G.sel.has(c.id)?'s ':'')+(G.dealAnim||G.fresh&&G.fresh.has(c.id)?'deal':''),G.dealAnim?i*50:0)).join('')}</div>
 <div class="bar2">${bar}</div>${modal}`;
 fitHand();keepMineVisible();setupDrag();flipAfter(flipPrev);persist();G.dealAnim=0;G.fresh=null;G.dropId=null;G.fly=null}

function ordenar(m){G.flip=1;play('flip');G.hands[0].sort((a,b)=>!a.r-!b.r||(m=='p'?a.s-b.s||a.r-b.r:a.r-b.r||a.s-b.s));render()}
let ME=(()=>{try{const r=localStorage.getItem('carioca:avatar'),v=+r;return r!==null&&v>=0&&v<ROSTER.length?v:7}catch(e){return 7}})();
let PN=(()=>{try{return (localStorage.getItem('carioca:name')||'').trim().slice(0,12)||'Tú'}catch(e){return 'Tú'}})();
let NB=(()=>{try{const v=+localStorage.getItem('carioca:bots');return v>=1&&v<=4?v:2}catch(e){return 2}})(); // rivales (bots) en la mesa: 1 a 4
const DIFF='Aleatoria'; // los rivales siempre tienen un nivel al azar, que no se muestra
const AVT=()=>G.bots.map((b,i)=>bustOf(i?b.id:ME)),COL=['#3aa0ff','#e0709a','#e69a3c','#5fc47a','#a77be0'];
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
// También se guarda durante el turno de los bots (G.pend = qué jugador mueve a continuación), para no perder jugadas al salir
function persist(){if(NET)return;try{if(G.phase=='roundEnd'&&G.round==9)localStorage.removeItem(SAVE);
 else if(['draw','play','roundEnd','bots'].includes(G.phase)){const{sel,fresh,...rest}=G;localStorage.setItem(SAVE,JSON.stringify({...rest,v:1}))}}catch(e){}}
const readSave=()=>{try{const s=JSON.parse(localStorage.getItem(SAVE));return validSave(s)?s:null}catch(e){return null}};
function restore(){const s=readSave();if(!s)return false;
 G=Object.assign({sort:true,log:[]},s);G.n=G.hands.length;G.taken=G.taken||seats(G.n,()=>[]);G.staged=G.staged||[];G.reshuf=G.reshuf||0;G.sel=new Set();G.fresh=null;G.dealAnim=0;G.dropId=null;G.confirmExit=0;G.showScore=0;
 G.vis=null;G.note=null;G.fly=null;G.thinking=false;G.choose=null;
 const okBots=Array.isArray(G.bots)&&G.bots.length==G.n&&G.bots.slice(1).every(b=>b&&ROSTER[b.id]);
 setBots(okBots?G.bots:[null,...[0,6,1,2].slice(0,G.n-1).map(id=>({id,lvl:'Normal'}))]);if(G.meId!=null&&ROSTER[G.meId])ME=G.meId;NM[0]=esc(G.meName||'Tú');return true}
function loadStats(){try{return Object.assign(EMPTY(),JSON.parse(localStorage.getItem(STATS)))}catch(e){return EMPTY()}}
function finish(){if(G.statsDone)return;G.statsDone=1;const t=tots(),s=loadStats();
 s.played++;const w=winners(G);if(w.length===1&&w[0]===0)s.won++;s.best=s.best==null?t[0]:Math.min(s.best,t[0]);
 s.last=[{d:new Date().toISOString().slice(0,10),t,n:NM.slice(1)},...s.last].slice(0,5);try{localStorage.setItem(STATS,JSON.stringify(s))}catch(e){}}
function statsBox(){const s=loadStats();return `<div class="box"><b>Estadísticas</b> <span class="mu">(guardadas en este dispositivo)</span><div>Partidas: ${s.played} · Ganadas: ${s.won} · Mejor puntaje: ${s.best==null?'—':s.best}</div>${s.last.map(g=>`<div class="mu">${esc(g.d)}: Tú ${esc(g.t[0])}${g.t.slice(1).map((x,i)=>` · ${esc((g.n||['Ana','Beto'])[i]||'Bot')} ${esc(x)}`).join('')}</div>`).join('')}</div>`}
// si una imagen de avatar no carga, se cambia por el avatar SVG de respaldo
window.avFail=el=>{el.onerror=null;const i=+el.dataset.av;(el.closest('picture')||el).outerHTML=el.dataset.kind=='bust'?fallbackBust(i):fallbackRound(i)};
Object.assign(window,{setSeats,startOnline,shareRoom,leaveRoom,askExit,keepPlaying,exitMenu,abandon,sel,take,armar,deshacer,bajar,pegar,elegir,descartar,next,ordenar,cancelar,render,toggleScore,peek,setThink,setTurn,toggleSound});
// ---- Multijugador en línea (el servidor tiene la partida; aquí solo se dibuja lo que te toca ver y se envían tus jugadas) ----
const NET_MSG={nofound:'Esa sala no existe.',full:'La sala está llena.',started:'Esa partida ya empezó.',left:'Saliste de esa partida.',replaced:'Entraste a la sala desde otro lugar.',taken:'Ese código ya está en uso, intenta de nuevo.',lost:'Se perdió la conexión con el servidor.'};
const freshG=()=>({round:0,scores:[],sort:true,log:[],online:1});
function setNames(ns){NM.length=ns.length;ns.forEach((x,i)=>{NM[i]=esc(x)})}
async function createRoom(){const server=serverUrl();if(!server)return;homeNote('Creando sala…');
 try{startNet(await newCode(server),true)}catch(e){homeNote('No se pudo conectar con el servidor.')}}
function joinRoom(code){code=String(code||'').toUpperCase().replace(/[^A-Z]/g,'');
 if(code.length!=4)return homeNote('El código tiene 4 letras.');startNet(code,false)}
function startNet(code,create,token){const server=serverUrl();if(!server)return;if(NET)NET.conn.close();
 SESSION++;G=freshG();const mine=NET={code,status:'connecting',you:null,lobby:null,phase:'lobby',note:''};
 mine.conn=openRoom({server,code,create,token,name:PN,avatar:ME,
  onStatus:s=>{if(NET!==mine)return;mine.status=s;if(G.hands)render();else if(mine.lobby)renderLobby()},
  onMsg:m=>{if(NET===mine)onNet(m)}});
 mine.send=m=>mine.conn.send(m);homeNote('');hideHome();
 document.getElementById('app').innerHTML='<div class="modal"><div class="sheet"><h3>Conectando…</h3></div></div>'}
function onNet(m){
 if(m.t=='lobby'){if(G.hands)G=freshG();NET.lobby=m;NET.you=m.you;NET.phase='lobby';NET.note='';renderLobby()}
 else if(m.t=='state'){NET.you=m.you;NET.phase='playing';applyState(m)}
 else if(m.t=='err'){
  if(m.code&&NET_MSG[m.code])return leaveOnline(NET_MSG[m.code]);
  if(NET.phase=='playing'){G.msg=m.msg;play('error');render()}else{NET.note=m.msg;renderLobby()}}}
function applyState(m){
 const{newRound,patch,fresh,events,think}=localPatch(m,G),wasEnd=G.phase=='roundEnd';
 Object.assign(G,patch);setNames(patch.names);
 if(newRound){G.dealAnim=1;G.peek=0;G.showScore=0;G.sel=new Set();G.log=[];G.choose=null;G.confirmExit=0;G.statsDone=1;play('deal')}
 G.sel=G.sel||new Set();G.fresh=fresh.length?new Set(fresh):null;
 for(const e of events){if(e.p===0)continue;const nm=NM[e.p];
  if(e.e=='draw'){log(nm+' '+(e.from=='deck'?'roba del mazo':'toma del descarte'+(e.card?' '+cn(e.card):'')));G.note={p:e.p,kind:e.from,card:e.card};G.fly={p:e.p,src:e.from,card:e.card};play(e.from=='disc'?'flip':'draw')}
  else if(e.e=='lay'){log(nm+' se baja');G.note={p:e.p,kind:'lay'};play('down')}
  else if(e.e=='attach')log(nm+' pega una carta');
  else if(e.e=='discard'){log(nm+' descarta '+cn(e.card));G.dropId=e.card.id;play('discard')}}
 if(events.some(e=>e.p!==0)){clearTimeout(noteT);noteT=setTimeout(()=>{if(G.note){G.note=null;if(G.hands&&NET)render()}},1600)}
 G.thinking=!!think&&think.p!==0;if(think){G.thinkMs=think.ms;G.thinkStart=Date.now();G.say=phrase(G,think.p)}
 if(G.phase=='draw')G.msg='Tu turno: roba del mazo o del descarte.';
 else if(G.phase=='play')G.msg=G.justDown?'¡Bajado! Para terminar tu jugada, descarta una carta. Podrás pegar cartas desde tu próximo turno.':'Arma combinaciones, pega cartas o descarta una.';
 else if(G.phase=='bots')G.msg='';
 if(G.phase=='roundEnd'&&!wasEnd){const w=G.win;
  G.msg=w<0?'Se acabó el mazo: nadie salió. Se cuentan las cartas en mano.':(w?NM[w]+' se queda':'Te quedas')+' sin cartas y gana la ronda.';
  if(w===0)play('win');else if(w>0)play('lose')}
 render()}
function renderLobby(){const L=NET.lobby;if(!L)return;const R=L.room,host=L.you.host,off=NET.status!='open';
 document.getElementById('app').innerHTML=`<div class="modal"><div class="sheet"><h3>Sala ${esc(R.code)}</h3>
 <p class="mu" style="font-size:14px;line-height:1.5">Pasa el código o el enlace a tus amigos. Los asientos que queden vacíos los ocupan bots.</p>
 <div class="row"><button class="chip" onclick="shareRoom()">🔗 Compartir enlace</button></div>
 <div class="box"><b>Jugadores (${R.players.length}/${R.seatsN})</b>${R.players.map(p=>`<div class="lp"><span class="lpav">${roundOf(p.avatar)}</span><span>${esc(p.name)}${p.host?' · anfitrión':''}${p.connected?'':' · sin conexión'}</span></div>`).join('')}
 <div class="mu">${R.seatsN-R.players.length} asiento(s) para bots</div></div>
 ${host?`<div class="row"><span class="chip2">Asientos en la mesa:</span>${[2,3,4,5].map(k=>`<button class="chip ${R.seatsN==k?'on':''}" ${k<R.players.length?'disabled':''} onclick="setSeats(${k})">${k}</button>`).join('')}</div>`:`<div class="mu" style="margin-top:8px">Mesa de ${R.seatsN} jugadores. Espera a que el anfitrión empiece.</div>`}
 <div class="col" style="margin-top:12px">${host?`<button class="act go" onclick="startOnline()">Empezar partida</button>`:''}<button class="act gh" onclick="leaveRoom()">Salir de la sala</button></div>
 ${off?'<div class="mu">⚠ Sin conexión, reconectando…</div>':''}${NET.note?`<div class="mu">${esc(NET.note)}</div>`:''}</div></div>`}
function setSeats(k){if(NET)NET.send({t:'config',seats:k})}
function startOnline(){if(NET)NET.send({t:'start'})}
async function shareRoom(){if(!NET)return;const url=location.origin+location.pathname+'?sala='+NET.code,text='Juega Carioca conmigo: sala '+NET.code;
 try{if(navigator.share){await navigator.share({title:'Carioca',text,url});return}await navigator.clipboard.writeText(url);NET.note='Enlace copiado.'}catch(e){NET.note='Código de la sala: '+NET.code}
 renderLobby()}
// Salir de la sala por voluntad propia (el servidor deja un bot en tu asiento)
function leaveRoom(){if(NET){try{NET.send({t:'leave'})}catch(e){}}forgetRoom();leaveOnline()}
function leaveOnline(msg){if(NET){NET.conn.close();NET=null}SESSION++;clearTimeout(noteT);G=freshG();G.online=0;document.getElementById('app').innerHTML='';openHome();homeNote(msg||'')}
// ---- Pantalla de inicio ----
const hasSave=()=>!!readSave();
function initHome(){const home=document.getElementById('home');if(!home)return newGame();
 const saved=hasSave(),$=s=>home.querySelector(s),cont=$('#bCont'),nw=$('#bNew'),snd=$('#bSnd'),pk=$('#picks'),nameIn=$('#pName');
 let menuTimer=0;const showMenu=()=>{clearTimeout(menuTimer);home.classList.add('menu-on')};
 const leave=()=>{home.classList.add('out');document.body.classList.add('ingame')}; // 'ingame' detiene las animaciones de fondo
 const nb=$('#nbots'),paintNb=()=>{nb.innerHTML=[1,2,3,4].map(k=>`<button class="chip ${NB==k?'on':''}" type="button" data-nb="${k}">${k}</button>`).join('')};
 nb.onclick=ev=>{const b=ev.target.closest('[data-nb]');if(!b)return;NB=+b.dataset.nb;try{localStorage.setItem('carioca:bots',NB)}catch(e){}unlock();play('click');paintNb()};
 paintNb();
 const bBack=$('#bBack'),bCreate=$('#bCreate'),bJoin=$('#bJoin'),rCode=$('#rCode'),onNote=$('#onNote'),srv=serverUrl();
 hideHome=leave;homeNote=t=>{onNote.textContent=t||''};
 const backBtn=()=>{const s=savedRoom();bBack.hidden=!(s&&srv);if(s)bBack.textContent='↩ Volver a la sala '+s.code};
 if(!srv){bCreate.disabled=bJoin.disabled=rCode.disabled=true;onNote.textContent='El multijugador aún no está disponible.'}
 backBtn();
 rCode.oninput=()=>{rCode.value=rCode.value.toUpperCase().replace(/[^A-Z]/g,'')};
 try{const q=new URLSearchParams(location.search).get('sala');if(q&&/^[A-Za-z]{4}$/.test(q)){rCode.value=q.toUpperCase();onNote.textContent=srv?'Escribe tu nombre y pulsa Unirse.':onNote.textContent}}catch(e){}
 bCreate.onclick=()=>{unlock();play('click');saveName();createRoom()};
 bJoin.onclick=()=>{unlock();play('click');saveName();joinRoom(rCode.value)};
 bBack.onclick=()=>{unlock();play('click');saveName();const s=savedRoom();if(s)startNet(s.code,false,s.token)};
 const sndLabel=()=>{snd.textContent=isMuted()?'🔇 Sonido: apagado':'🔊 Sonido: activado'};
 pk.innerHTML=ROSTER.map((r,i)=>`<button class="pick" data-me="${i}" type="button" aria-label="Avatar ${i+1}">${roundOf(i)}</button>`).join('');
 const picks=[...pk.children],paintPicks=()=>picks.forEach((b,i)=>b.classList.toggle('on',i==ME));
 const saveName=()=>{PN=nameIn.value.trim().slice(0,12)||'Tú';try{localStorage.setItem('carioca:name',PN)}catch(e){}};
 nameIn.value=PN=='Tú'?'':PN;nameIn.oninput=saveName;
 cont.hidden=!saved;$('#saveNote').hidden=!saved;nw.classList.toggle('gold',!saved);
 paintPicks();sndLabel();pk.scrollTop=Math.max(0,picks[ME].offsetTop-pk.clientHeight/3);
 openHome=()=>{backBtn();const sv=hasSave();cont.hidden=!sv;$('#saveNote').hidden=!sv;nw.classList.toggle('gold',!sv);nameIn.value=PN=='Tú'?'':PN;paintPicks();sndLabel();home.classList.add('skip','menu-on');home.classList.remove('out');document.body.classList.remove('ingame')};
 menuTimer=setTimeout(showMenu,2600);
 home.addEventListener('click',e=>{if(!home.classList.contains('menu-on')&&!e.target.closest('.menu')){home.classList.add('skip');showMenu()}});
 pk.onclick=ev=>{const b=ev.target.closest('.pick');if(!b)return;ME=+b.dataset.me;try{localStorage.setItem('carioca:avatar',ME)}catch(e){}unlock();play('click');paintPicks()};
 snd.onclick=()=>{unlock();setMuted(!isMuted());play('click');sndLabel()};
 nw.onclick=()=>{unlock();play('click');saveName();leave();newGame()};
 const fresh=()=>{try{localStorage.removeItem(SAVE)}catch(e){}leave();saveName();newGame()};
 cont.onclick=()=>{unlock();play('click');
  if(!restore())return fresh();
  SESSION++;leave();
  try{if(G.phase=='bots'){G.turn=(G.pend+G.n-1)%G.n;advance()}else{startTurn();render()}}catch(e){fresh()}}}
function askExit(){G.confirmExit=1;render()}
function keepPlaying(){G.confirmExit=0;render()}
// guarda lo que se pueda y vuelve al menú principal
function exitMenu(){if(NET)return leaveRoom();SESSION++;stopTurn();G.confirmExit=0;G.showScore=0;persist();openHome()}
function abandon(){if(NET)return leaveRoom();SESSION++;stopTurn();try{localStorage.removeItem(SAVE)}catch(e){}G.confirmExit=0;G.showScore=0;openHome()}
function newGame(){SESSION++;try{localStorage.removeItem(SAVE)}catch(e){}G={round:0,scores:[],sort:true,log:[]};setBots(pickBots(DIFF,ME,NB));setMe();start()}
initHome();
try{if(/[?&]debug\b/.test(location.search))window.__G=()=>G}catch(e){} // solo para pruebas: ?debug
let rz=0;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{if(G.hands&&!G.showScore)render()},150)});
if(navigator.serviceWorker)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js'));
['gesturestart','gesturechange','gestureend'].forEach(t=>document.addEventListener(t,e=>e.preventDefault()));
