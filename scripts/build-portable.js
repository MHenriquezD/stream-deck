const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

async function build() {
  console.log('🚀 Building Stream Deck Portable...\n')

  // Verificar certificados SSL
  const certsDir = path.join(__dirname, '..', 'apps', 'server', 'certs')
  const certPath = path.join(certsDir, 'server.crt')
  const keyPath = path.join(certsDir, 'server.key')
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath)

  if (!hasCerts) {
    console.log('⚠️  No se encontraron certificados SSL')
    console.log('   Los certificados son necesarios para HTTPS\n')
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise(resolve => {
      rl.question('¿Deseas generar certificados SSL ahora? (s/n): ', resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() === 's') {
      try {
        console.log('\n🔐 Generando certificados SSL...')
        execSync('powershell -ExecutionPolicy Bypass -File apps/server/scripts/generate-cert.ps1', {
          stdio: 'inherit',
          cwd: path.join(__dirname, '..')
        })
        console.log('✅ Certificados generados\n')
      } catch (error) {
        console.log('❌ Error al generar certificados')
        console.log('   Continuando sin HTTPS...\n')
      }
    } else {
      console.log('⚠️  Continuando sin HTTPS (solo HTTP)\n')
    }
  }

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

  // 6.5. Copiar certificados SSL si existen
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    console.log('🔐 Copying SSL certificates...')
    const certsTarget = path.join(distDir, 'server', 'certs')
    fs.mkdirSync(certsTarget, { recursive: true })
    fs.copyFileSync(certPath, path.join(certsTarget, 'server.crt'))
    fs.copyFileSync(keyPath, path.join(certsTarget, 'server.key'))
  }

  // 7. Copiar carpeta data si existe
  const dataDir = path.join(__dirname, '..', 'apps', 'server', 'data')
  if (fs.existsSync(dataDir)) {
    console.log('💾 Copying data folder...')
    const dataTarget = path.join(distDir, 'data')
    fs.cpSync(dataDir, dataTarget, { recursive: true })
  }

  // 8. Crear script de inicio para Windows
  console.log('📝 Creating launch scripts...')
  
  // Script PowerShell para generar certificados
  const generateCertsScript = `# Script para generar certificados SSL
$ErrorActionPreference = "Stop"

try {
    Write-Host ""
    Write-Host "Generando certificados SSL..." -ForegroundColor Yellow
    
    $cert = New-SelfSignedCertificate \`
        -Subject "CN=localhost" \`
        -DnsName @("localhost", "*.mhenriquezdev.com", "127.0.0.1") \`
        -KeyAlgorithm RSA \`
        -KeyLength 2048 \`
        -NotAfter (Get-Date).AddYears(1) \`
        -CertStoreLocation "Cert:\\CurrentUser\\My" \`
        -FriendlyName "StreamDeck Server Certificate" \`
        -HashAlgorithm SHA256 \`
        -KeyUsage DigitalSignature, KeyEncipherment \`
        -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
    
    $null = New-Item -ItemType Directory -Path "server\\certs" -Force
    
    # Exportar certificado en formato PEM
    $certBase64 = [Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks)
    $certPem = "-----BEGIN CERTIFICATE-----\`n" + $certBase64 + "\`n-----END CERTIFICATE-----"
    [System.IO.File]::WriteAllText("server\\certs\\server.crt", $certPem, [System.Text.Encoding]::ASCII)
    
    # Exportar clave privada en formato PEM
    $rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
    $keyBytes = $rsaKey.ExportPkcs8PrivateKey()
    $keyBase64 = [Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
    $keyPem = "-----BEGIN PRIVATE KEY-----\`n" + $keyBase64 + "\`n-----END PRIVATE KEY-----"
    [System.IO.File]::WriteAllText("server\\certs\\server.key", $keyPem, [System.Text.Encoding]::ASCII)
    
    # Limpiar
    Remove-Item -Path "Cert:\\CurrentUser\\My\\$($cert.Thumbprint)" -Force
    
    Write-Host ""
    Write-Host "Certificados generados exitosamente!" -ForegroundColor Green
    exit 0
} catch {
    Write-Host ""
    Write-Host "Error al generar certificados: $_" -ForegroundColor Red
    exit 1
}
`
  
  fs.writeFileSync(path.join(distDir, 'generate-certs.ps1'), generateCertsScript)
  
  const startBat = `@echo off
title Stream Deck Server
cd /d "%~dp0"

REM Verificar si existen certificados SSL
if not exist "server\\certs\\server.crt" (
    echo.
    echo ========================================
    echo    Stream Deck Server
    echo ========================================
    echo.
    echo [WARNING] No se encontraron certificados SSL
    echo Los certificados son necesarios para HTTPS
    echo.
    set /p GENERATE_CERTS="Deseas generar certificados SSL? (s/n): "
    
    if /i "%GENERATE_CERTS%"=="s" (
        echo.
        powershell -ExecutionPolicy Bypass -File generate-certs.ps1
        
        if errorlevel 1 (
            echo.
            echo [ERROR] No se pudieron generar los certificados
            echo Continuando sin HTTPS...
            echo.
        )
    ) else (
        echo.
        echo Continuando sin HTTPS (solo HTTP)
        echo.
    )
)

echo.
echo ========================================
echo    Stream Deck Server
echo ========================================
echo.
echo Iniciando servidor...
echo.
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
3. Abre tu navegador en https://localhost:8765 (o http:// si no hay certificados)
4. Desde otro dispositivo, usa la IP que muestra en la ventana

### Requisitos
- Node.js 18.x o superior debe estar instalado en el sistema
- Windows 10 o superior

### Soporte HTTPS
Este servidor soporta HTTPS si se incluyen certificados SSL en la carpeta 'server/certs/'.
Si ves una advertencia de certificado autofirmado, es normal y seguro aceptarla para uso local

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
}

// Ejecutar el build
build().catch(error => {
  console.error('Error during build:', error)
  process.exit(1)
})
