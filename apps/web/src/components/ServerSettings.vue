<script setup lang="ts">
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'
import QRCode from 'qrcode'
import { onMounted, onUnmounted, ref } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'

const show = defineModel<boolean>('show', { required: true })
const serverUrlStore = useServerUrlStore()
const serverUrl = ref(serverUrlStore.serverUrl)
const isConnecting = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)
const gridSize = ref(12)
const qrCodeUrl = ref<string | null>(null)

const isMobile = ref(window.innerWidth <= 768)
const isScanning = ref(false)
const scanError = ref<string | null>(null)

// ⭐ Detección de IPs locales (solo desktop)
const localIPs = ref<string[]>([])
const selectedIP = ref<string>('')
const isDetectingIPs = ref(false)
const isTestingConnection = ref(false)

const gridSizeOptions = [
  { value: 8, label: '8 botones (2x4)' },
  { value: 12, label: '12 botones (3x4)' },
  { value: 16, label: '16 botones (4x4)' },
  { value: 24, label: '24 botones (4x6)' },
  { value: 32, label: '32 botones (4x8)' },
]

onMounted(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const serverUrlFromQR = urlParams.get('serverUrl')

  if (serverUrlFromQR) {
    serverUrl.value = serverUrlFromQR
    serverUrlStore.setServerUrl(serverUrlFromQR)
    window.history.replaceState({}, '', window.location.pathname)
    connectionStatus.value = 'success'
    setTimeout(() => {
      connectionStatus.value = null
    }, 3000)
  } else {
    const saved = localStorage.getItem('serverUrl')
    if (saved) {
      serverUrl.value = saved
      serverUrlStore.setServerUrl(saved)
    }
  }

  const savedGridSize = localStorage.getItem('gridSize')
  if (savedGridSize) gridSize.value = parseInt(savedGridSize)

  const cachedQR = localStorage.getItem('qrCodeUrl')
  if (cachedQR) qrCodeUrl.value = cachedQR

  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768
  }
  window.addEventListener('resize', handleResize)

  // ⭐ Detectar IPs locales en desktop
  if (!isMobile.value) {
    detectLocalIPs()
  }
})

// ⭐ Detectar IPs locales usando WebRTC
const detectLocalIPs = async () => {
  isDetectingIPs.value = true
  const ips = new Set<string>()

  try {
    const pc = new RTCPeerConnection({ iceServers: [] })
    pc.createDataChannel('')

    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) return

      const match = /([0-9]{1,3}(\.[0-9]{1,3}){3})/.exec(
        ice.candidate.candidate,
      )
      if (match) {
        const ip = match[1]
        if (
          ip.startsWith('192.168.') ||
          ip.startsWith('10.') ||
          ip.startsWith('172.')
        ) {
          ips.add(ip)
        }
      }
    }

    await pc.createOffer().then((offer) => pc.setLocalDescription(offer))
    await new Promise((resolve) => setTimeout(resolve, 1000))
    pc.close()

    localIPs.value = Array.from(ips).sort()

    if (serverUrl.value) {
      const match = serverUrl.value.match(/http:\/\/([\d.]+):/)
      if (match && localIPs.value.includes(match[1])) {
        selectedIP.value = match[1]
      }
    }

    if (localIPs.value.length === 1 && !selectedIP.value) {
      selectedIP.value = localIPs.value[0]
      await handleIPSelection()
    }
  } catch (error) {
    console.error('Error detecting IPs:', error)
  } finally {
    isDetectingIPs.value = false
  }
}

