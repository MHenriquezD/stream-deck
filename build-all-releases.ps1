# Script para generar todos los instaladores y preparar el release
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Stream Deck - Build All Releases" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Limpiar dist anterior en raíz (NO tocar apps/server/dist ni apps/web/dist)
if (Test-Path "dist") {
    Write-Host "🗑️  Limpiando builds anteriores..." -ForegroundColor Yellow
    Get-ChildItem "dist" | Remove-Item -Recurse -Force
}
else {
    New-Item -ItemType Directory -Path "dist" | Out-Null
}

New-Item -ItemType Directory -Path "dist/releases" -Force | Out-Null

# 1. Build del backend
Write-Host ""
Write-Host "📦 Compilando backend..." -ForegroundColor Yellow
pnpm run build:server
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando backend" -ForegroundColor Red
    exit 1
}

# 2. Build del frontend (PWA)
Write-Host ""
Write-Host "🌐 Compilando frontend (PWA)..." -ForegroundColor Yellow
pnpm run build:web
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error compilando frontend" -ForegroundColor Red
    exit 1
}

# 3. Generar ejecutables
Write-Host ""
Write-Host "🔨 Generando ejecutables..." -ForegroundColor Yellow

# Windows
Write-Host "  → Windows x64..." -ForegroundColor Cyan
pnpm run pkg:win
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando ejecutable Windows" -ForegroundColor Red
    exit 1
}

# macOS
Write-Host "  → macOS x64..." -ForegroundColor Cyan
pnpm run pkg:mac
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando ejecutable macOS" -ForegroundColor Red
    exit 1
}

# Linux
Write-Host "  → Linux x64..." -ForegroundColor Cyan
pnpm run pkg:linux
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error generando ejecutable Linux" -ForegroundColor Red
    exit 1
}

# 4. Crear paquetes con README
Write-Host ""
Write-Host "📦 Empaquetando releases..." -ForegroundColor Yellow

$version = "1.0.0"

# README para el servidor
$serverReadme = @"
# Stream Deck Server v$version

## Instalación

### Windows
1. Ejecuta **StreamDeck-Server-Windows.exe**
2. Se abrirá una ventana de consola mostrando:
   - URL Local: http://localhost:3000
   - URL de Red: http://[TU-IP]:3000
3. **No cierres esta ventana** mientras uses el Stream Deck

### macOS / Linux
1. Abre una terminal en la carpeta del servidor
2. Dale permisos de ejecución:
   - macOS: ``chmod +x StreamDeck-Server-macOS``
   - Linux: ``chmod +x StreamDeck-Server-Linux``
3. Ejecuta:
   - macOS: ``./StreamDeck-Server-macOS``
   - Linux: ``./StreamDeck-Server-Linux``

## Conectar desde otro dispositivo

1. Anota la IP que aparece en la consola del servidor
   Ejemplo: ``http://192.168.1.100:3000``

2. En tu tablet/móvil:
   - Abre el navegador
   - Ve a la URL del frontend (donde instalaste la PWA)
   - Click en el botón ⚙️ (Configuración)
   - Ingresa la URL del servidor
   - Click en "Probar Conexión"
   - Si funciona, click en "Guardar y Recargar"

## Troubleshooting

### El servidor no inicia
- Asegúrate de que el puerto 3000 esté disponible
- En Windows, permite el acceso en el Firewall si lo solicita

### No me puedo conectar desde otro dispositivo
- Verifica que ambos dispositivos estén en la misma red WiFi
- Usa la IP de red que muestra el servidor (no localhost)
- Asegúrate de que el firewall permita conexiones en el puerto 3000

### Comandos no se ejecutan
- Solo funciona en Windows (usa PowerShell para ejecutar comandos)
- El servidor debe tener permisos de administrador para ciertos comandos

## Soporte

📧 Contacto: https://mhenriquezdev.com/
📚 Documentación completa: Ver README-DEPLOYMENT.md en el repositorio

---
© 2026 Manuel Henriquez - Todos los derechos reservados
"@

