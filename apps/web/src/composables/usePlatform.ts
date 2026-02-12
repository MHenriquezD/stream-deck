import { Capacitor } from '@capacitor/core'
import { onMounted, ref } from 'vue'

export const usePlatform = () => {
  const platform = ref<'web' | 'android' | 'ios'>('web')
  const isMobile = ref(false)
  const isNative = ref(false)

  onMounted(() => {
    isNative.value = Capacitor.isNativePlatform()
    platform.value = Capacitor.getPlatform() as 'web' | 'android' | 'ios'
    isMobile.value = platform.value === 'android' || platform.value === 'ios'
  })

  return {
    platform,
    isMobile,
    isNative,
    isAndroid: () => platform.value === 'android',
    isIOS: () => platform.value === 'ios',
    isWeb: () => platform.value === 'web',
  }
}
