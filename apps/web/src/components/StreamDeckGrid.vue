<script setup lang="ts">
import { ActionType, type StreamButton as ButtonType } from '@shared/core'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { computed, onMounted, ref } from 'vue'
import { useServerUrl } from '../composables/useServerUrl'
import ButtonEditor from './ButtonEditor.vue'
import DownloadsPage from './DownloadsPage.vue'
import ServerSettings from './ServerSettings.vue'
import StreamButton from './StreamButton.vue'

const toast = useToast()
const confirm = useConfirm()
const { getServerUrl } = useServerUrl()

const props = defineProps<{
  rows?: number
  cols?: number
}>()

const calculateGridDimensions = (totalButtons: number) => {
  const layouts: Record<number, { rows: number; cols: number }> = {
    8: { rows: 2, cols: 4 },
    12: { rows: 3, cols: 4 },
    16: { rows: 4, cols: 4 },
    24: { rows: 4, cols: 6 },
    32: { rows: 4, cols: 8 },
  }
  return layouts[totalButtons] || { rows: 3, cols: 4 }
}

const savedGridSize = parseInt(localStorage.getItem('gridSize') || '12')
const dimensions = calculateGridDimensions(savedGridSize)

console.log('Grid size from localStorage:', savedGridSize)
console.log('Calculated dimensions:', dimensions)
console.log('Props rows/cols:', props.rows, props.cols)

const gridRows = ref(dimensions.rows)
const gridCols = ref(dimensions.cols)

console.log('Final gridRows:', gridRows.value, 'gridCols:', gridCols.value)

const buttons = ref<Map<string, ButtonType>>(new Map())
const showEditor = ref(false)
const showSettings = ref(false)
const showDownloads = ref(false)
const editingButton = ref<ButtonType | null>(null)
const editingPosition = ref({ row: 0, col: 0 })
const isExecuting = ref<string | null>(null)
const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>(
  'disconnected',
)

// Detectar mobile
const isMobileView = ref(false)

// Desktop Drag and drop state
const draggedButton = ref<ButtonType | null>(null)
const dragOverPosition = ref<{ row: number; col: number } | null>(null)

// Touch Drag and drop state (Mobile - siempre activo)
const touchDragButton = ref<ButtonType | null>(null)
const touchOverPosition = ref<{ row: number; col: number } | null>(null)
const touchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const isPressing = ref<string | null>(null) // Para la animación visual

const API_URL = getServerUrl()

const gridItems = computed(() => {
  const items: Array<{ row: number; col: number; button: ButtonType | null }> =
    []
  for (let row = 0; row < gridRows.value; row++) {
    for (let col = 0; col < gridCols.value; col++) {
      const button = Array.from(buttons.value.values()).find(
        (b) => b.position.row === row && b.position.col === col,
      )
      items.push({ row, col, button: button || null })
    }
  }
  return items
})

onMounted(() => {
  isMobileView.value = window.innerWidth <= 850

  const handleResize = () => {
    isMobileView.value = window.innerWidth <= 850
  }
  window.addEventListener('resize', handleResize)

  loadButtons()
  checkConnection()
})

const checkConnection = async () => {
  try {
    connectionStatus.value = 'connecting'
    const response = await fetch(`${API_URL}/command`)
    if (response.ok) {
      connectionStatus.value = 'connected'
    } else {
      connectionStatus.value = 'disconnected'
    }
  } catch (error) {
    connectionStatus.value = 'disconnected'
  }
}

const loadButtons = async () => {
  try {
    const response = await fetch(`${API_URL}/command`)
    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data)) {
        data.forEach((cmd: any, index: number) => {
          let actionType = ActionType.COMMAND
          if (
            cmd.type === 'url' ||
            (cmd.payload && cmd.payload.startsWith('http'))
          ) {
            actionType = ActionType.URL
          }

          const button: ButtonType = {
            id: cmd.id,
            label: cmd.label || 'Sin nombre',
            icon: cmd.icon || '⚙️',
            color: cmd.color || '#ffffff',
            backgroundColor: cmd.backgroundColor || '#2c3e50',
            action: {
              type: actionType,
              payload: cmd.payload,
            },
            position: cmd.position || {
              row: Math.floor(index / gridCols.value),
              col: index % gridCols.value,
            },
          }

          if (
            button.position.row < gridRows.value &&
            button.position.col < gridCols.value
          ) {
            buttons.value.set(button.id, button)
          }
        })
      }
    }
  } catch (error) {
    console.error('Error loading buttons:', error)
  }
}

