<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { ActionType, type StreamButton as ButtonType } from '@shared/core'
import { useToast } from '../composables/useToast'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useBiometric } from '../composables/useBiometric'
import { useAuthGates } from '../composables/useAuthGates'
import { useButtons } from '../composables/useButtons'
import { useButtonSound } from '../composables/useButtonSound'
import { useDragAndDrop } from '../composables/useDragAndDrop'
import { useHaptics } from '../composables/useHaptics'
import { useSettingsRequest } from '../composables/useSettingsRequest'
import { useDraggableFab } from '../composables/useDraggableFab'
import { useSocket } from '../composables/useSocket'
import { useTheme } from '../composables/useTheme'
import { useVolume } from '../composables/useVolume'
import { useServerUrlStore } from '../store/serverUrl.store'
import ButtonEditor from './ButtonEditor.vue'
import MouseController from './MouseController.vue'
import ServerSettings from './ServerSettings.vue'
import StreamButton from './StreamButton.vue'
import TailwindConfirmDialog from './TailwindConfirmDialog.vue'

const toast = useToast()
const haptics = useHaptics()
const { requestCount: settingsRequestCount } = useSettingsRequest()
const {
  getAuthHeaders,
  checkPinStatus,
  login,
  logout,
  isAuthenticated,
  pinConfigured,
  authToken,
} = useAuth()
const {
  biometryAvailable,
  hasSavedPin,
  checkBiometry,
  clearSavedPin,
  authenticateAndGetPin,
} = useBiometric()

// Tema claro/oscuro (estado + persistencia)
const { isDark, toggleTheme, initTheme, currentAccent, accentPresets, setAccent } = useTheme()
const showAccentPicker = ref(false)
const serverUrlStore = useServerUrlStore()
const {
  isConnected,
  connect: socketConnect,
  disconnect: socketDisconnect,
  execute: socketExecute,
  on: socketOn,
  off: socketOff,
  getSettings: socketGetSettings,
  setGridSize: socketSetGridSize,
  setButtonSound: socketSetButtonSound,
  setServerEnabled: socketSetServerEnabled,
} = useSocket()

// Control de volumen (estado, sync con debounce y listener volume:changed)
const {
  showVolumeSlider,
  systemVolume,
  systemMuted,
  onVolumeInput,
  onMuteToggle,
  toggleVolumeSlider,
  setVolume,
  resetAutoHide,
} = useVolume()

let volDebounce: ReturnType<typeof setTimeout> | null = null
const onVolumePillTouch = (e: TouchEvent) => {
  const pill = (e.currentTarget as HTMLElement)
  const rect = pill.getBoundingClientRect()
  const touch = e.touches[0]
  const pct = Math.round(Math.max(0, Math.min(100, ((rect.bottom - touch.clientY) / rect.height) * 100)))
  systemVolume.value = pct
  if (volDebounce) clearTimeout(volDebounce)
  volDebounce = setTimeout(() => setVolume(pct), 60)
  resetAutoHide()
}

const props = defineProps<{
  rows?: number
  cols?: number
}>()

const showEditor = ref(false)
const showSettings = ref(false)
const editingButton = ref<ButtonType | null>(null)
const editingPosition = ref({ row: 0, col: 0 })
const isExecuting = ref<string | null>(null)
/** Estado visual por botón: 'running' | 'success' | 'error' (ausente = idle). */
const buttonStatus = ref<Record<string, 'running' | 'success' | 'error'>>({})
const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>(
  'disconnected',
)
const serverEnabled = ref(true)

// Estado central de botones, dimensiones y persistencia
const {
  buttons,
  gridRows,
  gridCols,
  gridItems,
  isReloadingGrid,
  isLoadingButtons,
  updateGridFromSize,
  swapButtons,
  parseAndSetButtons,
  loadButtons,
  saveButtons,
  reloadButtonsWithAnimation,
} = useButtons({ serverEnabled })

// Server unreachable dialog (mobile)
const showServerUnreachableDialog = ref(false)

// Gates de desbloqueo: PIN (escritorio), lock móvil y opt-in biométrico
const {
  showPinGate,
  pinGateInput,
  pinGateError,
  pinGateLoading,
  openPinGate,
  cancelPinGate,
  handlePinGateSubmit,
  showMobilePinLock,
  mobileLockPin,
  mobileLockError,
  mobileLockLoading,
  handleMobilePinLockSubmit,
  handleBiometricRetry,
  showBiometricOptIn,
  handleBiometricOptInAccept,
  handleBiometricOptInDecline,
} = useAuthGates({
  onDesktopUnlocked: () => {
    showSettings.value = true
  },
  onBiometricEnabled: () => {
    toast.add({
      severity: 'success',
      summary: 'Biometría activada',
      detail: 'La próxima vez podrás desbloquear con tu huella',
      life: 4000,
    })
  },
})

// Mouse controller
const showMouseController = ref(false)


// Theme FAB draggable
// Botón flotante arrastrable (persiste su esquina, distingue tap de arrastre)
const {
  fabRef: themeFabRef,
  fabCorner,
  fabStyle,
  fabMoved,
  onTouchStart: handleFabTouchStart,
  onTouchMove: handleFabTouchMove,
  onTouchEnd: handleFabTouchEnd,
} = useDraggableFab()

// Detectar plataforma nativa (Android/iOS) vs desktop
const platform = Capacitor.getPlatform()
const isMobile = platform === 'android' || platform === 'ios'

// Detectar mobile por tamaño de pantalla (responsive layout)
const isMobileView = ref(false)

// Drag & drop (ratón + táctil), delegando el intercambio en useButtons
const {
  touchDragButton,
  isPressing,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  isDragging,
  isDragOver,
  handleTouchStart,
  handleGridTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  isTouchDragging,
  isTouchDragOver,
} = useDragAndDrop({
  swapButtons,
  onMouseDrop: () => {
    toast.removeAllGroups()
    toast.add({
      severity: 'success',
      summary: 'Botón movido',
      detail: 'El botón se ha reubicado correctamente',
      life: 2000,
    })
  },
  onTwoFingerTap: (button, position) => {
    handleButtonEdit(button, position)
  },
})

const API_URL = computed(() => serverUrlStore.serverUrl)

