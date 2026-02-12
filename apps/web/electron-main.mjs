import { spawn } from 'child_process'
import { app, BrowserWindow } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

console.log('========================================')
console.log('ELECTRON-MAIN.MJS LOADED')
console.log('app.isPackaged:', app.isPackaged)
console.log('process.resourcesPath:', process.resourcesPath)
console.log('========================================')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log('__dirname:', __dirname)

const isDev = !app.isPackaged
console.log('isDev:', isDev)

// Logger
const logDir = path.join(app.getPath('userData'), 'logs')
try {
  mkdirSync(logDir, { recursive: true })
} catch (e) {}

const logFile = path.join(logDir, 'electron.log')
const logQueue = []

const log = (message) => {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}\n`

  // SIEMPRE a console, sin importar qué
  console.log('[ELECTRON-MAIN]', message)

  logQueue.push(message)

  if (mainWindow && mainWindow.webContents) {
    try {
      // Escapar TODOS los caracteres problemáticos
      const escaped = message
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
      mainWindow.webContents.executeJavaScript(
        `console.log("%c[Main Process] ${escaped}", "color: blue; font-weight: bold")`,
      )
    } catch (e) {
      console.error('[LOG ERROR]', e)
    }
  }

  // Intentar escribir al archivo
  try {
    appendFileSync(logFile, line)
  } catch (e) {
    console.error('[FILE LOG ERROR]', e.message)
  }
}

const flushLogs = () => {
  console.log('[FLUSH] Attempting to flush', logQueue.length, 'logs')

  if (mainWindow && mainWindow.webContents && logQueue.length > 0) {
    logQueue.forEach((msg, index) => {
      try {
        const escaped = msg
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '')
        mainWindow.webContents.executeJavaScript(
          `console.log("%c[Main Process QUEUED] ${escaped}", "color: purple; font-weight: bold")`,
        )
      } catch (e) {
        console.error(`[FLUSH ERROR ${index}]`, e)
      }
    })
    logQueue.length = 0
  } else {
    console.log('[FLUSH] Cannot flush:', {
      hasWindow: !!mainWindow,
      hasContents: !!(mainWindow && mainWindow.webContents),
      queueLength: logQueue.length,
    })
  }
}

let mainWindow
let backendProcess = null

const waitForBackend = async (maxAttempts = 20) => {
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

  log('Backend did not respond in time')
  return false
}

const startBackend = async () => {
  if (isDev) {
    log('Development mode: Backend should be running on port 7500')
    await waitForBackend()
    return
  }

  log('=== Starting backend server ===')
  log('App isPackaged: ' + app.isPackaged)
  log('App path: ' + app.getAppPath())
  log('Process resourcesPath: ' + process.resourcesPath)
  log('Process execPath: ' + process.execPath)

  const backendDir = path.join(process.resourcesPath, 'backend')
  const backendScript = path.join(backendDir, 'main.js')

  log('Backend dir: ' + backendDir)
  log('Backend script: ' + backendScript)

  // Debug: Listar contenido de resources
  try {
    if (existsSync(process.resourcesPath)) {
      const resourcesContent = readdirSync(process.resourcesPath)
      log('Resources directory contents: ' + resourcesContent.join(', '))
    } else {
      log('Resources directory does not exist!')
    }

    if (existsSync(backendDir)) {
      const backendContent = readdirSync(backendDir)
      log('Backend directory contents: ' + backendContent.join(', '))
    } else {
      log('Backend directory does not exist!')
    }
  } catch (e) {
    log('Error listing directories: ' + e.message)
  }

  if (!existsSync(backendScript)) {
    log('✗ Backend script NOT found at: ' + backendScript)
    return
  }

  log('✓ Backend script found')

  backendProcess = spawn(process.execPath, [backendScript], {
    cwd: backendDir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '7500',
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  })

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
    log(`Backend exited with code ${code}`) // ✅ CORREGIDO
  })

  backendProcess.on('error', (err) => {
    log(`Backend spawn error: ${err.message}`) // ✅ CORREGIDO
  })

  await waitForBackend()
}

const createWindow = async () => {
  log('Creating window...')

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
    ? 'http://localhost:5173'
    : `file://${path.join(app.getAppPath(), 'dist', 'index.html')}`

  log('Loading URL: ' + startUrl)

  try {
    await mainWindow.loadURL(startUrl)
    log('✓ URL loaded successfully')
  } catch (err) {
    log('✗ Failed to load URL: ' + err.message)
  }

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

  if (isDev) {
  }
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', async () => {
  console.log('========================================')
  console.log('APP READY EVENT FIRED!!!')
  console.log('========================================')

  log('=== App ready event fired ===')
  try {
    await startBackend()
    log('Backend started, creating window...')
    await createWindow()
    log('=== Window created successfully ===')
  } catch (err) {
    console.error('STARTUP ERROR:', err)
    log('!!! Error during startup: ' + err.message)
    log('Stack trace: ' + err.stack)
  }
})

app.on('window-all-closed', () => {
  if (backendProcess) {
    log('Killing backend process...')
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
