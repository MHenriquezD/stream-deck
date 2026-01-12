<script setup lang="ts">
import type { StreamButton } from '@shared/core';
import { computed } from 'vue';

const props = defineProps<{
  button: StreamButton | null
  isEmpty?: boolean
  isDragging?: boolean
  isDragOver?: boolean
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

const buttonStyle = computed(() => {
  if (!props.button) return {}
  return {
    backgroundColor: props.button.backgroundColor || '#2c3e50',
    color: props.button.color || '#ffffff',
  }
})

const handleClick = () => {
  emit('click', props.button)
}

const handleEdit = (e: MouseEvent) => {
  e.stopPropagation()
  emit('edit', props.button)
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
    }"
    :style="buttonStyle"
    :draggable="!!button"
    @click="handleClick"
    @contextmenu.prevent="handleEdit"
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
          :src="'/icons/' + button.icon.replace('svg:', '')"
          class="custom-icon"
          alt="icon"
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
    <div v-else class="empty-content">
      <span class="plus-icon">+</span>
      <span class="empty-text">Agregar</span>
    </div>
  </div>
</template>

<style scoped>
.stream-button {
  aspect-ratio: 1;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: visible;
  transform-style: preserve-3d;
  
  /* Vista lateral 3D con perspectiva - botón transparente que sobresale */
  background: linear-gradient(
    145deg,
    rgba(40, 40, 60, 0.3) 0%,
    rgba(25, 25, 40, 0.4) 50%,
    rgba(20, 20, 35, 0.5) 100%
  );
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-right-width: 2px;
  border-bottom-width: 2px;
  border-right-color: rgba(255, 255, 255, 0.08);
  border-bottom-color: rgba(0, 0, 0, 0.3);
  
  /* Sombra multi-capa para profundidad 3D */
  box-shadow: 
    /* Sombra lateral derecha (profundidad) */
    8px 0 16px rgba(0, 0, 0, 0.4),
    /* Sombra inferior (altura) */
    0 12px 24px rgba(0, 0, 0, 0.3),
    /* Sombra suave general */
    0 4px 8px rgba(0, 0, 0, 0.2),
    /* Luz superior interna */
    inset 0 2px 4px rgba(255, 255, 255, 0.1),
    /* Sombra inferior interna */
    inset 0 -2px 4px rgba(0, 0, 0, 0.3),
    /* Borde lateral interno */
    inset -2px 0 4px rgba(0, 0, 0, 0.2);
    
  /* Transformación 3D para vista lateral */
  transform: perspective(1000px) rotateY(-2deg) translateZ(20px);
}

/* Tema Claro */
:global([data-theme='light']) .stream-button {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.5) 0%,
    rgba(245, 245, 250, 0.6) 50%,
    rgba(240, 240, 245, 0.7) 100%
  );
  border-color: rgba(0, 0, 0, 0.1);
  border-right-color: rgba(0, 0, 0, 0.15);
  border-bottom-color: rgba(0, 0, 0, 0.2);
  
  box-shadow: 
    8px 0 16px rgba(0, 0, 0, 0.15),
    0 12px 24px rgba(0, 0, 0, 0.1),
    0 4px 8px rgba(0, 0, 0, 0.08),
    inset 0 2px 4px rgba(255, 255, 255, 0.9),
    inset 0 -2px 4px rgba(0, 0, 0, 0.05),
    inset -2px 0 4px rgba(0, 0, 0, 0.08);
}

/* Capa de brillo superior - efecto de cristal */
.stream-button::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(255, 255, 255, 0.08) 30%,
    transparent 60%,
    rgba(0, 0, 0, 0.1) 100%
  );
  pointer-events: none;
  transform: translateZ(1px);
}

:global([data-theme='light']) .stream-button::before {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.4) 30%,
    transparent 60%,
    rgba(0, 0, 0, 0.05) 100%
  );
}

/* Resplandor exterior para hover */
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

