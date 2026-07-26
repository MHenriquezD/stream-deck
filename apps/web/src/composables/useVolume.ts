import { onMounted, onUnmounted, ref } from 'vue'
import { useSocket } from './useSocket'

/**
 * Control de volumen del sistema.
 *
 * Encapsula el estado del panel, la sincronización con el servidor (con debounce
 * al arrastrar el slider) y la escucha del broadcast `volume:changed` que otros
 * clientes pueden emitir. Registra y limpia sus propios listeners de ciclo de
 * vida, así que el componente solo tiene que consumir lo que devuelve.
 */
export function useVolume() {
  const {
    getVolume,
    setVolume,
    toggleMute,
    on,
    off,
  } = useSocket()

  const showVolumeSlider = ref(false)
  const systemVolume = ref(50)
  const systemMuted = ref(false)
  let volumeDebounce: ReturnType<typeof setTimeout> | null = null

  const fetchVolume = async () => {
    try {
      const state = await getVolume()
      systemVolume.value = state.volume
      systemMuted.value = state.muted
    } catch {
      /* ignore */
    }
  }

  const onVolumeInput = (e: Event) => {
    const val = parseInt((e.target as HTMLInputElement).value)
    systemVolume.value = val
    if (volumeDebounce) clearTimeout(volumeDebounce)
    volumeDebounce = setTimeout(() => setVolume(val), 80)
  }

  const onMuteToggle = () => {
    toggleMute()
  }

  const toggleVolumeSlider = () => {
    showVolumeSlider.value = !showVolumeSlider.value
    if (showVolumeSlider.value) fetchVolume()
  }

  const onVolumeChanged = (data: { volume: number; muted: boolean }) => {
    systemVolume.value = data.volume
    systemMuted.value = data.muted
  }

  onMounted(() => {
    on('volume:changed', onVolumeChanged as (...args: unknown[]) => void)
    fetchVolume()
  })

  onUnmounted(() => {
    off('volume:changed', onVolumeChanged as (...args: unknown[]) => void)
    if (volumeDebounce) clearTimeout(volumeDebounce)
  })

  return {
    showVolumeSlider,
    systemVolume,
    systemMuted,
    onVolumeInput,
    onMuteToggle,
    toggleVolumeSlider,
    fetchVolume,
  }
}
