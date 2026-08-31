<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { Capacitor } from '@capacitor/core'
import type { StreamButton as ButtonType } from '@shared/core'
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
import SpotifyPlayer from './SpotifyPlayer.vue'
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
const showAccentToggle = ref(false)
let accentHideTimer: ReturnType<typeof setTimeout> | null = null
let longPressTimer: ReturnType<typeof setTimeout> | null = null
const openAccentPicker = () => {
  showAccentPicker.value = true
  if (accentHideTimer) clearTimeout(accentHideTimer)
  accentHideTimer = setTimeout(() => { showAccentPicker.value = false; showAccentToggle.value = false }, 4000)
}
const closeAccentPicker = () => {
  showAccentPicker.value = false
  showAccentToggle.value = false
  if (accentHideTimer) { clearTimeout(accentHideTimer); accentHideTimer = null }
}
const toggleAccentPicker = () => {
  if (showAccentPicker.value) {
    closeAccentPicker()
  } else {
    openAccentPicker()
  }
}
const handleFabLongPressStart = () => {
  longPressTimer = setTimeout(() => {
    showAccentToggle.value = true
    openAccentPicker()
    longPressTimer = null
  }, 500)
}
const handleFabLongPressEnd = () => {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
}
const serverUrlStore = useServerUrlStore()
const {
  isConnected,
  connect: socketConnect,
  disconnect: socketDisconnect,
  execute: socketExecute,
  on: socketOn,
  off: socketOff,
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

defineProps<{
  rows?: number
  cols?: number
}>()

const showEditor = ref(false)
const showSettings = ref(false)
/**
 * Modo edición del grid: fuera de él un toque solo ejecuta; dentro, se
 * reordena arrastrando y se edita tocando. Sin esta separación, los tres
 * gestos convivían sobre el mismo elemento y la ambigüedad causaba bugs
 * imposibles de reproducir a ciegas en móvil.
 */
const isEditMode = ref(false)
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
  currentPage,
  totalPages,
  goToPage,
  setPageDimensions,
  swapButtons,
  moveButtonToPage,
  parseAndSetButtons,
  loadButtons,
  saveButtons,
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


// Theme FAB — posición fija (ya no es arrastrable), solo en desktop/tablet.
const { fabRef: themeFabRef, fabCorner, fabStyle } = useDraggableFab()

// Detectar plataforma nativa (Android/iOS) vs desktop
const platform = Capacitor.getPlatform()
const isMobile = platform === 'android' || platform === 'ios'

// Detectar mobile por tamaño de pantalla (responsive layout)
const isMobileView = ref(false)

/**
 * En celulares en vertical (más alto que ancho) usamos páginas de 6
 * botones (2x3) en vez de 12 (4x3) — así entra una página completa sin
 * scroll. Landscape/tablet/desktop se quedan con el tamaño normal.
 */
const updatePageDimensions = () => {
  const isTallMobile = window.innerWidth <= 640 && window.innerHeight > window.innerWidth
  if (isTallMobile) setPageDimensions(2, 3)
  else setPageDimensions(4, 3)
}

// Drag & drop (ratón + táctil), delegando el intercambio en useButtons
const {
  touchDragButton,
  isPressing,
  handleMouseDown,
  isDragging,
  isDragOver,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleTouchCancel,
  isTouchDragging,
  isTouchDragOver,
  isTouchOverPage,
  ignoreClickUntil,
  touchDragOffset,
} = useDragAndDrop({
  swapButtons,
  moveButtonToPage,
  isEditMode,
  onMouseDrop: () => {
    toast.removeAllGroups()
    toast.add({
      severity: 'success',
      summary: 'Botón movido',
      detail: 'El botón se ha reubicado correctamente',
      life: 2000,
    })
  },
  onLongPressEdit: (button, position) => {
    handleButtonEdit(button, position)
  },
})

// ── Paginación: swipe horizontal / drag con mouse entre páginas ──
const pageSwipeStartX = ref<number | null>(null)
const pageSwipeStartY = ref<number | null>(null)
const pageSwipeDeltaX = ref(0)
const SWIPE_THRESHOLD = 60

/** 1 = avanzando a una página siguiente, -1 = retrocediendo. Determina de
 * qué lado entran/salen los botones en la animación de cambio de página. */
const pageDirection = ref(1)
watch(currentPage, (newPage, oldPage) => {
  pageDirection.value = newPage >= oldPage ? 1 : -1
})

const handlePageSwipeTouchStart = (e: TouchEvent) => {
  if (e.touches.length !== 1) return
  pageSwipeStartX.value = e.touches[0].clientX
  pageSwipeStartY.value = e.touches[0].clientY
  pageSwipeDeltaX.value = 0
}

const handlePageSwipeTouchMove = (e: TouchEvent) => {
  if (pageSwipeStartX.value === null || e.touches.length !== 1) return
  // Si ya se activó el drag-reorder de un botón, no interferir.
  if (touchDragButton.value) return
  pageSwipeDeltaX.value = e.touches[0].clientX - pageSwipeStartX.value
}

const resolvePageSwipe = () => {
  const dx = pageSwipeDeltaX.value
  pageSwipeStartX.value = null
  pageSwipeStartY.value = null
  pageSwipeDeltaX.value = 0
  if (touchDragButton.value) return
  if (dx > SWIPE_THRESHOLD) goToPage(currentPage.value - 1)
  else if (dx < -SWIPE_THRESHOLD) goToPage(currentPage.value + 1)
}

// ── Paginación: arrastre con mouse (desktop) sobre el fondo del grid ──
const isMouseSwiping = ref(false)
let mouseSwipeStartX = 0

const handleGridMouseDown = (e: MouseEvent) => {
  // Solo si el click empieza en el fondo del grid, no sobre un botón.
  if ((e.target as HTMLElement).closest('.grid-item')) return
  isMouseSwiping.value = true
  mouseSwipeStartX = e.clientX
  pageSwipeDeltaX.value = 0
}

const handleGridMouseMove = (e: MouseEvent) => {
  if (!isMouseSwiping.value) return
  pageSwipeDeltaX.value = e.clientX - mouseSwipeStartX
}

const handleGridMouseUp = () => {
  if (!isMouseSwiping.value) return
  isMouseSwiping.value = false
  const dx = pageSwipeDeltaX.value
  pageSwipeDeltaX.value = 0
  if (dx > SWIPE_THRESHOLD) goToPage(currentPage.value - 1)
  else if (dx < -SWIPE_THRESHOLD) goToPage(currentPage.value + 1)
}

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
  updatePageDimensions()

  const handleResize = () => {
    isMobileView.value = window.innerWidth <= 850
    // El modo edición solo existe en táctil; si se pasa a desktop hay que
    // salir de él o el botón para desactivarlo desaparece con el modo activo.
    if (!isMobileView.value) isEditMode.value = false
    updatePageDimensions()
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
  // Si el socket ya estaba conectado de antes, socketConnect() no dispara un
  // nuevo evento 'connect' y el watch(isConnected) de abajo nunca se
  // ejecuta — sincronizamos el estado a mano para no quedar pegados en
  // "Conectando...".
  if (isConnected.value) connectionStatus.value = 'connected'

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

  // Con la pantalla de PIN arriba todavía no hay token válido: pedir aquí
  // los endpoints protegidos solo llenaba la consola de 401. Se espera al
  // desbloqueo (ver el watch de showMobilePinLock más abajo).
  if (!showMobilePinLock.value) await loadInitialData()

  // Check PIN status for settings gate (desktop uses this)
  await checkPinStatus()
})

