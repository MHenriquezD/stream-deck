import { io, Socket } from 'socket.io-client'
import { ref, shallowRef } from 'vue'
import { useAuth } from './useAuth'
import { useServerUrl } from './useServerUrl'

const socket = shallowRef<Socket | null>(null)
const isConnected = ref(false)

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
        resolve(response?.data || response)
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
        resolve(response?.data || [])
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
        resolve(response?.data || { gridSize: 12 })
      })
    })
  }

  /** Cambiar gridSize y notificar a todos los clientes */
  const setGridSize = (gridSize: number) => {
    socket.value?.emit('settings:gridSize', { gridSize })
  }

  /** Escuchar un evento del servidor */
  const on = (event: string, callback: (...args: any[]) => void) => {
    socket.value?.on(event, callback)
  }

  /** Dejar de escuchar un evento */
  const off = (event: string, callback?: (...args: any[]) => void) => {
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
    on,
    off,
  }
}
