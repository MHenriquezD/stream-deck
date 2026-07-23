<script setup>
import { Capacitor } from '@capacitor/core'
import { onMounted, ref } from 'vue'
import ConnectionIndicator from './components/ConnectionIndicator.vue'
import StreamDeckGrid from './components/StreamDeckGrid.vue'
import { useAuth } from './composables/useAuth'
import { useExternalLinks } from './composables/useExternalLinks'

const { isAuthenticated, checkAuth, checkPinStatus, logout, serverReachable } =
  useAuth()
const ready = ref(false)

// Interceptar links externos para abrir en el navegador del sistema
useExternalLinks()

onMounted(async () => {
  const isMobile =
    Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios'

  // 1. Check if PIN is configured on the server
  const hasPIN = await checkPinStatus()

  if (serverReachable.value === false) {
    // No sabemos si hay PIN porque no se alcanzó el servidor (sin emparejar,
    // servidor apagado, otra red...). NO conceder acceso a ciegas: se conserva
    // el estado que ya hubiera (sin token → bloqueado) y la UI avisa.
  } else if (!hasPIN) {
    // Confirmado que el servidor no tiene PIN → app sin auth
    isAuthenticated.value = true
  } else if (isMobile) {
    // Mobile: always require PIN on app start
    await logout()
  } else {
    // Desktop: check if token is still valid
    await checkAuth()
  }

  ready.value = true
})
</script>

<template>
  <div class="app-container">
    <div class="app">
      <template v-if="ready">
        <Toast position="top-right" />
        <ConnectionIndicator v-if="isAuthenticated" />
        <div
          v-else-if="serverReachable === false"
          class="server-unreachable"
          role="alert"
        >
          <span class="su-icon" aria-hidden="true">📡</span>
          <div class="su-text">
            <strong>No se encuentra el servidor</strong>
            <span
              >Empareja tu PC desde Configuración (escanea el QR o introduce la
              IP).</span
            >
          </div>
        </div>
        <StreamDeckGrid :rows="3" :cols="4" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.server-unreachable {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  max-width: min(92vw, 30rem);
  padding: 0.6rem 0.9rem;
  border-radius: 14px;
  background: rgba(245, 158, 11, 0.18);
  color: rgb(146, 64, 14);
  backdrop-filter: blur(6px);
  font-size: 0.82rem;
  line-height: 1.3;
}

.su-icon {
  font-size: 1.2rem;
  flex: none;
}

.su-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

@media (prefers-color-scheme: dark) {
  .server-unreachable {
    background: rgba(245, 158, 11, 0.22);
    color: rgb(253, 230, 138);
  }
}

.app {
  min-height: 100vh;
  min-height: 100dvh;
  width: 100%;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  /* ⭐ Respetar safe areas del sistema */
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  min-height: 100vh;
  min-height: 100dvh;
}

/* ⭐ IMPORTANTE: Configurar viewport para safe areas */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow-x: hidden;
}

::-webkit-scrollbar {
  width: 0px;
}
</style>

<style>
/* Toast siempre por encima de todos los overlays */
.p-toast {
  z-index: 9999999 !important;
}

/* ⭐ Scanner QR - Ocultar toda la app cuando está escaneando */
body.qr-scanning {
  background: transparent !important;
  overflow: hidden !important;
}

html.qr-scanning {
  background: transparent !important;
}

/* Ocultar todo el contenido de la app */
body.qr-scanning > #app > *:not(.scanner-fullscreen) {
  display: none !important;
}

/* Asegurar que SOLO el scanner sea visible */
.scanner-fullscreen {
  display: flex !important;
  visibility: visible !important;
  opacity: 1 !important;
  z-index: 999999 !important;
  position: fixed !important;
  inset: 0 !important;
}
</style>
