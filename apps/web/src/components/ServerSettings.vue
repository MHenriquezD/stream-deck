<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning'
import { Capacitor } from '@capacitor/core'
import QRCode from 'qrcode'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useButtonSound } from '../composables/useButtonSound'
import { useSocket } from '../composables/useSocket'
import { useTheme } from '../composables/useTheme'
import { useToast } from '../composables/useToast'
import { useServerUrlStore } from '../store/serverUrl.store'
import CustomSelect from './CustomSelect.vue'
import PickerModal from './PickerModal.vue'
import TailwindConfirmDialog from './TailwindConfirmDialog.vue'

const {
  isEnabled: isSoundEnabled,
  setEnabled: setSoundEnabled,
  play: playTestSound,
  getSelectedSound,
  setSelectedSound,
  availableSounds,
} = useButtonSound()
const buttonSoundEnabled = ref(isSoundEnabled())
const selectedSound = ref(getSelectedSound())

const onSoundChange = async (file: string) => {
  selectedSound.value = file
  setSelectedSound(file)
  playTestSound()
  await saveSoundSettings(buttonSoundEnabled.value, file)
}

const toggleSound = async () => {
  buttonSoundEnabled.value = !buttonSoundEnabled.value
  setSoundEnabled(buttonSoundEnabled.value)
  if (buttonSoundEnabled.value) playTestSound()
  await saveSoundSettings(buttonSoundEnabled.value, selectedSound.value)
}

const saveSoundSettings = async (enabled: boolean, file: string) => {
  // Prefer WebSocket (broadcasts to all clients instantly)
  if (isConnected.value) {
    socketSetButtonSound(enabled, file)
    return
  }
  // HTTP fallback
  try {
    const url = serverUrlStore.serverUrl
    await fetch(`${url}/command/settings/button-sound`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ enabled, file }),
    })
  } catch {
    /* fallback: already saved in localStorage */
  }
}

// isConnected NO va como prop: se toma de useSocket() más abajo, que es la
// misma fuente que usa el padre. Declararlo aquí lo dejaba tapado por el
// destructuring y el prop nunca se leía.
const props = defineProps<{
  serverEnabled?: boolean
  isMobileView?: boolean
}>()

const emit = defineEmits<{
  reconnect: []
  clearAll: []
}>()

const { isDark, toggleTheme, currentAccent, accentPresets, setAccent } = useTheme()

const show = defineModel<boolean>('show', { required: true })
const {
  getAuthHeaders,
  changePin,
  setupPin,
  login,
  checkPinStatus,
  pinConfigured,
  isAuthenticated,
} = useAuth()
const serverUrlStore = useServerUrlStore()
const serverUrl = ref(serverUrlStore.serverUrl)
const isConnecting = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)
const qrCodeUrl = ref<string | null>(null)

const {
  setButtonSound: socketSetButtonSound,
  isConnected,
  disconnect: socketDisconnect,
  connect: socketConnect,
  on: socketOn,
  off: socketOff,
} = useSocket()

const toast = useToast()

// Zona avanzada (Desactivar servidor / Borrar datos): oculta detrás de un
// toggle explícito, para que no aparezca a simple vista por accidente.
const showAdvanced = ref(false)

// Borrar datos recolectados de esta PC (caché de apps instaladas + íconos extraídos)
// — pide el PIN antes de mostrar la confirmación, ya que es una acción delicada.
const showClearDataDialog = ref(false)
const clearingData = ref(false)
const showDataPinPrompt = ref(false)
const dataPinInput = ref('')
const dataPinError = ref('')
const dataPinLoading = ref(false)

const startClearData = () => {
  if (pinConfigured.value) {
    showDataPinPrompt.value = true
    dataPinInput.value = ''
    dataPinError.value = ''
  } else {
    showClearDataDialog.value = true
  }
}

const verifyPinAndClearData = async () => {
  if (!/^\d{4}$/.test(dataPinInput.value)) {
    dataPinError.value = 'El PIN debe ser de 4 dígitos'
    return
  }
  dataPinLoading.value = true
  const result = await login(dataPinInput.value)
  dataPinLoading.value = false
  if (result.success) {
    showDataPinPrompt.value = false
    dataPinInput.value = ''
    showClearDataDialog.value = true
  } else {
    dataPinError.value = result.message || 'PIN incorrecto'
  }
}

const handleClearData = async () => {
  clearingData.value = true
  try {
    const url = serverUrlStore.serverUrl
    const response = await fetch(`${url}/command/collected-data`, {
      method: 'DELETE',
      headers: { ...getAuthHeaders() },
    })
    if (response.ok) {
      toast.add({
        severity: 'success',
        summary: 'Datos borrados',
        detail: 'Se eliminó el caché de aplicaciones e íconos de esta PC',
        life: 4000,
      })
    } else {
      throw new Error('request failed')
    }
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron borrar los datos',
      life: 4000,
    })
  } finally {
    clearingData.value = false
    showClearDataDialog.value = false
  }
}

