<script setup lang="ts">
import { Icon } from '@iconify/vue'
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
const viewMode = ref<'list' | 'grid'>('list')
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
    if (newVal && apps.value.length === 0) await checkCacheAndLoad()
  },
)

const checkCacheAndLoad = async () => {
  try {
    const response = await fetch(`${API_URL}/command/installed-apps/cache-status`, { headers: { ...getAuthHeaders() } })
    if (response.ok) {
      const data = await response.json()
      if (data.hasCache) { await loadApps(false); return }
    }
  } catch { /* ignore */ }
  isRescan.value = false
  showScanWarning.value = true
}

const confirmScan = async () => { showScanWarning.value = false; await loadApps(isRescan.value) }
const cancelScan = () => { showScanWarning.value = false; if (apps.value.length === 0) emit('close') }
const requestRescan = () => { isRescan.value = true; showScanWarning.value = true }

const loadApps = async (forceRescan = false) => {
  loading.value = true
  try {
    const url = forceRescan ? `${API_URL}/command/installed-apps/rescan` : `${API_URL}/command/installed-apps`
    const options: RequestInit = { headers: { ...getAuthHeaders() }, ...(forceRescan ? { method: 'POST' } : {}) }
    const response = await fetch(url, options)
    if (response.ok) {
      const data = await response.json()
      if (data.success && Array.isArray(data.apps)) {
        apps.value = data.apps
        scannedAt.value = data.scannedAt || null
      }
    }
  } catch (error) { console.error('Error loading apps:', error) }
  finally { loading.value = false }
}

const formattedScannedAt = computed(() => {
  if (!scannedAt.value) return null
  try { return new Date(scannedAt.value).toLocaleString() } catch { return null }
})

const filteredApps = computed(() => {
  if (!searchQuery.value.trim()) return apps.value
  const query = searchQuery.value.toLowerCase()
  return apps.value.filter((app) => app.Name.toLowerCase().includes(query) || (app.Path && app.Path.toLowerCase().includes(query)))
})

const selectApp = (app: InstalledApp) => {
  let command = ''
  if (app.Path) {
    if (app.Path.includes('"')) command = app.Path
    else if (app.Path.toLowerCase().endsWith('.exe')) command = app.Path.includes(' ') ? `"${app.Path}"` : app.Path
    else command = `start "" "${app.Path}"`
  } else {
    let cleanName = app.Name.replace(/\s*\d+(\.\d+)*\s*/g, '').replace(/Microsoft\s*/gi, '').trim().toLowerCase().replace(/\s+/g, '')
    command = `start ${cleanName}`
  }
  const icon = app.Icon && app.Icon.startsWith('/app-icons/') ? app.Icon : undefined
  emit('select', { command, icon, name: app.Name })
}
</script>

