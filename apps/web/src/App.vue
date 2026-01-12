<script setup>
import StreamDeckGrid from './components/StreamDeckGrid.vue'
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="app dark">
    <Toast position="top-right" />
    <ConfirmDialog />
    <ThemeToggle />
    <StreamDeckGrid :rows="3" :cols="4" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  width: 100%;
}
</style>
