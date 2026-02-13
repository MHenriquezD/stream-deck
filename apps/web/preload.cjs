const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  app: {
    getName: () => 'Spartan Hub',
    getVersion: () => '1.0.0',
  },
})
