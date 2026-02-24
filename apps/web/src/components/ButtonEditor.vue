<script setup lang="ts">
import { ActionType, type StreamButton } from '@shared/core'
import { v4 as uuidv4 } from 'uuid'
import { computed, reactive, ref, watch } from 'vue'
import AppPicker from './AppPicker.vue'
import CommandPicker from './CommandPicker.vue'
import IconPicker from './IconPicker.vue'
import TailwindConfirmDialog from './TailwindConfirmDialog.vue'

const props = defineProps<{
  button: StreamButton | null
  position: { row: number; col: number }
  show: boolean
}>()

const emit = defineEmits<{
  save: [button: StreamButton]
  close: []
  delete: [id: string]
  movePosition: [direction: 'up' | 'down' | 'left' | 'right']
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
  { value: 'COMMAND', label: 'Comando Shell' },
  { value: 'HOTKEY', label: 'Atajo de Teclado' },
  { value: 'OPEN_APP', label: 'Abrir Aplicación' },
  { value: 'URL', label: 'Abrir URL' },
]

const emojiPresets = [
  '🎮',
  '🎵',
  '🎬',
  '💻',
  '🔊',
  '🎨',
  '📁',
  '🌐',
  '⚙️',
  '🚀',
  '💡',
  '📊',
  '🔧',
  '🎯',
  '⭐',
]

const iconCatalog = [
  { icon: '🎵', label: 'Música', keywords: ['musica', 'music', 'nota'] },
  {
    icon: '🔊',
    label: 'Volumen Alto',
    keywords: ['volumen', 'volume', 'alto', 'sonido'],
  },
  { icon: '🔇', label: 'Silencio', keywords: ['silencio', 'mute', 'mudo'] },
  {
    icon: '⏯️',
    label: 'Play/Pausa',
    keywords: ['play', 'pausa', 'pause', 'reproducir'],
  },
  {
    icon: '⏭️',
    label: 'Siguiente',
    keywords: ['siguiente', 'next', 'adelante'],
  },
  { icon: '⏮️', label: 'Anterior', keywords: ['anterior', 'prev', 'atras'] },
  {
    icon: '🌐',
    label: 'Navegador',
    keywords: ['navegador', 'browser', 'web', 'internet'],
  },
  {
    icon: '💻',
    label: 'Computadora',
    keywords: ['computadora', 'pc', 'ordenador', 'computer'],
  },
  {
    icon: '📁',
    label: 'Carpeta',
    keywords: ['carpeta', 'folder', 'directorio'],
  },
  { icon: '🎮', label: 'Juego', keywords: ['juego', 'game', 'gaming'] },
  {
    icon: '⚙️',
    label: 'Configuración',
    keywords: ['config', 'configuracion', 'settings'],
  },
  {
    icon: 'fas fa-music',
    label: 'Música (FA)',
    keywords: ['musica', 'music', 'fontawesome'],
  },
  {
    icon: 'fas fa-volume-high',
    label: 'Volumen (FA)',
    keywords: ['volumen', 'volume', 'fontawesome'],
  },
  {
    icon: 'fas fa-play',
    label: 'Play (FA)',
    keywords: ['play', 'reproducir', 'fontawesome'],
  },
  {
    icon: 'fas fa-pause',
    label: 'Pausa (FA)',
    keywords: ['pausa', 'pause', 'fontawesome'],
  },
  {
    icon: 'fas fa-home',
    label: 'Casa (FA)',
    keywords: ['casa', 'home', 'inicio', 'fontawesome'],
  },
  {
    icon: 'fas fa-folder',
    label: 'Carpeta (FA)',
    keywords: ['carpeta', 'folder', 'fontawesome'],
  },
  {
    icon: 'fas fa-gamepad',
    label: 'Juego (FA)',
    keywords: ['juego', 'game', 'gaming', 'fontawesome'],
  },
  {
    icon: 'fab fa-chrome',
    label: 'Chrome',
    keywords: ['chrome', 'navegador', 'google'],
  },
  {
    icon: 'fab fa-firefox-browser',
    label: 'Firefox',
    keywords: ['firefox', 'navegador', 'mozilla'],
  },
  { icon: 'fab fa-discord', label: 'Discord', keywords: ['discord', 'chat'] },
  {
    icon: 'fab fa-spotify',
    label: 'Spotify',
    keywords: ['spotify', 'musica', 'music'],
  },
  {
    icon: 'fab fa-steam',
    label: 'Steam',
    keywords: ['steam', 'juego', 'game'],
  },
  {
    icon: 'pi pi-home',
    label: 'Casa (PI)',
    keywords: ['casa', 'home', 'inicio', 'primeicons'],
  },
  {
    icon: 'pi pi-cog',
    label: 'Config (PI)',
    keywords: ['config', 'configuracion', 'primeicons'],
  },
  {
    icon: 'pi pi-folder',
    label: 'Carpeta (PI)',
    keywords: ['carpeta', 'folder', 'primeicons'],
  },
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
  openDeleteDialog()
}