// Sync sound state when modal opens or WS broadcasts a change
const onSoundBroadcast = (data: { enabled: boolean; file: string }) => {
  buttonSoundEnabled.value = data.enabled
  selectedSound.value = data.file
}

watch(show, (visible) => {
  if (visible) {
    // Refresh from composable module-level state
    buttonSoundEnabled.value = isSoundEnabled()
    selectedSound.value = getSelectedSound()
    socketOn('settings:buttonSoundChanged', onSoundBroadcast)
  } else {
    socketOff('settings:buttonSoundChanged', onSoundBroadcast)
    // Volver a esconder la zona avanzada al cerrar — hay que "desbloquearla"
    // de nuevo cada vez que se abre Configuración.
    showAdvanced.value = false
    showDataPinPrompt.value = false
    dataPinInput.value = ''
    dataPinError.value = ''
  }
})

const _platform = Capacitor.getPlatform()
const isMobile = _platform === 'android' || _platform === 'ios'
const isScanning = ref(false)
const scanError = ref<string | null>(null)

// PIN change state
const showPinChange = ref(false)
const newPin = ref('')
const confirmNewPin = ref('')
const pinError = ref('')
const pinSuccess = ref(false)

// Mobile PIN login state
const showMobilePinLogin = ref(false)
const mobilePinInput = ref('')
const mobilePinError = ref('')
const mobilePinLoading = ref(false)

const cancelPinChange = () => {
  showPinChange.value = false
  pinError.value = ''
  pinSuccess.value = false
}

const cancelMobilePinLogin = () => {
  showMobilePinLogin.value = false
  mobilePinError.value = ''
}

const handleChangePin = async () => {
  pinError.value = ''
  pinSuccess.value = false

  if (!/^\d{4}$/.test(newPin.value)) {
    pinError.value = 'El PIN debe ser de 4 dígitos'
    return
  }
  if (newPin.value !== confirmNewPin.value) {
    pinError.value = 'Los PINs no coinciden'
    return
  }

  // Use setupPin for first time, changePin for updates
  const result = pinConfigured.value
    ? await changePin(newPin.value)
    : await setupPin(newPin.value)

  if (result.success) {
    pinSuccess.value = true
    pinConfigured.value = true
    newPin.value = ''
    confirmNewPin.value = ''
    setTimeout(() => {
      showPinChange.value = false
      pinSuccess.value = false
    }, 1500)
  } else {
    pinError.value = result.message || 'Error al cambiar el PIN'
  }
}

// ⭐ Detección de IPs locales (solo desktop)
const localIPs = ref<string[]>([])
const selectedIP = ref<string>('')
const isDetectingIPs = ref(false)
const isTestingConnection = ref(false)

onMounted(async () => {
  // Check PIN status
  await checkPinStatus()

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

  // También cargar desde el servidor
  loadSettingsFromServer()

  const cachedQR = localStorage.getItem('qrCodeUrl')
  if (cachedQR) qrCodeUrl.value = cachedQR

  // ⭐ Detectar IPs locales en desktop
  if (!isMobile) {
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
    const response = await fetch(`${testUrl}/command`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    })

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
    const { camera } = await BarcodeScanner.checkPermissions()

    if (camera === 'denied') {
      const confirm = window.confirm(
        'El permiso de cámara fue denegado. ¿Abrir configuración de la app para habilitarlo?',
      )
      if (confirm) await BarcodeScanner.openSettings()
      return
    }

    if (camera !== 'granted') {
      const result = await BarcodeScanner.requestPermissions()
      if (result.camera !== 'granted') {
        scanError.value = 'Se necesita permiso de cámara'
        return
      }
    }

    isScanning.value = true
    document.body.classList.add('qr-scanning')
    document.documentElement.classList.add('qr-scanning')
    document.body.style.background = 'transparent'
    document.documentElement.style.background = 'transparent'

    await new Promise((resolve) => setTimeout(resolve, 150))

    // El plugin emite 'barcodesScanned' (plural) con un array. Estaba escrito
    // en singular y con event.barcode, así que el listener no se disparaba.
    const listener = await BarcodeScanner.addListener(
      'barcodesScanned',
      async (event) => {
        await listener.remove()
        await stopScanner()
        const rawValue = event.barcodes[0]?.rawValue
        if (rawValue) {
          handleScanResult(rawValue)
        } else {
          scanError.value = 'No se pudo leer el código QR'
        }
      },
    )

    await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode] })
  } catch (error: any) {
    console.error('Error al escanear:', error)
    scanError.value = 'Error al acceder a la cámara'
    await stopScanner()
  }
}

