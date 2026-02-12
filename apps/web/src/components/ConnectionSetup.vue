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
        <p>Obteniendo IP del servidor...</p>
      </div>

      <div v-if="availableIPs.length > 1" class="ip-selector">
        <label>O selecciona una IP manualmente:</label>
        <select v-model="selectedIP" @change="updateQR">
          <option v-for="ip in availableIPs" :key="ip.address" :value="ip.url">
            {{ ip.name }}: {{ ip.address }}
          </option>
        </select>
      </div>
    </div>

    <!-- Modo Mobile: Escáner QR -->
    <div v-else class="qr-scanner">
      <h2>Conectar al Stream Deck</h2>
      <p>Escanea el código QR de tu computadora</p>

      <button @click="startScan" class="scan-button">📷 Escanear QR</button>

      <div v-if="scannedUrl" class="scanned-result">
        <p>✅ Servidor detectado:</p>
        <p class="url-text">{{ scannedUrl }}</p>
        <button @click="connectToServer" class="connect-button">
          Conectar
        </button>
      </div>

      <div class="manual-input">
        <p>O introduce la IP manualmente:</p>
        <input
          v-model="manualIP"
          type="text"
          placeholder="http://192.168.1.100:7500"
        />
        <button @click="connectManually">Conectar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { BarcodeScanner } from '@capacitor-community/barcode-scanner'
import QrcodeVue from 'qrcode-vue3'
import { onMounted, ref } from 'vue'
import { usePlatform } from '../composables/usePlatform'

const { isMobile } = usePlatform()

// Estado
const serverUrl = ref('')
const selectedIP = ref('')
const availableIPs = ref<Array<{ name: string; address: string; url: string }>>(
  [],
)
const scannedUrl = ref('')
const manualIP = ref('')

// Obtener IPs disponibles (Desktop)
const fetchServerIPs = async () => {
  try {
    const response = await fetch('http://localhost:7500/network-info')
    const data = await response.json()

    availableIPs.value = data.interfaces
    serverUrl.value = data.preferredUrl
    selectedIP.value = data.preferredUrl
  } catch (error) {
    console.error('Error fetching server IPs:', error)
    serverUrl.value = 'http://localhost:7500'
  }
}

const updateQR = () => {
  serverUrl.value = selectedIP.value
}

// Escáner QR (Mobile)
const startScan = async () => {
  try {
    // Pedir permisos
    const status = await BarcodeScanner.checkPermission({ force: true })

    if (!status.granted) {
      alert('Se necesitan permisos de cámara para escanear el QR')
      return
    }

    // Ocultar fondo para mostrar la cámara
    document.body.classList.add('scanner-active')

    // Iniciar escaneo
    const result = await BarcodeScanner.startScan()

    // Restaurar fondo
    document.body.classList.remove('scanner-active')

    if (result.hasContent) {
      scannedUrl.value = result.content
    }
  } catch (error) {
    console.error('Error scanning QR:', error)
    document.body.classList.remove('scanner-active')
  }
}

const connectToServer = () => {
  // Guardar la URL del servidor en localStorage
  localStorage.setItem('serverUrl', scannedUrl.value)

  // Actualizar la configuración global
  window.location.reload()
}

const connectManually = () => {
  if (manualIP.value) {
    localStorage.setItem('serverUrl', manualIP.value)
    window.location.reload()
  }
}

onMounted(() => {
  if (!isMobile.value) {
    fetchServerIPs()
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
  color: #2c3e50;
  padding: 0.5rem 1rem;
  background: #f0f0f0;
  border-radius: 8px;
}

.ip-selector {
  margin-top: 2rem;
}

.ip-selector select {
  padding: 0.5rem;
  font-size: 1rem;
  margin-top: 0.5rem;
  width: 100%;
  max-width: 400px;
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
}

.scan-button:hover {
  background: #35a372;
}

.scanned-result {
  margin: 2rem 0;
  padding: 1rem;
  background: #e8f5e9;
  border-radius: 8px;
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
}

.manual-input {
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid #ddd;
}

.manual-input input {
  width: 100%;
  max-width: 400px;
  padding: 0.75rem;
  font-size: 1rem;
  border: 2px solid #ddd;
  border-radius: 8px;
  margin: 1rem 0;
}

.manual-input button {
  padding: 0.75rem 1.5rem;
  background: #2196f3;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

/* Ocultar todo cuando el scanner está activo */
body.scanner-active {
  background: transparent !important;
}

body.scanner-active .connection-setup {
  display: none;
}
</style>
