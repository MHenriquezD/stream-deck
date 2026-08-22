<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ActionType, type StreamButton } from '@shared/core'
import { v4 as uuidv4 } from 'uuid'
import { computed, reactive, ref, watch } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'
import AppPicker from './AppPicker.vue'
import CommandPicker from './CommandPicker.vue'
import IconPicker from './IconPicker.vue'
import TailwindConfirmDialog from './TailwindConfirmDialog.vue'

const serverUrlStore = useServerUrlStore()

const props = defineProps<{
  button: StreamButton | null
  position: { row: number; col: number }
  show: boolean
}>()

const emit = defineEmits<{
  save: [button: StreamButton]
  close: []
  delete: [id: string]
}>()

const showIconPicker = ref(false)
const showCommandPicker = ref(false)
const showAppPicker = ref(false)
const showIconSuggestions = ref(false)
const iconInputFocused = ref(false)
const showDeleteDialog = ref(false)
const activeTab = ref<'general' | 'icon' | 'action'>('general')
const editorTabs = [
  { key: 'general' as const, label: 'General', icon: 'mdi:pencil' },
  { key: 'icon' as const, label: 'Icono', icon: 'mdi:image' },
  { key: 'action' as const, label: 'Acción', icon: 'mdi:lightning-bolt' },
]

const formData = reactive({
  label: '',
  icon: '',
  color: '#ffffff',
  backgroundColor: '#2c3e50',
  actionType: 'COMMAND' as ActionType,
  payload: '',
})

const actionTypes = [
  { value: 'OPEN_APP', label: 'App', icon: 'mdi:monitor' },
  { value: 'COMMAND', label: 'Comando', icon: 'mdi:code-tags' },
  { value: 'HOTKEY', label: 'Atajo', icon: 'mdi:lightning-bolt' },
  { value: 'URL', label: 'URL', icon: 'mdi:web' },
]

const hotkeyPresets = [
  { label: 'Copiar', keys: 'Ctrl+C' },
  { label: 'Pegar', keys: 'Ctrl+V' },
  { label: 'Cortar', keys: 'Ctrl+X' },
  { label: 'Deshacer', keys: 'Ctrl+Z' },
  { label: 'Rehacer', keys: 'Ctrl+Y' },
  { label: 'Guardar', keys: 'Ctrl+S' },
  { label: 'Seleccionar todo', keys: 'Ctrl+A' },
  { label: 'Buscar', keys: 'Ctrl+F' },
  { label: 'Cerrar ventana', keys: 'Alt+F4' },
  { label: 'Cambiar ventana', keys: 'Alt+Tab' },
  { label: 'Escritorio', keys: 'Win+D' },
  { label: 'Explorador', keys: 'Win+E' },
  { label: 'Bloquear PC', keys: 'Win+L' },
  { label: 'Captura pantalla', keys: 'Win+Shift+S' },
  { label: 'Admin. tareas', keys: 'Ctrl+Shift+Esc' },
  { label: 'Silenciar mic', keys: 'Win+Alt+K' },
  { label: 'Play/Pause', keys: 'MediaPlayPause' },
  { label: 'Siguiente', keys: 'MediaNextTrack' },
  { label: 'Anterior', keys: 'MediaPrevTrack' },
  { label: 'Subir volumen', keys: 'VolumeUp' },
  { label: 'Bajar volumen', keys: 'VolumeDown' },
  { label: 'Silenciar', keys: 'VolumeMute' },
]

const urlPresets = [
  { label: 'Google', url: 'https://google.com' },
  { label: 'YouTube', url: 'https://youtube.com' },
  { label: 'GitHub', url: 'https://github.com' },
  { label: 'ChatGPT', url: 'https://chat.openai.com' },
  { label: 'Gmail', url: 'https://mail.google.com' },
  { label: 'WhatsApp Web', url: 'https://web.whatsapp.com' },
  { label: 'Twitter/X', url: 'https://x.com' },
  { label: 'Reddit', url: 'https://reddit.com' },
  { label: 'Netflix', url: 'https://netflix.com' },
  { label: 'Spotify Web', url: 'https://open.spotify.com' },
]

const colorSwatches = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#2c3e50', '#000000',
]

