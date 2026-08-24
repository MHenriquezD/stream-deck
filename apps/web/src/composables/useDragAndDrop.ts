import type { StreamButton } from '@shared/core'
import { ref, type Ref } from 'vue'

interface GridPosition {
  row: number
  col: number
}

interface UseDragAndDropOptions {
  /** Intercambia un botón con la posición destino y persiste (de useButtons). */
  swapButtons: (source: StreamButton, targetPos: GridPosition) => boolean
  /** Mueve un botón a la primera casilla libre de otra página (de useButtons). */
  moveButtonToPage?: (button: StreamButton, page: number) => boolean
  /** Callback tras un drop de ratón con cambio (p. ej. mostrar un toast). */
  onMouseDrop?: () => void
  /**
   * Modo edición del grid, solo relevante en táctil. Dentro solo se
   * reorganiza: arrastrar mueve botones y nada se ejecuta. El arrastre con
   * ratón en desktop es independiente de esto.
   */
  isEditMode: Ref<boolean>
  /** Long-press sobre un botón fuera del modo edición: abre el editor. */
  onLongPressEdit?: (button: StreamButton | null, position: GridPosition) => void
}

/**
 * Drag & drop de botones, tanto con ratón (HTML5 drag) como táctil. Ambos
 * delegan el intercambio real en `swapButtons`, así que aquí solo vive el
 * gesto y su estado visual.
 *
 * En táctil los dos gestos viven en modos separados: fuera del modo edición
 * un toque ejecuta y un long-press abre el editor; dentro, se arrastra para
 * reorganizar y no se ejecuta nada. Antes ambos convivían sobre el mismo
 * elemento (toque ejecuta / mantener edita / mantener+mover reordena) y esa
 * ambigüedad causó una cadena de bugs imposibles de reproducir a ciegas:
 * clicks fantasma ejecutando comandos, swaps encadenándose solos, el drag
 * nativo de las imágenes compitiendo con el gesto.
 */
