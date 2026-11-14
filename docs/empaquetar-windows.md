# Empaquetar Carioca como app de escritorio (.exe para Windows)

Esto genera un instalador `.exe` de Carioca con todo incluido: un jugador (offline)
y multijugador en línea (se conecta al servidor de Cloudflare, requiere internet).

Se usa **Electron** (mete un navegador dentro del `.exe`, así que no depende de nada
que el otro PC tenga instalado) + **electron-builder** (crea el instalador).

## Qué hace falta (una sola vez)

- **Node.js 20 o superior** instalado (el mismo que ya usas para el proyecto).
- Estar en Windows para generar el `.exe` de Windows.

## Pasos

Desde VS Code, abre la terminal en la carpeta del proyecto y corre:

```bash
npm install
```

(Instala Electron y electron-builder la primera vez; puede tardar unos minutos.)

### Probar la app sin empaquetar

Para ver la ventana de escritorio al tiro, sin generar el instalador:

```bash
npm run app
```

### Generar el instalador .exe

```bash
npm run dist
```

Cuando termine, en la carpeta `dist/` quedan dos archivos:

- **`Carioca Setup 0.6.0.exe`** — instalador. Doble clic, se instala solo, crea un
  ícono "Carioca" en el escritorio y abre el juego. Ideal para tu abuela: lo instala
  una vez y después juega desde el ícono.
- **`Carioca 0.6.0.exe`** — versión portátil (un solo archivo, no se instala). Sirve
  para probar o pasarlo por pendrive y abrirlo directo.

Le pasas cualquiera de los dos por pendrive o WhatsApp.

## Notas

- El `.exe` queda en ~80–150 MB porque trae el navegador adentro. Es normal en Electron.
- El modo de **un jugador funciona sin internet**. El **multijugador necesita internet**
  (se conecta a `carioca-server.cg-olivaresv.workers.dev`), igual que en el sitio web.
- La carpeta `dist/` no se sube a GitHub (está en `.gitignore`); son archivos pesados
  que se regeneran cuando quieras.
- Para una versión nueva, sube el número en `package.json` (campo `version`) y vuelve a
  correr `npm run dist`.