const quickIcons = [
  { icon: 'svg:spotify.svg', label: 'Spotify' },
  { icon: 'svg:discord.svg', label: 'Discord' },
  { icon: 'svg:chrome.svg', label: 'Chrome' },
  { icon: 'svg:edge.svg', label: 'Edge' },
  { icon: 'svg:firefox.svg', label: 'Firefox' },
  { icon: 'svg:brave.svg', label: 'Brave' },
  { icon: 'svg:youtube.svg', label: 'YouTube' },
  { icon: 'svg:netflix.svg', label: 'Netflix' },
  { icon: 'svg:whatsapp.svg', label: 'WhatsApp' },
  { icon: 'svg:vscode.svg', label: 'VS Code' },
  { icon: 'svg:minecraft.svg', label: 'Minecraft' },
  { icon: 'svg:xbox.svg', label: 'Xbox' },
  { icon: 'svg:word.svg', label: 'Word' },
  { icon: 'svg:excel.svg', label: 'Excel' },
  { icon: 'svg:powerpoint.svg', label: 'PowerPoint' },
  { icon: 'svg:outlook.svg', label: 'Outlook' },
  { icon: 'svg:volume-high.svg', label: 'Volumen' },
  { icon: 'svg:volume-mute.svg', label: 'Silenciar' },
  { icon: 'svg:note-music.svg', label: 'Música' },
  { icon: 'svg:gear.svg', label: 'Config' },
  { icon: 'mdi:home', label: 'Inicio' },
  { icon: 'mdi:folder', label: 'Carpeta' },
  { icon: 'mdi:play', label: 'Play' },
  { icon: 'mdi:pause', label: 'Pausa' },
  { icon: 'mdi:fast-forward', label: 'Siguiente' },
  { icon: 'mdi:fast-rewind', label: 'Anterior' },
  { icon: 'mdi:power', label: 'Apagar' },
  { icon: 'mdi:monitor', label: 'Escritorio' },
  { icon: 'mdi:camera', label: 'Captura' },
  { icon: 'mdi:lock', label: 'Bloquear' },
]

const iconCatalog = [
  { icon: 'svg:spotify.svg', label: 'Spotify', keywords: ['spotify', 'musica', 'music'] },
  { icon: 'svg:discord.svg', label: 'Discord', keywords: ['discord', 'chat'] },
  { icon: 'svg:chrome.svg', label: 'Chrome', keywords: ['chrome', 'navegador', 'google'] },
  { icon: 'svg:edge.svg', label: 'Edge', keywords: ['edge', 'navegador', 'microsoft'] },
  { icon: 'svg:firefox.svg', label: 'Firefox', keywords: ['firefox', 'navegador', 'mozilla'] },
  { icon: 'svg:brave.svg', label: 'Brave', keywords: ['brave', 'navegador'] },
  { icon: 'svg:youtube.svg', label: 'YouTube', keywords: ['youtube', 'video'] },
  { icon: 'svg:netflix.svg', label: 'Netflix', keywords: ['netflix', 'streaming'] },
  { icon: 'svg:whatsapp.svg', label: 'WhatsApp', keywords: ['whatsapp', 'chat', 'mensaje'] },
  { icon: 'svg:vscode.svg', label: 'VS Code', keywords: ['vscode', 'code', 'editor'] },
  { icon: 'svg:volume-high.svg', label: 'Volumen Alto', keywords: ['volumen', 'volume', 'alto', 'sonido'] },
  { icon: 'svg:volume-mute.svg', label: 'Silencio', keywords: ['silencio', 'mute', 'mudo'] },
  { icon: 'svg:note-music.svg', label: 'Música', keywords: ['musica', 'music', 'nota'] },
  { icon: 'svg:gear.svg', label: 'Configuración', keywords: ['config', 'configuracion', 'settings'] },
  { icon: 'mdi:home', label: 'Inicio', keywords: ['casa', 'home', 'inicio'] },
  { icon: 'mdi:folder', label: 'Carpeta', keywords: ['carpeta', 'folder', 'directorio'] },
  { icon: 'mdi:play', label: 'Play', keywords: ['play', 'reproducir'] },
  { icon: 'mdi:pause', label: 'Pausa', keywords: ['pausa', 'pause'] },
  { icon: 'mdi:fast-forward', label: 'Siguiente', keywords: ['siguiente', 'next'] },
  { icon: 'mdi:fast-rewind', label: 'Anterior', keywords: ['anterior', 'prev'] },
  { icon: 'mdi:cog', label: 'Config', keywords: ['config', 'configuracion'] },
  { icon: 'mdi:monitor', label: 'Escritorio', keywords: ['escritorio', 'desktop', 'pc'] },
  { icon: 'mdi:web', label: 'Web', keywords: ['web', 'internet', 'navegador'] },
  { icon: 'mdi:power', label: 'Apagar', keywords: ['apagar', 'power', 'off'] },
]