/* Hover - el botón sobresale más */
.stream-button:hover {
  transform: perspective(1000px) rotateY(-3deg) translateZ(35px) translateY(-2px);
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

:global([data-theme='light']) .stream-button:hover {
  box-shadow: 
    12px 0 24px rgba(0, 0, 0, 0.2),
    0 16px 32px rgba(0, 0, 0, 0.15),
    0 6px 12px rgba(0, 0, 0, 0.12),
    inset 0 3px 6px rgba(255, 255, 255, 1),
    inset 0 -3px 6px rgba(0, 0, 0, 0.08),
    inset -3px 0 6px rgba(0, 0, 0, 0.1);
}

.stream-button:hover::before {
  opacity: 1;
}

.stream-button:hover::after {
  opacity: 0.7;
}

/* Active - botón presionado hacia adentro */
.stream-button:active {
  transform: perspective(1000px) rotateY(-1deg) translateZ(10px) translateY(1px);
  
  box-shadow: 
    4px 0 8px rgba(0, 0, 0, 0.3),
    0 4px 12px rgba(0, 0, 0, 0.2),
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 3px rgba(255, 255, 255, 0.08),
    inset 0 -1px 3px rgba(0, 0, 0, 0.5),
    inset -1px 0 3px rgba(0, 0, 0, 0.3);
}

:global([data-theme='light']) .stream-button:active {
  box-shadow: 
    4px 0 8px rgba(0, 0, 0, 0.12),
    0 4px 12px rgba(0, 0, 0, 0.1),
    0 2px 4px rgba(0, 0, 0, 0.08),
    inset 0 1px 3px rgba(255, 255, 255, 0.7),
    inset 0 -1px 3px rgba(0, 0, 0, 0.12),
    inset -1px 0 3px rgba(0, 0, 0, 0.15);
}

/* Dragging - botón se aplana y pierde profundidad */
.stream-button.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: perspective(1000px) rotateY(0deg) translateZ(5px) scale(0.95);
  box-shadow: 
    2px 0 4px rgba(0, 0, 0, 0.2),
    0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Drag Over - área de destino resaltada con más profundidad */
.stream-button.drag-over {
  transform: perspective(1000px) rotateY(-4deg) translateZ(45px) translateY(-4px);
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

.stream-button.drag-over::after {
  opacity: 1;
  filter: blur(24px);
}

.stream-button:not(.empty):not(.dragging) {
  cursor: grab;
}

/* Botones vacíos - más planos, menos profundidad */
.stream-button.empty {
  background: linear-gradient(
    145deg,
    rgba(30, 30, 46, 0.15) 0%,
    rgba(25, 25, 40, 0.2) 50%,
    rgba(20, 20, 35, 0.25) 100%
  );
  backdrop-filter: blur(10px);
  border: 2px dashed rgba(255, 255, 255, 0.12);
  border-right-color: rgba(255, 255, 255, 0.08);
  border-bottom-color: rgba(0, 0, 0, 0.2);
  
  box-shadow: 
    4px 0 8px rgba(0, 0, 0, 0.2),
    0 6px 12px rgba(0, 0, 0, 0.15),
    inset 0 1px 2px rgba(255, 255, 255, 0.05),
    inset -1px 0 2px rgba(0, 0, 0, 0.15);
    
  transform: perspective(1000px) rotateY(-1deg) translateZ(10px);
}

:global([data-theme='light']) .stream-button.empty {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.25) 0%,
    rgba(245, 245, 250, 0.35) 50%,
    rgba(240, 240, 245, 0.4) 100%
  );
  border-color: rgba(0, 0, 0, 0.12);
  border-right-color: rgba(0, 0, 0, 0.15);
  border-bottom-color: rgba(0, 0, 0, 0.18);
  
  box-shadow: 
    4px 0 8px rgba(0, 0, 0, 0.08),
    0 6px 12px rgba(0, 0, 0, 0.06),
    inset 0 1px 2px rgba(255, 255, 255, 0.5),
    inset -1px 0 2px rgba(0, 0, 0, 0.08);
}

.stream-button.empty::before {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.1) 0%,
    rgba(255, 255, 255, 0.03) 40%,
    transparent 70%
  );
}

:global([data-theme='light']) .stream-button.empty::before {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.3) 40%,
    transparent 70%
  );
}

.stream-button.empty:hover {
  background: linear-gradient(
    145deg,
    rgba(40, 40, 60, 0.25) 0%,
    rgba(30, 30, 50, 0.3) 50%,
    rgba(25, 25, 45, 0.35) 100%
  );
  border-color: rgba(255, 255, 255, 0.2);
  transform: perspective(1000px) rotateY(-2deg) translateZ(20px) translateY(-1px);
  
  box-shadow: 
    6px 0 12px rgba(0, 0, 0, 0.3),
    0 8px 16px rgba(0, 0, 0, 0.2),
    inset 0 2px 3px rgba(255, 255, 255, 0.08),
    inset -2px 0 3px rgba(0, 0, 0, 0.2);
}

:global([data-theme='light']) .stream-button.empty:hover {
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.4) 0%,
    rgba(245, 245, 250, 0.5) 50%,
    rgba(240, 240, 245, 0.55) 100%
  );
  border-color: rgba(0, 0, 0, 0.18);
  
  box-shadow: 
    6px 0 12px rgba(0, 0, 0, 0.12),
    0 8px 16px rgba(0, 0, 0, 0.08),
    inset 0 2px 3px rgba(255, 255, 255, 0.8),
    inset -2px 0 3px rgba(0, 0, 0, 0.1);
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
  font-size: 3rem;
  line-height: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  margin-bottom: 4px;
}

.custom-icon {
  width: 3rem;
  height: 3rem;
  object-fit: contain;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.button-label {
  font-weight: 700;
  font-size: 0.85rem;
  word-break: break-word;
  max-width: 100%;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  letter-spacing: 0.3px;
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

:global([data-theme='light']) .empty-content {
  opacity: 0.5;
}

.plus-icon {
  font-size: 2.5rem;
  font-weight: 200;
  opacity: 0.6;
}

:global([data-theme='light']) .plus-icon {
  opacity: 0.7;
}

.empty-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.empty-text {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
</style>
