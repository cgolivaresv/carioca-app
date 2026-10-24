# Carioca (fase 1)

Juego de carioca para 1 jugador contra 2 bots (Ana y Beto). Sin build ni dependencias: son archivos estáticos.

## Estructura
- `index.html`, `style.css`: página y estilos.
- `src/engine.js`: reglas del juego (combinaciones, contratos, solucionador de los bots). Sin interfaz.
- `src/bots.js`: jugadores virtuales expertos (solo usan información pública; el reparto y los desempates son aleatorios).
- `tools/sim.js`: simulación de partidas para medir balance (`npm run sim`, o `node tools/sim.js 300`).
- `src/app.js`: estado de la partida, bots, pantalla, guardado y estadísticas (localStorage).
- `sw.js`, `manifest.webmanifest`, `icons/`: PWA (instalable y sin internet).
- `tests/engine.test.js`: pruebas de las reglas.

## Probar en tu computador
```
npm test            # pruebas de las reglas
npm start           # servidor local en http://localhost:8080 (requiere Node.js)
```
(No abras `index.html` con doble clic: los módulos y el service worker necesitan un servidor.)

## Publicar
Sube la carpeta completa a Cloudflare Pages, Netlify o Vercel. No hay comando de build; el directorio de salida es la raíz (`/`). Necesita HTTPS, que estos servicios dan por defecto.

## Instalar en el celular
Abre la URL publicada: en Android, menú ⋮ > "Instalar app"; en iPhone, Compartir > "Añadir a pantalla de inicio".

## Al publicar una versión nueva
Cambia `V` en `sw.js` (por ejemplo `carioca-v2`) para renovar la caché.

## Próximas fases
2: cuentas, partidas en la nube y ranking. 3: multijugador en línea.

## Mejoras incluidas en v0.2
- Corregido el registro de victorias para que un empate no cuente como victoria individual.
- El resultado final muestra explícitamente los empates en puntaje total.
- Las cartas anuncian su valor y palo con etiquetas accesibles, y muestran su estado de selección.
- Mejoras de ergonomía para pantallas estrechas, foco visible para teclado y respeto por la preferencia de movimiento reducido.
- Caché de PWA actualizada a `carioca-v8` para que las instalaciones reciban los cambios.
- Ampliadas las pruebas para escalas de 13 cartas y contratos de escala sucia.

## Validación
Ejecuta `npm test` para las pruebas automatizadas y `npm run sim` para comparar el comportamiento estadístico de los bots. La simulación usa repartos aleatorios, así que sus resultados cambian entre ejecuciones.
