<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { computed, ref } from 'vue'

interface CommandItem {
  command: string
  label: string
  description: string
  category: string
  icon?: string
}

const props = defineProps<{
  show: boolean
  currentCommand?: string
}>()

const emit = defineEmits<{
  select: [command: string]
  close: []
}>()

const searchQuery = ref('')
const activeCategory = ref<string | null>(null)
const viewMode = ref<'list' | 'grid'>('list')

const commandCategories: Record<string, CommandItem[]> = {
  Navegadores: [
    { command: 'start chrome', label: 'Google Chrome', description: 'Abrir Google Chrome', category: 'Navegadores', icon: 'fab fa-chrome' },
    { command: 'start firefox', label: 'Firefox', description: 'Abrir Mozilla Firefox', category: 'Navegadores', icon: 'fab fa-firefox-browser' },
    { command: 'start msedge', label: 'Edge', description: 'Abrir Microsoft Edge', category: 'Navegadores', icon: 'fab fa-edge' },
    { command: 'start opera', label: 'Opera', description: 'Abrir Opera', category: 'Navegadores', icon: 'fab fa-opera' },
    { command: 'start brave', label: 'Brave', description: 'Abrir Brave Browser', category: 'Navegadores', icon: 'fab fa-brave' },
  ],
  'Microsoft Office': [
    { command: 'start winword', label: 'Microsoft Word', description: 'Abrir Word', category: 'Microsoft Office', icon: 'fas fa-file-word' },
    { command: 'start excel', label: 'Microsoft Excel', description: 'Abrir Excel', category: 'Microsoft Office', icon: 'fas fa-file-excel' },
    { command: 'start powerpnt', label: 'Microsoft PowerPoint', description: 'Abrir PowerPoint', category: 'Microsoft Office', icon: 'fas fa-file-powerpoint' },
    { command: 'start outlook', label: 'Microsoft Outlook', description: 'Abrir Outlook', category: 'Microsoft Office', icon: 'fas fa-envelope' },
    { command: 'start onenote', label: 'Microsoft OneNote', description: 'Abrir OneNote', category: 'Microsoft Office', icon: 'fas fa-book' },
    { command: 'start msaccess', label: 'Microsoft Access', description: 'Abrir Access', category: 'Microsoft Office', icon: 'fas fa-database' },
    { command: 'start mspub', label: 'Microsoft Publisher', description: 'Abrir Publisher', category: 'Microsoft Office', icon: 'fas fa-newspaper' },
    { command: 'start msteams', label: 'Microsoft Teams', description: 'Abrir Teams', category: 'Microsoft Office', icon: 'fab fa-microsoft' },
  ],
  Aplicaciones: [
    { command: 'start discord', label: 'Discord', description: 'Abrir Discord', category: 'Aplicaciones', icon: 'fab fa-discord' },
    { command: 'start spotify', label: 'Spotify', description: 'Abrir Spotify', category: 'Aplicaciones', icon: 'fab fa-spotify' },
    { command: 'start steam', label: 'Steam', description: 'Abrir Steam', category: 'Aplicaciones', icon: 'fab fa-steam' },
    { command: 'notepad', label: 'Notepad', description: 'Abrir Bloc de Notas', category: 'Aplicaciones', icon: 'fas fa-file-lines' },
    { command: 'calc', label: 'Calculadora', description: 'Abrir Calculadora', category: 'Aplicaciones', icon: 'fas fa-calculator' },
    { command: 'mspaint', label: 'Paint', description: 'Abrir Paint', category: 'Aplicaciones', icon: 'fas fa-paintbrush' },
    { command: 'explorer', label: 'Explorador', description: 'Abrir Explorador de Archivos', category: 'Aplicaciones', icon: 'fas fa-folder-open' },
    { command: 'code', label: 'VS Code', description: 'Abrir Visual Studio Code', category: 'Aplicaciones', icon: 'fas fa-code' },
  ],
  Sistema: [
    { command: 'taskmgr', label: 'Administrador de Tareas', description: 'Abrir Task Manager', category: 'Sistema', icon: 'fas fa-chart-bar' },
    { command: 'control', label: 'Panel de Control', description: 'Abrir Panel de Control', category: 'Sistema', icon: 'fas fa-sliders' },
    { command: 'ms-settings:', label: 'Configuración', description: 'Abrir Configuración de Windows', category: 'Sistema', icon: 'fas fa-gear' },
    { command: 'powershell', label: 'PowerShell', description: 'Abrir PowerShell', category: 'Sistema', icon: 'fas fa-terminal' },
    { command: 'cmd', label: 'CMD', description: 'Abrir Símbolo del Sistema', category: 'Sistema', icon: 'fas fa-terminal' },
    { command: 'shutdown /s /t 0', label: 'Apagar PC', description: 'Apagar el ordenador inmediatamente', category: 'Sistema', icon: 'fas fa-power-off' },
    { command: 'shutdown /r /t 0', label: 'Reiniciar PC', description: 'Reiniciar el ordenador', category: 'Sistema', icon: 'fas fa-rotate-right' },
    { command: 'rundll32.exe user32.dll,LockWorkStation', label: 'Bloquear PC', description: 'Bloquear sesión de Windows', category: 'Sistema', icon: 'fas fa-lock' },
  ],
  Multimedia: [
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"', label: 'Silenciar', description: 'Silenciar/activar audio', category: 'Multimedia', icon: 'fas fa-volume-xmark' },
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"', label: 'Subir Volumen', description: 'Aumentar volumen', category: 'Multimedia', icon: 'fas fa-volume-high' },
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"', label: 'Bajar Volumen', description: 'Disminuir volumen', category: 'Multimedia', icon: 'fas fa-volume-low' },
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"', label: 'Play/Pausa', description: 'Reproducir o pausar', category: 'Multimedia', icon: 'fas fa-play-pause' },
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"', label: 'Siguiente', description: 'Siguiente canción', category: 'Multimedia', icon: 'fas fa-forward-step' },
    { command: 'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"', label: 'Anterior', description: 'Canción anterior', category: 'Multimedia', icon: 'fas fa-backward-step' },
  ],
  'Carpetas Comunes': [
    { command: 'explorer shell:Downloads', label: 'Descargas', description: 'Abrir carpeta de Descargas', category: 'Carpetas Comunes', icon: 'fas fa-download' },
    { command: 'explorer shell:Personal', label: 'Documentos', description: 'Abrir carpeta de Documentos', category: 'Carpetas Comunes', icon: 'fas fa-file-lines' },
    { command: 'explorer shell:My Pictures', label: 'Imágenes', description: 'Abrir carpeta de Imágenes', category: 'Carpetas Comunes', icon: 'fas fa-images' },
    { command: 'explorer shell:My Video', label: 'Videos', description: 'Abrir carpeta de Videos', category: 'Carpetas Comunes', icon: 'fas fa-film' },
    { command: 'explorer shell:My Music', label: 'Música', description: 'Abrir carpeta de Música', category: 'Carpetas Comunes', icon: 'fas fa-music' },
    { command: 'explorer shell:Desktop', label: 'Escritorio', description: 'Abrir carpeta del Escritorio', category: 'Carpetas Comunes', icon: 'fas fa-desktop' },
  ],
}

