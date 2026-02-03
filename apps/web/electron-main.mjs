import { app, BrowserWindow } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Detectar si estamos en desarrollo o producción
// En desarrollo, el app estará en node_modules/electron
// En producción, estará dentro del bundle de electron-builder
const isDev = !app.isPackaged

let mainWindow

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(app.getAppPath(), 'dist', 'index.html')}` // Production build

  mainWindow.loadURL(startUrl)

  // Abre DevTools para ver errores
  if (isDev || !app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
