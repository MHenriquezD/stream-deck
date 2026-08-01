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
const { isDark, toggleTheme, initTheme } = useTheme()
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
} = useVolume()

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
  // No abrir editor en mobile/tablet
  if (isMobileView.value) return

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
          <img src="/icons/config.svg" alt="Configuración" class="btn-svg" />
          <span class="btn-text">Configuración</span>
        </button>

        <template v-if="pinConfigured || isMobile">
          <button @click="loadMultimediaPresets" title="Comandos multimedia" class="action-btn action-accent">
            <img src="/icons/note-music.svg" alt="Multimedia" class="btn-svg" />
            <span class="btn-text">Multimedia</span>
          </button>
          <button @click="toggleVolumeSlider" title="Control de volumen" class="action-btn action-amber">
            <span class="action-emoji">{{ systemMuted ? '🔇' : '🔊' }}</span>
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
            <img src="/icons/reconect.svg" alt="Reconectar" class="btn-svg" />
            <span class="btn-text">{{ isMobile ? 'Reconectar' : serverEnabled ? 'Desactivar' : 'Activar' }}</span>
          </button>
          <button @click="reloadButtonsWithAnimation" title="Recargar" class="action-btn action-neutral">
            <img src="/icons/reload.svg" alt="Recargar" class="btn-svg" />
            <span class="btn-text">Recargar Botones</span>
          </button>
          <button v-if="!isMobile" @click="openClearAllDialog" title="Limpiar todo" class="action-btn action-danger">
            <img src="/icons/delete-grid.svg" alt="Eliminar" class="btn-svg" />
            <span class="btn-text">Limpiar Botones</span>
          </button>
        </template>
      </div>

      <!-- Volume slider panel -->
      <div v-if="showVolumeSlider" class="volume-panel">
        <div class="volume-panel-inner">
          <button
            class="volume-mute-btn"
            @click="onMuteToggle"
            :title="systemMuted ? 'Activar sonido' : 'Silenciar'"
          >
            {{
              systemMuted
                ? '🔇'
                : systemVolume > 50
                  ? '🔊'
                  : systemVolume > 0
                    ? '🔉'
                    : '🔈'
            }}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            :value="systemVolume"
            @input="onVolumeInput"
            class="volume-slider"
            :style="{ '--vol-pct': systemVolume + '%' }"
          />
          <span class="volume-label">{{ systemVolume }}%</span>
        </div>
      </div>
    </div>

    <!-- Floating theme toggle (draggable, snaps to corners) -->
    <button
      ref="themeFabRef"
      @click="!fabMoved && toggleTheme()"
      :title="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      class="theme-fab"
      :class="`fab-${fabCorner}`"
      :style="fabStyle"
      @touchstart.passive="handleFabTouchStart"
      @touchmove="handleFabTouchMove"
      @touchend="handleFabTouchEnd"
    >
      <img
        v-if="isDark"
        src="/icons/sun.svg"
        alt="Claro"
        class="theme-fab-icon"
      />
      <img v-else src="/icons/moon.svg" alt="Oscuro" class="theme-fab-icon" />
    </button>

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
        Toca para ejecutar • Mantén presionado 1s para reorganizar
      </p>

      <div
        class="grid"
        :class="{ 'grid-reloading': isReloadingGrid }"
        :style="{
          '--grid-cols': gridCols,
          '--grid-rows': gridRows,
        }"
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
      v-if="!isMobileView"
      :show="showEditor"
      :button="editingButton"
      :position="editingPosition"
      @save="handleSaveButton"
      @delete="handleDeleteButton"
      @close="showEditor = false"
    />

    <!-- Diálogo de comandos multimedia -->
    <div
      v-if="showPresetsDialog"
      class="presets-dialog-overlay"
      @click="showPresetsDialog = false"
    >
      <div class="presets-dialog" @click.stop>
        <div class="presets-header">
          <h2>Comandos Multimedia</h2>
          <button @click="showPresetsDialog = false" class="close-btn">
            ✕
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
    <MouseController
      v-if="showMouseController"
      @close="showMouseController = false"
    />
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
  .btn-icon:active {
    background: inherit;
    transform: none;
  }
}

.header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

