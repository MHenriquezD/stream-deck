import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.mhenriquez.streamdeck',
  appName: 'streamdeck',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
}

export default config
