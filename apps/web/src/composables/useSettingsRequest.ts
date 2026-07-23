import { ref } from 'vue'

/**
 * Canal mínimo para que componentes fuera del grid puedan pedir que se abra
 * Configuración, sin duplicar su lógica (que incluye el gate de PIN).
 *
 * Es un contador en vez de un booleano para que dos peticiones seguidas se
 * distingan y el watcher vuelva a dispararse.
 */
const requestCount = ref(0)

export function useSettingsRequest() {
  const requestSettings = () => {
    requestCount.value++
  }

  return { requestCount, requestSettings }
}
