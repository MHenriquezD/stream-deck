const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  app: {
    getName: () => 'Spartan Hub',
    getVersion: () => '1.0.0',
  },
})

contextBridge.exposeInMainWorld('electronAPI', {
  // ⭐ Usar IPC en lugar de acceso directo a 'os'
  getNetworkInterfaces: () => {
    return ipcRenderer.invoke('get-network-interfaces')
  },

  // Abrir URL en el navegador del sistema
  openExternal: (url) => {
    return ipcRenderer.invoke('open-external', url)
  },

  // Detectar si estamos en Electron
  isElectron: () => true,

  // Obtener plataforma
  platform: () => process.platform,
})
