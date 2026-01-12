import { ref } from 'vue'

const DEFAULT_URL = 'http://localhost:3000'

export function useServerUrl() {
  const getServerUrl = (): string => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('serverUrl') || DEFAULT_URL
    }
    return DEFAULT_URL
  }

  const serverUrl = ref(getServerUrl())

  const setServerUrl = (url: string) => {
    localStorage.setItem('serverUrl', url)
    serverUrl.value = url
  }

  return {
    serverUrl,
    getServerUrl,
    setServerUrl,
  }
}