const stopScanner = async () => {
  try {
    await BarcodeScanner.stopScan()
    await BarcodeScanner.removeAllListeners()
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

    // After QR scan, check if server requires PIN
    checkAndPromptPin()
  } catch {
    if (content.startsWith('http')) {
      serverUrl.value = content
      connectionStatus.value = 'success'
      checkAndPromptPin()
    } else {
      scanError.value = 'El QR no contiene una URL válida'
    }
  }
}

/** Check if server has PIN and user is not authenticated — show PIN prompt on mobile */
const checkAndPromptPin = async () => {
  if (!isMobile) return
  if (isAuthenticated.value) return

  const hasPIN = await checkPinStatus()
  if (hasPIN) {
    showMobilePinLogin.value = true
    mobilePinInput.value = ''
    mobilePinError.value = ''
  }
}

const handleMobilePinLogin = async () => {
  mobilePinError.value = ''

  if (!/^\d{4}$/.test(mobilePinInput.value)) {
    mobilePinError.value = 'El PIN debe ser de 4 dígitos'
    return
  }

  mobilePinLoading.value = true
  const result = await login(mobilePinInput.value)
  mobilePinLoading.value = false

  if (result.success) {
    showMobilePinLogin.value = false
    mobilePinInput.value = ''
    connectionStatus.value = 'success'
    setTimeout(() => {
      connectionStatus.value = null
    }, 3000)
  } else {
    mobilePinError.value = result.message || 'PIN incorrecto'
    mobilePinInput.value = ''
  }
}

const testConnection = async () => {
  isConnecting.value = true
  connectionStatus.value = null
  try {
    const response = await fetch(`${serverUrl.value}/command`, {
      method: 'GET',
      headers: { ...getAuthHeaders() },
    })
    if (response.status === 401) {
      // Needs PIN — prompt on mobile
      serverUrlStore.setServerUrl(serverUrl.value)
      await checkAndPromptPin()
      return
    }
    connectionStatus.value = response.ok ? 'success' : 'error'
  } catch {
    connectionStatus.value = 'error'
  } finally {
    isConnecting.value = false
  }
}

const save = () => {
  const urlChanged = serverUrlStore.serverUrl !== serverUrl.value
  serverUrlStore.setServerUrl(serverUrl.value)
  show.value = false
  // Si la URL cambió, reconectar socket a la nueva dirección
  if (urlChanged) {
    socketDisconnect()
    socketConnect()
  }
}

const loadSettingsFromServer = async () => {
  try {
    const url = serverUrlStore.serverUrl
    const response = await fetch(`${url}/command/settings`, {
      headers: { ...getAuthHeaders() },
    })
    if (response.ok) {
      const settings = await response.json()
      // Sound settings
      if (typeof settings.buttonSound === 'boolean') {
        buttonSoundEnabled.value = settings.buttonSound
        setSoundEnabled(settings.buttonSound)
      }
      if (settings.buttonSoundFile) {
        selectedSound.value = settings.buttonSoundFile
        setSelectedSound(settings.buttonSoundFile)
      }
    }
  } catch {
    // Usar valor de localStorage como fallback
  }
}

const contentEl = ref<HTMLElement | null>(null)

const close = () => {
  if (isScanning.value) stopScanner()
  show.value = false
}

const activeSection = ref('connection')
const showAllSections = ref(
  localStorage.getItem('settingsShowAll') === 'true',
)
const toggleShowAll = () => {
  showAllSections.value = !showAllSections.value
  localStorage.setItem('settingsShowAll', String(showAllSections.value))
}
const settingsSections = computed(() => [
  { key: 'connection', label: 'Conexión', icon: 'mdi:wifi' },
  // El tema/acento vive aquí solo en vista móvil — en desktop está el FAB flotante.
  ...(props.isMobileView ? [{ key: 'theme', label: 'Tema', icon: 'mdi:palette' }] : []),
  { key: 'preferences', label: 'Preferencias', icon: 'mdi:tune-variant' },
  { key: 'security', label: 'Seguridad', icon: 'mdi:lock' },
])

