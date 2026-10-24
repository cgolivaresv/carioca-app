// Motor del carioca: reglas puras, sin interfaz ni estado global.
let uid=0;
export const SU=['♠','♥','♦','♣'],RK=[0,'A',2,3,4,5,6,7,8,9,10,'J','Q','K'];
export const pts=r=>r==0?25:r==1?15:r>=10?10:5;
export const CON=[[0,0],[4,0],[4,4],[0,0,0],[4,0,0],[4,4,0],[4,4,4],[0,0,0,0],[-1],[-2]];
export const desc=c=>c.map(n=>n==-1?'escala sucia':n==-2?'escala real':n?'escala de '+n:'trío').join(' + ');
export function shuf(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
export function mkDeck(){const d=[];for(let k=0;k<2;k++)for(let s=0;s<4;s++)for(let r=1;r<=13;r++)d.push({id:uid++,s,r});for(let i=0;i<4;i++)d.push({id:uid++,s:-1,r:0});return shuf(d)}
export function classify(cs,pref){
 const nat=cs.filter(c=>c.r),L=cs.length,j=L-nat.length;
 if(L<3||nat.length<2||j>=nat.length)return null;
 if(L==13&&new Set(nat.map(c=>c.r)).size==nat.length){const arr=Array(13).fill(null);nat.forEach(c=>arr[c.r-1]=c);const jk=cs.filter(c=>!c.r),real=!jk.length&&nat.every(c=>c.s==nat[0].s);return{k:real?'R':'S',cs:arr.map(x=>x||jk.shift()),len:13,st:1}}
 if(nat.every(c=>c.r==nat[0].r))return{k:'T',cs:[...nat,...cs.filter(c=>!c.r)],len:L};
 if(L<4||!nat.every(c=>c.s==nat[0].s))return null;
 for(const st of [pref||0,...Array.from({length:13},(_,i)=>i+1)]){if(st<1||L>13)continue;const arr=Array(L).fill(null);let ok=true;
  for(const c of nat){const p=(c.r-st+13)%13;if(p>=L||arr[p]){ok=false;break}arr[p]=c}
  if(ok){const jk=cs.filter(c=>!c.r);return{k:'E',cs:arr.map(x=>x||jk.shift()),len:L,st}}}
 return null}
export function meets(ms,req){if(req[0]<0)return ms.length==1&&(req[0]==-2?ms[0].k=='R':ms[0].k=='S'||ms[0].k=='R');if(ms.length!=req.length)return false;const p=ms.map(m=>m.k=='T'?0:m.len).sort((a,b)=>b-a),r=[...req].sort((a,b)=>b-a);return r.every((n,i)=>n==0?p[i]==0:p[i]>=n)}
export function gen(h,n){const out=[],jk=h.filter(c=>!c.r);
 if(n<0){let m=[];const J=[...jk];
  if(n==-2){for(let s=0;s<4;s++){m=[];for(let r=1;r<=13;r++){const c=h.find(c=>c.s==s&&c.r==r);if(c)m.push(c);else break}if(m.length==13){m.st0=1;out.push(m)}}}
  else{for(let r=1;r<=13;r++){const c=h.find(c=>c.r==r&&!m.includes(c));if(c)m.push(c);else if(J.length)m.push(J.shift());else{m=null;break}}if(m){m.st0=1;out.push(m)}}
  return out}
 if(n==0){const by={};h.filter(c=>c.r).forEach(c=>(by[c.r]=by[c.r]||[]).push(c));
  for(const r in by){const a=by[r];if(a.length>=3)out.push(a.slice(0,3));if(a.length>=2&&jk.length)out.push([a[0],a[1],jk[0]])}}
 else for(let s=0;s<4;s++)for(let st=1;st<=13;st++){const used=new Set(),J=[...jk];let m=[];
  for(let p=0;p<n;p++){const r=(st-1+p)%13+1,c=h.find(c=>c.s==s&&c.r==r&&!used.has(c.id));
   if(c){used.add(c.id);m.push(c)}else if(J.length)m.push(J.shift());else{m=null;break}}
  if(m&&classify(m,st)){m.st0=st;out.push(m)}}
 return out}
export function solve(h,req){if(!req.length)return[];const[n,...rest]=req;
 for(const m of gen(h,n)){const ids=new Set(m.map(c=>c.id)),r=solve(h.filter(c=>!ids.has(c.id)),rest);if(r)return[m,...r]}return null}
export const rm=(h,cs)=>{const ids=new Set(cs.map(c=>c.id));return h.filter(c=>!ids.has(c.id))};
export function sides(m,c){if(m.k=='T'){const a=classify([...m.cs,c]);return a&&a.k=='T'?['t']:[]}
 const su=m.cs.find(x=>x.r).s,nat=m.cs.filter(x=>x.r).length,j=m.len-nat,o=[];
 const ok=r=>c.r?(c.s==su&&c.r==r):j+1<nat;
 if(m.len<13){if(ok((m.st-1+m.len)%13+1))o.push('e');if(ok((m.st+11)%13+1))o.push('s')}return o}
export function put(m,c,sd){if(sd=='t'){Object.assign(m,classify([...m.cs,c]));return}
 if(sd=='e')m.cs=[...m.cs,c];else{m.cs=[c,...m.cs];m.st=(m.st+11)%13+1}m.len++}