onMounted(async () => {
  // Red de seguridad: nunca dejar los skeletons colgados si la carga
  // no llega a ejecutarse (sin conexión, sin auth, servidor apagado…).
  window.setTimeout(() => {
    isLoadingButtons.value = false
  }, 3000)

  // Inicializar tema
  initTheme()

  isMobileView.value = window.innerWidth <= 850

  const handleResize = () => {
    isMobileView.value = window.innerWidth <= 850
  }
  window.addEventListener('resize', handleResize)

  // Mobile: check if server has PIN configured → show lock screen before anything else
  if (isMobile && API_URL.value) {
    const serverReachable = await checkServerReachable()
    if (serverReachable) {
      // Ask server if PIN is configured
      const hasPinConfigured = await checkPinStatus()
      if (hasPinConfigured) {
        // Show lock screen immediately
        showMobilePinLock.value = true

        // Check biometry availability (needed to show the biometric button)
        await checkBiometry()

        // If returning user with token, try biometric unlock automatically
        if (authToken.value) {
          try {
            if (biometryAvailable.value && hasSavedPin.value) {
              const pin = await authenticateAndGetPin()
              if (pin) {
                const result = await login(pin)
                if (result.success) {
                  showMobilePinLock.value = false
                } else {
                  // Saved PIN no longer valid (changed on desktop)
                  clearSavedPin()
                }
              }
              // If biometric cancelled, lock screen is already visible
            }
          } catch (e) {
            console.error('Biometric check failed:', e)
            // Lock screen is already visible — user can enter PIN manually
          }
        }
      }
    } else if (authToken.value) {
      // Server unreachable — let user choose: retry or clean up
      showServerUnreachableDialog.value = true
      return
    }
  }

  // Conectar WebSocket (el watch(isConnected) se encarga de cargar datos al conectar)
  connectionStatus.value = 'connecting'
  socketConnect()

  // Escuchar cambios de gridSize desde otros clientes
  socketOn('settings:gridSizeChanged', (data: { gridSize: number }) => {
    updateGridFromSize(data.gridSize)
  })

  // Escuchar actualizaciones de comandos desde otros clientes
  socketOn('commands:updated', (commands: any[]) => {
    buttons.value.clear()
    parseAndSetButtons(commands)
  })

  // Escuchar cambio de estado del servidor (desktop toggle)
  socketOn('server:enabledChanged', (data: { enabled: boolean }) => {
    serverEnabled.value = data.enabled
    if (!data.enabled) {
      connectionStatus.value = 'disconnected'
      buttons.value.clear()
    } else {
      connectionStatus.value = 'connected'
      loadSettings()
      loadButtons()
    }
  })

  // Escuchar cambios de sonido desde otros clientes
  socketOn(
    'settings:buttonSoundChanged',
    (data: { enabled: boolean; file: string }) => {
      setSoundEnabled(data.enabled)
      setSelectedSound(data.file)
    },
  )


  // Detectar error de conexión para actualizar el estado
  socketOn('connect_error', () => {
    connectionStatus.value = 'disconnected'
    buttons.value.clear()
  })

  // Carga inicial via HTTP (fallback si el socket tarda en conectar)
  await loadSettings()
  // Comprobar serverEnabled antes de cargar botones
  try {
    const initRes = await fetch(`${API_URL.value}/command/settings`, {
      headers: { ...getAuthHeaders() },
    })
    if (initRes.ok) {
      const initSettings = await initRes.json()
      serverEnabled.value = initSettings.serverEnabled !== false
      // Sincronizar sonido desde el servidor
      if (typeof initSettings.buttonSound === 'boolean') {
        setSoundEnabled(initSettings.buttonSound)
      }
      if (initSettings.buttonSoundFile) {
        setSelectedSound(initSettings.buttonSoundFile)
      }
    }
  } catch {
    /* ignore */
  }
  if (serverEnabled.value) {
    await loadButtons()
  } else {
    connectionStatus.value = 'disconnected'
  }

  // Check PIN status for settings gate (desktop uses this)
  await checkPinStatus()
})

onUnmounted(() => {
  socketOff('settings:gridSizeChanged')
  socketOff('commands:updated')
  socketOff('server:enabledChanged')
  socketOff('settings:buttonSoundChanged')
  socketOff('connect_error')
})

const checkConnection = async () => {
  // El estado de conexión se maneja automáticamente por el socket
  if (isConnected.value) {
    connectionStatus.value = 'connected'
    return
  }
  // Fallback HTTP
  try {
    connectionStatus.value = 'connecting'
    const response = await fetch(`${API_URL.value}/command`, {
      headers: { ...getAuthHeaders() },
    })
    if (response.ok) {
      connectionStatus.value = 'connected'
    } else {
      connectionStatus.value = 'disconnected'
    }
  } catch (error) {
    connectionStatus.value = 'disconnected'
  }
}

/** Botón Reconectar: Desktop = toggle server on/off, Mobile = solo reconectar */
const handleReconnectButton = () => {
  if (isMobile) {
    // Móvil nativo: solo reconectar socket
    socketDisconnect()
    connectionStatus.value = 'connecting'
    socketConnect()
  } else {
    // Desktop: toggle estado del servidor
    if (serverEnabled.value) {
      // Apagar: enviar al server que está disabled
      socketSetServerEnabled(false)
    } else {
      // Encender: enviar al server que está enabled
      socketSetServerEnabled(true)
    }
  }
}

// Reaccionar a cambios de conexión del socket
watch(isConnected, async (connected) => {
  if (connected) {
    // Recargar settings y botones al reconectarse
    await loadSettings()
    // Comprobar si el servidor está habilitado
    try {
      const response = await fetch(`${API_URL.value}/command/settings`, {
        headers: { ...getAuthHeaders() },
      })
      if (response.ok) {
        const settings = await response.json()
        serverEnabled.value = settings.serverEnabled !== false
      }
    } catch {
      /* ignore */
    }
    buttons.value.clear()
    if (serverEnabled.value) {
      connectionStatus.value = 'connected'
      await loadButtons()
    } else {
      connectionStatus.value = 'disconnected'
    }
  } else {
    connectionStatus.value = 'disconnected'
    buttons.value.clear()
  }
})

const loadSettings = async () => {
  try {
    // Intentar via HTTP (más confiable en carga inicial)
    const response = await fetch(`${API_URL.value}/command/settings`, {
      headers: { ...getAuthHeaders() },
    })
    if (response.ok) {
      const settings = await response.json()
      updateGridFromSize(settings.gridSize || 12)
      return
    }
  } catch {
    // Fallback: valor por defecto
    updateGridFromSize(12)
  }
}

/** Open settings — if PIN is configured and user not authenticated, ask PIN first (desktop only) */
const openSettings = async () => {
  // Mobile: PIN is handled at app startup via lock screen, no need for gate here
  if (!isMobile && pinConfigured.value && !isAuthenticated.value) {
    openPinGate()
    return
  }
  showSettings.value = true
}

// Permite abrir Configuración desde fuera del grid (p. ej. el aviso de
// "no se encuentra el servidor" en App.vue) reutilizando el gate de PIN.
watch(settingsRequestCount, () => {
  void openSettings()
})

/** Check if the saved server URL is reachable (5s timeout) */
const checkServerReachable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(`${API_URL.value}/auth/status`, {
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok
  } catch {
    return false
  }
}

/** Clean up all stored state so user can reconfigure from scratch */
const cleanupAndReset = async () => {
  await logout()
  clearSavedPin()
  serverUrlStore.setServerUrl('')
  localStorage.removeItem('serverUrl')
  localStorage.removeItem('qrCodeUrl')
  localStorage.removeItem('gridSize')
  socketDisconnect()
  connectionStatus.value = 'disconnected'
  buttons.value.clear()
  toast.add({
    severity: 'warn',
    summary: 'Servidor no encontrado',
    detail: 'No se pudo conectar. Escanea el QR de nuevo.',
    life: 5000,
  })
}

