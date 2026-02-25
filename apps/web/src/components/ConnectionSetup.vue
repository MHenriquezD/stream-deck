<template>
  <div class="connection-setup">
    <!-- Modo Desktop: Mostrar QR para escanear -->
    <div v-if="!isMobile" class="qr-display">
      <h2>Conecta tu móvil</h2>
      <p>Escanea este código QR desde tu app móvil:</p>

      <div v-if="serverUrl" class="qr-container">
        <QrcodeVue :value="serverUrl" :size="300" level="H" />
        <p class="url-text">{{ serverUrl }}</p>
      </div>

      <div v-else class="loading">
        <p>Obteniendo IPs de red...</p>
      </div>

      <div v-if="availableIPs.length > 1" class="ip-selector">
        <label>O selecciona una IP manualmente:</label>
        <select v-model="selectedIP" @change="updateQR">
          <option v-for="ip in availableIPs" :key="ip.address" :value="ip.url">
            {{ ip.name }}: {{ ip.address }}
          </option>
        </select>
      </div>

      <div v-if="availableIPs.length === 0" class="no-ips-warning">
        <p>⚠️ No se detectaron interfaces de red activas</p>
        <p class="small">Asegúrate de estar conectado a una red</p>
      </div>
    </div>

    <!-- Modo Mobile: Escáner QR -->
    <div v-else class="qr-scanner">
      <h2>Conectar al Spartan Hub</h2>
      <p>Escanea el código QR de tu computadora</p>

      <button @click="startScan" class="scan-button">📷 Escanear QR</button>

      <div v-if="scannedUrl" class="scanned-result">
        <p>✅ Servidor detectado:</p>
        <p class="url-text">{{ scannedUrl }}</p>
        <button
          @click="connectToServer"
          class="connect-button"
          :disabled="isConnecting"
        >
          {{ isConnecting ? 'Conectando...' : 'Conectar' }}
        </button>
      </div>

      <div class="manual-input">
        <p>O introduce la IP manualmente:</p>
        <input
          v-model="manualIP"
          type="text"
          placeholder="http://192.168.1.100:7500"
        />
        <button @click="connectManually" :disabled="isConnecting">
          {{ isConnecting ? 'Conectando...' : 'Conectar' }}
        </button>
      </div>

      <div v-if="connectionStatus" class="status" :class="statusClass">
        {{ connectionStatus }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'
import QrcodeVue from 'qrcode-vue3'
import { computed, onMounted, ref } from 'vue'
import { api } from '../api/commands.api'
import { usePlatform } from '../composables/usePlatform'

const { isMobile } = usePlatform()

const serverUrl = ref('')
const selectedIP = ref('')
const availableIPs = ref<Array<{ name: string; address: string; url: string }>>(
  [],
)
const scannedUrl = ref('')
const manualIP = ref('')
const connectionStatus = ref('')
const isConnecting = ref(false)

const statusClass = computed(() => {
  if (connectionStatus.value.includes('✅')) return 'success'
  if (connectionStatus.value.includes('❌')) return 'error'
  return 'info'
})

// ⭐ Detectar IPs desde Electron
const fetchServerIPs = async () => {
  console.log('Iniciando detección de IPs...')

  try {
    if (window.electronAPI) {
      console.log('✓ Electron API disponible, obteniendo interfaces de red...')

      // ⭐ Ahora es async
      const networkInfo = await window.electronAPI.getNetworkInterfaces()

      console.log('Interfaces detectadas:', networkInfo)

      availableIPs.value = networkInfo.interfaces
      serverUrl.value = networkInfo.preferredUrl
      selectedIP.value = networkInfo.preferredUrl

      if (availableIPs.value.length === 0) {
        console.warn('⚠ No se detectaron interfaces de red')
      } else {
        console.log(`✓ ${availableIPs.value.length} interface(s) encontrada(s)`)
      }
    } else {
      console.log('No estamos en Electron, usando localhost')
      serverUrl.value = 'http://localhost:7500'
      availableIPs.value = [
        {
          name: 'localhost',
          address: '127.0.0.1',
          url: 'http://localhost:7500',
        },
      ]
    }
  } catch (error) {
    console.error('Error fetching IPs:', error)
    serverUrl.value = 'http://localhost:7500'
    availableIPs.value = [
      {
        name: 'localhost (fallback)',
        address: '127.0.0.1',
        url: 'http://localhost:7500',
      },
    ]
  }
}

const cleanUrl = (url: string): string => {
  let cleaned = url.trim()
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'http://' + cleaned
  }
  cleaned = cleaned.replace(/\/$/, '')
  return cleaned
}

const updateQR = () => {
  serverUrl.value = selectedIP.value
  console.log('QR actualizado a:', serverUrl.value)
}

