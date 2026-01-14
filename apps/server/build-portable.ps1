# Script para crear un "instalador" portable del Stream Deck Server
# Este script copia el servidor compilado a una carpeta portable

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Stream Deck Server - Build Portable" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existen certificados SSL
$certsDir = Join-Path $PSScriptRoot "certs"
$certPath = Join-Path $certsDir "server.crt"
$keyPath = Join-Path $certsDir "server.key"

if (-not ((Test-Path $certPath) -and (Test-Path $keyPath))) {
    Write-Host "⚠️  No se encontraron certificados SSL" -ForegroundColor Yellow
    Write-Host "   Los certificados son necesarios para HTTPS" -ForegroundColor White
    Write-Host ""
    $generateCerts = Read-Host "¿Deseas generar certificados SSL ahora? (s/n)"
    
    if ($generateCerts -eq "s") {
        $scriptPath = Join-Path $PSScriptRoot "scripts\generate-cert.ps1"
        & $scriptPath
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Error al generar certificados" -ForegroundColor Red
            Write-Host "   Continuando sin HTTPS..." -ForegroundColor Yellow
            Write-Host ""
        }
    } else {
        Write-Host "⚠️  Continuando sin HTTPS (solo HTTP)" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Compilar el servidor
Write-Host "📦 Compilando servidor..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
pnpm run build:standalone

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al compilar el servidor" -ForegroundColor Red
    exit 1
}

# Crear carpeta portable
$portableDir = ".\StreamDeck-Server-Portable"
Write-Host "📁 Creando carpeta portable..." -ForegroundColor Yellow

if (Test-Path $portableDir) {
    Remove-Item $portableDir -Recurse -Force
}

New-Item -ItemType Directory -Path $portableDir | Out-Null
New-Item -ItemType Directory -Path "$portableDir\data" | Out-Null

# Copiar el ejecutable standalone
Write-Host "📋 Copiando archivos..." -ForegroundColor Yellow
Copy-Item ".\standalone\*" -Destination $portableDir -Recurse

# Copiar certificados SSL si existen
if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Host "🔐 Copiando certificados SSL..." -ForegroundColor Yellow
    $portableCertsDir = Join-Path $portableDir "certs"
    New-Item -ItemType Directory -Path $portableCertsDir -Force | Out-Null
    Copy-Item $certPath -Destination $portableCertsDir
    Copy-Item $keyPath -Destination $portableCertsDir
}

# Crear archivo de inicio
$startScript = @"
@echo off
title Stream Deck Server
echo ========================================
echo   Stream Deck Server
echo ========================================
echo.
echo Iniciando servidor...
echo.
node index.js
pause
"@

$startScript | Out-File -FilePath "$portableDir\START-SERVER.bat" -Encoding ASCII

# Crear README
$readme = @"
# Stream Deck Server - Portable

## Cómo usar:

1. Haz doble clic en **START-SERVER.bat**
2. El servidor se iniciará y mostrará la IP local
3. Desde tu tablet/móvil:
   - Abre la app PWA del Stream Deck
   - Ve a Configuración (⚙️)
   - Ingresa la IP que aparece en la consola del servidor
   - Ejemplo: https://192.168.1.100:8765 (o http:// si no tienes certificados)

## Requisitos:

- Node.js debe estar instalado en el sistema
- Puerto 8765 debe estar disponible

## Soporte HTTPS:

Este servidor soporta HTTPS si se incluyen certificados SSL en la carpeta 'certs/'.

Para generar certificados autofirmados:
1. Ejecuta el script de generación incluido
2. Acepta la advertencia de seguridad en tu navegador
3. El servidor automáticamente usará HTTPS

**Nota:** Los certificados autofirmados son seguros para uso local/desarrollo,
pero el navegador mostrará una advertencia que debes aceptar manualmente.

## Notas:

- Los comandos guardados se almacenan en la carpeta 'data'
- Para detener el servidor, cierra la ventana o presiona Ctrl+C
- Si conectas desde una PWA en HTTPS, necesitas usar HTTPS en el servidor

---

© 2026 Manuel Henriquez
https://mhenriquezdev.com/
"@

$readme | Out-File -FilePath "$portableDir\README.md" -Encoding UTF8

Write-Host ""
Write-Host "✅ Servidor portable creado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "📁 Ubicación: $portableDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "Para distribuir:" -ForegroundColor Yellow
Write-Host "  1. Comprime la carpeta '$portableDir' en un ZIP"
Write-Host "  2. Comparte el archivo ZIP"
Write-Host "  3. El usuario solo debe descomprimirlo y ejecutar START-SERVER.bat"
Write-Host ""
