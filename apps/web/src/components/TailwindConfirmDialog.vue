<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div
        v-if="show"
        class="confirm-backdrop"
        @click.self="$emit('close')"
      >
        <div class="confirm-panel">
          <div class="confirm-icon-wrap">
            <svg class="confirm-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="confirm-title">{{ title }}</h2>
          <p class="confirm-msg">{{ message }}</p>
          <div class="confirm-actions">
            <button @click="$emit('cancel')" class="btn-neon btn-act">{{ cancelLabel }}</button>
            <button @click="$emit('confirm')" class="btn-neon btn-neon-danger btn-act">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    show: boolean
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    confirmClass?: string
  }>(),
  {
    confirmLabel: 'Eliminar',
    cancelLabel: 'Cancelar',
    confirmClass: '',
  },
)

defineEmits(['confirm', 'cancel', 'close'])
</script>

<style scoped>
.confirm-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: var(--scrim);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.confirm-panel {
  max-width: 380px;
  width: 100%;
  padding: 32px 28px 24px;
  border-radius: 20px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.94) 0%, rgba(10, 10, 16, 0.97) 100%);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 24px 60px rgba(0, 0, 0, 0.7);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.confirm-icon-wrap { margin-bottom: 6px; }
.confirm-icon { width: 48px; height: 48px; color: #fbbf24; }

.confirm-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-1);
}

.confirm-msg {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text-2);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 14px;
}

.btn-act {
  flex: 1;
  padding: 11px 18px;
  font-size: 0.95rem;
  font-weight: 600;
}

.confirm-enter-active { transition: opacity 0.3s ease; }
.confirm-leave-active { transition: opacity 0.2s ease; }
.confirm-enter-from, .confirm-leave-to { opacity: 0; }
.confirm-enter-active .confirm-panel {
  transition: transform 0.4s cubic-bezier(0.34, 1.8, 0.64, 1);
}
.confirm-leave-active .confirm-panel { transition: transform 0.2s ease-in; }
.confirm-enter-from .confirm-panel { transform: scale(0.5); }
.confirm-leave-to .confirm-panel { transform: scale(0.85); }

/* Mobile: bottom sheet en vez de tarjeta flotante centrada */
@media (max-width: 480px) {
  .confirm-backdrop { align-items: flex-end; padding: 0; }
  .confirm-panel {
    max-width: 100%;
    border-radius: 24px 24px 0 0;
    padding: 28px 24px calc(20px + env(safe-area-inset-bottom, 0px));
  }
  .confirm-actions { flex-direction: column-reverse; margin-top: 20px; }
  .btn-act { padding: 14px 18px; font-size: 1rem; }
  .confirm-enter-active .confirm-panel {
    transition: transform 0.35s cubic-bezier(0.22, 1.2, 0.36, 1);
  }
  .confirm-leave-active .confirm-panel { transition: transform 0.2s ease-in; }
  .confirm-enter-from .confirm-panel { transform: translateY(100%); }
  .confirm-leave-to .confirm-panel { transform: translateY(100%); }
}

/* Light theme */
[data-theme='light'] .confirm-panel {
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 245, 250, 0.98) 100%);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.04),
    0 24px 60px rgba(0, 0, 0, 0.15);
}
</style>
