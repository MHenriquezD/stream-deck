<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useServerUrlStore } from '../store/serverUrl.store'

interface IconItem {
  icon: string
  label: string
  keywords?: string[]
  isIconify?: boolean
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
const activeIconCategory = ref<string | null>(null)
const serverUrlStore = useServerUrlStore()
const { getAuthHeaders } = useAuth()
const customUserIcons = ref<IconItem[]>([])
const isUploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const fetchCustomIcons = async () => {
  try {
    const res = await fetch(
      `${serverUrlStore.serverUrl}/command/custom-icons`,
      { headers: { ...getAuthHeaders() } },
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
      { method: 'DELETE', headers: { ...getAuthHeaders() } },
    )
    await fetchCustomIcons()
  } catch (e) {
    console.warn('Error deleting icon:', e)
  }
}

watch(() => props.show, (val) => { if (val) fetchCustomIcons() })
onMounted(() => { if (props.show) fetchCustomIcons() })

const customSvgFiles = [
  'brave.svg', 'brave-circle.svg', 'chrome.svg', 'Disney_logo.svg',
  'epic-games-round.svg', 'epicgames.svg', 'excel.svg', 'gog.svg',
  'minecraft.svg', 'netflix.svg', 'netflix-letters.svg', 'opera.svg',
  'opera-gx.svg', 'outlook.svg', 'powerpoint.svg', 'spotify.svg',
  'store-microsoft.svg', 'whatsapp.svg', 'word.svg', 'xbox.svg',
  'xbox-logo.svg', 'youtube.svg', 'youtube-large.svg', 'hbo-max.svg',
  'discord.svg', 'discord-circle.svg', 'edge.svg', 'firefox.svg',
  'vscode.svg', 'crunchyroll.svg',
]

const customSvgIcons: IconItem[] = customSvgFiles.map((filename) => {
  const label = filename.replace('.svg', '').split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  return { icon: `svg:${filename}`, label, isCustom: true }
})

const sd = (file: string, label: string, keywords: string[]): IconItem => ({
  icon: `sd:${file}`, label, keywords, isStreamDeck: true,
})

const streamDeckCategories: Record<string, IconItem[]> = {
  'SD Música': [
    sd('music-music.png', 'Música', ['musica', 'music', 'nota']),
    sd('music-music[on].png', 'Música On', ['musica', 'music', 'on']),
    sd('music-music-play.png', 'Play', ['play', 'reproducir', 'musica']),
    sd('music-music-pause.png', 'Pausa', ['pausa', 'pause', 'musica']),
    sd('music-music-next.png', 'Siguiente', ['siguiente', 'next', 'cancion']),
    sd('music-music-prev.png', 'Anterior', ['anterior', 'previous', 'prev']),
    sd('music-music-volume-up.png', 'Volumen +', ['volumen', 'subir', 'volume', 'up']),
    sd('music-music-volume-down.png', 'Volumen -', ['volumen', 'bajar', 'volume', 'down']),
    sd('music-music-mute.png', 'Silenciar', ['silencio', 'mute', 'volumen']),
    sd('music-music-repeat.png', 'Repetir', ['repetir', 'repeat', 'loop']),
    sd('music-music-repeat-all.png', 'Repetir Todo', ['repetir', 'repeat', 'all', 'todo']),
    sd('music-music-repeat-off.png', 'No Repetir', ['repetir', 'repeat', 'off']),
    sd('music-music-shuffle.png', 'Aleatorio', ['aleatorio', 'shuffle', 'random', 'mezclar']),
    sd('music-blank.png', 'Blanco', ['blanco', 'blank', 'vacio']),
  ],
  'SD Streaming': [
    sd('streaming-streaming[on].png', 'Streaming On', ['streaming', 'directo', 'live', 'on']),
    sd('streaming-streaming[off].png', 'Streaming Off', ['streaming', 'directo', 'off']),
    sd('streaming-twitch[on].png', 'Twitch On', ['twitch', 'on', 'live']),
    sd('streaming-twitch[off].png', 'Twitch Off', ['twitch', 'off']),
    sd('streaming-youtube[on].png', 'YouTube On', ['youtube', 'on', 'live']),
    sd('streaming-youtube[off].png', 'YouTube Off', ['youtube', 'off']),
    sd('streaming-kick[on].png', 'Kick On', ['kick', 'on', 'live']),
    sd('streaming-kick[off].png', 'Kick Off', ['kick', 'off']),
    sd('streaming-record[on].png', 'Grabar On', ['grabar', 'record', 'on', 'grabando']),
    sd('streaming-record[off].png', 'Grabar Off', ['grabar', 'record', 'off']),
    sd('streaming-generic[on].png', 'Genérico On', ['streaming', 'generico', 'on']),
    sd('streaming-generic[off].png', 'Genérico Off', ['streaming', 'generico', 'off']),
  ],
  'SD Escenas': [
    sd('scenes-scenes[on].png', 'Escenas On', ['escenas', 'scenes', 'on']),
    sd('scenes-scenes[off].png', 'Escenas Off', ['escenas', 'scenes', 'off']),
    sd('scenes-gameplay[on].png', 'Gameplay On', ['gameplay', 'juego', 'game', 'on']),
    sd('scenes-gameplay[off].png', 'Gameplay Off', ['gameplay', 'juego', 'game', 'off']),
    sd('scenes-brb[on].png', 'BRB On', ['brb', 'vuelvo', 'break', 'on']),
    sd('scenes-brb[off].png', 'BRB Off', ['brb', 'vuelvo', 'break', 'off']),
    sd('scenes-starting[on].png', 'Inicio On', ['inicio', 'starting', 'comenzar', 'on']),
    sd('scenes-starting[off].png', 'Inicio Off', ['inicio', 'starting', 'off']),
    sd('scenes-ended[on].png', 'Fin On', ['fin', 'ended', 'final', 'on']),
    sd('scenes-ended[off].png', 'Fin Off', ['fin', 'ended', 'final', 'off']),
    sd('scenes-coding[on].png', 'Coding On', ['coding', 'codigo', 'programar', 'on']),
    sd('scenes-coding[off].png', 'Coding Off', ['coding', 'codigo', 'programar', 'off']),
    sd('scenes-generic[on].png', 'Genérico On', ['escena', 'generico', 'on']),
    sd('scenes-generic[off].png', 'Genérico Off', ['escena', 'generico', 'off']),
    sd('scenes-overhead[on].png', 'Cenital On', ['cenital', 'overhead', 'camara', 'on']),
    sd('scenes-overhead[off].png', 'Cenital Off', ['cenital', 'overhead', 'camara', 'off']),
    sd('scenes-pov[on].png', 'POV On', ['pov', 'primera persona', 'on']),
    sd('scenes-pov[off].png', 'POV Off', ['pov', 'primera persona', 'off']),
    sd('scenes-supporters[on].png', 'Supporters On', ['supporters', 'donaciones', 'on']),
    sd('scenes-supporters[off].png', 'Supporters Off', ['supporters', 'donaciones', 'off']),
    sd('scenes-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('scenes-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Fuentes OBS': [
    sd('sources-facecam[on].png', 'Webcam On', ['webcam', 'facecam', 'camara', 'on']),
    sd('sources-facecam[off].png', 'Webcam Off', ['webcam', 'facecam', 'camara', 'off']),
    sd('sources-chat[on].png', 'Chat On', ['chat', 'mensajes', 'on']),
    sd('sources-chat[off].png', 'Chat Off', ['chat', 'mensajes', 'off']),
    sd('sources-overlay[on].png', 'Overlay On', ['overlay', 'superposicion', 'on']),
    sd('sources-overlay[off].png', 'Overlay Off', ['overlay', 'superposicion', 'off']),
    sd('sources-logo[on].png', 'Logo On', ['logo', 'marca', 'on']),
    sd('sources-logo[off].png', 'Logo Off', ['logo', 'marca', 'off']),
    sd('sources-pip[on].png', 'PIP On', ['pip', 'picture', 'imagen', 'on']),
    sd('sources-pip[off].png', 'PIP Off', ['pip', 'picture', 'imagen', 'off']),
    sd('sources-subscribe[on].png', 'Suscribir On', ['subscribe', 'suscribir', 'on']),
    sd('sources-subscribe[off].png', 'Suscribir Off', ['subscribe', 'suscribir', 'off']),
    sd('sources-generic[on].png', 'Genérico On', ['fuente', 'source', 'generico', 'on']),
    sd('sources-generic[off].png', 'Genérico Off', ['fuente', 'source', 'generico', 'off']),
    sd('sources-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('sources-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Controles': [
    sd('settings-arrow-up.png', 'Flecha Arriba', ['flecha', 'arrow', 'arriba', 'up']),
    sd('settings-arrow-down.png', 'Flecha Abajo', ['flecha', 'arrow', 'abajo', 'down']),
    sd('settings-arrow-left.png', 'Flecha Izquierda', ['flecha', 'arrow', 'izquierda', 'left']),
    sd('settings-arrow-right.png', 'Flecha Derecha', ['flecha', 'arrow', 'derecha', 'right']),
    sd('settings-audio.png', 'Audio', ['audio', 'sonido', 'sound']),
    sd('settings-back.png', 'Atrás', ['atras', 'back', 'volver']),
    sd('settings-brightness-high.png', 'Brillo Alto', ['brillo', 'brightness', 'alto', 'high']),
    sd('settings-brightness-low.png', 'Brillo Bajo', ['brillo', 'brightness', 'bajo', 'low']),
    sd('settings-camera.png', 'Cámara', ['camara', 'camera', 'foto']),
    sd('settings-camera-generic[on].png', 'Cámara On', ['camara', 'camera', 'on']),
    sd('settings-camera-generic[off].png', 'Cámara Off', ['camara', 'camera', 'off']),
    sd('settings-cancel.png', 'Cancelar', ['cancelar', 'cancel', 'no']),
    sd('settings-ok.png', 'OK', ['ok', 'aceptar', 'confirmar', 'si']),
    sd('settings-enter.png', 'Enter', ['enter', 'entrar', 'aceptar']),
    sd('settings-escape.png', 'Escape', ['escape', 'esc', 'salir']),
    sd('settings-exit.png', 'Salir', ['salir', 'exit', 'cerrar']),
    sd('settings-mic[on].png', 'Micrófono On', ['microfono', 'mic', 'on']),
    sd('settings-mic[off].png', 'Micrófono Off', ['microfono', 'mic', 'off', 'mudo']),
    sd('settings-mic-monitor[on].png', 'Monitor Mic On', ['monitor', 'microfono', 'mic', 'on']),
    sd('settings-mic-monitor[off].png', 'Monitor Mic Off', ['monitor', 'microfono', 'mic', 'off']),
    sd('settings-discord-mic[on].png', 'Discord Mic On', ['discord', 'microfono', 'mic', 'on']),
    sd('settings-discord-mic[off].png', 'Discord Mic Off', ['discord', 'microfono', 'mic', 'off']),
    sd('settings-deafen[on].png', 'Ensordecer On', ['ensordecer', 'deafen', 'discord', 'on']),
    sd('settings-deafen[off].png', 'Ensordecer Off', ['ensordecer', 'deafen', 'discord', 'off']),
    sd('settings-power.png', 'Apagar', ['apagar', 'power', 'encender']),
    sd('settings-restart.png', 'Reiniciar', ['reiniciar', 'restart', 'reboot']),
    sd('settings-save-replay.png', 'Guardar Replay', ['guardar', 'replay', 'save', 'repeticion']),
    sd('settings-screenshot.png', 'Captura', ['captura', 'screenshot', 'pantalla', 'foto']),
    sd('settings-settings.png', 'Configuración', ['configuracion', 'settings', 'ajustes']),
    sd('settings-settings[on].png', 'Configuración On', ['configuracion', 'settings', 'on']),
    sd('settings-system-volume-up.png', 'Vol. Sistema +', ['volumen', 'sistema', 'system', 'subir']),
    sd('settings-system-volume-down.png', 'Vol. Sistema -', ['volumen', 'sistema', 'system', 'bajar']),
    sd('settings-system-volume-mute.png', 'Silenciar Sistema', ['silencio', 'sistema', 'system', 'mute']),
    sd('settings-generic-volume-up.png', 'Volumen +', ['volumen', 'subir', 'volume', 'up']),
    sd('settings-generic-volume-down.png', 'Volumen -', ['volumen', 'bajar', 'volume', 'down']),
    sd('settings-volume[on].png', 'Volumen On', ['volumen', 'volume', 'on']),
    sd('settings-volume[off].png', 'Volumen Off', ['volumen', 'volume', 'off', 'silencio']),
    sd('settings-obs-preview[on].png', 'OBS Preview On', ['obs', 'preview', 'vista previa', 'on']),
    sd('settings-obs-preview[off].png', 'OBS Preview Off', ['obs', 'preview', 'vista previa', 'off']),
    sd('settings-push-to-talk[on].png', 'Push to Talk On', ['push', 'talk', 'hablar', 'ptt', 'on']),
    sd('settings-push-to-talk[off].png', 'Push to Talk Off', ['push', 'talk', 'hablar', 'ptt', 'off']),
    sd('settings-win.png', 'Windows', ['windows', 'win', 'inicio', 'start']),
    sd('settings-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('settings-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
    sd('generic-back.png', 'Atrás', ['atras', 'back', 'volver', 'regresar']),
    sd('generic-folder.png', 'Carpeta', ['carpeta', 'folder', 'directorio']),
    sd('generic-blank[on].png', 'Blanco On', ['blanco', 'blank', 'on']),
    sd('generic-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'off']),
  ],
  'SD Luces': [
    sd('lights-light-bulb[on].png', 'Bombilla On', ['bombilla', 'luz', 'light', 'bulb', 'on']),
    sd('lights-light-bulb[off].png', 'Bombilla Off', ['bombilla', 'luz', 'light', 'bulb', 'off']),
    sd('lights-lights[on].png', 'Luces On', ['luces', 'lights', 'on']),
    sd('lights-lights[off].png', 'Luces Off', ['luces', 'lights', 'off']),
    sd('lights-general-brightness-up.png', 'Brillo +', ['brillo', 'brightness', 'subir', 'up']),
    sd('lights-general-brightness-down.png', 'Brillo -', ['brillo', 'brightness', 'bajar', 'down']),
    sd('lights-day-night.png', 'Día/Noche', ['dia', 'noche', 'day', 'night']),
    sd('lights-bedroom.png', 'Dormitorio', ['dormitorio', 'bedroom', 'cuarto', 'habitacion']),
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
    sd('lights-scene-bright.png', 'Escena Brillante', ['escena', 'brillante', 'bright', 'claro']),
    sd('lights-scene-dark.png', 'Escena Oscura', ['escena', 'oscura', 'dark', 'oscuro']),
    sd('lights-scene-streaming.png', 'Escena Streaming', ['escena', 'streaming', 'directo']),
    sd('lights-hue-sync.png', 'Hue Sync', ['hue', 'sync', 'philips', 'sincronizar']),
    sd('lights-hue-sync[on].png', 'Hue Sync On', ['hue', 'sync', 'philips', 'on']),
    sd('lights-hue-sync[off].png', 'Hue Sync Off', ['hue', 'sync', 'philips', 'off']),
    sd('lights-blank[on].png', 'Blanco On', ['blanco', 'blank', 'luz', 'on']),
    sd('lights-blank[off].png', 'Blanco Off', ['blanco', 'blank', 'luz', 'off']),
  ],
  'SD Apps': [
    sd('apps-chrome.png', 'Chrome', ['chrome', 'navegador', 'browser', 'google']),
    sd('apps-discord.png', 'Discord', ['discord', 'chat', 'voip']),
    sd('apps-edge.png', 'Edge', ['edge', 'navegador', 'browser', 'microsoft']),
    sd('apps-obs.png', 'OBS', ['obs', 'streaming', 'grabacion', 'studio']),
    sd('apps-steam.png', 'Steam', ['steam', 'juegos', 'games', 'valve']),
    sd('apps-music-player.png', 'Reproductor', ['reproductor', 'music', 'player', 'musica']),
    sd('apps-philips-hue.png', 'Philips Hue', ['philips', 'hue', 'luces', 'smart home']),
    sd('apps-streamerbot.png', 'Streamer.bot', ['streamerbot', 'bot', 'automatizar']),
    sd('apps-apps[on].png', 'Apps On', ['apps', 'aplicaciones', 'on']),
    sd('apps-apps[off].png', 'Apps Off', ['apps', 'aplicaciones', 'off']),
    sd('apps-blank.png', 'Blanco', ['blanco', 'blank', 'app', 'vacio']),
  ],
}

const iconCategories = computed<Record<string, IconItem[]>>(() => ({
  Multimedia: [
    { icon: 'mdi:music-note', label: 'Música', isIconify: true }, { icon: 'mdi:volume-high', label: 'Volumen Alto', isIconify: true },
    { icon: 'mdi:volume-medium', label: 'Volumen Medio', isIconify: true }, { icon: 'mdi:volume-off', label: 'Silencio', isIconify: true },
    { icon: 'mdi:play-pause', label: 'Play/Pausa', isIconify: true }, { icon: 'mdi:pause', label: 'Pausa', isIconify: true },
    { icon: 'mdi:play', label: 'Play', isIconify: true }, { icon: 'mdi:stop', label: 'Stop', isIconify: true },
    { icon: 'mdi:skip-next', label: 'Siguiente', isIconify: true }, { icon: 'mdi:skip-previous', label: 'Anterior', isIconify: true },
    { icon: 'mdi:headphones', label: 'Audífonos', isIconify: true }, { icon: 'mdi:microphone', label: 'Micrófono', isIconify: true },
    { icon: 'mdi:movie', label: 'Video', isIconify: true }, { icon: 'mdi:video', label: 'Cámara', isIconify: true },
  ],
  Aplicaciones: [
    { icon: 'mdi:web', label: 'Navegador', isIconify: true }, { icon: 'mdi:email', label: 'Email', isIconify: true },
    { icon: 'mdi:chat', label: 'Chat', isIconify: true }, { icon: 'mdi:cellphone', label: 'Teléfono', isIconify: true },
    { icon: 'mdi:desktop-classic', label: 'Computadora', isIconify: true }, { icon: 'mdi:monitor', label: 'Monitor', isIconify: true },
    { icon: 'mdi:keyboard', label: 'Teclado', isIconify: true }, { icon: 'mdi:mouse', label: 'Mouse', isIconify: true },
    { icon: 'mdi:folder', label: 'Carpeta', isIconify: true }, { icon: 'mdi:folder-open', label: 'Carpeta Abierta', isIconify: true },
    { icon: 'mdi:file-document', label: 'Documento', isIconify: true }, { icon: 'mdi:chart-bar', label: 'Gráfico', isIconify: true },
    { icon: 'mdi:gamepad-variant', label: 'Juego', isIconify: true }, { icon: 'mdi:target', label: 'Objetivo', isIconify: true },
  ],
  Acciones: [
    { icon: 'mdi:check-circle', label: 'Confirmado', isIconify: true }, { icon: 'mdi:close-circle', label: 'Cancelar', isIconify: true },
    { icon: 'mdi:cog', label: 'Configuración', isIconify: true }, { icon: 'mdi:tools', label: 'Herramientas', isIconify: true },
    { icon: 'mdi:hammer', label: 'Martillo', isIconify: true }, { icon: 'mdi:trash-can', label: 'Eliminar', isIconify: true },
    { icon: 'mdi:pin', label: 'Pin', isIconify: true }, { icon: 'mdi:bookmark', label: 'Marcador', isIconify: true },
    { icon: 'mdi:content-save', label: 'Guardar', isIconify: true }, { icon: 'mdi:download', label: 'Descargar', isIconify: true },
    { icon: 'mdi:upload', label: 'Subir', isIconify: true }, { icon: 'mdi:refresh', label: 'Actualizar', isIconify: true },
    { icon: 'mdi:magnify', label: 'Buscar', isIconify: true }, { icon: 'mdi:plus', label: 'Agregar', isIconify: true },
    { icon: 'mdi:minus', label: 'Quitar', isIconify: true },
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
    { icon: 'fas fa-folder-open', label: 'Carpeta Abierta', isFontAwesome: true },
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
    { icon: 'fas fa-file-powerpoint', label: 'PowerPoint', isFontAwesome: true },
    { icon: 'fas fa-envelope', label: 'Outlook', isFontAwesome: true },
    { icon: 'fas fa-sticky-note', label: 'OneNote', isFontAwesome: true },
    { icon: 'fas fa-database', label: 'Access', isFontAwesome: true },
    { icon: 'fas fa-users', label: 'Teams', isFontAwesome: true },
  ],
  Iconos: [
    { icon: 'mdi:home', label: 'Home', isIconify: true },
    { icon: 'mdi:star', label: 'Estrella', isIconify: true },
    { icon: 'mdi:heart', label: 'Corazón', isIconify: true },
    { icon: 'mdi:lightning-bolt', label: 'Rayo', isIconify: true },
    { icon: 'mdi:play', label: 'Play', isIconify: true },
    { icon: 'mdi:pause', label: 'Pausa', isIconify: true },
    { icon: 'mdi:volume-high', label: 'Volumen', isIconify: true },
    { icon: 'mdi:volume-medium', label: 'Bajar Volumen', isIconify: true },
    { icon: 'mdi:volume-off', label: 'Sin Volumen', isIconify: true },
    { icon: 'mdi:cog', label: 'Configuración', isIconify: true },
    { icon: 'mdi:power', label: 'Apagar', isIconify: true },
    { icon: 'mdi:wifi', label: 'WiFi', isIconify: true },
    { icon: 'mdi:monitor', label: 'Escritorio', isIconify: true },
    { icon: 'mdi:cellphone', label: 'Móvil', isIconify: true },
    { icon: 'mdi:folder', label: 'Carpeta', isIconify: true },
    { icon: 'mdi:download', label: 'Descargar', isIconify: true },
    { icon: 'mdi:upload', label: 'Subir', isIconify: true },
    { icon: 'mdi:refresh', label: 'Actualizar', isIconify: true },
    { icon: 'mdi:magnify', label: 'Buscar', isIconify: true },
    { icon: 'mdi:close', label: 'Cerrar', isIconify: true },
    { icon: 'mdi:check', label: 'Check', isIconify: true },
    { icon: 'mdi:trash-can', label: 'Basura', isIconify: true },
  ],
  ...(customSvgIcons.length > 0 && { 'Custom SVG': customSvgIcons }),
  ...(customUserIcons.value.length > 0 && { 'Mis Iconos': customUserIcons.value }),
  ...streamDeckCategories,
  Símbolos: [
    { icon: 'mdi:star', label: 'Estrella', isIconify: true }, { icon: 'mdi:heart', label: 'Corazón', isIconify: true },
    { icon: 'mdi:lightbulb-on', label: 'Idea', isIconify: true }, { icon: 'mdi:fire', label: 'Fuego', isIconify: true },
    { icon: 'mdi:lightning-bolt', label: 'Rayo', isIconify: true }, { icon: 'mdi:rocket-launch', label: 'Cohete', isIconify: true },
    { icon: 'mdi:palette', label: 'Arte', isIconify: true }, { icon: 'mdi:camera', label: 'Foto', isIconify: true },
    { icon: 'mdi:bell', label: 'Campana', isIconify: true }, { icon: 'mdi:alarm', label: 'Alarma', isIconify: true },
    { icon: 'mdi:moon-waning-crescent', label: 'Luna', isIconify: true }, { icon: 'mdi:white-balance-sunny', label: 'Sol', isIconify: true },
    { icon: 'mdi:star-four-points', label: 'Brillante', isIconify: true }, { icon: 'mdi:shimmer', label: 'Destello', isIconify: true },
  ],
}))

const iconCategoryNames = computed(() => Object.keys(iconCategories.value))

const filteredIcons = computed(() => {
  const source = activeIconCategory.value
    ? { [activeIconCategory.value]: iconCategories.value[activeIconCategory.value] }
    : iconCategories.value
  if (!searchQuery.value.trim()) return source
  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, IconItem[]> = {}
  Object.entries(source).forEach(([category, icons]) => {
    const matching = icons.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.icon.toLowerCase().includes(query) ||
        item.keywords?.some((kw) => kw.includes(query)),
    )
    if (matching.length > 0) filtered[category] = matching
  })
  return filtered
})

const selectIcon = (icon: string) => { emit('select', icon) }
</script>

<template>
  <Transition name="picker">
  <div v-if="show" class="picker-backdrop" @click="emit('close')">
    <div class="picker-panel" @click.stop>
      <header class="picker-header">
        <h3>Seleccionar Icono</h3>
        <button @click="emit('close')" class="header-close" aria-label="Cerrar">
          <Icon icon="mdi:close" />
        </button>
      </header>

      <div class="picker-body">
        <nav class="picker-sidebar">
          <button type="button" class="sidebar-item" :class="{ active: activeIconCategory === null }" @click="activeIconCategory = null">
            <i class="fas fa-layer-group"></i>
            <span>Todos</span>
          </button>
          <button
            v-for="cat in iconCategoryNames"
            :key="cat"
            type="button"
            class="sidebar-item"
            :class="{ active: activeIconCategory === cat }"
            @click="activeIconCategory = cat"
          >
            <i :class="cat.startsWith('SD ') ? 'fas fa-gamepad' : cat === 'FontAwesome' ? 'fab fa-font-awesome' : cat === 'Iconos' ? 'fas fa-icons' : cat === 'Custom SVG' ? 'fas fa-shapes' : cat === 'Mis Iconos' ? 'fas fa-user' : cat === 'Multimedia' ? 'fas fa-music' : cat === 'Aplicaciones' ? 'fas fa-grid' : cat === 'Acciones' ? 'fas fa-bolt' : cat === 'Símbolos' ? 'fas fa-icons' : 'fas fa-folder'"></i>
            <span>{{ cat }}</span>
          </button>
        </nav>

        <div class="picker-main">
          <div class="picker-search">
            <Icon icon="mdi:magnify" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Buscar icono..." class="field" />
          </div>

          <div class="upload-bar">
            <input ref="fileInput" type="file" accept="image/png,image/jpeg,image/svg+xml,image/gif,image/webp" multiple style="display:none" @change="handleUpload" />
            <button class="upload-btn" @click="fileInput?.click()" :disabled="isUploading">
              <Icon :icon="isUploading ? 'mdi:loading' : 'mdi:upload'" :class="{ 'mdi-spin': isUploading }" />
              {{ isUploading ? 'Subiendo...' : 'Subir Icono' }}
            </button>
          </div>

          <div class="picker-scroll">
            <div v-if="Object.keys(filteredIcons).length === 0" class="empty-state">
              <Icon icon="mdi:magnify" style="font-size: 2rem; opacity: 0.3" />
              <p>No se encontraron iconos</p>
            </div>
            <div v-for="(icons, category) in filteredIcons" :key="category" class="category">
              <h4 class="category-title">{{ category }} ({{ icons.length }})</h4>
              <div class="icons-grid">
                <button
                  v-for="item in icons"
                  :key="item.icon"
                  class="icon-cell"
                  :class="{ active: currentIcon === item.icon }"
                  @click.stop="selectIcon(item.icon)"
                  :title="item.label"
                  type="button"
                >
                  <img v-if="item.isCustom" :src="'./icons/' + item.icon.replace('svg:', '')" class="cell-img" :alt="item.label" />
                  <img v-else-if="item.isUserCustom" :src="serverUrlStore.serverUrl + '/custom-icons/' + item.icon.replace('custom:', '')" class="cell-img" :alt="item.label" />
                  <img v-else-if="item.isStreamDeck" :src="'./streamdeck-icons/' + item.icon.replace('sd:', '')" class="cell-img" :alt="item.label" />
                  <Icon v-else-if="item.isIconify" :icon="item.icon" />
                  <i v-else-if="item.isFontAwesome" :class="item.icon"></i>
                  <span v-else class="cell-emoji">{{ item.icon }}</span>
                  <span class="cell-label">{{ item.label }}</span>
                  <span v-if="item.isUserCustom" class="delete-badge" @click.stop="deleteCustomIcon(item)" title="Eliminar icono"><Icon icon="mdi:close" /></span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </Transition>
</template>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.picker-panel {
  width: 100%;
  max-width: 900px;
  height: 620px;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.94) 0%, rgba(10, 10, 16, 0.97) 100%);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px -10px color-mix(in srgb, var(--accent) 30%, transparent);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--glass-border);
}
.picker-header h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-1); }
.header-close {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.04);
  color: var(--text-2); cursor: pointer; display: grid; place-items: center;
  font-size: 0.9rem; transition: background 0.18s, color 0.18s;
}
.header-close svg { transition: transform 0.18s; }
@media (hover: hover) {
  .header-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-1); }
  .header-close:hover svg { transform: rotate(90deg); }
}

