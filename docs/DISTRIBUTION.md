# 🚀 Guía de Distribución - Stream Deck

## 📋 Resumen

Este documento explica cómo generar los instaladores y distribuirlos.

## 🔨 Generar todos los instaladores

```powershell
# Desde la raíz del proyecto
.\build-all-releases.ps1
```

Este script hará:

1. ✅ Compilar el backend (NestJS → JavaScript)
2. ✅ Compilar el frontend (Vue → PWA estático)
3. ✅ Generar 3 ejecutables standalone:
   - `StreamDeck-Server-Windows.exe`
   - `StreamDeck-Server-macOS`
   - `StreamDeck-Server-Linux`
4. ✅ Empaquetar cada uno en ZIP con README
5. ✅ Crear carpeta `dist/releases/` con todos los archivos

## 📦 Archivos Generados

Encontrarás en `dist/releases/`:

```
StreamDeck-Server-Windows-v1.0.0.zip   (~40 MB)
StreamDeck-Server-macOS-v1.0.0.zip     (~40 MB)
StreamDeck-Server-Linux-v1.0.0.zip     (~40 MB)
StreamDeck-PWA-v1.0.0.zip              (~2 MB)
RELEASE-NOTES.md
```

## 🌐 Opción 1: GitHub Releases (Recomendada)

### Paso 1: Crear el Release en GitHub

```bash
# Con GitHub CLI (recomendado)
gh release create v1.0.0 \
  ./dist/releases/*.zip \
  --title "Stream Deck v1.0.0" \
  --notes-file ./dist/releases/RELEASE-NOTES.md

# O manualmente:
# 1. Ve a tu repo en GitHub
# 2. Click en "Releases" → "Create a new release"
# 3. Tag: v1.0.0
# 4. Título: Stream Deck v1.0.0
# 5. Sube los archivos ZIP
# 6. Pega el contenido de RELEASE-NOTES.md
# 7. Publish release
```

### Paso 2: Actualizar la URL en el frontend

Edita `apps/web/src/components/StreamDeckGrid.vue`:

```vue
<button
  @click="
    () =>
      window.open(
        'https://github.com/TU-USUARIO/stream-deck/releases',
        '_blank'
      )
  "
  class="btn-icon btn-download"
  title="Descargar Servidor"
>
  📥
</button>
```

Reemplaza `TU-USUARIO` con tu usuario de GitHub.

### Paso 3: Publicar el Frontend (PWA)

Opciones:

#### A) Vercel (Recomendado)

```bash
cd apps/web
npm i -g vercel
vercel --prod
```

#### B) Netlify

```bash
cd apps/web
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

#### C) GitHub Pages

```bash
# 1. Crea un repo público
# 2. Activa GitHub Pages en Settings
# 3. Sube el contenido de apps/web/dist/
```

## 🏠 Opción 2: Servidor Propio

### Preparar el servidor

1. **Backend (API):**

```bash
# Usa el ejecutable generado
# Ejemplo en Ubuntu:
./StreamDeck-Server-Linux
```

2. **Frontend (PWA):**

```bash
# Con Node.js
cd apps/web/dist
npx serve -s . -p 80

# Con Nginx
# Copia apps/web/dist/ a /var/www/streamdeck/
# Configura Nginx para servir archivos estáticos
```

3. **Dominio:**

```
https://streamdeck.tudominio.com  → Frontend (PWA)
https://streamdeck.tudominio.com/downloads → Archivos ZIP
```

### Estructura de carpetas en servidor

```
/var/www/streamdeck/
├── index.html              # Frontend PWA
├── assets/
├── manifest.json
└── downloads/              # Carpeta para descargas
    ├── StreamDeck-Server-Windows-v1.0.0.zip
    ├── StreamDeck-Server-macOS-v1.0.0.zip
    └── StreamDeck-Server-Linux-v1.0.0.zip
```

Luego actualiza las URLs en `DownloadsPage.vue`:

```typescript
const downloadFromGithub = (file: string) => {
  window.open(`https://tudominio.com/downloads/${file}`, '_blank')
}
```

## 📱 Configurar el PWA

### 1. Generar iconos reales

Los iconos actuales son placeholders. Genera iconos reales:

```bash
# Opción A: Usa un generador online
# https://realfavicongenerator.net/
# Sube tu logo y descarga el paquete

# Opción B: Con ImageMagick
convert tu-logo.png -resize 192x192 apps/web/public/pwa-icon-192.png
convert tu-logo.png -resize 512x512 apps/web/public/pwa-icon-512.png
```

### 2. Personalizar el manifest

Edita `apps/web/vite.config.js`:

```javascript
manifest: {
  name: 'Stream Deck Personal',
  short_name: 'StreamDeck',
  description: 'Tu descripción personalizada',
  theme_color: '#8b5cf6',
  // ... resto de configuración
}
```

## 🔄 Actualizar una nueva versión

1. Actualiza la versión en `package.json`
2. Ejecuta `.\build-all-releases.ps1`
3. Crea un nuevo release en GitHub (v1.1.0, v1.2.0, etc.)
4. Los usuarios podrán descargar la nueva versión

## ✅ Checklist antes de publicar

- [ ] Probar ejecutable Windows localmente
- [ ] Probar ejecutable macOS (si tienes acceso a Mac)
- [ ] Probar ejecutable Linux (WSL o VM)
- [ ] Verificar que el frontend se conecta correctamente
- [ ] Probar instalación de PWA en móvil
- [ ] Revisar que todos los iconos se vean bien
- [ ] Actualizar URLs en el código
- [ ] Probar el flujo completo:
  - [ ] Descargar servidor
  - [ ] Ejecutar servidor
  - [ ] Abrir PWA en móvil
  - [ ] Configurar IP
  - [ ] Ejecutar un comando

## 🎯 Flujo del Usuario Final

1. Usuario abre `https://streamdeck.tudominio.com` en su móvil
2. Ve el botón 📥 "Descargar Servidor"
3. Click → Redirige a GitHub Releases
4. Descarga el ZIP para su sistema operativo
5. Descomprime y ejecuta el servidor en su PC
6. Anota la IP local del servidor
7. En el móvil, click en ⚙️ → Configura la IP
8. ¡Listo! Ya puede controlar su PC

## 📝 Notas Importantes

- Los ejecutables son **standalone**: incluyen Node.js
- **No necesitan instalación**, solo descomprimir y ejecutar
- El firewall de Windows puede solicitar permisos
- Los comandos PowerShell solo funcionan en Windows
- El servidor debe estar corriendo para que la app funcione

## 🐛 Troubleshooting del Build

### Error al generar ejecutable Windows

```bash
# Asegúrate de compilar primero
pnpm run build:server

# Verifica que dist/main.js existe
ls apps/server/dist/
```

### Ejecutable muy grande

- Los ~40MB son normales (incluyen Node.js runtime)
- Usa la opción `--compress GZip` para reducir tamaño

### Error "Cannot find module"

- Asegúrate de que todas las dependencias estén en `dependencies` (no `devDependencies`)
- pkg no incluye devDependencies

## 📚 Referencias

- [pkg Documentation](https://github.com/vercel/pkg)
- [PWA Builder](https://www.pwabuilder.com/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)

---

© 2026 Manuel Henriquez
