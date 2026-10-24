// Sonidos sintetizados con Web Audio (sin archivos). Se activan con el primer toque del usuario.
let ctx=null,master=null,noise=null,muted=false;
try{muted=localStorage.getItem('carioca:mute')=='1'}catch(e){}
function init(){if(ctx)return ctx;const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
 ctx=new A();master=ctx.createGain();master.gain.value=muted?0:.8;master.connect(ctx.destination);
 const n=ctx.sampleRate*.4|0,b=ctx.createBuffer(1,n,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;noise=b;return ctx}
export function unlock(){const c=init();if(c&&c.state=='suspended')c.resume()}
export const isMuted=()=>muted;
export function setMuted(m){muted=m;try{localStorage.setItem('carioca:mute',m?'1':'0')}catch(e){}if(master)master.gain.value=m?0:.8}
function tone(f,t0,dur,{type='sine',vol=.2,slide=0,att=.005}={}){const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t0);
 if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t0+dur);
 g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(vol,t0+att);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 o.connect(g);g.connect(master);o.start(t0);o.stop(t0+dur+.02)}
function hiss(t0,dur,{f=3000,f2=0,q=.7,vol=.25,type='highpass'}={}){const s=ctx.createBufferSource(),fl=ctx.createBiquadFilter(),g=ctx.createGain();
 s.buffer=noise;fl.type=type;fl.frequency.setValueAtTime(f,t0);if(f2)fl.frequency.exponentialRampToValueAtTime(f2,t0+dur);fl.Q.value=q;
 g.gain.setValueAtTime(vol,t0);g.gain.exponentialRampToValueAtTime(.0001,t0+dur);
 s.connect(fl);fl.connect(g);g.connect(master);s.start(t0,Math.random()*.2);s.stop(t0+dur+.02)}
const S={
 flip:t=>hiss(t,.09,{f:2500,f2:6000,vol:.22}),
 draw:t=>{hiss(t,.12,{f:1800,f2:5000,vol:.25});tone(180,t,.08,{type:'triangle',vol:.06})},
 discard:t=>{hiss(t,.07,{f:3500,vol:.18});tone(140,t+.02,.1,{vol:.22,slide:-60})},
 select:t=>tone(880,t,.05,{type:'triangle',vol:.08}),
 click:t=>tone(520,t,.06,{type:'triangle',vol:.1}),
 deal:t=>{for(let i=0;i<6;i++)hiss(t+i*.07,.07,{f:2500,f2:6000,vol:.18})},
 lay:t=>{[523,659,784].forEach((f,i)=>tone(f,t+i*.07,.35,{type:'triangle',vol:.12}));hiss(t,.1,{f:2000,vol:.18})},
 down:t=>[392,523,659,784].forEach((f,i)=>tone(f,t+i*.08,.45,{type:'triangle',vol:.13})),
 error:t=>tone(160,t,.22,{type:'sawtooth',vol:.1,slide:-40}),
 turn:t=>{tone(660,t,.25,{vol:.1});tone(990,t+.08,.3,{vol:.07})},
 tick:t=>tone(1200,t,.04,{type:'square',vol:.05}),
 win:t=>[523,659,784,1047].forEach((f,i)=>tone(f,t+i*.12,.5,{type:'triangle',vol:.14})),
 lose:t=>[392,330,262].forEach((f,i)=>tone(f,t+i*.16,.5,{type:'triangle',vol:.12}))
};
export function play(n){if(muted)return;const c=init();if(!c||!S[n])return;if(c.state=='suspended')c.resume();try{S[n](c.currentTime+.01)}catch(e){}}
