const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

console.log('🚀 Building Windows executable with caxa...\n')

// 1. Build del servidor
console.log('📦 Building server...')
execSync('pnpm run build:server', { stdio: 'inherit' })

// 2. Crear carpeta temporal para caxa
const tempDir = path.join(__dirname, '..', 'temp-caxa')
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true })
}
fs.mkdirSync(tempDir, { recursive: true })

// 3. Copiar archivos compilados
console.log('\n📂 Copying server files...')
const serverDist = path.join(__dirname, '..', 'apps', 'server', 'dist')
fs.cpSync(serverDist, tempDir, { recursive: true })

// 4. Copiar node_modules
console.log('📦 Copying dependencies...')
const nodeModules = path.join(__dirname, '..', 'apps', 'server', 'node_modules')
const targetNodeModules = path.join(tempDir, 'node_modules')
fs.cpSync(nodeModules, targetNodeModules, { recursive: true })

// 4.5 Copiar el paquete @shared/core
console.log('📦 Copying @shared/core...')
const sharedCore = path.join(__dirname, '..', 'packages', 'shared', 'src')
const targetShared = path.join(tempDir, 'node_modules', '@shared', 'core')
fs.mkdirSync(path.dirname(targetShared), { recursive: true })
fs.cpSync(sharedCore, targetShared, { recursive: true })

// 5. Crear package.json sin workspace links
console.log('📄 Creating package.json...')
const packageJsonPath = path.join(
  __dirname,
  '..',
  'apps',
  'server',
  'package.json'
)
const packageJsonData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))

// Eliminar dependencias de workspace
delete packageJsonData.dependencies['@shared/core']

const targetPackageJson = path.join(tempDir, 'package.json')
fs.writeFileSync(targetPackageJson, JSON.stringify(packageJsonData, null, 2))

// 5.5 Eliminar archivos de lock que causan conflictos
const lockFiles = [
  path.join(tempDir, 'package-lock.json'),
  path.join(tempDir, 'node_modules', '.package-lock.json'),
  path.join(tempDir, 'pnpm-lock.yaml'),
]
lockFiles.forEach((file) => {
  if (fs.existsSync(file)) {
    console.log(`🗑️  Removing ${path.basename(file)}`)
    fs.unlinkSync(file)
  }
})

// 6. Empaquetar con caxa
console.log('\n🎁 Packaging with caxa...')
const distDir = path.join(__dirname, '..', 'dist')
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true })
}

execSync(
  `caxa --no-dedupe --input "${tempDir}" --output "${path.join(
    distDir,
    'StreamDeck-Server-Windows.exe'
  )}" -- "{{caxa}}/node_modules/.bin/node" "{{caxa}}/main.js"`,
  { stdio: 'inherit' }
)

// 7. Limpiar carpeta temporal
console.log('\n🧹 Cleaning up...')
fs.rmSync(tempDir, { recursive: true })

console.log(
  '\n✅ Build complete! Executable at: dist/StreamDeck-Server-Windows.exe'
)
