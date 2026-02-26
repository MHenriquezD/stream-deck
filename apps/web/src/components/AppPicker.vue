<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
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
  select: [data: { command: string; icon?: string; name?: string }]
  close: []
}>()

const searchQuery = ref('')
const apps = ref<InstalledApp[]>([])
const loading = ref(false)
const showScanWarning = ref(false)
const scannedAt = ref<string | null>(null)
const isRescan = ref(false)

const serverUrlStore = useServerUrlStore()
const { getAuthHeaders } = useAuth()
const API_URL = serverUrlStore.serverUrl

watch(
  () => props.show,
  async (newVal) => {
    if (newVal && apps.value.length === 0) {
      // Check if cache exists first
      await checkCacheAndLoad()
    }
  },
)

/** Check if server has cached apps. If yes, load from cache. If no, show warning. */
const checkCacheAndLoad = async () => {
  try {
    const response = await fetch(
      `${API_URL}/command/installed-apps/cache-status`,
      { headers: { ...getAuthHeaders() } },
    )
    if (response.ok) {
      const data = await response.json()
      if (data.hasCache) {
        // Cache exists — load directly without warning
        await loadApps(false)
        return
      }
    }
  } catch {
    // ignore
  }
  // No cache — show scan warning
  isRescan.value = false
  showScanWarning.value = true
}

/** Confirm scan and load apps */
const confirmScan = async () => {
  showScanWarning.value = false
  await loadApps(isRescan.value)
}

const cancelScan = () => {
  showScanWarning.value = false
  if (apps.value.length === 0) {
    emit('close')
  }
}

const requestRescan = () => {
  isRescan.value = true
  showScanWarning.value = true
}

const loadApps = async (forceRescan = false) => {
  loading.value = true
  try {
    const url = forceRescan
      ? `${API_URL}/command/installed-apps/rescan`
      : `${API_URL}/command/installed-apps`
    const options: RequestInit = {
      headers: { ...getAuthHeaders() },
      ...(forceRescan ? { method: 'POST' } : {}),
    }
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.json()
      if (data.success && Array.isArray(data.apps)) {
        apps.value = data.apps
        scannedAt.value = data.scannedAt || null
      }
    }
  } catch (error) {
    console.error('Error loading apps:', error)
  } finally {
    loading.value = false
  }
}

const formattedScannedAt = computed(() => {
  if (!scannedAt.value) return null
  try {
    return new Date(scannedAt.value).toLocaleString()
  } catch {
    return null
  }
})

const filteredApps = computed(() => {
  if (!searchQuery.value.trim()) {
    return apps.value
  }

  const query = searchQuery.value.toLowerCase()
  return apps.value.filter(
    (app) =>
      app.Name.toLowerCase().includes(query) ||
      (app.Path && app.Path.toLowerCase().includes(query)),
  )
})

const selectApp = (app: InstalledApp) => {
  let command = ''

  if (app.Path) {
    // 1️⃣ Si ya es un comando con comillas/argumentos (PWA), usar TAL CUAL
    if (app.Path.includes('"')) {
      command = app.Path
    }
    // 2️⃣ Ejecutable directo
    else if (app.Path.toLowerCase().endsWith('.exe')) {
      command = app.Path.includes(' ') ? `"${app.Path}"` : app.Path
    }
    // 3️⃣ Directorio → start
    else {
      command = `start "" "${app.Path}"`
    }
  } else {
    // 4️⃣ Fallback por nombre
    let cleanName = app.Name.replace(/\s*\d+(\.\d+)*\s*/g, '')
      .replace(/Microsoft\s*/gi, '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')

    command = `start ${cleanName}`
  }

  // Determine icon URL (if extracted icon exists, use it)
  const icon =
    app.Icon && app.Icon.startsWith('/app-icons/') ? app.Icon : undefined

  console.log('Emitting app command:', command, 'icon:', icon)
  emit('select', { command, icon, name: app.Name })
}
</script>

