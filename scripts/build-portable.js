const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')
const readline = require('readline')

async function build() {
  console.log('🚀 Building Stream Deck Portable...\n')

  // Verificar si mkcert está instalado
  let mkcertInstalled = false
  try {
    execSync('mkcert -version', { stdio: 'ignore' })
    mkcertInstalled = true
  } catch (error) {
    console.log('❌ mkcert no está instalado\n')
    console.log('⚠️  IMPORTANTE: mkcert es OBLIGATORIO para PWA')
    console.log('   Las PWAs requieren HTTPS para funcionar correctamente')
    console.log(
      '   Sin certificados SSL válidos, la aplicación NO funcionará como PWA\n'
    )

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    // Preguntar si desea instalar automáticamente
    const installChoice = await new Promise((resolve) => {
      rl.question('¿Deseas instalar mkcert ahora? (s/n): ', resolve)
    })

    if (installChoice.toLowerCase() === 's') {
      console.log('\n📦 Intentando instalar mkcert...\n')

      // Verificar si Chocolatey está disponible
      let installed = false
      let hasChoco = false
      let hasScoop = false

      try {
        execSync('choco --version', { stdio: 'ignore' })
        hasChoco = true
      } catch {}

      try {
        execSync('scoop --version', { stdio: 'ignore' })
        hasScoop = true
      } catch {}

      if (hasChoco) {
        console.log('Instalando mkcert con Chocolatey...')
        try {
          execSync('choco install mkcert -y', { stdio: 'inherit' })
          console.log('✅ mkcert instalado exitosamente\n')
          mkcertInstalled = true
          installed = true
        } catch (error) {
          console.log('❌ Error al instalar mkcert con Chocolatey\n')
        }
      } else if (hasScoop) {
        console.log('Instalando mkcert con Scoop...')
        try {
          execSync('scoop install mkcert', { stdio: 'inherit' })
          console.log('✅ mkcert instalado exitosamente\n')
          mkcertInstalled = true
          installed = true
        } catch (error) {
          console.log('❌ Error al instalar mkcert con Scoop\n')
        }
      } else {
        // No tiene ni Chocolatey ni Scoop - ofrecer instalarlos
        console.log('❌ No se encontró Chocolatey ni Scoop instalado\n')
        console.log('Para instalar mkcert necesitas un gestor de paquetes.\n')
        console.log('Opciones disponibles:')
        console.log('   1. Chocolatey (requiere permisos de administrador)')
        console.log('   2. Scoop (no requiere permisos de administrador)')
        console.log('   3. Cancelar y hacerlo manualmente\n')

        const pmChoice = await new Promise((resolve) => {
          rl.question('Elige una opción (1/2/3): ', resolve)
        })

        if (pmChoice === '1') {
          console.log('\n📦 Instalando Chocolatey...')
          console.log(
            '⚠️  IMPORTANTE: Esto requiere permisos de administrador\n'
          )

          try {
            const chocoInstallCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"`

            execSync(chocoInstallCmd, { stdio: 'inherit' })

            console.log('\n✅ Chocolatey instalado exitosamente')
            console.log(
              '\n⚠️  IMPORTANTE: Debes REINICIAR esta terminal para usar Chocolatey'
            )
            console.log(
              '   Después de reiniciar, ejecuta nuevamente: node scripts/build-portable.js'
            )
            console.log('   Chocolatey instalará mkcert automáticamente\n')

            rl.close()
            process.exit(0)
          } catch (error) {
            console.log('\n❌ Error al instalar Chocolatey')
            console.log(
              '   Es posible que necesites ejecutar como administrador'
            )
            console.log(
              '   O instalar manualmente: https://chocolatey.org/install\n'
            )
          }
        } else if (pmChoice === '2') {
          console.log('\n📦 Instalando Scoop...')

          try {
            const scoopInstallCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser; irm get.scoop.sh | iex"`

            execSync(scoopInstallCmd, { stdio: 'inherit' })

            console.log('\n✅ Scoop instalado exitosamente')
            console.log(
              '\n⚠️  IMPORTANTE: Debes REINICIAR esta terminal para usar Scoop'
            )
            console.log(
              '   Después de reiniciar, ejecuta nuevamente: node scripts/build-portable.js'
            )
            console.log('   Scoop instalará mkcert automáticamente\n')

            rl.close()
            process.exit(0)
          } catch (error) {
            console.log('\n❌ Error al instalar Scoop')
            console.log('   Instalar manualmente: https://scoop.sh\n')
          }
        } else {
          console.log('\n📖 Instalación manual:')
          console.log(
            '   1. Instala Chocolatey: https://chocolatey.org/install'
          )
          console.log('      O Scoop: https://scoop.sh')
          console.log('   2. Reinicia tu terminal')
          console.log(
            '   3. Ejecuta: choco install mkcert (o scoop install mkcert)'
          )
          console.log('   4. Vuelve a ejecutar el build\n')
        }
      }

      if (!installed) {
        rl.close()
        console.log('❌ Build cancelado. Instala mkcert y vuelve a intentarlo.')
        process.exit(1)
      }
    } else {
      console.log(
        '\n⚠️  ADVERTENCIA: Sin mkcert, la PWA NO funcionará correctamente'
      )
      console.log('   Características que NO funcionarán sin HTTPS:')
      console.log('   - Instalación como aplicación')
      console.log('   - Service Workers (funcionamiento offline)')
      console.log('   - Notificaciones push')
      console.log('   - Geolocalización y otras APIs modernas\n')

      const continueAnyway = await new Promise((resolve) => {
        rl.question('¿Seguro que deseas continuar sin HTTPS? (s/n): ', resolve)
      })

      if (continueAnyway.toLowerCase() !== 's') {
        rl.close()
        console.log('\n❌ Build cancelado. Instala mkcert para continuar.')
        console.log('   Comando rápido: choco install mkcert')
        process.exit(1)
      }
      console.log(
        '⚠️  Continuando sin HTTPS (solo HTTP - funcionalidad limitada)\n'
      )
    }

    rl.close()
  }

  // Verificar certificados SSL
  const certsDir = path.join(__dirname, '..', 'apps', 'server', 'certs')
  const certPath = path.join(certsDir, 'server.crt')
  const keyPath = path.join(certsDir, 'server.key')
  const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath)

  if (!hasCerts && mkcertInstalled) {
    console.log('⚠️  No se encontraron certificados SSL')
    console.log('   Los certificados son necesarios para HTTPS\n')

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await new Promise((resolve) => {
      rl.question(
        '¿Deseas generar certificados SSL con mkcert ahora? (s/n): ',
        resolve
      )
    })

    if (answer.toLowerCase() === 's') {
      try {
        console.log('\n🔐 Generando certificados SSL con mkcert...')

        // Detectar IP local automáticamente
        let localIP = null
        try {
          const { networkInterfaces } = require('os')
          const nets = networkInterfaces()

          for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
              // Ignorar direcciones IPv6 y localhost
              if (net.family === 'IPv4' && !net.internal) {
                localIP = net.address
                break
              }
            }
            if (localIP) break
          }
        } catch (error) {
          console.log('⚠️  No se pudo detectar la IP local automáticamente')
        }

        if (localIP) {
          console.log(`\n📡 IP local detectada: ${localIP}`)
        }

        console.log('\nEl certificado se generará para:')
        console.log('  - localhost')
        console.log('  - 127.0.0.1')
        console.log('  - ::1 (IPv6 localhost)')
        if (localIP) {
          console.log(`  - ${localIP} (tu IP local detectada)`)
        }

        const addMoreIPs = await new Promise((resolve) => {
          rl.question('\n¿Deseas agregar IPs adicionales? (s/n): ', resolve)
        })

        let additionalIPs = []
        if (addMoreIPs.toLowerCase() === 's') {
          const ipsInput = await new Promise((resolve) => {
            rl.question(
              'Ingresa las IPs separadas por espacios (ej: 192.168.1.100 172.16.4.205): ',
              resolve
            )
          })

          if (ipsInput.trim()) {
            additionalIPs = ipsInput.trim().split(/\s+/)
            console.log(
              `\n✅ IPs adicionales agregadas: ${additionalIPs.join(', ')}`
            )
          }
        }

        rl.close()

        // Crear directorio de certificados si no existe
        if (!fs.existsSync(certsDir)) {
          fs.mkdirSync(certsDir, { recursive: true })
        }

        // Instalar CA local (si no está instalado)
        try {
          execSync('mkcert -install', { stdio: 'inherit' })
        } catch (error) {
          console.log(
            '⚠️  No se pudo instalar CA local (puede que ya esté instalado)'
          )
        }

        // Construir lista de dominios/IPs para el certificado
        const domains = ['localhost', '127.0.0.1', '::1']
        if (localIP) {
          domains.push(localIP)
        }
        domains.push(...additionalIPs)

        // Generar certificados
        const outputCert = path.join(certsDir, 'server.crt')
        const outputKey = path.join(certsDir, 'server.key')

        const mkcertCmd = `mkcert -cert-file "${outputCert}" -key-file "${outputKey}" ${domains.join(
          ' '
        )}`

        console.log(
          `\n🔐 Ejecutando: mkcert para ${domains.length} dominios/IPs...\n`
        )

        execSync(mkcertCmd, {
          stdio: 'inherit',
          cwd: certsDir,
        })

        console.log('\n✅ Certificados generados exitosamente')
        console.log('📋 Certificados válidos para:')
        domains.forEach((domain) => console.log(`   - ${domain}`))
        console.log('')
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
  const packageJsonData = JSON.parse(
    fs.readFileSync(packageJsonSource, 'utf-8')
  )

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
  console.log(
    '📦 Installing production dependencies (this may take a while)...'
  )
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

  // Script PowerShell para generar certificados con mkcert
  const generateCertsScript = `# Script para generar certificados SSL con mkcert
$ErrorActionPreference = "Stop"

try {
    Write-Host ""
    Write-Host "Verificando mkcert..." -ForegroundColor Yellow
    
    # Verificar si mkcert está instalado
    $mkcertInstalled = $false
    try {
        $null = mkcert -version
        $mkcertInstalled = $true
    } catch {
        Write-Host ""
        Write-Host "mkcert no está instalado" -ForegroundColor Red
        Write-Host "Para instalar mkcert:" -ForegroundColor Yellow
        Write-Host "  - Chocolatey: choco install mkcert" -ForegroundColor Cyan
        Write-Host "  - Scoop: scoop install mkcert" -ForegroundColor Cyan
        Write-Host "  - Descarga: https://github.com/FiloSottile/mkcert/releases" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host ""
    Write-Host "Generando certificados SSL con mkcert..." -ForegroundColor Yellow
    
    # Detectar IP local automáticamente
    $localIP = $null
    try {
        $networkAdapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.InterfaceAlias -notlike "*Loopback*" -and 
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -eq "Dhcp" -or $_.PrefixOrigin -eq "Manual"
        } | Select-Object -First 1
        
        if ($networkAdapters) {
            $localIP = $networkAdapters.IPAddress
            Write-Host ""
            Write-Host "IP local detectada: $localIP" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "No se pudo detectar la IP local automáticamente" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "El certificado se generará para:" -ForegroundColor White
    Write-Host "  - localhost"
    Write-Host "  - 127.0.0.1"
    Write-Host "  - ::1 (IPv6 localhost)"
    if ($localIP) {
        Write-Host "  - $localIP (tu IP local detectada)" -ForegroundColor Cyan
    }
    
    Write-Host ""
    $addMore = Read-Host "Deseas agregar IPs adicionales? (s/n)"
    
    $domains = @("localhost", "127.0.0.1", "::1")
    if ($localIP) {
        $domains += $localIP
    }
    
    if ($addMore -eq "s" -or $addMore -eq "S") {
        Write-Host "Ingresa las IPs separadas por espacios (ej: 192.168.1.100 172.16.4.205):"
        $additionalIPs = Read-Host
        
        if ($additionalIPs.Trim()) {
            $ipArray = $additionalIPs.Trim() -split '\s+'
            $domains += $ipArray
            Write-Host ""
            Write-Host "IPs adicionales agregadas: $($ipArray -join ', ')" -ForegroundColor Green
        }
    }
    
    $null = New-Item -ItemType Directory -Path "server\\certs" -Force
    
    # Instalar CA local (si no está instalado)
    Write-Host ""
    try {
        mkcert -install
    } catch {
        Write-Host "CA local ya está instalado" -ForegroundColor Gray
    }
    
    # Generar certificados
    Write-Host ""
    Write-Host "Ejecutando mkcert para $($domains.Count) dominios/IPs..." -ForegroundColor Yellow
    Set-Location "server\\certs"
    
    $mkcertArgs = @("-cert-file", "server.crt", "-key-file", "server.key") + $domains
    & mkcert $mkcertArgs
    
    Set-Location "..\\.."
    
    Write-Host ""
    Write-Host "Certificados generados exitosamente!" -ForegroundColor Green
    Write-Host "Certificados válidos para:" -ForegroundColor White
    foreach ($domain in $domains) {
        Write-Host "  - $domain"
    }
    
    exit 0
} catch {
    Write-Host ""
    Write-Host "Error al generar certificados: $_" -ForegroundColor Red
    exit 1
}
`

  fs.writeFileSync(
    path.join(distDir, 'generate-certs.ps1'),
    generateCertsScript
  )

  const startBat = `@echo off
title Stream Deck Server
cd /d "%~dp0"

echo.
echo ========================================
echo    Stream Deck Server
echo ========================================
echo.

REM Verificar si ngrok está instalado
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] ngrok no está instalado
    echo.
    echo Para instalar ngrok:
    echo 1. Descarga desde: https://ngrok.com/download
    echo 2. O instala con: choco install ngrok
    echo 3. Configura tu authtoken: ngrok config add-authtoken YOUR_TOKEN
    echo.
    set USE_NGROK=n
) else (
    echo [INFO] ngrok detectado
    echo.
    set /p USE_NGROK="Deseas usar ngrok para HTTPS publico? (s/n): "
)

if /i "%USE_NGROK%"=="s" (
    echo.
    echo Iniciando servidor y tunel ngrok...
    echo.
    echo IMPORTANTE: Copia la URL HTTPS que muestra ngrok
    echo Usa esa URL en la configuracion de tu PWA
    echo.
    
    REM Iniciar servidor en segundo plano
    start /min "StreamDeck Server" node server/main.js
    
    REM Esperar 2 segundos para que el servidor inicie
    timeout /t 2 /nobreak >nul
    
    REM Iniciar ngrok (esto mostrará la URL HTTPS)
    echo ========================================
    echo    Tunel HTTPS con ngrok
    echo ========================================
    echo.
    ngrok http 8765
    
    REM Cuando ngrok se cierre, cerrar el servidor
    taskkill /f /fi "WINDOWTITLE eq StreamDeck Server*" >nul 2>nul
) else (
    REM Verificar si existen certificados SSL para HTTPS local
    if not exist "server\\certs\\server.crt" (
        echo.
        echo [WARNING] No se encontraron certificados SSL
        echo Los certificados son necesarios para HTTPS local
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
    echo Iniciando servidor...
    echo.
    node server/main.js
)

pause
`

  fs.writeFileSync(path.join(distDir, 'start-server.bat'), startBat)

  // 9. Crear README
  const readme = `# Stream Deck Portable

## Instrucciones de Uso

### Windows
1. Doble clic en **start-server.bat**
2. Elige si deseas usar ngrok para HTTPS público o servidor local
3. Si usas ngrok:
   - Copia la URL HTTPS que muestra (ej: https://abc123.ngrok.io)
   - Úsala en la configuración de tu PWA
4. Si usas servidor local:
   - Abre tu navegador en https://localhost:8765 (o http:// si no hay certificados)
   - Desde otro dispositivo, usa la IP que muestra en la ventana

### Requisitos
- Node.js 18.x o superior debe estar instalado en el sistema
- Windows 10 o superior
- ngrok (opcional, para HTTPS público): https://ngrok.com/download

### Opción 1: Usar ngrok (Recomendado para PWA en producción)
ngrok crea un túnel HTTPS público a tu servidor local. Esto permite:
- Conectar PWAs desde cualquier dispositivo con HTTPS válido
- No requiere certificados SSL autofirmados
- Funciona desde cualquier red

**Instalación de ngrok:**
\`\`\`bash
# Opción 1: Descargar desde https://ngrok.com/download
# Opción 2: Instalar con Chocolatey
choco install ngrok

# Configurar authtoken (gratis en ngrok.com)
ngrok config add-authtoken YOUR_TOKEN
\`\`\`

**Uso:**
1. Ejecuta start-server.bat
2. Responde 's' cuando pregunte por ngrok
3. Copia la URL HTTPS mostrada (ej: https://abc123.ngrok-free.app)
4. Úsala en tu PWA: Settings → URL del Servidor

### Opción 2: HTTPS Local (Para desarrollo)
Este servidor soporta HTTPS local si se incluyen certificados SSL en 'server/certs/'.
Si ves una advertencia de certificado autofirmado, es normal y seguro aceptarla para uso local.

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
  process.exit(0)
}

// Ejecutar el build
build().catch((error) => {
  console.error('Error during build:', error)
  process.exit(1)
})