const saveButtons = async () => {
  try {
    const commandsToSave = Array.from(buttons.value.values()).map((btn) => ({
      id: btn.id,
      label: btn.label,
      icon: btn.icon,
      type: 'command',
      payload: btn.action.payload,
      position: btn.position,
    }))

    await fetch(`${API_URL}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commandsToSave),
    })
  } catch (error) {
    console.error('Error saving buttons:', error)
  }
}

const handleButtonClick = async (button: ButtonType | null) => {
  if (!button) return

  // No ejecutar si se está arrastrando en mobile
  if (touchDragButton.value) return

  try {
    isExecuting.value = button.id
    const response = await fetch(`${API_URL}/command/execute/${button.id}`, {
      method: 'POST',
    })

    if (response.ok) {
      const result = await response.json()
      toast.removeAllGroups()
      toast.add({
        severity: 'success',
        summary: '✅ Ejecutado',
        detail: `${button.label} ejecutado correctamente`,
        life: 3000,
      })
      console.log('Comando ejecutado:', result)
    } else {
      const error = await response.json()
      toast.removeAllGroups()
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo ejecutar el comando',
        life: 5000,
      })
    }
  } catch (error) {
    console.error('Error executing command:', error)
    toast.removeAllGroups()
    toast.add({
      severity: 'error',
      summary: 'Error de conexión',
      detail: 'No se pudo conectar con el servidor',
      life: 4000,
    })
  } finally {
    setTimeout(() => {
      isExecuting.value = null
    }, 300)
  }
}

const handleButtonEdit = (
  button: ButtonType | null,
  position: { row: number; col: number },
) => {
  // No abrir editor en mobile/tablet
  if (isMobileView.value) return

  editingButton.value = button
  editingPosition.value = position
  showEditor.value = true
}

// Touch drag & drop - siempre activo en mobile
const startY = ref(0) // Para detectar si el usuario intenta hacer scroll

const handleTouchStart = (
  button: ButtonType | null,
  position: { row: number; col: number },
  event: TouchEvent,
) => {
  if (!button) return

  // Guardamos la posición inicial del toque
  startY.value = event.touches[0].clientY
  isPressing.value = button.id

  if (touchTimer.value) clearTimeout(touchTimer.value)

  touchTimer.value = setTimeout(() => {
    if (navigator.vibrate) navigator.vibrate(100)
    touchDragButton.value = button
    isPressing.value = null
  }, 1000) // 1 segundos
}

const handleTouchMove = (event: TouchEvent) => {
  // Si NO se ha activado el modo arrastre (no han pasado los 2s)
  if (!touchDragButton.value) {
    const currentY = event.touches[0].clientY
    const diffY = Math.abs(currentY - startY.value)

    // Si el usuario mueve el dedo más de 10px, asumimos que quiere hacer SCROLL
    if (diffY > 10) {
      if (touchTimer.value) {
        clearTimeout(touchTimer.value)
        touchTimer.value = null
      }
      isPressing.value = null
    }
    return // Salimos para dejar que el navegador haga scroll
  }

  // SI YA PASARON LOS 2 SEGUNDOS: Bloqueamos scroll y movemos el botón
  if (event.cancelable) event.preventDefault()

  const touch = event.touches[0]
  const element = document.elementFromPoint(touch.clientX, touch.clientY)
  const gridItem = element?.closest('[data-grid-row]')

  if (gridItem) {
    const row = parseInt(gridItem.getAttribute('data-grid-row') || '-1')
    const col = parseInt(gridItem.getAttribute('data-grid-col') || '-1')
    if (row !== -1 && col !== -1) {
      touchOverPosition.value = { row, col }
    }
  }
}

const handleTouchEnd = () => {
  // 1. Limpiamos el temporizador SIEMPRE
  if (touchTimer.value) {
    clearTimeout(touchTimer.value)
    touchTimer.value = null
  }

  // 2. Limpiamos la animación de pulso SIEMPRE
  isPressing.value = null

  // 3. Si no se llegó a activar el drag, salimos aquí
  if (!touchDragButton.value) return

  // Lógica de intercambio de posición (tu lógica actual)
  const sourceButton = touchDragButton.value
  const targetPos = touchOverPosition.value

  if (
    targetPos &&
    (sourceButton.position.row !== targetPos.row ||
      sourceButton.position.col !== targetPos.col)
  ) {
    const targetButton = Array.from(buttons.value.values()).find(
      (b) =>
        b.position.row === targetPos.row && b.position.col === targetPos.col,
    )

    const oldPosition = { ...sourceButton.position }
    sourceButton.position = { ...targetPos }

    if (targetButton) {
      targetButton.position = oldPosition
      buttons.value.set(targetButton.id, targetButton)
    }

    buttons.value.set(sourceButton.id, sourceButton)
    saveButtons()

    if (navigator.vibrate) navigator.vibrate([30, 10, 30])
  }

  // 4. Limpiamos el estado de arrastre al final
  touchDragButton.value = null
  touchOverPosition.value = null
}

const isTouchDragging = (button: ButtonType | null): boolean => {
  if (!button || !touchDragButton.value) return false
  return touchDragButton.value.id === button.id
}

const isTouchDragOver = (position: { row: number; col: number }): boolean => {
  return !!(
    touchOverPosition.value?.row === position.row &&
    touchOverPosition.value?.col === position.col &&
    touchDragButton.value !== null
  )
}

const handleSaveButton = (button: ButtonType) => {
  buttons.value.set(button.id, button)
  saveButtons()
}

const handleDeleteButton = (id: string) => {
  buttons.value.delete(id)
  saveButtons()
}

const clearAll = () => {
  confirm.require({
    message: '¿Estás seguro de que quieres eliminar todos los botones?',
    header: 'Confirmar eliminación',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Sí, eliminar',
    rejectLabel: 'Cancelar',
    accept: () => {
      buttons.value.clear()
      saveButtons()
      toast.removeAllGroups()
      toast.add({
        severity: 'info',
        summary: 'Botones eliminados',
        detail: 'Todos los botones han sido eliminados',
        life: 3000,
      })
    },
  })
}

const loadMultimediaPresets = async () => {
  try {
    const response = await fetch(`${API_URL}/command/presets/multimedia`)
    if (response.ok) {
      const presets = await response.json()
      showPresetsDialog.value = true
      multimediaPresets.value = presets
    }
  } catch (error) {
    console.error('Error loading multimedia presets:', error)
    toast.removeAllGroups()
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudieron cargar los comandos multimedia',
      life: 4000,
    })
  }
}

const showPresetsDialog = ref(false)
const multimediaPresets = ref<any[]>([])

const addPresetButton = (preset: any) => {
  for (let row = 0; row < gridRows.value; row++) {
    for (let col = 0; col < gridCols.value; col++) {
      const exists = Array.from(buttons.value.values()).find(
        (b) => b.position.row === row && b.position.col === col,
      )
      if (!exists) {
        const newButton: ButtonType = {
          id: `${preset.id}-${Date.now()}`,
          label: preset.label,
          icon: preset.icon,
          color: '#ffffff',
          backgroundColor: '#8b5cf6',
          action: {
            type: ActionType.COMMAND,
            payload: preset.payload,
          },
          position: { row, col },
        }
        buttons.value.set(newButton.id, newButton)
        saveButtons()
        toast.removeAllGroups()
        toast.add({
          severity: 'success',
          summary: 'Botón agregado',
          detail: `${preset.label} agregado correctamente`,
          life: 3000,
        })
        return
      }
    }
  }
  toast.removeAllGroups()
  toast.add({
    severity: 'warn',
    summary: 'Sin espacio',
    detail: 'No hay espacio disponible en la cuadrícula',
    life: 4000,
  })
}

// Desktop Drag and Drop handlers
const handleDragStart = (button: ButtonType | null) => {
  if (!button) return
  draggedButton.value = button
}

const handleDragEnd = () => {
  draggedButton.value = null
  dragOverPosition.value = null
}

const handleDragOver = (position: { row: number; col: number }) => {
  dragOverPosition.value = position
}

const handleDragLeave = () => {
  dragOverPosition.value = null
}

const handleDrop = (targetPosition: { row: number; col: number }) => {
  if (!draggedButton.value) return

  const sourceButton = draggedButton.value
  const targetButton = Array.from(buttons.value.values()).find(
    (b) =>
      b.position.row === targetPosition.row &&
      b.position.col === targetPosition.col,
  )

  const oldPosition = { ...sourceButton.position }
  sourceButton.position = targetPosition

  if (targetButton) {
    targetButton.position = oldPosition
  }

  buttons.value.set(sourceButton.id, sourceButton)
  if (targetButton) {
    buttons.value.set(targetButton.id, targetButton)
  }

  saveButtons()
  draggedButton.value = null
  dragOverPosition.value = null

  toast.removeAllGroups()
  toast.add({
    severity: 'success',
    summary: 'Botón movido',
    detail: 'El botón se ha reubicado correctamente',
    life: 2000,
  })
}

const isDragging = (button: ButtonType | null): boolean => {
  return !!(button && draggedButton.value?.id === button.id)
}

const isDragOver = (position: { row: number; col: number }): boolean => {
  return !!(
    dragOverPosition.value?.row === position.row &&
    dragOverPosition.value?.col === position.col
  )
}

const handleMovePosition = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!editingButton.value) return

  const currentPos = editingPosition.value
  let newRow = currentPos.row
  let newCol = currentPos.col

  switch (direction) {
    case 'up':
      newRow = Math.max(0, currentPos.row - 1)
      break
    case 'down':
      newRow = Math.min(gridRows.value - 1, currentPos.row + 1)
      break
    case 'left':
      newCol = Math.max(0, currentPos.col - 1)
      break
    case 'right':
      newCol = Math.min(gridCols.value - 1, currentPos.col + 1)
      break
  }

  if (newRow === currentPos.row && newCol === currentPos.col) return

  const targetButton = Array.from(buttons.value.values()).find(
    (b) => b.position.row === newRow && b.position.col === newCol,
  )

  editingButton.value.position = { row: newRow, col: newCol }
  if (targetButton) {
    targetButton.position = currentPos
    buttons.value.set(targetButton.id, targetButton)
  }

  buttons.value.set(editingButton.value.id, editingButton.value)
  editingPosition.value = { row: newRow, col: newCol }

  saveButtons()

  toast.removeAllGroups()
  toast.add({
    severity: 'success',
    summary: 'Botón movido',
    detail: 'El botón se ha reubicado correctamente',
    life: 2000,
  })
}
</script>

<template>
  <div class="stream-deck-container">
    <div class="header">
      <div class="title-section">
        <img
          src="/logo/SpartanHub-logo.png"
          alt="SpartanHub Logo"
          width="150"
          class="logo"
        />
        <div class="connection-status" :class="connectionStatus">
          <span class="status-dot"></span>
          <span class="status-text">
            {{
              connectionStatus === 'connected'
                ? 'Conectado'
                : connectionStatus === 'connecting'
                  ? 'Conectando...'
                  : 'Desconectado'
            }}
          </span>
        </div>
      </div>
      <div class="actions">
        <button
          @click="showDownloads = true"
          title="Descargar Servidor"
          class="btn-icon btn-download flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 hover:from-yellow-500 hover:to-yellow-700 dark:bg-gradient-to-r dark:from-yellow-500 dark:to-yellow-700 dark:text-yellow-100 light:bg-gradient-to-r light:from-yellow-300 light:to-yellow-500 light:text-yellow-900"
        >
          <img src="/icons/download-blue.svg" alt="Descargar" class="btn-svg" />
          <span class="btn-text">Descargar</span>
        </button>
        <button
          @click="showSettings = true"
          title="Configuración"
          class="btn-icon btn-settings flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gradient-to-r from-green-500 to-green-700 text-white hover:from-green-600 hover:to-green-800 dark:bg-gradient-to-r dark:from-green-600 dark:to-green-800 dark:text-green-100 light:bg-gradient-to-r light:from-green-300 light:to-green-500 light:text-green-900"
        >
          <img src="/icons/config.svg" alt="Configuración" class="btn-svg" />
          <span class="btn-text">Configuración</span>
        </button>
        <button
          @click="loadMultimediaPresets"
          title="Comandos multimedia"
          class="btn-icon btn-multimedia flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 dark:bg-gradient-to-r dark:from-purple-600 dark:to-indigo-700 dark:text-purple-100 light:bg-gradient-to-r light:from-purple-300 light:to-indigo-400 light:text-purple-900"
        >
          <img src="/icons/note-music.svg" alt="Multimedia" class="btn-svg" />
          <span class="btn-text">Multimedia</span>
        </button>
        <button
          @click="checkConnection"
          title="Reconectar"
          class="btn-icon btn-reconnect flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gray-200 text-neutral-800 hover:bg-gray-300 dark:bg-gray-700 dark:text-neutral-100 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
        >
          <img src="/icons/reconect.svg" alt="Reconectar" class="btn-svg" />
          <span class="btn-text">Reconectar</span>
        </button>
        <button
          @click="loadButtons"
          title="Recargar"
          class="btn-icon btn-reload flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gray-200/100 text-neutral-800 hover:bg-gray-300/100 dark:bg-gray-700/100 dark:text-neutral-100 dark:hover:bg-gray-600/100 border border-gray-300 dark:border-gray-600"
        >
          <img src="/icons/reload.svg" alt="Recargar" class="btn-svg" />
          <span class="btn-text">Recargar</span>
        </button>
        <button
          @click="clearAll"
          title="Limpiar todo"
          class="btn-icon btn-clear flex items-center gap-3 px-6 py-4 rounded-xl shadow font-semibold text-lg transition mx-2 bg-gray-200/100 text-red-700 hover:bg-gray-300/100 dark:bg-gray-700/100 dark:text-red-200 dark:hover:bg-gray-600/100 border border-gray-300 dark:border-gray-600"
        >
          <img src="/icons/delete-grid.svg" alt="Eliminar" class="btn-svg" />
          <span class="btn-text">Limpiar Botones</span>
        </button>
      </div>
    </div>

    <p class="hint" v-if="!isMobileView">
      Click para ejecutar • Click derecho para editar • Arrastra para
      reorganizar
    </p>
    <p class="hint" v-else>
      Toca para ejecutar • Mantén presionado 1s para reorganizar
    </p>

    <div
      class="grid"
      :style="{
        '--grid-cols': gridCols,
        '--grid-rows': gridRows,
      }"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div
        v-for="item in gridItems"
        :key="`${item.row}-${item.col}`"
        class="grid-item"
        :class="{
          executing: isExecuting === item.button?.id,
          'is-pressing': isPressing === item.button?.id,
          'touch-dragging': isTouchDragging(item.button),
          'touch-drag-over': isTouchDragOver({ row: item.row, col: item.col }),
        }"
        :data-grid-row="item.row"
        :data-grid-col="item.col"
        @touchstart="
          handleTouchStart(
            item.button,
            { row: item.row, col: item.col },
            $event,
          )
        "
      >
        <StreamButton
          :button="item.button"
          :isEmpty="!item.button"
          :isDragging="isDragging(item.button)"
          :isDragOver="isDragOver({ row: item.row, col: item.col })"
          :isSelected="false"
          @click="handleButtonClick(item.button)"
          @edit="
            handleButtonEdit(item.button, { row: item.row, col: item.col })
          "
          @dragstart="handleDragStart(item.button)"
          @dragend="handleDragEnd"
          @dragover="handleDragOver({ row: item.row, col: item.col })"
          @dragleave="handleDragLeave"
          @drop="handleDrop({ row: item.row, col: item.col })"
        />
      </div>
    </div>

    <ServerSettings v-model:show="showSettings" />

    <DownloadsPage v-if="showDownloads" @close="showDownloads = false" />

    <!-- Editor solo en desktop -->
    <ButtonEditor
      v-if="!isMobileView"
      :show="showEditor"
      :button="editingButton"
      :position="editingPosition"
      @save="handleSaveButton"
      @delete="handleDeleteButton"
      @move-position="handleMovePosition"
      @close="showEditor = false"
    />

    <!-- Diálogo de comandos multimedia -->
    <div
      v-if="showPresetsDialog"
      class="presets-dialog-overlay"
      @click="showPresetsDialog = false"
    >
      <div class="presets-dialog" @click.stop>
        <div class="presets-header">
          <h2>Comandos Multimedia</h2>
          <button @click="showPresetsDialog = false" class="close-btn">
            ✕
          </button>
        </div>
        <div class="presets-content">
          <p class="presets-description">
            Haz clic en un comando para agregarlo a Spartan Hub
          </p>
          <div class="presets-grid">
            <div
              v-for="preset in multimediaPresets"
              :key="preset.id"
              class="preset-card"
              @click="addPresetButton(preset)"
            >
              <div class="preset-icon">{{ preset.icon }}</div>
              <div class="preset-info">
                <div class="preset-label">{{ preset.label }}</div>
                <div class="preset-description">{{ preset.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <footer class="footer">
      <p class="credits">
        Hecho por
        <a
          href="https://mhenriquezdev.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Manuel Henriquez
        </a>
      </p>
      <p class="copyright">© 2026 - Todos los derechos reservados</p>
    </footer>
  </div>
</template>

<style scoped>
.stream-deck-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

@media (max-width: 640px) {
  .stream-deck-container {
    padding: 12px;
  }
}

/* Evita que el estado active/hover se quede pegado en móviles */
@media (hover: none) {
  .grid-item:active,
  .btn-icon:active {
    background: inherit;
    transform: none;
  }
}

.header {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
}

@media (max-width: 1024px) {
  .actions .btn-download {
    display: none !important;
  }
}

@media (max-width: 850px) {
  .actions {
    width: 100%;
    display: grid !important;
    grid-template-columns: repeat(3, 1fr) !important;
    gap: 10px !important;
  }

  .actions .btn-icon {
    flex-direction: column;
    padding: 12px 8px;
    height: auto;
    min-height: 60px;
    font-size: 0.75rem;
  }

  .actions .btn-svg {
    width: 28px;
    height: 28px;
  }
}

@media (max-width: 640px) {
  .header {
    gap: 16px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .header h1 {
    font-size: 1.5rem !important;
  }
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 0.85rem;
  text-align: center;
  width: max-content;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 1s infinite;
}

.connection-status.connected .status-dot {
  background: #4ade80;
}

.connection-status.disconnected .status-dot {
  background: #ef4444;
  animation: none;
}

.connection-status.connecting .status-dot {
  background: #fbbf24;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.actions {
  display: flex;
  gap: 12px;
}

.btn-icon {
  width: auto;
  min-width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  /* background eliminado para permitir que Tailwind controle el color de fondo */
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 12px;
}

.btn-svg {
  width: 24px;
  height: 24px;
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-text {
  white-space: nowrap;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-icon.btn-download {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.btn-icon.btn-download:hover {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
}

.btn-icon.btn-settings {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.btn-icon.btn-settings:hover {
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
}

.btn-icon.btn-multimedia {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
}

.btn-icon.btn-multimedia:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
}

.hint {
  color: var(--hint-color);
  font-size: 0.9rem;
  margin: 0 0 16px 0;
  text-align: center;
  transition: color 0.3s ease;
}

@media (max-width: 640px) {
  .hint {
    font-size: 0.75rem;
    margin-bottom: 12px;
  }
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: 20px;
  flex: 1;
  margin-bottom: 24px;
  padding: 30px;
  border-radius: 16px;
  /* background eliminado para que el fondo dependa solo del tema */
  box-shadow:
    0 2px 8px rgba(120, 120, 130, 0.1),
    0 8px 24px rgba(120, 120, 130, 0.13);
  /* border eliminado para que el borde dependa solo del tema */
  position: relative;
  touch-action: pan-y;
  user-select: none;
  grid-auto-rows: 1fr;
  perspective: 1000px;
  perspective-origin: center;
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
    padding: 16px;
  }

  .actions {
    gap: 8px;
  }
}

@media (min-width: 641px) and (max-width: 1024px) {
  .grid {
    gap: 10px;
    padding: 20px;
  }
}

.grid::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 18px;
  padding: 2px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.02) 50%,
    rgba(0, 0, 0, 0.1) 100%
  );
  -webkit-mask:
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.grid-item {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  touch-action: inheritance;
  will-change: transform, opacity;
  pointer-events: auto;
}

.grid-item.executing {
  animation: execute-flash 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes execute-flash {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(0.96);
    filter: brightness(1.3);
  }
  100% {
    transform: scale(1);
    filter: brightness(1);
  }
}

/* Touch drag & drop */
.grid-item.touch-dragging {
  opacity: 0.4;
  transform: scale(0.92);
}

.grid-item.touch-drag-over {
  transform: scale(0.95);
  outline: 2px solid #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
}

.grid-item.is-pressing {
  animation: pulse-wait 1s ease-in-out infinite;
  filter: contrast(1.2) brightness(1.2);
}

@keyframes pulse-wait {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1.05);
  }
}

.grid-item.touch-dragging {
  z-index: 100;
  opacity: 0.9;
  transform: scale(1.15) translateY(-5px);
  filter: brightness(1.1);
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.6);
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  pointer-events: none;
}

.footer {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 2px solid rgba(255, 255, 255, 0.1);
  text-align: center;
}

.credits {
  color: var(--credits-color);
  font-size: 0.9rem;
  margin: 0 0 8px 0;
  transition: color 0.3s ease;
}

.credits a {
  color: rgba(139, 92, 246, 0.9);
  text-decoration: none;
  font-weight: 600;
  transition: all 0.3s ease;
  border-bottom: 1px solid transparent;
}

.credits a:hover {
  color: rgb(139, 92, 246);
  border-bottom-color: rgba(139, 92, 246, 0.5);
}

:global([data-theme='light']) .credits a {
  color: rgba(139, 92, 246, 1);
}

:global([data-theme='light']) .credits a:hover {
  color: rgb(109, 62, 216);
  border-bottom-color: rgba(139, 92, 246, 0.8);
}

.copyright {
  color: var(--credits-color);
  font-size: 0.8rem;
  margin: 0;
  opacity: 0.7;
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
  }

  .title-section {
    flex-direction: column;
    gap: 12px;
    text-align: center;
  }

  .grid {
    gap: 12px;
  }
}

.presets-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.presets-dialog {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 16px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUpDialog 0.3s;
}

@keyframes slideUpDialog {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.presets-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.presets-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
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

.presets-content {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 100px);
}

.presets-description {
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  font-size: 0.9rem;
}

.presets-grid {
  display: grid;
  gap: 12px;
}

.preset-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all 0.2s;
}

.preset-card:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateX(4px);
}

.preset-icon {
  font-size: 2rem;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border-radius: 12px;
  flex-shrink: 0;
}

.preset-info {
  flex: 1;
}

.preset-label {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
  color: #fff;
}

.preset-description {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
}

/* ⭐ Forzar limpieza de estado touch en grid */
.grid-item {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* Prevenir estados pegados en mobile */
@media (max-width: 850px) {
  .grid-item * {
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }
}

/* ===========================
   LIGHT THEME OVERRIDES
   =========================== */

/* Header y Footer — bordes visibles */
:global([data-theme='light']) .header {
  border-bottom-color: rgba(0, 0, 0, 0.1);
}

:global([data-theme='light']) .footer {
  border-top-color: rgba(0, 0, 0, 0.1);
}

/* Botones del header */
:global([data-theme='light']) .btn-icon {
  background: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.8);
}

:global([data-theme='light']) .btn-icon:hover {
  background: rgba(0, 0, 0, 0.12);
}

:global([data-theme='light']) .btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* Estado de conexión */
:global([data-theme='light']) .connection-status {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.7);
}

/* Grid — fondo claro y moderno para light mode */
:global([data-theme='light']) .grid {
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.08);
}

/* Overlay del diálogo de presets — FIX PRINCIPAL */
:global([data-theme='light']) .presets-dialog-overlay {
  background: rgba(0, 0, 0, 0.5);
}

/* Diálogo de presets */
:global([data-theme='light']) .presets-dialog {
  background: #ffffff;
  box-shadow: 0 20px 60px rgba(255, 254, 254, 0.15);
  border-color: rgba(0, 0, 0, 0.08);
}

:global([data-theme='light']) .presets-header {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

:global([data-theme='light']) .presets-header h2 {
  color: rgba(0, 0, 0, 0.87);
}

:global([data-theme='light']) .close-btn {
  background: rgba(0, 0, 0, 0.07);
  color: rgba(0, 0, 0, 0.8);
}

:global([data-theme='light']) .close-btn:hover {
  background: rgba(0, 0, 0, 0.12);
}

:global([data-theme='light']) .presets-description {
  color: rgba(0, 0, 0, 0.6);
}

:global([data-theme='light']) .preset-card {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.08);
}

:global([data-theme='light']) .preset-card:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: rgba(139, 92, 246, 0.4);
}

:global([data-theme='light']) .preset-label {
  color: rgba(0, 0, 0, 0.87);
}

:global([data-theme='light']) .preset-description {
  color: rgba(0, 0, 0, 0.55);
}
</style>