# Crear paquete Windows
Write-Host "  → Creando ZIP para Windows..." -ForegroundColor Cyan
$winDir = "dist/releases/StreamDeck-Server-Windows-v$version"
New-Item -ItemType Directory -Path $winDir | Out-Null
Copy-Item "dist/StreamDeck-Server-Windows.exe" -Destination $winDir
$serverReadme | Out-File -FilePath "$winDir/README.txt" -Encoding UTF8

# Crear script de inicio para Windows
$startBat = @"
@echo off
title Stream Deck Server v$version
echo =========================================
echo   Stream Deck Server v$version
echo =========================================
echo.
echo Iniciando servidor...
echo IMPORTANTE: No cierres esta ventana
echo.
StreamDeck-Server-Windows.exe
pause
"@
$startBat | Out-File -FilePath "$winDir/START-SERVER.bat" -Encoding ASCII

Compress-Archive -Path $winDir -DestinationPath "dist/releases/StreamDeck-Server-Windows-v$version.zip" -Force

# Crear paquete macOS
Write-Host "  → Creando ZIP para macOS..." -ForegroundColor Cyan
$macDir = "dist/releases/StreamDeck-Server-macOS-v$version"
New-Item -ItemType Directory -Path $macDir | Out-Null
Copy-Item "dist/StreamDeck-Server-macOS" -Destination $macDir
$serverReadme | Out-File -FilePath "$macDir/README.txt" -Encoding UTF8
Compress-Archive -Path $macDir -DestinationPath "dist/releases/StreamDeck-Server-macOS-v$version.zip" -Force

# Crear paquete Linux
Write-Host "  → Creando ZIP para Linux..." -ForegroundColor Cyan
$linuxDir = "dist/releases/StreamDeck-Server-Linux-v$version"
New-Item -ItemType Directory -Path $linuxDir | Out-Null
Copy-Item "dist/StreamDeck-Server-Linux" -Destination $linuxDir
$serverReadme | Out-File -FilePath "$linuxDir/README.txt" -Encoding UTF8
Compress-Archive -Path $linuxDir -DestinationPath "dist/releases/StreamDeck-Server-Linux-v$version.zip" -Force

# 5. Copiar frontend build
Write-Host "  → Copiando frontend build..." -ForegroundColor Cyan
Copy-Item "apps/web/dist" -Destination "dist/releases/StreamDeck-PWA-v$version" -Recurse

# 6. Copiar ejecutables al public del frontend para descargas
Write-Host ""
Write-Host "📦 Copiando ejecutables al frontend..." -ForegroundColor Yellow
$downloadsDir = "apps/web/public/downloads"
if (-not (Test-Path $downloadsDir)) {
    New-Item -ItemType Directory -Path $downloadsDir | Out-Null
}

# Copiar ZIPs al frontend
Copy-Item "dist/releases/StreamDeck-Server-Windows-v$version.zip" -Destination $downloadsDir
Copy-Item "dist/releases/StreamDeck-Server-macOS-v$version.zip" -Destination $downloadsDir
Copy-Item "dist/releases/StreamDeck-Server-Linux-v$version.zip" -Destination $downloadsDir

Write-Host "✅ Ejecutables copiados a apps/web/public/downloads/" -ForegroundColor Green

# 7. Frontend README
$frontendReadme = @"
# Stream Deck PWA v$version

Este es el frontend de la aplicación Stream Deck.

## Opciones de Instalación

### Opción 1: Servir con un servidor web (Recomendado)

1. Instala Node.js si no lo tienes
2. Ejecuta en esta carpeta:
   ``
   npx serve -s .
   ``
3. Abre el navegador en ``http://localhost:3000``
4. Instala la PWA desde el navegador

### Opción 2: Subir a hosting

Sube el contenido de esta carpeta a:
- Vercel (vercel.com)
- Netlify (netlify.com)
- GitHub Pages
- Tu propio servidor

### Opción 3: Abrir directamente

Simplemente abre ``index.html`` en tu navegador.
**Nota:** Algunas funciones pueden no trabajar correctamente.

## Configuración

1. Una vez abierta la app, click en ⚙️ (Configuración)
2. Ingresa la URL del servidor
3. Prueba la conexión
4. Guarda y recarga