const categoryNames = Object.keys(commandCategories)
const categoryIcons: Record<string, string> = {
  Navegadores: 'mdi:web',
  'Microsoft Office': 'mdi:microsoft-office',
  Aplicaciones: 'mdi:view-grid',
  Sistema: 'mdi:cog',
  Multimedia: 'mdi:volume-high',
  'Carpetas Comunes': 'mdi:folder-open',
}

const filteredCommands = computed(() => {
  const source = activeCategory.value
    ? { [activeCategory.value]: commandCategories[activeCategory.value] }
    : commandCategories
  if (!searchQuery.value.trim()) return source
  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, CommandItem[]> = {}
  Object.entries(source).forEach(([category, commands]) => {
    const matching = commands.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.command.toLowerCase().includes(query),
    )
    if (matching.length > 0) filtered[category] = matching
  })
  return filtered
})

const selectCommand = (command: string) => {
  emit('select', command)
}
</script>

<template>
  <Transition name="picker">
  <div v-if="show" class="picker-backdrop" @click="emit('close')">
    <div class="picker-panel" @click.stop>
      <header class="picker-header">
        <h3>Seleccionar Comando</h3>
        <button @click="emit('close')" class="header-close" aria-label="Cerrar">
          <Icon icon="mdi:close" />
        </button>
      </header>

      <div class="picker-body">
        <nav class="picker-sidebar">
          <button
            type="button"
            class="sidebar-item"
            :class="{ active: activeCategory === null }"
            @click="activeCategory = null"
          >
            <Icon icon="mdi:view-dashboard" />
            <span>Todos</span>
          </button>
          <button
            v-for="cat in categoryNames"
            :key="cat"
            type="button"
            class="sidebar-item"
            :class="{ active: activeCategory === cat }"
            @click="activeCategory = cat"
          >
            <Icon :icon="categoryIcons[cat] || 'mdi:folder'" />
            <span>{{ cat }}</span>
          </button>
        </nav>

        <div class="picker-main">
          <div class="picker-search">
            <Icon icon="mdi:magnify" class="search-icon" />
            <input v-model="searchQuery" type="text" placeholder="Buscar comando..." class="field" />
            <div class="view-toggle">
              <button type="button" class="view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'" title="Vista lista">
                <Icon icon="mdi:format-list-bulleted" />
              </button>
              <button type="button" class="view-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'" title="Vista cuadrícula">
                <Icon icon="mdi:view-grid" />
              </button>
            </div>
          </div>

          <div class="picker-scroll">
            <div v-if="Object.keys(filteredCommands).length === 0" class="empty-state">
              <Icon icon="mdi:magnify" style="font-size: 2rem; opacity: 0.3" />
              <p>No se encontraron comandos</p>
            </div>
            <div v-for="(commands, category) in filteredCommands" :key="category" class="category">
              <h4 class="category-title">{{ category }} ({{ commands.length }})</h4>
              <div :class="viewMode === 'grid' ? 'items-grid' : 'items-list'">
                <button
                  v-for="item in commands"
                  :key="item.command"
                  :class="[viewMode === 'grid' ? 'grid-item' : 'list-item', { active: currentCommand === item.command }]"
                  @click.stop="selectCommand(item.command)"
                  type="button"
                >
                  <div v-if="item.icon" :class="viewMode === 'grid' ? 'grid-icon' : 'item-icon'"><i :class="item.icon"></i></div>
                  <div class="item-info">
                    <div class="item-label">{{ item.label }}</div>
                    <div v-if="viewMode === 'list'" class="item-desc">{{ item.description }}</div>
                    <code v-if="viewMode === 'list'" class="item-code">{{ item.command }}</code>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
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
  max-width: 820px;
  height: 580px;
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
}
.picker-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-1);
}
.header-close {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid var(--glass-border);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text-2);
  cursor: pointer;
  display: grid;
  place-items: center;
  font-size: 0.9rem;
  transition: background 0.18s, color 0.18s;
}
.header-close svg { transition: transform 0.18s; }
@media (hover: hover) {
  .header-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-1); }
  .header-close:hover svg { transform: rotate(90deg); }
}