const {
  play: playClickSound,
  setEnabled: setSoundEnabled,
  setSelectedSound,
} = useButtonSound()

/** Marca el resultado de un botón y lo devuelve a idle tras la animación. */
const setButtonStatus = (id: string, status: 'success' | 'error') => {
  buttonStatus.value[id] = status
  window.setTimeout(
    () => {
      // Solo limpiar si no hay una nueva ejecución en curso.
      if (buttonStatus.value[id] === status) {
        delete buttonStatus.value[id]
      }
    },
    status === 'error' ? 1200 : 800,
  )
}

const handleButtonClick = async (button: ButtonType | null) => {
  if (!button) return

  // No ejecutar si se está arrastrando en mobile
  if (touchDragButton.value) return

  // Reproducir sonido de tecla + feedback háptico en móvil
  playClickSound()
  void haptics.tap()

  try {
    isExecuting.value = button.id
    buttonStatus.value[button.id] = 'running'

    let result: { success: boolean; output?: string; message?: string }

    if (isConnected.value) {
      // Via WebSocket (más rápido)
      result = await socketExecute(button.id)
    } else {
      // Fallback HTTP
      const response = await fetch(
        `${API_URL.value}/command/execute/${button.id}`,
        {
          method: 'POST',
          headers: { ...getAuthHeaders() },
        },
      )
      result = await response.json()
      if (!response.ok) result.success = false
    }

    if (result.success) {
      setButtonStatus(button.id, 'success')
      void haptics.success()
      toast.removeAllGroups()
      toast.add({
        severity: 'success',
        summary: 'Ejecutado',
        detail: `${button.label} ejecutado correctamente`,
        life: 3000,
      })
    } else {
      setButtonStatus(button.id, 'error')
      void haptics.error()
      toast.removeAllGroups()
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: result.message || 'No se pudo ejecutar el comando',
        life: 5000,
      })
    }
  } catch (error) {
    console.error('Error executing command:', error)
    setButtonStatus(button.id, 'error')
    void haptics.error()
    toast.removeAllGroups()
    toast.add({
      severity: 'error',
      summary: 'Error de conexión',
      detail: 'No se pudo conectar con el servidor',
      life: 4000,
    })
  } finally {
    setTimeout(() => {
      isExecuting.value = null
    }, 300)
  }
}

const handleButtonEdit = (
  button: ButtonType | null,
  position: { row: number; col: number },
) => {
  editingButton.value = button
  editingPosition.value = position
  showEditor.value = true
}

const handleSaveButton = (button: ButtonType) => {
  buttons.value.set(button.id, button)
  saveButtons()
}

const handleDeleteButton = (id: string) => {
  buttons.value.delete(id)
  saveButtons()
}

const clearAll = () => {
  // Aquí irá el nuevo diálogo de confirmación con Tailwind
}

const loadMultimediaPresets = async () => {
  try {
    const response = await fetch(
      `${API_URL.value}/command/presets/multimedia`,
      {
        headers: { ...getAuthHeaders() },
      },
    )
    if (response.ok) {
      const presets = await response.json()
      showPresetsDialog.value = true
      multimediaPresets.value = presets
    }
  } catch (error) {
    console.error('Error loading multimedia presets:', error)
    toast.removeAllGroups()
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron cargar los comandos multimedia',
      life: 4000,
    })
  }
}

const showPresetsDialog = ref(false)
const multimediaPresets = ref<any[]>([])

const addPresetButton = (preset: any) => {
  for (let row = 0; row < gridRows.value; row++) {
    for (let col = 0; col < gridCols.value; col++) {
      const exists = Array.from(buttons.value.values()).find(
        (b) => b.position.row === row && b.position.col === col,
      )
      if (!exists) {
        const newButton: ButtonType = {
          id: `${preset.id}-${Date.now()}`,
          label: preset.label,
          icon: preset.icon,
          color: '#ffffff',
          backgroundColor: '#8b5cf6',
          action: {
            type: ActionType.COMMAND,
            payload: preset.payload,
          },
          position: { row, col },
        }
        buttons.value.set(newButton.id, newButton)
        saveButtons()
        toast.removeAllGroups()
        toast.add({
          severity: 'success',
          summary: 'Botón agregado',
          detail: `${preset.label} agregado correctamente`,
          life: 3000,
        })
        return
      }
    }
  }
  toast.removeAllGroups()
  toast.add({
    severity: 'warn',
    summary: 'Sin espacio',
    detail: 'No hay espacio disponible en la cuadrícula',
    life: 4000,
  })
}

// Confirmación para limpiar todos los botones
const showClearAllDialog = ref(false)
function openClearAllDialog() {
  showClearAllDialog.value = true
}
function handleClearAllConfirm() {
  buttons.value.clear()
  saveButtons()
  toast.removeAllGroups()
  toast.add({
    severity: 'info',
    summary: 'Botones eliminados',
    detail: 'Todos los botones han sido eliminados',
    life: 3000,
  })
  showClearAllDialog.value = false
}
function handleClearAllCancel() {
  showClearAllDialog.value = false
}

// Server unreachable dialog handlers
async function handleServerUnreachableRetry() {
  showServerUnreachableDialog.value = false
  // Re-run the full startup flow
  const serverReachable = await checkServerReachable()
  if (serverReachable) {
    const hasPinConfigured = await checkPinStatus()
    if (hasPinConfigured) {
      showMobilePinLock.value = true
      await checkBiometry()
      if (authToken.value) {
        try {
          if (biometryAvailable.value && hasSavedPin.value) {
            const pin = await authenticateAndGetPin()
            if (pin) {
              const result = await login(pin)
              if (result.success) {
                showMobilePinLock.value = false
              } else {
                clearSavedPin()
              }
            }
          }
        } catch (e) {
          console.error('Biometric check failed:', e)
        }
      }
    }
    // Connect socket and load data
    connectionStatus.value = 'connecting'
    socketConnect()
    await loadSettings()
    try {
      const initRes = await fetch(`${API_URL.value}/command/settings`, {
        headers: { ...getAuthHeaders() },
      })
      if (initRes.ok) {
        const initSettings = await initRes.json()
        serverEnabled.value = initSettings.serverEnabled !== false
      }
    } catch {
      /* ignore */
    }
    if (serverEnabled.value) {
      await loadButtons()
    } else {
      connectionStatus.value = 'disconnected'
    }
    await checkPinStatus()
  } else {
    // Still unreachable — show dialog again
    showServerUnreachableDialog.value = true
  }
}

async function handleServerUnreachableClean() {
  showServerUnreachableDialog.value = false
  await cleanupAndReset()
}

</script>

