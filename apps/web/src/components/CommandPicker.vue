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

// Comandos organizados por categoría
const commandCategories: Record<string, CommandItem[]> = {
  Navegadores: [
    {
      command: 'start chrome',
      label: 'Google Chrome',
      description: 'Abrir Google Chrome',
      category: 'Navegadores',
      icon: 'fab fa-chrome',
    },
    {
      command: 'start firefox',
      label: 'Firefox',
      description: 'Abrir Mozilla Firefox',
      category: 'Navegadores',
      icon: 'fab fa-firefox-browser',
    },
    {
      command: 'start msedge',
      label: 'Edge',
      description: 'Abrir Microsoft Edge',
      category: 'Navegadores',
      icon: 'fab fa-edge',
    },
    {
      command: 'start opera',
      label: 'Opera',
      description: 'Abrir Opera',
      category: 'Navegadores',
      icon: 'fab fa-opera',
    },
    {
      command: 'start brave',
      label: 'Brave',
      description: 'Abrir Brave Browser',
      category: 'Navegadores',
      icon: 'fab fa-brave',
    },
  ],
  'Microsoft Office': [
    {
      command: 'start winword',
      label: 'Microsoft Word',
      description: 'Abrir Word',
      category: 'Microsoft Office',
      icon: 'fas fa-file-word',
    },
    {
      command: 'start excel',
      label: 'Microsoft Excel',
      description: 'Abrir Excel',
      category: 'Microsoft Office',
      icon: 'fas fa-file-excel',
    },
    {
      command: 'start powerpnt',
      label: 'Microsoft PowerPoint',
      description: 'Abrir PowerPoint',
      category: 'Microsoft Office',
      icon: 'fas fa-file-powerpoint',
    },
    {
      command: 'start outlook',
      label: 'Microsoft Outlook',
      description: 'Abrir Outlook',
      category: 'Microsoft Office',
      icon: 'fas fa-envelope',
    },
    {
      command: 'start onenote',
      label: 'Microsoft OneNote',
      description: 'Abrir OneNote',
      category: 'Microsoft Office',
      icon: 'fas fa-book',
    },
    {
      command: 'start msaccess',
      label: 'Microsoft Access',
      description: 'Abrir Access',
      category: 'Microsoft Office',
      icon: 'fas fa-database',
    },
    {
      command: 'start mspub',
      label: 'Microsoft Publisher',
      description: 'Abrir Publisher',
      category: 'Microsoft Office',
      icon: 'fas fa-newspaper',
    },
    {
      command: 'start msteams',
      label: 'Microsoft Teams',
      description: 'Abrir Teams',
      category: 'Microsoft Office',
      icon: 'fab fa-microsoft',
    },
  ],
  Aplicaciones: [
    {
      command: 'start discord',
      label: 'Discord',
      description: 'Abrir Discord',
      category: 'Aplicaciones',
      icon: 'fab fa-discord',
    },
    {
      command: 'start spotify',
      label: 'Spotify',
      description: 'Abrir Spotify',
      category: 'Aplicaciones',
      icon: 'fab fa-spotify',
    },
    {
      command: 'start steam',
      label: 'Steam',
      description: 'Abrir Steam',
      category: 'Aplicaciones',
      icon: 'fab fa-steam',
    },
    {
      command: 'notepad',
      label: 'Notepad',
      description: 'Abrir Bloc de Notas',
      category: 'Aplicaciones',
      icon: 'fas fa-file-lines',
    },
    {
      command: 'calc',
      label: 'Calculadora',
      description: 'Abrir Calculadora',
      category: 'Aplicaciones',
      icon: 'fas fa-calculator',
    },
    {
      command: 'mspaint',
      label: 'Paint',
      description: 'Abrir Paint',
      category: 'Aplicaciones',
      icon: 'fas fa-paintbrush',
    },
    {
      command: 'explorer',
      label: 'Explorador',
      description: 'Abrir Explorador de Archivos',
      category: 'Aplicaciones',
      icon: 'fas fa-folder-open',
    },
    {
      command: 'code',
      label: 'VS Code',
      description: 'Abrir Visual Studio Code',
      category: 'Aplicaciones',
      icon: 'fas fa-code',
    },
  ],
  Sistema: [
    {
      command: 'taskmgr',
      label: 'Administrador de Tareas',
      description: 'Abrir Task Manager',
      category: 'Sistema',
      icon: 'fas fa-chart-bar',
    },
    {
      command: 'control',
      label: 'Panel de Control',
      description: 'Abrir Panel de Control',
      category: 'Sistema',
      icon: 'fas fa-sliders',
    },
    {
      command: 'ms-settings:',
      label: 'Configuración',
      description: 'Abrir Configuración de Windows',
      category: 'Sistema',
      icon: 'fas fa-gear',
    },
    {
      command: 'powershell',
      label: 'PowerShell',
      description: 'Abrir PowerShell',
      category: 'Sistema',
      icon: 'fas fa-terminal',
    },
    {
      command: 'cmd',
      label: 'CMD',
      description: 'Abrir Símbolo del Sistema',
      category: 'Sistema',
      icon: 'fas fa-terminal',
    },
    {
      command: 'shutdown /s /t 0',
      label: 'Apagar PC',
      description: 'Apagar el ordenador inmediatamente',
      category: 'Sistema',
      icon: 'fas fa-power-off',
    },
    {
      command: 'shutdown /r /t 0',
      label: 'Reiniciar PC',
      description: 'Reiniciar el ordenador',
      category: 'Sistema',
      icon: 'fas fa-rotate-right',
    },
    {
      command: 'rundll32.exe user32.dll,LockWorkStation',
      label: 'Bloquear PC',
      description: 'Bloquear sesión de Windows',
      category: 'Sistema',
      icon: 'fas fa-lock',
    },
  ],
  Multimedia: [
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"',
      label: 'Silenciar',
      description: 'Silenciar/activar audio',
      category: 'Multimedia',
      icon: 'fas fa-volume-xmark',
    },
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"',
      label: 'Subir Volumen',
      description: 'Aumentar volumen',
      category: 'Multimedia',
      icon: 'fas fa-volume-high',
    },
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"',
      label: 'Bajar Volumen',
      description: 'Disminuir volumen',
      category: 'Multimedia',
      icon: 'fas fa-volume-low',
    },
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]179)"',
      label: 'Play/Pausa',
      description: 'Reproducir o pausar',
      category: 'Multimedia',
      icon: 'fas fa-play-pause',
    },
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]176)"',
      label: 'Siguiente',
      description: 'Siguiente canción',
      category: 'Multimedia',
      icon: 'fas fa-forward-step',
    },
    {
      command:
        'powershell -c "(New-Object -ComObject WScript.Shell).SendKeys([char]177)"',
      label: 'Anterior',
      description: 'Canción anterior',
      category: 'Multimedia',
      icon: 'fas fa-backward-step',
    },
  ],
  'Carpetas Comunes': [
    {
      command: 'start "" "%USERPROFILE%\\Downloads"',
      label: 'Descargas',
      description: 'Abrir carpeta de Descargas',
      category: 'Carpetas Comunes',
      icon: 'fas fa-download',
    },
    {
      command: 'start "" "%USERPROFILE%\\Documents"',
      label: 'Documentos',
      description: 'Abrir carpeta de Documentos',
      category: 'Carpetas Comunes',
      icon: 'fas fa-file-lines',
    },
    {
      command: 'start "" "%USERPROFILE%\\Pictures"',
      label: 'Imágenes',
      description: 'Abrir carpeta de Imágenes',
      category: 'Carpetas Comunes',
      icon: 'fas fa-images',
    },
    {
      command: 'start "" "%USERPROFILE%\\Videos"',
      label: 'Videos',
      description: 'Abrir carpeta de Videos',
      category: 'Carpetas Comunes',
      icon: 'fas fa-film',
    },
    {
      command: 'start "" "%USERPROFILE%\\Music"',
      label: 'Música',
      description: 'Abrir carpeta de Música',
      category: 'Carpetas Comunes',
      icon: 'fas fa-music',
    },
    {
      command: 'start "" "%USERPROFILE%\\Desktop"',
      label: 'Escritorio',
      description: 'Abrir carpeta del Escritorio',
      category: 'Carpetas Comunes',
      icon: 'fas fa-desktop',
    },
  ],
}

