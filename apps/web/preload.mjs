import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  app: {
    getName: () => 'Stream Deck',
    getVersion: () => '1.0.0',
  },
})