const handleIPSelection = async () => {
  if (!selectedIP.value) return

  const testUrl = `http://${selectedIP.value}:7500`
  isTestingConnection.value = true
  connectionStatus.value = null

  try {
    const response = await fetch(`${testUrl}/command`, { method: 'GET' })

    if (response.ok) {
      serverUrl.value = testUrl
      serverUrlStore.setServerUrl(testUrl)
      connectionStatus.value = 'success'
      await generateQRCode()
    } else {
      connectionStatus.value = 'error'
      qrCodeUrl.value = null
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    connectionStatus.value = 'error'
    qrCodeUrl.value = null
  } finally {
    isTestingConnection.value = false
  }
}

onUnmounted(async () => {
  if (isScanning.value) await stopScanner()
})

const generateQRCode = async () => {
  try {
    const frontendUrl = window.location.origin
    const qrUrl = `${frontendUrl}?serverUrl=${encodeURIComponent(serverUrl.value)}`
    qrCodeUrl.value = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
    if (qrCodeUrl.value) localStorage.setItem('qrCodeUrl', qrCodeUrl.value)
  } catch (error) {
    console.error('Error generando QR:', error)
  }
}

const startScanner = async () => {
  scanError.value = null

  try {
    const status = await BarcodeScanner.checkPermission({ force: true })
    if (!status.granted) {
      scanError.value = 'Se necesita permiso de cámara'
      return
    }

    isScanning.value = true
    document.body.classList.add('qr-scanning')
    document.documentElement.classList.add('qr-scanning')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'

    await new Promise((resolve) => setTimeout(resolve, 150))

    BarcodeScanner.hideBackground()
    const result = await BarcodeScanner.startScan()

    await stopScanner()

    if (result.hasContent) {
      handleScanResult(result.content)
    } else {
      scanError.value = 'No se pudo leer el código QR'
    }
  } catch (error: any) {
    console.error('Error al escanear:', error)
    scanError.value = 'Error al acceder a la cámara'
    await stopScanner()
  }
}

const stopScanner = async () => {
  try {
    await BarcodeScanner.stopScan()
    await BarcodeScanner.showBackground()
  } catch (error) {
    console.error('Error stopping scanner:', error)
  } finally {
    isScanning.value = false
    document.body.classList.remove('qr-scanning')
    document.documentElement.classList.remove('qr-scanning')
    document.body.style.background = ''
    document.documentElement.style.background = ''
  }
}

// Protección extra: restaurar fondo si el escaneo falla o el componente se desmonta
onUnmounted(() => {
  document.body.classList.remove('qr-scanning')
  document.documentElement.classList.remove('qr-scanning')
  document.body.style.background = ''
  document.documentElement.style.background = ''
})

const handleScanResult = (content: string) => {
  try {
    const url = new URL(content)
    const scannedServerUrl = url.searchParams.get('serverUrl')

    if (scannedServerUrl) {
      serverUrl.value = scannedServerUrl
      serverUrlStore.setServerUrl(scannedServerUrl)
    } else if (content.startsWith('http')) {
      serverUrl.value = content
    } else {
      scanError.value = 'El QR no contiene una URL válida'
      return
    }

    connectionStatus.value = 'success'
    setTimeout(() => {
      connectionStatus.value = null
    }, 3000)
  } catch {
    if (content.startsWith('http')) {
      serverUrl.value = content
      connectionStatus.value = 'success'
    } else {
      scanError.value = 'El QR no contiene una URL válida'
    }
  }
}

const testConnection = async () => {
  isConnecting.value = true
  connectionStatus.value = null
  try {
    const response = await fetch(`${serverUrl.value}/command`, {
      method: 'GET',
    })
    connectionStatus.value = response.ok ? 'success' : 'error'
  } catch {
    connectionStatus.value = 'error'
  } finally {
    isConnecting.value = false
  }
}

const save = () => {
  serverUrlStore.setServerUrl(serverUrl.value)
  localStorage.setItem('gridSize', gridSize.value.toString())
  window.location.reload()
}

const close = () => {
  if (isScanning.value) stopScanner()
  show.value = false
}
</script>

<template>
  <!-- ⭐ Scanner fullscreen (fuera del modal, usando Teleport) -->
  <Teleport to="body">
    <div v-if="isScanning" class="scanner-fullscreen">
      <div class="scanner-ui">
        <div class="scanner-frame">
          <div class="scanner-corner tl"></div>
          <div class="scanner-corner tr"></div>
          <div class="scanner-corner bl"></div>
          <div class="scanner-corner br"></div>
          <div class="scanner-line"></div>
        </div>
        <p class="scanner-hint">Apunta al código QR de tu PC</p>
        <button @click="stopScanner" class="btn-cancel-scan">✕ Cancelar</button>
      </div>
    </div>
  </Teleport>

  <div v-if="show" class="settings-overlay" @click="close">
    <div class="settings-dialog" @click.stop>
      <div class="settings-header">
        <h2>Configuración del Servidor</h2>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="settings-content">
        <!-- Info box solo desktop -->
        <div v-if="!isMobile" class="info-box">
          <p>
            <strong>Conecta desde otro dispositivo:</strong><br />
            1. Selecciona tu IP local de la lista<br />
            2. Si conecta, aparecerá el QR automáticamente<br />
            3. Escanea el QR desde tu móvil/tablet<br />
            4. ¡Listo!
          </p>
        </div>

        <!-- ⭐ Selector de IPs locales (solo desktop) -->
        <div v-if="!isMobile" class="ip-selector-section">
          <label>🔍 Selecciona tu IP local:</label>

          <div v-if="isDetectingIPs" class="detecting-ips">
            <i class="pi pi-spin pi-spinner"></i>
            <span>Detectando IPs locales...</span>
          </div>

          <div v-else-if="localIPs.length > 0" class="ip-selector-container">
            <select
              v-model="selectedIP"
              @change="handleIPSelection"
              class="ip-select"
              :disabled="isTestingConnection"
            >
              <option value="">-- Selecciona una IP --</option>
              <option v-for="ip in localIPs" :key="ip" :value="ip">
                {{ ip }} (http://{{ ip }}:7500)
              </option>
            </select>

            <div v-if="isTestingConnection" class="testing-indicator">
              <i class="pi pi-spin pi-spinner"></i>
              <span>Probando conexión...</span>
            </div>
          </div>

          <div v-else class="no-ips-detected">
            <p>⚠️ No se detectaron IPs locales automáticamente.</p>
            <small>Ingresa la IP manualmente abajo</small>
          </div>
        </div>

        <!-- Desktop: QR para escanear -->
        <div
          v-if="!isMobile && qrCodeUrl && connectionStatus === 'success'"
          class="ip-display"
        >
          <label>🌐 URL configurada:</label>
          <div class="ip-box">
            <code>{{ serverUrl }}</code>
          </div>
          <small>Escanea el QR desde tu móvil para conectarte</small>
          <div class="qr-section">
            <div class="qr-label">📱 Escanea para conectar:</div>
            <img :src="qrCodeUrl" alt="QR Code" class="qr-code" />
          </div>
        </div>

        <!-- ⭐ Mobile: botón escanear -->
        <div v-if="isMobile" class="scan-section">
          <div class="scan-idle">
            <button @click="startScanner" class="btn-scan">
              📷 Escanear QR
            </button>
            <p class="scan-hint">Apunta al QR de la app en tu PC</p>
          </div>

          <div v-if="scanError" class="scan-error">⚠️ {{ scanError }}</div>
        </div>

        <div class="form-group">
          <label for="serverUrl">URL del Servidor</label>
          <input
            id="serverUrl"
            v-model="serverUrl"
            type="text"
            placeholder="http://192.168.1.100:7500"
            class="server-input"
          />
          <small>O ingresa la IP manualmente: http://192.168.1.100:7500</small>
        </div>

        <div class="form-group">
          <label for="gridSize">Tamaño de la Cuadrícula</label>
          <select id="gridSize" v-model.number="gridSize" class="server-input">
            <option
              v-for="option in gridSizeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <small>Cantidad de botones en la cuadrícula</small>
        </div>

        <button
          @click="testConnection"
          :disabled="isConnecting"
          class="btn-test"
        >
          {{ isConnecting ? '🔄 Probando...' : '🔍 Probar Conexión' }}
        </button>

        <div v-if="connectionStatus" class="connection-result">
          <div v-if="connectionStatus === 'success'" class="success">
            ✅ {{ isMobile ? 'URL configurada desde QR' : 'Conexión exitosa' }}
          </div>
          <div v-else class="error">
            ❌ No se pudo conectar. Verifica la IP y que el servidor esté
            corriendo.
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="close" class="btn-cancel">Cancelar</button>
        <button @click="save" class="btn-save">💾 Guardar y Recargar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ⭐ Scanner fullscreen */
.scanner-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 999999;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.scanner-ui {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.scanner-frame {
  width: 220px;
  height: 220px;
  position: relative;
}

.scanner-corner {
  position: absolute;
  width: 28px;
  height: 28px;
  border-color: #8b5cf6;
  border-style: solid;
}

.scanner-corner.tl {
  top: 0;
  left: 0;
  border-width: 4px 0 0 4px;
  border-radius: 4px 0 0 0;
}
.scanner-corner.tr {
  top: 0;
  right: 0;
  border-width: 4px 4px 0 0;
  border-radius: 0 4px 0 0;
}
.scanner-corner.bl {
  bottom: 0;
  left: 0;
  border-width: 0 0 4px 4px;
  border-radius: 0 0 0 4px;
}
.scanner-corner.br {
  bottom: 0;
  right: 0;
  border-width: 0 4px 4px 0;
  border-radius: 0 0 4px 0;
}

.scanner-line {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #8b5cf6, transparent);
  animation: scan 2s linear infinite;
}

@keyframes scan {
  0% {
    top: 8px;
  }
  100% {
    top: calc(100% - 8px);
  }
}

.scanner-hint {
  color: white;
  font-size: 1rem;
  font-weight: 600;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  text-align: center;
}

.btn-cancel-scan {
  padding: 12px 32px;
  background: rgba(239, 68, 68, 0.9);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

/* ===========================
   SETTINGS OVERLAY — FIX PRINCIPAL
   =========================== */
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* ===========================
   DIALOG
   =========================== */
.settings-dialog {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
}

/* ===========================
   HEADER
   =========================== */
.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.4rem;
  color: #f5f5f5;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

/* ===========================
   CONTENT
   =========================== */
.settings-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Info box */
.info-box {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.info-box strong {
  color: #8b5cf6;
}

/* IP display (conexión exitosa) */
.ip-display {
  background: rgba(34, 197, 94, 0.1);
  border: 2px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.ip-display label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #22c55e;
  font-size: 0.95rem;
}

.ip-box {
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
}

.ip-box code {
  flex: 1;
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  color: #4ade80;
  font-weight: 600;
}

.ip-display small {
  display: block;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  margin-top: 4px;
}

.qr-section {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(34, 197, 94, 0.3);
  text-align: center;
}

.qr-label {
  font-weight: 600;
  color: #22c55e;
  margin-bottom: 12px;
  font-size: 0.95rem;
}

.qr-code {
  border-radius: 12px;
  padding: 12px;
  background: white;
  display: inline-block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* IP selector */
.ip-selector-section {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
}

.ip-selector-section label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #3b82f6;
  font-size: 0.95rem;
}

.detecting-ips {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
}

.detecting-ips i {
  font-size: 1.2rem;
  color: #3b82f6;
}

.ip-selector-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ip-select {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid rgba(59, 130, 246, 0.4);
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 0.95rem;
  font-family: 'Courier New', monospace;
  cursor: pointer;
  transition: all 0.3s;
}

.ip-select:hover:not(:disabled) {
  border-color: rgba(59, 130, 246, 0.6);
  background: rgba(0, 0, 0, 0.4);
}

.ip-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.ip-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ip-select option {
  background: #1a1a1a;
  color: #f5f5f5;
  padding: 10px;
}

.testing-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 8px;
  color: #a78bfa;
  font-size: 0.9rem;
}

.testing-indicator i {
  font-size: 1rem;
}

.no-ips-detected {
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  text-align: center;
}

.no-ips-detected p {
  margin: 0 0 4px 0;
  color: #fbbf24;
  font-size: 0.9rem;
}

.no-ips-detected small {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

/* Scanner section */
.scan-section {
  margin-bottom: 20px;
}

.scan-idle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 12px;
}

.btn-scan {
  padding: 10px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.btn-scan:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
}

.scan-hint {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: center;
  margin: 0;
}

.scan-error {
  margin-top: 12px;
  padding: 10px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  color: #ef4444;
  font-size: 0.85rem;
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.server-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #f5f5f5;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
}

select.server-input {
  font-family: inherit;
  cursor: pointer;
}

select.server-input option {
  background: #1e1e1e;
  color: #f5f5f5;
}

.server-input:focus {
  outline: none;
  border-color: #8b5cf6;
  background: rgba(255, 255, 255, 0.08);
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

/* Buttons */
.btn-test {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #f5f5f5;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.btn-test:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

.btn-test:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-result {
  border-radius: 10px;
  font-weight: 600;
}

.connection-result .success {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
  padding: 12px;
  border-radius: 8px;
}

.connection-result .error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 12px;
  border-radius: 8px;
}

/* ===========================
   FOOTER
   =========================== */
.settings-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #f5f5f5;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #f5f5f5;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}
</style>
