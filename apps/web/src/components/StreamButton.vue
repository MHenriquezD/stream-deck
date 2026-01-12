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
      'drag-over': isDragOver
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
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px 12px;
  transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  
  /* Efecto de marco físico del Stream Deck */
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  box-shadow: 
    inset 0 0 0 3px #0a0a0a,
    inset 0 2px 4px rgba(0, 0, 0, 0.5),
    0 4px 8px rgba(0, 0, 0, 0.4);
}

.stream-button::before {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 4px;
  background: inherit;
  box-shadow: 
    inset 0 1px 2px rgba(255, 255, 255, 0.1),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5);
}

.stream-button::after {
  content: '';
  position: absolute;
  inset: 4px;
  border-radius: 4px;
  background: radial-gradient(ellipse at top, rgba(255, 255, 255, 0.05), transparent);
  pointer-events: none;
}

.stream-button:hover {
  transform: translateY(-1px);
  box-shadow: 
    inset 0 0 0 3px #0a0a0a,
    inset 0 2px 4px rgba(0, 0, 0, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.5);
}

.stream-button:hover::before {
  box-shadow: 
    inset 0 1px 3px rgba(255, 255, 255, 0.15),
    inset 0 -1px 2px rgba(0, 0, 0, 0.5);
}

.stream-button:active {
  transform: translateY(1px) scale(0.98);
  box-shadow: 
    inset 0 0 0 3px #0a0a0a,
    inset 0 3px 6px rgba(0, 0, 0, 0.6),
    0 2px 4px rgba(0, 0, 0, 0.3);
}

.stream-button.dragging {
  opacity: 0.5;
  cursor: grabbing;
  transform: scale(0.95);
}

.stream-button.drag-over {
  transform: scale(1.05);
  box-shadow: 
    inset 0 0 0 3px #8b5cf6,
    inset 0 2px 4px rgba(0, 0, 0, 0.5),
    0 0 20px rgba(139, 92, 246, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.5);
}

.stream-button.drag-over::before {
  border: 2px dashed #8b5cf6;
}

.stream-button:not(.empty):not(.dragging) {
  cursor: grab;
}

.stream-button.empty {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
}

.stream-button.empty::before {
  background: rgba(30, 30, 30, 0.8);
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.stream-button.empty:hover::before {
  background: rgba(40, 40, 40, 0.9);
  border-color: rgba(255, 255, 255, 0.3);
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
</style>
