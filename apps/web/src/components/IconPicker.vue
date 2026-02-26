<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useServerUrlStore } from '../store/serverUrl.store'

interface IconItem {
  icon: string
  label: string
  keywords?: string[]
  isPrime?: boolean
  isFontAwesome?: boolean
  isCustom?: boolean
  isStreamDeck?: boolean
  isUserCustom?: boolean
}

const props = defineProps<{
  show: boolean
  currentIcon?: string
}>()

const emit = defineEmits<{
  select: [icon: string]
  close: []
}>()

const searchQuery = ref('')
const serverUrlStore = useServerUrlStore()
const { getAuthHeaders } = useAuth()
const customUserIcons = ref<IconItem[]>([])
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const fetchCustomIcons = async () => {
  try {
    const res = await fetch(
      `${serverUrlStore.serverUrl}/command/custom-icons`,
      {
        headers: { ...getAuthHeaders() },
      },
    )
    if (res.ok) {
      const files: string[] = await res.json()
      customUserIcons.value = files.map((f) => ({
        icon: `custom:${f}`,
        label: f.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' '),
        isUserCustom: true,
      }))
    }
  } catch (e) {
    console.warn('Error loading custom icons:', e)
  }
}

const handleUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return

  isUploading.value = true
  for (const file of Array.from(input.files)) {
    const formData = new FormData()
    formData.append('icon', file)
    try {
      await fetch(`${serverUrlStore.serverUrl}/command/custom-icons/upload`, {
        method: 'POST',
        headers: { ...getAuthHeaders() },
        body: formData,
      })
    } catch (e) {
      console.warn('Error uploading icon:', e)
    }
  }
  input.value = ''
  isUploading.value = false
  await fetchCustomIcons()
}

const deleteCustomIcon = async (icon: IconItem) => {
  const filename = icon.icon.replace('custom:', '')
  try {
    await fetch(
      `${serverUrlStore.serverUrl}/command/custom-icons/${filename}`,
      {
        method: 'DELETE',
        headers: { ...getAuthHeaders() },
      },
    )
    await fetchCustomIcons()
  } catch (e) {
    console.warn('Error deleting icon:', e)
  }
}

// Fetch custom icons when picker opens
watch(
  () => props.show,
  (val) => {
    if (val) fetchCustomIcons()
  },
)

onMounted(() => {
  if (props.show) fetchCustomIcons()
})

// Lista de SVGs personalizados - agregar nuevos archivos aquí
const customSvgFiles = [
  'brave.svg',
  'brave-circle.svg',
  'chrome.svg',
  'Disney_logo.svg',
  'epic-games-round.svg',
  'epicgames.svg',
  'excel.svg',
  'gog.svg',
  'minecraft.svg',
  'netflix.svg',
  'netflix-letters.svg',
  'opera.svg',
  'opera-gx.svg',
  'outlook.svg',
  'powerpoint.svg',
  'spotify.svg',
  'store-microsoft.svg',
  'whatsapp.svg',
  'word.svg',
  'xbox.svg',
  'xbox-logo.svg',
  'youtube.svg',
  'youtube-large.svg',
  'hbo-max.svg',
  'discord.svg',
  'discord-circle.svg',
  'edge.svg',
  'firefox.svg',
  'vscode.svg',
  'crunchyroll.svg',
  // Agregar más archivos SVG aquí según los agregues a public/icons/
]

const customSvgIcons: IconItem[] = customSvgFiles.map((filename) => {
  const label = filename
    .replace('.svg', '')
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  return {
    icon: `svg:${filename}`,
    label,
    isCustom: true,
  }
})

// Stream Deck icons from public/streamdeck-icons/
const sd = (file: string, label: string, keywords: string[]): IconItem => ({
  icon: `sd:${file}`,
  label,
  keywords,
  isStreamDeck: true,
})

