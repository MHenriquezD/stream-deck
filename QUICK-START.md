# Quick Start Guide - Stream Deck Desktop App

## 🚀 Get Started in 3 Steps

### 1. Start Development

```bash
pnpm dev
```

This launches:

- Backend API server on `http://localhost:7500`
- Electron window with Vue frontend
- Vite dev server with hot reload

### 2. Build for Windows

```bash
pnpm build:electron:win
```

Creates:

- `apps/web/dist/Stream Deck-1.0.0.exe` (NSIS installer)
- `apps/web/dist/Stream Deck-1.0.0-portable.exe` (portable version)

### 3. Test the Build

```bash
cd apps/web/dist
# Double-click the .exe file to run
```

---

## 📋 Command Reference

| Command                   | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `pnpm dev`                | Run backend + Electron together (hot reload) |
| `pnpm dev:server`         | Backend only                                 |
| `pnpm dev:web`            | Vite dev server only                         |
| `pnpm dev:electron`       | Electron + Vite dev server                   |
| `pnpm build:electron`     | Build production assets                      |
| `pnpm build:electron:win` | Build Windows exe/installer                  |

---

## 🔌 Backend API

Available on `http://localhost:7500`

### Endpoints

- `GET /` - Health check
- `GET /network-info` - Network interfaces
- `GET /command` - List commands
- `POST /command` - Create command
- `POST /command/execute/:id` - Execute command

---

## 📁 Project Structure

```
apps/
├── server/          # NestJS backend (HTTP)
└── web/             # Electron frontend (Vue)
    ├── electron-main.mjs
    ├── preload.mjs
    ├── electron-builder.yml
    └── src/
```

---

## 🐛 Troubleshooting

| Issue                  | Solution                                             |
| ---------------------- | ---------------------------------------------------- |
| Electron won't start   | `pnpm install --force` then `pnpm dev`               |
| Port 7500 in use       | Kill process: `Get-NetTCPConnection -LocalPort 7500` |
| Hot reload not working | Check Vite output, port 5173 must be available       |

---

## 📚 Full Documentation

See [ELECTRON-README.md](./ELECTRON-README.md) for complete documentation.

---

**Status:** ✅ Ready to develop and build Windows desktop apps!