const iconSuggestions = computed(() => {
  const query = formData.icon.toLowerCase().trim()
  if (!query || query.length < 2) return []
  return iconCatalog
    .filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((kw) => kw.includes(query)) ||
        item.icon.includes(query),
    )
    .slice(0, 8)
})

watch(
  () => formData.icon,
  (newVal) => {
    showIconSuggestions.value =
      iconInputFocused.value &&
      newVal.length >= 2 &&
      iconSuggestions.value.length > 0
  },
)

watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      if (props.button) {
        formData.label = props.button.label
        formData.icon = props.button.icon || ''
        formData.color = props.button.color || '#ffffff'
        formData.backgroundColor = props.button.backgroundColor || '#2c3e50'
        formData.actionType = props.button.action.type
        formData.payload = props.button.action.payload
      } else {
        resetForm()
      }
    }
  },
)

const resetForm = () => {
  formData.label = ''
  formData.icon = ''
  formData.color = '#ffffff'
  formData.backgroundColor = '#2c3e50'
  formData.actionType = ActionType.COMMAND
  formData.payload = ''
}

const handleSave = () => {
  const button: StreamButton = {
    id: props.button?.id || uuidv4(),
    label: formData.label,
    icon: formData.icon,
    color: formData.color,
    backgroundColor: formData.backgroundColor,
    action: {
      type: formData.actionType,
      payload: formData.payload,
    },
    position: props.position,
  }
  emit('save', button)
  emit('close')
}

const handleDelete = () => {
  if (!props.button) return
  showDeleteDialog.value = true
}

const handleDeleteConfirm = () => {
  if (props.button) {
    emit('delete', props.button.id)
    emit('close')
  }
  showDeleteDialog.value = false
}
const handleDeleteCancel = () => {
  showDeleteDialog.value = false
}

const handleClose = () => emit('close')

const handleIconSelect = (icon: string) => {
  formData.icon = icon
  showIconPicker.value = false
}

const handleCommandSelect = (command: string) => {
  formData.payload = command
  showCommandPicker.value = false
}

const handleAppSelect = (data: {
  command: string
  icon?: string
  name?: string
}) => {
  formData.payload = data.command
  if (data.icon) {
    formData.icon = `appicon:${data.icon}`
  }
  if (!formData.label && data.name) {
    formData.label = data.name
      .replace(/\s*\(.*\)\s*$/, '')
      .replace(/\s*\d+(\.\d+)*.*$/, '')
      .trim()
  }
  showAppPicker.value = false
}

const selectSuggestion = (icon: string) => {
  formData.icon = icon
  showIconSuggestions.value = false
  iconInputFocused.value = false
}

const handleIconInputFocus = () => {
  iconInputFocused.value = true
  if (formData.icon.length >= 2 && iconSuggestions.value.length > 0) {
    showIconSuggestions.value = true
  }
}

const handleIconInputBlur = () => {
  setTimeout(() => {
    iconInputFocused.value = false
    showIconSuggestions.value = false
  }, 200)
}
</script>

