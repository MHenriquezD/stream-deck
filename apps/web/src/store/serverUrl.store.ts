import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useServerUrlStore = defineStore('serverUrl', () => {
  // Inicializar desde localStorage o default
  const getInitialUrl = () => {
    const saved = localStorage.getItem('serverUrl')
    if (saved) return saved
    return 'http://localhost:7500'
  }

  const serverUrl = ref(getInitialUrl())

  const setServerUrl = (url: string) => {
    const cleanUrl = url.replace(/\/$/, '')
    serverUrl.value = cleanUrl
    localStorage.setItem('serverUrl', cleanUrl)
  }

  return {
    serverUrl,
    setServerUrl,
  }
})
