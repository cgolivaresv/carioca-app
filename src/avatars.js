// Avatares ilustrados en SVG (sin imágenes). Cada uno dibuja un busto dentro de un círculo.
const GOLD='#e6c35c';
let bare=false; // true: busto recortado, sin fondo ni círculo (para pararlo sobre la mesa)
const wrap=(id,c1,c2,body)=>bare?`<svg viewBox="0 0 100 100" aria-hidden="true">${body}</svg>`:`<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient><clipPath id="k${id}"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#k${id})"><rect width="100" height="100" fill="url(#g${id})"/><ellipse cx="50" cy="100" rx="46" ry="22" fill="#000" opacity=".25"/>${body}</g></svg>`;
function woman(id,{skin,shade,hair,dress,lips,c1,c2,long=true,gem=GOLD}){
 const back=long?`<path d="M24 50Q18 12 50 10Q82 12 76 50Q80 78 70 98L30 98Q20 78 24 50Z" fill="${hair}"/>`
  :`<path d="M25 48Q20 14 50 11Q80 14 75 48Q77 62 71 70Q60 66 50 66Q40 66 29 70Q23 62 25 48Z" fill="${hair}"/>`;
 return wrap(id,c1,c2,`${back}
 <rect x="43" y="56" width="14" height="20" rx="6" fill="${shade}"/>
 <path d="M8 100Q10 76 36 71L50 78L64 71Q90 76 92 100Z" fill="${dress}"/>
 <path d="M39 72L50 91L61 72Q50 80 39 72Z" fill="${skin}"/>
 <path d="M38 72Q50 86 62 72" stroke="${gem}" stroke-width="1.4" fill="none"/><circle cx="50" cy="83" r="2.2" fill="${gem}"/>
 <ellipse cx="50" cy="42" rx="16.5" ry="20" fill="${skin}"/>
 <ellipse cx="40" cy="50" rx="4.2" ry="2.3" fill="#e07a86" opacity=".35"/><ellipse cx="60" cy="50" rx="4.2" ry="2.3" fill="#e07a86" opacity=".35"/>
 <path d="M32 42Q30 16 52 15Q72 16 68 42Q64 28 50 27Q38 28 32 42Z" fill="${hair}"/>
 <path d="M33 40Q30 52 33 64" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
 <path d="M67 40Q70 52 67 64" stroke="${hair}" stroke-width="4.5" fill="none" stroke-linecap="round"/>
 <ellipse cx="43" cy="42.5" rx="3.2" ry="2" fill="#fff"/><circle cx="43.3" cy="42.5" r="1.45" fill="#2b1a14"/>
 <ellipse cx="57" cy="42.5" rx="3.2" ry="2" fill="#fff"/><circle cx="57.3" cy="42.5" r="1.45" fill="#2b1a14"/>
 <path d="M39 40.8Q43 38 47.2 40.6M52.8 40.6Q57 38 61 40.8" stroke="#140b09" stroke-width="1.4" fill="none" stroke-linecap="round"/>
 <path d="M39 36.6Q43 34.4 47 36.4M53 36.4Q57 34.4 61 36.6" stroke="${hair}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
 <path d="M50 44Q51.8 48.5 49.6 49.4" stroke="#b9805f" stroke-width=".9" fill="none" stroke-linecap="round"/>
 <path d="M43.4 54.2Q47 52 50 53.6Q53 52 56.6 54.2Q50 60.4 43.4 54.2Z" fill="${lips}"/>
 <circle cx="33" cy="51" r="1.8" fill="${gem}"/><circle cx="67" cy="51" r="1.8" fill="${gem}"/>
 <path d="M33 52.5V57M67 52.5V57" stroke="${gem}" stroke-width=".9"/>`)}
function man(id,{skin,shade,hair,jacket,c1,c2,beard=true,shades=false}){
 return wrap(id,c1,c2,`<rect x="43" y="56" width="14" height="20" rx="6" fill="${shade}"/>
 <path d="M6 100Q8 76 36 70L50 79L64 70Q92 76 94 100Z" fill="${jacket}"/>
 <path d="M41 71L50 90L59 71L50 78Z" fill="#101016"/><path d="M44 74L50 84L56 74Z" fill="${skin}"/>
 <path d="M42 73Q50 85 58 73" stroke="${GOLD}" stroke-width="1.6" fill="none"/>
 <ellipse cx="50" cy="42" rx="16.5" ry="20.5" fill="${skin}"/>
 ${beard?`<path d="M34 47Q36 67 50 67Q64 67 66 47Q64 57 50 58Q36 57 34 47Z" fill="#20150f" opacity=".6"/>`:''}
 <path d="M32 41Q27 11 52 11Q75 12 68 41Q66 27 50 24Q38 26 32 41Z" fill="${hair}"/>
 <path d="M36 27Q48 12 68 24" stroke="${hair}" stroke-width="3" fill="none" stroke-linecap="round"/>
 ${shades?`<path d="M35 40H65" stroke="#0b0b10" stroke-width="1.6"/><rect x="35.5" y="38" width="12.5" height="7.5" rx="3" fill="#0b0b10"/><rect x="52" y="38" width="12.5" height="7.5" rx="3" fill="#0b0b10"/><path d="M37 40l4 0" stroke="#7ac7ff" stroke-width=".9" opacity=".7"/>`
 :`<ellipse cx="43" cy="42" rx="3" ry="1.9" fill="#fff"/><circle cx="43.3" cy="42" r="1.4" fill="#1d130e"/><ellipse cx="57" cy="42" rx="3" ry="1.9" fill="#fff"/><circle cx="57.3" cy="42" r="1.4" fill="#1d130e"/>
 <path d="M38.5 37.6Q43 35.3 47.4 37.4M52.6 37.4Q57 35.3 61.5 37.6" stroke="${hair}" stroke-width="2" fill="none" stroke-linecap="round"/>`}
 <path d="M50 44Q51.8 49 49.6 50" stroke="#a8704f" stroke-width=".9" fill="none" stroke-linecap="round"/>
 <path d="M44.5 55.4Q50 59 55.8 54.6" stroke="#6e3326" stroke-width="1.5" fill="none" stroke-linecap="round"/>
 <circle cx="66.5" cy="49" r="1.3" fill="${GOLD}"/>`)}
const ANA={skin:'#ecbca0',shade:'#d79e82',hair:'#5a1a2a',dress:'#15131c',lips:'#c2123b',c1:'#6a1b86',c2:'#e0247f'};
const BETO={skin:'#c78d6a',shade:'#a9704f',hair:'#14100e',jacket:'#1b1b24',c1:'#b8741a',c2:'#4d1a0e'};
const EL={skin:'#e3ad86',shade:'#c98f69',hair:'#3a2819',jacket:'#5b1224',c1:'#1b6fb0',c2:'#0a2a4f',beard:false,shades:true};
const ELLA={skin:'#f2c9ab',shade:'#dcad8d',hair:'#d8b36a',dress:'#0e2a4c',lips:'#d81b60',c1:'#1b6fb0',c2:'#0a2a4f',long:false};
const build=()=>[woman('a',ANA),man('b',BETO),man('m',EL),woman('f',ELLA)];
// Redondos (para el inicio) y bustos recortados (para la mesa)
bare=false;const [ra,rb,rm,rf]=build();
bare=true;const [ba,bb,bm,bf]=build();
export const AV_ANA=ra,AV_BETO=rb,AV_ME=[rm,rf];
export const BU_ANA=ba,BU_BETO=bb,BU_ME=[bm,bf];