.picker-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}
.picker-sidebar {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  border-right: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 500;
  transition: all 0.18s;
  text-align: left;
  white-space: nowrap;
}
.sidebar-item i { font-size: 0.9rem; width: 18px; text-align: center; }
.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--text-1);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
@media (hover: hover) {
  .sidebar-item:not(.active):hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-1);
  }
}
.picker-sidebar::-webkit-scrollbar { width: 3px; }
.picker-sidebar::-webkit-scrollbar-track { background: transparent; }
.picker-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.08); border-radius: 3px; }

.picker-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.picker-search {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 22px; border-bottom: 1px solid var(--glass-border);
}
.search-icon { color: var(--text-2); font-size: 1rem; }
.field {
  flex: 1; padding: 11px 14px;
  background: var(--field-bg); border: 1px solid var(--field-border);
  border-radius: 10px; color: var(--text-1); font-size: 0.95rem; font-family: inherit;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.field:focus {
  outline: none; border-color: var(--field-focus);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.upload-bar {
  padding: 10px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.upload-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px; background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px dashed color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 10px; color: #a78bfa; font-size: 0.85rem; cursor: pointer; transition: all 0.18s;
}
.upload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
@media (hover: hover) {
  .upload-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 20%, transparent); border-color: color-mix(in srgb, var(--accent) 50%, transparent); }
}

