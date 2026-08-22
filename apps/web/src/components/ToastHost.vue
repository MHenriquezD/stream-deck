<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { useToast, type ToastSeverity } from '../composables/useToast'

const { toasts, remove } = useToast()

const toastIcon: Record<ToastSeverity, string> = {
  success: 'mdi:check-circle',
  error: 'mdi:close-circle',
  warn: 'mdi:alert',
  info: 'mdi:information',
}
</script>

<template>
  <div class="toast-host" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast"
        :class="`toast-${t.severity}`"
        role="status"
        @click="remove(t.id)"
      >
        <Icon :icon="toastIcon[t.severity]" class="toast-icon" aria-hidden="true" />
        <div class="toast-body">
          <strong v-if="t.summary" class="toast-summary">{{ t.summary }}</strong>
          <span v-if="t.detail" class="toast-detail">{{ t.detail }}</span>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 0.75rem);
  right: calc(env(safe-area-inset-right) + 0.75rem);
  z-index: 9999999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: min(92vw, 22rem);
  pointer-events: none;
}

.toast {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(24, 24, 37, 0.92);
  color: #f4f4f5;
  backdrop-filter: blur(8px);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  font-size: 0.85rem;
  line-height: 1.3;
  /* Franja de color según severidad */
  border-left-width: 3px;
}

.toast-success {
  border-left-color: #22c55e;
}
.toast-error {
  border-left-color: #ef4444;
}
.toast-warn {
  border-left-color: #f59e0b;
}
.toast-info {
  border-left-color: #8b5cf6;
}

.toast-icon {
  font-size: 1.2rem;
  flex: none;
  line-height: 1;
}

.toast-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.toast-summary {
  font-weight: 600;
}

.toast-detail {
  opacity: 0.85;
  word-break: break-word;
}

/* Modo claro */
@media (prefers-color-scheme: light) {
  .toast {
    background: rgba(255, 255, 255, 0.95);
    color: #1f2937;
    border-color: rgba(0, 0, 0, 0.06);
  }
}
:global(:root[data-theme='light']) .toast {
  background: rgba(255, 255, 255, 0.95);
  color: #1f2937;
  border-color: rgba(0, 0, 0, 0.06);
}

/* Transiciones de entrada/salida */
.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}
.toast-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .toast-enter-active,
  .toast-leave-active {
    transition: opacity 0.2s ease;
  }
  .toast-enter-from,
  .toast-leave-to {
    transform: none;
  }
}
</style>
