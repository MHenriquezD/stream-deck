<script setup lang="ts">
import { Icon } from '@iconify/vue'
import type { StreamButton } from '@shared/core'
import { computed, ref } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'

const props = defineProps<{
  button: StreamButton | null
  isEmpty?: boolean
  isDragging?: boolean
  isDragOver?: boolean
  isSelected?: boolean
  /** Estado de ejecución del comando asociado. */
  status?: 'running' | 'success' | 'error'
  /** Muestra un placeholder mientras se cargan los botones por primera vez. */
  isLoading?: boolean
}>()

const emit = defineEmits<{
  click: [button: StreamButton | null]
  edit: [button: StreamButton | null]
  dragstart: [button: StreamButton | null]
  dragend: []
  dragover: []
  dragleave: []
  drop: []
}>()

// Long press detection for mobile
const serverUrlStore = useServerUrlStore()
const isLongPressing = ref(false)

// Ref reactivo para el tema
const theme = ref(document.documentElement.getAttribute('data-theme') || 'dark')

// Watcher para detectar cambios en el atributo data-theme
const observer = new MutationObserver(() => {
  theme.value = document.documentElement.getAttribute('data-theme') || 'dark'
})
observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme'],
})
const buttonStyle = computed(() => {
  // El color del botón se usa como acento (marco + glow); el relleno del
  // recuadro es oscuro. El icono/label usan `color`.
  if (props.button) {
    const accent =
      props.button.backgroundColor ||
      (theme.value === 'dark' ? '#8b5cf6' : '#6366f1')
    return {
      color: props.button.color || '#FFF',
      '--glow': accent,
    }
  }
  // Si está vacío, fondo degradado adaptado al tema
  let emptyBg =
    theme.value === 'dark'
      ? 'linear-gradient(145deg, rgba(34,34,58,0.7) 0%, rgba(34,34,58,0.3) 100%)'
      : 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(220,220,240,0.4) 100%)'
  return {
    background: emptyBg,
    color: theme.value === 'dark' ? '#FFF' : '#000',
  }
})

const handleClick = () => {
  if (!isLongPressing.value) {
    if (!props.button) {
      emit('edit', props.button)
    } else {
      emit('click', props.button)
    }
  }
  isLongPressing.value = false
}

const handleEdit = (e: MouseEvent) => {
  if (matchMedia('(pointer: coarse)').matches) return
  e.stopPropagation()
  e.preventDefault()
  emit('edit', props.button)
}

const handleTouchStart = () => {
  isLongPressing.value = false
}

const handleTouchEnd = () => {
  isLongPressing.value = false
}

const handleTouchMove = () => {
  isLongPressing.value = false
}

// ⭐ Agregar touchcancel para limpiar estado
const handleTouchCancel = () => {
  isLongPressing.value = false
}

const handleDragStart = (e: DragEvent) => {
  if (!props.button) return
  e.dataTransfer!.effectAllowed = 'move'
  emit('dragstart', props.button)
}

const handleDragEnd = () => {
  emit('dragend')
}

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
  emit('dragover')
}

const handleDragLeave = () => {
  emit('dragleave')
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  emit('drop')
}
</script>

<template>
  <div
    class="stream-button"
    :class="{
      empty: isEmpty,
      dragging: isDragging,
      'drag-over': isDragOver,
      selected: isSelected,
      'status-running': status === 'running',
      'status-success': status === 'success',
      'status-error': status === 'error',
    }"
    :aria-busy="status === 'running'"
    :title="button?.label"
    :style="buttonStyle"
    :draggable="!!button"
    @click="handleClick"
    @contextmenu.prevent="handleEdit"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchmove="handleTouchMove"
    @touchcancel="handleTouchCancel"
    @dragstart="handleDragStart"
    @dragend="handleDragEnd"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <div v-if="button" class="button-content">
      <div v-if="button.icon" class="button-icon">
        <img
          v-if="button.icon.startsWith('svg:')"
          :src="'./icons/' + button.icon.replace('svg:', '')"
          class="custom-icon"
          alt="icon"
        />
        <img
          v-else-if="button.icon.startsWith('appicon:')"
          :src="serverUrlStore.serverUrl + button.icon.replace('appicon:', '')"
          class="custom-icon app-icon"
          alt="icon"
          @error="($event.target as HTMLImageElement).style.display = 'none'"
        />
        <img
          v-else-if="button.icon.startsWith('sd:')"
          :src="'./streamdeck-icons/' + button.icon.replace('sd:', '')"
          class="custom-icon"
          alt="icon"
        />
        <img
          v-else-if="button.icon.startsWith('custom:')"
          :src="
            serverUrlStore.serverUrl +
            '/custom-icons/' +
            button.icon.replace('custom:', '')
          "
          class="custom-icon"
          alt="icon"
        />
        <Icon
          v-else-if="button.icon.startsWith('mdi:')"
          :icon="button.icon"
          class="mdi-icon"
        />
        <i
          v-else-if="
            button.icon.startsWith('pi ') || button.icon.startsWith('fa')
          "
          :class="button.icon"
        ></i>
        <span v-else>{{ button.icon }}</span>
      </div>
      <div class="button-label">{{ button.label }}</div>
      <div class="button-type">{{ button.action.type }}</div>
    </div>
    <div v-else-if="isLoading" class="skeleton-content" aria-hidden="true">
      <div class="skeleton-icon"></div>
      <div class="skeleton-label"></div>
    </div>
    <div v-else class="empty-content">
      <span class="plus-icon">+</span>
      <span class="empty-text">Agregar</span>
    </div>

    <!-- Feedback de ejecución -->
    <div v-if="status" class="status-overlay" aria-hidden="true">
      <span v-if="status === 'running'" class="status-spinner"></span>
      <span v-else-if="status === 'success'" class="status-mark">✓</span>
      <span v-else class="status-mark">✕</span>
    </div>
  </div>