<template>
  <Transition name="editor">
    <div v-if="show" class="editor-backdrop" @click="handleClose">
      <div class="editor-panel" @click.stop>
        <!-- ─── HEADER ─── -->
        <header class="editor-header">
          <h2>{{ button ? 'Editar' : 'Nuevo' }} Botón</h2>
          <button class="header-close" @click="handleClose" aria-label="Cerrar">
            <Icon icon="mdi:close" />
          </button>
        </header>

        <div class="editor-body">
          <!-- ─── SIDEBAR ─── -->
          <nav class="editor-sidebar">
            <div class="sidebar-preview">
              <div
                class="preview-button"
                :style="{ color: formData.color, '--glow': formData.backgroundColor }"
              >
                <div v-if="formData.icon" class="preview-icon">
                  <img v-if="formData.icon.startsWith('svg:')" :src="'./icons/' + formData.icon.replace('svg:', '')" class="preview-img" alt="icon" />
                  <img v-else-if="formData.icon.startsWith('appicon:')" :src="serverUrlStore.serverUrl + formData.icon.replace('appicon:', '')" class="preview-img" alt="app icon" />
                  <img v-else-if="formData.icon.startsWith('sd:')" :src="'./streamdeck-icons/' + formData.icon.replace('sd:', '')" class="preview-img" alt="icon" />
                  <img v-else-if="formData.icon.startsWith('custom:')" :src="serverUrlStore.serverUrl + '/custom-icons/' + formData.icon.replace('custom:', '')" class="preview-img" alt="icon" />
                  <Icon v-else-if="formData.icon.startsWith('mdi:')" :icon="formData.icon" />
                  <i v-else-if="formData.icon.startsWith('pi ') || formData.icon.startsWith('fa')" :class="formData.icon"></i>
                  <span v-else>{{ formData.icon }}</span>
                </div>
                <div class="preview-label">{{ formData.label || 'Sin nombre' }}</div>
              </div>
            </div>
            <div class="sidebar-tabs">
              <button
                v-for="tab in editorTabs"
                :key="tab.key"
                type="button"
                class="sidebar-item"
                :class="{ active: activeTab === tab.key }"
                @click="activeTab = tab.key"
              >
                <Icon :icon="tab.icon" />
                <span>{{ tab.label }}</span>
              </button>
            </div>
          </nav>

          <!-- ─── CONTENT ─── -->
          <div class="editor-content">
            <!-- TAB: GENERAL -->
            <div v-if="activeTab === 'general'" class="tab-content">
              <h3 class="tab-title">General</h3>
              <section class="card">
                <label class="card-label">Etiqueta</label>
                <input
                  v-model="formData.label"
                  type="text"
                  placeholder="Ej: Abrir Discord"
                  class="field"
                />
              </section>

              <section class="card">
                <label class="card-label">Color de acento</label>
                <div class="swatch-row">
                  <button
                    v-for="c in colorSwatches"
                    :key="c"
                    type="button"
                    class="swatch"
                    :class="{ active: formData.backgroundColor === c }"
                    :style="{ '--sw': c }"
                    @click="formData.backgroundColor = c"
                  ></button>
                  <label class="swatch swatch-custom" title="Color personalizado">
                    <input type="color" v-model="formData.backgroundColor" class="sr-only" />
                    <Icon icon="mdi:palette" />
                  </label>
                </div>

                <label class="card-label" style="margin-top: 14px;">Color de texto</label>
                <div class="swatch-row">
                  <button
                    v-for="c in ['#ffffff', '#e2e8f0', '#94a3b8', '#000000']"
                    :key="c"
                    type="button"
                    class="swatch"
                    :class="{ active: formData.color === c }"
                    :style="{ '--sw': c }"
                    @click="formData.color = c"
                  ></button>
                  <label class="swatch swatch-custom" title="Color personalizado">
                    <input type="color" v-model="formData.color" class="sr-only" />
                    <Icon icon="mdi:palette" />
                  </label>
                </div>
              </section>
            </div>

            <!-- TAB: ICONO -->
            <div v-if="activeTab === 'icon'" class="tab-content">
              <h3 class="tab-title">Icono</h3>
              <section class="card">
                <label class="card-label">Buscar icono</label>
                <div class="icon-row">
                  <div class="icon-search-wrap">
                    <input
                      v-model="formData.icon"
                      type="text"
                      placeholder="Buscar: música, home, juego..."
                      class="field"
                      @focus="handleIconInputFocus"
                      @blur="handleIconInputBlur"
                    />
                    <div v-if="showIconSuggestions" class="suggestions-dropdown">
                      <button
                        v-for="item in iconSuggestions"
                        :key="item.icon"
                        type="button"
                        class="suggestion-item"
                        @click="selectSuggestion(item.icon)"
                      >
                        <span v-if="item.icon.startsWith('svg:')" class="sug-icon"><img :src="'./icons/' + item.icon.replace('svg:', '')" class="sug-img" /></span>
                        <span v-else-if="item.icon.startsWith('mdi:')" class="sug-icon"><Icon :icon="item.icon" /></span>
                        <span v-else-if="item.icon.startsWith('pi ') || item.icon.startsWith('fa')" class="sug-icon"><i :class="item.icon"></i></span>
                        <span v-else class="sug-icon sug-emoji">{{ item.icon }}</span>
                        <span class="sug-label">{{ item.label }}</span>
                      </button>
                    </div>
                  </div>
                  <button type="button" @click="showIconPicker = true" class="btn-neon btn-sm" title="Buscar icono">
                    <Icon icon="mdi:magnify" />
                  </button>
                </div>

                <div v-if="formData.icon" class="icon-inline-preview">
                  <img v-if="formData.icon.startsWith('svg:')" :src="'./icons/' + formData.icon.replace('svg:', '')" class="icon-thumb" alt="icon" />
                  <img v-else-if="formData.icon.startsWith('appicon:')" :src="serverUrlStore.serverUrl + formData.icon.replace('appicon:', '')" class="icon-thumb" alt="app icon" />
                  <img v-else-if="formData.icon.startsWith('sd:')" :src="'./streamdeck-icons/' + formData.icon.replace('sd:', '')" class="icon-thumb" alt="icon" />
                  <img v-else-if="formData.icon.startsWith('custom:')" :src="serverUrlStore.serverUrl + '/custom-icons/' + formData.icon.replace('custom:', '')" class="icon-thumb" alt="icon" />
                  <span v-else-if="formData.icon.startsWith('mdi:')" class="icon-thumb-fa"><Icon :icon="formData.icon" /></span>
                  <span v-else-if="formData.icon.startsWith('pi ') || formData.icon.startsWith('fa')" class="icon-thumb-fa"><i :class="formData.icon"></i></span>
                  <span v-else class="icon-thumb-emoji">{{ formData.icon }}</span>
                </div>
              </section>

              <section class="card">
                <label class="card-label">Iconos rápidos</label>
                <div class="quick-icons-grid">
                  <button
                    v-for="qi in quickIcons"
                    :key="qi.icon"
                    type="button"
                    class="quick-icon-chip"
                    :class="{ active: formData.icon === qi.icon }"
                    :title="qi.label"
                    @click="formData.icon = qi.icon"
                  >
                    <img v-if="qi.icon.startsWith('svg:')" :src="'./icons/' + qi.icon.replace('svg:', '')" class="qi-img" :alt="qi.label" />
                    <Icon v-else :icon="qi.icon" class="qi-pi" />
                  </button>
                </div>
              </section>
            </div>

            <!-- TAB: ACCIÓN -->
            <div v-if="activeTab === 'action'" class="tab-content">
              <h3 class="tab-title">Acción</h3>
              <section class="card">
                <label class="card-label">Tipo de acción</label>
                <div class="segmented">
                  <button
                    v-for="t in actionTypes"
                    :key="t.value"
                    type="button"
                    class="seg-item"
                    :class="{ active: formData.actionType === t.value }"
                    @click="formData.actionType = t.value as ActionType"
                  >
                    <Icon :icon="t.icon" />
                    <span>{{ t.label }}</span>
                  </button>
                </div>

                <label class="card-label" style="margin-top: 14px;">
                  {{ formData.actionType === 'COMMAND' ? 'Comando' : formData.actionType === 'HOTKEY' ? 'Atajo (Ej: Ctrl+C)' : formData.actionType === 'OPEN_APP' ? 'Ruta de la App' : 'URL' }}
                </label>

                <textarea
                  v-model="formData.payload"
                  :placeholder="
                    formData.actionType === 'COMMAND' ? 'Ej: notepad.exe' :
                    formData.actionType === 'HOTKEY' ? 'Ej: Ctrl+Alt+T' :
                    formData.actionType === 'OPEN_APP' ? 'Ej: C:\\Program Files\\App\\app.exe' :
                    'Ej: https://google.com'
                  "
                  class="field field-textarea"
                  rows="3"
                ></textarea>

                <div class="action-helpers" v-if="formData.actionType === 'OPEN_APP'">
                  <button type="button" @click="showAppPicker = true" class="btn-neon btn-sm">
                    <Icon icon="mdi:monitor" /> Aplicaciones
                  </button>
                </div>
                <div class="action-helpers" v-else-if="formData.actionType === 'COMMAND'">
                  <button type="button" @click="showCommandPicker = true" class="btn-neon btn-sm">
                    <Icon icon="mdi:format-list-bulleted" /> Comandos
                  </button>
                </div>
                <div class="action-helpers" v-else-if="formData.actionType === 'HOTKEY'">
                  <div class="preset-grid">
                    <button
                      v-for="h in hotkeyPresets"
                      :key="h.keys"
                      type="button"
                      class="preset-chip"
                      :class="{ active: formData.payload === h.keys }"
                      @click="formData.payload = h.keys"
                    >
                      <span class="preset-label">{{ h.label }}</span>
                      <kbd class="preset-kbd">{{ h.keys }}</kbd>
                    </button>
                  </div>
                </div>
                <div class="action-helpers" v-else-if="formData.actionType === 'URL'">
                  <div class="preset-grid">
                    <button
                      v-for="u in urlPresets"
                      :key="u.url"
                      type="button"
                      class="preset-chip"
                      :class="{ active: formData.payload === u.url }"
                      @click="formData.payload = u.url"
                    >
                      <span class="preset-label">{{ u.label }}</span>
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        <!-- ─── FOOTER ─── -->
        <footer class="editor-footer">
          <button v-if="button" class="btn-neon btn-neon-danger btn-foot" @click="handleDelete">
            <Icon icon="mdi:trash-can" />
          </button>
          <div class="footer-spacer"></div>
          <button class="btn-neon btn-foot" @click="handleClose">Cancelar</button>
          <button
            class="btn-neon btn-neon-primary btn-foot btn-save-always-purple"
            @click="handleSave"
            :disabled="!formData.label || !formData.payload"
          >
            <Icon icon="mdi:check" /> Guardar
          </button>
        </footer>
      </div>
    </div>
  </Transition>

  <IconPicker
    :show="showIconPicker"
    :currentIcon="formData.icon"
    @select="handleIconSelect"
    @close="showIconPicker = false"
  />
  <TailwindConfirmDialog
    :show="showDeleteDialog"
    title="Confirmar eliminación"
    message="¿Estás seguro de que quieres eliminar este botón?"
    @confirm="handleDeleteConfirm"
    @cancel="handleDeleteCancel"
    @close="handleDeleteCancel"
  />
  <CommandPicker
    :show="showCommandPicker"
    :currentCommand="formData.payload"
    @select="handleCommandSelect"
    @close="showCommandPicker = false"
  />
  <AppPicker
    :show="showAppPicker"
    :currentApp="formData.payload"
    @select="handleAppSelect"
    @close="showAppPicker = false"
  />
