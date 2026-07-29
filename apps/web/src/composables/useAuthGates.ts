import { ref } from 'vue'
import { useAuth } from './useAuth'
import { useBiometric } from './useBiometric'
import { useSocket } from './useSocket'

interface UseAuthGatesOptions {
  /** Tras desbloquear el gate de escritorio (abrir Configuración). */
  onDesktopUnlocked: () => void
  /** Tras activar la biometría desde el opt-in (p. ej. un toast). */
  onBiometricEnabled?: () => void
}

/**
 * Flujos de desbloqueo por PIN y biometría:
 *  - Gate de escritorio: pide el PIN antes de abrir Configuración.
 *  - Lock obligatorio en móvil al arrancar la app.
 *  - Opt-in para guardar el PIN y desbloquear con huella la próxima vez.
 *
 * Tras cualquier login correcto reconecta el socket con el nuevo token. Usa
 * useAuth/useBiometric/useSocket por dentro; el componente solo aporta los
 * efectos que no le corresponden a este flujo (abrir Configuración, toast).
 */
export function useAuthGates({
  onDesktopUnlocked,
  onBiometricEnabled,
}: UseAuthGatesOptions) {
  const { login } = useAuth()
  const {
    biometryAvailable,
    hasSavedPin,
    savePin,
    clearSavedPin,
    authenticateAndGetPin,
  } = useBiometric()
  const { connect, disconnect } = useSocket()

  // Reconecta el socket para que tome el token recién emitido.
  const reconnectSocket = () => {
    disconnect()
    connect()
  }

  // ── Gate de escritorio (antes de Configuración) ──
  const showPinGate = ref(false)
  const pinGateInput = ref('')
  const pinGateError = ref('')
  const pinGateLoading = ref(false)

  const openPinGate = () => {
    showPinGate.value = true
    pinGateInput.value = ''
    pinGateError.value = ''
  }

  const cancelPinGate = () => {
    showPinGate.value = false
    pinGateInput.value = ''
    pinGateError.value = ''
  }

  const handlePinGateSubmit = async () => {
    pinGateError.value = ''
    if (!/^\d{4}$/.test(pinGateInput.value)) {
      pinGateError.value = 'El PIN debe ser de 4 dígitos'
      return
    }
    pinGateLoading.value = true
    const result = await login(pinGateInput.value)
    pinGateLoading.value = false
    if (result.success) {
      showPinGate.value = false
      pinGateInput.value = ''
      reconnectSocket()
      onDesktopUnlocked()
    } else {
      pinGateError.value = result.message || 'PIN incorrecto'
      pinGateInput.value = ''
    }
  }

  // ── Lock obligatorio en móvil ──
  const showMobilePinLock = ref(false)
  const mobileLockPin = ref('')
  const mobileLockError = ref('')
  const mobileLockLoading = ref(false)

  const handleMobilePinLockSubmit = async () => {
    mobileLockError.value = ''
    if (!/^\d{4}$/.test(mobileLockPin.value)) {
      mobileLockError.value = 'El PIN debe ser de 4 dígitos'
      return
    }
    mobileLockLoading.value = true
    const result = await login(mobileLockPin.value)
    mobileLockLoading.value = false
    if (result.success) {
      showMobilePinLock.value = false
      // Ofrecer guardar el PIN para biometría (solo la primera vez).
      if (biometryAvailable.value && !hasSavedPin.value) {
        pendingPinForBiometric.value = mobileLockPin.value
        showBiometricOptIn.value = true
      }
      mobileLockPin.value = ''
      reconnectSocket()
    } else {
      mobileLockError.value = result.message || 'PIN incorrecto'
      mobileLockPin.value = ''
    }
  }

  const handleBiometricRetry = async () => {
    const pin = await authenticateAndGetPin()
    if (!pin) return
    mobileLockLoading.value = true
    const result = await login(pin)
    mobileLockLoading.value = false
    if (result.success) {
      showMobilePinLock.value = false
      reconnectSocket()
    } else {
      // El PIN cambió en el escritorio → invalidar el guardado.
      clearSavedPin()
      mobileLockError.value =
        'PIN guardado ya no es válido. Ingresa el nuevo PIN.'
    }
  }

  // ── Opt-in de biometría ──
  const showBiometricOptIn = ref(false)
  const pendingPinForBiometric = ref('')

  const handleBiometricOptInAccept = () => {
    savePin(pendingPinForBiometric.value)
    pendingPinForBiometric.value = ''
    showBiometricOptIn.value = false
    onBiometricEnabled?.()
  }

  const handleBiometricOptInDecline = () => {
    pendingPinForBiometric.value = ''
    showBiometricOptIn.value = false
  }

  return {
    // gate escritorio
    showPinGate,
    pinGateInput,
    pinGateError,
    pinGateLoading,
    openPinGate,
    cancelPinGate,
    handlePinGateSubmit,
    // lock móvil
    showMobilePinLock,
    mobileLockPin,
    mobileLockError,
    mobileLockLoading,
    handleMobilePinLockSubmit,
    handleBiometricRetry,
    // opt-in biométrico
    showBiometricOptIn,
    pendingPinForBiometric,
    handleBiometricOptInAccept,
    handleBiometricOptInDecline,
  }
}
