// Efectos compartidos (web, móvil y escritorio): confeti, avatares con acciones, reacciones y cierre de partida.
// No toca el estado del juego: solo observa el DOM. Todo lo que crea vive fuera de #app (el juego lo repinta y borraría lo ajeno).
// Regla de batería (ver README): nada infinito; las animaciones son de un solo disparo.
import {play,unlock} from './audio.js';

const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover=matchMedia('(hover:hover)').matches;
const wide=()=>matchMedia('(min-width:640px)').matches;
const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const idx=el=>Array.prototype.indexOf.call(el.parentNode.children,el)+1;

// Modo de juego: el estado real está dentro del juego (no accesible), así que se deduce de lo último que elegiste en el menú.
let mode='bots';
const online=()=>mode==='online';
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('#bCreate,#bJoin,#bBack,#bNew,#bCont');if(b)mode=(b.id==='bNew'||b.id==='bCont')?'bots':'online'},true);
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='rCode')mode='online'},true);
addEventListener('pointerdown',unlock,true);addEventListener('keydown',unlock,true);

/* ---------- Confeti (física por tiempo real: igual a 60, 120 o 180 Hz) ---------- */
const COLORS=['#f7e4a0','#e6c35c','#ffffff','#d4264f','#7a4dff','#2ec85a'];
export function confetti(){
 if(reduce||$('#dk-confetti'))return;
 const cv=document.createElement('canvas'),dpr=window.devicePixelRatio||1;
 cv.id='dk-confetti';cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:500;pointer-events:none';
 cv.width=innerWidth*dpr;cv.height=innerHeight*dpr;document.body.appendChild(cv);
 const g=cv.getContext('2d');g.scale(dpr,dpr);
 const W=innerWidth,H=innerHeight,parts=[],n=W<640?110:170;
 for(let i=0;i<n;i++){const left=i%2===0,a=(left?-62:-118)*Math.PI/180+(Math.random()-.5)*.7,v=(11+Math.random()*13)*Math.min(1,W/900+.35);
  parts.push({x:left?W*.12:W*.88,y:H*.92,vx:Math.cos(a)*v,vy:Math.sin(a)*v,w:6+Math.random()*7,h:3+Math.random()*5,r:Math.random()*6.28,vr:(Math.random()-.5)*.45,c:pick(COLORS)})}
 const t0=performance.now();let prev=t0;
 (function step(t){const el=t-t0,k=Math.min(3,Math.max(0,(t-prev)/16.667)),drag=Math.pow(.992,k);prev=t;
  g.clearRect(0,0,W,H);
  for(const p of parts){p.vy+=.34*k;p.vx*=drag;p.vy*=drag;p.x+=p.vx*k;p.y+=p.vy*k;p.r+=p.vr*k;
   g.save();g.globalAlpha=Math.max(0,Math.min(1,(4200-el)/1200));g.translate(p.x,p.y);g.rotate(p.r);
   g.fillStyle=p.c;g.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)*.8+.2));g.restore()}
  if(el<4200)requestAnimationFrame(step);else cv.remove()})(t0)}
window.__dkConfetti=confetti;

/* ---------- Selector de personaje ---------- */
// acción del retrato: animación propia + destello + sonido (al tocar, o sola en reposo)
function act(p,sound){
 const pic=p.querySelector('picture');if(!pic||reduce)return;
 pic.style.animation=`dkA${idx(p)} 1s ease-in-out both`;p.classList.add('dk-act');
 if(sound)play('av'+idx(p));
 pic.addEventListener('animationend',()=>{pic.style.animation=''},{once:true});
 setTimeout(()=>p.classList.remove('dk-act'),900)}
if(!canHover)document.addEventListener('click',e=>{const p=e.target.closest&&e.target.closest('.picks .pick');if(p)act(p,true)}); // tras el onclick del juego (ya desbloqueó el audio)
if(canHover){
 const look=(p,e)=>{const r=p.getBoundingClientRect();p.style.setProperty('--mx',(((e.clientX-r.left)/r.width)*2-1).toFixed(2));p.style.setProperty('--my',(((e.clientY-r.top)/r.height)*2-1).toFixed(2))};
 document.addEventListener('mousemove',e=>{const p=e.target.closest&&e.target.closest('.picks .pick');if(p)look(p,e)},{passive:true});
 document.addEventListener('mouseout',e=>{const p=e.target.closest&&e.target.closest('.picks .pick');if(p&&!p.contains(e.relatedTarget)){p.style.setProperty('--mx',0);p.style.setProperty('--my',0)}},{passive:true});
 document.addEventListener('mouseover',e=>{const t=e.target;if(!t||!t.closest)return;
  const p=t.closest('.picks .pick');
  if(p){if(!p.contains(e.relatedTarget))play('av'+idx(p));return}
  if(wide()){const b=t.closest('.act:not(:disabled), .hbtn, .chip');if(b&&!b.contains(e.relatedTarget))play('hov')}},{passive:true})}
