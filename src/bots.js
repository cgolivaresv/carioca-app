// Bots "experimentados": solo usan información pública (su mano, mesa, descarte y lo que otros tomaron del descarte).
import {CON,classify,gen,rm,sides,put,pts,shuf} from './engine.js';
// danger: cuánto evitan regalar cartas que otros buscan · spec: ganas de tomar descarte "por si acaso"
export const STYLES=[{danger:5,spec:.1},{danger:8,spec:0},{danger:2,spec:.3}]; // tú(sim), Ana (cauta), Beto (arriesgado)
const need=req=>req.reduce((a,n)=>a+(n==0?3:n<0?13:n),0),cap=L=>Math.ceil(L/2)-1;
function counts(h){const c=new Array(56).fill(0);let j=0;for(const x of h)x.r?c[x.s*14+x.r]++:j++;return[c,j]}
function cands(c,j,n,hid){const o=[];
 if(n==0){for(let r=1;r<=13;r++){const take=[];let nat=0,hs=0;for(let s=0;s<4;s++){hs+=hid(s,r);const k=Math.min(c[s*14+r],3-nat);if(k){take.push([s*14+r,k]);nat+=k}}
  if(!nat)continue;const ju=Math.min(j,3-nat,nat-1);o.push({cov:nat+ju,w:nat+ju>=3?0:Math.min(hs,6)/3,take,ju})}}
 else if(n>0){for(let s=0;s<4;s++)for(let st=1;st<=13;st++){const take=[];let nat=0,w=0;
  for(let p=0;p<n;p++){const r=(st-1+p)%13+1;if(c[s*14+r]){take.push([s*14+r,1]);nat++}else w+=hid(s,r)}
  if(nat<2)continue;const ju=Math.min(j,n-nat,cap(n));o.push({cov:nat+ju,w:nat+ju>=n?0:w/(n-nat),take,ju})}}
 else if(n==-1){const take=[];for(let r=1;r<=13;r++)for(let s=0;s<4;s++)if(c[s*14+r]){take.push([s*14+r,1]);break}
  const ju=Math.min(j,13-take.length,4);o.push({cov:take.length+ju,w:0,take,ju})}
 else for(let s=0;s<4;s++){const take=[];for(let r=1;r<=13;r++)if(c[s*14+r])take.push([s*14+r,1]);o.push({cov:take.length,w:0,take,ju:0})}
 return o}
function dfs(c,j,req,i,hid){if(i==req.length)return 0;let best=0;
 const cs=cands(c,j,req[i],hid).map(x=>({x,s:x.cov*100+x.w*5})).sort((a,b)=>b.s-a.s).slice(0,3);
 if(!cs.length)return dfs(c,j,req,i+1,hid);
 for(const{x,s}of cs){for(const[k,n]of x.take)c[k]-=n;const r=s+dfs(c,j-x.ju,req,i+1,hid);for(const[k,n]of x.take)c[k]+=n;if(r>best)best=r}return best}
// valor de una mano para un contrato: cartas cubiertas*100 + probabilidad de completar
export const value=(h,req,hid)=>{const[c,j]=counts(h);return dfs(c,j,req,0,hid)};
function allSol(h,req,lim,acc=[],out=[]){if(out.length>=lim)return out;if(!req.length){out.push(acc);return out}
 const[n,...rest]=req;for(const m of gen(h,n)){allSol(rm(h,m),rest,lim,[...acc,m],out);if(out.length>=lim)break}return out}
function planLay(x,h){if(Math.floor(value(h,x.req,x.hid)/100)<need(x.req))return null;
 const sols=allSol(h,x.req,12);if(!sols.length)return null;
 const left=s=>{let r=h;s.forEach(m=>r=rm(r,m));return r.reduce((a,c)=>a+pts(c.r),0)+Math.random()};
 return sols.reduce((b,s)=>left(s)<left(b)?s:b)}
