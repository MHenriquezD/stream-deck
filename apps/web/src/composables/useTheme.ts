import { ref } from 'vue'

// Estado de tema compartido entre quien lo consuma (singleton a nivel módulo).
const isDark = ref(true)

/**
 * Tema claro/oscuro. Aplica la clase a `.app` y el atributo `data-theme` en
 * el documento, y persiste la preferencia en localStorage.
 */
export function useTheme() {
  const applyTheme = () => {
    const app = document.querySelector('.app')
    if (isDark.value) {
      app?.classList.add('dark')
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      app?.classList.remove('dark')
      document.documentElement.setAttribute('data-theme', 'light')
    }
  }

  const toggleTheme = () => {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    applyTheme()
  }

  /** Restaura la preferencia guardada y la aplica. Llamar al montar. */
  const initTheme = () => {
    const saved = localStorage.getItem('theme')
    if (saved) isDark.value = saved === 'dark'
    applyTheme()
  }

  return { isDark, applyTheme, toggleTheme, initTheme }
}