const filteredCommands = computed(() => {
  if (!searchQuery.value.trim()) {
    return commandCategories
  }

  const query = searchQuery.value.toLowerCase()
  const filtered: Record<string, CommandItem[]> = {}

  Object.entries(commandCategories).forEach(([category, commands]) => {
    const matchingCommands = commands.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.command.toLowerCase().includes(query),
    )
    if (matchingCommands.length > 0) {
      filtered[category] = matchingCommands
    }
  })

  return filtered
})

const selectCommand = (command: string) => {
  console.log('Emitting command:', command)
  emit('select', command)
}
</script>

<template>
  <div v-if="show" class="command-picker-overlay" @click="emit('close')">
    <div class="command-picker" @click.stop>
      <div class="picker-header">
        <h3>Seleccionar Comando</h3>
        <button @click="emit('close')" class="close-btn">✕</button>
      </div>

      <div class="picker-search">
        <i class="pi pi-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Buscar comando..."
          class="search-input"
        />
      </div>

      <div class="picker-content">
        <div
          v-if="Object.keys(filteredCommands).length === 0"
          class="no-results"
        >
          <i class="pi pi-search" style="font-size: 2rem; opacity: 0.3"></i>
          <p>No se encontraron comandos</p>
        </div>
        <div
          v-for="(commands, category) in filteredCommands"
          :key="category"
          class="command-category"
        >
          <h4 class="category-title">{{ category }} ({{ commands.length }})</h4>
          <div class="commands-list">
            <button
              v-for="item in commands"
              :key="item.command"
              class="command-item"
              :class="{ active: currentCommand === item.command }"
              @click.stop="selectCommand(item.command)"
              type="button"
            >
              <div v-if="item.icon" class="command-icon">
                <i :class="item.icon"></i>
              </div>
              <div class="command-info">
                <div class="command-label">{{ item.label }}</div>
                <div class="command-description">{{ item.description }}</div>
                <div class="command-code">{{ item.command }}</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.command-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}
