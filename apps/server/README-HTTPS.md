# Configuración HTTPS para Stream Deck Server

Este documento explica cómo habilitar HTTPS en el Stream Deck Server para conectarlo de forma segura desde tu PWA.

## ¿Por qué HTTPS?

Cuando tu PWA está alojada en HTTPS (como `https://streamdeck.mhenriquezdev.com/`), el navegador requiere que todas las peticiones a APIs también sean HTTPS. Esto es una medida de seguridad llamada "Mixed Content Blocking".

## Generación de Certificados SSL

### Opción 1: Durante el Build (Recomendado)

Cuando ejecutes el script `build-portable.ps1`, el sistema te preguntará automáticamente si deseas generar certificados SSL:

```powershell
.\build-portable.ps1
```

Responde "s" (sí) cuando te pregunte sobre generar certificados.

### Opción 2: Manual

Puedes generar los certificados manualmente en cualquier momento:

```powershell
.\scripts\generate-cert.ps1
```

Este script:

- Crea certificados autofirmados válidos por 1 año
- Los guarda en la carpeta `certs/`
- Soporta múltiples dominios (localhost, \*.mhenriquezdev.com)

## ¿Cómo Funciona?

1. **Con certificados**: El servidor automáticamente detecta los certificados en `apps/server/certs/` y arranca en modo HTTPS
2. **Sin certificados**: El servidor arranca en modo HTTP normal

## Uso en Producción

### En el Servidor

1. Ejecuta el build portable con certificados:

   ```powershell
   cd apps/server
   .\build-portable.ps1
   ```

2. Los certificados se copiarán automáticamente a la carpeta portable

3. Distribuye la carpeta `StreamDeck-Server-Portable/` que incluye:
   - El servidor compilado
   - Los certificados SSL (si se generaron)
   - Script de inicio

### En el Cliente (PWA)

1. Abre la PWA desde tu dominio HTTPS
2. Ve a Configuración (⚙️)
3. Ingresa la URL con HTTPS: `https://192.168.x.x:8765`
4. **Primera vez**: El navegador mostrará una advertencia de certificado autofirmado
5. Acepta la advertencia (es seguro, es tu servidor local)

## Advertencias de Seguridad

Los certificados autofirmados son **seguros y recomendados** para:

- Desarrollo local
- Redes privadas/domésticas
- Uso personal

Sin embargo, el navegador mostrará una advertencia porque:

- No son emitidos por una Autoridad Certificadora (CA) confiable
- Es el comportamiento esperado y correcto

### Cómo Aceptar el Certificado

**En Desktop (Chrome/Edge):**

1. Ve a `https://192.168.x.x:8765` en tu navegador
2. Verás "Tu conexión no es privada"
3. Haz clic en "Avanzado"
4. Haz clic en "Continuar a 192.168.x.x (no seguro)"

**En Mobile (iOS Safari):**

1. Ve a la URL en Safari
2. Verás "Esta conexión no es privada"
3. Toca "Mostrar detalles"
4. Toca "Visitar este sitio web"
5. Confirma "Visitar sitio web"

**En Mobile (Android Chrome):**

1. Ve a la URL
2. Toca "Avanzado"
3. Toca "Continuar a 192.168.x.x (no seguro)"

## Requisitos del Sistema

### Para generar certificados necesitas:

**Opción A - OpenSSL (Recomendado):**

- Instala OpenSSL: https://slproweb.com/products/Win32OpenSSL.html
- O usa Chocolatey: `choco install openssl`

**Opción B - PowerShell (Incluido en Windows):**

- Ejecuta PowerShell como Administrador
- Usa el script de generación

## Estructura de Archivos

```
apps/server/
├── certs/                    # Certificados SSL (ignorado en git)
│   ├── server.crt           # Certificado público
│   └── server.key           # Clave privada
├── scripts/
│   └── generate-cert.ps1    # Script generador
└── src/
    └── main.ts              # Detecta automáticamente los certificados
```

## Troubleshooting

### "El certificado no es válido"

- Normal para certificados autofirmados
- Acepta manualmente la advertencia en el navegador

### "No se puede conectar"

- Verifica que el servidor esté corriendo
- Confirma que estás usando `https://` en la URL
- Verifica que el puerto 8765 esté abierto

### "Mixed Content Blocked"

- Tu PWA está en HTTPS pero intentas conectar a HTTP
- Solución: Genera certificados y usa HTTPS en el servidor

### "openssl no está instalado"

- El script usará PowerShell como alternativa
- O instala OpenSSL para mayor compatibilidad

## Certificados para Producción Real

Si deseas usar certificados de verdad (sin advertencias), necesitas:

1. **Let's Encrypt** (gratis, requiere dominio público)
2. **Certificado comercial** (de pago, CA confiable)

Para este proyecto (uso local), los certificados autofirmados son la solución correcta.

---

© 2026 Manuel Henriquez
