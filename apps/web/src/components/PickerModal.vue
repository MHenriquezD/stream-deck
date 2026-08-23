<script setup lang="ts">
import { Icon } from '@iconify/vue'

const props = withDefaults(
  defineProps<{
    show: boolean
    title: string
    /** Ancho máximo del panel en desktop, en px. */
    maxWidth?: number
    /** Alto fijo del panel en desktop, en px. Si se omite, el panel se
     * ajusta al contenido (para modales sin scroll interno propio). */
    height?: number
    /** En móvil, ocupar toda la pantalla en vez del bottom-sheet habitual. */
    mobileFullscreen?: boolean
  }>(),
  { maxWidth: 900 },
)

const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Transition name="picker">
    <div
      v-if="show"
      class="picker-backdrop"
      :class="{ 'mobile-fullscreen': mobileFullscreen }"
      @click="emit('close')"
    >
      <div
        class="picker-panel"
        :class="{ 'mobile-fullscreen': mobileFullscreen }"
        :style="{ maxWidth: props.maxWidth + 'px', height: props.height ? props.height + 'px' : 'auto' }"
        @click.stop
      >
        <header class="picker-header">
          <h3>{{ title }}</h3>
          <div class="header-actions">
            <slot name="header-actions" />
            <button
              type="button"
              class="header-close"
              aria-label="Cerrar"
              @click="emit('close')"
            >
              <Icon icon="mdi:close" />
            </button>
          </div>
        </header>

        <slot />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.picker-backdrop {
  position: fixed;
  inset: 0;
  background: var(--scrim);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
}

.picker-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.94) 0%, rgba(10, 10, 16, 0.97) 100%);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 32px 80px rgba(0, 0, 0, 0.7),
    0 0 60px -10px color-mix(in srgb, var(--accent) 30%, transparent);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
}
.picker-header h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-1); }
.header-actions { display: flex; align-items: center; gap: 8px; }
.header-close {
  width: 34px; height: 34px; border-radius: 10px;
  border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.04);
  color: var(--text-2); cursor: pointer; display: grid; place-items: center;
  font-size: 0.9rem; transition: background 0.18s, color 0.18s;
}
.header-close svg { transition: transform 0.18s; }
@media (hover: hover) {
  .header-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-1); }
  .header-close:hover svg { transform: rotate(90deg); }
}

@media (max-width: 640px) {
  .picker-backdrop { align-items: flex-end; padding: 0; }
  .picker-panel { max-width: 100% !important; height: auto !important; max-height: 92dvh; border-radius: 24px 24px 0 0; }
  .picker-backdrop.mobile-fullscreen { align-items: stretch; }
  .picker-panel.mobile-fullscreen {
    height: 100dvh !important;
    max-height: 100dvh;
    border-radius: 0;
  }
  .picker-enter-from .picker-panel { transform: translateY(100%); }
  .picker-leave-to .picker-panel { transform: translateY(100%); }
}

.picker-enter-active { transition: opacity 0.35s ease; }
.picker-leave-active { transition: opacity 0.25s ease; }
.picker-enter-from, .picker-leave-to { opacity: 0; }
.picker-enter-active .picker-panel {
  transition: transform 0.45s cubic-bezier(0.22, 1.2, 0.36, 1);
}
.picker-leave-active .picker-panel { transition: transform 0.25s cubic-bezier(0.4, 0, 1, 1); }
.picker-enter-from .picker-panel { transform: translateY(80px) scale(0.85); }
.picker-leave-to .picker-panel { transform: translateY(40px) scale(0.92); }

/* Light theme */
[data-theme='light'] .picker-panel {
  background: linear-gradient(170deg, rgba(255, 255, 255, 0.97) 0%, rgba(245, 245, 250, 0.98) 100%);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 32px 80px rgba(0, 0, 0, 0.15), 0 0 60px -10px color-mix(in srgb, var(--accent) 15%, transparent);
}
[data-theme='light'] .picker-header { border-bottom-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .header-close { background: rgba(0, 0, 0, 0.04); border-color: rgba(0, 0, 0, 0.1); }
[data-theme='light'] .header-close:hover { background: rgba(0, 0, 0, 0.08); }
</style>
