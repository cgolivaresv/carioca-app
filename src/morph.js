// Actualiza el DOM de `root` para que quede igual a `html` tocando solo lo que cambió.
// Así los nodos que siguen iguales (avatares, globos, barras de tiempo) no se recrean:
// sus imágenes no parpadean y sus animaciones CSS no se reinician en cada redibujado.
// Un elemento con data-keep se deja intacto mientras su data-keep no cambie.
export function morph(root,html){const t=document.createElement('template');t.innerHTML=html;kids(root,t.content)}
function kids(a,b){const bn=b.childNodes;
 for(let i=0;i<bn.length;i++){const o=a.childNodes[i];if(!o)a.appendChild(bn[i].cloneNode(true));else same(o,bn[i])}
 while(a.childNodes.length>bn.length)a.removeChild(a.lastChild)}
function same(o,n){
 if(o.nodeType!==n.nodeType||o.nodeName!==n.nodeName){o.replaceWith(n.cloneNode(true));return}
 if(n.nodeType!==1){if(o.nodeValue!==n.nodeValue)o.nodeValue=n.nodeValue;return}
 const k=n.getAttribute('data-keep');if(k!==null&&o.getAttribute('data-keep')===k)return;
 for(const at of [...o.attributes])if(!n.hasAttribute(at.name))o.removeAttribute(at.name);
 for(const at of n.attributes)if(o.getAttribute(at.name)!==at.value)o.setAttribute(at.name,at.value);
 kids(o,n)}