// Si la sección activa desaparece de la barra (ej. el servidor se
// desactiva en vivo y "Acciones" se oculta), volver a "Conexión" en vez de
// quedar en un tab fantasma sin contenido.
watch(settingsSections, (sections) => {
  if (!sections.some((s) => s.key === activeSection.value)) {
    activeSection.value = 'connection'
  }
})
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
        <button @click="stopScanner" class="btn-cancel-scan"><Icon icon="mdi:close" style="vertical-align: -2px" /> Cancelar</button>
      </div>
    </div>
  </Teleport>

  <PickerModal :show="show" title="Configuración" :max-width="900" @close="close">
      <div class="settings-body" :class="{ 'show-all': showAllSections }">
        <!-- ─── SIDEBAR ─── -->
        <nav class="settings-sidebar">
          <button
            v-for="s in settingsSections"
            :key="s.key"
            type="button"
            class="sidebar-item"
            :class="{ active: !showAllSections && activeSection === s.key }"
            @click="activeSection = s.key; if (showAllSections) { contentEl?.querySelector(`[data-section='${s.key}']`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }"
          >
            <Icon :icon="s.icon" />
            <span>{{ s.label }}</span>
          </button>
          <div class="sidebar-spacer"></div>
          <button type="button" class="sidebar-item view-toggle" @click="toggleShowAll" :title="showAllSections ? 'Ver por secciones' : 'Ver todo'">
            <Icon :icon="showAllSections ? 'mdi:format-list-bulleted' : 'mdi:view-sequential'" />
            <span>{{ showAllSections ? 'Secciones' : 'Ver todo' }}</span>
          </button>
        </nav>

        <!-- ─── CONTENT (scrollable) ─── -->
        <div class="settings-content" ref="contentEl">
          <!-- ── Conexión ── -->
          <div v-if="showAllSections || activeSection === 'connection'" class="section-panel" data-section="connection">
            <h3 class="section-title">Conexión</h3>

            <div v-if="!isMobile" class="info-box">
              <p>
                <strong>Conecta desde otro dispositivo:</strong><br />
                1. Selecciona tu IP local de la lista<br />
                2. Si conecta, aparecerá el QR automáticamente<br />
                3. Escanea el QR desde tu móvil/tablet<br />
                4. ¡Listo!
              </p>
            </div>

            <div v-if="!isMobile" class="ip-selector-section">
              <label>Selecciona tu IP local:</label>

              <div v-if="isDetectingIPs" class="detecting-ips">
                <Icon icon="mdi:loading" class="mdi-spin" />
                <span>Detectando IPs locales...</span>
              </div>

              <div v-else-if="localIPs.length > 0" class="ip-selector-container">
                <CustomSelect
                  :options="localIPs.map(ip => ({ value: ip, label: `${ip} (http://${ip}:7500)` }))"
                  :model-value="selectedIP"
                  placeholder="-- Selecciona una IP --"
                  :disabled="isTestingConnection"
                  @update:model-value="selectedIP = String($event); handleIPSelection()"
                />

                <div v-if="isTestingConnection" class="testing-indicator">
                  <Icon icon="mdi:loading" class="mdi-spin" />
                  <span>Probando conexión...</span>
                </div>
              </div>

              <div v-else class="no-ips-detected">
                <p>No se detectaron IPs locales automáticamente.</p>
                <small>Ingresa la IP manualmente abajo</small>
              </div>
            </div>

            <div v-if="isMobile" class="scan-section">
              <div class="scan-idle">
                <button @click="startScanner" class="btn-scan">
                  <Icon icon="mdi:camera" /> Escanear QR
                </button>
                <p class="scan-hint">Apunta al QR de la app en tu PC</p>
              </div>
              <div v-if="scanError" class="scan-error">{{ scanError }}</div>
            </div>

            <button v-if="isMobile && !isConnected" class="quick-action-btn" @click="emit('reconnect')">
              <span class="qa-icon"><Icon icon="mdi:refresh" /></span>
              <span class="qa-text">
                <span class="qa-label">Reconectar</span>
                <span class="qa-desc">Vuelve a conectar con el servidor</span>
              </span>
              <Icon icon="mdi:chevron-right" class="qa-chevron" />
            </button>

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

            <button
              @click="testConnection"
              :disabled="isConnecting"
              class="btn-test"
            >
              {{ isConnecting ? 'Probando...' : 'Probar Conexión' }}
            </button>

            <div v-if="connectionStatus" class="connection-result">
              <div v-if="connectionStatus === 'success'" class="success">
                Conexión exitosa
              </div>
              <div v-else class="error">
                No se pudo conectar. Verifica la IP y que el servidor esté corriendo.
              </div>
            </div>

            <div v-if="isMobile && showMobilePinLogin" class="form-group pin-login-section">
              <label>El servidor requiere PIN</label>
              <p class="pin-login-hint">Ingresa el PIN de 4 dígitos configurado en el escritorio</p>
              <input v-model="mobilePinInput" type="tel" inputmode="numeric" maxlength="4" placeholder="PIN (4 dígitos)" class="server-input pin-input-small" @keyup.enter="handleMobilePinLogin" />
              <div class="pin-change-actions">
                <button @click="handleMobilePinLogin" :disabled="mobilePinLoading" class="btn-pin-save">
                  {{ mobilePinLoading ? 'Verificando...' : 'Conectar' }}
                </button>
                <button @click="cancelMobilePinLogin" class="btn-pin-cancel">Cancelar</button>
              </div>
              <p v-if="mobilePinError" class="pin-error">{{ mobilePinError }}</p>
            </div>

            <div
              v-if="!isMobile && qrCodeUrl && connectionStatus === 'success'"
              class="ip-display"
            >
              <label>URL configurada:</label>
              <div class="ip-box">
                <code>{{ serverUrl }}</code>
              </div>
              <div class="qr-section">
                <div class="qr-label">Escanea para conectar:</div>
                <img :src="qrCodeUrl" alt="QR Code" class="qr-code" />
              </div>
            </div>
          </div>

          <!-- ── Tema (solo móvil) ── -->
          <div
            v-if="isMobileView && (showAllSections || activeSection === 'theme')"
            class="section-panel"
            data-section="theme"
          >
            <h3 class="section-title">Tema</h3>
            <div class="form-group">
              <label>Apariencia</label>
              <div class="sound-toggle-row">
                <button class="sound-toggle-btn" :class="{ active: !isDark }" @click="toggleTheme()">
                  <Icon :icon="isDark ? 'mdi:weather-night' : 'mdi:white-balance-sunny'" />
                  <span>{{ isDark ? 'Oscuro' : 'Claro' }}</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>Color de acento</label>
              <div class="theme-swatch-row">
                <button
                  v-for="p in accentPresets"
                  :key="p.name"
                  type="button"
                  class="theme-swatch"
                  :class="{ active: currentAccent.accent === p.accent }"
                  :style="{ '--sw': p.accent }"
                  :title="p.name"
                  @click="setAccent(p)"
                ></button>
              </div>
            </div>
          </div>

          <!-- ── Preferencias (Sonido) ── -->
          <div
            v-if="showAllSections || activeSection === 'preferences'"
            class="section-panel"
            data-section="preferences"
          >
            <h3 class="section-title">Preferencias</h3>

            <div class="form-group">
              <label>Sonido al presionar</label>
              <div class="sound-toggle-row">
                <button class="sound-toggle-btn" :class="{ active: buttonSoundEnabled }" @click="toggleSound()">
                  <Icon :icon="buttonSoundEnabled ? 'mdi:volume-high' : 'mdi:volume-off'" />
                  <span>{{ buttonSoundEnabled ? 'Activado' : 'Desactivado' }}</span>
                </button>
              </div>
              <div v-if="buttonSoundEnabled" class="sound-selector">
                <CustomSelect
                  :options="availableSounds.map(s => ({ value: s.file, label: s.label }))"
                  :model-value="selectedSound"
                  @update:model-value="onSoundChange(String($event))"
                />
                <button class="sound-test-btn" @click="playTestSound()" title="Probar sonido">
                  <Icon icon="mdi:play" />
                </button>
              </div>
              <small>Reproduce un sonido al presionar un botón</small>
            </div>

            <div v-if="!isMobile" class="form-group">
              <label>Colores de los botones</label>
              <button class="quick-action-btn" @click="emit('clearAll')">
                <span class="qa-icon"><Icon icon="mdi:palette-outline" /></span>
                <span class="qa-text">
                  <span class="qa-label">Restablecer Colores</span>
                  <span class="qa-desc">Vuelve todos los botones a un color estático</span>
                </span>
                <Icon icon="mdi:chevron-right" class="qa-chevron" />
              </button>
            </div>
          </div>

          <!-- ── Seguridad ── -->
          <div v-if="showAllSections || activeSection === 'security'" class="section-panel" data-section="security">
            <h3 class="section-title">Seguridad</h3>

            <div v-if="(!pinConfigured && !isMobile) || (isAuthenticated && !isMobile)" class="form-group">
              <label>PIN de acceso</label>
              <button v-if="!showPinChange" @click="showPinChange = true" class="btn-change-pin">
                {{ pinConfigured ? 'Cambiar PIN' : 'Configurar PIN' }}
              </button>
              <div v-else class="pin-change-form">
                <input v-model="newPin" type="tel" inputmode="numeric" maxlength="4" placeholder="Nuevo PIN (4 dígitos)" class="server-input pin-input-small" />
                <input v-model="confirmNewPin" type="tel" inputmode="numeric" maxlength="4" placeholder="Confirmar PIN" class="server-input pin-input-small" />
                <div class="pin-change-actions">
                  <button @click="handleChangePin" class="btn-pin-save">Guardar PIN</button>
                  <button @click="cancelPinChange" class="btn-pin-cancel">Cancelar</button>
                </div>
                <p v-if="pinError" class="pin-error">{{ pinError }}</p>
                <p v-if="pinSuccess" class="pin-success">PIN cambiado correctamente</p>
              </div>
            </div>

            <div v-if="isMobile" class="form-group">
              <p class="section-hint">La configuración de PIN solo está disponible desde el escritorio.</p>
            </div>

            <!-- Zona avanzada: agrupa acciones delicadas (apagar el
                 servidor, borrar datos) detrás de un acordeón. -->
            <button
              v-if="!isMobile"
              type="button"
              class="advanced-disclosure"
              @click="showAdvanced = !showAdvanced"
            >
              <Icon icon="mdi:chevron-right" class="advanced-disclosure-chevron" :class="{ open: showAdvanced }" />
              <span>{{ showAdvanced ? 'Ocultar' : 'Mostrar' }} opciones avanzadas</span>
            </button>

            <div v-if="!isMobile && showAdvanced" class="form-group advanced-zone">
              <label><Icon icon="mdi:shield-alert-outline" style="vertical-align: -2px" /> Zona avanzada</label>

              <button class="quick-action-btn" @click="emit('reconnect')">
                <span class="qa-icon"><Icon icon="mdi:power" /></span>
                <span class="qa-text">
                  <span class="qa-label">{{ !isConnected ? 'Reconectar' : serverEnabled ? 'Desactivar Servidor' : 'Activar Servidor' }}</span>
                  <span class="qa-desc">{{ !isConnected ? 'Vuelve a conectar con el servidor' : serverEnabled ? 'Deja de recibir comandos temporalmente' : 'Vuelve a recibir comandos' }}</span>
                </span>
                <Icon icon="mdi:chevron-right" class="qa-chevron" />
              </button>

              <p class="section-hint" style="margin: 14px 0 10px;">
                Borra el caché de aplicaciones instaladas y los íconos extraídos de este equipo.
                Se van a volver a escanear la próxima vez que los necesites. Esto no afecta tus botones configurados.
              </p>
              <button class="quick-action-btn danger" @click="startClearData">
                <span class="qa-icon"><Icon icon="mdi:database-remove" /></span>
                <span class="qa-text">
                  <span class="qa-label">Borrar datos de esta PC</span>
                  <span class="qa-desc">Caché de apps instaladas e íconos — pide PIN</span>
                </span>
                <Icon icon="mdi:chevron-right" class="qa-chevron" />
              </button>

              <div v-if="showDataPinPrompt" class="pin-change-form" style="margin-top: 10px;">
                <input
                  v-model="dataPinInput"
                  type="tel"
                  inputmode="numeric"
                  maxlength="4"
                  placeholder="PIN (4 dígitos)"
                  class="server-input pin-input-small"
                  autofocus
                  @keyup.enter="verifyPinAndClearData"
                />
                <div class="pin-change-actions">
                  <button @click="verifyPinAndClearData" :disabled="dataPinLoading" class="btn-pin-save">
                    {{ dataPinLoading ? 'Verificando...' : 'Continuar' }}
                  </button>
                  <button @click="showDataPinPrompt = false; dataPinInput = ''; dataPinError = ''" class="btn-pin-cancel">Cancelar</button>
                </div>
                <p v-if="dataPinError" class="pin-error">{{ dataPinError }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="close" class="btn-neon btn-cancel">Cancelar</button>
        <button @click="save" class="btn-neon btn-save-always-purple btn-neon-primary btn-save">Guardar</button>
      </div>
  </PickerModal>

  <TailwindConfirmDialog
    :show="showClearDataDialog"
    title="Borrar datos de esta PC"
    message="Esto elimina el caché de aplicaciones instaladas y los íconos extraídos de este equipo. Se van a volver a escanear desde cero la próxima vez. Tus botones configurados NO se ven afectados."
    :confirmLabel="clearingData ? 'Borrando...' : 'Borrar'"
    cancelLabel="Cancelar"
    @confirm="handleClearData"
    @cancel="showClearDataDialog = false"
    @close="showClearDataDialog = false"
  />
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
   SETTINGS OVERLAY
   =========================== */
/* ===========================
   BODY (sidebar + content)
   =========================== */
.settings-body {
  display: flex;
  height: 540px;
}

.settings-sidebar {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  border-right: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 14px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.15s;
  text-align: left;
}

.sidebar-item i { font-size: 1rem; width: 20px; text-align: center; }

@media (hover: hover) {
  .sidebar-item:hover { background: rgba(255, 255, 255, 0.06); color: var(--text-1); }
}

.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.settings-content {
  flex: 1;
  padding: 20px 24px;
  overflow-y: auto;
  overflow-x: hidden;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 18px;
  color: var(--text-1);
}

.section-hint {
  color: var(--text-2);
  font-size: 0.9rem;
  margin: 0;
}

.sidebar-spacer { flex: 1; }

.view-toggle {
  opacity: 0.6;
  font-size: 0.8rem !important;
}

.show-all .section-panel + .section-panel {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border);
}