</template>

<style scoped>
/* ── BACKDROP ── */
.editor-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

/* ── PANEL ── */
.editor-panel {
  width: 100%;
  max-width: 720px;
  height: 620px;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.92) 0%, rgba(10, 10, 16, 0.96) 100%);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px -10px color-mix(in srgb, var(--accent) 30%, transparent);
  overflow: hidden;
}

/* ── HEADER ── */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--glass-border);
}

.editor-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-1);
  letter-spacing: 0.01em;
}

.header-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  transition: all 0.18s;
}
@media (hover: hover) {
  .header-close:hover {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-1);
    transform: rotate(90deg);
  }
}

/* ── BODY: SIDEBAR + CONTENT ── */
.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.editor-sidebar {
  width: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  border-right: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}

.sidebar-preview {
  display: flex;
  justify-content: center;
  padding: 20px 0 16px;
  margin-bottom: 8px;
  border-bottom: 1px solid var(--glass-border);
}

.sidebar-tabs {
  display: contents;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.18s;
  text-align: left;
  white-space: nowrap;
}
.sidebar-item i { font-size: 1rem; width: 20px; text-align: center; }
.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--text-1);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
@media (hover: hover) {
  .sidebar-item:not(.active):hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-1);
  }
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px;
  min-width: 0;
}