<template>
  <div v-if="show" class="app-picker-overlay" @click="emit('close')">
    <div class="app-picker" @click.stop>
      <div class="picker-header">
        <h3>Aplicaciones Instaladas</h3>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>

      <!-- Scan warning dialog -->
      <div v-if="showScanWarning" class="scan-warning">
        <div class="scan-warning-icon">🔍</div>
        <h4 v-if="isRescan">Volver a analizar</h4>
        <h4 v-else>Análisis de aplicaciones</h4>
        <p v-if="isRescan">
          Se volverá a analizar tu PC para detectar aplicaciones instaladas.
          Esto puede tardar unos segundos.
        </p>
        <p v-else>
          Se analizará tu PC para detectar las aplicaciones instaladas. Esto
          incluye el registro de Windows, apps de Microsoft Store y PWAs.
          <br /><br />
          <strong>Este proceso puede tardar unos segundos</strong> y los
          resultados se guardarán para no repetir el análisis cada vez.
        </p>
        <div class="scan-warning-actions">
          <button @click="cancelScan" class="scan-btn scan-btn-cancel">
            Cancelar
          </button>
          <button @click="confirmScan" class="scan-btn scan-btn-confirm">
            {{ isRescan ? '🔄 Re-analizar' : '🔍 Analizar' }}
          </button>
        </div>
      </div>

      <!-- Normal content -->
      <template v-else>
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
            <p>Analizando aplicaciones instaladas...</p>
            <p class="loading-hint">Esto puede tardar unos segundos</p>
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
              <img
                v-if="app.Icon && app.Icon.startsWith('/app-icons/')"
                :src="API_URL + app.Icon"
                class="app-icon-img"
                alt=""
                @error="
                  ($event.target as HTMLImageElement).style.display = 'none'
                "
              />
              <div v-else class="app-icon-placeholder">
                <i class="pi pi-box"></i>
              </div>
              <div class="app-info">
                <div class="app-name">{{ app.Name }}</div>
                <div v-if="app.Path" class="app-path">{{ app.Path }}</div>
              </div>
            </button>
          </div>
        </div>

        <div class="picker-footer">
          <div class="footer-row">
            <p class="hint">
              💡 Selecciona una aplicación para configurar su ruta
            </p>
            <button
              @click="requestRescan"
              :disabled="loading"
              class="rescan-btn"
              title="Volver a analizar aplicaciones"
            >
              🔄
            </button>
          </div>
          <p v-if="formattedScannedAt" class="scanned-at">
            Último análisis: {{ formattedScannedAt }}
          </p>
        </div>
      </template>
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
  background: var(--edit-bg-color);
  border-radius: 16px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
  max-height: 85dvh;
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
  color: var(--confirm-text-light);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--edit-bg-color);
  color: var(--confirm-text-light);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

@media (hover: hover) {
  .close-btn:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: rotate(90deg);
  }
}

.picker-search {
  padding: 16px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  gap: 12px;
}

.picker-search i {
  color: var(--edit-text-color);
  font-size: 1.1rem;
}

.search-input {
  flex: 1;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 16px;
  color: var(--edit-text-color);
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
  color: var(--edit-text-color);
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
  gap: 12px;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 14px 16px;
  text-align: left;
}

.app-icon-img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  object-fit: contain;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
}

.app-icon-placeholder {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3);
  font-size: 1.1rem;
}

[data-theme='light'] .app-icon-img {
  background: rgba(0, 0, 0, 0.03);
}

[data-theme='light'] .app-icon-placeholder {
  background: rgba(0, 0, 0, 0.03);
  color: rgba(0, 0, 0, 0.2);
}

@media (hover: hover) {
  .app-item:hover {
    background: var(--app-item-hover-bg);
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateX(4px);
  }
}

.app-item.active {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

.app-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.app-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--edit-text-color);
  margin-bottom: 4px;
}

.app-path {
  font-size: 0.75rem;
  font-family: 'Courier New', monospace;
  color: var(--app-path-color);
  background: var(--form-bg-color);
  padding: 4px 8px;
  border-radius: 4px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-footer {
  padding: 12px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
}

.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--edit-text-color);
}

.scanned-at {
  margin: 4px 0 0;
  font-size: 0.75rem;
  color: var(--credits-color);
  text-align: center;
}

.rescan-btn {
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

@media (hover: hover) {
  .rescan-btn:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: rotate(180deg);
  }
}

.rescan-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Scan warning */
.scan-warning {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 40px 32px;
  gap: 8px;
}

.scan-warning-icon {
  font-size: 3rem;
  margin-bottom: 8px;
}

.scan-warning h4 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--confirm-text-light);
}

.scan-warning p {
  margin: 0;
  font-size: 0.95rem;
  color: var(--edit-text-color);
  line-height: 1.6;
  max-width: 420px;
}

.scan-warning-actions {
  display: flex;
  gap: 16px;
  margin-top: 20px;
}

.scan-btn {
  padding: 10px 24px;
  border-radius: 10px;
  border: none;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.scan-btn-cancel {
  background: var(--form-bg-color);
  color: var(--confirm-text-light);
}

.scan-btn-confirm {
  background: #8b5cf6;
  color: #fff;
}

@media (hover: hover) {
  .scan-btn-cancel:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  .scan-btn-confirm:hover {
    background: #7c3aed;
  }
}

.loading-hint {
  font-size: 0.8rem;
  color: var(--credits-color);
  margin-top: 4px;
}

::-webkit-scrollbar {
  width: 0px;
}

::-webkit-scrollbar-track {
  background: var(--form-bg-color);
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}
</style>
