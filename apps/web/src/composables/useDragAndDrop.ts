import type { StreamButton } from '@shared/core'
import { ref } from 'vue'

interface GridPosition {
  row: number
  col: number
}

interface UseDragAndDropOptions {
  /** Intercambia un botón con la posición destino y persiste (de useButtons). */
  swapButtons: (source: StreamButton, targetPos: GridPosition) => boolean
  /** Callback tras un drop de ratón con cambio (p. ej. mostrar un toast). */
  onMouseDrop?: () => void
  /** Callback cuando se detecta two-finger tap (editar botón en móvil). */
  onTwoFingerTap?: (button: StreamButton | null, position: GridPosition) => void
}

/**
 * Drag & drop de botones, tanto con ratón (HTML5 drag) como táctil
 * (long-press + arrastre con detección de scroll). Ambos delegan el
 * intercambio real en `swapButtons`, así que aquí solo vive el gesto y su
 * estado visual.
 */
export function useDragAndDrop({
  swapButtons,
  onMouseDrop,
  onTwoFingerTap,
}: UseDragAndDropOptions) {
  // ── Estado ratón ──
  const draggedButton = ref<StreamButton | null>(null)
  const dragOverPosition = ref<GridPosition | null>(null)

  // ── Estado táctil ──
  const touchDragButton = ref<StreamButton | null>(null)
  const touchOverPosition = ref<GridPosition | null>(null)
  const touchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const isPressing = ref<string | null>(null) // para la animación de pulso
  const startY = ref(0) // para detectar intento de scroll

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
  let lastTouchButton: StreamButton | null = null
  let lastTouchPosition: GridPosition | null = null

  const handleTouchStart = (
    button: StreamButton | null,
    position: GridPosition,
    event: TouchEvent,
  ) => {
    if (event.touches.length >= 2) {
      if (touchTimer.value) { clearTimeout(touchTimer.value); touchTimer.value = null }
      isPressing.value = null
      event.preventDefault()
      onTwoFingerTap?.(lastTouchButton ?? button, lastTouchPosition ?? position)
      return
    }
    lastTouchButton = button
    lastTouchPosition = position
    if (!button) return
    startY.value = event.touches[0].clientY
    isPressing.value = button.id
    if (touchTimer.value) clearTimeout(touchTimer.value)
    touchTimer.value = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(100)
      touchDragButton.value = button
      isPressing.value = null
    }, 1000)
  }

  const handleGridTouchStart = (event: TouchEvent) => {
    if (event.touches.length >= 2) {
      if (touchTimer.value) { clearTimeout(touchTimer.value); touchTimer.value = null }
      isPressing.value = null
      event.preventDefault()
      if (lastTouchButton || lastTouchPosition) {
        onTwoFingerTap?.(lastTouchButton, lastTouchPosition!)
      }
    }
  }

  const handleTouchMove = (event: TouchEvent) => {
    // Aún no en modo arrastre: si el dedo se mueve, es scroll → cancelar timer.
    if (!touchDragButton.value) {
      const diffY = Math.abs(event.touches[0].clientY - startY.value)
      if (diffY > 10) {
        if (touchTimer.value) {
          clearTimeout(touchTimer.value)
          touchTimer.value = null
        }
        isPressing.value = null
      }
      return
    }

    // Ya en modo arrastre: bloquear scroll y seguir el dedo.
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
    if (touchTimer.value) {
      clearTimeout(touchTimer.value)
      touchTimer.value = null
    }
    isPressing.value = null

    const source = touchDragButton.value
    const targetPos = touchOverPosition.value
    touchDragButton.value = null
    touchOverPosition.value = null

    if (source && targetPos && swapButtons(source, targetPos)) {
      if (navigator.vibrate) navigator.vibrate([30, 10, 30])
    }
  }

  /** Limpia TODO el estado táctil (red de seguridad para touchcancel). */
  const handleTouchCancel = () => {
    if (touchTimer.value) {
      clearTimeout(touchTimer.value)
      touchTimer.value = null
    }
    isPressing.value = null
    touchDragButton.value = null
    touchOverPosition.value = null
  }

  const isTouchDragging = (button: StreamButton | null): boolean =>
    !!(button && touchDragButton.value?.id === button.id)

  const isTouchDragOver = (position: GridPosition): boolean =>
    !!(
      touchOverPosition.value?.row === position.row &&
      touchOverPosition.value?.col === position.col &&
      touchDragButton.value !== null
    )

  return {
    // estado táctil que el template/otros consumen
    touchDragButton,
    isPressing,
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
    handleGridTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    isTouchDragging,
    isTouchDragOver,
  }
}