.tab-title {
  margin: 0 0 16px;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-1);
}

.preview-button {
  width: 130px;
  aspect-ratio: 1;
  border-radius: 22px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  position: relative;
  background: linear-gradient(160deg, color-mix(in srgb, var(--glow, transparent) 14%, #22222c) 0%, #15151c 100%);
  border: 1.5px solid color-mix(in srgb, var(--glow, transparent) 55%, rgba(255, 255, 255, 0.45));
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.18),
    0 0 12px 2px rgba(255, 255, 255, 0.07),
    0 0 0 1px color-mix(in srgb, var(--glow, transparent) 70%, transparent),
    0 0 14px 1px color-mix(in srgb, var(--glow, transparent) 55%, transparent),
    0 0 28px 4px color-mix(in srgb, var(--glow, transparent) 35%, transparent),
    0 16px 32px rgba(0, 0, 0, 0.5),
    inset 0 3px 6px rgba(255, 255, 255, 0.12);
  transition: all 0.3s ease;
}
.preview-button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 22px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.08) 0%, transparent 45%);
  pointer-events: none;
}

.preview-icon { font-size: 2.5rem; line-height: 1; }
.preview-img { width: 2.5rem; height: 2.5rem; object-fit: contain; }
.preview-label { font-weight: 600; font-size: 0.85rem; text-align: center; opacity: 0.95; }

/* ── CARDS ── */
.card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 12px;
}

