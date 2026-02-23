<script setup>
import StreamDeckGrid from './components/StreamDeckGrid.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="app-container">
    <div class="app">
      <Toast position="top-right" />
      <ThemeToggle />
      <StreamDeckGrid :rows="3" :cols="4" />
    </div>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
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
</style>

<style>
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
