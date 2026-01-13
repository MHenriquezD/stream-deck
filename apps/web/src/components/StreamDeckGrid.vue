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

// Función para calcular rows y cols basado en el tamaño total
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
  'disconnected'
)

// Modo edición para móviles
const isMobileView = ref(false)
const isTouchDevice = ref(false)
const editMode = ref(false)
const selectedButtonForMove = ref<ButtonType | null>(null)

// Drag and drop state
const draggedButton = ref<ButtonType | null>(null)
const dragOverPosition = ref<{ row: number; col: number } | null>(null)

const API_URL = getServerUrl()

const gridItems = computed(() => {
  const items: Array<{ row: number; col: number; button: ButtonType | null }> =
    []
  for (let row = 0; row < gridRows.value; row++) {
    for (let col = 0; col < gridCols.value; col++) {
      const button = Array.from(buttons.value.values()).find(
        (b) => b.position.row === row && b.position.col === col
      )
      items.push({ row, col, button: button || null })
    }
  }
  return items
})

onMounted(() => {
  // Detectar si es un dispositivo táctil o pantalla móvil
  isTouchDevice.value = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  isMobileView.value = window.innerWidth <= 850

  // Listener para cambios de tamaño de ventana
  const handleResize = () => {
    isMobileView.value = window.innerWidth <= 850
    if (!isMobileView.value) {
      editMode.value = false
      selectedButtonForMove.value = null
    }
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
      // Convertir comandos del backend a botones
      if (Array.isArray(data)) {
        data.forEach((cmd: any, index: number) => {
          // Determinar el tipo de acción basado en el campo 'type' o inferirlo del payload
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

          // Solo agregar botones que estén dentro de los límites de la cuadrícula
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
  if (!button) {
    return
  }

  // Si está en modo edición, seleccionar el botón en lugar de ejecutar
  if (editMode.value) {
    selectedButtonForMove.value = button
    return
  }

  // Detectar si es un botón de volumen para mostrar el controlador
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
  position: { row: number; col: number }
) => {
  editingButton.value = button
  editingPosition.value = position
  showEditor.value = true
}

const toggleEditMode = () => {
  editMode.value = !editMode.value
  if (!editMode.value) {
    selectedButtonForMove.value = null
  }
}

const moveSelectedButton = (direction: 'up' | 'down' | 'left' | 'right') => {
  if (!selectedButtonForMove.value) return

  const currentButton = selectedButtonForMove.value

  // Convertir posición actual a índice lineal
  const currentIndex =
    currentButton.position.row * gridCols.value + currentButton.position.col
  let newIndex = currentIndex

  // Calcular nuevo índice según dirección
  // En móvil (2 columnas): arriba/abajo mueven 2 espacios, izquierda/derecha mueven 1
  // Siempre permite salto de línea
  switch (direction) {
    case 'up':
      // Retroceder 2 posiciones (salta de línea si es necesario)
      newIndex = Math.max(0, currentIndex - 2)
      break
    case 'down':
      // Avanzar 2 posiciones (salta de línea si es necesario)
      newIndex = Math.min(gridRows.value * gridCols.value - 1, currentIndex + 2)
      break
    case 'left':
      // Retroceder 1 posición (salta de línea si es necesario)
      newIndex = Math.max(0, currentIndex - 1)
      break
    case 'right':
      // Avanzar 1 posición (salta de línea si es necesario)
      newIndex = Math.min(gridRows.value * gridCols.value - 1, currentIndex + 1)
      break
  }

  // Convertir índice lineal de vuelta a row/col
  const newPosition = {
    row: Math.floor(newIndex / gridCols.value),
    col: newIndex % gridCols.value,
  }

  // Verificar si la nueva posición está ocupada
  const targetButton = Array.from(buttons.value.values()).find(
    (b) =>
      b.position.row === newPosition.row &&
      b.position.col === newPosition.col &&
      b.id !== currentButton.id
  )

  // Si hay un botón en la posición destino, intercambiar posiciones
  if (targetButton) {
    const tempPosition = { ...targetButton.position }
    targetButton.position = { ...currentButton.position }
    currentButton.position = newPosition
    buttons.value.set(targetButton.id, targetButton)
  } else {
    // Si no hay botón, simplemente mover
    currentButton.position = newPosition
  }

  // Actualizar el botón actual
  buttons.value.set(currentButton.id, currentButton)
  selectedButtonForMove.value = currentButton

  // Guardar cambios
  saveButtons()

  // Hacer scroll para mantener el botón visible
  setTimeout(() => {
    const gridElement = document.querySelector('.grid')
    if (gridElement) {
      const buttonElements = gridElement.querySelectorAll('.stream-button')
      const buttonIndex = newIndex
      const buttonElement = buttonElements[buttonIndex] as HTMLElement

      if (buttonElement) {
        buttonElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        })
      }
    }
  }, 50)
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
  // Buscar primera posición vacía
  for (let row = 0; row < gridRows.value; row++) {
    for (let col = 0; col < gridCols.value; col++) {
      const exists = Array.from(buttons.value.values()).find(
        (b) => b.position.row === row && b.position.col === col
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

// Drag and Drop handlers
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
      b.position.col === targetPosition.col
  )

  // Actualizar posiciones
  const oldPosition = { ...sourceButton.position }
  sourceButton.position = targetPosition

  if (targetButton) {
    targetButton.position = oldPosition
  }

  // Actualizar el mapa de botones
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

  // Si no hay cambio de posición, no hacer nada
  if (newRow === currentPos.row && newCol === currentPos.col) return

  // Buscar si hay un botón en la posición objetivo
  const targetButton = Array.from(buttons.value.values()).find(
    (b) => b.position.row === newRow && b.position.col === newCol
  )

  // Intercambiar posiciones
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
        <h1>MHenriquez Stream Deck</h1>
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
          class="btn-icon btn-download"
          title="Descargar Servidor"
        >
          <img src="/icons/download-blue.svg" alt="Descargar" class="btn-svg" />
          <span class="btn-text">Descargar</span>
        </button>
        <button
          @click="showSettings = true"
          class="btn-icon btn-settings"
          title="Configuración"
        >
          <img src="/icons/config.svg" alt="Configuración" class="btn-svg" />
          <span class="btn-text">Configuración</span>
        </button>
        <button
          @click="loadMultimediaPresets"
          class="btn-icon btn-multimedia"
          title="Comandos multimedia"
        >
          <img src="/icons/note-music.svg" alt="Multimedia" class="btn-svg" />
          <span class="btn-text">Multimedia</span>
        </button>
        <button @click="checkConnection" class="btn-icon" title="Reconectar">
          <img src="/icons/reconect.svg" alt="Reconectar" class="btn-svg" />
          <span class="btn-text">Reconectar</span>
        </button>
        <button @click="loadButtons" class="btn-icon" title="Recargar">
          <img src="/icons/reload.svg" alt="Recargar" class="btn-svg" />
          <span class="btn-text">Recargar</span>
        </button>
        <button
          @click="clearAll"
          class="btn-icon btn-danger"
          title="Limpiar todo"
        >
          <img src="/icons/delete-grid.svg" alt="Eliminar" class="btn-svg" />
          <span class="btn-text">Limpiar Botones</span>
        </button>
        <button
          v-if="isMobileView || isTouchDevice"
          @click="toggleEditMode"
          class="btn-icon"
          :class="{ 'btn-edit-active': editMode }"
          title="Modo Edición"
        >
          <i class="pi" :class="editMode ? 'pi-check-circle' : 'pi-pencil'"></i>
          <span class="btn-text">Modo Edición</span>
        </button>
      </div>
    </div>

    <p class="hint" v-if="!editMode">
      Click para ejecutar • Click derecho para editar • Arrastra para
      reorganizar
    </p>
    <p class="hint" v-else>
      🎯 Modo Edición: Toca un botón para seleccionarlo y usa las flechas para
      moverlo
    </p>

    <div
      class="grid"
      :style="{
        '--grid-cols': gridCols,
        '--grid-rows': gridRows,
      }"
    >
      <div
        v-for="item in gridItems"
        :key="`${item.row}-${item.col}`"
        class="grid-item"
        :class="{ executing: isExecuting === item.button?.id }"
      >
        <StreamButton
          :button="item.button"
          :isEmpty="!item.button"
          :isDragging="isDragging(item.button)"
          :isDragOver="isDragOver({ row: item.row, col: item.col })"
          :isSelected="
            !!(
              editMode &&
              selectedButtonForMove &&
              item.button?.id === selectedButtonForMove.id
            )
          "
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

    <!-- Controles flotantes para mover botón seleccionado -->
    <div v-if="editMode && selectedButtonForMove" class="floating-controls">
      <div class="control-container">
        <button
          @click="moveSelectedButton('up')"
          class="control-btn"
          title="Mover arriba"
        >
          <i class="pi pi-arrow-up"></i>
        </button>
        <div class="control-row">
          <button
            @click="moveSelectedButton('left')"
            class="control-btn"
            title="Mover izquierda"
          >
            <i class="pi pi-arrow-left"></i>
          </button>
          <div class="control-info">
            {{ selectedButtonForMove.label }}
          </div>
          <button
            @click="moveSelectedButton('right')"
            class="control-btn"
            title="Mover derecha"
          >
            <i class="pi pi-arrow-right"></i>
          </button>
        </div>
        <button
          @click="moveSelectedButton('down')"
          class="control-btn"
          title="Mover abajo"
        >
          <i class="pi pi-arrow-down"></i>
        </button>
        <button
          @click="selectedButtonForMove = null"
          class="control-btn control-close"
          title="Deseleccionar"
        >
          <i class="pi pi-times"></i>
        </button>
      </div>
    </div>

    <ServerSettings v-model:show="showSettings" />

    <DownloadsPage v-if="showDownloads" @close="showDownloads = false" />

    <ButtonEditor
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
            Haz clic en un comando para agregarlo a tu Stream Deck
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
          >Manuel Henriquez</a
        >
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

/* Ocultar botón de descarga en pantallas menores a 1024px */
@media (max-width: 1024px) {
  .actions .btn-download {
    display: none !important;
  }
}

/* Botones en grid para pantallas menores a 850px */
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
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: pulse 2s infinite;
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
  background: rgba(255, 255, 255, 0.1);
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

.btn-icon.btn-edit-active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
}

.btn-icon.btn-edit-active:hover {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
}

/* Controles flotantes para modo edición */
.floating-controls {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.control-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: rgba(20, 20, 30, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 16px;
  border: 2px solid rgba(34, 197, 94, 0.3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 197, 94, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.1);
}

.control-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(34, 197, 94, 0.2);
  border: 2px solid rgba(34, 197, 94, 0.4);
  border-radius: 12px;
  color: #22c55e;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.control-btn:hover {
  background: rgba(34, 197, 94, 0.3);
  border-color: rgba(34, 197, 94, 0.6);
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-btn.control-close {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.4);
  color: #ef4444;
  margin-top: 4px;
}

.control-btn.control-close:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: rgba(239, 68, 68, 0.6);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.control-info {
  padding: 8px 16px;
  background: rgba(139, 92, 246, 0.2);
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 8px;
  color: #a78bfa;
  font-size: 14px;
  font-weight: 600;
  text-align: center;
  min-width: 120px;
  backdrop-filter: blur(10px);
}

.grid {
  display: grid;
  grid-template-columns: repeat(var(--grid-cols), 1fr);
  grid-template-rows: repeat(var(--grid-rows), 1fr);
  gap: 12px;
  flex: 1;
  margin-bottom: 24px;
  padding: 24px;
  border-radius: 16px;

  /* Fondo tipo Stream Deck real */
  background: linear-gradient(145deg, #0a0a0a, #141414);
  box-shadow: inset 0 0 0 2px #000, inset 0 4px 8px rgba(0, 0, 0, 0.5),
    inset 0 -2px 4px rgba(255, 255, 255, 0.02), 0 8px 24px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
}

/* Responsive: ajustar spacing en móvil y limitar columnas */
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

/* Responsive: ajustar spacing en tablet */
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
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

.grid-item {
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
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

.hint {
  color: var(--hint-color);
  font-size: 0.9rem;
  margin: 0 0 16px 0;
  text-align: center;
  transition: color 0.3s ease;
}

/* Controles flotantes para mover botones en modo edición */
.floating-controls {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.control-container {
  background: rgba(30, 30, 45, 0.95);
  backdrop-filter: blur(20px) saturate(180%);
  border-radius: 20px;
  padding: 16px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.control-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.control-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  background: rgba(60, 60, 80, 0.6);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.control-btn:hover {
  background: rgba(80, 80, 110, 0.8);
  border-color: rgba(139, 92, 246, 0.6);
  transform: scale(1.05);
}

.control-btn:active {
  transform: scale(0.95);
}

.control-close {
  background: rgba(239, 68, 68, 0.6);
  border-color: rgba(239, 68, 68, 0.4);
}

.control-close:hover {
  background: rgba(239, 68, 68, 0.8);
  border-color: rgba(239, 68, 68, 0.6);
}

.control-info {
  padding: 8px 16px;
  background: rgba(40, 40, 60, 0.8);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

/* Botón modo edición activo */
.btn-edit-active {
  background: rgba(34, 197, 94, 0.2) !important;
  border-color: rgba(34, 197, 94, 0.5) !important;
}

.btn-edit-active:hover {
  background: rgba(34, 197, 94, 0.3) !important;
}

@media (max-width: 640px) {
  .hint {
    font-size: 0.75rem;
    margin-bottom: 12px;
  }

  .floating-controls {
    bottom: 16px;
  }

  .control-container {
    padding: 12px;
  }

  .control-btn {
    width: 44px;
    height: 44px;
  }

  .control-info {
    max-width: 100px;
    font-size: 0.85rem;
  }
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

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
  }

  .title-section {
    flex-direction: column;
    gap: 12px;
  }

  .grid {
    gap: 12px;
  }
}

.presets-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
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
  animation: slideUp 0.3s;
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
</style>
