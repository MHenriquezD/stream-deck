# Script para crear un "instalador" portable del Stream Deck Server
# Este script copia el servidor compilado a una carpeta portable

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Stream Deck Server - Build Portable" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

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
   - Ejemplo: http://192.168.1.100:3000

## Requisitos:

- Node.js debe estar instalado en el sistema
- Puerto 3000 debe estar disponible

## Notas:

- Los comandos guardados se almacenan en la carpeta 'data'
- Para detener el servidor, cierra la ventana o presiona Ctrl+C

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