const openDeleteDialog = () => {
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

const handleAppSelect = (app: string) => {
  formData.payload = app
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

const movePosition = (direction: 'up' | 'down' | 'left' | 'right') => {
  emit('movePosition', direction)
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click="handleClose">
      <div class="modal-container" @click.stop>
        <div class="modal-header">
          <h2>{{ button ? 'Editar' : 'Nuevo' }} Botón</h2>
          <button class="close-btn" @click="handleClose">✕</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Etiqueta</label>
            <input
              v-model="formData.label"
              type="text"
              placeholder="Ej: Abrir Discord"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label>Icono</label>
            <div class="icon-input-wrapper">
              <div class="icon-search-container">
                <input
                  v-model="formData.icon"
                  type="text"
                  placeholder="Buscar: música, home, juego..."
                  class="form-input"
                  @focus="handleIconInputFocus"
                  @blur="handleIconInputBlur"
                />
                <div v-if="showIconSuggestions" class="icon-suggestions">
                  <button
                    v-for="item in iconSuggestions"
                    :key="item.icon"
                    type="button"
                    class="suggestion-item"
                    @click="selectSuggestion(item.icon)"
                  >
                    <span
                      v-if="
                        item.icon.startsWith('pi ') ||
                        item.icon.startsWith('fa')
                      "
                      class="suggestion-icon"
                    >
                      <i :class="item.icon"></i>
                    </span>
                    <span v-else class="suggestion-icon emoji-icon">
                      {{ item.icon }}
                    </span>
                    <span class="suggestion-label">{{ item.label }}</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                @click="showIconPicker = true"
                class="icon-picker-btn"
                title="Seleccionar icono"
              >
                <i class="pi pi-search"></i> Buscar
              </button>
            </div>
            <div class="icon-preview" v-if="formData.icon">
              <span class="preview-label">Vista previa:</span>
              <img
                v-if="formData.icon.startsWith('svg:')"
                :src="'/icons/' + formData.icon.replace('svg:', '')"
                class="icon-display custom-icon-display"
                alt="icon"
              />
              <span
                v-else-if="
                  formData.icon.startsWith('pi ') ||
                  formData.icon.startsWith('fa')
                "
                class="icon-display"
              >
                <i :class="formData.icon"></i>
              </span>
              <span v-else class="icon-display emoji-display">
                {{ formData.icon }}
              </span>
            </div>
            <div class="emoji-presets">
              <button
                v-for="emoji in emojiPresets"
                :key="emoji"
                type="button"
                class="emoji-btn"
                @click="setEmoji(emoji)"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Color de Texto</label>
              <input
                v-model="formData.color"
                type="color"
                class="color-input"
              />
            </div>
            <div class="form-group">
              <label>Color de Fondo</label>
              <input
                v-model="formData.backgroundColor"
                type="color"
                class="color-input"
              />
            </div>
          </div>

          <div class="form-group">
            <label>Tipo de Acción</label>
            <select v-model="formData.actionType" class="form-select">
              <option
                v-for="type in actionTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>
              {{
                formData.actionType === 'COMMAND'
                  ? 'Comando'
                  : formData.actionType === 'HOTKEY'
                    ? 'Atajo (Ej: Ctrl+C)'
                    : formData.actionType === 'OPEN_APP'
                      ? 'Ruta de la App'
                      : 'URL'
              }}
            </label>
            <div
              class="command-input-wrapper"
              v-if="formData.actionType === 'COMMAND'"
            >
              <textarea
                v-model="formData.payload"
                placeholder="Ej: notepad.exe"
                class="form-textarea"
                rows="3"
              ></textarea>
              <button
                type="button"
                @click="showCommandPicker = true"
                class="command-picker-btn"
                title="Seleccionar comando"
              >
                <i class="pi pi-list"></i> Comandos
              </button>
            </div>
            <div
              class="command-input-wrapper"
              v-else-if="formData.actionType === 'OPEN_APP'"
            >
              <textarea
                v-model="formData.payload"
                placeholder="Ej: C:\Program Files\App\app.exe"
                class="form-textarea"
                rows="3"
              ></textarea>
              <button
                type="button"
                @click="showAppPicker = true"
                class="command-picker-btn"
                title="Seleccionar aplicación"
              >
                <i class="pi pi-desktop"></i> Aplicaciones
              </button>
            </div>
            <textarea
              v-else
              v-model="formData.payload"
              :placeholder="
                formData.actionType === 'HOTKEY'
                  ? 'Ej: Ctrl+Alt+T'
                  : 'Ej: https://google.com'
              "
              class="form-textarea"
              rows="3"
            ></textarea>
          </div>

          <div class="preview">
            <div class="preview-label">Vista Previa:</div>
            <div
              class="preview-button"
              :style="{
                backgroundColor: formData.backgroundColor,
                color: formData.color,
              }"
            >
              <div v-if="formData.icon" class="preview-icon">
                <img
                  v-if="formData.icon.startsWith('svg:')"
                  :src="'/icons/' + formData.icon.replace('svg:', '')"
                  class="preview-custom-icon"
                  alt="icon"
                />
                <i
                  v-else-if="
                    formData.icon.startsWith('pi ') ||
                    formData.icon.startsWith('fa')
                  "
                  :class="formData.icon"
                ></i>
                <span v-else>{{ formData.icon }}</span>
              </div>
              <div class="preview-text">
                {{ formData.label || 'Sin nombre' }}
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button v-if="button" class="btn btn-danger" @click="handleDelete">
              <i class="pi pi-trash"></i>
              <span class="btn-text">Eliminar</span>
            </button>
            <div class="spacer"></div>
            <button class="btn btn-secondary" @click="handleClose">
              <i class="pi pi-times"></i>
              <span class="btn-text">Cancelar</span>
            </button>
            <button
              class="btn btn-primary"
              @click="handleSave"
              :disabled="!formData.label || !formData.payload"
            >
              <i v-if="button" class="fa-solid fa-floppy-disk"></i>
              <i v-else class="pi pi-check"></i>
              <span class="btn-text">Guardar</span>
            </button>
          </div>
        </div>
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
/* ===========================
   OVERLAY — FIX PRINCIPAL
   =========================== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--edit-bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

/* ===========================
   CONTAINER
   =========================== */
.modal-container {
  background: var(--edit-bg-color);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  max-height: 90dvh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* ===========================
   HEADER
   =========================== */
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--edit-color);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--edit-color);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

/* ===========================
   BODY / FORM
   =========================== */
.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #aaa;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: var(--edit-color);
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4a9eff;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.color-input {
  width: 100%;
  height: 50px;
  padding: 4px;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
}

/* ===========================
   ICON INPUT & SUGGESTIONS
   =========================== */
.icon-input-wrapper {
  display: flex;
  gap: 8px;
  align-items: center;
}

.icon-input-wrapper .form-input {
  flex: 1;
}

.icon-search-container {
  position: relative;
  flex: 1;
}

.icon-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.suggestion-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.suggestion-item:hover {
  background: rgba(139, 92, 246, 0.2);
}

.suggestion-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.suggestion-icon {
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.suggestion-icon.emoji-icon {
  font-size: 1.8rem;
}

.suggestion-label {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.9);
}

/* ===========================
   ICON PREVIEW
   =========================== */
.icon-preview {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: var(--form-bg-color);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.preview-label {
  font-size: 0.85rem;
  color: var(--edit-color);
}
.icon-display {
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.custom-icon-display {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
}

.icon-display i {
  color: var(--edit-color);
}

.emoji-display {
  font-size: 2.5rem;
}

/* ===========================
   EMOJI PRESETS
   =========================== */
.emoji-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.emoji-btn {
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  width: 40px;
  height: 40px;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: var(--edit-bg-color);
  transform: scale(1.1);
}

/* ===========================
   PREVIEW BOX
   =========================== */
.preview {
  margin-top: 24px;
  padding: 20px;
  background: var(--form-bg-color);
  border-radius: 8px;
}

.preview-button {
  aspect-ratio: 1;
  max-width: 150px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  margin: 0 auto;
  position: relative;
  overflow: visible;
  transform-style: preserve-3d;

  background: linear-gradient(
    145deg,
    rgba(40, 40, 60, 0.15) 0%,
    rgba(25, 25, 40, 0.2) 50%,
    rgba(20, 20, 35, 0.25) 100%
  );
  backdrop-filter: blur(40px) saturate(200%);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-right-width: 3px;
  border-bottom-width: 3px;
  border-right-color: rgba(255, 255, 255, 0.15);
  border-bottom-color: rgba(0, 0, 0, 0.4);

  box-shadow:
    12px 0 24px rgba(0, 0, 0, 0.6),
    0 16px 32px rgba(0, 0, 0, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 3px 6px rgba(255, 255, 255, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.4),
    inset -3px 0 6px rgba(0, 0, 0, 0.3);

  transform: rotateY(-3deg) translateZ(30px);
}

.preview-button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.15) 30%,
    transparent 60%,
    rgba(0, 0, 0, 0.15) 100%
  );
  pointer-events: none;
  transform: translateZ(1px);
}

.preview-icon {
  font-size: 2.5rem;
}

.preview-custom-icon {
  width: 2.5rem;
  height: 2.5rem;
  object-fit: contain;
}

.preview-text {
  font-weight: 600;
  font-size: 0.9rem;
  text-align: center;
}

/* ===========================
   FOOTER
   =========================== */
.modal-footer {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.spacer {
  flex: 1;
}

/* ===========================
   BUTTONS
   =========================== */
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4a9eff;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #3a8eef;
}

.btn-secondary {
  background: #3a3a3a;
  color: white;
}

.btn-secondary:hover {
  background: #4a4a4a;
}

.btn-danger {
  background: #ff4a4a;
  color: white;
}

.btn-danger:hover {
  background: #ef3a3a;
}

/* ===========================
   ICON / COMMAND PICKER BUTTONS
   =========================== */
.icon-picker-btn {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  transition: all 0.2s;
}

.icon-picker-btn:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
  transform: translateY(-1px);
}

