<script setup lang="ts">
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

const formData = reactive({
  label: '',
  icon: '',
  color: '#ffffff',
  backgroundColor: '#2c3e50',
  actionType: 'COMMAND' as ActionType,
  payload: '',
})

const actionTypes = [
  { value: 'COMMAND', label: 'Comando', icon: 'pi pi-code' },
  { value: 'HOTKEY', label: 'Atajo', icon: 'pi pi-bolt' },
  { value: 'OPEN_APP', label: 'App', icon: 'pi pi-desktop' },
  { value: 'URL', label: 'URL', icon: 'pi pi-globe' },
]

const colorSwatches = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#06b6d4',
  '#10b981', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#a855f7', '#2c3e50', '#000000',
]

const emojiPresets = [
  '🎮', '🎵', '🎬', '💻', '🔊', '🎨',
  '📁', '🌐', '⚙️', '🚀', '💡', '📊',
  '🔧', '🎯', '⭐',
]

const iconCatalog = [
  { icon: '🎵', label: 'Música', keywords: ['musica', 'music', 'nota'] },
  { icon: '🔊', label: 'Volumen Alto', keywords: ['volumen', 'volume', 'alto', 'sonido'] },
  { icon: '🔇', label: 'Silencio', keywords: ['silencio', 'mute', 'mudo'] },
  { icon: '⏯️', label: 'Play/Pausa', keywords: ['play', 'pausa', 'pause', 'reproducir'] },
  { icon: '⏭️', label: 'Siguiente', keywords: ['siguiente', 'next', 'adelante'] },
  { icon: '⏮️', label: 'Anterior', keywords: ['anterior', 'prev', 'atras'] },
  { icon: '🌐', label: 'Navegador', keywords: ['navegador', 'browser', 'web', 'internet'] },
  { icon: '💻', label: 'Computadora', keywords: ['computadora', 'pc', 'ordenador', 'computer'] },
  { icon: '📁', label: 'Carpeta', keywords: ['carpeta', 'folder', 'directorio'] },
  { icon: '🎮', label: 'Juego', keywords: ['juego', 'game', 'gaming'] },
  { icon: '⚙️', label: 'Configuración', keywords: ['config', 'configuracion', 'settings'] },
  { icon: 'fas fa-music', label: 'Música (FA)', keywords: ['musica', 'music', 'fontawesome'] },
  { icon: 'fas fa-volume-high', label: 'Volumen (FA)', keywords: ['volumen', 'volume', 'fontawesome'] },
  { icon: 'fas fa-play', label: 'Play (FA)', keywords: ['play', 'reproducir', 'fontawesome'] },
  { icon: 'fas fa-pause', label: 'Pausa (FA)', keywords: ['pausa', 'pause', 'fontawesome'] },
  { icon: 'fas fa-home', label: 'Casa (FA)', keywords: ['casa', 'home', 'inicio', 'fontawesome'] },
  { icon: 'fas fa-folder', label: 'Carpeta (FA)', keywords: ['carpeta', 'folder', 'fontawesome'] },
  { icon: 'fas fa-gamepad', label: 'Juego (FA)', keywords: ['juego', 'game', 'gaming', 'fontawesome'] },
  { icon: 'fab fa-chrome', label: 'Chrome', keywords: ['chrome', 'navegador', 'google'] },
  { icon: 'fab fa-firefox-browser', label: 'Firefox', keywords: ['firefox', 'navegador', 'mozilla'] },
  { icon: 'fab fa-discord', label: 'Discord', keywords: ['discord', 'chat'] },
  { icon: 'fab fa-spotify', label: 'Spotify', keywords: ['spotify', 'musica', 'music'] },
  { icon: 'fab fa-steam', label: 'Steam', keywords: ['steam', 'juego', 'game'] },
  { icon: 'pi pi-home', label: 'Casa (PI)', keywords: ['casa', 'home', 'inicio', 'primeicons'] },
  { icon: 'pi pi-cog', label: 'Config (PI)', keywords: ['config', 'configuracion', 'primeicons'] },
  { icon: 'pi pi-folder', label: 'Carpeta (PI)', keywords: ['carpeta', 'folder', 'primeicons'] },
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
const setEmoji = (emoji: string) => {
  formData.icon = emoji
}

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
            <i class="pi pi-times"></i>
          </button>
        </header>

        <div class="editor-scroll">
          <!-- ─── LIVE PREVIEW ─── -->
          <section class="preview-stage">
            <div
              class="preview-button"
              :style="{ color: formData.color, '--glow': formData.backgroundColor }"
            >
              <div v-if="formData.icon" class="preview-icon">
                <img v-if="formData.icon.startsWith('svg:')" :src="'./icons/' + formData.icon.replace('svg:', '')" class="preview-img" alt="icon" />
                <img v-else-if="formData.icon.startsWith('appicon:')" :src="serverUrlStore.serverUrl + formData.icon.replace('appicon:', '')" class="preview-img" alt="app icon" />
                <img v-else-if="formData.icon.startsWith('sd:')" :src="'./streamdeck-icons/' + formData.icon.replace('sd:', '')" class="preview-img" alt="icon" />
                <img v-else-if="formData.icon.startsWith('custom:')" :src="serverUrlStore.serverUrl + '/custom-icons/' + formData.icon.replace('custom:', '')" class="preview-img" alt="icon" />
                <i v-else-if="formData.icon.startsWith('pi ') || formData.icon.startsWith('fa')" :class="formData.icon"></i>
                <span v-else>{{ formData.icon }}</span>
              </div>
              <div class="preview-label">{{ formData.label || 'Sin nombre' }}</div>
            </div>
          </section>

          <!-- ─── CARD: ETIQUETA ─── -->
          <section class="card">
            <label class="card-label">Etiqueta</label>
            <input
              v-model="formData.label"
              type="text"
              placeholder="Ej: Abrir Discord"
              class="field"
            />
          </section>

          <!-- ─── CARD: ICONO ─── -->
          <section class="card">
            <label class="card-label">Icono</label>
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
                    <span v-if="item.icon.startsWith('pi ') || item.icon.startsWith('fa')" class="sug-icon"><i :class="item.icon"></i></span>
                    <span v-else class="sug-icon sug-emoji">{{ item.icon }}</span>
                    <span class="sug-label">{{ item.label }}</span>
                  </button>
                </div>
              </div>
              <button type="button" @click="showIconPicker = true" class="btn-neon btn-sm" title="Buscar icono">
                <i class="pi pi-search"></i>
              </button>
            </div>

            <!-- icon preview inline -->
            <div v-if="formData.icon" class="icon-inline-preview">
              <img v-if="formData.icon.startsWith('svg:')" :src="'./icons/' + formData.icon.replace('svg:', '')" class="icon-thumb" alt="icon" />
              <img v-else-if="formData.icon.startsWith('appicon:')" :src="serverUrlStore.serverUrl + formData.icon.replace('appicon:', '')" class="icon-thumb" alt="app icon" />
              <img v-else-if="formData.icon.startsWith('sd:')" :src="'./streamdeck-icons/' + formData.icon.replace('sd:', '')" class="icon-thumb" alt="icon" />
              <img v-else-if="formData.icon.startsWith('custom:')" :src="serverUrlStore.serverUrl + '/custom-icons/' + formData.icon.replace('custom:', '')" class="icon-thumb" alt="icon" />
              <span v-else-if="formData.icon.startsWith('pi ') || formData.icon.startsWith('fa')" class="icon-thumb-fa"><i :class="formData.icon"></i></span>
              <span v-else class="icon-thumb-emoji">{{ formData.icon }}</span>
            </div>

            <div class="emoji-grid">
              <button
                v-for="emoji in emojiPresets"
                :key="emoji"
                type="button"
                class="emoji-chip"
                @click="setEmoji(emoji)"
              >{{ emoji }}</button>
            </div>
          </section>

          <!-- ─── CARD: COLORES ─── -->
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
                <i class="pi pi-palette"></i>
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
                <i class="pi pi-palette"></i>
              </label>
            </div>
          </section>

          <!-- ─── CARD: ACCIÓN ─── -->
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
                <i :class="t.icon"></i>
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

            <div class="action-helpers" v-if="formData.actionType === 'COMMAND'">
              <button type="button" @click="showCommandPicker = true" class="btn-neon btn-sm">
                <i class="pi pi-list"></i> Comandos
              </button>
            </div>
            <div class="action-helpers" v-else-if="formData.actionType === 'OPEN_APP'">
              <button type="button" @click="showAppPicker = true" class="btn-neon btn-sm">
                <i class="pi pi-desktop"></i> Aplicaciones
              </button>
            </div>
          </section>
        </div>

        <!-- ─── FOOTER ─── -->
        <footer class="editor-footer">
          <button v-if="button" class="btn-neon btn-neon-danger btn-foot" @click="handleDelete">
            <i class="pi pi-trash"></i>
          </button>
          <div class="footer-spacer"></div>
          <button class="btn-neon btn-foot" @click="handleClose">Cancelar</button>
          <button
            class="btn-neon btn-neon-primary btn-foot"
            @click="handleSave"
            :disabled="!formData.label || !formData.payload"
          >
            <i class="pi pi-check"></i> Guardar
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
  max-width: 480px;
  max-height: 92vh;
  max-height: 92dvh;
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

/* ── SCROLL AREA ── */
.editor-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 6px 18px 18px;
}

