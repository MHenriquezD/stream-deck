# Build Resources for Electron

## Icon Setup

Para que el icono personalizado funcione correctamente, necesitas:

1. **Convertir tu PNG a ICO format**
   - Tu archivo: `public/icons/MHenriquez-StreamDeck.png`
   - Destino: `build/icon.ico`

### Opciones para convertir PNG → ICO:

#### Opción 1: Online (rápido)

- Ve a: https://convertio.co/png-ico/
- Sube `MHenriquez-StreamDeck.png`
- Descarga como `icon.ico`
- Guarda en esta carpeta (`build/`)

#### Opción 2: ImageMagick (CLI)

```bash
magick convert public/icons/MHenriquez-StreamDeck.png -define icon:auto-resize=256,128,96,64,48,32,16 build/icon.ico
```

#### Opción 3: Node.js (automatizado)

```bash
npm install -g ico
ico public/icons/MHenriquez-StreamDeck.png -o build/icon.ico
```

#### Opción 4: PowerShell (si tienes instalado ImageMagick)

```powershell
Convert-ImageToIcon -InputPath "public/icons/MHenriquez-StreamDeck.png" -OutputPath "build/icon.ico"
```

### Una vez que tengas el `icon.ico`:

1. Guarda el archivo en esta carpeta: `build/icon.ico`
2. Ejecuta: `pnpm build:electron:win`
3. El .exe usará tu icono personalizado

---

## Estructura de la carpeta build/

```
build/
├── icon.ico          (Tu icono personalizado para Windows)
└── README.md         (Este archivo)
```

---

## La carpeta streamdeck-icons/

Está incluida automáticamente en el build (en `public/streamdeck-icons/`).
Se usará para configurar y mostrar los iconos de las apps en la interfaz.

---

**Próximo paso:** Convierte tu PNG a ICO y colócalo aquí! 🎨
