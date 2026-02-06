import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import { appendFileSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Detectar si estamos en desarrollo o producción
const isDev = !app.isPackaged

// Logger - escribir a archivo y a la consola de DevTools
const logDir = path.join(app.getPath('userData'), 'logs')
try {
  mkdirSync(logDir, { recursive: true })
} catch (e) {
  // ignorar
}
const logFile = path.join(logDir, 'electron.log')

// Array para almacenar logs antes de que la ventana esté lista
const logQueue = []

const log = (message) => {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`
  console.log(message) // También mostrar en consola del main process

  // Guardar en el queue para enviar después
  logQueue.push(message)

  // Enviar a la consola de DevTools si la ventana está disponible
  if (mainWindow && mainWindow.webContents) {
    try {
      mainWindow.webContents.executeJavaScript(
        `console.log("%c[Main Process] ${message.replace(/"/g, '\\"')}",  "color: blue; font-weight: bold")`,
      )
    } catch (e) {
      // ignorar si no se puede ejecutar
    }
  }

  try {
    appendFileSync(logFile, line)
  } catch (e) {
    // ignorar si no se puede escribir
  }
}

// Función para enviar todos los logs almacenados al renderer
const flushLogs = () => {
  if (mainWindow && mainWindow.webContents && logQueue.length > 0) {
    logQueue.forEach((msg) => {
      try {
        mainWindow.webContents.executeJavaScript(
          `console.log("%c[Main Process] ${msg.replace(/"/g, '\\"')}",  "color: blue; font-weight: bold")`,
        )
      } catch (e) {
        // ignorar
      }
    })
    logQueue.length = 0 // Limpiar el array
  }
}

let mainWindow
let backendProcess = null

// Función para esperar a que el backend esté listo
const waitForBackend = async (maxAttempts = 60) => {
  log('Waiting for backend on port 7500...')

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('http://127.0.0.1:7500/health')

      if (res.ok) {
        log('✓ Backend is ready!')
        return true
      }
    } catch (err) {
      log(`Attempt ${i + 1}/${maxAttempts}: Backend not ready yet`)
    }

    await new Promise((r) => setTimeout(r, 500))
  }

  log('⚠ Backend did not respond in time')
  return false
}

// Función para iniciar el backend
const startBackend = async () => {
  if (isDev) {
    // En desarrollo, el backend ya está corriendo en otro proceso
    log('Development mode: Backend should be running on port 7500')
    await waitForBackend()
    return
  }

  // En producción, lanzar el backend como child process
  log('Starting backend server...')
  log('App path: ' + app.getAppPath())

  const backendDir = path.join(process.resourcesPath, 'server')
  const backendScript = path.join(backendDir, 'dist', 'main.js')

  log('Backend dir: ' + backendDir)
  log('Backend script: ' + backendScript)
  log('Electron execPath: ' + process.execPath)
  const startBackendBat = path.join(app.getAppPath(), 'start-backend.bat')
  log('Backend script path: ' + backendScript)

  // Verificar si el archivo existe
  if (existsSync(backendScript)) {
    log('✓ Backend script found')

    backendProcess = spawn(
      process.execPath, // Node embebido de Electron
      [backendScript],
      {
        cwd: backendDir,
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
      },
    )

    // Capturar logs del backend
    if (backendProcess.stdout) {
      backendProcess.stdout.setEncoding('utf8')
      backendProcess.stdout.on('data', (data) => {
        data
          .toString()
          .split('\n')
          .forEach((line) => {
            if (line.trim()) log('[Backend] ' + line)
          })
      })
    }

    if (backendProcess.stderr) {
      backendProcess.stderr.setEncoding('utf8')
      backendProcess.stderr.on('data', (data) => {
        data
          .toString()
          .split('\n')
          .forEach((line) => {
            if (line.trim()) log('[Backend ERROR] ' + line)
          })
      })
    }

    backendProcess.on('exit', (code) => {
      log(`Backend exited with code ${code}`)
    })

    await waitForBackend()
  } else {
    log('✗ Backend script NOT found at: ' + backendScript)
  }
}

const createWindow = async () => {
  log('Creating window...')
  log('App path: ' + app.getAppPath())

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

  log('Loading URL: ' + startUrl)
  mainWindow.loadURL(startUrl)

  // Cuando el contenido cargue, enviar todos los logs del queue
  mainWindow.webContents.on('did-finish-load', () => {
    log('Content loaded, flushing logs...')
    flushLogs()
  })

  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription) => {
      log('Failed to load: ' + errorCode + ' - ' + errorDescription)
    },
  )

  mainWindow.webContents.on('crashed', () => {
    log('Renderer process crashed')
  })

  // Abre DevTools para ver errores
  if (isDev || !app.isPackaged) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {
  log('App ready event fired')
  try {
    await startBackend()
    log('Backend started, creating window...')
    await createWindow()
    log('Window created')
  } catch (err) {
    log('Error during startup: ' + err.message)
  }
})

app.on('window-all-closed', () => {
  // Terminar el backend cuando se cierre la app
  if (backendProcess) {
    backendProcess.kill()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})
