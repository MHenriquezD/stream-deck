# Script para generar certificados SSL autofirmados
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Generador de Certificados SSL" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Crear directorio certs si no existe
$certsDir = Join-Path $PSScriptRoot "..\certs"
if (-not (Test-Path $certsDir)) {
    New-Item -ItemType Directory -Path $certsDir | Out-Null
}

$certPath = Join-Path $certsDir "server.crt"
$keyPath = Join-Path $certsDir "server.key"

# Verificar si ya existen certificados
if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Host "⚠️  Ya existen certificados en la carpeta certs/" -ForegroundColor Yellow
    $overwrite = Read-Host "¿Deseas sobrescribirlos? (s/n)"
    if ($overwrite -ne "s") {
        Write-Host "❌ Operación cancelada" -ForegroundColor Red
        exit 0
    }
}

Write-Host "🔐 Generando certificados SSL autofirmados..." -ForegroundColor Yellow
Write-Host ""

# Generar certificado autofirmado usando OpenSSL
# Si OpenSSL no está disponible, intentar con PowerShell
try {
    # Intentar con OpenSSL primero
    $opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue
    
    if ($opensslCmd) {
        # Usar OpenSSL
        Write-Host "📋 Usando OpenSSL..." -ForegroundColor Cyan
        
        $configContent = @"
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
x509_extensions = v3_req

[dn]
C=CL
ST=Region Metropolitana
L=Santiago
O=StreamDeck
OU=Development
CN=localhost

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.mhenriquezdev.com
IP.1 = 127.0.0.1
"@
        
        $configPath = Join-Path $certsDir "openssl.cnf"
        $configContent | Out-File -FilePath $configPath -Encoding UTF8
        
        # Generar clave privada y certificado
        & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
            -keyout $keyPath `
            -out $certPath `
            -config $configPath
        
        Remove-Item $configPath -Force
        
    } else {
        # Usar PowerShell como alternativa
        Write-Host "📋 Usando PowerShell..." -ForegroundColor Cyan
        
        $cert = New-SelfSignedCertificate `
            -Subject "CN=localhost" `
            -DnsName @("localhost", "*.mhenriquezdev.com", "127.0.0.1") `
            -KeyAlgorithm RSA `
            -KeyLength 2048 `
            -NotAfter (Get-Date).AddYears(1) `
            -CertStoreLocation "Cert:\CurrentUser\My" `
            -FriendlyName "StreamDeck Server Certificate" `
            -HashAlgorithm SHA256 `
            -KeyUsage DigitalSignature, KeyEncipherment `
            -TextExtension @("2.5.29.37={text}1.3.6.1.5.5.7.3.1")
        
        # Exportar certificado en formato PEM
        $certBase64 = [Convert]::ToBase64String($cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert), [System.Base64FormattingOptions]::InsertLineBreaks)
        $certPem = "-----BEGIN CERTIFICATE-----`n"
        $certPem += $certBase64
        $certPem += "`n-----END CERTIFICATE-----"
        $certPem | Out-File -FilePath $certPath -Encoding ASCII -NoNewline
        
        # Exportar clave privada en formato PEM
        $rsaKey = [System.Security.Cryptography.X509Certificates.RSACertificateExtensions]::GetRSAPrivateKey($cert)
        $keyBytes = $rsaKey.ExportPkcs8PrivateKey()
        $keyBase64 = [Convert]::ToBase64String($keyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
        
        $keyPem = "-----BEGIN PRIVATE KEY-----`n"
        $keyPem += $keyBase64
        $keyPem += "`n-----END PRIVATE KEY-----"
        $keyPem | Out-File -FilePath $keyPath -Encoding ASCII -NoNewline
        
        # Limpiar el certificado del store
        Remove-Item -Path "Cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
    }
    
    Write-Host ""
    Write-Host "✅ Certificados generados exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📁 Ubicación:" -ForegroundColor Cyan
    Write-Host "   Certificado: $certPath" -ForegroundColor White
    Write-Host "   Clave:       $keyPath" -ForegroundColor White
    Write-Host ""
    Write-Host "⚠️  IMPORTANTE:" -ForegroundColor Yellow
    Write-Host "   - Estos son certificados autofirmados para desarrollo" -ForegroundColor White
    Write-Host "   - Los navegadores mostrarán una advertencia de seguridad" -ForegroundColor White
    Write-Host "   - Deberás aceptar el certificado manualmente en cada dispositivo" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ Error al generar certificados: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Asegúrate de tener OpenSSL instalado o ejecutar PowerShell como administrador" -ForegroundColor Yellow
    exit 1
}
