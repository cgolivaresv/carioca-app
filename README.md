# Carioca

Juego de carioca para 1 jugador contra 1 a 4 bots (mesas de 2 a 5 jugadores), con 10 avatares para elegir. Sin build ni dependencias: son archivos estáticos que funcionan como PWA (instalable y sin internet).

## Estructura
- `index.html`, `style.css`: página y estilos.
- `src/engine.js`: reglas de las combinaciones (trío, escala, contratos, solucionador). Sin interfaz.
- `src/game.js`: reglas de la partida para 2 a 5 asientos (repartir, robar, bajarse, pegar, descartar, cerrar la ronda, puntaje y `viewFor`, que entrega a cada jugador solo lo que puede ver). Sin pantalla ni almacenamiento: la app y, más adelante, el servidor multijugador usan el mismo módulo.
- `src/bots.js`: jugadores virtuales (solo usan información pública; el reparto y los desempates son aleatorios).
- `src/app.js`: estado de la partida, turnos, pantalla, guardado y estadísticas (localStorage).
- `src/safe.js`: escapado de nombres para HTML y validación de la partida guardada.
- `src/roster.js`, `src/avatars.js`, `src/lines.js`: jugadores, avatares (con respaldo SVG) y frases de los bots.
- `src/audio.js`, `src/joker.js`: sonidos y dibujo del comodín.
- `tools/sim.js`: simulación de partidas para medir el balance de los bots.
- `sw.js`, `manifest.webmanifest`, `icons/`, `avatars/`: PWA e imágenes.
- `tests/`: pruebas automáticas (`engine`, `bots`, `safe`, `mesa`, `game`).

## Reglas
- 10 rondas con contratos: 2 tríos · trío + escala de 4 · 2 escalas de 4 · 3 tríos · 2 tríos + escala · 2 escalas + trío · 3 escalas · 4 tríos · escala sucia · escala real.
- Trío: 3 o más cartas del mismo número. Escala: 4 o más del mismo palo y consecutivas. Los comodines deben ser menos que las cartas naturales de la combinación.
- Las escalas son circulares: `K-A-2-3` es válida. La escala de 13 cartas va de `A` a `K`; es sucia si mezcla palos o lleva comodines y real si es de un solo palo y sin comodines.
- Al bajarse no se pega en ese mismo turno. Puntos en mano: comodín 25, A 15, 10–K 10, 2–9 5.
- Si el mazo se agota dos veces, la ronda termina sin ganador y se cuentan las cartas en mano.

## Probar en tu computador
```
npm test            # pruebas automáticas
npm run sim         # simulación de bots (opcional: node tools/sim.js 300)
npm start           # servidor local en http://localhost:8080 (requiere Node.js 20 o superior)
```
(No abras `index.html` con doble clic: los módulos y el service worker necesitan un servidor.)

## Publicar
Sube la carpeta completa a Cloudflare Pages, Netlify o Vercel. No hay comando de build; el directorio de salida es la raíz (`/`). Necesita HTTPS, que estos servicios dan por defecto.

## Instalar en el celular
Abre la URL publicada: en Android, menú ⋮ > "Instalar app"; en iPhone, Compartir > "Añadir a pantalla de inicio".

## Al publicar una versión nueva
Cambia `V` en `sw.js` (por ejemplo `carioca-v46`) para renovar la caché, sube la versión visible en `index.html` (etiqueta "Versión" del menú) y en `package.json`, y si agregas archivos a `src/`, inclúyelos en `FILES`.

## Tamaño de la mesa
El menú principal elige cuántos rivales hay (1 a 4, por defecto 2). Siempre se juega con 2 mazos y 4 comodines (108 cartas) y 12 cartas por jugador; el que reparte rota con la ronda y el primero en jugar es el siguiente. Todo el estado usa `G.n` (jugadores en la mesa) y el asiento 0 es siempre el jugador.

## Guardado
La partida se guarda automáticamente en este dispositivo (también durante el turno de los bots) y se puede continuar desde el menú principal. Si el guardado está dañado, se descarta y se empieza una partida nueva.

## Ritmo de los bots
El bot juega cuando termina de "pensar", y cuánto tarda depende de lo difícil que sea su decisión (`effort()` en `src/bots.js`): las jugadas rutinarias salen en 1,5 a 3 s, las que implican bajarse o dudar sobre el descarte tardan algo más, y 1 de cada 5 turnos, al azar, el bot "duda" y espera el máximo. El máximo se elige en el menú de puntaje (7, 10, 15 o 20 s; por defecto 7 s). Con 7 s la espera media ronda los 3,5 s.

## Consumo de batería (móvil)
Al diseñar animaciones ten presente que, mientras algo se anima, el teléfono redibuja la pantalla completa en cada refresco (hasta 120 veces por segundo en un iPhone Pro). Por eso:
- Nada de `filter: blur()`, `mix-blend-mode` ni animar `box-shadow`, `width` o `background` en bucle; anima solo `transform` y `opacity`.
- Las animaciones continuas usan `steps()` (por ejemplo, las barras de tiempo avanzan 4 veces por segundo) o son finitas.
- Las luces de fondo solo se mueven en el menú: con la clase `ingame` en `<body>` quedan quietas.
- El reloj del turno (`setInterval`) solo funciona mientras hay un turno con tiempo límite.

## Próximas fases
2: cuentas, partidas en la nube y ranking. 3: multijugador en línea. Antes de la fase 3, los nombres de otros jugadores deben pasar siempre por `esc()` (`src/safe.js`).

## Validación
`npm test` ejecuta las pruebas de reglas, bots y guardado. `npm run sim` compara el comportamiento estadístico de los bots; usa repartos aleatorios, así que sus resultados cambian entre ejecuciones. En la ronda 10 (escala real) es normal que muchas rondas terminen por agotamiento del mazo.
