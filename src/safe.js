// Utilidades de seguridad: escapar texto antes de ponerlo en innerHTML y validar una partida guardada.

// Escapa texto de usuario (p. ej. el nombre del jugador) para insertarlo como HTML.
const ENT={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>ENT[c]);

const isCard=c=>!!c&&Number.isInteger(c.id)&&Number.isInteger(c.r)&&c.r>=0&&c.r<=13&&Number.isInteger(c.s)&&c.s>=-1&&c.s<=3;
const cards=a=>Array.isArray(a)&&a.every(isCard);
const isMeld=m=>!!m&&typeof m.k=='string'&&cards(m.cs)&&Number.isInteger(m.len);
const PHASES=['draw','play','roundEnd','bots'];

// Comprueba que un objeto leído de localStorage tiene la forma de una partida guardada.
// Si no, restaurarla rompería la pantalla y "Continuar" quedaría inutilizable.
export function validSave(s){
 if(!s||typeof s!='object'||s.v!==1)return false;
 if(!Number.isInteger(s.round)||s.round<0||s.round>9)return false;
 if(!PHASES.includes(s.phase))return false;
 if(s.phase=='bots'&&!(Number.isInteger(s.pend)&&s.pend>=0&&s.pend<=2))return false;
 if(!Array.isArray(s.hands)||s.hands.length!==3||!s.hands.every(cards))return false;
 if(!cards(s.deck)||!cards(s.disc))return false;
 if(!Array.isArray(s.melds)||s.melds.length!==3||!s.melds.every(pl=>Array.isArray(pl)&&pl.every(isMeld)))return false;
 if(!Array.isArray(s.down)||s.down.length!==3)return false;
 if(!Array.isArray(s.taken)&&s.taken!==undefined)return false;
 if(s.staged!==undefined&&!(Array.isArray(s.staged)&&s.staged.every(isMeld)))return false;
 if(!Array.isArray(s.scores)||!s.scores.every(r=>Array.isArray(r)&&r.length===3&&r.every(Number.isFinite)))return false;
 return true}
