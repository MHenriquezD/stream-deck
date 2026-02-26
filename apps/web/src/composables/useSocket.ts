import { io, Socket } from 'socket.io-client'
import { ref, shallowRef } from 'vue'
import { useAuth } from './useAuth'
import { useServerUrl } from './useServerUrl'

const socket = shallowRef<Socket | null>(null)
const isConnected = ref(false)

// Registry of listeners that survive socket recreation (disconnect → connect)
const registeredListeners = new Map<string, Set<(...args: any[]) => void>>()

export function useSocket() {
  const { getServerUrl } = useServerUrl()
  const { getToken } = useAuth()

  const connect = () => {
    if (socket.value?.connected) return

    const url = getServerUrl()
    const token = getToken()

    socket.value = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      auth: { token },
    })

    socket.value.on('connect', () => {
      isConnected.value = true
      console.log('🔌 Socket conectado:', socket.value?.id)
    })

    socket.value.on('disconnect', () => {
      isConnected.value = false
      console.log('❌ Socket desconectado')
    })

    socket.value.on('connect_error', (err) => {
      console.warn('⚠️ Error de conexión socket:', err.message)
      isConnected.value = false
    })

    // Re-apply all registered listeners to the new socket instance
    registeredListeners.forEach((callbacks, event) => {
      callbacks.forEach((cb) => socket.value?.on(event, cb))
    })
  }

  const disconnect = () => {
    socket.value?.disconnect()
    socket.value = null
    isConnected.value = false
  }

  /** Ejecutar un comando por ID via WebSocket */
  const execute = (
    id: string,
  ): Promise<{ success: boolean; output?: string; message?: string }> => {
    return new Promise((resolve) => {
      if (!socket.value?.connected) {
        resolve({ success: false, message: 'Socket no conectado' })
        return
      }
      socket.value.emit('execute', { id }, (response: any) => {
        resolve(response)
      })
    })
  }

  /** Guardar comandos y notificar a todos los clientes */
  const saveCommands = (commands: any[]) => {
    socket.value?.emit('commands:save', commands)
  }

  /** Obtener comandos */
  const getCommands = (): Promise<any[]> => {
    return new Promise((resolve) => {
      if (!socket.value?.connected) {
        resolve([])
        return
      }
      socket.value.emit('commands:get', {}, (response: any) => {
        resolve(response || [])
      })
    })
  }

  /** Obtener settings */
  const getSettings = (): Promise<{ gridSize: number }> => {
    return new Promise((resolve) => {
      if (!socket.value?.connected) {
        resolve({ gridSize: 12 })
        return
      }
      socket.value.emit('settings:get', {}, (response: any) => {
        resolve(response || { gridSize: 12 })
      })
    })
  }

  /** Cambiar gridSize y notificar a todos los clientes */
  const setGridSize = (gridSize: number) => {
    socket.value?.emit('settings:gridSize', { gridSize })
  }

  /** Cambiar sonido de botón y notificar a todos los clientes */
  const setButtonSound = (enabled: boolean, file: string) => {
    socket.value?.emit('settings:buttonSound', { enabled, file })
  }

  /** Activar/desactivar servidor (desktop toggle) */
  const setServerEnabled = (enabled: boolean) => {
    socket.value?.emit('server:setEnabled', { enabled })
  }

  /** Obtener volumen actual */
  const getVolume = (): Promise<{ volume: number; muted: boolean }> => {
    return new Promise((resolve) => {
      if (!socket.value?.connected) {
        resolve({ volume: 0, muted: false })
        return
      }
      socket.value.emit('volume:get', {}, (response: any) => {
        resolve(response || { volume: 0, muted: false })
      })
    })
  }

  /** Establecer volumen (0-100) */
  const setVolume = (volume: number) => {
    socket.value?.emit('volume:set', { volume })
  }

  /** Toggle mute */
  const toggleMute = () => {
    socket.value?.emit('volume:mute', {})
  }

  /** Escuchar un evento del servidor (persiste entre reconexiones) */
  const on = (event: string, callback: (...args: any[]) => void) => {
    if (!registeredListeners.has(event)) {
      registeredListeners.set(event, new Set())
    }
    registeredListeners.get(event)!.add(callback)
    socket.value?.on(event, callback)
  }

  /** Dejar de escuchar un evento */
  const off = (event: string, callback?: (...args: any[]) => void) => {
    if (callback) {
      registeredListeners.get(event)?.delete(callback)
    } else {
      registeredListeners.delete(event)
    }
    socket.value?.off(event, callback)
  }

  return {
    socket,
    isConnected,
    connect,
    disconnect,
    execute,
    saveCommands,
    getCommands,
    getSettings,
    setGridSize,
    setButtonSound,
    setServerEnabled,
    getVolume,
    setVolume,
    toggleMute,
    on,
    off,
  }
}
