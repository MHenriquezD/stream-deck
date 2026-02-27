const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

try {
  // ...existing code...

  const fixedDomains = ['localhost', '127.0.0.1', '::1']
  const customIp = process.env.CUSTOM_LOCAL_IP || ''
  if (customIp) fixedDomains.push(customIp)

  // Eliminada la lógica de mkcert y generación automática de certificados

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
    'package.json',
  )
  const packageJsonData = JSON.parse(
    fs.readFileSync(packageJsonSource, 'utf-8'),
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
    '📦 Installing production dependencies (this may take a while)...',
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

  // 6.5. Generar certificados SSL locales con mkcert
  console.log('🔒 Generando certificados SSL locales con mkcert...')
  const certsDir = path.join(distDir, 'server', 'certs')
  fs.mkdirSync(certsDir, { recursive: true })
  try {
    execSync('mkcert -install', { stdio: 'inherit' })
    execSync(
      `mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1`,
      { cwd: certsDir, stdio: 'inherit' },
    )
    console.log('✅ Certificados generados en server/certs')
    // Copiar rootCA.pem a la carpeta de descargas pública
    const userProfile = process.env.USERPROFILE || process.env.HOME
    const mkcertCA = path.join(
      userProfile,
      'AppData',
      'Local',
      'mkcert',
      'rootCA.pem',
    )
    const downloadsDir = path.join(distDir, 'public', 'downloads')
    fs.mkdirSync(downloadsDir, { recursive: true })
    if (fs.existsSync(mkcertCA)) {
      fs.copyFileSync(mkcertCA, path.join(downloadsDir, 'rootCA.pem'))
      console.log('✅ rootCA.pem copiado a la carpeta de descargas pública')
    } else {
      console.warn('⚠️  No se encontró rootCA.pem en la ruta esperada.')
    }
  } catch (e) {
    console.warn(
      '⚠️  mkcert no está instalado o falló la generación de certificados. El servidor funcionará solo en HTTP.',
    )
  }

  // 7. Crear carpeta data con JSONs vacíos (sin datos del desarrollador)
  const dataTarget = path.join(distDir, 'data')
  fs.mkdirSync(dataTarget, { recursive: true })
  fs.mkdirSync(path.join(dataTarget, 'app-icons'), { recursive: true })
  fs.mkdirSync(path.join(dataTarget, 'custom-icons'), { recursive: true })
  fs.writeFileSync(path.join(dataTarget, 'commands.json'), '[]')
  fs.writeFileSync(path.join(dataTarget, 'sessions.json'), '{}')
  fs.writeFileSync(
    path.join(dataTarget, 'settings.json'),
    JSON.stringify({ gridSize: 8 }, null, 2),
  )
  console.log('✅ Carpeta data creada con JSONs vacíos')

  // Copiar check-cert.ps1 si existe
  const checkCertSrc = path.join(
    __dirname,
    '..',
    'apps',
    'server',
    'scripts',
    'check-cert.ps1',
  )
  const checkCertDest = path.join(
    distDir,
    'server',
    'scripts',
    'check-cert.ps1',
  )
  if (fs.existsSync(checkCertSrc)) {
    fs.mkdirSync(path.dirname(checkCertDest), { recursive: true })
    fs.copyFileSync(checkCertSrc, checkCertDest)
    console.log('check-cert.ps1 copiado a la distribución.')
  } else {
    console.warn('⚠️  No se encontró check-cert.ps1 en scripts.')
  }

  // 8. Crear script de inicio para Windows
  console.log('📝 Creating launch scripts...')

  // Generate start-server.bat (asks for IP, ensures mkcert and chocolatey, generates certs, launches backend)
  const serverBat = `@echo off
    setlocal enabledelayedexpansion

    set CERT_FILE=certs\cert.pem
    set KEY_FILE=certs\key.pem

    REM ==============================
    REM Verificar si el certificado existe y es válido
    REM ==============================
    set CERT_VALID=false

    powershell -NoProfile -ExecutionPolicy Bypass -File server/scripts/check-cert.ps1 "%CERT_FILE%"
    if %ERRORLEVEL%==0 (
      set CERT_VALID=true
    )

    REM ==============================
    REM Si el certificado es válido, levantar server directamente
    REM ==============================
    if "%CERT_VALID%"=="true" (
      echo Certificado SSL válido encontrado.
      echo Iniciando servidor con HTTPS...
      start node server/main.js --https --key %KEY_FILE% --cert %CERT_FILE%
      goto END
    )

    REM ==============================
    REM Certificado no existe o está vencido
    REM ==============================
    echo.
    echo No se encontró un certificado SSL válido.
    echo.

    echo Direcciones IP disponibles:
    for /f "tokens=2 delims=:" %%f in ('ipconfig ^| findstr /C:"IPv4"') do echo   %%f
    echo.

    set /p IPLOCAL=Introduce la IP local a usar (ej: 192.168.1.100): 

    REM ==============================
    REM Verificar mkcert
    REM ==============================
    where mkcert >nul 2>nul
    if %ERRORLEVEL% neq 0 (
      echo mkcert no encontrado. Instalando mkcert...

      where choco >nul 2>nul
      if %ERRORLEVEL% neq 0 (
        echo Chocolatey no encontrado en el sistema.
        echo Para instalar mkcert automáticamente, ejecuta este script como administrador.
        echo O instala Chocolatey manualmente desde https://chocolatey.org/install
        pause
        exit /b
      )
      choco install -y mkcert
    )

    REM ==============================
    REM Generar certificados
    REM ==============================
    if not exist certs mkdir certs
    pushd certs

    mkcert -install
    mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 ::1 %IPLOCAL%

    popd

    REM ==============================
    REM Iniciar servidor
    REM ==============================
    echo.
    echo Iniciando servidor con HTTPS...
    start node server/main.js --https --key %KEY_FILE% --cert %CERT_FILE%

    :END
    pause
    endlocal
    `
  fs.writeFileSync(path.join(distDir, 'start-server.bat'), serverBat)
  console.log('start-server.bat generated.')

  // Update README with new instructions
  const readmeContent = `
  # StreamDeck Server Portable

  ## ¿Qué incluye esta carpeta?

    - start-server.bat: Inicia el servidor local en HTTPS (usando certificados mkcert).
    - start-tunnel.bat: (opcional) Inicia un túnel LocalTunnel (no recomendado para producción).
    - server/: Código y dependencias del backend.
    - public/: Archivos de la web.
  ## ¿Cómo usarlo?

  1. Haz doble clic en start-server.bat para iniciar el servidor local en HTTPS (si mkcert está instalado).
  2. Si no tienes mkcert, el servidor arrancará en HTTP.
  3. Abre https://localhost:8765 o https://[TU_IP_LOCAL]:8765 en tu navegador o dispositivo móvil.
  4. Descarga el archivo rootCA.pem desde la página de descargas y instálalo como "certificado de CA" en cada dispositivo que quieras conectar por HTTPS.
    - Android: Ajustes → Seguridad → Instalar desde almacenamiento → selecciona rootCA.pem
    - iOS: Envíate rootCA.pem por correo, ábrelo y sigue el asistente para instalar como perfil
  5. Nota: El rootCA.pem solo sirve para los certificados generados en esta PC. Si cambias de máquina, deberás instalar el nuevo rootCA.pem en tus dispositivos.

  ---

  ## Estructura de carpetas

    StreamDeck-Portable/
    ├── server/
    │   ├── main.js
    │   └── certs/
    │       ├── cert.pem
    │       └── key.pem
    ├── public/
    ├── start-server.bat
    ├── start-tunnel.bat
    └── README.md
    `

  fs.writeFileSync(path.join(distDir, 'README.md'), readmeContent)
  console.log('README.md actualizado.')

  console.log('\n✅ Proceso completado.')
  console.log(
    'Inicia el servidor ejecutando "start-server.bat" y el túnel con "start-tunnel.bat" en la carpeta dist/StreamDeck-Portable\n',
  )
} catch (error) {
  console.error('❌ Error en el script:', error)
  process.exit(1)
}
