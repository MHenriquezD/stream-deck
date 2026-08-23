import { computed, ref } from 'vue'

type Corner = 'tl' | 'tr' | 'bl' | 'br'

/**
 * Botón flotante (FAB) que el usuario puede arrastrar a cualquiera de las
 * cuatro esquinas en móvil. Recuerda la esquina elegida en localStorage y
 * expone `fabMoved` para que el componente distinga un arrastre de un tap
 * (y no dispare el click al soltar tras mover).
 */
export function useDraggableFab() {
  const fabRef = ref<HTMLButtonElement | null>(null)
  if (!localStorage.getItem('fab-corner-v2')) {
    localStorage.removeItem('theme-fab-corner')
    localStorage.setItem('fab-corner-v2', '1')
  }
  const fabCorner = ref<Corner>(
    (localStorage.getItem('theme-fab-corner') as Corner) || 'tr',
  )
  const fabMoved = ref(false)

  let dragging = false
  let startX = 0
  let startY = 0

  const fabStyle = computed(() => {
    const margin = 20
    const pos: Record<string, string> = {}
    switch (fabCorner.value) {
      case 'tl':
        pos.top = `calc(${margin}px + env(safe-area-inset-top, 0px))`
        pos.left = `calc(${margin}px + env(safe-area-inset-left, 0px))`
        break
      case 'tr':
        pos.top = `calc(${margin}px + env(safe-area-inset-top, 0px))`
        pos.right = `calc(${margin}px + env(safe-area-inset-right, 0px))`
        break
      case 'bl':
        pos.bottom = `calc(${margin}px + env(safe-area-inset-bottom, 0px))`
        pos.left = `calc(${margin}px + env(safe-area-inset-left, 0px))`
        break
      case 'br':
      default:
        pos.bottom = `calc(${margin}px + env(safe-area-inset-bottom, 0px))`
        pos.right = `calc(${margin}px + env(safe-area-inset-right, 0px))`
        break
    }
    return pos
  })

  const snapToCorner = (x: number, y: number) => {
    const midX = window.innerWidth / 2
    const midY = window.innerHeight / 2
    const corner: Corner =
      y < midY ? (x < midX ? 'tl' : 'tr') : x < midX ? 'bl' : 'br'
    fabCorner.value = corner
    localStorage.setItem('theme-fab-corner', corner)
  }

  const onTouchStart = (e: TouchEvent) => {
    dragging = true
    fabMoved.value = false
    const t = e.touches[0]
    startX = t.clientX
    startY = t.clientY
  }

  const onTouchMove = (e: TouchEvent) => {
    if (!dragging) return
    const t = e.touches[0]
    const dx = Math.abs(t.clientX - startX)
    const dy = Math.abs(t.clientY - startY)
    if (dx > 8 || dy > 8) fabMoved.value = true
    if (!fabMoved.value) return
    e.preventDefault()
    const el = fabRef.value
    if (!el) return
    // Clamp para que el botón nunca quede posicionado fuera de la pantalla
    // visible mientras se arrastra (antes se podía soltar más abajo del
    // borde y quedaba cortado).
    const size = el.offsetWidth || 48
    const margin = 4
    const x = Math.min(
      Math.max(t.clientX - size / 2, margin),
      window.innerWidth - size - margin,
    )
    const y = Math.min(
      Math.max(t.clientY - size / 2, margin),
      window.innerHeight - size - margin,
    )
    el.style.transition = 'none'
    el.style.position = 'fixed'
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    el.style.right = 'auto'
    el.style.bottom = 'auto'
  }

  const onTouchEnd = (e: TouchEvent) => {
    if (!dragging) return
    dragging = false
    const el = fabRef.value
    if (!el) return
    if (fabMoved.value) {
      e.preventDefault()
      const ct = e.changedTouches[0]
      snapToCorner(ct.clientX, ct.clientY)
      // Limpiar estilos inline para que la clase CSS vuelva a mandar.
      el.style.transition = ''
      el.style.left = ''
      el.style.top = ''
      el.style.right = ''
      el.style.bottom = ''
    }
  }

  return {
    fabRef,
    fabCorner,
    fabStyle,
    fabMoved,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  }
}
