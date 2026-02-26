/**
 * Composable for playing a click sound when buttons are pressed.
 * Sound preference is stored in localStorage ('buttonSound' + 'buttonSoundFile').
 */
const STORAGE_KEY = 'buttonSound'
const SOUND_FILE_KEY = 'buttonSoundFile'
const DEFAULT_SOUND = 'key-click.wav'

const AVAILABLE_SOUNDS = [
  { file: 'key-click.wav', label: 'Tecla (default)' },
  { file: 'keyboard.mp3', label: 'Teclado' },
  { file: 'keyboard-old.mp3', label: 'Teclado Antiguo' },
  { file: 'keyboard-press.mp3', label: 'Teclado Press' },
  { file: 'keyboard5.mp3', label: 'Teclado 5' },
  { file: 'mech-keyboard.mp3', label: 'Mecánico' },
  { file: 'mech-keyboard-2.mp3', label: 'Mecánico 2' },
  { file: 'mechanical1.mp3', label: 'Mecánico 3' },
  { file: 'button-press.mp3', label: 'Botón' },
  { file: 'beep.mp3', label: 'Beep' },
  { file: 'bubble.mp3', label: 'Burbuja' },
  { file: 'camera-click.mp3', label: 'Cámara' },
  { file: 'shutter.mp3', label: 'Obturador' },
  { file: 'light-switch.mp3', label: 'Interruptor' },
  { file: 'projector-button.mp3', label: 'Proyector' },
  { file: 'space-bar.mp3', label: 'Barra Espaciadora' },
  { file: 'spring-vibration.mp3', label: 'Resorte' },
  { file: 'typing.mp3', label: 'Tecleo' },
]

let audioContext: AudioContext | null = null
const bufferCache = new Map<string, AudioBuffer>()
// Module-level state — always in sync, avoids localStorage read issues
let currentSoundFile =
  (typeof localStorage !== 'undefined' &&
    localStorage.getItem(SOUND_FILE_KEY)) ||
  DEFAULT_SOUND
let currentEnabled =
  typeof localStorage !== 'undefined'
    ? localStorage.getItem(STORAGE_KEY) !== 'off'
    : true

async function loadSound(file: string) {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  if (bufferCache.has(file)) return bufferCache.get(file)!

  try {
    const response = await fetch(`./sounds/${file}`)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = await audioContext.decodeAudioData(arrayBuffer)
    bufferCache.set(file, buffer)
    return buffer
  } catch (e) {
    console.warn('Could not load sound:', file, e)
    return null
  }
}

export function useButtonSound() {
  const isEnabled = (): boolean => {
    return currentEnabled
  }

  const setEnabled = (enabled: boolean) => {
    currentEnabled = enabled
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  }

  const getSelectedSound = (): string => {
    return currentSoundFile
  }

  const setSelectedSound = (file: string) => {
    currentSoundFile = file
    localStorage.setItem(SOUND_FILE_KEY, file)
  }

  const play = async () => {
    if (!currentEnabled) return
    const file = currentSoundFile
    const buffer = await loadSound(file)
    if (!audioContext || !buffer) return

    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }

    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start(0)
  }

  return {
    play,
    isEnabled,
    setEnabled,
    getSelectedSound,
    setSelectedSound,
    availableSounds: AVAILABLE_SOUNDS,
  }
}
