export enum ActionType {
  COMMAND = 'COMMAND',
  HOTKEY = 'HOTKEY',
  OPEN_APP = 'OPEN_APP',
  URL = 'URL',
}

export interface StreamButton {
  id: string
  label: string
  icon?: string
  color?: string
  backgroundColor?: string
  action: ButtonAction
  position: { row: number; col: number }
}

export interface ButtonAction {
  type: ActionType
  payload: string
  metadata?: Record<string, any>
}

export interface StreamDeckConfig {
  buttons: StreamButton[]
  gridSize: { rows: number; cols: number }
}

export interface CommandResponse {
  success: boolean
  output?: string
  error?: string
}

// ─── Contrato del WebSocket (cliente ↔ servidor) ───

/** Respuesta a la ejecución de un comando. */
export interface ExecuteResponse {
  success: boolean
  output?: string
  message?: string
}

/** Ajustes de la app persistidos en el servidor. */
export interface AppSettings {
  gridSize: number
  serverEnabled: boolean
  buttonSound: boolean
  buttonSoundFile: string
}

/** Estado de volumen del sistema. */
export interface VolumeState {
  volume: number
  muted: boolean
}
