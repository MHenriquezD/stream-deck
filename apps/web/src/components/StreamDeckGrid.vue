<script setup lang="ts">
import { ActionType, type StreamButton as ButtonType } from '@shared/core'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { computed, onMounted, ref } from 'vue'
import ButtonEditor from './ButtonEditor.vue'
import StreamButton from './StreamButton.vue'

const toast = useToast()
const confirm = useConfirm()

const props = defineProps<{
  rows?: number
  cols?: number
}>()

const gridRows = ref(props.rows || 3)
const gridCols = ref(props.cols || 4)
const buttons = ref<Map<string, ButtonType>>(new Map())
const showEditor = ref(false)
const editingButton = ref<ButtonType | null>(null)
const editingPosition = ref({ row: 0, col: 0 })
const isExecuting = ref<string | null>(null)
const connectionStatus = ref<'connected' | 'disconnected' | 'connecting'>(
  'disconnected'
)

// Drag and drop state
const draggedButton = ref<ButtonType | null>(null)
const dragOverPosition = ref<{ row: number; col: number } | null>(null)

const API_URL = 'http://localhost:3000'

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
          buttons.value.set(button.id, button)
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

  if (connectionStatus.value !== 'connected') {
    toast.add({
      severity: 'warn',
      summary: 'Sin conexión',
      detail:
        'No hay conexión con el servidor. Por favor, verifica que el backend esté corriendo.',
      life: 4000,
    })
    return
  }

  try {
    isExecuting.value = button.id
    const response = await fetch(`${API_URL}/command/execute/${button.id}`, {
      method: 'POST',
    })

    if (response.ok) {
      const result = await response.json()
      toast.add({
        severity: 'success',
        summary: '✅ Ejecutado',
        detail: `${button.label} ejecutado correctamente`,
        life: 3000,
      })
      console.log('Comando ejecutado:', result)
    } else {
      const error = await response.json()
      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'No se pudo ejecutar el comando',
        life: 5000,
      })
    }
  } catch (error) {
    console.error('Error executing command:', error)
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
</script>

<template>
  <div class="stream-deck-container">
    <div class="header">
      <div class="title-section">
        <h1>🎮 Stream Deck</h1>
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
          @click="loadMultimediaPresets"
          class="btn-icon btn-multimedia"
          title="Comandos multimedia"
        >
          🎵
        </button>
        <button @click="checkConnection" class="btn-icon" title="Reconectar">
          🔄
        </button>
        <button @click="loadButtons" class="btn-icon" title="Recargar">
          ⬇️
        </button>
        <button
          @click="clearAll"
          class="btn-icon btn-danger"
          title="Limpiar todo"
        >
          🗑️
        </button>
      </div>
    </div>

    <div
      class="grid"
      :style="{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridTemplateRows: `repeat(${gridRows}, 1fr)`,
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

    <div class="footer">
      <p class="hint">
        💡 Click para ejecutar • Click derecho para editar • Arrastra para
        reorganizar
      </p>
    </div>

    <ButtonEditor
      :show="showEditor"
      :button="editingButton"
      :position="editingPosition"
      @save="handleSaveButton"
      @delete="handleDeleteButton"
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
          <h2>🎵 Comandos Multimedia</h2>
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

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(255, 255, 255, 0.1);
}

.title-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header h1 {
  margin: 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
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
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.btn-icon.btn-danger:hover {
  background: rgba(239, 68, 68, 0.3);
}

.btn-icon.btn-multimedia {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
}

.btn-icon.btn-multimedia:hover {
  background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
}

.grid {
  display: grid;
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

.footer {
  text-align: center;
  padding-top: 20px;
  border-top: 2px solid rgba(255, 255, 255, 0.1);
}

.hint {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.9rem;
  margin: 0;
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
