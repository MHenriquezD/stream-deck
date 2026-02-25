import { Capacitor } from '@capacitor/core'
import { ref } from 'vue'

const isMobile =
  Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'

const biometryAvailable = ref(false)
const hasSavedPin = ref(!!localStorage.getItem('biometric_pin'))

/**
 * Composable for biometric authentication with locally stored PIN.
 * The PIN is saved in localStorage (encrypted at rest by Android/iOS).
 * On unlock, biometric prompt is shown — if successful, the saved PIN is returned.
 */
export function useBiometric() {
  /** Check if device has biometry enrolled */
  const checkBiometry = async (): Promise<boolean> => {
    if (!isMobile) {
      biometryAvailable.value = false
      return false
    }

    try {
      const { BiometricAuth } =
        await import('@aparajita/capacitor-biometric-auth')
      const result = await BiometricAuth.checkBiometry()
      biometryAvailable.value = result.isAvailable
      return result.isAvailable
    } catch {
      biometryAvailable.value = false
      return false
    }
  }

  /** Save PIN locally so it can be retrieved after biometric auth */
  const savePin = (pin: string) => {
    localStorage.setItem('biometric_pin', pin)
    hasSavedPin.value = true
  }

  /** Remove saved PIN */
  const clearSavedPin = () => {
    localStorage.removeItem('biometric_pin')
    hasSavedPin.value = false
  }

  /** Get saved PIN (for internal use after biometric success) */
  const getSavedPin = (): string | null => {
    return localStorage.getItem('biometric_pin')
  }

  /**
   * Prompt biometric authentication and return the saved PIN if successful.
   * Returns null if biometry fails or no PIN is saved.
   */
  const authenticateAndGetPin = async (): Promise<string | null> => {
    if (!hasSavedPin.value) return null

    try {
      const { BiometricAuth } =
        await import('@aparajita/capacitor-biometric-auth')
      await BiometricAuth.authenticate({
        reason: 'Desbloquea para acceder a Spartan Hub',
        cancelTitle: 'Usar PIN',
        allowDeviceCredential: false,
        androidTitle: 'Spartan Hub',
        androidSubtitle: 'Usa tu huella para desbloquear',
      })
      // Biometric success — return saved PIN
      return getSavedPin()
    } catch {
      // User cancelled or biometry failed — fall back to manual PIN
      return null
    }
  }

  return {
    biometryAvailable,
    hasSavedPin,
    checkBiometry,
    savePin,
    clearSavedPin,
    authenticateAndGetPin,
  }
}