<template>
  <Transition name="picker">
  <div v-if="show" class="picker-backdrop" @click="emit('close')">
    <div class="picker-panel" @click.stop>
      <header class="picker-header">
        <h3>Aplicaciones Instaladas</h3>
        <div class="header-actions">
          <div class="view-toggle">
            <button type="button" class="view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Vista lista">
              <Icon icon="mdi:format-list-bulleted" />
            </button>
            <button type="button" class="view-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="Vista cuadrícula">
              <Icon icon="mdi:view-grid" />
            </button>
          </div>
          <button @click="emit('close')" class="header-close" aria-label="Cerrar">
            <Icon icon="mdi:close" />
          </button>
        </div>
      </header>

      <!-- Scan warning -->
      <div v-if="showScanWarning" class="scan-warning">
        <Icon icon="mdi:magnify" class="scan-emoji" />
        <h4>{{ isRescan ? 'Volver a analizar' : 'Análisis de aplicaciones' }}</h4>
        <p v-if="isRescan">Se volverá a analizar tu PC para detectar aplicaciones instaladas. Esto puede tardar unos segundos.</p>
        <p v-else>Se analizará tu PC para detectar las aplicaciones instaladas. Esto incluye el registro de Windows, apps de Microsoft Store y PWAs.<br /><br /><strong>Este proceso puede tardar unos segundos</strong> y los resultados se guardarán para no repetir el análisis cada vez.</p>
        <div class="scan-actions">
          <button @click="cancelScan" class="btn-neon">Cancelar</button>
          <button @click="confirmScan" class="btn-neon btn-neon-primary">
            <template v-if="isRescan"><Icon icon="mdi:refresh" style="vertical-align: -2px" /> Volver a Analizar</template>
            <template v-else><Icon icon="mdi:magnify" style="vertical-align: -2px" /> Analizar</template>
          </button>
        </div>
      </div>

      <template v-else>
        <div class="picker-search">
          <Icon icon="mdi:magnify" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Buscar aplicación..." class="field" />
        </div>

        <div class="picker-scroll">
          <div v-if="loading" class="empty-state">
            <Icon icon="mdi:loading" class="mdi-spin" style="font-size: 2rem" />
            <p>Analizando aplicaciones instaladas...</p>
            <p class="hint-text">Esto puede tardar unos segundos</p>
          </div>

          <div v-else-if="filteredApps.length === 0" class="empty-state">
            <Icon icon="mdi:magnify" style="font-size: 2rem; opacity: 0.3" />
            <p v-if="searchQuery">No se encontraron aplicaciones</p>
            <p v-else>No se detectaron aplicaciones instaladas</p>
          </div>

          <div v-else :class="viewMode === 'grid' ? 'items-grid' : 'items-list'">
            <button
              v-for="app in filteredApps"
              :key="app.Name"
              :class="[viewMode === 'grid' ? 'grid-item' : 'list-item', { active: currentApp === app.Path || currentApp === app.Name }]"
              @click.stop="selectApp(app)"
              type="button"
            >
              <img
                v-if="app.Icon && app.Icon.startsWith('/app-icons/')"
                :src="API_URL + app.Icon"
                :class="viewMode === 'grid' ? 'grid-icon-img' : 'app-icon-img'"
                alt=""
                @error="($event.target as HTMLImageElement).style.display = 'none'"
              />
              <div v-else :class="viewMode === 'grid' ? 'grid-icon-placeholder' : 'app-icon-placeholder'"><Icon icon="mdi:package-variant" /></div>
              <div class="app-info">
                <div class="app-name">{{ app.Name }}</div>
                <code v-if="app.Path && viewMode === 'list'" class="app-path">{{ app.Path }}</code>
              </div>
            </button>
          </div>
        </div>

        <footer class="picker-footer">
          <div class="footer-row">
            <span class="hint-text"><Icon icon="mdi:lightbulb-on" style="vertical-align: -2px" /> Selecciona una aplicación para configurar su ruta</span>
            <button @click="requestRescan" :disabled="loading" class="rescan-chip" title="Volver a analizar"><Icon icon="mdi:refresh" /></button>
          </div>
          <p v-if="formattedScannedAt" class="scanned-at">Último análisis: {{ formattedScannedAt }}</p>
        </footer>
      </template>
    </div>
  </div>
  </Transition>
</template>

<style scoped>
.picker-backdrop {
  position: fixed; inset: 0; background: var(--scrim); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 16px;
}
.picker-panel {
  width: 100%; max-width: 720px; height: 580px; display: flex; flex-direction: column;
  border-radius: 24px;
  background: linear-gradient(170deg, rgba(22, 22, 32, 0.94) 0%, rgba(10, 10, 16, 0.97) 100%);
  border: 1px solid var(--glass-border); backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04), 0 32px 80px rgba(0, 0, 0, 0.7), 0 0 60px -10px color-mix(in srgb, var(--accent) 30%, transparent);
  overflow: hidden;
}

.picker-header {
  display: flex; align-items: center; justify-content: space-between; padding: 18px 22px;
  border-bottom: 1px solid var(--glass-border);
}
.picker-header h3 { margin: 0; font-size: 1.15rem; font-weight: 600; color: var(--text-1); }
.header-actions { display: flex; align-items: center; gap: 10px; }
.view-toggle {
  display: flex; border-radius: 8px; overflow: hidden;
  border: 1px solid var(--glass-border); background: rgba(255, 255, 255, 0.03);
}
.view-btn {
  padding: 7px 10px; background: transparent; border: none;
  color: var(--text-2); cursor: pointer; font-size: 0.85rem; transition: all 0.18s;
}
.view-btn.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: var(--text-1);
}
@media (hover: hover) {
  .view-btn:not(.active):hover { background: rgba(255, 255, 255, 0.08); color: var(--text-1); }
}
.header-close {
  width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04); color: var(--text-2); cursor: pointer;
  display: grid; place-items: center; font-size: 0.9rem; transition: background 0.18s, color 0.18s;
}
.header-close svg { transition: transform 0.18s; }
@media (hover: hover) {
  .header-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-1); }
  .header-close:hover svg { transform: rotate(90deg); }
}

.picker-search {
  display: flex; align-items: center; gap: 10px; padding: 14px 22px;
  border-bottom: 1px solid var(--glass-border);
}
.search-icon { color: var(--text-2); font-size: 1rem; }
.field {
  flex: 1; padding: 11px 14px; background: var(--field-bg); border: 1px solid var(--field-border);
  border-radius: 10px; color: var(--text-1); font-size: 0.95rem; font-family: inherit;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
}
.field:focus {
  outline: none; border-color: var(--field-focus); background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.picker-scroll { flex: 1; overflow-y: auto; padding: 16px 22px; }

.items-list { display: flex; flex-direction: column; gap: 6px; }

.list-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px; cursor: pointer; text-align: left; color: var(--text-1); transition: all 0.15s;
}
@media (hover: hover) {
  .list-item:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateX(3px);
  }
}
.list-item.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}

