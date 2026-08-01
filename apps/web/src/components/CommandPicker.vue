<script setup lang="ts">
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

const filteredCommands = computed(() => {
  if (!searchQuery.value.trim()) return commandCategories
  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, CommandItem[]> = {}
  Object.entries(commandCategories).forEach(([category, commands]) => {
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
  <div v-if="show" class="picker-backdrop" @click="emit('close')">
    <div class="picker-panel" @click.stop>
      <header class="picker-header">
        <h3>Seleccionar Comando</h3>
        <button @click="emit('close')" class="header-close" aria-label="Cerrar">
          <i class="pi pi-times"></i>
        </button>
      </header>

      <div class="picker-search">
        <i class="pi pi-search search-icon"></i>
        <input v-model="searchQuery" type="text" placeholder="Buscar comando..." class="field" />
      </div>

      <div class="picker-scroll">
        <div v-if="Object.keys(filteredCommands).length === 0" class="empty-state">
          <i class="pi pi-search" style="font-size: 2rem; opacity: 0.3"></i>
          <p>No se encontraron comandos</p>
        </div>
        <div v-for="(commands, category) in filteredCommands" :key="category" class="category">
          <h4 class="category-title">{{ category }} ({{ commands.length }})</h4>
          <div class="items-list">
            <button
              v-for="item in commands"
              :key="item.command"
              class="list-item"
              :class="{ active: currentCommand === item.command }"
              @click.stop="selectCommand(item.command)"
              type="button"
            >
              <div v-if="item.icon" class="item-icon"><i :class="item.icon"></i></div>
              <div class="item-info">
                <div class="item-label">{{ item.label }}</div>
                <div class="item-desc">{{ item.description }}</div>
                <code class="item-code">{{ item.command }}</code>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
  max-width: 720px;
  max-height: 85dvh;
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
  animation: picker-in 0.25s ease;
}

@keyframes picker-in {
  from { opacity: 0; transform: translateY(16px) scale(0.97); }
  to { opacity: 1; transform: none; }
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
  transition: all 0.18s;
}
@media (hover: hover) {
  .header-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text-1); transform: rotate(90deg); }
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
  color: #a78bfa;
}

.item-info { flex: 1; min-width: 0; }
.item-label { font-weight: 600; font-size: 0.95rem; margin-bottom: 2px; }
.item-desc { font-size: 0.82rem; color: var(--text-2); margin-bottom: 4px; }
.item-code {
  font-size: 0.72rem;
  font-family: 'Courier New', monospace;
  color: #a78bfa;
  background: color-mix(in srgb, var(--accent) 10%, transparent);
  padding: 3px 7px;
  border-radius: 4px;
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  .picker-panel { max-width: 100%; border-radius: 24px 24px 0 0; max-height: 92dvh; }
}
</style>