@media (max-width: 640px) {
  .settings-body { flex-direction: column; height: auto; max-height: 75dvh; }
  .settings-sidebar {
    width: 100%;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 4px;
    background: transparent;
  }
  .sidebar-item {
    padding: 8px 12px;
    font-size: 0.8rem;
    gap: 6px;
    white-space: nowrap;
  }
  .settings-content { padding: 16px; }
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
  background: color-mix(in srgb, var(--accent) 10%, transparent);
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
  background: color-mix(in srgb, var(--accent) 8%, transparent);
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
  color: var(--text-2);
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
  background: color-mix(in srgb, var(--accent) 8%, transparent);
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

@media (hover: hover) {
  .ip-select:hover:not(:disabled) {
    border-color: rgba(59, 130, 246, 0.6);
    background: rgba(0, 0, 0, 0.4);
  }
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
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--text-1);
  padding: 10px;
  border-radius: 5px;
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
  color: var(--text-1);
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

@media (hover: hover) {
  .btn-scan:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
  }
}

.scan-hint {
  color: var(--text-1);
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

/* Zona avanzada (oculta) */
.advanced-disclosure {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 0;
  border: none;
  background: transparent;
  color: var(--accent);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}
@media (hover: hover) {
  .advanced-disclosure:hover { text-decoration: underline; }
}
.advanced-disclosure-chevron {
  transition: transform 0.18s ease;
}
.advanced-disclosure-chevron.open {
  transform: rotate(90deg);
}
.advanced-zone {
  margin-top: 18px;
  padding: 14px;
  border-radius: 12px;
  border: 1px dashed color-mix(in srgb, #ef4444 35%, transparent);
  background: color-mix(in srgb, #ef4444 5%, transparent);
}
.advanced-zone > label {
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* Tema (móvil) */
.theme-swatch-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.theme-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--sw);
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 0 8px color-mix(in srgb, var(--sw) 40%, transparent);
}
.theme-swatch.active {
  border-color: #fff;
  transform: scale(1.12);
  box-shadow: 0 0 14px color-mix(in srgb, var(--sw) 60%, transparent);
}
@media (hover: hover) {
  .theme-swatch:hover:not(.active) { transform: scale(1.12); }
}

/* Acciones rápidas */
.quick-action-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-1);
  cursor: pointer;
  text-align: left;
  transition: all 0.18s;
}
@media (hover: hover) {
  .quick-action-btn:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    box-shadow: 0 0 16px -6px color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(3px);
  }
  .quick-action-btn:hover .qa-chevron { opacity: 1; transform: translateX(2px); }
}
.quick-action-btn:active { transform: scale(0.98); }

