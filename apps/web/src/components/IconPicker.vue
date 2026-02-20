<script setup lang="ts">
import { computed, ref } from 'vue'

interface IconItem {
  icon: string
  label: string
  isPrime?: boolean
  isFontAwesome?: boolean
  isCustom?: boolean
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
        item.icon.toLowerCase().includes(query),
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
              <i
                v-else-if="item.isPrime || item.isFontAwesome"
                :class="item.icon"
              ></i>
              <span v-else class="emoji-icon">{{ item.icon }}</span>
              <span class="icon-label">{{ item.label }}</span>
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

:global([data-theme='light']) .icon-picker-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(6px);
}

.icon-picker {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 16px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
  overflow: hidden;
}

:global([data-theme='light']) .icon-picker {
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.08);
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

:global([data-theme='light']) .picker-header {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

.picker-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #fff;
}

:global([data-theme='light']) .picker-header h3 {
  color: rgba(0, 0, 0, 0.87);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

:global([data-theme='light']) .close-btn {
  background: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.8);
}

:global([data-theme='light']) .close-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

.picker-search {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
}

:global([data-theme='light']) .picker-search {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

.picker-search i {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
}

:global([data-theme='light']) .picker-search i {
  color: rgba(0, 0, 0, 0.4);
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(139, 92, 246, 0.5);
}

:global([data-theme='light']) .search-input {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.87);
}

:global([data-theme='light']) .search-input::placeholder {
  color: rgba(0, 0, 0, 0.35);
}

:global([data-theme='light']) .search-input:focus {
  background: rgba(0, 0, 0, 0.06);
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
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

:global([data-theme='light']) .category-title {
  color: rgba(0, 0, 0, 0.5);
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 8px;
}

.icon-item:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateY(-2px);
}

.icon-item.active {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

:global([data-theme='light']) .icon-item {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
}

:global([data-theme='light']) .icon-item:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.4);
}

:global([data-theme='light']) .icon-item.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: #8b5cf6;
}

.icon-item i {
  font-size: 1.8rem;
  color: #fff;
}

:global([data-theme='light']) .icon-item i {
  color: rgba(0, 0, 0, 0.75);
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
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

:global([data-theme='light']) .icon-label {
  color: rgba(0, 0, 0, 0.6);
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

:global([data-theme='light']) .no-results {
  color: rgba(0, 0, 0, 0.4);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

:global([data-theme='light']) ::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.04);
}

:global([data-theme='light']) ::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
}

:global([data-theme='light']) ::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}
</style>
