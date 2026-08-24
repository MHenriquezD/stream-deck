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
 * Ancho de rejilla con el que se GUARDAN las posiciones, siempre, sin
 * importar cuántas columnas muestre el dispositivo.
 *
 * Antes cada cliente guardaba `position` en términos de SUS columnas (4 en
 * desktop, 2 en móvil vertical) y al abrir "corregía" el layout del otro y
 * lo volvía a guardar: abrir el móvil reorganizaba el desktop a dos
 * columnas, recargar el desktop colapsaba tres páginas del móvil en una.
 * Con un ancho canónico fijo, `position` es solo una forma de codificar el
 * orden lineal de los botones: cada dispositivo lo reparte en su propia
 * rejilla al renderizar y nadie reescribe nada al abrir.
 */
const CANONICAL_COLS = 4

/** Orden lineal del botón (independiente del dispositivo). */
const toIndex = (pos: GridPosition): number =>
  pos.row * CANONICAL_COLS + pos.col

/** Posición canónica que corresponde a un orden lineal. */
const fromIndex = (index: number): GridPosition => ({
  row: Math.floor(index / CANONICAL_COLS),
  col: index % CANONICAL_COLS,
})

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

  /** Mayor orden lineal ocupado (-1 si no hay botones). */
  const maxOccupiedIndex = computed(() => {
    let max = -1
    buttons.value.forEach((b) => {
      const idx = toIndex(b.position)
      if (idx > max) max = idx
    })
    return max
  })

  /**
   * Cuántas páginas del dispositivo caben en un "bloque" canónico (las
   * `gridRows` filas completas de 4 columnas). En desktop es 1: la página
   * muestra el bloque entero. En móvil vertical (2 columnas) son 2: cada
   * página es una mitad vertical del bloque.
   */
  const slicesPerBlock = computed(() =>
    Math.max(1, Math.round(CANONICAL_COLS / gridCols.value)),
  )

  /** Última página con contenido, más una extra vacía si esa está llena. */
  const totalPages = computed(() => {
    const slices = slicesPerBlock.value
    if (maxOccupiedIndex.value < 0) return slices

    const blockCapacity = gridRows.value * CANONICAL_COLS
    let blocks = Math.floor(maxOccupiedIndex.value / blockCapacity) + 1

    const start = (blocks - 1) * blockCapacity
    let countInLastBlock = 0
    buttons.value.forEach((b) => {
      const idx = toIndex(b.position)
      if (idx >= start && idx < start + blockCapacity) countInLastBlock++
    })
    if (countInLastBlock >= blockCapacity) blocks++

    return blocks * slices
  })

  const goToPage = (page: number) => {
    currentPage.value = Math.max(0, Math.min(page, totalPages.value - 1))
  }

  /**
   * Posiciones canónicas que muestra una página del dispositivo.
   *
   * En vez de partir la lista en trozos lineales, cada página móvil es una
   * MITAD VERTICAL del bloque canónico, para que un botón conserve su lugar
   * relativo entre dispositivos: el que en desktop está arriba a la
   * izquierda sigue estando arriba a la izquierda en la página 1 del móvil.
   *
   *   desktop (1 página)        móvil (2 páginas)
   *    0  1 |  2  3              0  1     2  3
   *    4  5 |  6  7      →       4  5     6  7
   *    8  9 | 10 11              8  9    10 11
   *                              pág 1   pág 2
   */
  const pagePositions = (page: number): GridPosition[] => {
    const rows = gridRows.value
    const cols = gridCols.value
    const slices = slicesPerBlock.value
    const baseRow = Math.floor(page / slices) * rows
    const baseCol = (page % slices) * cols

    const positions: GridPosition[] = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        positions.push({ row: baseRow + r, col: baseCol + c })
      }
    }
    return positions
  }

  /**
   * Celdas visibles de la página actual. El `row`/`col` de cada celda es la
   * posición CANÓNICA (la que se guarda); dónde se dibuja lo decide el orden
   * en que salen aquí, porque el CSS grid las coloca en secuencia según las
   * columnas del dispositivo.
   */
  const gridItems = computed(() => {
    const byIndex = new Map<number, StreamButton>()
    buttons.value.forEach((b) => byIndex.set(toIndex(b.position), b))

    return pagePositions(currentPage.value).map((pos) => ({
      ...pos,
      button: byIndex.get(toIndex(pos)) ?? null,
    }))
  })

  /**
   * Normaliza datos de una versión anterior que guardaba con rejillas más
   * anchas (8/12/16/24/32 → hasta 8 columnas) al ancho canónico actual,
   * preservando el orden de lectura original.
   *
   * La condición depende SOLO de `CANONICAL_COLS`, nunca de las columnas
   * que muestra este dispositivo: así todos los clientes coinciden en si
   * hay que migrar o no. Cuando dependía del ancho local, cada dispositivo
   * "corregía" el layout del otro en bucle.
   */
  const migrateLegacyPositions = () => {
    const values = Array.from(buttons.value.values())
    if (values.length === 0) return
    const maxCol = values.reduce((m, b) => Math.max(m, b.position.col), 0)
    if (maxCol < CANONICAL_COLS) return // ya está en formato canónico

    const legacyCols = maxCol + 1
    const ordered = values.sort(
      (a, b) =>
        a.position.row * legacyCols + a.position.col -
        (b.position.row * legacyCols + b.position.col),
    )
    ordered.forEach((button, index) => {
      button.position = fromIndex(index)
      buttons.value.set(button.id, button)
    })
    void saveButtons()
  }

  /**
   * Cambia el tamaño de página que MUESTRA este dispositivo (ej. 4x3=12 en
   * desktop, 2x3=6 en móvil vertical). No toca los datos: las posiciones
   * son canónicas y solo cambia cómo se reparten en pantalla.
   */
  const setPageDimensions = (cols: number, rows: number) => {
    if (gridCols.value === cols && gridRows.value === rows) return
    gridCols.value = cols
    gridRows.value = rows
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
    const currentIndex = toIndex(button.position)
    for (const pos of pagePositions(page)) {
      if (toIndex(pos) === currentIndex) continue
      if (!getButtonAt(pos)) {
        button.position = pos
        buttons.value.set(button.id, button)
        void saveButtons()
        return true
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
        // Sin posición guardada, se coloca según su orden en la lista — en
        // formato canónico, no según las columnas de este dispositivo.
        position: cmd.position || fromIndex(index),
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
