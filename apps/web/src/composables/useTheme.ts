import { ref } from 'vue'

const isDark = ref(true)

export interface AccentPreset {
  name: string
  accent: string
  accent2: string
}

export const accentPresets: AccentPreset[] = [
  { name: 'Violeta',  accent: '#8b5cf6', accent2: '#6366f1' },
  { name: 'Azul',     accent: '#3b82f6', accent2: '#2563eb' },
  { name: 'Cyan',     accent: '#06b6d4', accent2: '#0891b2' },
  { name: 'Verde',    accent: '#10b981', accent2: '#059669' },
  { name: 'Ámbar',    accent: '#f59e0b', accent2: '#d97706' },
  { name: 'Rosa',     accent: '#ec4899', accent2: '#db2777' },
  { name: 'Rojo',     accent: '#ef4444', accent2: '#dc2626' },
]

const currentAccent = ref<AccentPreset>(accentPresets[0])

const applyAccent = () => {
  document.documentElement.style.setProperty('--accent', currentAccent.value.accent)
  document.documentElement.style.setProperty('--accent-2', currentAccent.value.accent2)
}

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

  const setAccent = (preset: AccentPreset) => {
    currentAccent.value = preset
    localStorage.setItem('accent', JSON.stringify(preset))
    applyAccent()
  }

  const initTheme = () => {
    const saved = localStorage.getItem('theme')
    if (saved) isDark.value = saved === 'dark'
    applyTheme()

    const savedAccent = localStorage.getItem('accent')
    if (savedAccent) {
      try { currentAccent.value = JSON.parse(savedAccent) } catch { /* ignore */ }
    }
    applyAccent()
  }

  return { isDark, applyTheme, toggleTheme, initTheme, currentAccent, accentPresets, setAccent }
}