.qa-icon {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  font-size: 1.25rem;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
}
.qa-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qa-label { font-weight: 600; font-size: 0.95rem; }
.qa-desc { font-size: 0.8rem; color: var(--text-2); }
.qa-chevron {
  flex-shrink: 0;
  font-size: 1.1rem;
  color: var(--text-2);
  opacity: 0.5;
  transition: all 0.18s;
}

.quick-action-btn.danger .qa-icon {
  background: color-mix(in srgb, #ef4444 16%, transparent);
  color: #ef4444;
}
.quick-action-btn.danger .qa-label { color: #ef4444; }
@media (hover: hover) {
  .quick-action-btn.danger:hover {
    background: color-mix(in srgb, #ef4444 12%, transparent);
    border-color: color-mix(in srgb, #ef4444 40%, transparent);
    box-shadow: 0 0 16px -6px color-mix(in srgb, #ef4444 40%, transparent);
  }
}
[data-theme='light'] .quick-action-btn {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
}

/* Form */
.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-2);
}

.server-input {
  width: 100%;
  padding: 11px 14px;
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  border-radius: 10px;
  color: var(--text-1);
  font-size: 0.95rem;
  font-family: 'Courier New', monospace;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}

select.server-input {
  font-family: inherit;
  cursor: pointer;
}

select.server-input option,
select#soundSelector option {
  background: rgba(16, 16, 24, 0.98);
  color: var(--text-1);
}

.server-input:focus {
  outline: none;
  border-color: var(--field-focus);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: var(--text-2);
  font-size: 0.82rem;
}

/* Sound toggle */
.sound-toggle-row {
  display: flex;
  align-items: center;
}

.sound-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--field-border);
  border-radius: 10px;
  padding: 8px 14px;
  color: var(--text-1);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.18s;
}
.sound-toggle-btn i { font-size: 1.05rem; }
.sound-toggle-btn.active {
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.sound-selector {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}

.sound-selector select {
  flex: 1;
}

.sound-test-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(102, 126, 234, 0.2);
  border: 1px solid rgba(102, 126, 234, 0.3);
  border-radius: 8px;
  color: #8ea4f0;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

@media (hover: hover) {
  .sound-test-btn:hover {
    background: rgba(102, 126, 234, 0.35);
  }
}

/* Buttons */
.btn-test {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  color: var(--text-1);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.18s;
  margin-bottom: 16px;
}

@media (hover: hover) {
  .btn-test:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
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
  gap: 10px;
  padding: 14px 22px;
  border-top: 1px solid var(--glass-border);
  background: rgba(10, 10, 16, 0.5);
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.18s;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  color: var(--text-1);
  box-shadow: 0 0 12px -4px color-mix(in srgb, var(--accent) 20%, transparent);
}

@media (hover: hover) {
  .btn-cancel:hover {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    box-shadow: 0 0 20px -4px color-mix(in srgb, var(--accent) 35%, transparent);
  }
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: 1px solid rgba(139, 92, 246, 0.6);
  color: #fff;
  box-shadow:
    0 0 22px -6px #8b5cf6,
    0 0 40px -8px rgba(139, 92, 246, 0.3);
}

@media (hover: hover) {
  .btn-save:hover {
    box-shadow:
      0 0 30px -4px #8b5cf6,
      0 0 50px -6px rgba(139, 92, 246, 0.45);
    filter: brightness(1.08);
  }
}

.btn-change-pin {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  border: 1px solid color-mix(in srgb, var(--accent) 60%, transparent);
  padding: 10px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.18s;
  width: 100%;
  box-shadow:
    0 0 16px -4px var(--accent),
    0 0 40px -8px color-mix(in srgb, var(--accent) 30%, transparent);
}

@media (hover: hover) {
  .btn-change-pin:hover { filter: brightness(1.08); box-shadow: 0 0 24px -2px var(--accent); }
}

.pin-change-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pin-input-small {
  text-align: center;
  letter-spacing: 8px;
  font-size: 1.2rem;
  font-weight: 700;
}

.pin-change-actions {
  display: flex;
  gap: 10px;
}

.btn-pin-save {
  flex: 1;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.18s;
  box-shadow: 0 0 16px -4px var(--accent);
}

@media (hover: hover) {
  .btn-pin-save:hover { filter: brightness(1.08); box-shadow: 0 0 24px -2px var(--accent); }
}

.btn-pin-cancel {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  color: var(--text-1);
  padding: 10px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.18s;
}

@media (hover: hover) {
  .btn-pin-cancel:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.2); }
}