.app-icon-img {
  width: 36px; height: 36px; border-radius: 8px; object-fit: contain; flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
}
.app-icon-placeholder {
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  display: grid; place-items: center; background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3); font-size: 1.1rem;
}

.app-info { flex: 1; min-width: 0; overflow: hidden; }
.app-name { font-weight: 600; font-size: 0.95rem; margin-bottom: 3px; }
.app-path {
  font-size: 0.72rem; font-family: 'Courier New', monospace; color: #a78bfa;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  padding: 3px 7px; border-radius: 4px; display: block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}
.grid-item {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 14px 8px; text-align: center;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px; cursor: pointer; color: var(--text-1); transition: all 0.15s;
}
@media (hover: hover) {
  .grid-item:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
    transform: translateY(-2px);
  }
}
.grid-item.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}
.grid-icon-img {
  width: 42px; height: 42px; border-radius: 10px; object-fit: contain;
  background: rgba(255, 255, 255, 0.05);
}
.grid-icon-placeholder {
  width: 42px; height: 42px; border-radius: 10px;
  display: grid; place-items: center; background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.3); font-size: 1.2rem;
}
.grid-item .app-info { min-width: 0; width: 100%; }
.grid-item .app-name {
  font-size: 0.78rem; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.empty-state {
  display: flex; flex-direction: column; align-items: center;
  padding: 50px 20px; color: var(--text-2); text-align: center;
}
.empty-state p { margin-top: 12px; }
.hint-text { font-size: 0.82rem; color: var(--text-2); }

/* Scan warning */
.scan-warning {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 36px 28px; gap: 8px;
}
.scan-emoji { font-size: 3rem; margin-bottom: 6px; }
.scan-warning h4 { margin: 0; font-size: 1.15rem; color: var(--text-1); }
.scan-warning p { margin: 0; font-size: 0.92rem; color: var(--text-2); line-height: 1.6; max-width: 400px; }
.scan-warning strong { color: var(--text-1); }
.scan-actions { display: flex; gap: 12px; margin-top: 16px; }
.scan-actions button { padding: 10px 22px; font-weight: 600; }

/* Footer */
.picker-footer {
  padding: 12px 22px; border-top: 1px solid var(--glass-border);
  background: rgba(10, 10, 16, 0.4);
}
.footer-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.scanned-at { margin: 4px 0 0; font-size: 0.72rem; color: var(--text-2); text-align: center; }
.rescan-chip {
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px; padding: 6px 10px; font-size: 1rem; cursor: pointer; transition: background 0.18s; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
}
.rescan-chip svg { transition: transform 0.3s; }
@media (hover: hover) {
  .rescan-chip:hover { background: rgba(255, 255, 255, 0.12); }
  .rescan-chip:hover svg { transform: rotate(180deg); }
}
.rescan-chip:disabled { opacity: 0.5; cursor: not-allowed; }

.picker-scroll::-webkit-scrollbar { width: 4px; }
.picker-scroll::-webkit-scrollbar-track { background: transparent; }
.picker-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }

@media (max-width: 640px) {
  .picker-backdrop { align-items: flex-end; padding: 0; }
  .picker-panel { max-width: 100%; height: auto; max-height: 92dvh; border-radius: 24px 24px 0 0; }
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
[data-theme='light'] .picker-search { border-bottom-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .field:focus { background: rgba(0, 0, 0, 0.02); }
[data-theme='light'] .list-item { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.07); }
[data-theme='light'] .list-item:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
[data-theme='light'] .app-icon-img { background: rgba(0, 0, 0, 0.04); }
[data-theme='light'] .app-icon-placeholder { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.25); }
[data-theme='light'] .picker-footer { background: rgba(245, 245, 250, 0.8); border-top-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .rescan-chip { background: rgba(0, 0, 0, 0.04); border-color: rgba(0, 0, 0, 0.1); }
[data-theme='light'] .rescan-chip:hover { background: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .view-toggle { border-color: rgba(0, 0, 0, 0.1); background: rgba(0, 0, 0, 0.03); }
[data-theme='light'] .view-btn.active { background: color-mix(in srgb, var(--accent) 15%, transparent); }
[data-theme='light'] .grid-item { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.07); }
[data-theme='light'] .grid-item:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
[data-theme='light'] .grid-icon-img { background: rgba(0, 0, 0, 0.04); }
[data-theme='light'] .grid-icon-placeholder { background: rgba(0, 0, 0, 0.04); color: rgba(0, 0, 0, 0.25); }
[data-theme='light'] .picker-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); }
</style>
