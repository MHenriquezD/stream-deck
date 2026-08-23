<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useServerUrlStore } from '../store/serverUrl.store'
import PickerModal from './PickerModal.vue'

interface MultimediaPreset {
  id: string
  label: string
  icon: string
  payload: string
  description: string
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  select: [preset: MultimediaPreset]
  close: []
}>()

const serverUrlStore = useServerUrlStore()
const { getAuthHeaders } = useAuth()
const API_URL = serverUrlStore.serverUrl

const presets = ref<MultimediaPreset[]>([])
const loading = ref(false)
const searchQuery = ref('')

watch(
  () => props.show,
  async (newVal) => {
    if (newVal && presets.value.length === 0) await loadPresets()
  },
)

const loadPresets = async () => {
  loading.value = true
  try {
    const response = await fetch(`${API_URL}/command/presets/multimedia`, {
      headers: { ...getAuthHeaders() },
    })
    if (response.ok) {
      presets.value = await response.json()
    }
  } catch (error) {
    console.error('Error loading multimedia presets:', error)
  } finally {
    loading.value = false
  }
}

const filteredPresets = computed(() => {
  if (!searchQuery.value.trim()) return presets.value
  const query = searchQuery.value.toLowerCase()
  return presets.value.filter(
    (p) =>
      p.label.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query),
  )
})
</script>

<template>
  <PickerModal :show="show" title="Comandos Multimedia" :max-width="600" :height="580" @close="emit('close')">
    <div class="picker-body">
      <div class="picker-search">
        <Icon icon="mdi:magnify" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Buscar..." class="field" />
      </div>

      <div class="picker-scroll">
        <div v-if="loading" class="empty-state">
          <Icon icon="mdi:loading" class="mdi-spin" style="font-size: 2rem; opacity: 0.5" />
          <p>Cargando...</p>
        </div>
        <div v-else-if="filteredPresets.length === 0" class="empty-state">
          <Icon icon="mdi:volume-off" style="font-size: 2rem; opacity: 0.3" />
          <p>No se encontraron comandos</p>
        </div>
        <div v-else class="items-grid">
          <button
            v-for="preset in filteredPresets"
            :key="preset.id"
            type="button"
            class="grid-item"
            @click="emit('select', preset)"
          >
            <div class="grid-icon"><Icon :icon="preset.icon" /></div>
            <div class="item-info">
              <div class="item-label">{{ preset.label }}</div>
              <div class="item-desc">{{ preset.description }}</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  </PickerModal>
</template>

<style scoped>
.picker-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 22px;
  border-bottom: 1px solid var(--glass-border);
}
.search-icon { color: var(--text-2); font-size: 1rem; }
.field {
  flex: 1;
  padding: 11px 14px;
  background: var(--field-bg);
  border: 1px solid var(--field-border);
  border-radius: 10px;
  color: var(--text-1);
  font-size: 0.95rem;
  font-family: inherit;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.field:focus {
  outline: none;
  border-color: var(--field-focus);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.picker-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 22px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.grid-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text-1);
  transition: all 0.15s;
}
@media (hover: hover) {
  .grid-item:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(3px);
  }
}

.grid-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  display: grid; place-items: center;
  font-size: 1.4rem; flex-shrink: 0;
}
.item-info { flex: 1; min-width: 0; }
.item-label { font-weight: 600; font-size: 0.9rem; margin-bottom: 2px; }
.item-desc { font-size: 0.78rem; color: var(--text-2); }

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 50px 20px;
  color: var(--text-2);
  text-align: center;
}
.empty-state p { margin-top: 12px; }

.picker-scroll::-webkit-scrollbar { width: 4px; }
.picker-scroll::-webkit-scrollbar-track { background: transparent; }
.picker-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

[data-theme='light'] .picker-search { border-bottom-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .field:focus { background: rgba(0, 0, 0, 0.02); }
[data-theme='light'] .grid-item { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.07); }
[data-theme='light'] .grid-item:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
[data-theme='light'] .picker-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); }
</style>