export function useDragAndDrop({
  swapButtons,
  moveButtonToPage,
  onMouseDrop,
  isEditMode,
  onLongPressEdit,
}: UseDragAndDropOptions) {
  // ── Estado ratón ──
  const draggedButton = ref<StreamButton | null>(null)
  const dragOverPosition = ref<GridPosition | null>(null)

  // ── Estado táctil ──
  const touchDragButton = ref<StreamButton | null>(null)
  const touchOverPosition = ref<GridPosition | null>(null)
  /** Página cuyo punto de navegación está bajo el dedo mientras se arrastra. */
  const touchOverPageIndex = ref<number | null>(null)
  /** Botón bajo el dedo en modo edición, aún sin decidir si es toque o arrastre. */
  const isPressing = ref<string | null>(null)
  const startX = ref(0)
  const startY = ref(0)
  /** Desplazamiento del botón arrastrado respecto a su origen, para que siga al dedo. */
  const touchDragOffset = ref({ x: 0, y: 0 })

  /**
   * Candidato: el dedo bajó sobre este botón estando en modo edición. Si se
   * mueve lo suficiente pasa a arrastre; si se suelta quieto no pasa nada
   * (en modo edición solo se reorganiza).
   */
  const pendingButton = ref<StreamButton | null>(null)
  const pendingPosition = ref<GridPosition | null>(null)

  /** Timer del long-press que abre el editor (solo fuera del modo edición). */
  let longPressTimer: ReturnType<typeof setTimeout> | null = null
  const LONG_PRESS_DELAY = 450
  const SCROLL_CANCEL_THRESHOLD = 10

  /** Timestamp hasta el cual hay que ignorar un click (ver handleTouchEnd). */
  const ignoreClickUntil = ref(0)
  /**
   * Timestamp del último touchend que cerró un gesto de edición. Tras un
   * swap el DOM cambia bajo el dedo y algunos WebView de Android
   * re-sintetizan un touchstart sin que el usuario haya soltado,
   * encadenando swaps sin parar. Si un touchstart llega pegado a este
   * timestamp, es ese eco automático, no un toque real — se ignora.
   */
  let lastGestureEndAt = 0
  const GESTURE_COOLDOWN = 350

  const DRAG_MOVE_THRESHOLD = 12

  /**
   * Resuelve qué celda (o punto de página) hay bajo unas coordenadas y
   * actualiza el destino del arrastre. Compartido por ratón y táctil.
   */
  const updateDropTarget = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY)

    const pageDot = element?.closest('[data-page-dot]')
    if (pageDot) {
      touchOverPageIndex.value = parseInt(
        pageDot.getAttribute('data-page-dot') || '-1',
      )
      touchOverPosition.value = null
      return
    }
    touchOverPageIndex.value = null

    const gridItem = element?.closest('[data-grid-row]')
    if (gridItem) {
      const row = parseInt(gridItem.getAttribute('data-grid-row') || '-1')
      const col = parseInt(gridItem.getAttribute('data-grid-col') || '-1')
      if (row !== -1 && col !== -1) touchOverPosition.value = { row, col }
    }
  }

  /** Aplica el resultado del arrastre (mover de página o intercambiar). */
  const commitDrag = (): boolean => {
    const source = touchDragButton.value
    const targetPos = touchOverPosition.value
    const targetPage = touchOverPageIndex.value
    touchDragButton.value = null
    touchOverPosition.value = null
    touchOverPageIndex.value = null
    touchDragOffset.value = { x: 0, y: 0 }
    if (!source) return false

    if (targetPage !== null && moveButtonToPage?.(source, targetPage)) return true
    if (targetPos && swapButtons(source, targetPos)) return true
    return false
  }

  // ── Ratón (desktop). Arrastre propio en vez del nativo de HTML5, para que
  // el botón siga al cursor igual que sigue al dedo en táctil; el "fantasma"
  // gris del navegador no permitía ese feedback. ──
  let mouseDragActive = false

  const handleMouseDown = (
    button: StreamButton | null,
    position: GridPosition,
    event: MouseEvent,
  ) => {
    if (!button || event.button !== 0) return
    startX.value = event.clientX
    startY.value = event.clientY
    pendingButton.value = button
    pendingPosition.value = position
    mouseDragActive = true
    window.addEventListener('mousemove', handleWindowMouseMove)
    window.addEventListener('mouseup', handleWindowMouseUp)
  }

  const handleWindowMouseMove = (event: MouseEvent) => {
    if (!mouseDragActive) return

    if (pendingButton.value && !touchDragButton.value) {
      const dx = Math.abs(event.clientX - startX.value)
      const dy = Math.abs(event.clientY - startY.value)
      if (dx > DRAG_MOVE_THRESHOLD || dy > DRAG_MOVE_THRESHOLD) {
        draggedButton.value = pendingButton.value
        touchDragButton.value = pendingButton.value
        pendingButton.value = null
        pendingPosition.value = null
      }
      return
    }

    if (!touchDragButton.value) return
    event.preventDefault()
    touchDragOffset.value = {
      x: event.clientX - startX.value,
      y: event.clientY - startY.value,
    }
    updateDropTarget(event.clientX, event.clientY)
  }

  const handleWindowMouseUp = () => {
    window.removeEventListener('mousemove', handleWindowMouseMove)
    window.removeEventListener('mouseup', handleWindowMouseUp)
    mouseDragActive = false
    pendingButton.value = null
    pendingPosition.value = null

    const wasDragging = touchDragButton.value !== null
    draggedButton.value = null
    dragOverPosition.value = null
    if (!wasDragging) return

    // Se arrastró: el click que viene detrás no debe ejecutar el botón.
    ignoreClickUntil.value = Date.now() + 300
    if (commitDrag()) onMouseDrop?.()
  }

  const isDragging = (button: StreamButton | null): boolean =>
    !!(button && draggedButton.value?.id === button.id)

  const isDragOver = (position: GridPosition): boolean =>
    !!(
      dragOverPosition.value?.row === position.row &&
      dragOverPosition.value?.col === position.col
    )

  // ── Táctil ──
  const handleTouchStart = (
    button: StreamButton | null,
    position: GridPosition,
    event: TouchEvent,
  ) => {
    if (!button) return
    if (Date.now() - lastGestureEndAt < GESTURE_COOLDOWN) return
    startX.value = event.touches[0].clientX
    startY.value = event.touches[0].clientY

    // Modo edición: candidato a arrastre (aquí solo se reorganiza).
    if (isEditMode.value) {
      isPressing.value = button.id
      pendingButton.value = button
      pendingPosition.value = position
      return
    }

    // Modo normal: mantener presionado abre el editor de ese botón.
    if (longPressTimer) clearTimeout(longPressTimer)
    longPressTimer = setTimeout(() => {
      longPressTimer = null
      if (navigator.vibrate) navigator.vibrate(40)
      // El click sintético posterior no debe ejecutar el comando.
      ignoreClickUntil.value = Date.now() + 600
      lastGestureEndAt = Date.now()
      onLongPressEdit?.(button, position)
    }, LONG_PRESS_DELAY)
  }

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]

    // Fuera del modo edición solo hay que vigilar el long-press: si el dedo
    // se mueve es scroll, no una intención de editar.
    if (!isEditMode.value) {
      if (!longPressTimer) return
      const diffY = Math.abs(touch.clientY - startY.value)
      const diffX = Math.abs(touch.clientX - startX.value)
      if (diffY > SCROLL_CANCEL_THRESHOLD || diffX > SCROLL_CANCEL_THRESHOLD) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      return
    }

    // Candidato sin decidir: si se mueve lo suficiente pasa a arrastre.
    if (pendingButton.value && !touchDragButton.value) {
      const dx = Math.abs(touch.clientX - startX.value)
      const dy = Math.abs(touch.clientY - startY.value)
      if (dx > DRAG_MOVE_THRESHOLD || dy > DRAG_MOVE_THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(40)
        touchDragButton.value = pendingButton.value
        isPressing.value = null
        pendingButton.value = null
        pendingPosition.value = null
      }
      return
    }

    if (!touchDragButton.value) return

    // Ya en modo arrastre: bloquear scroll y seguir el dedo.
    if (event.cancelable) event.preventDefault()
    touchDragOffset.value = {
      x: touch.clientX - startX.value,
      y: touch.clientY - startY.value,
    }
    updateDropTarget(touch.clientX, touch.clientY)
  }

  const handleTouchEnd = (event?: TouchEvent) => {
    // Fuera del modo edición solo hay que cancelar el long-press pendiente
    // (si ya disparó, él mismo bloqueó el click que viene detrás).
    if (!isEditMode.value) {
      if (longPressTimer) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      return
    }

    isPressing.value = null

    // Tras un gesto de edición el navegador todavía dispara su propio
    // "click" sintético ~300ms después del touchend. preventDefault()
    // debería bastar, pero algunos WebView de Android lo ignoran, así que
    // además marcamos una ventana que revisa quien maneja el click.
    if (pendingButton.value || touchDragButton.value) {
      ignoreClickUntil.value = Date.now() + 400
      lastGestureEndAt = Date.now()
      if (event?.cancelable) event.preventDefault()
    }

    // Se soltó sin llegar a mover: en modo edición eso no hace nada, solo
    // se reorganiza. (Editar es long-press fuera del modo edición.)
    pendingButton.value = null
    pendingPosition.value = null

    if (commitDrag() && navigator.vibrate) navigator.vibrate([30, 10, 30])
  }

  /** Limpia TODO el estado táctil (red de seguridad para touchcancel). */
  const handleTouchCancel = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer)
      longPressTimer = null
    }
    if (pendingButton.value || touchDragButton.value) {
      lastGestureEndAt = Date.now()
    }
    isPressing.value = null
    pendingButton.value = null
    pendingPosition.value = null
    touchDragButton.value = null
    touchOverPosition.value = null
    touchOverPageIndex.value = null
    touchDragOffset.value = { x: 0, y: 0 }
  }

  const isTouchDragging = (button: StreamButton | null): boolean =>
    !!(button && touchDragButton.value?.id === button.id)

  const isTouchDragOver = (position: GridPosition): boolean =>
    !!(
      touchOverPosition.value?.row === position.row &&
      touchOverPosition.value?.col === position.col &&
      touchDragButton.value !== null
    )

  const isTouchOverPage = (page: number): boolean =>
    touchOverPageIndex.value === page

  return {
    // estado (isTouchDragging/isTouchDragOver cubren ratón y táctil por igual)
    draggedButton,
    touchDragButton,
    touchDragOffset,
    isPressing,
    ignoreClickUntil,
    // ratón
    handleMouseDown,
    isDragging,
    isDragOver,
    // táctil
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isTouchDragging,
    isTouchDragOver,
    isTouchOverPage,
  }
}