const streamDeckCategories: Record<string, IconItem[]> = {
  'SD Música': [
    sd('music-music.png', 'Música', ['musica', 'music', 'nota']),
    sd('music-music[on].png', 'Música On', ['musica', 'music', 'on']),
    sd('music-music-play.png', 'Play', ['play', 'reproducir', 'musica']),
    sd('music-music-pause.png', 'Pausa', ['pausa', 'pause', 'musica']),
    sd('music-music-next.png', 'Siguiente', ['siguiente', 'next', 'cancion']),
    sd('music-music-prev.png', 'Anterior', ['anterior', 'previous', 'prev']),
    sd('music-music-volume-up.png', 'Volumen +', [
      'volumen',
      'subir',
      'volume',
      'up',
    ]),
    sd('music-music-volume-down.png', 'Volumen -', [
      'volumen',
      'bajar',
      'volume',
      'down',
    ]),
    sd('music-music-mute.png', 'Silenciar', ['silencio', 'mute', 'volumen']),
    sd('music-music-repeat.png', 'Repetir', ['repetir', 'repeat', 'loop']),
    sd('music-music-repeat-all.png', 'Repetir Todo', [
      'repetir',
      'repeat',
      'all',
      'todo',
    ]),
    sd('music-music-repeat-off.png', 'No Repetir', [
      'repetir',
      'repeat',
      'off',
    ]),
    sd('music-music-shuffle.png', 'Aleatorio', [
      'aleatorio',
      'shuffle',
      'random',
      'mezclar',
    ]),
    sd('music-blank.png', 'Blanco', ['blanco', 'blank', 'vacio']),
  ],
  'SD Streaming': [
    sd('streaming-streaming[on].png', 'Streaming On', [
      'streaming',
      'directo',
      'live',
      'on',
    ]),
    sd('streaming-streaming[off].png', 'Streaming Off', [
      'streaming',
      'directo',
      'off',
    ]),
    sd('streaming-twitch[on].png', 'Twitch On', ['twitch', 'on', 'live']),
    sd('streaming-twitch[off].png', 'Twitch Off', ['twitch', 'off']),
    sd('streaming-youtube[on].png', 'YouTube On', ['youtube', 'on', 'live']),
    sd('streaming-youtube[off].png', 'YouTube Off', ['youtube', 'off']),
    sd('streaming-kick[on].png', 'Kick On', ['kick', 'on', 'live']),
    sd('streaming-kick[off].png', 'Kick Off', ['kick', 'off']),
    sd('streaming-record[on].png', 'Grabar On', [
      'grabar',
      'record',
      'on',
      'grabando',
    ]),
    sd('streaming-record[off].png', 'Grabar Off', ['grabar', 'record', 'off']),
    sd('streaming-generic[on].png', 'Genérico On', [
      'streaming',
      'generico',
      'on',
    ]),
    sd('streaming-generic[off].png', 'Genérico Off', [
      'streaming',
      'generico',
      'off',
    ]),
  ],
  'SD Escenas': [
    sd('scenes-scenes[on].png', 'Escenas On', ['escenas', 'scenes', 'on']),
    sd('scenes-scenes[off].png', 'Escenas Off', ['escenas', 'scenes', 'off']),
    sd('scenes-gameplay[on].png', 'Gameplay On', [
      'gameplay',
      'juego',
      'game',
      'on',
    ]),
    sd('scenes-gameplay[off].png', 'Gameplay Off', [
      'gameplay',
      'juego',
      'game',
      'off',
    ]),
    sd('scenes-brb[on].png', 'BRB On', ['brb', 'vuelvo', 'break', 'on']),
    sd('scenes-brb[off].png', 'BRB Off', ['brb', 'vuelvo', 'break', 'off']),
    sd('scenes-starting[on].png', 'Inicio On', [
      'inicio',
      'starting',
      'comenzar',
      'on',
    ]),
    sd('scenes-starting[off].png', 'Inicio Off', ['inicio', 'starting', 'off']),
    sd('scenes-ended[on].png', 'Fin On', ['fin', 'ended', 'final', 'on']),
    sd('scenes-ended[off].png', 'Fin Off', ['fin', 'ended', 'final', 'off']),
    sd('scenes-coding[on].png', 'Coding On', [
      'coding',
      'codigo',
      'programar',
      'on',
    ]),
    sd('scenes-coding[off].png', 'Coding Off', [
      'coding',
      'codigo',
      'programar',
      'off',
    ]),
    sd('scenes-generic[on].png', 'Genérico On', ['escena', 'generico', 'on']),
    sd('scenes-generic[off].png', 'Genérico Off', [
      'escena',
      'generico',
      'off',
    ]),
    sd('scenes-overhead[on].png', 'Cenital On', [
      'cenital',
      'overhead',
      'camara',
      'on',
    ]),
    sd('scenes-overhead[off].png', 'Cenital Off', [
      'cenital',
      'overhead',
      'camara',
      'off',
    ]),
    sd('scenes-pov[on].png', 'POV On', ['pov', 'primera persona', 'on']),
    sd('scenes-pov[off].png', 'POV Off', ['pov', 'primera persona', 'off']),
    sd('scenes-supporters[on].png', 'Supporters On', [
      'supporters',
      'donaciones',
      'on',
    ]),
    sd('scenes-supporters[off].png', 'Supporters Off', [
      'supporters',
      'donaciones',
      'off',
    ]),
    sd('scenes-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('scenes-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Fuentes OBS': [
    sd('sources-facecam[on].png', 'Webcam On', [
      'webcam',
      'facecam',
      'camara',
      'on',
    ]),
    sd('sources-facecam[off].png', 'Webcam Off', [
      'webcam',
      'facecam',
      'camara',
      'off',
    ]),
    sd('sources-chat[on].png', 'Chat On', ['chat', 'mensajes', 'on']),
    sd('sources-chat[off].png', 'Chat Off', ['chat', 'mensajes', 'off']),
    sd('sources-overlay[on].png', 'Overlay On', [
      'overlay',
      'superposicion',
      'on',
    ]),
    sd('sources-overlay[off].png', 'Overlay Off', [
      'overlay',
      'superposicion',
      'off',
    ]),
    sd('sources-logo[on].png', 'Logo On', ['logo', 'marca', 'on']),
    sd('sources-logo[off].png', 'Logo Off', ['logo', 'marca', 'off']),
    sd('sources-pip[on].png', 'PIP On', ['pip', 'picture', 'imagen', 'on']),
    sd('sources-pip[off].png', 'PIP Off', ['pip', 'picture', 'imagen', 'off']),
    sd('sources-subscribe[on].png', 'Suscribir On', [
      'subscribe',
      'suscribir',
      'on',
    ]),
    sd('sources-subscribe[off].png', 'Suscribir Off', [
      'subscribe',
      'suscribir',
      'off',
    ]),
    sd('sources-generic[on].png', 'Genérico On', [
      'fuente',
      'source',
      'generico',
      'on',
    ]),
    sd('sources-generic[off].png', 'Genérico Off', [
      'fuente',
      'source',
      'generico',
      'off',
    ]),
    sd('sources-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('sources-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Controles': [
    sd('settings-arrow-up.png', 'Flecha Arriba', [
      'flecha',
      'arrow',
      'arriba',
      'up',
    ]),
    sd('settings-arrow-down.png', 'Flecha Abajo', [
      'flecha',
      'arrow',
      'abajo',
      'down',
    ]),
    sd('settings-arrow-left.png', 'Flecha Izquierda', [
      'flecha',
      'arrow',
      'izquierda',
      'left',
    ]),
    sd('settings-arrow-right.png', 'Flecha Derecha', [
      'flecha',
      'arrow',
      'derecha',
      'right',
    ]),
    sd('settings-audio.png', 'Audio', ['audio', 'sonido', 'sound']),
    sd('settings-back.png', 'Atrás', ['atras', 'back', 'volver']),
    sd('settings-brightness-high.png', 'Brillo Alto', [
      'brillo',
      'brightness',
      'alto',
      'high',
    ]),
    sd('settings-brightness-low.png', 'Brillo Bajo', [
      'brillo',
      'brightness',
      'bajo',
      'low',
    ]),
    sd('settings-camera.png', 'Cámara', ['camara', 'camera', 'foto']),
    sd('settings-camera-generic[on].png', 'Cámara On', [
      'camara',
      'camera',
      'on',
    ]),
    sd('settings-camera-generic[off].png', 'Cámara Off', [
      'camara',
      'camera',
      'off',
    ]),
    sd('settings-cancel.png', 'Cancelar', ['cancelar', 'cancel', 'no']),
    sd('settings-ok.png', 'OK', ['ok', 'aceptar', 'confirmar', 'si']),
    sd('settings-enter.png', 'Enter', ['enter', 'entrar', 'aceptar']),
    sd('settings-escape.png', 'Escape', ['escape', 'esc', 'salir']),
    sd('settings-exit.png', 'Salir', ['salir', 'exit', 'cerrar']),
    sd('settings-mic[on].png', 'Micrófono On', ['microfono', 'mic', 'on']),
    sd('settings-mic[off].png', 'Micrófono Off', [
      'microfono',
      'mic',
      'off',
      'mudo',
    ]),
    sd('settings-mic-monitor[on].png', 'Monitor Mic On', [
      'monitor',
      'microfono',
      'mic',
      'on',
    ]),
    sd('settings-mic-monitor[off].png', 'Monitor Mic Off', [
      'monitor',
      'microfono',
      'mic',
      'off',
    ]),
    sd('settings-discord-mic[on].png', 'Discord Mic On', [
      'discord',
      'microfono',
      'mic',
      'on',
    ]),
    sd('settings-discord-mic[off].png', 'Discord Mic Off', [
      'discord',
      'microfono',
      'mic',
      'off',
    ]),
    sd('settings-deafen[on].png', 'Ensordecer On', [
      'ensordecer',
      'deafen',
      'discord',
      'on',
    ]),
    sd('settings-deafen[off].png', 'Ensordecer Off', [
      'ensordecer',
      'deafen',
      'discord',
      'off',
    ]),
    sd('settings-power.png', 'Apagar', ['apagar', 'power', 'encender']),
    sd('settings-restart.png', 'Reiniciar', ['reiniciar', 'restart', 'reboot']),
    sd('settings-save-replay.png', 'Guardar Replay', [
      'guardar',
      'replay',
      'save',
      'repeticion',
    ]),
    sd('settings-screenshot.png', 'Captura', [
      'captura',
      'screenshot',
      'pantalla',
      'foto',
    ]),
    sd('settings-settings.png', 'Configuración', [
      'configuracion',
      'settings',
      'ajustes',
    ]),
    sd('settings-settings[on].png', 'Configuración On', [
      'configuracion',
      'settings',
      'on',
    ]),
    sd('settings-system-volume-up.png', 'Vol. Sistema +', [
      'volumen',
      'sistema',
      'system',
      'subir',
    ]),
    sd('settings-system-volume-down.png', 'Vol. Sistema -', [
      'volumen',
      'sistema',
      'system',
      'bajar',
    ]),
    sd('settings-system-volume-mute.png', 'Silenciar Sistema', [
      'silencio',
      'sistema',
      'system',
      'mute',
    ]),
    sd('settings-generic-volume-up.png', 'Volumen +', [
      'volumen',
      'subir',
      'volume',
      'up',
    ]),
    sd('settings-generic-volume-down.png', 'Volumen -', [
      'volumen',
      'bajar',
      'volume',
      'down',
    ]),
    sd('settings-volume[on].png', 'Volumen On', ['volumen', 'volume', 'on']),
    sd('settings-volume[off].png', 'Volumen Off', [
      'volumen',
      'volume',
      'off',
      'silencio',
    ]),
    sd('settings-obs-preview[on].png', 'OBS Preview On', [
      'obs',
      'preview',
      'vista previa',
      'on',
    ]),
    sd('settings-obs-preview[off].png', 'OBS Preview Off', [
      'obs',
      'preview',
      'vista previa',
      'off',
    ]),
    sd('settings-push-to-talk[on].png', 'Push to Talk On', [
      'push',
      'talk',
      'hablar',
      'ptt',
      'on',
    ]),
    sd('settings-push-to-talk[off].png', 'Push to Talk Off', [
      'push',
      'talk',
      'hablar',
      'ptt',
      'off',
    ]),
    sd('settings-win.png', 'Windows', ['windows', 'win', 'inicio', 'start']),
    sd('settings-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('settings-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
    sd('generic-back.png', 'Atrás', ['atras', 'back', 'volver', 'regresar']),
    sd('generic-folder.png', 'Carpeta', ['carpeta', 'folder', 'directorio']),
    sd('generic-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('generic-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Luces': [
    sd('lights-light-bulb[on].png', 'Bombilla On', [
      'bombilla',
      'luz',
      'light',
      'bulb',
      'on',
    ]),
    sd('lights-light-bulb[off].png', 'Bombilla Off', [
      'bombilla',
      'luz',
      'light',
      'bulb',
      'off',
    ]),
    sd('lights-lights[on].png', 'Luces On', ['luces', 'lights', 'on']),
    sd('lights-lights[off].png', 'Luces Off', ['luces', 'lights', 'off']),
    sd('lights-general-brightness-up.png', 'Brillo +', [
      'brillo',
      'brightness',
      'subir',
      'up',
    ]),
    sd('lights-general-brightness-down.png', 'Brillo -', [
      'brillo',
      'brightness',
      'bajar',
      'down',
    ]),
    sd('lights-day-night.png', 'Día/Noche', ['dia', 'noche', 'day', 'night']),
    sd('lights-bedroom.png', 'Dormitorio', [
      'dormitorio',
      'bedroom',
      'cuarto',
      'habitacion',
    ]),
    sd('lights-bathroom.png', 'Baño', ['bano', 'bathroom']),
    sd('lights-kitchen.png', 'Cocina', ['cocina', 'kitchen']),
    sd('lights-living-room.png', 'Sala', ['sala', 'living', 'room', 'salon']),
    sd('lights-dining.png', 'Comedor', ['comedor', 'dining']),
    sd('lights-office.png', 'Oficina', ['oficina', 'office', 'estudio']),
    sd('lights-gaming.png', 'Gaming', ['gaming', 'juegos', 'gamer']),
    sd('lights-garden.png', 'Jardín', ['jardin', 'garden', 'exterior']),
    sd('lights-hallway.png', 'Pasillo', ['pasillo', 'hallway']),
    sd('lights-staircase.png', 'Escalera', ['escalera', 'staircase']),
    sd('lights-room.png', 'Habitación', ['habitacion', 'room', 'cuarto']),
    sd('lights-rgb[on].png', 'RGB On', ['rgb', 'led', 'color', 'on']),
    sd('lights-rgb[off].png', 'RGB Off', ['rgb', 'led', 'color', 'off']),
    sd('lights-scene-bright.png', 'Escena Brillante', [
      'escena',
      'brillante',
      'bright',
      'claro',
    ]),
    sd('lights-scene-dark.png', 'Escena Oscura', [
      'escena',
      'oscura',
      'dark',
      'oscuro',
    ]),
    sd('lights-scene-streaming.png', 'Escena Streaming', [
      'escena',
      'streaming',
      'directo',
    ]),
    sd('lights-hue-sync.png', 'Hue Sync', [
      'hue',
      'sync',
      'philips',
      'sincronizar',
    ]),
    sd('lights-hue-sync[on].png', 'Hue Sync On', [
      'hue',
      'sync',
      'philips',
      'on',
    ]),
    sd('lights-hue-sync[off].png', 'Hue Sync Off', [
      'hue',
      'sync',
      'philips',
      'off',
    ]),
    sd('lights-blank[on].png', 'Blanco On', ['blanco', 'blank', 'luz', 'on']),
    sd('lights-blank[off].png', 'Blanco Off', [
      'blanco',
      'blank',
      'luz',
      'off',
    ]),
  ],
  'SD Apps': [
    sd('apps-chrome.png', 'Chrome', [
      'chrome',
      'navegador',
      'browser',
      'google',
    ]),
    sd('apps-discord.png', 'Discord', ['discord', 'chat', 'voip']),
    sd('apps-edge.png', 'Edge', ['edge', 'navegador', 'browser', 'microsoft']),
    sd('apps-obs.png', 'OBS', ['obs', 'streaming', 'grabacion', 'studio']),
    sd('apps-steam.png', 'Steam', ['steam', 'juegos', 'games', 'valve']),
    sd('apps-music-player.png', 'Reproductor', [
      'reproductor',
      'music',
      'player',
      'musica',
    ]),
    sd('apps-philips-hue.png', 'Philips Hue', [
      'philips',
      'hue',
      'luces',
      'smart home',
    ]),
    sd('apps-streamerbot.png', 'Streamer.bot', [
      'streamerbot',
      'bot',
      'automatizar',
    ]),
    sd('apps-apps[on].png', 'Apps On', ['apps', 'aplicaciones', 'on']),
    sd('apps-apps[off].png', 'Apps Off', ['apps', 'aplicaciones', 'off']),
    sd('apps-blank.png', 'Blanco', ['blanco', 'blank', 'app', 'vacio']),
  ],
}

const iconCategories = computed<Record<string, IconItem[]>>(() => ({
  Multimedia: [
    { icon: '🎵', label: 'Música' },
    { icon: '🔊', label: 'Volumen Alto' },
    { icon: '🔉', label: 'Volumen Medio' },
    { icon: '🔇', label: 'Silencio' },
    { icon: '⏯️', label: 'Play/Pausa' },
    { icon: '⏸️', label: 'Pausa' },
    { icon: '▶️', label: 'Play' },
    { icon: '⏹️', label: 'Stop' },
    { icon: '⏭️', label: 'Siguiente' },
    { icon: '⏮️', label: 'Anterior' },
    { icon: '🎧', label: 'Audífonos' },
    { icon: '🎤', label: 'Micrófono' },
    { icon: '🎬', label: 'Video' },
    { icon: '📹', label: 'Cámara' },
  ],
  Aplicaciones: [
    { icon: '🌐', label: 'Navegador' },
    { icon: '📧', label: 'Email' },
    { icon: '💬', label: 'Chat' },
    { icon: '📱', label: 'Teléfono' },
    { icon: '💻', label: 'Computadora' },
    { icon: '🖥️', label: 'Monitor' },
    { icon: '⌨️', label: 'Teclado' },
    { icon: '🖱️', label: 'Mouse' },
    { icon: '📁', label: 'Carpeta' },
    { icon: '📂', label: 'Carpeta Abierta' },
    { icon: '📄', label: 'Documento' },
    { icon: '📊', label: 'Gráfico' },
    { icon: '🎮', label: 'Juego' },
    { icon: '🎯', label: 'Objetivo' },
  ],
  Acciones: [
    { icon: '✅', label: 'Confirmado' },
    { icon: '❌', label: 'Cancelar' },
    { icon: '⚙️', label: 'Configuración' },
    { icon: '🔧', label: 'Herramientas' },
    { icon: '🔨', label: 'Martillo' },
    { icon: '🗑️', label: 'Eliminar' },
    { icon: '📌', label: 'Pin' },
    { icon: '🔖', label: 'Marcador' },
    { icon: '💾', label: 'Guardar' },
    { icon: '📥', label: 'Descargar' },
    { icon: '📤', label: 'Subir' },
    { icon: '🔄', label: 'Actualizar' },
    { icon: '🔍', label: 'Buscar' },
    { icon: '➕', label: 'Agregar' },
    { icon: '➖', label: 'Quitar' },
  ],
  FontAwesome: [
    { icon: 'fas fa-house', label: 'Casa', isFontAwesome: true },
    { icon: 'fas fa-music', label: 'Música', isFontAwesome: true },
    { icon: 'fas fa-video', label: 'Video', isFontAwesome: true },
    { icon: 'fas fa-microphone', label: 'Micrófono', isFontAwesome: true },
    { icon: 'fas fa-volume-high', label: 'Volumen Alto', isFontAwesome: true },
    { icon: 'fas fa-volume-low', label: 'Volumen Bajo', isFontAwesome: true },
    { icon: 'fas fa-volume-xmark', label: 'Silencio', isFontAwesome: true },
    { icon: 'fas fa-play', label: 'Play', isFontAwesome: true },
    { icon: 'fas fa-pause', label: 'Pausa', isFontAwesome: true },
    { icon: 'fas fa-stop', label: 'Stop', isFontAwesome: true },
    { icon: 'fas fa-forward', label: 'Siguiente', isFontAwesome: true },
    { icon: 'fas fa-backward', label: 'Anterior', isFontAwesome: true },
    { icon: 'fas fa-gamepad', label: 'Juego', isFontAwesome: true },
    { icon: 'fas fa-headphones', label: 'Audífonos', isFontAwesome: true },
    { icon: 'fas fa-camera', label: 'Cámara', isFontAwesome: true },
    { icon: 'fas fa-display', label: 'Monitor', isFontAwesome: true },
    { icon: 'fas fa-laptop', label: 'Laptop', isFontAwesome: true },
    { icon: 'fas fa-keyboard', label: 'Teclado', isFontAwesome: true },
    { icon: 'fas fa-mouse', label: 'Mouse', isFontAwesome: true },
    { icon: 'fas fa-power-off', label: 'Apagar', isFontAwesome: true },
    { icon: 'fas fa-gear', label: 'Configuración', isFontAwesome: true },
    { icon: 'fas fa-wifi', label: 'WiFi', isFontAwesome: true },
    { icon: 'fas fa-bluetooth', label: 'Bluetooth', isFontAwesome: true },
    { icon: 'fas fa-folder', label: 'Carpeta', isFontAwesome: true },
    {
      icon: 'fas fa-folder-open',
      label: 'Carpeta Abierta',
      isFontAwesome: true,
    },
    { icon: 'fas fa-file', label: 'Archivo', isFontAwesome: true },
    { icon: 'fas fa-download', label: 'Descargar', isFontAwesome: true },
    { icon: 'fas fa-upload', label: 'Subir', isFontAwesome: true },
    { icon: 'fas fa-trash', label: 'Eliminar', isFontAwesome: true },
    { icon: 'fas fa-pen', label: 'Editar', isFontAwesome: true },
    { icon: 'fas fa-save', label: 'Guardar', isFontAwesome: true },
    { icon: 'fas fa-magnifying-glass', label: 'Buscar', isFontAwesome: true },
    { icon: 'fas fa-star', label: 'Estrella', isFontAwesome: true },
    { icon: 'fas fa-heart', label: 'Corazón', isFontAwesome: true },
    { icon: 'fas fa-bolt', label: 'Rayo', isFontAwesome: true },
    { icon: 'fas fa-fire', label: 'Fuego', isFontAwesome: true },
    { icon: 'fas fa-rocket', label: 'Cohete', isFontAwesome: true },
    { icon: 'fas fa-bell', label: 'Campana', isFontAwesome: true },
    { icon: 'fas fa-envelope', label: 'Email', isFontAwesome: true },
    { icon: 'fas fa-comment', label: 'Comentario', isFontAwesome: true },
    { icon: 'fas fa-phone', label: 'Teléfono', isFontAwesome: true },
    { icon: 'fas fa-globe', label: 'Navegador', isFontAwesome: true },
    { icon: 'fas fa-link', label: 'Enlace', isFontAwesome: true },
    { icon: 'fas fa-lock', label: 'Bloqueado', isFontAwesome: true },
    { icon: 'fas fa-unlock', label: 'Desbloqueado', isFontAwesome: true },
    { icon: 'fas fa-user', label: 'Usuario', isFontAwesome: true },
    { icon: 'fas fa-users', label: 'Usuarios', isFontAwesome: true },
    { icon: 'fas fa-circle-check', label: 'Confirmado', isFontAwesome: true },
    { icon: 'fas fa-circle-xmark', label: 'Cancelar', isFontAwesome: true },
    { icon: 'fas fa-lightbulb', label: 'Idea', isFontAwesome: true },
    { icon: 'fas fa-sun', label: 'Sol', isFontAwesome: true },
    { icon: 'fas fa-moon', label: 'Luna', isFontAwesome: true },
    { icon: 'fas fa-cloud', label: 'Nube', isFontAwesome: true },
    { icon: 'fas fa-rotate', label: 'Actualizar', isFontAwesome: true },
    { icon: 'fas fa-arrows-rotate', label: 'Sincronizar', isFontAwesome: true },
    { icon: 'fab fa-discord', label: 'Discord', isFontAwesome: true },
    { icon: 'fab fa-spotify', label: 'Spotify', isFontAwesome: true },
    { icon: 'fab fa-steam', label: 'Steam', isFontAwesome: true },
    { icon: 'fab fa-twitch', label: 'Twitch', isFontAwesome: true },
    { icon: 'fab fa-youtube', label: 'YouTube', isFontAwesome: true },
    { icon: 'fab fa-twitter', label: 'Twitter', isFontAwesome: true },
    { icon: 'fab fa-github', label: 'GitHub', isFontAwesome: true },
    { icon: 'fab fa-chrome', label: 'Chrome', isFontAwesome: true },
    { icon: 'fab fa-firefox-browser', label: 'Firefox', isFontAwesome: true },
    { icon: 'fab fa-opera', label: 'Opera', isFontAwesome: true },
    { icon: 'fab fa-edge', label: 'Edge', isFontAwesome: true },
    { icon: 'fab fa-safari', label: 'Safari', isFontAwesome: true },
    { icon: 'fab fa-brave', label: 'Brave', isFontAwesome: true },
    { icon: 'fab fa-windows', label: 'Windows', isFontAwesome: true },
    { icon: 'fab fa-apple', label: 'Apple', isFontAwesome: true },
    { icon: 'fab fa-linux', label: 'Linux', isFontAwesome: true },
    { icon: 'fab fa-microsoft', label: 'Microsoft', isFontAwesome: true },
    { icon: 'fas fa-file-word', label: 'Word', isFontAwesome: true },
    { icon: 'fas fa-file-excel', label: 'Excel', isFontAwesome: true },
    {
      icon: 'fas fa-file-powerpoint',
      label: 'PowerPoint',
      isFontAwesome: true,
    },
    { icon: 'fas fa-envelope', label: 'Outlook', isFontAwesome: true },
    { icon: 'fas fa-sticky-note', label: 'OneNote', isFontAwesome: true },
    { icon: 'fas fa-database', label: 'Access', isFontAwesome: true },
    { icon: 'fas fa-users', label: 'Teams', isFontAwesome: true },
  ],
  PrimeIcons: [
    { icon: 'pi pi-home', label: 'Home', isPrime: true },
    { icon: 'pi pi-star', label: 'Estrella', isPrime: true },
    { icon: 'pi pi-heart', label: 'Corazón', isPrime: true },
    { icon: 'pi pi-bolt', label: 'Rayo', isPrime: true },
    { icon: 'pi pi-play', label: 'Play', isPrime: true },
    { icon: 'pi pi-pause', label: 'Pausa', isPrime: true },
    { icon: 'pi pi-volume-up', label: 'Volumen', isPrime: true },
    { icon: 'pi pi-volume-down', label: 'Bajar Volumen', isPrime: true },
    { icon: 'pi pi-volume-off', label: 'Sin Volumen', isPrime: true },
    { icon: 'pi pi-cog', label: 'Configuración', isPrime: true },
    { icon: 'pi pi-power-off', label: 'Apagar', isPrime: true },
    { icon: 'pi pi-wifi', label: 'WiFi', isPrime: true },
    { icon: 'pi pi-desktop', label: 'Escritorio', isPrime: true },
    { icon: 'pi pi-mobile', label: 'Móvil', isPrime: true },
    { icon: 'pi pi-folder', label: 'Carpeta', isPrime: true },
    { icon: 'pi pi-download', label: 'Descargar', isPrime: true },
    { icon: 'pi pi-upload', label: 'Subir', isPrime: true },
    { icon: 'pi pi-refresh', label: 'Actualizar', isPrime: true },
    { icon: 'pi pi-search', label: 'Buscar', isPrime: true },
    { icon: 'pi pi-times', label: 'Cerrar', isPrime: true },
    { icon: 'pi pi-check', label: 'Check', isPrime: true },
    { icon: 'pi pi-trash', label: 'Basura', isPrime: true },
  ],
  ...(customSvgIcons.length > 0 && {
    'Custom SVG': customSvgIcons,
  }),
  ...(customUserIcons.value.length > 0 && {
    'Mis Iconos': customUserIcons.value,
  }),
  ...streamDeckCategories,
  Símbolos: [
    { icon: '⭐', label: 'Estrella' },
    { icon: '❤️', label: 'Corazón' },
    { icon: '💡', label: 'Idea' },
    { icon: '🔥', label: 'Fuego' },
    { icon: '⚡', label: 'Rayo' },
    { icon: '🚀', label: 'Cohete' },
    { icon: '🎨', label: 'Arte' },
    { icon: '📸', label: 'Foto' },
    { icon: '🔔', label: 'Campana' },
    { icon: '⏰', label: 'Alarma' },
    { icon: '🌙', label: 'Luna' },
    { icon: '☀️', label: 'Sol' },
    { icon: '🌟', label: 'Brillante' },
    { icon: '💫', label: 'Destello' },
  ],
}))

const filteredIcons = computed(() => {
  if (!searchQuery.value.trim()) {
    return iconCategories.value
  }

  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, IconItem[]> = {}

  Object.entries(iconCategories.value).forEach(([category, icons]) => {
    const matchingIcons = icons.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.icon.toLowerCase().includes(query) ||
        item.keywords?.some((kw) => kw.includes(query)),
    )
    if (matchingIcons.length > 0) {
      filtered[category] = matchingIcons
    }
  })

  return filtered
})

const selectIcon = (icon: string) => {
  console.log('Emitting icon:', icon)
  emit('select', icon)
}
</script>

<template>
  <div v-if="show" class="icon-picker-overlay" @click="emit('close')">
    <div class="icon-picker" @click.stop>
      <div class="picker-header">
        <h3>Seleccionar Icono</h3>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>

      <div class="picker-search">
        <i class="pi pi-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar icono..."
          class="search-input"
        />
      </div>

      <!-- Upload custom icons -->
      <div class="upload-section">
        <input
          ref="fileInput"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp"
          multiple
          style="display: none"
          @change="handleUpload"
        />
        <button
          class="upload-btn"
          @click="fileInput?.click()"
          :disabled="isUploading"
        >
          <i
            class="pi"
            :class="isUploading ? 'pi-spin pi-spinner' : 'pi-upload'"
          ></i>
          {{ isUploading ? 'Subiendo...' : 'Subir Icono Personalizado' }}
        </button>
      </div>

      <div class="picker-content">
        <div v-if="Object.keys(filteredIcons).length === 0" class="no-results">
          <i class="pi pi-search" style="font-size: 2rem; opacity: 0.3"></i>
          <p>No se encontraron iconos</p>
        </div>
        <div
          v-for="(icons, category) in filteredIcons"
          :key="category"
          class="icon-category"
        >
          <h4 class="category-title">{{ category }} ({{ icons.length }})</h4>
          <div class="icons-grid">
            <button
              v-for="item in icons"
              :key="item.icon"
              class="icon-item"
              :class="{ active: currentIcon === item.icon }"
              @click.stop="selectIcon(item.icon)"
              :title="item.label"
              type="button"
            >
              <img
                v-if="item.isCustom"
                :src="'./icons/' + item.icon.replace('svg:', '')"
                class="custom-icon-preview"
                :alt="item.label"
              />
              <img
                v-else-if="item.isUserCustom"
                :src="
                  serverUrlStore.serverUrl +
                  '/custom-icons/' +
                  item.icon.replace('custom:', '')
                "
                class="custom-icon-preview"
                :alt="item.label"
              />
              <img
                v-else-if="item.isStreamDeck"
                :src="'./streamdeck-icons/' + item.icon.replace('sd:', '')"
                class="custom-icon-preview"
                :alt="item.label"
              />
              <i
                v-else-if="item.isPrime || item.isFontAwesome"
                :class="item.icon"
              ></i>
              <span v-else class="emoji-icon">{{ item.icon }}</span>
              <span class="icon-label">{{ item.label }}</span>
              <span
                v-if="item.isUserCustom"
                class="delete-icon-btn"
                @click.stop="deleteCustomIcon(item)"
                title="Eliminar icono"
                >✕</span
              >
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

.icon-picker {
  background: var(--edit-bg-color);
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  max-height: 85dvh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.picker-header h3 {
  margin: 0;
  font-size: 1.3rem;
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

.picker-search {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
}

.picker-search i {
  color: var(--edit-text-color);
  font-size: 1.1rem;
}

.search-input {
  flex: 1;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  color: var(--form-text-color);
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(139, 92, 246, 0.5);
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.icon-category {
  margin-bottom: 28px;
}

.icon-category:last-child {
  margin-bottom: 0;
}

.category-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--edit-text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}

.icon-item {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px;
}

@media (hover: hover) {
  .icon-item:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateY(-2px);
  }
}

.icon-item.active {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

.icon-item i {
  font-size: 1.8rem;
  color: var(--edit-text-color);
}

.custom-icon-preview {
  width: 1.8rem;
  height: 1.8rem;
  object-fit: contain;
}

.emoji-icon {
  font-size: 2rem;
  line-height: 1;
}

.icon-label {
  font-size: 0.7rem;
  color: var(--edit-text-color);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--edit-text-color);
  text-align: center;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: var(--form-bg-color);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Upload section */
.upload-section {
  padding: 8px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.upload-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: rgba(102, 126, 234, 0.15);
  border: 1px dashed rgba(102, 126, 234, 0.4);
  border-radius: 10px;
  color: #8ea4f0;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (hover: hover) {
  .upload-btn:hover:not(:disabled) {
    background: rgba(102, 126, 234, 0.25);
    border-color: rgba(102, 126, 234, 0.6);
  }
}

/* Delete icon button */
.icon-item {
  position: relative;
}

.delete-icon-btn {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(220, 50, 50, 0.85);
  color: white;
  border-radius: 50%;
  font-size: 9px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;
}

@media (hover: hover) {
  .icon-item:hover .delete-icon-btn {
    opacity: 1;
  }
}

/* Always show on touch devices */
@media (hover: none) {
  .delete-icon-btn {
    opacity: 1;
  }
}
</style>
