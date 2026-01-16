param (
  [string]$CertPath
)

try {
  if (-not (Test-Path $CertPath)) {
    exit 1
  }

  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($CertPath)

  if ($cert.NotAfter.ToUniversalTime() -gt (Get-Date).ToUniversalTime()) {
    exit 0
  } else {
    exit 1
  }
}
catch {
  exit 1
}