</template>

<style scoped>
.stream-button {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  aspect-ratio: 1;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  transform-style: preserve-3d;

  /* ⭐ Evita que touch se quede pegado */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;

  background: linear-gradient(
    145deg,
    rgba(40, 40, 60, 0.15) 0%,
    rgba(25, 25, 40, 0.2) 50%,
    rgba(20, 20, 35, 0.25) 100%
  );
  backdrop-filter: blur(40px) saturate(200%);
  border: 2px solid rgba(255, 255, 255, 0.25);
  border-right-width: 3px;
  border-bottom-width: 3px;
  border-right-color: rgba(255, 255, 255, 0.15);
  border-bottom-color: rgba(0, 0, 0, 0.4);

  box-shadow:
    /* ── Base neutra: separa el recuadro del fondo aunque el acento sea negro;
       sobre ella se suma el glow del color ── */
    0 0 0 1px rgba(255, 255, 255, 0.18),
    0 0 12px 2px rgba(255, 255, 255, 0.07),
    /* ── Glow neón derivado del color del botón (transparente si vacío) ── */
    0 0 0 1px color-mix(in srgb, var(--glow, transparent) 70%, transparent),
    0 0 14px 1px color-mix(in srgb, var(--glow, transparent) 55%, transparent),
    0 0 28px 4px color-mix(in srgb, var(--glow, transparent) 35%, transparent),
    /* ── Profundidad ── */
    0 16px 32px rgba(0, 0, 0, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 3px 6px rgba(255, 255, 255, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.4),
    inset 0 0 0 3px color-mix(in srgb, var(--glow, transparent) 40%, transparent);

  transform: translateZ(30px);
}

/* Recuadro oscuro con marco de acento (estilo tablet): el color va en el
   borde y el glow, no en el relleno; el icono queda dentro. */
.stream-button:not(.empty) {
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--glow, transparent) 14%, #22222c) 0%,
    #15151c 100%
  );
  backdrop-filter: none;
  border: 1.5px solid
    color-mix(in srgb, var(--glow, transparent) 55%, rgba(255, 255, 255, 0.45));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--glow, transparent) 70%, transparent),
    0 0 14px 1px color-mix(in srgb, var(--glow, transparent) 55%, transparent),
    0 0 28px 4px color-mix(in srgb, var(--glow, transparent) 35%, transparent),
    0 16px 32px rgba(0, 0, 0, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.15),
    inset 0 -3px 6px rgba(0, 0, 0, 0.5),
    inset 0 0 0 3px color-mix(in srgb, var(--glow, transparent) 40%, transparent);
}

/* Halo más intenso al pasar el cursor / pulsar */
.stream-button:not(.empty)::before {
  background:
    linear-gradient(
      to bottom,
      rgba(255, 255, 255, 0.35) 0%,
      rgba(255, 255, 255, 0.12) 15%,
      rgba(255, 255, 255, 0.03) 40%,
      transparent 55%,
      rgba(0, 0, 0, 0.15) 100%
    );
}

.stream-button:not(.empty):hover {
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--glow, transparent) 90%, transparent),
    0 0 18px 2px color-mix(in srgb, var(--glow, transparent) 70%, transparent),
    0 0 40px 8px color-mix(in srgb, var(--glow, transparent) 45%, transparent),
    0 16px 32px rgba(0, 0, 0, 0.5),
    inset 0 3px 6px rgba(255, 255, 255, 0.18);
}

.stream-button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(255, 255, 255, 0.15) 30%,
    transparent 60%,
    rgba(0, 0, 0, 0.15) 100%
  );
  pointer-events: none;
  transform: translateZ(1px);
}

