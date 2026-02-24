<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[1200] flex items-center justify-center"
      @click.self="$emit('close')"
    >
      <div
        class="confirm-dialog relative rounded-2xl shadow-xl max-w-sm w-full p-8"
      >
        <button
          @click="$emit('close')"
          class="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl font-bold focus:outline-none"
        >
          <i class="pi pi-times"></i>
        </button>
        <div class="flex flex-col items-center text-center">
          <div class="mb-4">
            <svg
              class="w-12 h-12 text-yellow-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 class="text-xl font-semibold mb-2">
            {{ title }}
          </h2>
          <p class="mb-6">{{ message }}</p>
          <div class="flex gap-4 w-full justify-center">
            <button
              @click="$emit('cancel')"
              class="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              Cancelar
            </button>
            <button
              @click="$emit('confirm')"
              class="px-6 py-2 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition"
            >
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  message: string
}>()

defineEmits(['confirm', 'cancel', 'close'])
</script>

<style scoped>
.confirm-dialog {
  background: var(--confirm-bg-light);
  background-color: var(--confirm-bg-light);
  color: var(--confirm-text-light);
}

/* Light theme adaptation */
[data-theme='light'] .confirm-dialog {
  background: var(--confirm-bg-light);
  background-color: var(--confirm-bg-light);
  color: var(--confirm-text-light);
}
</style>