/** Trae settings + botones. Requiere estar ya autenticado si hay PIN. */
const loadInitialData = async () => {
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
}

// Al desbloquear (PIN o biometría) ya hay token: recién ahí se cargan los
// datos que quedaron pendientes durante el arranque.
watch(showMobilePinLock, (locked, wasLocked) => {
  if (wasLocked && !locked) void loadInitialData()
})

onUnmounted(() => {
  socketOff('commands:updated')
  socketOff('server:enabledChanged')
  socketOff('settings:buttonSoundChanged')
  socketOff('connect_error')
})


/**
 * Botón Reconectar/Activar-Desactivar: si no hay conexión real (móvil, o
 * desktop con el socket caído) simplemente reconecta el socket — el toggle
 * de encendido/apagado del servidor requiere que el socket ya esté vivo
 * para poder enviarle el mensaje, así que no tiene sentido si está
 * desconectado.
 */
const handleReconnectButton = () => {
  // OJO: se compara isConnected.value (estado real del socket), no
  // connectionStatus — este último también es 'disconnected' cuando el
  // servidor está desactivado (serverEnabled=false) aunque el socket siga
  // vivo, y en ese caso lo que hay que hacer es reactivar el servidor, no
  // reconectar un socket que ya está bien.
  if (isMobile || !isConnected.value) {
    socketDisconnect()
    connectionStatus.value = 'connecting'
    socketConnect()
  } else {
    // Desktop con socket conectado: toggle estado del servidor
    if (serverEnabled.value) {
      // Apagar: enviar al server que está disabled
      socketSetServerEnabled(false)
    } else {
      // Encender: enviar al server que está enabled
      socketSetServerEnabled(true)
      // Cerrar Configuración al reactivar, igual que se cierra al
      // desconectar — no tiene sentido dejarla abierta tras la acción.
      showSettings.value = false
    }
  }
}

