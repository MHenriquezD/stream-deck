<script setup lang="ts">
import { onMounted, ref } from 'vue'

const isDark = ref(true)

const toggleTheme = () => {
  isDark.value = !isDark.value
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  applyTheme()
}

const applyTheme = () => {
  const app = document.querySelector('.app')
  if (isDark.value) {
    app?.classList.add('dark')
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    app?.classList.remove('dark')
    document.documentElement.setAttribute('data-theme', 'light')
  }
}

onMounted(() => {
  const savedTheme = localStorage.getItem('theme')
  if (savedTheme) {
    isDark.value = savedTheme === 'dark'
  }
  applyTheme()
})
</script>

<template>
  <button
    class="theme-toggle"
    @click="toggleTheme"
    :title="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
  >
    <i v-if="isDark" class="pi pi-sun"></i>
    <i v-else class="pi pi-moon"></i>
  </button>
</template>

<style scoped>
.theme-toggle {
  position: fixed;
  top: 1rem;
  right: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  background: rgba(30, 30, 46, 0.8);
  backdrop-filter: blur(10px);
  color: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.3s ease;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.theme-toggle:hover {
  background: rgba(40, 40, 60, 0.9);
  border-color: rgba(255, 255, 255, 0.2);
  transform: scale(1.05);
}

.theme-toggle:active {
  transform: scale(0.95);
}

/* Estilos para tema claro */
:global([data-theme='light']) .theme-toggle {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(0, 0, 0, 0.1);
  color: rgba(0, 0, 0, 0.8);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

:global([data-theme='light']) .theme-toggle:hover {
  background: rgba(240, 240, 240, 1);
  border-color: rgba(0, 0, 0, 0.15);
}
</style>
