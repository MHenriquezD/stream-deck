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
    @click="toggleTheme"
    :title="isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
    class="fixed top-4 right-4 w-12 h-12 rounded-xl border-2 flex items-center justify-center text-[1.25rem] transition-all duration-300 z-[1000] shadow-lg border-white/10 bg-[#23233a] text-white/90 hover:bg-[#28283c] hover:border-white/20 hover:scale-105 active:scale-95 dark:bg-[#23233a] dark:text-white/90 dark:border-white/10 dark:hover:bg-[#28283c] dark:hover:border-white/20 dark:active:scale-95 [data-theme='light']:bg-white [data-theme='light']:border-black/10 [data-theme='light']:text-black/80 [data-theme='light']:shadow-md [data-theme='light']:hover:bg-[#f5f5f5] [data-theme='light']:hover:border-black/15"
  >
    <i v-if="isDark" class="pi pi-sun"></i>
    <i v-else class="pi pi-moon"></i>
  </button>
</template>