.card-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-2);
  margin-bottom: 10px;
}

/* ── FIELDS ── */
.field {
  width: 100%;
  padding: 11px 14px;
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  border-radius: 10px;
  color: var(--text-1);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.field:focus {
  outline: none;
  border-color: var(--field-focus);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}
.field-textarea {
  resize: vertical;
  min-height: 70px;
}

/* ── ICON ROW ── */
.icon-row {
  display: flex;
  gap: 8px;
}
.icon-search-wrap {
  flex: 1;
  position: relative;
}

.icon-inline-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.icon-thumb, .icon-thumb-fa, .icon-thumb-emoji {
  font-size: 1.8rem;
  display: flex;
  align-items: center;
}
.icon-thumb { width: 1.8rem; height: 1.8rem; object-fit: contain; }

/* ── SUGGESTIONS DROPDOWN ── */
.suggestions-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: linear-gradient(145deg, rgba(22, 22, 32, 0.98), rgba(10, 10, 16, 0.98));
  border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
  border-radius: 12px;
  max-height: 260px;
  overflow-y: auto;
  z-index: 10;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(16px);
}
.suggestion-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: var(--text-1);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}
@media (hover: hover) {
  .suggestion-item:hover { background: color-mix(in srgb, var(--accent) 15%, transparent); }
}
.suggestion-item:not(:last-child) { border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
.sug-icon { font-size: 1.4rem; width: 28px; text-align: center; flex-shrink: 0; }
.sug-emoji { font-size: 1.6rem; }
.sug-label { font-size: 0.88rem; }

/* ── QUICK ICONS GRID ── */
.quick-icons-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.quick-icon-chip {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: all 0.15s;
  display: grid;
  place-items: center;
  padding: 0;
}
.quick-icon-chip.active {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  box-shadow: 0 0 10px color-mix(in srgb, var(--accent) 30%, transparent);
}
@media (hover: hover) {
  .quick-icon-chip:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.12);
  }
}
.qi-img { width: 24px; height: 24px; object-fit: contain; }
.qi-pi { font-size: 1.15rem; color: var(--text-1); }
.sug-img { width: 20px; height: 20px; object-fit: contain; }

/* ── COLOR SWATCHES ── */
.swatch-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.swatch {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  background: var(--sw);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--sw), 0 0 12px color-mix(in srgb, var(--sw) 60%, transparent), 0 0 0 1px rgba(255, 255, 255, 0.4);
}
@media (hover: hover) {
  .swatch:hover:not(.active) {
    transform: scale(1.12);
    box-shadow: 0 0 10px color-mix(in srgb, var(--sw) 50%, transparent);
  }
}
.swatch-custom {
  background: linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
  display: grid;
  place-items: center;
  cursor: pointer;
}
.swatch-custom i { font-size: 0.85rem; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

/* ── SEGMENTED CONTROL ── */
.segmented {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.seg-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 4px;
  border-radius: 10px;
  border: none;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 500;
  transition: all 0.18s;
}
.seg-item i { font-size: 1rem; }
.seg-item.active {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: #fff;
  box-shadow: 0 0 16px -4px var(--accent);
}
@media (hover: hover) {
  .seg-item:not(.active):hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-1);
  }
}

/* ── ACTION HELPERS ── */
.action-helpers {
  margin-top: 10px;
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 180px;
  overflow-y: auto;
  padding: 2px;
}

.preset-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.78rem;
  transition: all 0.15s;
  white-space: nowrap;
}

@media (hover: hover) {
  .preset-chip:hover {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--text-1);
  }
}

.preset-chip.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
  color: var(--accent);
}

.preset-label { font-weight: 600; }

.preset-kbd {
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  padding: 2px 5px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-2);
}

[data-theme='light'] .preset-chip {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}
[data-theme='light'] .preset-kbd {
  background: rgba(0, 0, 0, 0.06);
}

.preset-grid::-webkit-scrollbar { width: 3px; }
.preset-grid::-webkit-scrollbar-track { background: transparent; }
.preset-grid::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }

