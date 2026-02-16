export interface NetworkInterface {
  name: string
  address: string
  url: string
}

export interface NetworkInfo {
  interfaces: NetworkInterface[]
  preferredUrl: string
}

declare global {
  interface Window {
    electronAPI?: {
      getNetworkInterfaces: () => Promise<NetworkInfo> // ⭐ Ahora es Promise
      isElectron: () => boolean
      platform: () => string
    }
  }
}

export {}