---
© 2026 Manuel Henriquez
"@

$frontendReadme | Out-File -FilePath "dist/releases/StreamDeck-PWA-v$version/README.txt" -Encoding UTF8
Compress-Archive -Path "dist/releases/StreamDeck-PWA-v$version" -DestinationPath "dist/releases/StreamDeck-PWA-v$version.zip" -Force

Write-Host ""
Write-Host "💡 IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   Los archivos de descarga YA están en apps/web/public/downloads/" -ForegroundColor Cyan
Write-Host "   Cuando hagas el build del frontend, se incluirán automáticamente" -ForegroundColor Cyan
Write-Host ""

# 6. Crear release notes
$releaseNotes = @"
# Stream Deck v$version - Release Notes

## 📦 Archivos Incluidos

### Servidor (Backend)
- **StreamDeck-Server-Windows-v$version.zip** - Servidor para Windows (ejecutable)
- **StreamDeck-Server-macOS-v$version.zip** - Servidor para macOS (ejecutable)
- **StreamDeck-Server-Linux-v$version.zip** - Servidor para Linux (ejecutable)

### Cliente (Frontend PWA)
- **StreamDeck-PWA-v$version.zip** - Aplicación web progresiva

## 🚀 Inicio Rápido

### 1. Instalar el Servidor en tu PC
- Descarga el archivo correspondiente a tu sistema operativo
- Descomprime el archivo
- Ejecuta el servidor (ver README.txt incluido)
- Anota la IP de red que aparece en la consola

### 2. Instalar la PWA en tu tablet/móvil
- Descarga StreamDeck-PWA-v$version.zip
- Sírvelo con un servidor web o súbelo a hosting
- Abre la URL en tu tablet/móvil
- Instala la PWA desde el navegador
- Configura la IP del servidor (botón ⚙️)

## ✨ Características

- 🎯 Control remoto de tu PC desde cualquier dispositivo
- 📱 PWA instalable en móvil/tablet
- 🎨 Botones personalizables con iconos y colores
- 🌓 Tema claro/oscuro
- 🔄 Drag & Drop para reorganizar
- 🎵 Comandos multimedia preconfigurados
- 🪟 Acceso rápido a apps de Windows

## 📋 Requisitos

### Servidor
- Windows, macOS o Linux
- Puerto 3000 disponible
- Firewall configurado para permitir conexiones

### Cliente
- Navegador moderno con soporte para PWA
- Conexión a la misma red que el servidor

## 📚 Documentación Completa

Ver README-DEPLOYMENT.md en el repositorio de GitHub.

## 🐛 Reporte de Bugs

https://mhenriquezdev.com/

---

© 2026 Manuel Henriquez - Todos los derechos reservados
Para uso personal únicamente.
"@

$releaseNotes | Out-File -FilePath "dist/releases/RELEASE-NOTES.md" -Encoding UTF8

# Resumen
Write-Host ""
Write-Host "✅ =====================================" -ForegroundColor Green
Write-Host "   Build completado exitosamente!" -ForegroundColor Green
Write-Host "✅ =====================================" -ForegroundColor Green
Write-Host ""
Write-Host "📦 Archivos generados en: dist/releases/" -ForegroundColor Cyan
Write-Host ""
Get-ChildItem "dist/releases" -File | ForEach-Object {
    $size = [math]::Round($_.Length / 1MB, 2)
    Write-Host "   📄 $($_.Name) ($size MB)" -ForegroundColor White
}
Write-Host ""
Write-Host "🎯 Próximos pasos:" -ForegroundColor Yellow
Write-Host "   1. Prueba los ejecutables localmente" -ForegroundColor White
Write-Host "   2. Sube los archivos ZIP a GitHub Releases" -ForegroundColor White
Write-Host "   3. O sírvelos desde tu propio servidor" -ForegroundColor White
Write-Host ""
Write-Host "📝 Comando para crear GitHub Release:" -ForegroundColor Cyan
Write-Host "   gh release create v$version ./dist/releases/*.zip --notes-file ./dist/releases/RELEASE-NOTES.md" -ForegroundColor Gray
Write-Host ""