const startScan = async () => {
  try {
    const status = await BarcodeScanner.checkPermission({ force: true })

    if (!status.granted) {
      alert('Se necesitan permisos de cámara para escanear el QR')
      return
    }

    document.body.classList.add('scanner-active')
    const result = await BarcodeScanner.startScan()
    document.body.classList.remove('scanner-active')

    if (result.hasContent) {
      scannedUrl.value = cleanUrl(result.content)
      console.log('QR Scanned URL:', scannedUrl.value)
    }
  } catch (error) {
    console.error('Error scanning QR:', error)
    document.body.classList.remove('scanner-active')
    connectionStatus.value = '❌ Error al escanear QR'
  }
}

const connectToServer = async () => {
  if (!scannedUrl.value) return

  isConnecting.value = true
  connectionStatus.value = '🔄 Conectando al servidor...'

  try {
    const url = cleanUrl(scannedUrl.value)
    console.log('Attempting connection to:', url)

    const testUrl = `${url}/health`
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (response.ok) {
      api.updateServerUrl(url)
      connectionStatus.value = '✅ Conectado exitosamente'

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      connectionStatus.value = '❌ Servidor no responde correctamente'
      isConnecting.value = false
    }
  } catch (error) {
    console.error('Connection error:', error)
    connectionStatus.value = '❌ No se pudo conectar al servidor'
    isConnecting.value = false
  }
}

const connectManually = async () => {
  if (!manualIP.value) {
    connectionStatus.value = '❌ Por favor introduce una URL'
    return
  }

  isConnecting.value = true
  connectionStatus.value = '🔄 Conectando...'

  try {
    const url = cleanUrl(manualIP.value)
    console.log('Attempting manual connection to:', url)

    const testUrl = `${url}/health`
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (response.ok) {
      api.updateServerUrl(url)
      connectionStatus.value = '✅ Conectado exitosamente'

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } else {
      connectionStatus.value = '❌ No se pudo conectar al servidor'
      isConnecting.value = false
    }
  } catch (error) {
    console.error('Connection error:', error)
    connectionStatus.value = '❌ Error de conexión. Verifica la URL'
    isConnecting.value = false
  }
}

onMounted(() => {
  if (!isMobile.value) {
    fetchServerIPs()
  } else {
    const currentUrl = api.getCurrentUrl()
    if (currentUrl !== 'http://localhost:7500') {
      connectionStatus.value = `📡 Conectado a: ${currentUrl}`
    }
  }
})
</script>

<style scoped>
.connection-setup {
  padding: 2rem;
  text-align: center;
}

.qr-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin: 2rem 0;
}

.url-text {
  font-family: monospace;
  font-size: 1.1rem;
  color: var(--edit-text-color);
  padding: 0.5rem 1rem;
  background: var(--form-bg-color);
  border-radius: 8px;
  word-break: break-all;
}

.ip-selector {
  margin-top: 2rem;
}

.ip-selector label {
  display: block;
  margin-bottom: 0.5rem;
  color: #666;
}

.ip-selector select {
  padding: 0.5rem;
  font-size: 1rem;
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  border: 2px solid #ddd;
}

.loading {
  margin: 2rem 0;
  color: #666;
}

.no-ips-warning {
  margin-top: 2rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 8px;
}

.no-ips-warning .small {
  font-size: 0.9rem;
  color: #856404;
  margin-top: 0.5rem;
}

.scan-button {
  padding: 1rem 2rem;
  font-size: 1.2rem;
  background: #42b983;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin: 2rem 0;
  transition: background 0.3s;
}

@media (hover: hover) {
  .scan-button:hover {
    background: #35a372;
  }
}

.scan-button:active {
  transform: scale(0.98);
}

.scanned-result {
  margin: 2rem 0;
  padding: 1rem;
  background: #e8f5e9;
  border-radius: 8px;
  border: 2px solid #4caf50;
}

.connect-button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
  transition: background 0.3s;
}

.connect-button:hover:not(:disabled) {
  background: #45a049;
}

.connect-button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.manual-input {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
}

.manual-input p {
  margin-bottom: 1rem;
  color: #666;
}

.manual-input input {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.manual-input input:focus {
  outline: none;
  border-color: #42b983;
}

.manual-input button {
  padding: 0.75rem 1.5rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.3s;
  min-width: 150px;
}

.manual-input button:hover:not(:disabled) {
  background: #1976d2;
}

.manual-input button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.status {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  font-weight: 500;
  animation: fadeIn 0.3s;
}

.status.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.status.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.status.info {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

body.scanner-active {
  background: transparent !important;
}

body.scanner-active .connection-setup {
  display: none;
}
</style>