.picker-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

.picker-sidebar {
  width: 190px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 10px;
  border-right: 1px solid var(--glass-border);
  background: rgba(0, 0, 0, 0.15);
  overflow-y: auto;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-2);
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.18s;
  text-align: left;
  white-space: nowrap;
}
.sidebar-item i { font-size: 1rem; width: 20px; text-align: center; }
.sidebar-item.active {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--text-1);
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}
@media (hover: hover) {
  .sidebar-item:not(.active):hover {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-1);
  }
}

.picker-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
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

.category { margin-bottom: 24px; }
.category:last-child { margin-bottom: 0; }
.category-title {
  margin: 0 0 10px;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-2);
}

.items-list { display: flex; flex-direction: column; gap: 6px; }

.list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  cursor: pointer;
  text-align: left;
  color: var(--text-1);
  transition: all 0.15s;
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

.item-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 1.1rem;
  color: var(--accent);
}

.item-info { flex: 1; min-width: 0; }
.item-label { font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; }
.item-desc { font-size: 0.82rem; color: var(--text-2); margin-bottom: 4px; }
.item-code {
  font-size: 0.72rem;
  font-family: 'Courier New', monospace;
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  padding: 3px 7px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Grid view */
.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}
.grid-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  cursor: pointer;
  text-align: center;
  color: var(--text-1);
  transition: all 0.15s;
}
@media (hover: hover) {
  .grid-item:hover {
    background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
}
.grid-item.active {
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  border-color: var(--accent);
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 35%, transparent);
}
.grid-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  display: grid; place-items: center;
  font-size: 1.3rem; color: var(--accent);
}
.grid-item .item-info { min-width: 0; width: 100%; }
.grid-item .item-label {
  font-size: 0.78rem; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* View toggle */
.view-toggle {
  display: flex; gap: 2px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px; padding: 2px;
  flex-shrink: 0;
}
.view-btn {
  width: 34px; height: 34px; border: none; border-radius: 6px;
  background: transparent; color: var(--text-2); cursor: pointer;
  display: grid; place-items: center; font-size: 0.9rem; transition: all 0.18s;
}
.view-btn.active {
  background: color-mix(in srgb, var(--accent) 25%, transparent);
  color: var(--accent);
}
@media (hover: hover) {
  .view-btn:not(.active):hover { background: rgba(255, 255, 255, 0.08); color: var(--text-1); }
}

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

@media (max-width: 640px) {
  .picker-backdrop { align-items: flex-end; padding: 0; }
  .picker-panel { max-width: 100%; height: auto; max-height: 92dvh; border-radius: 24px 24px 0 0; }
  .picker-body { flex-direction: column; }
  .picker-sidebar {
    width: 100%;
    flex-direction: row;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
    padding: 8px 10px;
    overflow-x: auto;
    overflow-y: hidden;
    gap: 4px;
  }
  .sidebar-item { padding: 8px 12px; font-size: 0.8rem; gap: 6px; }
  .sidebar-item span { display: none; }
  .sidebar-item i { font-size: 1.1rem; }
  .picker-enter-from .picker-panel { transform: translateY(100%); }
  .picker-leave-to .picker-panel { transform: translateY(100%); }
}

/* ── Transitions ── */
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
[data-theme='light'] .list-item, [data-theme='light'] .grid-item { background: rgba(0, 0, 0, 0.03); border-color: rgba(0, 0, 0, 0.07); }
[data-theme='light'] .list-item:hover, [data-theme='light'] .grid-item:hover { background: color-mix(in srgb, var(--accent) 8%, transparent); }
[data-theme='light'] .view-toggle { background: rgba(0, 0, 0, 0.06); }
[data-theme='light'] .picker-sidebar { background: rgba(0, 0, 0, 0.04); border-right-color: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .sidebar-item.active { background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: color-mix(in srgb, var(--accent) 20%, transparent); }
[data-theme='light'] .sidebar-item:not(.active):hover { background: rgba(0, 0, 0, 0.05); }
[data-theme='light'] .picker-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); }
</style>
