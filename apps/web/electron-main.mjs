import { spawn } from 'child_process'
import { app, BrowserWindow, ipcMain, shell, session } from 'electron'
import { appendFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { networkInterfaces } from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged

// ── Single instance lock ──
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

// ── Logger ──
const logDir = path.join(app.getPath('userData'), 'logs')
try { mkdirSync(logDir, { recursive: true }) } catch {}

const logFile = path.join(logDir, 'electron.log')
const logQueue = []

let mainWindow
let backendProcess = null

const log = (message) => {
  const timestamp = new Date().toISOString()
  console.log('[ELECTRON-MAIN]', message)
  logQueue.push(message)

  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents) {
    try {
      const escaped = message
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
      mainWindow.webContents.executeJavaScript(
        `console.log("%c[Main Process] ${escaped}", "color: blue; font-weight: bold")`,
      )
    } catch {}
  }

  try { appendFileSync(logFile, `[${timestamp}] ${message}\n`) } catch {}
}

const flushLogs = () => {
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents && logQueue.length > 0) {
    logQueue.forEach((msg) => {
      try {
        const escaped = msg
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '')
        mainWindow.webContents.executeJavaScript(
          `console.log("%c[Main Process QUEUED] ${escaped}", "color: purple; font-weight: bold")`,
        )
      } catch {}
    })
    logQueue.length = 0
  }
}

// ── Network interfaces ──
const getNetworkInterfaces = () => {
  const nets = networkInterfaces()
  const results = []
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push({ name, address: net.address, url: `http://${net.address}:7500` })
      }
    }
  }
  return { interfaces: results, preferredUrl: results[0]?.url || 'http://localhost:7500' }
}

// ── Backend management ──
const waitForBackend = async (maxAttempts = 20) => {
  log('Waiting for backend on port 7500...')
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch('http://127.0.0.1:7500/health')
      if (res.ok) { log('Backend is ready'); return true }
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  log('Backend did not respond in time')
  return false
}

const killBackend = () => {
  if (backendProcess && !backendProcess.killed) {
    log('Killing backend process...')
    backendProcess.kill()
    backendProcess = null
  }
}

const startBackend = async () => {
  if (isDev) {
    log('Development mode: Backend should be running on port 7500')
    await waitForBackend()
    return
  }

  log('Starting backend server...')

  const backendDir = path.join(process.resourcesPath, 'backend')
  const backendScript = path.join(backendDir, 'main.js')

  log('Backend dir: ' + backendDir)

  if (!existsSync(backendScript)) {
    log('Backend script NOT found at: ' + backendScript)

    try {
      if (existsSync(process.resourcesPath)) {
        log('Resources contents: ' + readdirSync(process.resourcesPath).join(', '))
      }
      if (existsSync(backendDir)) {
        log('Backend contents: ' + readdirSync(backendDir).join(', '))
      }
    } catch {}

    return
  }

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

  backendProcess.stdout?.setEncoding('utf8')
  backendProcess.stdout?.on('data', (data) => {
    data.toString().split('\n').forEach((line) => {
      if (line.trim()) log('[Backend] ' + line)
    })
  })

  backendProcess.stderr?.setEncoding('utf8')
  backendProcess.stderr?.on('data', (data) => {
    data.toString().split('\n').forEach((line) => {
      if (line.trim()) log('[Backend ERROR] ' + line)
    })
  })

  backendProcess.on('exit', (code) => { log(`Backend exited with code ${code}`) })
  backendProcess.on('error', (err) => { log(`Backend spawn error: ${err.message}`) })

  await waitForBackend()
}

// ── IPC handlers (registered once, outside createWindow) ──
ipcMain.handle('get-network-interfaces', () => getNetworkInterfaces())

ipcMain.handle('open-external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    return shell.openExternal(url)
  }
})

ipcMain.handle('spotify-auth', (_event, authUrl, redirectUri) => {
  return new Promise((resolve) => {
    let resolved = false

    const authSession = session.fromPartition(`spotify-auth-${Date.now()}`)

    const authWin = new BrowserWindow({
      width: 500, height: 700,
      parent: mainWindow, modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: authSession,
      },
    })
    authWin.setMenuBarVisibility(false)

    const done = (code) => {
      if (resolved) return
      resolved = true
      authSession.webRequest.onBeforeRequest(null)
      resolve(code)
      if (!authWin.isDestroyed()) authWin.close()
    }

    const checkUrl = (url) => {
      if (url.startsWith(redirectUri)) {
        try {
          const code = new URL(url).searchParams.get('code')
          done(code)
        } catch {
          done(null)
        }
        return true
      }
      return false
    }

    authWin.webContents.on('will-redirect', (e, url) => {
      if (checkUrl(url)) e.preventDefault()
    })

    authWin.webContents.on('will-navigate', (e, url) => {
      if (checkUrl(url)) e.preventDefault()
    })

    authSession.webRequest.onBeforeRequest(
      { urls: [redirectUri + '*'] },
      (details, callback) => {
        checkUrl(details.url)
        callback({ cancel: true })
      },
    )

    authWin.on('closed', () => done(null))
    authWin.loadURL(authUrl)
  })
})

// ── Window creation ──
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

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentUrl = mainWindow.webContents.getURL()
    if (url !== currentUrl && !url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  const startUrl = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(app.getAppPath(), 'dist', 'index.html')}`

  log('Loading URL: ' + startUrl)

  try {
    await mainWindow.loadURL(startUrl)
    log('URL loaded successfully')
  } catch (err) {
    log('Failed to load URL: ' + err.message)
  }

  mainWindow.webContents.on('did-finish-load', () => {
    log('Content loaded, flushing logs...')
    flushLogs()
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    log('Failed to load: ' + errorCode + ' - ' + errorDescription)
  })

  if (isDev) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => { mainWindow = null })
}

// ── App lifecycle ──
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

app.on('ready', async () => {
  log('App ready')
  try {
    await startBackend()
    await createWindow()
    log('Window created successfully')
  } catch (err) {
    log('Startup error: ' + err.message)
  }
})

app.on('before-quit', () => {
  killBackend()
})

app.on('window-all-closed', () => {
  killBackend()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

process.on('exit', () => { killBackend() })
process.on('SIGTERM', () => { killBackend(); app.quit() })
process.on('SIGINT', () => { killBackend(); app.quit() })
