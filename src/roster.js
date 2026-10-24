// Jugadores virtuales: nombre, género, aspecto y niveles de dificultad.
import {makeBust} from './avatars.js';
// err: probabilidad de jugar mal (descartar al azar, no tomar una carta útil) · lazy: probabilidad de no bajarse aunque pueda
export const LEVELS={
 'Fácil':{danger:1,spec:.4,err:.35,lazy:.35},
 'Normal':{danger:4,spec:.15,err:.12,lazy:.1},
 'Difícil':{danger:6,spec:.08,err:.03,lazy:0},
 'Experto':{danger:8,spec:0,err:0,lazy:0}
};
export const LEVEL_NAMES=Object.keys(LEVELS);
export const DIFF_CHOICES=[...LEVEL_NAMES,'Aleatoria'];
const bg={c1:'#444',c2:'#222'};
const W=(name,o)=>({name,g:'f',o:{...bg,gem:'#e6c35c',...o}}),M=(name,o)=>({name,g:'m',o:{...bg,beard:false,shades:false,...o}});
export const ROSTER=[
 W('Ana',{skin:'#ecbca0',shade:'#d79e82',hair:'#5a1a2a',dress:'#15131c',lips:'#c2123b',long:true}),
 W('Valentina',{skin:'#d9a07e',shade:'#bf8462',hair:'#0f0b0d',dress:'#8d1230',lips:'#b3122f',long:true}),
 W('Camila',{skin:'#e8b794',shade:'#cf9a78',hair:'#6b3f22',dress:'#0e5a45',lips:'#c4455a',long:false}),
 W('Sofía',{skin:'#f3cdb0',shade:'#dcb092',hair:'#e3c27c',dress:'#1b2d57',lips:'#d1365a',long:true}),
 W('Isabella',{skin:'#eac2a4',shade:'#d2a688',hair:'#8f3a1d',dress:'#4b1f6e',lips:'#b81d4b',long:false}),
 W('Luciana',{skin:'#a8714e',shade:'#8a5a3b',hair:'#17100d',dress:'#b88a2a',lips:'#9c1c3d',long:true}),
 M('Beto',{skin:'#c78d6a',shade:'#a9704f',hair:'#14100e',jacket:'#1b1b24',beard:true}),
 M('Mateo',{skin:'#e6b48e',shade:'#cb966f',hair:'#4a3220',jacket:'#2b2f3a'}),
 M('Santiago',{skin:'#9a6644',shade:'#7f5236',hair:'#0e0b09',jacket:'#5b1224',beard:true}),
 M('Diego',{skin:'#efc6a2',shade:'#d6a982',hair:'#d9b970',jacket:'#1d3557',shades:true}),
 M('Andrés',{skin:'#d9a58a',shade:'#bd8a6f',hair:'#b9bcc2',jacket:'#111116',beard:true}),
 M('Rafael',{skin:'#c98a64',shade:'#ad7050',hair:'#2a1a12',jacket:'#0f3d3a',beard:true,shades:true})
];
const cache=[];
export const bustOf=i=>cache[i]||(cache[i]=makeBust(ROSTER[i].g,{...ROSTER[i].o,id:'r'+i}));
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
// Elige 2 jugadores distintos al azar; con 'Aleatoria' cada uno recibe un nivel distinto al azar
export function pickBots(level){
 const ids=shuffle(ROSTER.map((_,i)=>i)).slice(0,2),lv=()=>level==='Aleatoria'||!LEVELS[level]?LEVEL_NAMES[Math.random()*LEVEL_NAMES.length|0]:level;
 return [null,{id:ids[0],lvl:lv()},{id:ids[1],lvl:lv()}]}
