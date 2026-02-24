import { ref } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'

const authToken = ref<string | null>(localStorage.getItem('authToken'))
const isAuthenticated = ref(!!authToken.value)
const pinConfigured = ref(false)

export function useAuth() {
  const serverUrlStore = useServerUrlStore()

  /** Check if server has a PIN configured */
  const checkPinStatus = async (): Promise<boolean> => {
    try {
      const response = await fetch(`${serverUrlStore.serverUrl}/auth/status`)
      const data = await response.json()
      pinConfigured.value = data.pinConfigured
      return data.pinConfigured
    } catch {
      return false
    }
  }

  /** Setup PIN for the first time (desktop). Auto-authenticates. */
  const setupPin = async (
    pin: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(
        `${serverUrlStore.serverUrl}/auth/setup-pin`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        },
      )

      const data = await response.json()

      if (data.success && data.token) {
        authToken.value = data.token
        isAuthenticated.value = true
        pinConfigured.value = true
        localStorage.setItem('authToken', data.token)
        return { success: true }
      }

      return {
        success: false,
        message: data.message || 'Error al configurar PIN',
      }
    } catch {
      return { success: false, message: 'No se pudo conectar con el servidor' }
    }
  }

  /** Change PIN (requires existing auth) */
  const changePin = async (
    pin: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(
        `${serverUrlStore.serverUrl}/auth/change-pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({ pin }),
        },
      )

      const data = await response.json()

      if (data.success && data.token) {
        // Update to new token (old sessions invalidated)
        authToken.value = data.token
        localStorage.setItem('authToken', data.token)
        return { success: true }
      }

      return { success: false, message: data.message || 'Error al cambiar PIN' }
    } catch {
      return { success: false, message: 'No se pudo conectar con el servidor' }
    }
  }

  /** Login with PIN (mobile), returns success/failure */
  const login = async (
    pin: string,
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${serverUrlStore.serverUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (data.success && data.token) {
        authToken.value = data.token
        isAuthenticated.value = true
        localStorage.setItem('authToken', data.token)
        return { success: true }
      }

      return { success: false, message: data.message || 'PIN incorrecto' }
    } catch {
      return { success: false, message: 'No se pudo conectar con el servidor' }
    }
  }

  /** Check if stored token is still valid */
  const checkAuth = async (): Promise<boolean> => {
    if (!authToken.value) {
      isAuthenticated.value = false
      return false
    }

    try {
      const response = await fetch(`${serverUrlStore.serverUrl}/auth/check`, {
        headers: { Authorization: `Bearer ${authToken.value}` },
      })
      const data = await response.json()

      if (data.authenticated) {
        isAuthenticated.value = true
        return true
      }
    } catch {
      // server unreachable
    }

    // Token invalid — clear it
    authToken.value = null
    isAuthenticated.value = false
    localStorage.removeItem('authToken')
    return false
  }

  /** Logout */
  const logout = async () => {
    if (authToken.value) {
      try {
        await fetch(`${serverUrlStore.serverUrl}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken.value}` },
        })
      } catch {
        // ignore
      }
    }
    authToken.value = null
    isAuthenticated.value = false
    localStorage.removeItem('authToken')
  }

  /** Get auth headers for fetch requests */
  const getAuthHeaders = (): Record<string, string> => {
    if (authToken.value) {
      return { Authorization: `Bearer ${authToken.value}` }
    }
    return {}
  }

  /** Get the raw token (for Socket.IO auth) */
  const getToken = (): string | null => {
    return authToken.value
  }

  return {
    authToken,
    isAuthenticated,
    pinConfigured,
    login,
    logout,
    setupPin,
    changePin,
    checkAuth,
    checkPinStatus,
    getAuthHeaders,
    getToken,
  }
}
