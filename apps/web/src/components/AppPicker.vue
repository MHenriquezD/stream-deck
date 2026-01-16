<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useServerUrlStore } from '../store/serverUrl.store'

interface InstalledApp {
  Name: string
  Icon: string
  Path: string
}

const props = defineProps<{
  show: boolean
  currentApp?: string
}>()

const emit = defineEmits<{
  select: [app: string]
  close: []
}>()

const searchQuery = ref('')
const apps = ref<InstalledApp[]>([])
const loading = ref(false)

const serverUrlStore = useServerUrlStore()
const API_URL = serverUrlStore.serverUrl

watch(
  () => props.show,
  (newVal) => {
    if (newVal && apps.value.length === 0) {
      loadApps()
    }
  }
)

const loadApps = async () => {
  loading.value = true
  try {
    const response = await fetch(`${API_URL}/command/installed-apps`)
    if (response.ok) {
      const data = await response.json()
      if (data.success && Array.isArray(data.apps)) {
        apps.value = data.apps
      }
    }
  } catch (error) {
    console.error('Error loading apps:', error)
  } finally {
    loading.value = false
  }
}

const filteredApps = computed(() => {
  if (!searchQuery.value.trim()) {
    return apps.value
  }

  const query = searchQuery.value.toLowerCase()
  return apps.value.filter(
    (app) =>
      app.Name.toLowerCase().includes(query) ||
      (app.Path && app.Path.toLowerCase().includes(query))
  )
})

const selectApp = (app: InstalledApp) => {
  let command = ''

  if (app.Path) {
    // Si el path contiene .exe, es un ejecutable directo
    if (app.Path.toLowerCase().includes('.exe')) {
      // Si tiene espacios, agregar comillas
      if (app.Path.includes(' ')) {
        command = `"${app.Path}"`
      } else {
        command = app.Path
      }
    }
    // Si ya contiene comillas y argumentos (PWAs), usar tal cual
    else if (app.Path.includes('"')) {
      command = app.Path
    }
    // Si es un directorio, intentar lanzarlo con start
    else {
      command = `start "" "${app.Path}"`
    }
  } else {
    // Sin path, intentar lanzar con start usando el nombre
    let cleanName = app.Name.replace(/\s*\d+(\.\d+)*\s*/g, '') // Eliminar versiones
      .replace(/Microsoft\s*/gi, '') // Eliminar "Microsoft"
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')

    command = `start ${cleanName}`
  }

  console.log('Emitting app command:', command)
  emit('select', command)
}
</script>

<template>
  <div v-if="show" class="app-picker-overlay" @click="emit('close')">
    <div class="app-picker" @click.stop>
      <div class="picker-header">
        <h3>Aplicaciones Instaladas</h3>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>

      <div class="picker-search">
        <i class="pi pi-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar aplicación..."
          class="search-input"
        />
      </div>

      <div class="picker-content">
        <div v-if="loading" class="loading-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
          <p>Cargando aplicaciones instaladas...</p>
        </div>

        <div v-else-if="filteredApps.length === 0" class="no-results">
          <i class="pi pi-search" style="font-size: 2rem; opacity: 0.3"></i>
          <p v-if="searchQuery">No se encontraron aplicaciones</p>
          <p v-else>No se detectaron aplicaciones instaladas</p>
        </div>

        <div v-else class="apps-list">
          <button
            v-for="app in filteredApps"
            :key="app.Name"
            class="app-item"
            :class="{
              active: currentApp === app.Path || currentApp === app.Name,
            }"
            @click.stop="selectApp(app)"
            type="button"
          >
            <div class="app-info">
              <div class="app-name">{{ app.Name }}</div>
              <div v-if="app.Path" class="app-path">{{ app.Path }}</div>
            </div>
          </button>
        </div>
      </div>

      <div class="picker-footer">
        <p class="hint">
          💡 Selecciona una aplicación para configurar su ruta automáticamente
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

.app-picker {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
  overflow: hidden;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.picker-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #fff;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.picker-search {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
}

.picker-search i {
  color: rgba(255, 255, 255, 0.5);
  font-size: 1.1rem;
}

.search-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  color: #fff;
  font-size: 0.95rem;
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(139, 92, 246, 0.5);
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.loading-state,
.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
}

.loading-state p,
.no-results p {
  margin-top: 12px;
  font-size: 1rem;
}

.apps-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 14px 16px;
  text-align: left;
}

.app-item:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateX(4px);
}

.app-item.active {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

.app-info {
  flex: 1;
}

.app-name {
  font-weight: 600;
  font-size: 1rem;
  color: #fff;
  margin-bottom: 4px;
}

.app-path {
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  color: rgba(139, 92, 246, 0.8);
  background: rgba(139, 92, 246, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-footer {
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.6);
  text-align: center;
}

::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
