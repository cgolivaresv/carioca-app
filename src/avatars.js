// Avatares ilustrados en SVG (sin imágenes): bustos con luces y sombras suaves.
// makeBust: busto recortado (para la mesa) · makeRound: dentro de un círculo (para el inicio).
const GOLD='#e6c35c';
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const dark=(c,t)=>mix(c,'#000000',t),light=(c,t)=>mix(c,'#ffffff',t);
let bare=false;
const wrap=(id,defs,body,tone)=>bare
 ?`<svg viewBox="0 0 120 140" aria-hidden="true"><defs>${defs}</defs>${body}</svg>`
 :`<svg viewBox="0 0 120 140" aria-hidden="true"><defs>${defs}<clipPath id="k${id}"><circle cx="60" cy="74" r="66"/></clipPath><radialGradient id="bg${id}" cx=".5" cy=".25" r=".95"><stop offset="0" stop-color="${light(tone,.3)}"/><stop offset="1" stop-color="${dark(tone,.6)}"/></radialGradient></defs><g clip-path="url(#k${id})"><rect width="120" height="140" fill="url(#bg${id})"/>${body}</g></svg>`;
const skinDefs=(id,skin)=>`<radialGradient id="s${id}" cx=".38" cy=".3" r=".9"><stop offset="0" stop-color="${light(skin,.3)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${dark(skin,.2)}"/></radialGradient>`;
const hairDefs=(id,hair)=>`<linearGradient id="h${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light(hair,.28)}"/><stop offset=".3" stop-color="${hair}"/><stop offset="1" stop-color="${dark(hair,.4)}"/></linearGradient>`;
const clothDefs=(id,c)=>`<linearGradient id="c${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light(c,.22)}"/><stop offset="1" stop-color="${dark(c,.5)}"/></linearGradient>`;
const eye=(cx,cy,w,iris,lash,hair)=>`<path d="M${cx-w} ${cy}Q${cx} ${cy-w*.75} ${cx+w} ${cy}Q${cx} ${cy+w*.62} ${cx-w} ${cy}Z" fill="#fff"/><circle cx="${cx}" cy="${cy}" r="${w*.43}" fill="${iris}"/><circle cx="${cx}" cy="${cy}" r="${w*.2}" fill="#0b0605"/><circle cx="${cx+1.2}" cy="${cy-1.2}" r="1" fill="#fff"/><path d="M${cx-w-.5} ${cy+.3}Q${cx} ${cy-w*.95} ${cx+w+.5} ${cy+.3}" stroke="${lash}" stroke-width="${hair?1.7:2}" fill="none" stroke-linecap="round"/>`;
function woman(id,o){
 const {skin,hair,dress,lips,long=true}=o,gem=o.gem||GOLD,sd=dark(skin,.18),iris=o.eye||'#4a2f1e';
 const defs=skinDefs(id,skin)+hairDefs(id,hair)+clothDefs(id,dress);
 const back=long
  ?`<path d="M32 56C25 22 42 6 60 6C80 6 96 22 88 56C91 82 87 106 94 130L26 130C33 106 29 82 32 56Z" fill="url(#h${id})"/>`
  :`<path d="M32 56C25 22 42 6 60 6C80 6 96 22 88 56C91 70 89 84 85 94C74 100 46 100 35 94C31 84 29 70 32 56Z" fill="url(#h${id})"/>`;
 const body=`${back}
 <path d="M50 86L50 106Q60 114 70 106L70 86Z" fill="${sd}"/>
 <path d="M3 140C5 114 28 106 47 102L60 112L73 102C92 106 115 114 117 140Z" fill="url(#c${id})"/>
 <path d="M47 102L60 127L73 102L60 112Z" fill="url(#s${id})"/>
 <path d="M47 102Q60 110 73 102" stroke="${sd}" stroke-width="1.4" fill="none" opacity=".45"/>
 <path d="M45 102Q60 132 75 102" stroke="${gem}" stroke-width="1.2" fill="none"/><circle cx="60" cy="125" r="2.6" fill="${gem}"/><circle cx="59.3" cy="124.3" r=".8" fill="#fff" opacity=".8"/>
 <ellipse cx="35" cy="58" rx="4" ry="7" fill="${skin}"/><ellipse cx="85" cy="58" rx="4" ry="7" fill="${skin}"/>
 <path d="M36 52C34 30 44 16 60 16C76 16 86 30 84 52C83 70 74 90 60 90C46 90 37 70 36 52Z" fill="url(#s${id})"/>
 <ellipse cx="45" cy="67" rx="6.5" ry="3.6" fill="#e0707f" opacity=".24"/><ellipse cx="75" cy="67" rx="6.5" ry="3.6" fill="#e0707f" opacity=".24"/>
 <path d="M35 54C32 28 46 12 62 13C80 14 90 30 85 54C82 40 72 30 58 28C46 30 38 40 35 54Z" fill="url(#h${id})"/>
 <path d="M35 54C31 74 35 92 43 100C43 82 42 66 45 50Z" fill="url(#h${id})"/><path d="M85 54C89 74 85 92 77 100C77 82 78 66 75 50Z" fill="url(#h${id})"/>
 <path d="M46 24Q60 12 76 22" stroke="#fff" stroke-width="2.2" fill="none" opacity=".14" stroke-linecap="round"/>
 ${eye(51,52,7,iris,'#120a08')}${eye(69,52,7,iris,'#120a08')}
 <path d="M43.5 51l-3.2-2.6M76.5 51l3.2-2.6" stroke="#120a08" stroke-width="1.5" stroke-linecap="round"/>
 <path d="M43 44Q50 38.5 58 42.5M62 42.5Q70 38.5 77 44" stroke="${dark(hair,.45)}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
 <path d="M60 55Q58 63 55.5 67Q60 70 64.5 67" stroke="${dark(skin,.3)}" stroke-width="1.3" fill="none" stroke-linecap="round" opacity=".8"/>
 <path d="M51 76Q55.5 72.5 60 74.5Q64.5 72.5 69 76Q64 83 60 83Q56 83 51 76Z" fill="${lips}"/>
 <path d="M51 76Q60 78.6 69 76" stroke="${dark(lips,.4)}" stroke-width=".9" fill="none"/><ellipse cx="60" cy="80.2" rx="3.4" ry="1" fill="#fff" opacity=".28"/>
 <circle cx="35" cy="66" r="2.3" fill="${gem}"/><path d="M35 68V75" stroke="${gem}" stroke-width="1"/><circle cx="35" cy="76" r="1.6" fill="${gem}"/>
 <circle cx="85" cy="66" r="2.3" fill="${gem}"/><path d="M85 68V75" stroke="${gem}" stroke-width="1"/><circle cx="85" cy="76" r="1.6" fill="${gem}"/>`;
 return wrap(id,defs,body,dress)}