@media (max-width: 850px) {
  .actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
  }

  .actions .btn-icon {
    flex-direction: column;
    padding: 12px 8px;
    height: auto;
    min-height: 60px;
    font-size: 0.75rem;
  }

  .actions .btn-svg {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 640px) {
  .header {
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .header h1 {
    font-size: 1.5rem !important;
  }
}

.connection-status {
  background-color: var(--connect-bg-color);
  color: var(--connect-color);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: var(--connect-bg-color);
  font-size: 0.85rem;
  text-align: center;
  width: max-content;
}

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

.action-settings { --_clr: #10b981; }
.action-accent   { --_clr: var(--accent); }
.action-amber    { --_clr: #f59e0b; }
.action-cyan     { --_clr: #06b6d4; }
.action-neutral  { --_clr: rgba(255,255,255,0.5); }
.action-danger   { --_clr: #ef4444; }

.action-emoji { font-size: 1.2rem; line-height: 1; }

.btn-svg {
  width: 22px; height: 22px; flex-shrink: 0;
  transition: all 0.2s;
}
.btn-text { white-space: nowrap; }

/* ── Volume panel ── */
.volume-panel {
  width: 100%;
  padding: 0 8px;
  margin-bottom: 12px;
  animation: volume-slide-in 0.25s ease-out;
}

@keyframes volume-slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.volume-panel-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

[data-theme='light'] .volume-panel-inner {
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.volume-mute-btn {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  font-size: 1.3rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    background 0.2s ease,
    transform 0.15s ease;
}

[data-theme='light'] .volume-mute-btn {
  background: rgba(0, 0, 0, 0.06);
}

@media (hover: hover) {
  .volume-mute-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.08);
  }

  [data-theme='light'] .volume-mute-btn:hover {
    background: rgba(0, 0, 0, 0.1);
  }
}

.volume-mute-btn:active {
  transform: scale(0.92);
}

/* Range slider */
.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  flex: 1;
  height: 8px;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  background: linear-gradient(
    to right,
    #f59e0b 0%,
    #f59e0b var(--vol-pct, 50%),
    rgba(255, 255, 255, 0.15) var(--vol-pct, 50%),
    rgba(255, 255, 255, 0.15) 100%
  );
  transition: background 0.1s ease;
}

[data-theme='light'] .volume-slider {
  background: linear-gradient(
    to right,
    #d97706 0%,
    #d97706 var(--vol-pct, 50%),
    rgba(0, 0, 0, 0.12) var(--vol-pct, 50%),
    rgba(0, 0, 0, 0.12) 100%
  );
}

/* Webkit thumb */
.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

@media (hover: hover) {
  .volume-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    box-shadow: 0 3px 12px rgba(245, 158, 11, 0.4);
  }
}

/* Firefox thumb */
.volume-slider::-moz-range-thumb {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border: 2px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  cursor: pointer;
}

/* Firefox track */
.volume-slider::-moz-range-track {
  height: 8px;
  border-radius: 4px;
  background: transparent;
}

.volume-label {
  flex-shrink: 0;
  min-width: 48px;
  text-align: right;
  font-size: 0.95rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.85);
}

[data-theme='light'] .volume-label {
  color: rgba(0, 0, 0, 0.7);
}

@media (max-width: 640px) {
  .volume-panel-inner {
    padding: 10px 14px;
    gap: 8px;
  }

  .volume-mute-btn {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .volume-slider::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
  }

  .volume-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }

  .volume-label {
    font-size: 0.85rem;
    min-width: 40px;
  }
}

.hint {
  color: var(--hint-color);
  font-size: 0.9rem;
  margin: 0 0 16px 0;
  text-align: center;
  transition: color 0.3s ease;
}

@media (max-width: 640px) {
  .hint {
    font-size: 0.75rem;
    margin-bottom: 12px;
  }
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
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.credits {
  color: var(--credits-color);
  font-size: 0.9rem;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.credits a {
  color: rgba(139, 92, 246, 0.9);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border-bottom: 1px solid transparent;
}

@media (hover: hover) {
  .credits a:hover {
    color: rgb(139, 92, 246);
    border-bottom-color: rgba(139, 92, 246, 0.5);
  }
}

.copyright {
  color: var(--credits-color);
  font-size: 0.8rem;
  margin: 0;
  opacity: 0.7;
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-bottom: 10px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .title-section {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .grid {
    gap: 12px;
  }
}

.presets-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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

.presets-dialog {
  background: var(--edit-bg-color);
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  max-height: 80dvh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUpDialog 0.3s;
}

@keyframes slideUpDialog {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.presets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.presets-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--edit-text-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--edit-bg-color);
  color: var(--edit-text-color);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

@media (hover: hover) {
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
  }
}

.presets-content {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 100px);
  max-height: calc(80dvh - 100px);
}

.presets-description {
  color: var(--edit-text-color);
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.presets-grid {
  display: grid;
  gap: 12px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--form-bg-color);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

@media (hover: hover) {
  .preset-card:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateX(4px);
  }
}

.preset-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 12px;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
}

.preset-label {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
  color: var(--edit-text-color);
}

.preset-description {
  font-size: 0.85rem;
  color: var(--edit-text-color);
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
  background-color: var(--confirm-bg-light);
  color: var(--confirm-text-light);
}

@media (hover: hover) {
  .btn-reconnect:hover,
  .btn-reload:hover,
  .btn-clear:hover {
    background-color: var(--confirm-bg-light-hover);
    color: var(--confirm-text-light-hover);
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
.theme-fab {
  position: fixed;
  z-index: 900;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    bottom 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    right 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

[data-theme='light'] .theme-fab {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.theme-fab:active {
  transform: scale(0.9);
}

@media (hover: hover) {
  .theme-fab:hover {
    transform: scale(1.1);
  }
}

.theme-fab-icon {
  width: 22px;
  height: 22px;
}
</style>