<template>
  <div class="stream-deck-container">
    <div class="header">
      <div class="title-section">
        <img
          src="/logo/SpartanHub-logo.png"
          alt="SpartanHub Logo"
          width="150"
          class="logo"
        />
        <div class="connection-status" :class="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">
            {{
              connectionStatus === 'connected'
                ? 'Conectado'
                : connectionStatus === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'
            }}
          </span>
        </div>
      </div>
      <div class="actions">
        <button @click="openSettings" title="Configuración" class="action-btn action-settings">
          <img src="/icons/config-line.svg" alt="Configuración" class="btn-svg" />
          <span class="btn-text">Configuración</span>
        </button>

        <template v-if="pinConfigured || isMobile">
          <button @click="loadMultimediaPresets" title="Comandos multimedia" class="action-btn action-accent">
            <img src="/icons/music-line.svg" alt="Multimedia" class="btn-svg" />
            <span class="btn-text">Multimedia</span>
          </button>
          <button @click="toggleVolumeSlider" title="Control de volumen" class="action-btn action-amber">
            <img :src="systemMuted ? '/icons/volume-mute.svg' : '/icons/volume-high.svg'" alt="Volumen" class="btn-svg" />
            <span class="btn-text">Volumen</span>
          </button>
          <button v-if="isMobile" @click="showMouseController = true" title="Mouse & Teclado" class="action-btn action-cyan">
            <span class="action-emoji">🖱️</span>
            <span class="btn-text">Mouse</span>
          </button>
          <button
            @click="handleReconnectButton"
            :title="isMobile ? 'Reconectar' : serverEnabled ? 'Desactivar servidor' : 'Activar servidor'"
            class="action-btn"
            :class="serverEnabled ? 'action-neutral' : 'action-danger'"
          >
            <img src="/icons/reconnect-line.svg" alt="Reconectar" class="btn-svg" />
            <span class="btn-text">{{ isMobile ? 'Reconectar' : serverEnabled ? 'Desactivar' : 'Activar' }}</span>
          </button>
          <button @click="reloadButtonsWithAnimation" title="Recargar" class="action-btn action-neutral">
            <img src="/icons/reload-line.svg" alt="Recargar" class="btn-svg" />
            <span class="btn-text">Recargar Botones</span>
          </button>
          <button v-if="!isMobile" @click="openClearAllDialog" title="Limpiar todo" class="action-btn action-danger">
            <img src="/icons/trash-line.svg" alt="Eliminar" class="btn-svg" />
            <span class="btn-text">Limpiar Botones</span>
          </button>
        </template>
      </div>

      <!-- Volume slider panel (floating overlay) -->
      <Transition name="vol">
      <div v-if="showVolumeSlider" class="volume-overlay" @click.self="showVolumeSlider = false">
        <!-- Desktop: horizontal bar -->
        <div class="volume-panel volume-desktop">
          <button class="volume-mute-btn" @click="onMuteToggle" :title="systemMuted ? 'Activar sonido' : 'Silenciar'">
            <img :src="systemMuted ? '/icons/volume-mute.svg' : systemVolume > 50 ? '/icons/volume-high.svg' : '/icons/volume-low.svg'" alt="" class="volume-icon" />
          </button>
          <input type="range" min="0" max="100" step="1" :value="systemVolume" @input="onVolumeInput" class="volume-slider" :style="{ '--vol-pct': systemVolume + '%' }" />
          <span class="volume-label">{{ systemVolume }}%</span>
        </div>
        <!-- Mobile: vertical Android-style pill -->
        <div
          class="volume-panel volume-mobile"
          @touchstart.prevent="onVolumePillTouch"
          @touchmove.prevent="onVolumePillTouch"
        >
          <img :src="systemMuted ? '/icons/volume-mute.svg' : systemVolume > 50 ? '/icons/volume-high.svg' : '/icons/volume-low.svg'" alt="" class="volume-pill-icon" @click.stop="onMuteToggle" />
          <div class="volume-pill-fill" :style="{ '--vol-pct': systemVolume + '%' }"></div>
        </div>
      </div>
      </Transition>
    </div>

    <!-- Floating theme toggle (draggable, snaps to corners) -->
    <div class="fab-container" :class="`fab-${fabCorner}`" :style="fabStyle">
      <button
        ref="themeFabRef"
        @click="!fabMoved && toggleTheme()"
        @contextmenu.prevent="showAccentPicker = !showAccentPicker"
        :title="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
        class="theme-fab"
        @touchstart.passive="handleFabTouchStart"
        @touchmove="handleFabTouchMove"
        @touchend="handleFabTouchEnd"
      >
        <img v-if="isDark" src="/icons/sun.svg" alt="Claro" class="theme-fab-icon" />
        <img v-else src="/icons/moon.svg" alt="Oscuro" class="theme-fab-icon" />
      </button>
      <button class="accent-toggle" @click="showAccentPicker = !showAccentPicker" title="Cambiar color">
        <span class="accent-dot" :style="{ background: currentAccent.accent }"></span>
      </button>
      <Transition name="accent-pop">
        <div v-if="showAccentPicker" class="accent-picker">
          <button
            v-for="p in accentPresets"
            :key="p.name"
            class="accent-swatch"
            :class="{ active: currentAccent.accent === p.accent }"
            :style="{ '--sw': p.accent }"
            :title="p.name"
            @click="setAccent(p)"
          />
        </div>
      </Transition>
    </div>

    <!-- Mensaje cuando no hay PIN configurado (solo desktop) -->
    <div v-if="!pinConfigured && !isMobile" class="no-pin-message">
      <div class="no-pin-icon">🔐</div>
      <h2 class="no-pin-title">Configura un PIN para comenzar</h2>
      <p class="no-pin-desc">
        Necesitas configurar un PIN de 4 dígitos desde
        <strong>Configuración</strong> para poder usar los botones.
      </p>
      <button @click="openSettings" class="no-pin-btn">
        ⚙️ Ir a Configuración
      </button>
    </div>

    <template v-if="pinConfigured || isMobile">
      <p class="hint" v-if="!isMobileView">
        Click para ejecutar • Click derecho para editar • Arrastra para
        reorganizar
      </p>
      <p class="hint" v-else>
        Toca para ejecutar • 2 dedos para editar • Mantén presionado 1s para reorganizar
      </p>

      <div
        class="grid"
        :class="{ 'grid-reloading': isReloadingGrid }"
        :style="{
          '--grid-cols': gridCols,
          '--grid-rows': gridRows,
        }"
        @touchstart="handleGridTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @touchcancel="handleTouchCancel"
      >
        <div
          v-for="item in gridItems"
          :key="`${item.row}-${item.col}`"
          class="grid-item"
          :class="{
            executing: isExecuting === item.button?.id,
            'is-pressing': isPressing === item.button?.id,
            'touch-dragging': isTouchDragging(item.button),
            'touch-drag-over': isTouchDragOver({
              row: item.row,
              col: item.col,
            }),
          }"
          :data-grid-row="item.row"
          :data-grid-col="item.col"
          @touchstart="
            handleTouchStart(
              item.button,
              { row: item.row, col: item.col },
              $event,
            )
          "
        >
          <StreamButton
            :button="item.button"
            :isEmpty="!item.button"
            :isDragging="isDragging(item.button)"
            :isDragOver="isDragOver({ row: item.row, col: item.col })"
            :isSelected="false"
            :status="item.button ? buttonStatus[item.button.id] : undefined"
            :isLoading="isLoadingButtons && !item.button"
            @click="handleButtonClick(item.button)"
            @edit="
              handleButtonEdit(item.button, { row: item.row, col: item.col })
            "
            @dragstart="handleDragStart(item.button)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver({ row: item.row, col: item.col })"
            @dragleave="handleDragLeave"
            @drop="handleDrop({ row: item.row, col: item.col })"
          />
        </div>
      </div>
    </template>

    <ServerSettings v-model:show="showSettings" />

    <!-- PIN Gate Dialog -->
    <div v-if="showPinGate" class="confirm-overlay" @click.self="cancelPinGate">
      <div class="pin-gate-dialog">
        <h3 class="pin-gate-title">🔐 Ingresa el PIN</h3>
        <p class="pin-gate-hint">
          Ingresa el PIN de 4 dígitos para acceder a la configuración
        </p>
        <input
          v-model="pinGateInput"
          type="tel"
          inputmode="numeric"
          maxlength="4"
          placeholder="PIN"
          class="pin-gate-input"
          @keyup.enter="handlePinGateSubmit"
          autofocus
        />
        <p v-if="pinGateError" class="pin-gate-error">{{ pinGateError }}</p>
        <div class="pin-gate-actions">
          <button
            @click="handlePinGateSubmit"
            :disabled="pinGateLoading"
            class="pin-gate-btn-ok"
          >
            {{ pinGateLoading ? '🔄...' : '🔓 Acceder' }}
          </button>
          <button @click="cancelPinGate" class="pin-gate-btn-cancel">
            Cancelar
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile mandatory PIN lock screen -->
    <div v-if="showMobilePinLock" class="mobile-pin-lock">
      <div class="mobile-pin-lock-content">
        <img
          src="/logo/SpartanHub-logo.png"
          alt="SpartanHub"
          width="120"
          class="mobile-pin-lock-logo"
        />
        <h2 class="mobile-pin-lock-title">Desbloquear</h2>
        <p class="mobile-pin-lock-hint">Ingresa tu PIN de 4 dígitos</p>
        <input
          v-model="mobileLockPin"
          type="tel"
          inputmode="numeric"
          maxlength="4"
          placeholder="● ● ● ●"
          class="mobile-pin-lock-input"
          @keyup.enter="handleMobilePinLockSubmit"
          autofocus
        />
        <p v-if="mobileLockError" class="pin-gate-error">
          {{ mobileLockError }}
        </p>
        <button
          @click="handleMobilePinLockSubmit"
          :disabled="mobileLockLoading"
          class="mobile-pin-lock-btn"
        >
          {{ mobileLockLoading ? '🔄...' : '🔓 Desbloquear' }}
        </button>
        <!-- Biometric retry button -->
        <button
          v-if="biometryAvailable && hasSavedPin"
          @click="handleBiometricRetry"
          :disabled="mobileLockLoading"
          class="mobile-pin-lock-btn biometric-btn"
        >
          <i class="fas fa-fingerprint fa-3x"></i>
        </button>
      </div>
    </div>

    <!-- Editor solo en desktop -->
    <ButtonEditor
      :show="showEditor"
      :button="editingButton"
      :position="editingPosition"
      @save="handleSaveButton"
      @delete="handleDeleteButton"
      @close="showEditor = false"
    />

    <!-- Diálogo de comandos multimedia -->
    <Transition name="mm">
    <div
      v-if="showPresetsDialog"
      class="presets-dialog-overlay"
      @click="showPresetsDialog = false"
    >
      <div class="presets-dialog" @click.stop>
        <div class="presets-header">
          <h2>Comandos Multimedia</h2>
          <button @click="showPresetsDialog = false" class="header-close" aria-label="Cerrar">
            <i class="pi pi-times"></i>
          </button>
        </div>
        <div class="presets-content">
          <p class="presets-description">
            Haz clic en un comando para agregarlo a Spartan Hub
          </p>
          <div class="presets-grid">
            <div
              v-for="preset in multimediaPresets"
              :key="preset.id"
              class="preset-card"
              @click="addPresetButton(preset)"
            >
              <div class="preset-icon">{{ preset.icon }}</div>
              <div class="preset-info">
                <div class="preset-label">{{ preset.label }}</div>
                <div class="preset-description">{{ preset.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Transition>

    <footer class="footer">
      <p class="credits">
        Hecho por
        <a
          href="https://mhenriquezdev.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manuel Henriquez
        </a>
      </p>
      <p class="copyright">© 2026 - Todos los derechos reservados</p>
    </footer>

    <TailwindConfirmDialog
      :show="showClearAllDialog"
      title="Confirmar eliminación"
      message="¿Estás seguro de que quieres eliminar todos los botones?"
      @confirm="handleClearAllConfirm"
      @cancel="handleClearAllCancel"
      @close="handleClearAllCancel"
    />

    <TailwindConfirmDialog
      :show="showServerUnreachableDialog"
      title="Servidor no encontrado"
      message="No se pudo conectar con el servidor. ¿Deseas reintentar o limpiar la configuración para empezar de nuevo?"
      confirmLabel="Limpiar"
      cancelLabel="Reintentar"
      confirmClass="bg-red-500 hover:bg-red-600"
      @confirm="handleServerUnreachableClean"
      @cancel="handleServerUnreachableRetry"
      @close="handleServerUnreachableRetry"
    />

    <TailwindConfirmDialog
      :show="showBiometricOptIn"
      title="Desbloqueo biométrico"
      message="¿Deseas usar tu huella para desbloquear la app la próxima vez?"
      confirmLabel="Activar"
      cancelLabel="No, gracias"
      confirmClass="bg-blue-500 hover:bg-blue-600"
      @confirm="handleBiometricOptInAccept"
      @cancel="handleBiometricOptInDecline"
      @close="handleBiometricOptInDecline"
    />

    <!-- Mouse Controller (full-screen overlay) -->
    <Transition name="mc-slide">
      <MouseController
        v-if="showMouseController"
        @close="showMouseController = false"
      />
    </Transition>
  </div>
</template>

<style scoped>
.stream-deck-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

@media (max-width: 640px) {
  .stream-deck-container {
    padding: 12px;
  }
}

/* Evita que el estado active/hover se quede pegado en móviles */
@media (hover: none) {
  .grid-item:active,
  .action-btn:active {
    background: inherit;
    transform: none;
  }
}

.header {
  display: flex; flex-direction: column; align-items: center;
  margin-bottom: 24px; padding-bottom: 20px;
  border-bottom: 1px solid var(--glass-border);
  position: relative;
}
.header::after {
  content: ''; position: absolute; bottom: -1px; left: 10%; width: 80%; height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 50%, transparent), transparent);
}

