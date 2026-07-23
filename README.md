# SpartanHub

Convierte tu PC en un **Stream Deck**: controla tu ordenador desde el móvil, la tablet o cualquier navegador de la red local. Lanza aplicaciones, abre URLs, envía teclas multimedia, controla el volumen y usa el móvil como panel táctil y trackpad.

> El repositorio se llama `stream-deck` por motivos históricos; el producto es **SpartanHub**.

## ✨ Características

- 🎯 **Control remoto** de tu PC desde cualquier dispositivo de la red
- 🖥️ **App de escritorio** nativa (Electron) + **servidor** local (NestJS)
- 📱 **Cliente móvil** (Android vía Capacitor) y **PWA**
- 🎨 Botones personalizables: iconos, colores, comandos y subida de iconos propios
- 🎵 Comandos multimedia: volumen, play/pausa, siguiente/anterior
- 🪟 Detección de apps instaladas y extracción automática de sus iconos
- 🖱️ Trackpad / mouse remoto por WebSocket
- 🔒 Seguridad: PIN (hasheado con scrypt), biometría en el móvil, rate limiting y validación de comandos

## 🏗️ Arquitectura

| Componente | Stack | Puerto |
| ---------- | ----- | ------ |
| **Servidor** | NestJS + Socket.IO (`apps/server`) | `7500` |
| **Escritorio/Web** | Vue 3 + PrimeVue + Vite + Electron (`apps/web`) | `5173` (dev) |
| **Compartido** | Tipos/utilidades (`packages/shared`) | — |

Monorepo gestionado con **pnpm workspaces**.

## 🚀 Desarrollo

Requisitos: Node.js 20+, pnpm 10+.

```bash
pnpm install
pnpm dev
```

`pnpm dev` levanta en paralelo:

- **SERVER** — backend NestJS en `http://localhost:7500` (imprime todas las IPs de red)
- **WEB** — ventana Electron con Vite y hot reload en `http://localhost:5173`

Para conectar otro dispositivo, usa la IP de red que muestra el servidor al arrancar (`http://<tu-ip>:7500`).

### Comandos individuales

```bash
pnpm dev:server    # solo backend
pnpm dev:web       # solo frontend (Vite)
pnpm dev:electron  # solo Electron
pnpm test:server   # tests del backend (Jest)
```

## 📦 Build

```bash
pnpm build                 # compila server + web
pnpm build:electron:win    # instalador NSIS + portable (Windows)
pnpm build:apk             # APK de Android (Capacitor)
```

Los artefactos de Windows quedan en `apps/web/dist/`. Para generar los ejecutables standalone del servidor y empaquetar releases, consulta **[docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)**.

## 🔒 Seguridad

- El primer arranque pide configurar un **PIN de 4 dígitos**; sin PIN, la app queda bloqueada.
- El PIN se guarda **hasheado con scrypt + salt** (nunca en texto plano) y admite biometría en el cliente móvil.
- El login tiene **rate limiting por IP** con bloqueo escalado ante intentos fallidos.
- Los comandos se validan con una **allowlist** (URLs/rutas/ejecutables permitidos) que bloquea la inyección de comandos encadenados.

El servidor escucha en `0.0.0.0`, así que está pensado para **redes de confianza**. No lo expongas directamente a Internet.

## 📁 Datos de runtime

La carpeta `apps/server/data/` (configuración, sesiones, comandos, iconos extraídos) se **genera en ejecución** y está en `.gitignore` — no se versiona.

## 📚 Documentación

- **[docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)** — generar instaladores y publicar releases
- **[docs/CHANGELOG-ELECTRON.md](docs/CHANGELOG-ELECTRON.md)** — historial de la migración a Electron
