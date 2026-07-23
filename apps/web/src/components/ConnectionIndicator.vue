<script setup lang="ts">
import { computed } from 'vue'
import { useSocket } from '../composables/useSocket'

const { isConnected } = useSocket()

const label = computed(() =>
  isConnected.value ? 'Conectado' : 'Sin conexión — reconectando…',
)
</script>

<template>
  <div
    class="conn-indicator"
    :class="{ 'is-connected': isConnected, 'is-offline': !isConnected }"
    role="status"
    :aria-live="isConnected ? 'off' : 'assertive'"
    :aria-label="label"
  >
    <span class="conn-dot" aria-hidden="true"></span>
    <span class="conn-text">{{ label }}</span>
  </div>
</template>

<style scoped>
.conn-indicator {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 0.5rem);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100000;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1;
  pointer-events: none;
  backdrop-filter: blur(6px);
  transition:
    opacity 0.3s ease,
    background-color 0.3s ease,
    color 0.3s ease;
}

.conn-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  flex: none;
}

/* ── Conectado: discreto, se desvanece ── */
.conn-indicator.is-connected {
  background: rgba(34, 197, 94, 0.15);
  color: rgb(21, 128, 61);
  opacity: 0;
  animation: conn-flash 2.4s ease forwards;
}
.conn-indicator.is-connected .conn-dot {
  background: rgb(34, 197, 94);
}

/* ── Sin conexión: prominente y persistente ── */
.conn-indicator.is-offline {
  background: rgba(239, 68, 68, 0.16);
  color: rgb(185, 28, 28);
  opacity: 1;
}
.conn-indicator.is-offline .conn-dot {
  background: rgb(239, 68, 68);
  animation: conn-pulse 1.2s ease-in-out infinite;
}

@keyframes conn-flash {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
  15% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

@keyframes conn-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(0.7);
    opacity: 0.6;
  }
}

/* ── Modo oscuro ── */
@media (prefers-color-scheme: dark) {
  .conn-indicator.is-connected {
    background: rgba(34, 197, 94, 0.2);
    color: rgb(134, 239, 172);
  }
  .conn-indicator.is-offline {
    background: rgba(239, 68, 68, 0.22);
    color: rgb(252, 165, 165);
  }
}
</style>