.command-picker-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

.command-picker {
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
  color: var(--edit-text-color);
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--form-bg-color);
  color: var(--edit-btn-text-color);
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.2s;
}

@media (hover: hover) {
  .close-btn:hover {
    background: var(--confirm-bg-light-hover);
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
  background: var(--form-bg-color);
  border-color: rgba(139, 92, 246, 0.5);
}

.picker-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}

.command-category {
  margin-bottom: 28px;
}

.command-category:last-child {
  margin-bottom: 0;
}

.category-title {
  margin: 0 0 12px 0;
  font-size: 0.9rem;
  color: var(--edit-text-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.commands-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--form-bg-color);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  padding: 14px 16px;
  text-align: left;
}

.command-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(139, 92, 246, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.2rem;
  color: #a78bfa;
}

@media (hover: hover) {
  .command-item:hover {
    background: var(--edit-bg-hover-color);
    border-color: rgba(139, 92, 246, 0.5);
    transform: translateX(4px);
  }
}

.command-item.active {
  background: rgba(139, 92, 246, 0.3);
  border-color: #8b5cf6;
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

.command-info {
  flex: 1;
}

.command-label {
  font-weight: 600;
  font-size: 1rem;
  color: var(--edit-text-color);
  margin-bottom: 4px;
}

.command-description {
  font-size: 0.85rem;
  color: var(--edit-text-color);
  margin-bottom: 6px;
}

.command-code {
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

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--edit-text-color);
  text-align: center;
}

.no-results p {
  margin-top: 12px;
  font-size: 1rem;
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
