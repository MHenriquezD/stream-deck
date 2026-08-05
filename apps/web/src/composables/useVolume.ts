import { onMounted, onUnmounted, ref } from 'vue'
import { useSocket } from './useSocket'

const AUTO_HIDE_MS = 3000

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
  let autoHideTimer: ReturnType<typeof setTimeout> | null = null

  const resetAutoHide = () => {
    if (autoHideTimer) clearTimeout(autoHideTimer)
    autoHideTimer = setTimeout(() => {
      showVolumeSlider.value = false
    }, AUTO_HIDE_MS)
  }

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
    resetAutoHide()
  }

  const onMuteToggle = () => {
    toggleMute()
    resetAutoHide()
  }

  const toggleVolumeSlider = () => {
    showVolumeSlider.value = !showVolumeSlider.value
    if (showVolumeSlider.value) {
      fetchVolume()
      resetAutoHide()
    } else if (autoHideTimer) {
      clearTimeout(autoHideTimer)
    }
  }

  const onVolumeChanged = (data: { volume: number; muted: boolean }) => {
    systemVolume.value = data.volume
    systemMuted.value = data.muted
    if (showVolumeSlider.value) resetAutoHide()
  }

  onMounted(() => {
    on('volume:changed', onVolumeChanged as (...args: unknown[]) => void)
    fetchVolume()
  })

  onUnmounted(() => {
    off('volume:changed', onVolumeChanged as (...args: unknown[]) => void)
    if (volumeDebounce) clearTimeout(volumeDebounce)
    if (autoHideTimer) clearTimeout(autoHideTimer)
  })

  return {
    showVolumeSlider,
    systemVolume,
    systemMuted,
    onVolumeInput,
    onMuteToggle,
    toggleVolumeSlider,
    fetchVolume,
    setVolume,
    resetAutoHide,
  }
}
