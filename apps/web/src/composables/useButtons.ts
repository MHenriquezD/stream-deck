import { ActionType, type StreamButton } from '@shared/core'
import { computed, ref, type Ref } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'
import { useAuth } from './useAuth'
import { useSocket } from './useSocket'

interface GridPosition {
  row: number
  col: number
}

interface UseButtonsOptions {
  /** Estado del servidor (concern de conexión, vive fuera de este composable). */
  serverEnabled: Ref<boolean>
}

/**
 * Estado central del stream deck: el mapa de botones, las dimensiones del grid
 * y la persistencia (carga/guardado vía socket o HTTP). Concentra aquí la única
 * fuente de verdad de los botones para que el componente y el drag & drop
 * operen sobre ella sin duplicar la lógica de intercambio ni de guardado.
 */
export function useButtons({ serverEnabled }: UseButtonsOptions) {
  const serverUrlStore = useServerUrlStore()
  const { getAuthHeaders } = useAuth()
  const { isConnected, saveCommands } = useSocket()

  const apiUrl = computed(() => serverUrlStore.serverUrl)

  // ── Estado ──
  // ref<Map> (no shallowRef): Vue trackea .set/.delete/.clear de un Map reactivo.
  const buttons = ref<Map<string, StreamButton>>(new Map())
  const gridRows = ref(3)
  const gridCols = ref(4)
  const isReloadingGrid = ref(false)
  /** True hasta que termina la primera carga (muestra skeletons). */
  const isLoadingButtons = ref(true)

  const gridItems = computed(() => {
    const items: Array<GridPosition & { button: StreamButton | null }> = []
    for (let row = 0; row < gridRows.value; row++) {
      for (let col = 0; col < gridCols.value; col++) {
        const button =
          Array.from(buttons.value.values()).find(
            (b) => b.position.row === row && b.position.col === col,
          ) || null
        items.push({ row, col, button })
      }
    }
    return items
  })

  // ── Dimensiones ──
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

  const updateGridFromSize = (gridSize: number) => {
    const dims = calculateGridDimensions(gridSize)
    gridRows.value = dims.rows
    gridCols.value = dims.cols
  }

  // ── Consultas / mutaciones ──
  const getButtonAt = (pos: GridPosition): StreamButton | null =>
    Array.from(buttons.value.values()).find(
      (b) => b.position.row === pos.row && b.position.col === pos.col,
    ) || null

  const setButton = (button: StreamButton) => {
    buttons.value.set(button.id, button)
  }

  const deleteButton = (id: string) => {
    buttons.value.delete(id)
  }

  const clearButtons = () => {
    buttons.value.clear()
  }

  /**
   * Mueve `source` a `targetPos`, intercambiando con el botón que hubiera allí,
   * y persiste. Devuelve true si hubo cambio. Única implementación del swap que
   * antes estaba triplicada (drag ratón, drag táctil y mover desde el editor).
   */
  const swapButtons = (source: StreamButton, targetPos: GridPosition): boolean => {
    if (
      source.position.row === targetPos.row &&
      source.position.col === targetPos.col
    ) {
      return false
    }
    const target = getButtonAt(targetPos)
    const oldPosition = { ...source.position }
    source.position = { ...targetPos }
    if (target) {
      target.position = oldPosition
      buttons.value.set(target.id, target)
    }
    buttons.value.set(source.id, source)
    void saveButtons()
    return true
  }

  // ── Persistencia ──
  const parseAndSetButtons = (data: any[]) => {
    data.forEach((cmd: any, index: number) => {
      let actionType = ActionType.COMMAND
      if (cmd.type === 'url' || (cmd.payload && cmd.payload.startsWith('http'))) {
        actionType = ActionType.URL
      }

      const button: StreamButton = {
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

  const loadButtons = async () => {
    try {
      const response = await fetch(`${apiUrl.value}/command`, {
        headers: { ...getAuthHeaders() },
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          parseAndSetButtons(data)
        }
      }
    } catch (error) {
      console.error('Error loading buttons:', error)
    } finally {
      isLoadingButtons.value = false
    }
  }

  const saveButtons = async () => {
    try {
      const commandsToSave = Array.from(buttons.value.values()).map((btn) => ({
        id: btn.id,
        label: btn.label,
        icon: btn.icon,
        color: btn.color,
        backgroundColor: btn.backgroundColor,
        type: 'command',
        payload: btn.action.payload,
        position: btn.position,
      }))

      if (isConnected.value) {
        // Via WebSocket (más rápido + sincroniza con otros clientes)
        saveCommands(commandsToSave as unknown as StreamButton[])
      } else {
        // Fallback HTTP
        await fetch(`${apiUrl.value}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(commandsToSave),
        })
      }
    } catch (error) {
      console.error('Error saving buttons:', error)
    }
  }

  const reloadButtonsWithAnimation = async () => {
    isReloadingGrid.value = true
    buttons.value.clear()
    if (isConnected.value && serverEnabled.value) {
      await loadButtons()
    }
    setTimeout(() => {
      isReloadingGrid.value = false
    }, 600)
  }

  return {
    // estado
    buttons,
    gridRows,
    gridCols,
    gridItems,
    isReloadingGrid,
    isLoadingButtons,
    // dimensiones
    calculateGridDimensions,
    updateGridFromSize,
    // mutaciones
    getButtonAt,
    setButton,
    deleteButton,
    clearButtons,
    swapButtons,
    // persistencia
    parseAndSetButtons,
    loadButtons,
    saveButtons,
    reloadButtonsWithAnimation,
  }
}
