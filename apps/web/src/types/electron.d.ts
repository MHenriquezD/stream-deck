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
      getNetworkInterfaces: () => Promise<NetworkInfo>
      openExternal: (url: string) => Promise<void>
      spotifyAuth: (authUrl: string, redirectUri: string) => Promise<string | null>
      isElectron: () => boolean
      platform: () => string
    }
  }
}

export {}