.stream-button::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 22px;
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.4),
    rgba(59, 130, 246, 0.4)
  );
  opacity: 0;
  transition: opacity 0.4s ease;
  z-index: -1;
  filter: blur(16px);
}

/* ⭐ Hover solo en dispositivos con hover real (desktop) */
@media (hover: hover) and (pointer: fine) {
  .stream-button:hover {
    transform: rotateY(-3deg) translateZ(35px) translateY(-2px);
    border-right-width: 3px;
    border-bottom-width: 3px;
    box-shadow:
      12px 0 24px rgba(0, 0, 0, 0.5),
      0 16px 32px rgba(0, 0, 0, 0.4),
      0 6px 12px rgba(0, 0, 0, 0.3),
      inset 0 3px 6px rgba(255, 255, 255, 0.15),
      inset 0 -3px 6px rgba(0, 0, 0, 0.4),
      inset -3px 0 6px rgba(0, 0, 0, 0.25);
  }

  .stream-button:hover::before {
    opacity: 1;
  }

  .stream-button:hover::after {
    opacity: 0.7;
  }

  .stream-button.empty:hover {
    background: linear-gradient(
      145deg,
      rgba(40, 40, 60, 0.25) 0%,
      rgba(30, 30, 50, 0.3) 50%,
      rgba(25, 25, 45, 0.35) 100%
    );
    border-color: rgba(255, 255, 255, 0.2);
    transform: perspective(1000px) rotateY(-2deg) translateZ(20px)
      translateY(-1px);
    box-shadow:
      6px 0 12px rgba(0, 0, 0, 0.3),
      0 8px 16px rgba(0, 0, 0, 0.2),
      inset 0 2px 3px rgba(255, 255, 255, 0.08),
      inset -2px 0 3px rgba(0, 0, 0, 0.2);
  }
}

/* ⭐ Active con transición rápida para evitar stuck */
.stream-button:active {
  transform: perspective(1000px) rotateY(-1deg) translateZ(10px) translateY(1px);
  transition: all 0.1s ease-out;
  box-shadow:
    4px 0 8px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 3px rgba(255, 255, 255, 0.08),
    inset 0 -1px 3px rgba(0, 0, 0, 0.5),
    inset -1px 0 3px rgba(0, 0, 0, 0.3);
}

/* Desactivar :active pegado en dispositivos táctiles */
@media (hover: none) and (pointer: coarse) {
  .stream-button:active {
    transform: none !important;
    box-shadow: inherit !important;
    transition: none !important;
  }
}

.stream-button.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: perspective(1000px) rotateY(0deg) translateZ(5px) scale(0.95);
  box-shadow:
    2px 0 4px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.15);
}

.stream-button.drag-over {
  transform: perspective(1000px) rotateY(-4deg) translateZ(45px)
    translateY(-4px);
  border-color: rgba(139, 92, 246, 0.8);
  border-right-color: rgba(139, 92, 246, 0.6);
  border-bottom-color: rgba(139, 92, 246, 0.5);
  box-shadow:
    16px 0 32px rgba(139, 92, 246, 0.4),
    0 20px 40px rgba(139, 92, 246, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.3),
    inset 0 3px 6px rgba(139, 92, 246, 0.2),
    inset 0 -3px 6px rgba(139, 92, 246, 0.3),
    inset -3px 0 6px rgba(139, 92, 246, 0.25);
}

.stream-button.drag-over::before {
  background: linear-gradient(
    145deg,
    rgba(139, 92, 246, 0.35) 0%,
    rgba(139, 92, 246, 0.15) 40%,
    transparent 70%,
    rgba(59, 130, 246, 0.2) 100%
  );
}

.stream-button.selected {
  border-color: rgba(34, 197, 94, 0.8);
  border-right-color: rgba(34, 197, 94, 0.6);
  border-bottom-color: rgba(34, 197, 94, 0.5);
  transform: perspective(1000px) rotateY(-4deg) translateZ(40px) scale(1.05);
  box-shadow:
    14px 0 28px rgba(34, 197, 94, 0.4),
    0 18px 36px rgba(34, 197, 94, 0.3),
    0 6px 12px rgba(0, 0, 0, 0.3),
    inset 0 2px 5px rgba(34, 197, 94, 0.2),
    inset 0 -2px 5px rgba(34, 197, 94, 0.3),
    inset -2px 0 5px rgba(34, 197, 94, 0.25);
  animation: pulse-selected 2s infinite;
}

.stream-button.selected::before {
  background: linear-gradient(
    145deg,
    rgba(34, 197, 94, 0.3) 0%,
    rgba(34, 197, 94, 0.15) 40%,
    transparent 70%,
    rgba(34, 197, 94, 0.2) 100%
  );
}

