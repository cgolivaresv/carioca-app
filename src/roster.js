// Catálogo central de jugadores: nombre, género, imágenes de cada avatar y niveles de dificultad.
// Los 10 avatares son PNG/WebP transparentes en avatars/busts (mesa) y avatars/portraits (selector).
// Si una imagen no carga, se dibuja un avatar SVG de respaldo (src/avatars.js).
import {makeBust,makeRound} from './avatars.js';
// err: probabilidad de jugar mal (descartar al azar, no tomar una carta útil) · lazy: probabilidad de no bajarse aunque pueda
export const LEVELS={
 'Fácil':{danger:1,spec:.4,err:.35,lazy:.35},
 'Normal':{danger:4,spec:.15,err:.12,lazy:.1},
 'Difícil':{danger:6,spec:.08,err:.03,lazy:0},
 'Experto':{danger:8,spec:0,err:0,lazy:0}
};
export const LEVEL_NAMES=Object.keys(LEVELS);
export const DIFF_CHOICES=[...LEVEL_NAMES,'Aleatoria'];
// Aspectos SVG de respaldo (6 femeninos y 6 masculinos, se reparten entre los 10)
const bg={c1:'#444',c2:'#222'};
const W=o=>({...bg,gem:'#e6c35c',...o}),M=o=>({...bg,beard:false,shades:false,...o});
const FB_F=[
 W({skin:'#ecbca0',hair:'#5a1a2a',dress:'#15131c',lips:'#c2123b',long:true}),
 W({skin:'#d9a07e',hair:'#0f0b0d',dress:'#8d1230',lips:'#b3122f',long:true}),
 W({skin:'#e8b794',hair:'#6b3f22',dress:'#0e5a45',lips:'#c4455a',long:false}),
 W({skin:'#f3cdb0',hair:'#e3c27c',dress:'#1b2d57',lips:'#d1365a',long:true}),
 W({skin:'#eac2a4',hair:'#8f3a1d',dress:'#4b1f6e',lips:'#b81d4b',long:false}),
 W({skin:'#a8714e',hair:'#17100d',dress:'#b88a2a',lips:'#9c1c3d',long:true})
];
const FB_M=[
 M({skin:'#c78d6a',hair:'#14100e',jacket:'#1b1b24',beard:true}),
 M({skin:'#e6b48e',hair:'#4a3220',jacket:'#2b2f3a'}),
 M({skin:'#9a6644',hair:'#0e0b09',jacket:'#5b1224',beard:true}),
 M({skin:'#efc6a2',hair:'#d9b970',jacket:'#1d3557',shades:true}),
 M({skin:'#d9a58a',hair:'#b9bcc2',jacket:'#111116',beard:true}),
 M({skin:'#c98a64',hair:'#2a1a12',jacket:'#0f3d3a',beard:true,shades:true})
];
// [nombre, género, ancho y alto del busto recortado]; el orden es avatar-01 … avatar-10
const LIST=[
 ['Valentina','f',253,384],['Dakota','f',250,384],['Renata','f',241,384],['Fiona','f',294,384],['Luna','f',235,384],
 ['Santiago','m',275,384],['Ricardo','m',252,384],['Joaquín','m',255,384],['Aurelio','m',289,384],['Mateo','m',306,384]
];
let nf=0,nm=0;
export const ROSTER=LIST.map(([name,g,w,h],i)=>{
 const id='avatar-'+String(i+1).padStart(2,'0'),fb=g=='f'?FB_F[nf++%6]:FB_M[nm++%6];
 return {id,name,g,w,h,fb,
  bust:`avatars/busts/${id}.png`,bustWebp:`avatars/busts/${id}.webp`,
  portrait:`avatars/portraits/${id}.png`,portraitWebp:`avatars/portraits/${id}.webp`};
});
const pic=(webp,png,w,h,i,kind,cls,lazy)=>`<picture><source type="image/webp" srcset="${webp}"><img class="${cls}" src="${png}" width="${w}" height="${h}" alt="" decoding="${lazy?'async':'sync'}"${lazy?' loading="lazy"':''} draggable="false" data-av="${i}" data-kind="${kind}" onerror="avFail(this)"></picture>`;
// Busto para la mesa (transparente, se escala por altura) y retrato cuadrado para el selector
export const bustOf=i=>{const r=ROSTER[i];return pic(r.bustWebp,r.bust,r.w,r.h,i,'bust','avimg',false)};
export const roundOf=i=>{const r=ROSTER[i];return pic(r.portraitWebp,r.portrait,160,160,i,'portrait','pimg',true)};
// Respaldo SVG si una imagen falla
export const fallbackBust=i=>makeBust(ROSTER[i].g,{...ROSTER[i].fb,id:'fb'+i});
export const fallbackRound=i=>makeRound(ROSTER[i].g,{...ROSTER[i].fb,id:'fr'+i});
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
// Elige `count` rivales (1 a 4) al azar, distintos entre sí y del avatar del jugador; con 'Aleatoria' cada uno recibe un nivel al azar
export function pickBots(level,exclude=-1,count=2){
 const ids=shuffle(ROSTER.map((_,i)=>i).filter(i=>i!==exclude)).slice(0,Math.max(1,Math.min(4,count|0))),lv=()=>level==='Aleatoria'||!LEVELS[level]?LEVEL_NAMES[Math.random()*LEVEL_NAMES.length|0]:level;
 return [null,...ids.map(id=>({id,lvl:lv()}))]}