.header h1 {
  margin: 0; font-size: 2rem; font-weight: 700;
  background: linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}

@media (max-width: 850px) {
  .actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
  }

  .actions .action-btn {
    flex-direction: column;
    padding: 10px 6px;
    height: auto;
    min-height: 56px;
    font-size: 0.7rem;
  }
  .actions .action-btn .btn-text {
    overflow: hidden; text-overflow: ellipsis;
    max-width: 100%; text-align: center;
  }
  .actions .btn-svg { width: 24px; height: 24px; }
  .actions .action-emoji { font-size: 1.3rem; }
}

@media (max-width: 640px) {
  .header { gap: 14px; margin-bottom: 18px; padding-bottom: 14px; }
  .header h1 { font-size: 1.5rem !important; }
}

.connection-status {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 14px; border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(8px);
  font-size: 0.82rem; color: var(--text-2);
  width: max-content;
}
.connection-status.connected { color: #4ade80; border-color: rgba(74, 222, 128, 0.2); }
.connection-status.disconnected { color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
.connection-status.connecting { color: #fbbf24; border-color: rgba(251, 191, 36, 0.2); }

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.connection-status.connected .status-dot {
  background: #4ade80;
}

.connection-status.disconnected .status-dot {
  background: #ef4444;
  animation: none;
}

.connection-status.connecting .status-dot {
  background: #fbbf24;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.actions {
  display: flex;
  gap: 12px;
}

/* ── Action buttons (glass) ── */
.action-btn {
  --_clr: var(--text-2);
  display: flex; align-items: center; gap: 8px;
  min-width: 44px; height: 44px; padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--_clr) 25%, transparent);
  border-radius: 12px; cursor: pointer;
  background: color-mix(in srgb, var(--_clr) 8%, rgba(255,255,255,0.04));
  backdrop-filter: blur(12px);
  color: var(--text-1); font-size: 0.9rem; font-weight: 500;
  box-shadow: 0 0 12px color-mix(in srgb, var(--_clr) 15%, transparent),
              inset 0 1px 0 rgba(255,255,255,0.06);
  transition: all 0.2s ease;
}
@media (hover: hover) {
  .action-btn:hover {
    background: color-mix(in srgb, var(--_clr) 18%, rgba(255,255,255,0.06));
    border-color: color-mix(in srgb, var(--_clr) 50%, transparent);
    box-shadow: 0 0 20px color-mix(in srgb, var(--_clr) 30%, transparent),
                inset 0 1px 0 rgba(255,255,255,0.08);
    transform: translateY(-2px);
  }
}
.action-btn:active { transform: scale(0.97); }

[data-theme='light'] .action-btn {
  color: #1a1a2e;
  background: color-mix(in srgb, var(--_clr) 10%, rgba(0,0,0,0.04));
  border-color: color-mix(in srgb, var(--_clr) 30%, rgba(0,0,0,0.1));
  box-shadow: 0 0 10px color-mix(in srgb, var(--_clr) 12%, transparent),
              inset 0 1px 0 rgba(255,255,255,0.5);
}
@media (hover: hover) {
  [data-theme='light'] .action-btn:hover {
    background: color-mix(in srgb, var(--_clr) 18%, rgba(0,0,0,0.06));
    border-color: color-mix(in srgb, var(--_clr) 50%, rgba(0,0,0,0.12));
  }
}

.action-settings { --_clr: #10b981; }
.action-accent   { --_clr: var(--accent); }
.action-amber    { --_clr: #f59e0b; }
.action-cyan     { --_clr: #06b6d4; }
.action-neutral  { --_clr: rgba(255,255,255,0.5); }
[data-theme='light'] .action-neutral { --_clr: rgba(0,0,0,0.45); }
.action-danger   { --_clr: #ef4444; }

.action-emoji { font-size: 1.2rem; line-height: 1; }

.btn-svg {
  width: 22px; height: 22px; flex-shrink: 0;
  transition: all 0.2s;
  filter: invert(1);
}
[data-theme='light'] .btn-svg {
  filter: invert(0);
}
.btn-text { white-space: nowrap; }

/* ── Volume overlay (floating, no layout shift) ── */
.volume-overlay {
  position: fixed; inset: 0; z-index: 1500;
  display: flex; align-items: flex-end; justify-content: center;
  padding: 0 16px 120px;
}

.volume-panel {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 22px; width: 100%; max-width: 420px;
  border-radius: 18px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.92) 0%, rgba(10, 10, 16, 0.95) 100%);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 20px 50px rgba(0, 0, 0, 0.6),
    0 0 40px -8px color-mix(in srgb, var(--accent) 25%, transparent);
}

.volume-mute-btn {
  flex-shrink: 0; width: 44px; height: 44px; border-radius: 12px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer; display: grid; place-items: center;
  transition: all 0.18s;
}
@media (hover: hover) {
  .volume-mute-btn:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: scale(1.08);
  }
}
.volume-mute-btn:active { transform: scale(0.92); }

.volume-icon {
  width: 22px; height: 22px;
  filter: invert(1) drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
}
[data-theme='light'] .volume-icon {
  filter: invert(0) drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
}

.volume-slider {
  -webkit-appearance: none; appearance: none;
  flex: 1; height: 6px; border-radius: 3px;
  outline: none; cursor: pointer;
  background: linear-gradient(
    to right,
    var(--accent) 0%, var(--accent) var(--vol-pct, 50%),
    rgba(255, 255, 255, 0.12) var(--vol-pct, 50%),
    rgba(255, 255, 255, 0.12) 100%
  );
  transition: background 0.1s ease;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--accent);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 50%, transparent);
  cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
}
@media (hover: hover) {
  .volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 70%, transparent);
  }
}

