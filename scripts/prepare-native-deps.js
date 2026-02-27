/**
 * prepare-native-deps.js
 *
 * Creates a flat node_modules directory with @nut-tree-fork/nut-js
 * and ALL its dependencies resolved from pnpm's virtual store.
 * This is needed because electron-builder can't follow pnpm symlinks.
 *
 * Output: apps/server/native_modules/ (used by electron-builder extraResources)
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const serverDir = path.resolve(__dirname, '..', 'apps', 'server')
const outputDir = path.join(serverDir, 'native_modules')

console.log('📦 Preparing native dependencies for Electron build...')

// Clean previous output
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true, force: true })
}
fs.mkdirSync(outputDir, { recursive: true })

// Create a temporary package.json with only the native dependency
const tempPkg = {
  name: 'native-deps-temp',
  version: '1.0.0',
  private: true,
  dependencies: {
    '@nut-tree-fork/nut-js': '4.2.6',
  },
}

const tempPkgPath = path.join(outputDir, 'package.json')
fs.writeFileSync(tempPkgPath, JSON.stringify(tempPkg, null, 2))

// Install with npm (creates flat node_modules, no symlinks)
console.log(
  '📥 Installing @nut-tree-fork/nut-js with npm (flat node_modules)...',
)
try {
  execSync('npm install --production --no-package-lock --ignore-scripts', {
    cwd: outputDir,
    stdio: 'inherit',
    env: { ...process.env, npm_config_loglevel: 'warn' },
  })
} catch (e) {
  console.error('❌ npm install failed:', e.message)
  process.exit(1)
}

// Run install scripts only for the native addon (needed for prebuild-install)
console.log('🔧 Running native addon install scripts...')
const libnutWin32 = path.join(
  outputDir,
  'node_modules',
  '@nut-tree-fork',
  'libnut-win32',
)
if (fs.existsSync(libnutWin32)) {
  // Check if native binary already exists (prebuild)
  const buildRelease = path.join(libnutWin32, 'build', 'Release', 'libnut.node')
  if (fs.existsSync(buildRelease)) {
    console.log('✅ Native binary already present (prebuilt)')
  } else {
    console.log('⚠️  Native binary not found, running install script...')
    try {
      execSync('npm run install', { cwd: libnutWin32, stdio: 'inherit' })
    } catch (e) {
      console.warn('⚠️  Install script failed, binary may be missing')
    }
  }
}

// Clean up temp package.json
fs.unlinkSync(tempPkgPath)

// Remove package-lock if created
const lockPath = path.join(outputDir, 'package-lock.json')
if (fs.existsSync(lockPath)) {
  fs.unlinkSync(lockPath)
}

// Count what we got
const nmDir = path.join(outputDir, 'node_modules')
if (fs.existsSync(nmDir)) {
  const count = fs.readdirSync(nmDir).length
  console.log(`✅ Prepared ${count} packages in native_modules/node_modules/`)

  // Verify native binary exists
  const binaryPath = path.join(
    nmDir,
    '@nut-tree-fork',
    'libnut-win32',
    'build',
    'Release',
    'libnut.node',
  )
  if (fs.existsSync(binaryPath)) {
    console.log('✅ Native binary (libnut.node) verified')
  } else {
    console.warn(
      '⚠️  WARNING: libnut.node not found — mouse controller may not work!',
    )
  }
} else {
  console.error('❌ node_modules not created')
  process.exit(1)
}

console.log('📦 Native dependencies ready for Electron build')