/* ── LIVE PREVIEW ── */
.preview-stage {
  display: flex;
  justify-content: center;
  padding: 28px 0 20px;
}

.preview-button {
  width: 120px;
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

/* ── EMOJI GRID ── */
.emoji-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 10px;
}
.emoji-chip {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  font-size: 1.15rem;
  cursor: pointer;
  transition: all 0.15s;
  display: grid;
  place-items: center;
}
@media (hover: hover) {
  .emoji-chip:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: scale(1.12);
  }
}

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
  border: 2px solid transparent;
  background: var(--sw);
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}
.swatch.active {
  border-color: #fff;
  box-shadow: 0 0 0 2px var(--sw), 0 0 12px color-mix(in srgb, var(--sw) 60%, transparent);
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
.editor-enter-from .editor-panel { transform: translateY(80px) scale(0.85); }
.editor-leave-to .editor-panel { transform: translateY(40px) scale(0.92); }

@media (max-width: 640px) {
  .editor-enter-from .editor-panel { transform: translateY(100%); }
  .editor-leave-to .editor-panel { transform: translateY(100%); }
}

/* ── SCROLLBAR ── */
.editor-scroll::-webkit-scrollbar { width: 4px; }
.editor-scroll::-webkit-scrollbar-track { background: transparent; }
.editor-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

/* ── MOBILE ── */
@media (max-width: 640px) {
  .editor-backdrop { align-items: flex-end; padding: 0; }
  .editor-panel {
    max-width: 100%;
    max-height: 95dvh;
    border-radius: 24px 24px 0 0;
  }
  .segmented { grid-template-columns: repeat(4, 1fr); }
  .seg-item span { font-size: 0.65rem; }
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

[data-theme='light'] .emoji-chip {
  border-color: rgba(0, 0, 0, 0.08);
  background: rgba(0, 0, 0, 0.03);
}

[data-theme='light'] .emoji-chip:hover {
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

[data-theme='light'] .editor-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}
</style>