function man(id,o){
 const {skin,hair,jacket,beard=false,shades=false}=o,sd=dark(skin,.18),iris=o.eye||'#3b2517',shirt=o.shirt||'#ecebe6';
 const defs=skinDefs(id,skin)+hairDefs(id,hair)+clothDefs(id,jacket)+`<linearGradient id="l${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a4a66"/><stop offset=".5" stop-color="#0c0f16"/><stop offset="1" stop-color="#05060a"/></linearGradient>`;
 const face=`<path d="M35 52C33 30 44 16 60 16C76 16 87 30 85 52C84 72 74 92 60 92C46 92 36 72 35 52Z" fill="url(#s${id})"/>`;
 const body=`<path d="M48 86L48 106Q60 114 72 106L72 86Z" fill="${sd}"/>
 <path d="M0 140C2 112 26 104 46 100L60 112L74 100C94 104 118 112 120 140Z" fill="url(#c${id})"/>
 <path d="M46 100L60 128L74 100L60 112Z" fill="${shirt}"/><path d="M53 104L60 121L67 104Z" fill="url(#s${id})"/>
 <path d="M46 100L33 140L48 140L60 118Z" fill="${dark(jacket,.3)}"/><path d="M74 100L87 140L72 140L60 118Z" fill="${dark(jacket,.3)}"/>
 <path d="M52 104Q60 120 68 104" stroke="${GOLD}" stroke-width="1.5" fill="none"/>
 <ellipse cx="35" cy="58" rx="4.2" ry="7.5" fill="${skin}"/><ellipse cx="85" cy="58" rx="4.2" ry="7.5" fill="${skin}"/>
 ${face}
 ${beard?`<path d="M36 62C37 84 47 97 60 97C73 97 83 84 84 62C82 74 74 83 60 83C46 83 38 74 36 62Z" fill="${dark(hair,.1)}" opacity=".92"/><path d="M50 74.5Q55 70.5 60 72.5Q65 70.5 70 74.5Q65 77 60 76Q55 77 50 74.5Z" fill="${dark(hair,.1)}"/>`:`<path d="M37 66C40 84 50 91 60 91C70 91 80 84 83 66C80 76 72 82 60 82C48 82 40 76 37 66Z" fill="${dark(skin,.35)}" opacity=".16"/>`}
 <path d="M34 54C30 26 44 8 60 8C80 8 92 26 86 54C85 42 80 33 72 29C64 34 52 32 46 29C38 33 35 42 34 54Z" fill="url(#h${id})"/>
 <path d="M44 25Q60 8 82 23" stroke="#fff" stroke-width="3" fill="none" opacity=".16" stroke-linecap="round"/>
 ${shades
  ?`<path d="M40 48Q40 58 50 59Q59 58 59 48Q50 45 40 48Z" fill="url(#l${id})" stroke="${GOLD}" stroke-width="1"/><path d="M61 48Q61 58 70 59Q80 58 80 48Q70 45 61 48Z" fill="url(#l${id})" stroke="${GOLD}" stroke-width="1"/><path d="M59 49Q60 47 61 49M40 48L35 47M80 48L85 47" stroke="${GOLD}" stroke-width="1" fill="none"/><path d="M43 50Q47 49 50 51" stroke="#9cc8ff" stroke-width="1.2" fill="none" opacity=".7"/>`
  :`${eye(51,52,6.5,iris,'#120a08',1)}${eye(69,52,6.5,iris,'#120a08',1)}<path d="M42 44.5Q50 40.5 59 44M61 44Q70 40.5 78 44.5" stroke="${dark(hair,.3)}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`}
 <path d="M60 54Q57.5 64 55 68Q60 71 65 68" stroke="${dark(skin,.32)}" stroke-width="1.4" fill="none" stroke-linecap="round" opacity=".85"/>
 <path d="M52 79Q60 83 68 79" stroke="${beard?'#f1c9b0':'#7a3b2c'}" stroke-width="1.9" fill="none" stroke-linecap="round"/>
 <circle cx="85.5" cy="64" r="1.6" fill="${GOLD}"/>`;
 return wrap(id,defs,body,jacket)}
export const makeRound=(kind,o)=>{bare=false;return (kind=='f'?woman:man)(kind+(o.id||''),o)};
export const makeBust=(kind,o)=>{bare=true;const s=(kind=='f'?woman:man)(kind+(o.id||''),o);bare=false;return s};
