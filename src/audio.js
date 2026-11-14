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
 lose:t=>[392,330,262].forEach((f,i)=>tone(f,t+i*.16,.5,{type:'triangle',vol:.12})),
 // un sonido por avatar del selector, a juego con su acción (fx.js)
 av1:t=>{tone(1318,t,.35,{vol:.09});tone(1760,t+.06,.4,{vol:.06})},
 av2:t=>{tone(900,t,.04,{type:'square',vol:.05});tone(1200,t+.09,.05,{type:'square',vol:.05});tone(1500,t+.2,.25,{type:'triangle',vol:.06})},
 av3:t=>{tone(220,t,.7,{vol:.1,slide:40});tone(330,t,.7,{vol:.05})},
 av4:t=>hiss(t,.35,{f:800,f2:5000,type:'bandpass',q:1.2,vol:.2}),
 av5:t=>[523,659,784].forEach((f,i)=>tone(f,t+i*.14,.22,{type:'triangle',vol:.09})),
 av6:t=>{hiss(t,.2,{f:3500,f2:300,type:'lowpass',vol:.5});tone(90,t,.28,{vol:.3,slide:-50})},
 av7:t=>hiss(t,.28,{f:1200,f2:2600,type:'bandpass',q:.6,vol:.14}),
 av8:t=>{tone(2400,t,.18,{vol:.07});tone(3100,t+.04,.25,{vol:.05});tone(2400,t+.2,.15,{vol:.06})},
 av9:t=>{hiss(t,.7,{f:900,f2:300,type:'lowpass',vol:.18});tone(110,t,.6,{vol:.05})},
 av10:t=>{tone(330,t,.13,{type:'triangle',vol:.1,slide:-60});tone(294,t+.17,.22,{type:'triangle',vol:.09,slide:-40})},
 hov:t=>tone(2000,t,.03,{vol:.03}),
 pop:t=>tone(700,t,.1,{type:'triangle',vol:.09,slide:520}),
 fanfare:t=>{[523,659,784,1047,1319].forEach((f,i)=>tone(f,t+i*.11,.6,{type:'triangle',vol:.13}));[523,784,1047].forEach(f=>tone(f,t+.6,1.1,{vol:.09}))},
 sad:t=>[392,349,311,262].forEach((f,i)=>tone(f,t+i*.2,.55,{type:'triangle',vol:.11}))
};
export function play(n){if(muted)return;const c=init();if(!c||!S[n])return;if(c.state=='suspended')c.resume();try{S[n](c.currentTime+.01)}catch(e){}}