/* ── BTN UTILS ── */
.btn-sm {
  padding: 10px 14px;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.btn-foot {
  padding: 12px 20px;
  font-size: 0.95rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.btn-foot:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* ── FOOTER ── */
.editor-footer {
  display: flex;
  gap: 10px;
  padding: 14px 18px;
  border-top: 1px solid var(--glass-border);
  background: rgba(10, 10, 16, 0.5);
}
.footer-spacer { flex: 1; }

/* ── TRANSITIONS ── */
.editor-enter-active { transition: opacity 0.35s ease; }
.editor-leave-active { transition: opacity 0.25s ease; }
.editor-enter-from, .editor-leave-to { opacity: 0; }
.editor-enter-active .editor-panel {
  transition: transform 0.45s cubic-bezier(0.22, 1.2, 0.36, 1);
}
.editor-leave-active .editor-panel {
  transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}
.editor-enter-from .editor-panel { transform: translateY(60px) scale(0.9); }
.editor-leave-to .editor-panel { transform: translateY(40px) scale(0.92); }

@media (max-width: 640px) {
  .editor-enter-from .editor-panel { transform: translateY(100%); }
  .editor-leave-to .editor-panel { transform: translateY(100%); }
}

/* ── SCROLLBAR ── */
.editor-content::-webkit-scrollbar { width: 4px; }
.editor-content::-webkit-scrollbar-track { background: transparent; }
.editor-content::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

/* ── MOBILE ── */
@media (max-width: 640px) {
  .editor-backdrop { align-items: stretch; padding: 0; }
  .editor-panel {
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    border-radius: 0;
  }
  .editor-body { flex-direction: column; }
  .editor-sidebar {
    width: 100%;
    flex-direction: column;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
    padding: 10px 14px 8px;
    overflow: hidden;
    gap: 8px;
    background: transparent;
  }
  .sidebar-preview {
    padding: 0;
    margin: 0;
    border-bottom: none;
    justify-content: center;
    align-items: center;
  }
  .sidebar-preview .preview-button {
    width: 96px;
    height: 96px;
    border-radius: 18px;
    padding: 8px;
  }
  .sidebar-preview .preview-icon { font-size: 2rem; }
  .sidebar-preview .preview-icon .preview-img { width: 40px; height: 40px; }
  .sidebar-preview .preview-label { font-size: 0.7rem; }
  .editor-sidebar .sidebar-tabs {
    display: flex;
    gap: 4px;
    justify-content: center;
  }
  .sidebar-item {
    padding: 8px 12px;
    font-size: 0.8rem;
    gap: 6px;
  }
  .sidebar-item span { display: none; }
  .sidebar-item i { font-size: 1.1rem; }
  .segmented { grid-template-columns: repeat(4, 1fr); }
  .seg-item { padding: 8px 4px; gap: 3px; }
  .seg-item span { font-size: 0.6rem; }
  .btn-foot span { display: none; }
  .preview-button { width: 100px; }
}

/* Light theme */
[data-theme='light'] .editor-panel {
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 245, 250, 0.98) 100%);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 32px 80px rgba(0, 0, 0, 0.15),
    0 0 60px -10px color-mix(in srgb, var(--accent) 15%, transparent);
}

[data-theme='light'] .editor-header {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .header-close {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.1);
}

[data-theme='light'] .header-close:hover {
  background: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .card {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.07);
}

[data-theme='light'] .field:focus {
  background: rgba(0, 0, 0, 0.02);
}

[data-theme='light'] .suggestions-dropdown {
  background: linear-gradient(145deg, rgba(245, 245, 250, 0.98), rgba(255, 255, 255, 0.98));
  border-color: color-mix(in srgb, var(--accent) 20%, rgba(0, 0, 0, 0.1));
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .suggestion-item:not(:last-child) {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .quick-icon-chip {
  border-color: rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.03);
}

[data-theme='light'] .quick-icon-chip:hover {
  background: rgba(0, 0, 0, 0.07);
  border-color: rgba(0, 0, 0, 0.15);
}

[data-theme='light'] .icon-inline-preview {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.07);
}

[data-theme='light'] .segmented {
  background: rgba(0, 0, 0, 0.04);
  border-color: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .seg-item:not(.active):hover {
  background: rgba(0, 0, 0, 0.06);
}

[data-theme='light'] .editor-footer {
  background: rgba(245, 245, 250, 0.8);
  border-top-color: rgba(0, 0, 0, 0.08);
}

[data-theme='light'] .editor-sidebar {
  background: rgba(0, 0, 0, 0.04);
  border-right-color: rgba(0, 0, 0, 0.08);
}
[data-theme='light'] .sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border-color: color-mix(in srgb, var(--accent) 20%, transparent);
}
[data-theme='light'] .sidebar-item:not(.active):hover {
  background: rgba(0, 0, 0, 0.05);
}
[data-theme='light'] .editor-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}
</style>