.picker-scroll { flex: 1; overflow-y: auto; padding: 16px 22px; }

.category { margin-bottom: 24px; }
.category:last-child { margin-bottom: 0; }
.category-title {
  margin: 0 0 10px; font-size: 0.78rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-2);
}

.icons-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: 6px;
}

.icon-cell {
  aspect-ratio: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 5px; padding: 8px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px; cursor: pointer; transition: all 0.15s; position: relative;
  color: var(--text-1);
}
@media (hover: hover) {
  .icon-cell:hover {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateY(-2px);
  }
}
.icon-cell.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.icon-cell i, .icon-cell svg { font-size: 1.8rem; width: 1.8rem; height: 1.8rem; }
.cell-img { width: 1.8rem; height: 1.8rem; object-fit: contain; }
.cell-emoji { font-size: 2rem; line-height: 1; }
.cell-label {
  font-size: 0.68rem; color: var(--text-2); text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%;
}

.delete-badge {
  position: absolute; top: 3px; right: 3px;
  width: 16px; height: 16px; display: flex; align-items: center; justify-content: center;
  background: rgba(220, 50, 50, 0.85); color: white; border-radius: 50%;
  font-size: 9px; line-height: 1; opacity: 0; transition: opacity 0.15s;
}
@media (hover: hover) { .icon-cell:hover .delete-badge { opacity: 1; } }
@media (hover: none) { .delete-badge { opacity: 1; } }

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 50px 20px; color: var(--text-2); text-align: center;
}
.empty-state p { margin-top: 12px; }

