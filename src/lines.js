// Frases de los bots mientras "piensan": las chicas son cautas y seductoras; los chicos, arriesgados y cancheros.
import {CON} from './engine.js';
import {ROSTER} from './roster.js';
const ANA=['Con calma, cariño… la escala se arma sola.','Ese descarte tuyo me tiene pensando.','¿De verdad tienes el trío, mi vida?','Tengo una carta que te va a doler.','No te apures, disfruto esperar.','Cuidado: tus cartas hablan más que tú.','Esta mano huele a victoria. Y a perfume.','Me encanta cuando dudas al robar.'];
const ANA2=['Déjame mirar bien… esto se pone interesante.','Hmm, ¿y si robo del descarte?','Qué linda mano… lástima que no sea la tuya.','Estoy calculando, cielo. No me apures.','Te veo nervioso. Me gusta.','Una carta más y todo cambia.','Me encanta cuando dudas.','No sé si bajarme o hacerte sufrir.','Tengo un plan, y tú no estás en él.','Paciencia: lo bueno se hace esperar.'];
const BETO2=['Piensa rápido, que yo ya tengo la jugada.','¿Y si me arriesgo? Claro que sí.','Esto es pan comido.','Voy a robarte la noche.','Uy, qué mano más rara… me gusta.','Dejen espacio, que viene el campeón.','Déjame cocinar esta jugada.','Si pierdo, fue apropósito.','Mmm… ¿descarto la buena o la mala?','Ya huelo el miedo en esta mesa.'];
const BETO=['¡Hoy me la juego entera!','Dame ese descarte, no seas tacaño.','Yo no pienso, yo apuesto.','Bájate ya, que me aburro.','Con un comodín soy intocable.','Tranquilo, te dejo ganar… una vez.','Mira cómo te hago sudar.','¿Cartas buenas? Yo tengo mejores.'];
const TRIO=['Tres iguales y la noche es mía.','Un buen trío cambia cualquier noche.','Los tríos siempre me salen bien.'];
const ESCALA=['Una escala bien armada… qué elegancia.','Escalera al cielo, carta por carta.','Sigue la secuencia y ríndete.'];
const SUCIA=['La escala sucia es mi vicio.','Sucia, pero con mucho estilo.'];
const REAL=['Escala real: solo para valientes.','Trece cartas de un palo… ¿te atreves?'];
const ABAJO=['Ya estoy abajo. Ahora a pegar.','Mis combinaciones ya brillan en la mesa.','Abajo y sin miedo. ¿Y tú?'];
const TUABAJO=['Te bajaste… ahora no te me escapes.','Bajaste primero, pero la noche es larga.','Qué rápida jugada. ¿Te quedan cartas?'];
const POCAS=['Me quedan pocas cartas y mucha malicia.','Casi sin cartas… casi gano.','Una más y me despido de la mano.'];
let last='';
const pick=a=>a[Math.random()*a.length|0];
export function phrase(G,p){
 const c=CON[G.round]||[],pool=[...(ROSTER[G.bots[p].id].g=='f'?[...ANA,...ANA2]:[...BETO,...BETO2])];
 if(c.some(n=>n==0))pool.push(...TRIO);
 if(c.some(n=>n>0))pool.push(...ESCALA);
 if(c.includes(-1))pool.push(...SUCIA);
 if(c.includes(-2))pool.push(...REAL);
 if(G.down&&G.down[p])pool.push(...ABAJO,...ABAJO);
 if(G.down&&G.down[0])pool.push(...TUABAJO);
 if(G.hands&&G.hands[p]&&G.hands[p].length<=3)pool.push(...POCAS,...POCAS);
 let s=pick(pool),i=0;while(s==last&&i++<6)s=pick(pool);last=s;return s}