.volume-slider::-moz-range-thumb {
  width: 20px; height: 20px; border-radius: 50%;
  background: var(--accent);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 50%, transparent);
  cursor: pointer;
}
.volume-slider::-moz-range-track {
  height: 6px; border-radius: 3px; background: transparent;
}

.volume-label {
  flex-shrink: 0; min-width: 44px; text-align: right;
  font-size: 0.95rem; font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-1);
  text-shadow: 0 0 8px color-mix(in srgb, var(--accent) 40%, transparent);
}

/* Volume transitions */
.vol-enter-active { transition: opacity 0.25s ease; }
.vol-leave-active { transition: opacity 0.2s ease; }
.vol-enter-from, .vol-leave-to { opacity: 0; }
.vol-enter-active .volume-panel { transition: transform 0.35s cubic-bezier(0.22, 1.2, 0.36, 1); }
.vol-leave-active .volume-panel { transition: transform 0.2s cubic-bezier(0.4, 0, 1, 1); }
.vol-enter-from .volume-panel { transform: translateY(30px) scale(0.9); }
.vol-leave-to .volume-panel { transform: translateY(20px) scale(0.95); }

/* Show desktop panel on wide screens, mobile pill on narrow */
.volume-mobile { display: none; }
@media (max-width: 640px) {
  .volume-desktop { display: none !important; }
  .volume-mobile { display: flex; }
  .volume-overlay {
    align-items: center; justify-content: flex-end;
    padding: 0 20px 0 0;
  }
  .volume-mobile {
    flex-direction: column; align-items: center;
    width: 52px; height: min(280px, 50dvh);
    border-radius: 26px; padding: 14px 0;
    position: relative; overflow: hidden;
    background: rgba(30, 30, 40, 0.7);
    border: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
    backdrop-filter: blur(var(--glass-blur)) saturate(160%);
    box-shadow:
      0 0 0 1px rgba(255, 255, 255, 0.04),
      0 20px 50px rgba(0, 0, 0, 0.6),
      0 0 30px -6px color-mix(in srgb, var(--accent) 30%, transparent);
    touch-action: none;
  }
  .volume-pill-fill {
    position: absolute; bottom: 0; left: 0; right: 0;
    height: var(--vol-pct, 50%);
    background: linear-gradient(
      to top,
      color-mix(in srgb, var(--accent) 70%, transparent),
      color-mix(in srgb, var(--accent) 35%, transparent)
    );
    border-radius: 26px;
    transition: height 0.08s ease-out;
  }
  .volume-pill-icon {
    position: relative; z-index: 2;
    width: 24px; height: 24px;
    margin-top: auto;
    filter: invert(1) drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
    cursor: pointer;
  }
  [data-theme='light'] .volume-pill-icon {
    filter: invert(0) drop-shadow(0 0 6px color-mix(in srgb, var(--accent) 60%, transparent));
  }
}