.picker-scroll::-webkit-scrollbar { width: 4px; }
.picker-scroll::-webkit-scrollbar-track { background: transparent; }
.picker-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

@media (max-width: 640px) {
  .picker-backdrop { align-items: flex-end; padding: 0; }
  .picker-panel { max-width: 100%; height: auto; max-height: 92dvh; border-radius: 24px 24px 0 0; }
  .picker-body { flex-direction: column; }
  .picker-sidebar {
    width: 100%; flex-direction: row; border-right: none;
    border-bottom: 1px solid var(--glass-border);
    padding: 8px 10px; overflow-x: auto; overflow-y: hidden; gap: 4px;
  }
  .sidebar-item { padding: 8px 10px; font-size: 0.78rem; gap: 6px; }
  .sidebar-item span { display: none; }
  .sidebar-item i { font-size: 1rem; }
  .icons-grid { grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); }
  .picker-enter-from .picker-panel { transform: translateY(100%); }
  .picker-leave-to .picker-panel { transform: translateY(100%); }
}

.picker-enter-active { transition: opacity 0.35s ease; }
.picker-leave-active { transition: opacity 0.25s ease; }
.picker-enter-from, .picker-leave-to { opacity: 0; }
.picker-enter-active .picker-panel {
  transition: transform 0.45s cubic-bezier(0.22, 1.2, 0.36, 1);
}
.picker-leave-active .picker-panel { transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1); }
.picker-enter-from .picker-panel { transform: translateY(80px) scale(0.85); }
.picker-leave-to .picker-panel { transform: translateY(40px) scale(0.92); }

/* Light theme */
[data-theme='light'] .picker-panel {
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 245, 250, 0.98) 100%);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 32px 80px rgba(0, 0, 0, 0.15), 0 0 60px -10px color-mix(in srgb, var(--accent) 15%, transparent);
}
[data-theme='light'] .picker-header { border-bottom-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .header-close { background: rgba(0, 0, 0, 0.04); border-color: rgba(0, 0, 0, 0.1); }
[data-theme='light'] .header-close:hover { background: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .picker-search { border-bottom-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .field:focus { background: rgba(0, 0, 0, 0.02); }
[data-theme='light'] .icon-cell { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.07); }
[data-theme='light'] .icon-cell:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
[data-theme='light'] .upload-bar { border-bottom-color: rgba(0, 0, 0, 0.06); }
[data-theme='light'] .picker-sidebar { background: rgba(0, 0, 0, 0.04); border-right-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .sidebar-item.active { background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: color-mix(in srgb, var(--accent) 20%, transparent); }
[data-theme='light'] .sidebar-item:not(.active):hover { background: rgba(0, 0, 0, 0.05); }
[data-theme='light'] .picker-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); }
</style>
