// Simulación de partidas completas entre bots para medir balance: node tools/sim.js [partidas]
import {mkDeck,CON,pts,solve,rm,classify} from '../src/engine.js';
import {botPlay,deckDraw,attachAll} from '../src/bots.js';
const N=+process.argv[2]||60;
// Bot básico (versión anterior) para comparar
function basico(S,p){let lay=0,h=S.hands[p];const req=[...CON[S.round]].sort((a,b)=>b-a),top=S.disc[S.disc.length-1];
 if(!S.down[p]&&top&&solve([...h,top],req))h.push(S.disc.pop());else{const c=deckDraw(S);if(!c)return{out:false};h.push(c)}
 if(!S.down[p]){const s=solve(h,req);if(s){S.melds[p]=s.map(m=>classify(m,m.st0));s.forEach(m=>h=rm(h,m));S.down[p]=1;lay=1}}
 if(S.down[p]&&!lay)h=attachAll(S.melds.flat(),h);
 S.hands[p]=h;if(!h.length)return{out:true};
 const sc=c=>c.r==0?9999:h.reduce((a,o)=>o===c?a:a+(o.r==c.r?3:0)+(o.s==c.s&&o.r!=c.r&&Math.abs(o.r-c.r)<=2?2:0),0)*100-pts(c.r);
 let w=h[0];h.forEach(c=>{if(sc(c)<sc(w))w=c});S.hands[p]=rm(h,[w]);S.disc.push(w);return{out:!S.hands[p].length}}
function jugarRonda(round,fns){const d=mkDeck(),S={round,hands:[0,1,2].map(()=>d.splice(0,12)),deck:d,disc:[],down:[0,0,0],melds:[[],[],[]],taken:[[],[],[]],reshuf:0};
 S.disc=[S.deck.pop()];let p=round%3;
 for(let t=0;t<400;t++){const r=fns[p](S,p);if(r.out)return{S,w:p,t,stall:false};if(S.reshuf>=2)break;p=(p+1)%3}
 return{S,w:-1,t:400,stall:true}}
function juego(fns,st){const tot=[0,0,0];for(let r=0;r<10;r++){const R=jugarRonda(r,fns);
  R.S.hands.forEach((h,i)=>tot[i]+=h.reduce((a,c)=>a+pts(c.r),0));
  st.turnos[r]+=R.stall?0:R.t/3;st.n[r]+=R.stall?0:1;st.stall[r]+=R.stall?1:0;if(R.w>=0)st.sale[R.w]++}
 const m=Math.min(...tot),gan=tot.map(x=>x==m);gan.forEach((g,i)=>{if(g)st.gana[i]+=1/gan.filter(Boolean).length});tot.forEach((x,i)=>st.pts[i]+=x)}
function correr(nombre,fns){const st={gana:[0,0,0],pts:[0,0,0],sale:[0,0,0],turnos:Array(10).fill(0),n:Array(10).fill(0),stall:Array(10).fill(0)};
 const t0=Date.now();for(let g=0;g<N;g++)juego(fns,st);
 console.log(`\n== ${nombre} (${N} partidas, ${((Date.now()-t0)/1000).toFixed(0)}s)`);
 console.log('Victorias % [asiento0, Ana, Beto]:',st.gana.map(x=>(100*x/N).toFixed(0)).join(' / '));
 console.log('Puntos promedio por partida:',st.pts.map(x=>(x/N).toFixed(0)).join(' / '));
 console.log('Rondas ganadas (salir):',st.sale.join(' / '));
 console.log('Turnos por jugador hasta salir, por ronda:',st.turnos.map((t,i)=>st.n[i]?(t/st.n[i]).toFixed(0):'-').join(' '));
 console.log('Rondas sin ganador (mazo agotado) %:',st.stall.map(s=>(100*s/N).toFixed(0)).join(' '))}
const exp=(S,p)=>botPlay(S,p),old=basico;
const modo=process.argv[3]||'todo';
if(modo=='todo'){correr('Todos expertos',[exp,exp,exp]);
 correr('Experto (Ana) contra 2 básicos',[old,exp,old]);
 correr('Experto (Beto) contra 2 básicos',[old,old,exp])}
