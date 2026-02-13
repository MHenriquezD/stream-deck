import type { Command } from '../models/command.model'
import { useServerUrlStore } from '../store/serverUrl.store'

// Helper para construir URLs correctamente
const buildUrl = (base: string, path: string): string => {
  // Remover trailing slash de base
  const cleanBase = base.replace(/\/$/, '')
  // Remover leading slash de path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${cleanBase}/${cleanPath}`
}

// Obtener URL del servidor dinámicamente
const getServerUrl = (): string => {
  // Intentar desde localStorage primero (para mobile)
  const savedUrl = localStorage.getItem('serverUrl')
  if (savedUrl) {
    return savedUrl.replace(/\/$/, '')
  }

  // Intentar desde el store
  try {
    const serverUrlStore = useServerUrlStore()
    if (serverUrlStore.serverUrl) {
      return serverUrlStore.serverUrl.replace(/\/$/, '')
    }
  } catch (e) {
    // Store no disponible (fuera de componente)
  }

  // Fallback a localhost
  return 'http://localhost:7500'
}

// API para comandos (legacy)
export const getCommands = async (): Promise<Command[]> => {
  const url = buildUrl(getServerUrl(), '/command')
  console.log('getCommands URL:', url) // Debug
  const res = await fetch(url)
  return res.json()
}

export const saveCommand = async (command: Command) => {
  const url = buildUrl(getServerUrl(), '/command')
  console.log('saveCommand URL:', url) // Debug
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
}

// API principal (refactorizada)
class ApiService {
  private getBaseUrl(): string {
    return getServerUrl()
  }

  private buildUrl(path: string): string {
    const base = this.getBaseUrl()
    const cleanPath = path.startsWith('/') ? path.slice(1) : path
    const url = `${base}/${cleanPath}`
    console.log('API Request:', url) // Debug
    return url
  }

  async getNetworkInfo() {
    const url = this.buildUrl('network-info')
    const response = await fetch(url)
    return response.json()
  }

  async getButtons() {
    const url = this.buildUrl('command')
    const response = await fetch(url)
    return response.json()
  }

  async executeCommand(id: string) {
    const url = this.buildUrl(`command/execute/${id}`)
    const response = await fetch(url, { method: 'POST' })
    return response.json()
  }

  async checkHealth() {
    const url = this.buildUrl('health')
    const response = await fetch(url)
    return response.json()
  }

  async getInstalledApps() {
    const url = this.buildUrl('command/installed-apps')
    const response = await fetch(url)
    return response.json()
  }

  async getPresets() {
    const url = this.buildUrl('command/presets/multimedia')
    const response = await fetch(url)
    return response.json()
  }

  // Método para actualizar la URL base
  updateServerUrl(newUrl: string) {
    const cleanUrl = newUrl.replace(/\/$/, '')
    localStorage.setItem('serverUrl', cleanUrl)

    // También actualizar el store si está disponible
    try {
      const serverUrlStore = useServerUrlStore()
      serverUrlStore.setServerUrl(cleanUrl)
    } catch (e) {
      console.warn('Could not update store:', e)
    }

    console.log('Server URL updated to:', cleanUrl)
  }

  // Obtener la URL actual
  getCurrentUrl(): string {
    return this.getBaseUrl()
  }
}

// Exportar instancia singleton
export const api = new ApiService()