.pin-error {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 4px 0 0;
  text-align: center;
}

.pin-success {
  color: #10b981;
  font-size: 0.85rem;
  margin: 4px 0 0;
  text-align: center;
  font-weight: 600;
}

.settings-content::-webkit-scrollbar { width: 4px; }
.settings-content::-webkit-scrollbar-track { background: transparent; }
.settings-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

/* ===========================
   LIGHT THEME
   =========================== */
[data-theme='light'] .settings-sidebar {
  background: rgba(0, 0, 0, 0.03);
  border-right-color: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .sidebar-item:hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

[data-theme='light'] .info-box {
  background: rgba(139, 92, 246, 0.06);
  border-color: rgba(139, 92, 246, 0.2);
}

[data-theme='light'] .ip-selector-section {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .ip-select {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.12);
  color: var(--text-1);
}

[data-theme='light'] .ip-select option,
[data-theme='light'] select.server-input option,
[data-theme='light'] select#soundSelector option {
  background: #fff;
  color: rgba(0, 0, 0, 0.87);
}

[data-theme='light'] .server-input {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .server-input:focus {
  background: rgba(0, 0, 0, 0.02);
  border-color: var(--accent);
}

[data-theme='light'] .sound-toggle-btn {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .settings-footer {
  background: rgba(245, 245, 250, 0.8);
  border-top-color: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .btn-cancel {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .btn-cancel:hover {
  background: rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .btn-test {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .btn-test:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .no-ips-detected {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.2);
}

[data-theme='light'] .settings-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .sound-test-btn {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}
</style>