.icon-picker-btn i {
  font-size: 1rem;
}

.command-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-picker-btn {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border: none;
  color: #fff;
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;
}

.command-picker-btn:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  transform: translateY(-1px);
}

.command-picker-btn i {
  font-size: 1rem;
}

/* ===========================
   POSITION CONTROLS
   =========================== */
.position-controls {
  display: none;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px;
  background: #2a2a2a;
  border-radius: 8px;
  width: 100%;
  margin: 0 auto;
}

.position-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-position {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  font-size: 1.3rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-position:hover {
  background: rgba(139, 92, 246, 0.3);
  transform: scale(1.1);
}

.btn-position:active {
  transform: scale(0.95);
}

.position-info {
  padding: 6px 12px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.9);
  min-width: 100px;
  text-align: center;
}

.position-section {
  display: none;
  margin-top: 24px;
}

/* ===========================
   TRANSITIONS
   =========================== */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

/* ===========================
   RESPONSIVE
   =========================== */
@media (max-width: 640px) {
  .btn .btn-text {
    display: none;
  }

  .btn {
    padding: 12px;
    min-width: 44px;
  }

  .btn i {
    font-size: 1.2rem;
  }

  .position-section {
    display: block;
  }

  .position-controls {
    display: flex;
    padding: 8px;
    gap: 4px;
    max-width: fit-content;
    margin: 0 auto;
  }

  .position-row {
    gap: 4px;
  }

  .btn-position {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .position-info {
    padding: 4px 8px;
    font-size: 0.75rem;
    min-width: 80px;
  }
}

::-webkit-scrollbar {
  width: 0px;
}
</style>
