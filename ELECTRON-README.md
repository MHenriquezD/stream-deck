# Stream Deck Desktop Application

This is a native Windows desktop application built with Electron and Vue.js.

## Architecture

- **Backend:** NestJS HTTP server running on `http://localhost:7500`
- **Frontend:** Electron desktop app with Vite dev server on `http://localhost:5173`
- **Framework:** Electron 40.1.0 for native Windows desktop experience

## Development

### Start Development Environment

Run both the backend server and Electron app simultaneously:

```bash
pnpm dev
```

This will:

1. Start the NestJS backend on port 7500
2. Start the Vite dev server on port 5173
3. Launch the Electron window with hot reload

The backend will display all available network IPs for testing on different devices.

### Development Features

- **Hot Reload:** Changes to Vue components automatically reload in the Electron window
- **DevTools:** Browser DevTools opened by default in development mode
- **Backend Logs:** See all server logs in the terminal

### Individual Commands

If you want to run components separately:

```bash
pnpm dev:server     # Run only the NestJS backend
pnpm dev:web        # Run only the Vite dev server
pnpm dev:electron   # Run Electron with Vite dev server
```

## Building

### Build for Windows

Create a Windows executable (installer + portable):

```bash
pnpm build:electron:win
```

This will:

1. Build the backend (TypeScript → JavaScript)
2. Build the frontend (Vue → HTML/CSS/JS)
3. Run electron-builder to create Windows packages

Output files will be in `apps/web/dist/`:

- `Stream Deck-1.0.0.exe` - NSIS installer
- `Stream Deck-1.0.0-portable.exe` - Standalone portable executable

### Building Configuration

Configuration is defined in [apps/web/electron-builder.yml](./electron-builder.yml):

- NSIS installer settings
- Portable executable settings
- Package contents and metadata

## Backend API

The backend runs on `http://localhost:7500` with the following endpoints:

### Status & Info

- `GET /` - Health check
- `GET /network-info` - Get available network interfaces
- `GET /downloads/list` - List available downloads

### Commands

- `GET /command` - List all available commands
- `POST /command` - Create a new command
- `POST /command/execute/:id` - Execute a command by ID
- `GET /command/presets/multimedia` - Get multimedia command presets
- `GET /command/installed-apps` - Get list of installed applications

## Network

All available local IPs are displayed when starting the backend:

```
📍 Local:    http://localhost:7500
📱 Network:  http://192.168.0.186:7500
📱 Network:  http://10.4.132.66:7500
```

Use any of these addresses to access the backend from another device on the network.

## Project Structure

```
apps/web/
├── electron-main.mjs      # Electron main process
├── preload.mjs            # Electron preload script (IPC)
├── electron-builder.yml   # Build configuration
├── vite.config.js         # Vite dev server config
├── src/
│   ├── App.vue            # Root Vue component
│   ├── main.ts            # Vue app entry point
│   └── components/        # Vue components
└── package.json           # Frontend dependencies

apps/server/
├── src/
│   ├── main.ts            # HTTP server entry point
│   ├── app.controller.ts  # API routes
│   ├── command/           # Command execution module
│   └── download/          # Download management module
└── package.json           # Backend dependencies
```

## Environment

- **Node.js:** 18.17.0+
- **pnpm:** 9.x
- **Electron:** 40.1.0
- **Vue:** 3.5.24
- **NestJS:** 11.1.11
- **TypeScript:** 5.9.3

## Troubleshooting

### Electron window doesn't appear

- Check that Vite dev server is running on port 5173
- Check browser console in DevTools for errors
- Ensure the Electron binary is installed: `pnpm install --force`

### Backend port already in use

- Kill the process using port 7500: `netstat -ano | findstr :7500`
- Or modify the port in [apps/server/src/main.ts](../server/src/main.ts)

### Build fails

- Clean and rebuild: `pnpm install --force`
- Delete build cache: `rm -rf apps/web/dist apps/server/dist node_modules/.cache`

## License

Proprietary - All rights reserved
