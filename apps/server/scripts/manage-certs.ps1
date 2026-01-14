# Utilidad rápida para gestionar certificados SSL

$certsDir = Join-Path $PSScriptRoot "..\certs"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Gestión de Certificados SSL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar estado actual
if (Test-Path "$certsDir\server.crt") {
    Write-Host "✅ Certificados SSL encontrados" -ForegroundColor Green
    $cert = Get-Item "$certsDir\server.crt"
    Write-Host "   Fecha creación: $($cert.CreationTime)" -ForegroundColor White
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "  1. Regenerar certificados" -ForegroundColor White
    Write-Host "  2. Eliminar certificados (modo HTTP)" -ForegroundColor White
    Write-Host "  3. Salir" -ForegroundColor White
    Write-Host ""
    $option = Read-Host "Selecciona una opción (1-3)"
    
    switch ($option) {
        "1" {
            & "$PSScriptRoot\generate-cert.ps1"
        }
        "2" {
            Remove-Item $certsDir -Recurse -Force
            Write-Host ""
            Write-Host "✅ Certificados eliminados. El servidor usará HTTP" -ForegroundColor Green
            Write-Host ""
        }
        default {
            Write-Host "Saliendo..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⚠️  No se encontraron certificados SSL" -ForegroundColor Yellow
    Write-Host "   El servidor se ejecutará en modo HTTP" -ForegroundColor White
    Write-Host ""
    $generate = Read-Host "¿Deseas generar certificados ahora? (s/n)"
    
    if ($generate -eq "s") {
        & "$PSScriptRoot\generate-cert.ps1"
    }
}
