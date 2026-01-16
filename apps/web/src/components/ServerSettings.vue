<script setup lang="ts">
import QRCode from 'qrcode'
import { onMounted, onUnmounted, ref } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'

const show = defineModel<boolean>('show', { required: true })
const serverUrlStore = useServerUrlStore()
const serverUrl = ref(serverUrlStore.serverUrl)
const isConnecting = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)
const gridSize = ref(12)
const serverLocalIP = ref<string | null>(null)
const isLoadingIP = ref(false)
const qrCodeUrl = ref<string | null>(null)

const isMobile = ref(window.innerWidth <= 768)

const gridSizeOptions = [
  { value: 8, label: '8 botones (2x4)' },
  { value: 12, label: '12 botones (3x4)' },
  { value: 16, label: '16 botones (4x4)' },
  { value: 24, label: '24 botones (4x6)' },
  { value: 32, label: '32 botones (4x8)' },
]

onMounted(() => {
  // Detectar si viene serverUrl por query parameter (desde QR)
  const urlParams = new URLSearchParams(window.location.search)
  const serverUrlFromQR = urlParams.get('serverUrl')

  if (serverUrlFromQR) {
    // Configurar automáticamente la URL del servidor
    serverUrl.value = serverUrlFromQR
    serverUrlStore.setServerUrl(serverUrlFromQR)

    // Limpiar el query parameter de la URL
    window.history.replaceState({}, '', window.location.pathname)

    // Mostrar mensaje de éxito
    connectionStatus.value = 'success'
    setTimeout(() => {
      connectionStatus.value = null
    }, 3000)
  } else {
    // Cargar configuración guardada
    const saved = localStorage.getItem('serverUrl')
    if (saved) {
      serverUrl.value = saved
      serverUrlStore.setServerUrl(saved)
    }
  }

  const savedGridSize = localStorage.getItem('gridSize')
  if (savedGridSize) {
    gridSize.value = parseInt(savedGridSize)
  }

  // Cargar del caché si existe
  const cachedIP = localStorage.getItem('serverLocalIP')
  const cachedQR = localStorage.getItem('qrCodeUrl')
  if (cachedIP) {
    serverLocalIP.value = cachedIP
  }
  if (cachedQR) {
    qrCodeUrl.value = cachedQR
  }

  // Listener para cambios de tamaño de ventana
  const handleResize = () => {
    isMobile.value = window.innerWidth <= 768
  }
  window.addEventListener('resize', handleResize)

  loadServerIP()
  generateQRCode()
})

onUnmounted(() => {
  window.removeEventListener('resize', () => {
    isMobile.value = window.innerWidth <= 768
  })
})

const loadServerIP = async () => {
  isLoadingIP.value = true
  try {
    const response = await fetch(`${serverUrl.value}/network-info`)
    if (response.ok) {
      const data = await response.json()
      serverLocalIP.value = data.url

      // Guardar en caché
      if (data.url) {
        localStorage.setItem('serverLocalIP', data.url)
      }
    }
  } catch (error) {
    // Si falla, usar caché si existe
    const cachedIP = localStorage.getItem('serverLocalIP')
    if (cachedIP) serverLocalIP.value = cachedIP
  } finally {
    isLoadingIP.value = false
  }
}

const generateQRCode = async () => {
  try {
    // Usar la URL del frontend actual e incluir serverUrl como query parameter
    const frontendUrl = window.location.origin
    const qrUrl = `${frontendUrl}?serverUrl=${encodeURIComponent(serverUrl.value)}`

    qrCodeUrl.value = await QRCode.toDataURL(qrUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    if (qrCodeUrl.value) {
      localStorage.setItem('qrCodeUrl', qrCodeUrl.value)
    }
  } catch (error) {
    console.error('Error generando QR:', error)
  }
}

const testConnection = async () => {
  isConnecting.value = true
  connectionStatus.value = null

  try {
    const response = await fetch(`${serverUrl.value}/command`, {
      method: 'GET',
    })

    if (response.ok) {
      connectionStatus.value = 'success'
    } else {
      connectionStatus.value = 'error'
    }
  } catch (error) {
    connectionStatus.value = 'error'
  } finally {
    isConnecting.value = false
  }
}

const save = () => {
  console.log('Saving gridSize:', gridSize.value)
  serverUrlStore.setServerUrl(serverUrl.value)
  localStorage.setItem('gridSize', gridSize.value.toString())
  window.location.reload()
}

const close = () => {
  show.value = false
}
</script>

<template>
  <div v-if="show" class="settings-overlay" @click="close">
    <div class="settings-dialog" @click.stop>
      <div class="settings-header">
        <h2>Configuración del Servidor</h2>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="settings-content">
        <div class="info-box">
          <p>
            <strong>Conecta desde otro dispositivo:</strong><br />
            1. Inicia el servidor en tu PC<br />
            2. Anota la IP local que aparece en la consola<br />
            3. En tu tablet/móvil, ingresa: http://[IP]:8765<br />
            4. Guarda y recarga la página
          </p>
        </div>

        <div v-if="serverUrl && !isMobile" class="ip-display">
          <label>🌐 URL configurada:</label>
          <div class="ip-box">
            <code>{{ serverUrl }}</code>
          </div>
          <small>Usa esta URL en tu móvil/tablet para conectarte</small>

          <div v-if="qrCodeUrl" class="qr-section">
            <div class="qr-label">📱 Escanea para conectar:</div>
            <img :src="qrCodeUrl" alt="QR Code" class="qr-code" />
          </div>
        </div>

        <div class="form-group">
          <label for="serverUrl">URL del Servidor</label>
          <input
            id="serverUrl"
            v-model="serverUrl"
            type="text"
            placeholder="http://192.168.1.100:8765"
            class="server-input"
          />
          <small>Ejemplo: http://192.168.1.100:8765</small>
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
            ✅ Conexión exitosa
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

.settings-dialog {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
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
  color: #fff;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.settings-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
  overflow-x: hidden;
}

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
  gap: 8px;
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

.btn-copy {
  padding: 6px 12px;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 6px;
  color: #22c55e;
  cursor: pointer;
  font-size: 1rem;
  transition: all 0.2s;
}

.btn-copy:hover {
  background: rgba(34, 197, 94, 0.3);
  transform: scale(1.1);
}

.btn-copy:active {
  transform: scale(0.95);
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

@media (max-width: 768px) {
  .hide-mobile {
    display: none !important;
  }
}

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
  color: #fff;
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
  color: #fff;
  padding: 10px;
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

.btn-test {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
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
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
}

.connection-result .success {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.connection-result .error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

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
  color: #fff;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #fff;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}
</style>
