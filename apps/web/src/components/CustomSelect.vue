<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Option {
  label: string
  value: string | number
}

const props = defineProps<{
  options: Option[]
  modelValue: string | number
  placeholder?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string | number]
}>()

const open = ref(false)
const el = ref<HTMLElement | null>(null)

const selected = computed(() =>
  props.options.find(o => String(o.value) === String(props.modelValue))
)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function select(opt: Option) {
  emit('update:modelValue', opt.value)
  open.value = false
}

function onClickOutside(e: PointerEvent) {
  if (el.value && !el.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('pointerdown', onClickOutside, true))
onUnmounted(() => document.removeEventListener('pointerdown', onClickOutside, true))
</script>

<template>
  <div ref="el" class="custom-select" :class="{ open, disabled }">
    <button type="button" class="cs-trigger" :disabled="disabled" @click="toggle">
      <span class="cs-label">{{ selected?.label || placeholder || 'Seleccionar' }}</span>
      <svg class="cs-chevron" viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd"/>
      </svg>
    </button>
    <Transition name="cs-drop">
      <ul v-if="open" class="cs-dropdown">
        <li
          v-for="opt in options"
          :key="opt.value"
          class="cs-option"
          :class="{ active: String(opt.value) === String(modelValue) }"
          @click="select(opt)"
        >
          {{ opt.label }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 100%;
}

.custom-select.disabled .cs-trigger {
  opacity: 0.5;
  cursor: not-allowed;
}

.cs-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 14px;
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  border-radius: 10px;
  color: var(--text-1);
  font-size: 0.95rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}

.open .cs-trigger {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.cs-chevron {
  flex-shrink: 0;
  opacity: 0.5;
  transition: transform 0.2s;
}

.open .cs-chevron {
  transform: rotate(180deg);
}

.cs-dropdown {
  position: absolute;
  z-index: 100;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: rgba(22, 22, 32, 0.97);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  backdrop-filter: blur(20px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
}

.cs-option {
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 0.9rem;
  color: var(--text-1);
  cursor: pointer;
  transition: background 0.12s;
}

.cs-option:hover {
  background: rgba(255, 255, 255, 0.08);
}

.cs-option.active {
  background: color-mix(in srgb, var(--accent) 20%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.cs-dropdown::-webkit-scrollbar { width: 4px; }
.cs-dropdown::-webkit-scrollbar-track { background: transparent; }
.cs-dropdown::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

/* Transitions */
.cs-drop-enter-active { transition: opacity 0.15s, transform 0.15s; }
.cs-drop-leave-active { transition: opacity 0.1s, transform 0.1s; }
.cs-drop-enter-from, .cs-drop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Light theme */
[data-theme='light'] .cs-dropdown {
  background: rgba(235, 237, 245, 0.98);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .cs-option:hover {
  background: rgba(0, 0, 0, 0.05);
}

[data-theme='light'] .cs-option.active {
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

[data-theme='light'] .cs-trigger {
  background: rgba(0, 0, 0, 0.03);
  border-color: rgba(0, 0, 0, 0.12);
}

[data-theme='light'] .cs-dropdown::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
}
</style>
