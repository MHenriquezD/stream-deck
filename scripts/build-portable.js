const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Building Stream Deck Portable...\n')

// 1. Build del servidor y frontend
console.log('📦 Building server and web...')
execSync('pnpm run build:server && pnpm run build:web', { stdio: 'inherit' })

// 2. Crear estructura de carpetas
const distDir = path.join(__dirname, '..', 'dist', 'StreamDeck-Portable')
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true })
}
fs.mkdirSync(distDir, { recursive: true })

// 3. Copiar archivos del servidor compilado
console.log('\n📂 Copying server files...')
const serverDist = path.join(__dirname, '..', 'apps', 'server', 'dist')
const serverTarget = path.join(distDir, 'server')
fs.cpSync(serverDist, serverTarget, { recursive: true })

// 4. Copiar package.json del servidor y modificarlo
console.log('📄 Creating package.json...')
const packageJsonSource = path.join(
  __dirname,
  '..',
  'apps',
  'server',
  'package.json'
)
const packageJsonData = JSON.parse(fs.readFileSync(packageJsonSource, 'utf-8'))

// Eliminar dependencias de workspace (pueden estar como "@shared/core" o "core")
if (packageJsonData.dependencies) {
  delete packageJsonData.dependencies['@shared/core']
  delete packageJsonData.dependencies['core']
}

const packageJsonTarget = path.join(distDir, 'server', 'package.json')
fs.writeFileSync(packageJsonTarget, JSON.stringify(packageJsonData, null, 2))

// 4.5. Copiar @shared/core manualmente
console.log('📦 Copying @shared/core...')
const sharedSrc = path.join(__dirname, '..', 'packages', 'shared', 'src')
const sharedTarget = path.join(distDir, 'server', '@shared', 'core')
fs.mkdirSync(path.dirname(sharedTarget), { recursive: true })
fs.cpSync(sharedSrc, sharedTarget, { recursive: true })

// 4.6. Eliminar cualquier archivo de lock que pueda existir
const lockFiles = [
  path.join(distDir, 'server', 'package-lock.json'),
  path.join(distDir, 'server', 'pnpm-lock.yaml'),
  path.join(distDir, 'server', 'yarn.lock'),
]
lockFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file)
  }
})

// 5. Instalar dependencias de producción
console.log('📦 Installing production dependencies (this may take a while)...')
execSync('npm install --production --omit=dev', {
  cwd: path.join(distDir, 'server'),
  stdio: 'inherit',
})

// 6. Copiar archivos del frontend compilado
console.log('🌐 Copying web files...')
const webDist = path.join(__dirname, '..', 'apps', 'web', 'dist')
const webTarget = path.join(distDir, 'public')
fs.cpSync(webDist, webTarget, { recursive: true })

// 7. Copiar carpeta data si existe
const dataDir = path.join(__dirname, '..', 'apps', 'server', 'data')
if (fs.existsSync(dataDir)) {
  console.log('💾 Copying data folder...')
  const dataTarget = path.join(distDir, 'data')
  fs.cpSync(dataDir, dataTarget, { recursive: true })
}

// 8. Crear script de inicio para Windows
console.log('📝 Creating launch scripts...')
const startBat = `@echo off
title Stream Deck Server
echo.
echo ========================================
echo    Stream Deck Server
echo ========================================
echo.
echo Starting server...
echo.
cd /d "%~dp0"
node server/main.js
pause
`

fs.writeFileSync(path.join(distDir, 'start-server.bat'), startBat)

// 9. Crear README
const readme = `# Stream Deck Portable

## Instrucciones de Uso

### Windows
1. Doble clic en **start-server.bat**
2. Se abrirá una ventana mostrando la dirección del servidor
3. Abre tu navegador en http://localhost:8765
4. Desde otro dispositivo, usa la IP que muestra en la ventana

### Requisitos
- Node.js 18.x o superior debe estar instalado en el sistema
- Windows 10 o superior

### Estructura de Carpetas
- \`server/\` - Código del servidor compilado
- \`public/\` - Aplicación web (PWA)
- \`data/\` - Datos y configuraciones
- \`start-server.bat\` - Script de inicio

## Notas
- No cierres la ventana del servidor mientras lo uses
- Los botones se guardan automáticamente
- La app web se puede instalar como PWA desde el navegador

---
© 2026 Manuel Henriquez
`

fs.writeFileSync(path.join(distDir, 'README.md'), readme)

// 10. Crear archivo de configuración
const config = {
  version: '1.0.0',
  name: 'Stream Deck',
  port: 8765,
}

fs.writeFileSync(
  path.join(distDir, 'config.json'),
  JSON.stringify(config, null, 2)
)

console.log('\n✅ Build completed!')
console.log(`📁 Output: ${distDir}`)
console.log('\n💡 To distribute:')
console.log('   1. Compress the StreamDeck-Portable folder to a ZIP file')
console.log('   2. Users need Node.js installed to run it')
console.log('   3. Run start-server.bat to start\n')
