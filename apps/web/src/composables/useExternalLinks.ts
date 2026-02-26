import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { onMounted, onUnmounted } from 'vue'

/**
 * Opens a URL in the system browser instead of inside the app.
 * Works on Electron, Capacitor (Android/iOS), and regular web.
 */
export const openExternalUrl = async (url: string): Promise<void> => {
  // Electron: use IPC → shell.openExternal
  if (window.electronAPI?.openExternal) {
    await window.electronAPI.openExternal(url)
    return
  }

  // Capacitor native (Android/iOS): use @capacitor/browser
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url })
    return
  }

  // Web fallback: open in new tab
  window.open(url, '_blank', 'noopener,noreferrer')
}

/**
 * Composable that intercepts all clicks on `<a target="_blank">` or `<a href="http...">`
 * and opens them in the system browser instead of in-app.
 * Mount this once in App.vue or a root component.
 */
export const useExternalLinks = () => {
  const handleClick = (event: MouseEvent) => {
    const target = (event.target as HTMLElement)?.closest(
      'a',
    ) as HTMLAnchorElement | null
    if (!target) return

    const href = target.getAttribute('href')
    if (!href) return

    // Only intercept external http/https links
    const isExternal = href.startsWith('http://') || href.startsWith('https://')
    const isBlank = target.getAttribute('target') === '_blank'

    if (
      isExternal &&
      (isBlank ||
        Capacitor.isNativePlatform() ||
        window.electronAPI?.isElectron?.())
    ) {
      event.preventDefault()
      event.stopPropagation()
      openExternalUrl(href)
    }
  }

  onMounted(() => {
    document.addEventListener('click', handleClick, true)
  })

  onUnmounted(() => {
    document.removeEventListener('click', handleClick, true)
  })
}