// en reposo, de vez en cuando un retrato hace su acción por su cuenta, como si estuviera vivo
if(!reduce)setInterval(()=>{const h=$('#home');if(!h||h.classList.contains('out')||document.hidden)return;
 const ps=$$('.picks .pick').filter(p=>!p.matches(':hover'));if(ps.length)act(pick(ps),false)},4200);

/* ---------- Reacciones (emojis sobre los avatares) ---------- */
const REPLY={'👏':['👏','😎'],'😏':['😏','😅'],'😡':['😅','😂'],'😂':['😂','😏'],'😎':['😏','👏'],'🔥':['😮','🔥']};
function floatEmoji(av,ch){
 if(!av)return;const r=av.getBoundingClientRect(),e=document.createElement('div');
 e.className='dk-emo';e.textContent=ch;e.style.left=(r.left+r.width/2)+'px';e.style.top=(r.top+r.height*.12)+'px';
 document.body.appendChild(e);setTimeout(()=>e.remove(),2600);play('pop')}
const box=document.createElement('div');
box.id='dk-emotes';
box.innerHTML='<div class="dk-ep" hidden>'+Object.keys(REPLY).map(c=>`<button type="button" data-e="${c}" aria-label="Reaccionar ${c}">${c}</button>`).join('')+
 '</div><button type="button" class="dk-eb" aria-label="Reacciones" title="Reacciones (solo partidas contra bots)">😊</button>';
document.body.appendChild(box);
const panel=$('.dk-ep',box);let lastEmote=0;
box.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.classList.contains('dk-eb')){panel.hidden=!panel.hidden;return}
 const ch=b.dataset.e,now=Date.now();if(!ch||now-lastEmote<1200)return;
 lastEmote=now;panel.hidden=true;floatEmoji($('.hero .av'),ch);
 const rivals=$$('.table .seat .av');
 if(rivals.length&&Math.random()<.7)setTimeout(()=>floatEmoji(pick(rivals),pick(REPLY[ch])),rnd(800,1700))});
document.addEventListener('pointerdown',e=>{if(!panel.hidden&&!box.contains(e.target))panel.hidden=true},true);
function placeEmotes(){
 const av=$('.hero .av'),show=!!av&&wide()&&document.body.classList.contains('ingame')&&!online()&&!$('#dk-final');
 box.style.display=show?'block':'none';if(!show){panel.hidden=true;return}
 const r=av.getBoundingClientRect();
 box.style.left=Math.min(Math.max(8,r.left+r.width/2-17),innerWidth-270)+'px';box.style.top=Math.max(46,r.top-40)+'px'}
// los rivales reaccionan solos al ganar o perder la ronda
const seen={};
function rivalsReact(){$$('.table .seat').forEach((s,i)=>{const k=$('.wl.win',s)?'w':$('.wl.lose',s)?'l':'';
 if(k!==(seen[i]||'')){seen[i]=k;if(k)setTimeout(()=>floatEmoji($('.av',s),k==='w'?pick(['😎','🎉','😏']):pick(['😤','😩','😅'])),rnd(150,600))}})}

/* ---------- Cierre de partida: el ganador, en grande ---------- */
let finalName='';
function finalCheck(){
 const h=$('.modal .sheet h3'),m=h&&/^Fin del juego · gana (.+)$/.exec(h.textContent.trim());let ov=$('#dk-final');
 if(!m){if(ov)ov.remove();finalName='';return}
 if(finalName===m[1])return;finalName=m[1];if(ov)ov.remove();
 const plate=$$('.seat .plate b').find(b=>b.textContent.trim()===m[1]),img=plate&&$('.avimg',plate.closest('.seat')),me=!!plate&&!!plate.closest('.hero');
 ov=document.createElement('div');ov.id='dk-final';
 ov.innerHTML='<div class="dkf-spot"></div><div class="dkf-who"><div class="crown">👑</div>'+(img?`<img alt="" src="${img.currentSrc||img.src}">`:'')+'<b>CAMPEÓN</b><span></span></div>';
 $('span',ov).textContent=m[1];document.body.appendChild(ov);
 if(me){play('fanfare');confetti()}else play('sad')}

/* ---------- Observador del juego ---------- */
const app=$('#app');
if(app){
 let won=false,raf=0;
 const check=()=>{const w=!!$('.hero .wl.win');if(w&&!won)confetti();won=w;rivalsReact();finalCheck();placeEmotes()};
 const soon=()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(check)};
 window.__dkCheck=check;
 new MutationObserver(soon).observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 new MutationObserver(soon).observe(document.body,{attributes:true,attributeFilter:['class']});
 addEventListener('resize',soon);check()}