.hint {
  color: var(--text-2); font-size: 0.85rem;
  margin: 0 0 16px 0; text-align: center;
}
@media (max-width: 640px) {
  .hint { font-size: 0.72rem; margin-bottom: 10px; }
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: 20px;
  flex: 1;
  margin-bottom: 24px;
  padding: 30px;
  border-radius: 16px;
  /* background eliminado para que el fondo dependa solo del tema */
  box-shadow:
    0 2px 8px rgba(120, 120, 130, 0.1),
    0 8px 24px rgba(120, 120, 130, 0.13);
  /* border eliminado para que el borde dependa solo del tema */
  position: relative;
  touch-action: pan-y;
  user-select: none;
  grid-auto-rows: 1fr;
  perspective: 1000px;
  perspective-origin: center;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
    padding: 16px;
  }

  .actions {
    gap: 8px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .grid {
    gap: 10px;
    padding: 20px;
  }
}

.grid::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  padding: 2px;
  background: linear-gradient(
    135deg,
    var(--grid-gradient-start, rgba(255, 255, 255, 0.1)) 0%,
    var(--grid-gradient-mid, rgba(255, 255, 255, 0.02)) 50%,
    var(--grid-gradient-end, rgba(0, 0, 0, 0.1)) 100%
  );
}

.grid-item {
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.15s ease,
    filter 0.15s ease;
  touch-action: manipulation;
  will-change: transform, opacity;
  pointer-events: auto;
}

.grid-item.executing {
  animation: execute-flash 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes execute-flash {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(0.96);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

/* Touch drag & drop */
.grid-item.touch-dragging {
  z-index: 100;
  opacity: 0.9;
  transform: scale(1.15) translateY(-5px);
  filter: brightness(1.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}

.grid-item.touch-drag-over {
  transform: scale(0.95);
  outline: 2px solid #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
}

.grid-item.is-pressing {
  animation: pulse-wait 1s ease-in-out infinite;
  animation-fill-mode: backwards;
  filter: contrast(1.2) brightness(1.2);
}

@keyframes pulse-wait {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.95);
  }
  100% {
    transform: scale(1);
  }
}

.footer {
  margin-top: 32px; padding-top: 20px;
  border-top: 1px solid var(--glass-border);
  text-align: center; position: relative;
}
.footer::before {
  content: ''; position: absolute; top: -1px; left: 10%; width: 80%; height: 1px;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 40%, transparent), transparent);
}

.credits {
  color: var(--text-2); font-size: 0.85rem; margin: 0 0 6px 0;
}
.credits a {
  color: var(--accent); text-decoration: none; font-weight: 600;
  transition: all 0.2s; border-bottom: 1px solid transparent;
}
@media (hover: hover) {
  .credits a:hover {
    border-bottom-color: color-mix(in srgb, var(--accent) 60%, transparent);
    text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 40%, transparent);
  }
}

.copyright {
  color: var(--text-2); font-size: 0.78rem; margin: 0; opacity: 0.5;
}

[data-theme='light'] .footer { border-top-color: rgba(0,0,0,0.1); }
[data-theme='light'] .footer::before {
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 30%, transparent), transparent);
}
[data-theme='light'] .credits { color: #444; }
[data-theme='light'] .credits a { color: var(--accent); }
[data-theme='light'] .copyright { color: #666; }

.title-section {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding-bottom: 10px;
}

@media (max-width: 768px) {
  .header { gap: 16px; }
  .title-section { gap: 12px; text-align: center; }

  .grid {
    gap: 12px;
  }
}

.presets-dialog-overlay {
  position: fixed; inset: 0; background: var(--scrim); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px;
}

.presets-dialog {
  width: 100%; max-width: 600px; max-height: 85dvh; display: flex; flex-direction: column;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.94) 0%, rgba(10, 10, 16, 0.97) 100%);
  border: 1px solid var(--glass-border); backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04), 0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px -10px color-mix(in srgb, var(--accent) 30%, transparent);
  overflow: hidden;
}

.presets-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; border-bottom: 1px solid var(--glass-border);
}
.presets-header h2 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-1); }

.presets-content {
  padding: 16px 22px; overflow-y: auto; flex: 1;
}

.presets-description { color: var(--text-2); margin-bottom: 16px; font-size: 0.9rem; }

.presets-grid { display: grid; gap: 6px; }

.preset-card {
  display: flex; align-items: center; gap: 14px; padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px; cursor: pointer; transition: all 0.15s;
}
@media (hover: hover) {
  .preset-card:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(3px);
  }
}

.preset-icon {
  font-size: 1.6rem; width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  border-radius: 12px; flex-shrink: 0;
}

.preset-info { flex: 1; }
.preset-label { font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; color: var(--text-1); }
.preset-description { font-size: 0.82rem; color: var(--text-2); margin-bottom: 0; }

/* Multimedia dialog transitions */
.mm-enter-active { transition: opacity 0.35s ease; }
.mm-leave-active { transition: opacity 0.25s ease; }
.mm-enter-from, .mm-leave-to { opacity: 0; }
.mm-enter-active .presets-dialog { transition: transform 0.45s cubic-bezier(0.22, 1.2, 0.36, 1); }
.mm-leave-active .presets-dialog { transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1); }
.mm-enter-from .presets-dialog { transform: translateY(80px) scale(0.85); }
.mm-leave-to .presets-dialog { transform: translateY(40px) scale(0.92); }
@media (max-width: 640px) {
  .presets-dialog-overlay { align-items: flex-end; padding: 0; }
  .presets-dialog { max-width: 100%; border-radius: 24px 24px 0 0; max-height: 92dvh; }
  .mm-enter-from .presets-dialog { transform: translateY(100%); }
  .mm-leave-to .presets-dialog { transform: translateY(100%); }
}

/* ⭐ Forzar limpieza de estado touch en grid */
.grid-item {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* Prevenir estados pegados en mobile */
@media (max-width: 850px) {
  .grid-item * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}

.btn-reconnect,
.btn-reload,
.btn-clear {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--glass-border);
  color: var(--text-1);
}

@media (hover: hover) {
  .btn-reconnect:hover,
  .btn-reload:hover,
  .btn-clear:hover {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    color: var(--text-1);
  }
}

.grid-reloading {
  animation: gridReload 0.6s ease;
}

