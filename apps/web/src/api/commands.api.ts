import type { Command } from '../models/command.model'

const BASE_URL = 'http://localhost:3000'

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
