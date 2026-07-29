import { ref } from 'vue'

export type ToastSeverity = 'success' | 'error' | 'warn' | 'info'

export interface Toast {
  id: number
  severity: ToastSeverity
  summary?: string
  detail?: string
}

export interface ToastOptions {
  severity?: ToastSeverity
  summary?: string
  detail?: string
  /** Tiempo en ms antes de auto-descartar (por defecto 3000). */
  life?: number
}

// Lista compartida a nivel módulo: un único host la renderiza.
const toasts = ref<Toast[]>([])
const timers = new Map<number, ReturnType<typeof setTimeout>>()
let nextId = 0

/**
 * Notificaciones tipo toast en Tailwind/CSS puro. Reemplaza a PrimeVue Toast
 * conservando la API que ya usaba el proyecto (`add`, `removeAllGroups`).
 */
export function useToast() {
  const remove = (id: number) => {
    const t = timers.get(id)
    if (t) {
      clearTimeout(t)
      timers.delete(id)
    }
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const add = (options: ToastOptions) => {
    const id = nextId++
    toasts.value.push({
      id,
      severity: options.severity ?? 'info',
      summary: options.summary,
      detail: options.detail,
    })
    const life = options.life ?? 3000
    if (life > 0) {
      timers.set(
        id,
        setTimeout(() => remove(id), life),
      )
    }
  }

  /** Descarta todos los toasts (equivalente al removeAllGroups de PrimeVue). */
  const removeAllGroups = () => {
    timers.forEach((t) => clearTimeout(t))
    timers.clear()
    toasts.value = []
  }

  return { toasts, add, remove, removeAllGroups }
}
