import { Capacitor } from '@capacitor/core'
import { ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Haptics } from '@capacitor/haptics'

/**
 * Feedback háptico para dispositivos móviles (Android / iOS).
 *
 * En escritorio y navegador es un no-op silencioso, así que se puede llamar
 * sin comprobar la plataforma desde cualquier componente.
 */
export function useHaptics() {
  const isNative = Capacitor.isNativePlatform()

  /** Vibración corta al pulsar un botón. */
  const tap = async () => {
    if (!isNative) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      // El dispositivo puede no soportar haptics: nunca romper la interacción.
    }
  }

  /** Confirmación de que una acción terminó bien. */
  const success = async () => {
    if (!isNative) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch {
      // ignorado a propósito
    }
  }

  /** Aviso de que una acción falló. */
  const error = async () => {
    if (!isNative) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch {
      // ignorado a propósito
    }
  }

  return { tap, success, error, isNative }
}