// Reaccionar a cambios de conexión del socket
watch(isConnected, async (connected) => {
  if (connected) {
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

// Al perder la conexión (o desactivar el servidor), cerrar cualquier modal
// abierto — no tiene sentido dejar Configuración o el editor de botones
// abiertos operando sobre un servidor al que ya no se puede llegar.
//
// OJO: el socket parpadea (se cae y reconecta solo) durante el uso normal en
// móvil, y cerrar en el primer 'disconnected' hacía que el editor se cerrara
// solo justo después de abrirlo con long-press. Por eso se espera a que la
// desconexión se sostenga un par de segundos antes de cerrar nada.
let disconnectCloseTimer: ReturnType<typeof setTimeout> | null = null
watch(connectionStatus, (status) => {
  if (disconnectCloseTimer) {
    clearTimeout(disconnectCloseTimer)
    disconnectCloseTimer = null
  }
  if (status !== 'disconnected') return
  disconnectCloseTimer = setTimeout(() => {
    if (connectionStatus.value !== 'disconnected') return
    showSettings.value = false
    showEditor.value = false
    showClearAllDialog.value = false
    showMouseController.value = false
  }, 2500)
})

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

  // En modo edición no se ejecuta nada: ahí solo se reorganiza.
  if (isEditMode.value) return

  // No ejecutar si se está arrastrando en mobile
  if (touchDragButton.value) return
  // Ni si es el "click" fantasma que el navegador dispara solo después de
  // un gesto de edición (ver handleTouchEnd en useDragAndDrop).
  if (Date.now() < ignoreClickUntil.value) return

  // Reproducir sonido de tecla + feedback háptico en móvil
  playClickSound()
  void haptics.tap()

  try {
    isExecuting.value = button.id
    buttonStatus.value[button.id] = 'running'

    let result: { success: boolean; output?: string; message?: string }

    if (isConnected.value) {
      // Via WebSocket (más rápido). Red de seguridad aparte del ack-timeout
      // interno de emitWithAck: si el socket se desconecta/recrea a mitad
      // de la espera, la promesa original queda huérfana y nunca resuelve,
      // dejando el botón en "ejecutando" para siempre — este timeout la
      // fuerza a resolver igual.
      result = await Promise.race([
        socketExecute(button.id),
        new Promise<{ success: boolean; message: string }>((resolve) =>
          setTimeout(
            () => resolve({ success: false, message: 'Tiempo de espera agotado' }),
            8000,
          ),
        ),
      ])
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

// Confirmación para limpiar todos los botones
const showClearAllDialog = ref(false)
function openClearAllDialog() {
  showClearAllDialog.value = true
}
/** En vez de borrar los botones, restablece su color a un estilo estático
 * uniforme — el usuario pidió esto porque perder la configuración entera
 * (ícono, acción, posición) por accidente es más grave que solo perder el
 * color elegido. */
function handleClearAllConfirm() {
  buttons.value.forEach((button) => {
    button.color = '#ffffff'
    button.backgroundColor = '#2c3e50'
    buttons.value.set(button.id, button)
  })
  saveButtons()
  toast.removeAllGroups()
  toast.add({
    severity: 'info',
    summary: 'Colores restablecidos',
    detail: 'Todos los botones volvieron a su color estático',
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
    if (isConnected.value) connectionStatus.value = 'connected'
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
        <!-- El chip de conexión va flanqueado por volumen (izquierda) y
             editar cuadrícula (derecha), en vez de apilar más FABs. -->
        <div class="status-row">
          <button
            v-if="isMobileView && (pinConfigured || isMobile)"
            class="status-side-btn"
            title="Control de volumen"
            aria-label="Control de volumen"
            @click="toggleVolumeSlider"
          >
            <Icon :icon="systemMuted ? 'mdi:volume-mute' : 'mdi:volume-high'" />
          </button>

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

          <button
            v-if="isMobileView && (pinConfigured || isMobile)"
            class="status-side-btn"
            :class="{ 'is-editing': isEditMode }"
            :title="isEditMode ? 'Salir del modo edición' : 'Editar cuadrícula'"
            :aria-label="isEditMode ? 'Salir del modo edición' : 'Editar cuadrícula'"
            :aria-pressed="isEditMode"
            @click="isEditMode = !isEditMode"
          >
            <Icon :icon="isEditMode ? 'mdi:check' : 'mdi:pencil'" />
          </button>
        </div>
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

    <!-- Floating settings button (top-left). Volumen y Editar viven junto al
         chip de conexión; aquí solo quedan Configuración y Mouse. -->
    <div class="actions-fab-container">
      <button
        class="actions-fab"
        title="Configuración"
        aria-label="Configuración"
        @click="openSettings"
      >
        <Icon icon="mdi:cog" />
      </button>
      <button
        v-if="isMobile"
        class="actions-fab actions-fab-sm"
        title="Mouse & Teclado"
        aria-label="Mouse & Teclado"
        @click="showMouseController = true"
      >
        <Icon icon="mdi:mouse" />
      </button>
    </div>

    <!-- Floating theme toggle (posición fija, esquina superior derecha) -->
    <div v-if="!isMobileView" class="fab-container" :class="`fab-${fabCorner}`" :style="fabStyle">
      <button
        ref="themeFabRef"
        @click="toggleTheme()"
        @contextmenu.prevent="toggleAccentPicker"
        :title="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
        class="theme-fab"
        @touchstart.passive="handleFabLongPressStart"
        @touchmove="handleFabLongPressEnd"
        @touchend="handleFabLongPressEnd"
      >
        <img v-if="isDark" src="/icons/sun.svg" alt="Claro" class="theme-fab-icon" />
        <img v-else src="/icons/moon.svg" alt="Oscuro" class="theme-fab-icon" />
      </button>
      <button class="accent-toggle" :class="{ 'mobile-hidden': isMobile && !showAccentToggle }" @click="toggleAccentPicker" title="Cambiar color">
        <span class="accent-dot" :style="{ background: currentAccent.accent }"></span>
      </button>
      <div v-if="showAccentPicker" class="accent-overlay" @click="closeAccentPicker"></div>
      <Transition name="accent-pop">
        <div v-if="showAccentPicker" class="accent-picker">
          <button
            v-for="p in accentPresets"
            :key="p.name"
            class="accent-swatch"
            :class="{ active: currentAccent.accent === p.accent }"
            :style="{ '--sw': p.accent }"
            :title="p.name"
            @click="setAccent(p); closeAccentPicker()"
          />
        </div>
      </Transition>
    </div>

    <!-- Mensaje cuando no hay PIN configurado (solo desktop) -->
    <div v-if="!pinConfigured && !isMobile" class="no-pin-message">
      <Icon icon="mdi:lock" class="no-pin-icon" />
      <h2 class="no-pin-title">Configura un PIN para comenzar</h2>
      <p class="no-pin-desc">
        Necesitas configurar un PIN de 4 dígitos desde
        <strong>Configuración</strong> para poder usar los botones.
      </p>
      <button @click="openSettings" class="no-pin-btn">
        <Icon icon="mdi:cog" style="vertical-align: -2px" /> Ir a Configuración
      </button>
    </div>

    <template v-if="pinConfigured || isMobile">
      <div class="spotify-section">
        <SpotifyPlayer />
      </div>

      <Transition name="edit-bar">
        <div v-if="isEditMode" class="edit-bar">
          <Icon icon="mdi:cursor-move" />
          <span>Arrastra los botones para reordenarlos</span>
          <button type="button" class="edit-bar-done" @click="isEditMode = false">
            Listo
          </button>
        </div>
      </Transition>

      <!-- Sin conexión: no mostrar el grid con celdas "Agregar" vacías, ya
           que da la impresión de que se perdieron los botones. -->
      <div v-if="connectionStatus === 'disconnected'" class="grid-disconnected">
        <Icon icon="mdi:wifi-off" class="grid-disconnected-icon" />
        <p class="grid-disconnected-text">
          {{ isMobile ? 'Sin conexión con el servidor' : serverEnabled ? 'Sin conexión con el servidor' : 'Servidor desactivado' }}
        </p>
      </div>

      <div
        v-else
        class="grid-viewport"
        :class="{
          'grid-reloading': isReloadingGrid,
          'grid-swiping': isMouseSwiping,
          'grid-editing': isEditMode,
        }"
        @touchstart="handlePageSwipeTouchStart($event)"
        @touchmove="handleTouchMove($event); handlePageSwipeTouchMove($event)"
        @touchend="handleTouchEnd($event); resolvePageSwipe()"
        @touchcancel="handleTouchCancel(); resolvePageSwipe()"
        @mousedown="handleGridMouseDown"
        @mousemove="handleGridMouseMove"
        @mouseup="handleGridMouseUp"
        @mouseleave="handleGridMouseUp"
      >
        <Transition :name="pageDirection >= 0 ? 'slide-next' : 'slide-prev'">
          <div
            :key="currentPage"
            class="grid-page"
            :style="{
              '--grid-cols': gridCols,
              '--grid-rows': gridRows,
              transform: (isMouseSwiping || pageSwipeStartX !== null) ? `translateX(calc(${pageSwipeDeltaX}px * 0.3))` : undefined,
              transition: (isMouseSwiping || pageSwipeStartX !== null) ? 'none' : undefined,
            }"
          >
            <!-- Keyed por id de botón (no por posición) para que al
                 intercambiar dos botones Vue mueva los nodos y anime el
                 reacomodo con FLIP en vez de saltar de golpe. -->
            <TransitionGroup name="swap">
              <div
                v-for="item in gridItems"
                :key="item.button ? `b-${item.button.id}` : `e-${item.row}-${item.col}`"
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
                :style="
                  isTouchDragging(item.button)
                    ? { '--drag-x': touchDragOffset.x + 'px', '--drag-y': touchDragOffset.y + 'px' }
                    : undefined
                "
                @touchstart="
                  handleTouchStart(
                    item.button,
                    { row: item.row, col: item.col },
                    $event,
                  )
                "
                @mousedown="
                  handleMouseDown(
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
                />
              </div>
            </TransitionGroup>
          </div>
        </Transition>
      </div>

      <!-- Paginación: puntos + flechas -->
      <div v-if="connectionStatus !== 'disconnected' && totalPages > 1" class="page-nav">
        <button
          type="button"
          class="page-arrow"
          :disabled="currentPage === 0"
          aria-label="Página anterior"
          @click="goToPage(currentPage - 1)"
        >
          <Icon icon="mdi:chevron-left" />
        </button>
        <div class="page-dots">
          <button
            v-for="p in totalPages"
            :key="p"
            type="button"
            class="page-dot"
            :class="{
              active: currentPage === p - 1,
              'drop-target': isTouchOverPage(p - 1),
            }"
            :data-page-dot="p - 1"
            :aria-label="`Ir a la página ${p}`"
            @click="goToPage(p - 1)"
          />
        </div>
        <button
          type="button"
          class="page-arrow"
          :disabled="currentPage === totalPages - 1"
          aria-label="Página siguiente"
          @click="goToPage(currentPage + 1)"
        >
          <Icon icon="mdi:chevron-right" />
        </button>
      </div>
    </template>

    <ServerSettings
      v-model:show="showSettings"
      :server-enabled="serverEnabled"
      :is-mobile-view="isMobileView"
      @reconnect="handleReconnectButton"
      @clear-all="openClearAllDialog"
    />

    <!-- PIN Gate Dialog -->
    <div v-if="showPinGate" class="confirm-overlay" @click.self="cancelPinGate">
      <div class="pin-gate-dialog">
        <h3 class="pin-gate-title"><Icon icon="mdi:lock" style="vertical-align: -3px" /> Ingresa el PIN</h3>
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
            <template v-if="pinGateLoading"><Icon icon="mdi:loading" class="mdi-spin" /> ...</template>
            <template v-else><Icon icon="mdi:lock-open" style="vertical-align: -2px" /> Acceder</template>
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
          <template v-if="mobileLockLoading"><Icon icon="mdi:loading" class="mdi-spin" /> ...</template>
          <template v-else><Icon icon="mdi:lock-open" style="vertical-align: -2px" /> Desbloquear</template>
        </button>
        <!-- Biometric retry button -->
        <button
          v-if="biometryAvailable && hasSavedPin"
          @click="handleBiometricRetry"
          :disabled="mobileLockLoading"
          class="mobile-pin-lock-btn biometric-btn"
          aria-label="Desbloquear con huella digital"
        >
          <Icon icon="mdi:fingerprint" style="font-size: 3rem" />
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

    <footer class="footer">
      <p class="credits">
        Hecho por
        <a
          href="https://mhenriquezd.github.io/portfolio-v2/"
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
      title="Restablecer colores"
      message="¿Restablecer el color de todos los botones a un estilo estático? El ícono, la acción y la posición de cada botón no se ven afectados."
      confirmLabel="Restablecer"
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
  .grid-item:active {
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

@media (max-width: 640px) {
  .header { gap: 14px; margin-bottom: 18px; padding-bottom: 14px; }
  .header h1 { font-size: 1.5rem !important; }
}

/* Fila del chip de conexión con sus botones laterales (volumen / editar) */
.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-side-btn {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(8px);
  color: var(--text-1);
  font-size: 1.05rem;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.18s;
}
.status-side-btn:active { transform: scale(0.9); }
@media (hover: hover) {
  .status-side-btn:hover {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
}
.status-side-btn.is-editing {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 50%, transparent);
}
[data-theme='light'] .status-side-btn {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.12);
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

/* Los tonos claros del tema oscuro (verde 1.6:1, ámbar 1.5:1 sobre #f5f5f5)
   no llegaban ni de cerca al 4.5:1 que pide WCAG AA para texto normal.
   Estas variantes oscuras sí: 4.60, 5.93 y 4.61 respectivamente. El punto
   de color conserva el tono vivo — es decorativo, no texto. */
[data-theme='light'] .connection-status.connected { color: #15803d; }
[data-theme='light'] .connection-status.disconnected { color: #b91c1c; }
[data-theme='light'] .connection-status.connecting { color: #b45309; }

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

.spotify-section {
  display: flex; justify-content: center;
  margin-bottom: 12px;
}

.grid-disconnected {
  flex: 1;
  margin-bottom: 24px;
  padding: 30px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  min-height: 240px;
  background: color-mix(in srgb, var(--text-2) 5%, transparent);
  border: 1.5px dashed color-mix(in srgb, var(--text-2) 25%, transparent);
  color: var(--text-2);
}
.grid-disconnected-icon { font-size: 2.5rem; opacity: 0.6; }
.grid-disconnected-text { font-size: 0.95rem; text-align: center; margin: 0; }

.grid-viewport {
  flex: 1;
  margin-bottom: 24px;
  padding: 30px;
  border-radius: 16px;
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  border: 1.5px solid color-mix(in srgb, var(--accent) 35%, transparent);
  box-shadow:
    0 2px 8px rgba(120, 120, 130, 0.1),
    0 8px 24px rgba(120, 120, 130, 0.13),
    0 0 40px -6px color-mix(in srgb, var(--accent) 25%, transparent);
  position: relative;
  /* overflow-x:hidden + overflow-y:visible NO funciona: la spec de CSS
     convierte el eje "visible" en "auto" en cuanto el otro eje no es
     visible, así que seguía recortando la fila vertical. Con overflow
     visible en ambos ejes se pierde el recorte lateral del carrusel
     durante los ~0.3s de la animación (bleed leve), pero evita cortar
     contenido real, que es peor. */
  overflow: visible;
  touch-action: pan-y;
  user-select: none;
}

.grid-viewport.grid-swiping {
  cursor: grabbing;
}

/* La página activa ocupa todo el espacio interior (dentro del padding) del
   viewport — position:absolute la saca del flujo para que la página que
   entra y la que sale puedan deslizarse superpuestas sin saltos de layout. */
.grid-page {
  position: absolute;
  inset: var(--grid-pad, 30px);
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: var(--grid-gap, 20px);
  grid-auto-rows: 1fr;
  /* Botones más chicos: se centran en su celda en vez de estirarse a
     ocuparla toda (importante en pantallas anchas con pocas columnas). */
  align-items: center;
  justify-items: center;
}

/* Reacomodo animado al intercambiar botones (FLIP de TransitionGroup).
   El que se está arrastrando queda excluido: su transform lo controla el
   puntero y una transición aquí lo dejaría siempre atrasado. */
.grid-item.swap-move:not(.touch-dragging) {
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* ── Modo edición: guías de cuadrícula ──
   El grid cambia de aspecto para dejar claro que se está editando: fondo
   atenuado, celdas marcadas con borde punteado y botones elevados. Sin
   esto el arrastre era un gesto invisible que había que adivinar. */
.grid-viewport.grid-editing {
  background: color-mix(in srgb, var(--accent) 3%, rgba(0, 0, 0, 0.25));
  border-style: dashed;
  border-color: color-mix(in srgb, var(--accent) 55%, transparent);
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.35),
    0 0 30px -8px color-mix(in srgb, var(--accent) 35%, transparent);
}

/* Celda punteada detrás de cada posición del grid */
.grid-editing .grid-item {
  border-radius: 18px;
  outline: 1px dashed color-mix(in srgb, var(--accent) 35%, transparent);
  outline-offset: 6px;
  cursor: grab;
}
.grid-editing .grid-item:active {
  cursor: grabbing;
}
/* Botón elevado, para que se lea como "despegado" y movible */
.grid-editing .grid-item :deep(.stream-button) {
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.5),
    0 0 0 1px color-mix(in srgb, var(--glow, transparent) 60%, transparent);
  transform: translateY(-2px);
}

.edit-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  color: var(--text-1);
  font-size: 0.85rem;
}
.edit-bar > span { flex: 1; }
.edit-bar-done {
  flex-shrink: 0;
  padding: 6px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: #fff;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}
.edit-bar-enter-active,
.edit-bar-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.edit-bar-enter-from,
.edit-bar-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Animación al cambiar de página: deslizamiento lateral tipo carrusel ── */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease;
}
.slide-next-enter-from { transform: translateX(60px); opacity: 0; }
.slide-next-leave-to { transform: translateX(-60px); opacity: 0; }
.slide-prev-enter-from { transform: translateX(-60px); opacity: 0; }
.slide-prev-leave-to { transform: translateX(60px); opacity: 0; }

/* ── Navegación entre páginas ── */
.page-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin: -8px 0 20px;
}
.page-arrow {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--text-1);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 1.1rem;
  transition: all 0.15s;
}
.page-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.page-arrow:not(:disabled):active {
  transform: scale(0.9);
}
.page-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}
.page-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  border: none;
  padding: 0;
  /* 40% daba 2.4:1 en oscuro y 1.6:1 en claro — por debajo del 3:1 que pide
     WCAG para elementos de interfaz. Al 55% quedan en 6.3 y 4.7. */
  background: color-mix(in srgb, var(--text-2) 55%, transparent);
  cursor: pointer;
  transition: all 0.2s;
}
.page-dot.active {
  width: 22px;
  border-radius: 5px;
  background: var(--accent);
  box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 60%, transparent);
}
.page-dot.drop-target {
  width: 16px;
  height: 16px;
  background: var(--accent-2);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-2) 30%, transparent);
  transform: scale(1.2);
}

@media (max-width: 640px) {
  .grid-viewport {
    padding: 16px;
    --grid-pad: 16px;
    --grid-gap: 8px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .grid-viewport {
    padding: 20px;
    --grid-pad: 20px;
    --grid-gap: 10px;
  }
}

.grid-viewport::before {
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
  width: 100%;
  max-width: 140px;
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.15s ease,
    filter 0.15s ease;
  touch-action: manipulation;
  will-change: transform, opacity;
  pointer-events: auto;
}

/* En pantallas grandes los botones pueden escalar más — 140px se veía
   diminuto en monitores 2K/4K, ya que .stream-deck-container tiene
   max-width:1200px pero el usuario reportó 140px chico incluso ahí. */
@media (min-width: 1600px) {
  .grid-item { max-width: 190px; }
}
@media (min-width: 2200px) {
  .grid-item { max-width: 230px; }
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
/* El botón arrastrado sigue al dedo (--drag-x/--drag-y los actualiza el
   composable en cada touchmove). Sin transición en transform: con una,
   el botón iba siempre "atrasado" respecto al dedo. */
.grid-item.touch-dragging {
  z-index: 100;
  opacity: 0.9;
  transform: translate(var(--drag-x, 0px), var(--drag-y, 0px)) scale(1.1);
  filter: brightness(1.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.6);
  transition: none;
  pointer-events: none;
}

.grid-item.touch-drag-over {
  transform: scale(0.95);
  outline: 2px solid #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
}

/* Botón sujeto en modo edición, antes de decidir si es toque o arrastre.
   Antes era un pulso infinito porque marcaba la espera del long-press; ya
   no hay espera, así que basta con hundirlo mientras el dedo está encima. */
.grid-item.is-pressing {
  transform: scale(0.96);
  filter: brightness(1.15);
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

  .grid-viewport {
    --grid-gap: 12px;
  }
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

/* ── Floating actions menu (top-left) ── */
.actions-fab-container {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 900;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}
@media (max-width: 640px) {
  .actions-fab-container { top: 14px; left: 14px; }
}

.actions-fab {
  width: 48px; height: 48px; border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 30, 50, 0.85);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s;
  color: var(--text-1);
  font-size: 1.3rem;
  position: relative;
  z-index: 1000;
}
[data-theme='light'] .actions-fab {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(0, 0, 0, 0.12);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.actions-fab:active { transform: scale(0.9); }
@media (hover: hover) { .actions-fab:hover { transform: scale(1.1); } }

.actions-fab-sm {
  width: 36px;
  height: 36px;
  font-size: 1.05rem;
}
/* Floating theme toggle button */
/* ── FAB container ── */
.fab-container {
  position: fixed; z-index: 900;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
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
.accent-toggle.mobile-hidden { display: none; }
.accent-dot { width: 14px; height: 14px; border-radius: 50%; }

.accent-overlay {
  position: fixed; inset: 0; z-index: 999;
}
/* Accent picker popover */
.accent-picker {
  position: relative; z-index: 1000;
  display: flex; gap: 6px; padding: 12px 8px;
  border-radius: 24px; flex-direction: column;
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

/* Light theme — PIN gate */
[data-theme='light'] .pin-gate-dialog {
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 245, 250, 0.98) 100%);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .pin-gate-input {
  border-color: rgba(0, 0, 0, 0.15);
  background: rgba(0, 0, 0, 0.03);
}

[data-theme='light'] .pin-gate-btn-cancel {
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .pin-gate-btn-cancel:hover {
  background: rgba(0, 0, 0, 0.05);
}
</style>
