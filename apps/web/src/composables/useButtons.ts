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

/** Tamaño de página por defecto: 4 columnas x 3 filas = 12 botones. */
const DEFAULT_PAGE_COLS = 4
const DEFAULT_PAGE_ROWS = 3

/**
 * Estado central del stream deck: el mapa de botones, la paginación y la
 * persistencia (carga/guardado vía socket o HTTP). Concentra aquí la única
 * fuente de verdad de los botones para que el componente y el drag & drop
 * operen sobre ella sin duplicar la lógica de intercambio ni de guardado.
 *
 * El tamaño de página (columnas x filas) es reactivo — `setPageDimensions`
 * permite achicarlo en pantallas móviles verticales (ej. 2x3 = 6) y
 * reacomoda los botones existentes a la nueva grilla. `position.row` crece
 * sin límite: la página N ocupa las filas absolutas [N*rows, N*rows+rows-1].
 */
export function useButtons({ serverEnabled }: UseButtonsOptions) {
  const serverUrlStore = useServerUrlStore()
  const { getAuthHeaders } = useAuth()
  const { isConnected, saveCommands } = useSocket()

  const apiUrl = computed(() => serverUrlStore.serverUrl)

  // ── Estado ──
  // ref<Map> (no shallowRef): Vue trackea .set/.delete/.clear de un Map reactivo.
  const buttons = ref<Map<string, StreamButton>>(new Map())
  const gridRows = ref(DEFAULT_PAGE_ROWS)
  const gridCols = ref(DEFAULT_PAGE_COLS)
  const isReloadingGrid = ref(false)
  /** True hasta que termina la primera carga (muestra skeletons). */
  const isLoadingButtons = ref(true)

  // ── Paginación ──
  const currentPage = ref(0)

  const maxOccupiedRow = computed(() => {
    let max = -1
    buttons.value.forEach((b) => {
      if (b.position.row > max) max = b.position.row
    })
    return max
  })

  /** Última página con contenido, más una página extra vacía si esa está llena. */
  const totalPages = computed(() => {
    const rows = gridRows.value
    const pageSize = rows * gridCols.value
    if (maxOccupiedRow.value < 0) return 1
    const lastPage = Math.floor(maxOccupiedRow.value / rows)
    const startRow = lastPage * rows
    let countInLastPage = 0
    buttons.value.forEach((b) => {
      if (b.position.row >= startRow && b.position.row < startRow + rows) {
        countInLastPage++
      }
    })
    return countInLastPage >= pageSize ? lastPage + 2 : lastPage + 1
  })

  const goToPage = (page: number) => {
    currentPage.value = Math.max(0, Math.min(page, totalPages.value - 1))
  }

  const gridItems = computed(() => {
    const items: Array<GridPosition & { button: StreamButton | null }> = []
    const rows = gridRows.value
    const cols = gridCols.value
    const baseRow = currentPage.value * rows
    const values = Array.from(buttons.value.values())
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const row = baseRow + r
        const button =
          values.find((b) => b.position.row === row && b.position.col === c) ||
          null
        items.push({ row, col: c, button })
      }
    }
    return items
  })

  /**
   * Reacomoda todos los botones en orden lineal (fila por fila) usando el
   * número de columnas ANTERIOR para leer su orden y el NUEVO para
   * reasignar posiciones. Se usa tanto para migrar datos de una versión
   * anterior con grid de ancho variable, como para adaptar el tamaño de
   * página cuando cambia (ej. al rotar el teléfono o cambiar de pantalla).
   */
  const reflowToColumns = (oldCols: number, newCols: number) => {
    if (oldCols === newCols) return
    const values = Array.from(buttons.value.values())
    const ordered = values.sort(
      (a, b) =>
        a.position.row * oldCols + a.position.col -
        (b.position.row * oldCols + b.position.col),
    )
    ordered.forEach((button, index) => {
      button.position = {
        row: Math.floor(index / newCols),
        col: index % newCols,
      }
      buttons.value.set(button.id, button)
    })
    void saveButtons()
  }

  /**
   * Reacomoda posiciones guardadas con un ancho de columnas distinto al
   * actual, preservando el orden de lectura original. Cubre tanto datos de
   * una versión anterior con grid más ancho (8/12/16/24/32 columnas) como el
   * caso de cambiar de dispositivo: si los botones se guardaron en el modo
   * compacto de móvil (2 columnas) y se abren en desktop (4 columnas),
   * quedarían apretados en las primeras 2 columnas sin este reflow.
   */
  const migrateLegacyPositions = () => {
    const values = Array.from(buttons.value.values())
    if (values.length === 0) return
    const maxCol = values.reduce((m, b) => Math.max(m, b.position.col), 0)
    const inferredCols = maxCol + 1
    if (inferredCols === gridCols.value) return
    reflowToColumns(inferredCols, gridCols.value)
  }

  /**
   * Cambia el tamaño de página (columnas x filas) — ej. 4x3=12 en desktop,
   * 2x3=6 en móvil vertical — y reacomoda los botones existentes si el
   * número de columnas cambió. No hace nada si las dimensiones son iguales.
   */
  const setPageDimensions = (cols: number, rows: number) => {
    if (gridCols.value === cols && gridRows.value === rows) return
    const oldCols = gridCols.value
    gridCols.value = cols
    gridRows.value = rows
    reflowToColumns(oldCols, cols)
    // Reflow ya persiste vía saveButtons() si hubo cambios; currentPage
    // puede quedar fuera de rango si el total de páginas se redujo.
    currentPage.value = Math.max(0, Math.min(currentPage.value, totalPages.value - 1))
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

  /**
   * Mueve `button` a la primera casilla libre de `page` (arrastrar un botón
   * hasta el punto de otra página). No intercambia nada: la casilla de
   * origen queda vacía. Devuelve false si la página destino está llena.
   */
  const moveButtonToPage = (button: StreamButton, page: number): boolean => {
    const rows = gridRows.value
    const cols = gridCols.value
    const startRow = page * rows
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const row = startRow + r
        if (row === button.position.row && c === button.position.col) continue
        if (!getButtonAt({ row, col: c })) {
          button.position = { row, col: c }
          buttons.value.set(button.id, button)
          void saveButtons()
          return true
        }
      }
    }
    return false
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

      if (button.position.row >= 0 && button.position.col >= 0) {
        buttons.value.set(button.id, button)
      }
    })

    migrateLegacyPositions()
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
    // paginación
    currentPage,
    totalPages,
    goToPage,
    setPageDimensions,
    // mutaciones
    getButtonAt,
    setButton,
    deleteButton,
    clearButtons,
    swapButtons,
    moveButtonToPage,
    // persistencia
    parseAndSetButtons,
    loadButtons,
    saveButtons,
    reloadButtonsWithAnimation,
  }
}
