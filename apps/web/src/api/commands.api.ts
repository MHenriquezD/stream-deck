import type { Command } from '../models/command.model'
import { useServerUrlStore } from '../store/serverUrl.store'

const serverUrlStore = useServerUrlStore()
const BASE_URL = serverUrlStore.serverUrl

export const getCommands = async (): Promise<Command[]> => {
  const res = await fetch(`${BASE_URL}/commands`)
  return res.json()
}

export const saveCommand = async (command: Command) => {
  await fetch(`${BASE_URL}/commands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  })
}

const getServerUrl = (): string => {
  // En mobile, usa la URL guardada del QR
  const savedUrl = localStorage.getItem('serverUrl')
  if (savedUrl) return savedUrl

  // En desktop, usa localhost
  return 'http://localhost:7500'
}

export const api = {
  baseUrl: getServerUrl(),

  async getButtons() {
    const response = await fetch(`${this.baseUrl}/command`)
    return response.json()
  },

  async executeCommand(id: string) {
    const response = await fetch(`${this.baseUrl}/command/execute/${id}`, {
      method: 'POST',
    })
    return response.json()
  },
}
