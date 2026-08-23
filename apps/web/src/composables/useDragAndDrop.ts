import type { StreamButton } from '@shared/core'
import { ref } from 'vue'

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
   * Callback cuando se mantiene presionado sin arrastrar (editar botón en
   * móvil). Si en cambio el dedo se mueve tras el long-press, se entra en
   * modo arrastre/reordenar en lugar de disparar esto.
   */
  onLongPressEdit?: (button: StreamButton | null, position: GridPosition) => void
}

/**
 * Drag & drop de botones, tanto con ratón (HTML5 drag) como táctil
 * (long-press + arrastre con detección de scroll). Ambos delegan el
 * intercambio real en `swapButtons`, así que aquí solo vive el gesto y su
 * estado visual.
 */
export function useDragAndDrop({
  swapButtons,
  moveButtonToPage,
  onMouseDrop,
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
  const touchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isPressing = ref<string | null>(null) // para la animación de pulso
  const startX = ref(0)
  const startY = ref(0) // para detectar intento de scroll

  /**
   * "Armado": pasó el tiempo de long-press pero el dedo todavía no se ha
   * movido lo suficiente para decidir si es editar (se suelta quieto) o
   * arrastrar (se mueve). Un solo gesto, dos resultados posibles.
   */
  const armedButton = ref<StreamButton | null>(null)
  const armedPosition = ref<GridPosition | null>(null)
  const armStartX = ref(0)
  const armStartY = ref(0)

  /** Timestamp hasta el cual hay que ignorar un click (ver handleTouchEnd). */
  const ignoreClickUntil = ref(0)
  /**
   * Timestamp del último touchend que vino de un long-press/arrastre. Tras
   * un swap, el DOM cambia bajo el dedo y algunos WebView de Android
   * re-sintetizan un touchstart nuevo sin que el usuario haya soltado,
   * encadenando swaps sin parar. Si un touchstart llega pegado a este
   * timestamp, es ese eco automático, no un toque real — se ignora.
   */
  let lastGestureEndAt = 0
  const GESTURE_COOLDOWN = 350

  const LONG_PRESS_DELAY = 450
  const DRAG_MOVE_THRESHOLD = 24
  const SCROLL_CANCEL_THRESHOLD = 10

  // ── Ratón ──
  const handleDragStart = (button: StreamButton | null) => {
    if (!button) return
    draggedButton.value = button
  }

  const handleDragEnd = () => {
    draggedButton.value = null
    dragOverPosition.value = null
  }

  const handleDragOver = (position: GridPosition) => {
    dragOverPosition.value = position
  }

  const handleDragLeave = () => {
    dragOverPosition.value = null
  }

  const handleDrop = (targetPosition: GridPosition) => {
    const source = draggedButton.value
    draggedButton.value = null
    dragOverPosition.value = null
    if (!source) return
    if (swapButtons(source, targetPosition)) {
      onMouseDrop?.()
    }
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
    isPressing.value = button.id
    if (touchTimer.value) clearTimeout(touchTimer.value)
    touchTimer.value = setTimeout(() => {
      // Long-press cumplido sin haberse cancelado por scroll: queda "armado"
      // a la espera de ver si el usuario suelta (editar) o arrastra (mover).
      // isPressing se apaga aquí — su animación de pulso es para el tiempo
      // de espera ANTES del long-press, no para mientras se sigue
      // sosteniendo ya armado (si no, pulsa sin parar todo lo que dure el hold).
      if (navigator.vibrate) navigator.vibrate(40)
      isPressing.value = null
      armedButton.value = button
      armedPosition.value = position
      armStartX.value = startX.value
      armStartY.value = startY.value
      touchTimer.value = null
    }, LONG_PRESS_DELAY)
  }

  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0]

    // Aún no llegó el long-press: si el dedo se mueve, es scroll → cancelar.
    if (!armedButton.value && !touchDragButton.value) {
      const diffY = Math.abs(touch.clientY - startY.value)
      if (diffY > SCROLL_CANCEL_THRESHOLD) {
        if (touchTimer.value) {
          clearTimeout(touchTimer.value)
          touchTimer.value = null
        }
        isPressing.value = null
      }
      return
    }

    // Armado (long-press cumplido) pero aún sin decidir: si se mueve lo
    // suficiente, pasa a modo arrastre; si no, se queda quieto para editar.
    if (armedButton.value && !touchDragButton.value) {
      const dx = Math.abs(touch.clientX - armStartX.value)
      const dy = Math.abs(touch.clientY - armStartY.value)
      if (dx > DRAG_MOVE_THRESHOLD || dy > DRAG_MOVE_THRESHOLD) {
        if (navigator.vibrate) navigator.vibrate(100)
        touchDragButton.value = armedButton.value
        isPressing.value = null
        armedButton.value = null
        armedPosition.value = null
      }
      return
    }

    // Ya en modo arrastre: bloquear scroll y seguir el dedo.
    if (event.cancelable) event.preventDefault()
    const element = document.elementFromPoint(touch.clientX, touch.clientY)

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
      if (row !== -1 && col !== -1) {
        touchOverPosition.value = { row, col }
      }
    }
  }

  const handleTouchEnd = (event?: TouchEvent) => {
    if (touchTimer.value) {
      clearTimeout(touchTimer.value)
      touchTimer.value = null
    }
    isPressing.value = null

    // Si hubo long-press (armado) o arrastre, el navegador todavía va a
    // disparar su propio "click" sintético ~300ms después de este
    // touchend — sin suprimirlo, ese click fantasma termina EJECUTANDO el
    // botón (o el que quedó debajo tras moverlo) sin que el usuario lo
    // haya tocado de verdad. preventDefault() debería bastar, pero algunos
    // WebView de Android lo ignoran, así que además marcamos una ventana
    // de tiempo para que quien ejecute el click la revise (ignoreClickUntil).
    if (armedButton.value || touchDragButton.value) {
      ignoreClickUntil.value = Date.now() + 400
      lastGestureEndAt = Date.now()
      if (event?.cancelable) event.preventDefault()
    }

    // Se quedó "armado" (long-press cumplido) sin llegar a arrastrar →
    // el gesto era para editar, no para reordenar.
    if (armedButton.value && !touchDragButton.value) {
      const button = armedButton.value
      const position = armedPosition.value
      armedButton.value = null
      armedPosition.value = null
      if (navigator.vibrate) navigator.vibrate(30)
      if (position) onLongPressEdit?.(button, position)
      return
    }
    armedButton.value = null
    armedPosition.value = null

    const source = touchDragButton.value
    const targetPos = touchOverPosition.value
    const targetPage = touchOverPageIndex.value
    touchDragButton.value = null
    touchOverPosition.value = null
    touchOverPageIndex.value = null

    if (source && targetPage !== null && moveButtonToPage?.(source, targetPage)) {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30])
      return
    }
    if (source && targetPos && swapButtons(source, targetPos)) {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30])
    }
  }

  /** Limpia TODO el estado táctil (red de seguridad para touchcancel). */
  const handleTouchCancel = () => {
    if (armedButton.value || touchDragButton.value) {
      lastGestureEndAt = Date.now()
    }
    if (touchTimer.value) {
      clearTimeout(touchTimer.value)
      touchTimer.value = null
    }
    isPressing.value = null
    armedButton.value = null
    armedPosition.value = null
    touchDragButton.value = null
    touchOverPosition.value = null
    touchOverPageIndex.value = null
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
    // estado táctil que el template/otros consumen
    draggedButton,
    touchDragButton,
    isPressing,
    ignoreClickUntil,
    // ratón
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
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
