import type {
  AppSettings,
  ExecuteResponse,
  StreamButton,
  VolumeState,
} from '@shared/core'
import { io, Socket } from 'socket.io-client'
import { ref, shallowRef } from 'vue'
import { useAuth } from './useAuth'
import { useServerUrl } from './useServerUrl'

type SocketListener = (...args: unknown[]) => void

const socket = shallowRef<Socket | null>(null)
const isConnected = ref(false)

// Registry of listeners that survive socket recreation (disconnect → connect)
const registeredListeners = new Map<string, Set<SocketListener>>()

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
  /** Default de tiempo de espera para respuestas del servidor (ms). */
  const ACK_TIMEOUT_MS = 5000

  /**
   * Emite un evento que espera respuesta (ack) del servidor, con timeout.
   * Si el socket no está conectado o el servidor no responde a tiempo,
   * resuelve con `fallback` en lugar de quedar colgado indefinidamente.
   */
  const emitWithAck = <T>(
    event: string,
    payload: unknown,
    fallback: T,
    timeoutMs = ACK_TIMEOUT_MS,
  ): Promise<T> => {
    return new Promise((resolve) => {
      if (!socket.value?.connected) {
        resolve(fallback)
        return
      }
      socket.value
        .timeout(timeoutMs)
        .emit(event, payload, (err: Error | null, response: T) => {
          if (err) {
            console.warn(`⚠️ Timeout esperando "${event}" del servidor`)
            resolve(fallback)
            return
          }
          resolve(response ?? fallback)
        })
    })
  }

  const execute = (id: string): Promise<ExecuteResponse> => {
    return emitWithAck<ExecuteResponse>(
      'execute',
      { id },
      {
        success: false,
        message: socket.value?.connected
          ? 'El servidor no respondió a tiempo'
          : 'Socket no conectado',
      },
    )
  }

  /** Guardar comandos y notificar a todos los clientes */
  const saveCommands = (commands: StreamButton[]) => {
    socket.value?.emit('commands:save', commands)
  }

  /** Obtener comandos */
  const getCommands = (): Promise<StreamButton[]> => {
    return emitWithAck<StreamButton[]>('commands:get', {}, [])
  }

  /** Obtener settings */
  const getSettings = (): Promise<AppSettings> => {
    return emitWithAck<AppSettings>('settings:get', {}, {
      gridSize: 12,
      serverEnabled: true,
      buttonSound: true,
      buttonSoundFile: 'key-click.wav',
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
  const getVolume = (): Promise<VolumeState> => {
    return emitWithAck<VolumeState>('volume:get', {}, {
      volume: 0,
      muted: false,
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
  const on = (event: string, callback: SocketListener) => {
    if (!registeredListeners.has(event)) {
      registeredListeners.set(event, new Set())
    }
    registeredListeners.get(event)!.add(callback)
    socket.value?.on(event, callback)
  }

  /** Dejar de escuchar un evento */
  const off = (event: string, callback?: SocketListener) => {
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
