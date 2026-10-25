// Dirección del servidor multijugador (el Worker de Cloudflare, ver wrangler.toml y worker/).
// Mientras esté vacía, el botón "Jugar en línea" aparece desactivado.
export const SERVER_DEFAULT='';
// Para probar en tu computador se puede abrir la página con ?server=http://localhost:8787 (solo se acepta localhost)
export const serverUrl=()=>{
 try{const q=new URLSearchParams(location.search).get('server');if(q&&/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(q))return q}catch(e){}
 return SERVER_DEFAULT};