export function attachAll(ms,h){let ch=true;while(ch&&h.length){ch=false;
 for(const c of [...h].sort((a,b)=>!a.r-!b.r)){for(const m of ms){const s=sides(m,c);if(s.length){put(m,c,c.r?s[0]:s[Math.random()*s.length|0]);h=rm(h,[c]);ch=true;break}}if(ch)break}}return h}
export function deckDraw(S){if(!S.deck.length){const t=S.disc.pop();S.deck=shuf(S.disc);S.disc=[t];S.reshuf=(S.reshuf||0)+1}return S.deck.pop()}
function seenOf(S,h){const c=new Array(56).fill(0);for(const x of [...S.disc,...S.melds.flat().flatMap(m=>m.cs),...h])if(x.r)c[x.s*14+x.r]++;return c}
function wantTop(x,h,top){if(!top)return false;if(x.st.err&&Math.random()<x.st.err)return false;
 if(x.down)return x.S.melds.flat().some(m=>sides(m,top).length);
 const v0=value(h,x.req,x.hid),v1=value([...h,top],x.req,x.hid);
 if(v1-v0>=95)return true;
 return top.r&&h.some(c=>c.r==top.r)&&Math.random()<x.st.spec}
function danger(x,c){let d=0;x.S.taken.forEach((t,q)=>{if(q!=x.p)for(const o of t){if(o.r==c.r)d+=1;else if(o.s==c.s&&Math.min((o.r-c.r+13)%13,(c.r-o.r+13)%13)<=2)d+=.5}});return d}
function pickDiscard(x,h){
 if(x.down){const all=x.S.melds.flat(),free=h.filter(c=>c.r&&!all.some(m=>sides(m,c).length)),pool=free.length?free:h.some(c=>c.r)?h.filter(c=>c.r):h;return pool.map(c=>[c,pts(c.r)+Math.random()*.9]).reduce((b,e)=>e[1]>b[1]?e:b)[0]}
 let best=h[0],bs=-1e9;for(const c of h){if(!c.r&&h.length>1)continue;
  const v=value(rm(h,[c]),x.req,x.hid)-x.st.danger*danger(x,c)+pts(c.r)*.05+Math.random()*.9;if(v>bs){bs=v;best=c}}return best}
function randomDiscard(h){const n=h.filter(c=>c.r),p=n.length?n:h;return p[Math.random()*p.length|0]}
// Juega el turno completo del bot p sobre el estado S (misma lógica en la app y en la simulación)
export function botPlay(S,p,log=()=>{},st=STYLES[p]||STYLES[1]){
 let h=S.hands[p],lay=0;const req=[...CON[S.round]].sort((a,b)=>b-a),seen=seenOf(S,h);
 const x={S,p,st,req,down:!!S.down[p],hid:(s,r)=>Math.max(0,2-seen[s*14+r])},top=S.disc[S.disc.length-1];
 let drew='deck',dc=null;
 if(wantTop(x,h,top)){drew='disc';dc=top;S.taken[p].push(top);h.push(S.disc.pop());log(p,'toma del descarte')}
 else{const c=deckDraw(S);if(!c)return{out:false};h.push(c);log(p,'roba del mazo')}
 if(!x.down){const sol=planLay(x,h);if(sol&&!(st.lazy&&Math.random()<st.lazy)){S.melds[p]=sol.map(m=>classify(m,m.st0));sol.forEach(m=>h=rm(h,m));S.down[p]=1;x.down=true;lay=1;log(p,'se baja')}}
 if(x.down&&!lay)h=attachAll(S.melds.flat(),h); // al bajarse no se pega en ese turno
 S.hands[p]=h;if(!h.length)return{out:true,drew,drewCard:dc,laid:!!lay};
 const w=st.err&&Math.random()<st.err?randomDiscard(h):pickDiscard(x,h);S.hands[p]=rm(h,[w]);S.disc.push(w);log(p,'descarta',w);
 return{out:!S.hands[p].length,discard:w,drew,drewCard:dc,laid:!!lay}}