@keyframes gridReload {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  30% {
    opacity: 0;
    transform: scale(0.95);
  }
  60% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

::-webkit-scrollbar {
  width: 0px;
}

/* PIN Gate Dialog */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

.pin-gate-dialog {
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #444);
  border-radius: 16px;
  padding: 2rem;
  min-width: 300px;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: pinGateIn 0.2s ease-out;
}

@keyframes pinGateIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.pin-gate-title {
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  color: var(--text-primary, #fff);
}

.pin-gate-hint {
  font-size: 0.85rem;
  color: var(--text-secondary, #aaa);
  margin: 0 0 1.2rem;
}

.pin-gate-input {
  width: 140px;
  padding: 0.7rem 1rem;
  font-size: 1.6rem;
  text-align: center;
  letter-spacing: 0.5em;
  border: 2px solid var(--border-color, #555);
  border-radius: 10px;
  background: var(--bg-primary, #11111b);
  color: var(--text-primary, #fff);
  outline: none;
  transition: border-color 0.2s;
}

.pin-gate-input:focus {
  border-color: var(--accent-color, #89b4fa);
}

.pin-gate-error {
  color: #f38ba8;
  font-size: 0.85rem;
  margin: 0.6rem 0 0;
}

.pin-gate-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-top: 1.2rem;
}

.pin-gate-btn-ok {
  padding: 0.6rem 1.5rem;
  border: none;
  border-radius: 10px;
  background: var(--accent-color, #89b4fa);
  color: var(--bg-primary, #11111b);
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: opacity 0.2s;
}

@media (hover: hover) {
  .pin-gate-btn-ok:hover {
    opacity: 0.85;
  }
}

.pin-gate-btn-ok:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pin-gate-btn-cancel {
  padding: 0.6rem 1.5rem;
  border: 1px solid var(--border-color, #555);
  border-radius: 10px;
  background: transparent;
  color: var(--text-secondary, #aaa);
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.2s;
}

@media (hover: hover) {
  .pin-gate-btn-cancel:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

/* No PIN configured message */
.no-pin-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
  flex: 1;
  gap: 0.75rem;
}

.no-pin-icon {
  font-size: 4rem;
  margin-bottom: 0.5rem;
}

.no-pin-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #fff);
  margin: 0;
}

.no-pin-desc {
  font-size: 0.95rem;
  color: var(--text-secondary, #aaa);
  max-width: 400px;
  line-height: 1.5;
  margin: 0;
}

.no-pin-btn {
  margin-top: 1rem;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 12px;
  background: var(--accent-color, #89b4fa);
  color: var(--bg-primary, #11111b);
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition:
    opacity 0.2s,
    transform 0.15s;
}

@media (hover: hover) {
  .no-pin-btn:hover {
    opacity: 0.85;
    transform: scale(1.03);
  }
}

/* Mobile mandatory PIN lock screen */
.mobile-pin-lock {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  height: 100dvh;
  background: var(--bg-primary, #11111b);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.mobile-pin-lock-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
  width: 100%;
  max-width: 320px;
}

.mobile-pin-lock-logo {
  margin-bottom: 0.5rem;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.mobile-pin-lock-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-primary, #fff);
  margin: 0;
}

.mobile-pin-lock-hint {
  font-size: 0.9rem;
  color: var(--text-secondary, #aaa);
  margin: 0;
}

.mobile-pin-lock-input {
  width: 180px;
  padding: 0.9rem 1rem;
  font-size: 2rem;
  text-align: center;
  letter-spacing: 0.6em;
  border: 2px solid var(--border-color, #555);
  border-radius: 14px;
  background: var(--bg-secondary, #1e1e2e);
  color: var(--text-primary, #fff);
  outline: none;
  transition: border-color 0.2s;
  margin-top: 0.5rem;
}

.mobile-pin-lock-input:focus {
  border-color: var(--accent-color, #89b4fa);
}

.mobile-pin-lock-btn {
  width: 180px;
  padding: 0.8rem 1.5rem;
  border: none;
  border-radius: 14px;
  background: var(--accent-color, #89b4fa);
  color: var(--bg-primary, #11111b);
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  transition: opacity 0.2s;
  margin-top: 0.5rem;
}

@media (hover: hover) {
  .mobile-pin-lock-btn:hover {
    opacity: 0.85;
  }
}

.mobile-pin-lock-btn:disabled {
  opacity: 0.5;
}

.mobile-pin-lock-btn.biometric-btn {
  background: transparent;
  border: 2px solid var(--accent-color, #89b4fa);
  color: var(--accent-color, #89b4fa);
  font-size: 0.95rem;
  margin-top: 0.3rem;
}

/* Floating theme toggle button */
/* ── FAB container ── */
.fab-container {
  position: fixed; z-index: 900;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  transition:
    top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    bottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.theme-fab {
  width: 48px; height: 48px; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  touch-action: none; -webkit-user-select: none; user-select: none;
}
[data-theme='light'] .theme-fab {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.theme-fab:active { transform: scale(0.9); }
@media (hover: hover) { .theme-fab:hover { transform: scale(1.1); } }
.theme-fab-icon { width: 22px; height: 22px; }

/* Small accent dot toggle */
.accent-toggle {
  width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: rgba(30, 30, 50, 0.85); backdrop-filter: blur(8px);
  display: grid; place-items: center; cursor: pointer;
  transition: transform 0.2s;
}
[data-theme='light'] .accent-toggle {
  background: rgba(255, 255, 255, 0.85); border-color: rgba(0, 0, 0, 0.12);
}
.accent-toggle:active { transform: scale(0.85); }
@media (max-width: 640px) { .accent-toggle { display: none; } }
.accent-dot { width: 14px; height: 14px; border-radius: 50%; }

/* Accent picker popover */
.accent-picker {
  display: flex; gap: 6px; padding: 8px 12px;
  border-radius: 24px; flex-direction: row;
  background: rgba(20, 20, 30, 0.92); border: 1px solid var(--glass-border);
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}
[data-theme='light'] .accent-picker {
  background: rgba(255, 255, 255, 0.92); border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}
.accent-swatch {
  width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent;
  background: var(--sw); cursor: pointer;
  transition: all 0.15s; box-shadow: 0 0 6px color-mix(in srgb, var(--sw) 40%, transparent);
}
.accent-swatch.active {
  border-color: #fff; transform: scale(1.15);
  box-shadow: 0 0 14px color-mix(in srgb, var(--sw) 60%, transparent);
}
@media (hover: hover) { .accent-swatch:hover { transform: scale(1.15); } }
@media (max-width: 640px) { .accent-picker { flex-direction: column; } }

.accent-pop-enter-active, .accent-pop-leave-active { transition: all 0.2s ease; }
.accent-pop-enter-from, .accent-pop-leave-to { opacity: 0; transform: scale(0.8); }

/* ── MouseController slide transition ── */
.mc-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.mc-slide-leave-active {
  transition: transform 0.25s ease-in;
}
.mc-slide-enter-from { transform: translateX(100%); }
.mc-slide-leave-to { transform: translateX(100%); }
</style>