@keyframes pulse-selected {
  0%,
  100% {
    box-shadow:
      14px 0 28px rgba(34, 197, 94, 0.4),
      0 18px 36px rgba(34, 197, 94, 0.3),
      0 6px 12px rgba(0, 0, 0, 0.3),
      inset 0 2px 5px rgba(34, 197, 94, 0.2),
      inset 0 -2px 5px rgba(34, 197, 94, 0.3),
      inset -2px 0 5px rgba(34, 197, 94, 0.25);
  }
  50% {
    box-shadow:
      18px 0 36px rgba(34, 197, 94, 0.5),
      0 22px 44px rgba(34, 197, 94, 0.4),
      0 8px 16px rgba(0, 0, 0, 0.3),
      inset 0 3px 6px rgba(34, 197, 94, 0.3),
      inset 0 -3px 6px rgba(34, 197, 94, 0.4),
      inset -3px 0 6px rgba(34, 197, 94, 0.35);
  }
}

.stream-button.drag-over::after {
  opacity: 1;
  filter: blur(24px);
}

.stream-button:not(.empty):not(.dragging) {
  cursor: grab;
}

.stream-button.empty {
  background: linear-gradient(
    145deg,
    rgba(30, 30, 46, 0.15) 0%,
    rgba(25, 25, 40, 0.2) 50%,
    rgba(20, 20, 35, 0.25) 100%
  );
  backdrop-filter: blur(10px);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-right-color: rgba(255, 255, 255, 0.05);
  border-bottom-color: rgba(0, 0, 0, 0.15);
  box-shadow:
    4px 0 8px rgba(0, 0, 0, 0.2),
    0 6px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.05),
    inset -1px 0 2px rgba(0, 0, 0, 0.15);
}

.stream-button.empty::before {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.03) 40%,
    transparent 70%
  );
}

.button-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
  width: 100%;
  position: relative;
  z-index: 1;
}

.button-icon {
  font-size: 3.6rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  margin-bottom: 0;
}

.custom-icon {
  width: 3.6rem;
  height: 3.6rem;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.mdi-icon {
  width: 3.6rem;
  height: 3.6rem;
}

.button-label {
  font-weight: 700;
  font-size: 0.85rem;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  min-height: 2em;
}

.button-type {
  font-size: 0.6rem;
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 600;
  margin-top: auto;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.4;
  position: relative;
  z-index: 1;
}

.plus-icon {
  font-size: 2.5rem;
  font-weight: 200;
  opacity: 0.6;
}
.empty-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

::-webkit-scrollbar {
  width: 0px;
}

/* Solo ícono, sin texto — como un Stream Deck real. */
.button-content {
  justify-content: center;
  height: 100%;
  gap: 0;
}
.button-icon {
  margin-bottom: 0;
}
.button-label,
.button-type {
  display: none;
}

/* ─── Feedback de ejecución ─────────────────────────────── */
.status-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  pointer-events: none;
  z-index: 3;
  animation: status-in 0.15s ease;
}

@keyframes status-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Velo tenue para que el icono de estado se lea sobre cualquier color */
.status-running .status-overlay {
  background: rgba(0, 0, 0, 0.28);
}
.status-success .status-overlay {
  background: rgba(34, 197, 94, 0.35);
}
.status-error .status-overlay {
  background: rgba(239, 68, 68, 0.35);
}

.status-spinner {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: status-spin 0.7s linear infinite;
}

@keyframes status-spin {
  to {
    transform: rotate(360deg);
  }
}

.status-mark {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  animation: status-pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes status-pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Sacudida corta al fallar, refuerza el mensaje de error */
.status-error {
  animation: status-shake 0.35s ease;
}

@keyframes status-shake {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-4px);
  }
  75% {
    transform: translateX(4px);
  }
}

/* ─── Skeleton de carga inicial ──────────────────────────── */
.skeleton-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  height: 100%;
}

.skeleton-icon,
.skeleton-label {
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.18) 25%,
    rgba(148, 163, 184, 0.32) 50%,
    rgba(148, 163, 184, 0.18) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
  border-radius: 8px;
}

.skeleton-icon {
  width: 34%;
  aspect-ratio: 1;
  border-radius: 12px;
}

.skeleton-label {
  width: 60%;
  height: 9px;
}

@keyframes skeleton-shimmer {
  from {
    background-position: 200% 0;
  }
  to {
    background-position: -200% 0;
  }
}

/* Respeta a quien prefiere menos movimiento */
@media (prefers-reduced-motion: reduce) {
  .status-spinner {
    animation-duration: 1.6s;
  }
  .status-mark,
  .status-overlay,
  .status-error {
    animation: none;
  }
  .skeleton-icon,
  .skeleton-label {
    animation: none;
  }
}

</style>
