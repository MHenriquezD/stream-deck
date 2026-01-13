<script setup lang="ts">
import { ref } from 'vue'

interface DownloadFile {
  name: string
  size: number
  sizeFormatted: string
  url: string
}

const emit = defineEmits<{
  close: []
}>()

const showModal = ref(false)

// Archivos disponibles para descarga (servidos desde /public/downloads)
const availableFiles = ref<DownloadFile[]>([
  {
    name: 'StreamDeck-Server-Windows.zip',
    size: 0,
    sizeFormatted: '36.2 MB',
    url: '/downloads/StreamDeck-Server-Windows.zip',
  },
])

const openDownloadsModal = () => {
  showModal.value = true
}

const getFileIcon = (filename: string) => {
  if (filename.includes('Windows') || filename.endsWith('.exe')) return '🪟'
  if (filename.includes('macOS') || filename.includes('Mac')) return '🍎'
  if (filename.includes('Linux')) return '🐧'
  return '📦'
}

const version = '1.0.0'
</script>

<template>
  <div class="downloads-page">
    <button @click="emit('close')" class="close-page-btn" title="Cerrar">
      ✕
    </button>

    <div class="downloads-container">
      <div class="header">
        <h1>📥 Descargas</h1>
        <p class="subtitle">Stream Deck Server v{{ version }}</p>
      </div>

      <div class="info-box">
        <h3>💡 ¿Cómo funciona?</h3>
        <ol>
          <li>Descarga e instala el <strong>servidor</strong> en tu PC</li>
          <li>Instala esta <strong>PWA</strong> en tu tablet/móvil</li>
          <li>Conéctalos usando la IP local del servidor</li>
          <li>¡Controla tu PC remotamente!</li>
        </ol>
      </div>

      <div class="downloads-section">
        <button @click="openDownloadsModal" class="btn-open-downloads">
          📥 Ver Descargas Disponibles
        </button>
        <p class="downloads-hint">
          Click para ver todos los archivos disponibles para descargar
        </p>
      </div>

      <div class="instructions">
        <h3>📖 Instrucciones de Instalación</h3>

        <div class="instruction-section">
          <h4>🖥️ Servidor (Tu PC)</h4>
          <ol>
            <li>Descarga el archivo correspondiente a tu sistema operativo</li>
            <li>Descomprime el archivo ZIP</li>
            <li>
              <strong>Windows:</strong> Ejecuta <code>START-SERVER.bat</code>
            </li>
            <li>
              <strong>macOS/Linux:</strong> Abre terminal y ejecuta el
              ejecutable
            </li>
            <li>
              Anota la <strong>IP de red</strong> que aparece en la consola
            </li>
          </ol>
        </div>

        <div class="instruction-section">
          <h4>📱 Cliente (Tablet/Móvil)</h4>
          <ol>
            <li>Abre esta app en tu dispositivo (ya estás aquí 😉)</li>
            <li>Instala como PWA desde el menú del navegador</li>
            <li>Click en el botón ⚙️ (Configuración)</li>
            <li>
              Ingresa la IP del servidor: <code>http://192.168.x.x:8765</code>
            </li>
            <li>Click en "Probar Conexión" y luego "Guardar"</li>
          </ol>
        </div>
      </div>

      <div class="footer-info">
        <p>
          <strong>Requisitos:</strong> Windows 10/11, macOS 10.13+, o Linux
          moderno
        </p>
        <p>
          <strong>Soporte:</strong>
          <a href="https://mhenriquezdev.com/" target="_blank"
            >mhenriquezdev.com</a
          >
        </p>
      </div>
    </div>

    <!-- Modal de Descargas -->
    <Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click="showModal = false">
        <div class="modal-container" @click.stop>
          <div class="modal-header">
            <h2>📥 Archivos Disponibles</h2>
            <button @click="showModal = false" class="close-btn">✕</button>
          </div>

          <div class="modal-body">
            <div v-if="availableFiles.length === 0" class="no-files">
              <p>📦 No hay archivos disponibles para descargar</p>
            </div>

            <div v-else class="files-list">
              <a
                v-for="file in availableFiles"
                :key="file.name"
                :href="file.url"
                :download="file.name"
                class="file-item"
              >
                <div class="file-icon">{{ getFileIcon(file.name) }}</div>
                <div class="file-info">
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-size">{{ file.sizeFormatted }}</div>
                </div>
                <div class="download-icon">⬇️</div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.downloads-page {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--app-background, #0f0f0f);
  overflow-y: auto;
  z-index: 9999;
}

.close-page-btn {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.close-page-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.downloads-container {
  max-width: 900px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 40px;
}

.header h1 {
  font-size: 2.5rem;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  margin: 0;
}

.info-box {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
}

.info-box h3 {
  margin: 0 0 16px 0;
  color: #8b5cf6;
}

.info-box ol {
  margin: 0;
  padding-left: 24px;
  line-height: 1.8;
}

.info-box li {
  margin-bottom: 8px;
}

.downloads-section {
  text-align: center;
  margin-bottom: 40px;
}

.btn-open-downloads {
  padding: 16px 32px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-weight: 600;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
}

.btn-open-downloads:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.5);
}

.downloads-hint {
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
}

.downloads-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.download-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  text-align: center;
  transition: all 0.3s ease;
}

.download-card:hover {
  transform: translateY(-4px);
  border-color: rgba(139, 92, 246, 0.5);
  background: rgba(139, 92, 246, 0.1);
}

.download-card.disabled {
  opacity: 0.6;
}

.download-card.disabled:hover {
  transform: none;
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.card-icon {
  font-size: 3rem;
  margin-bottom: 16px;
}

.download-card h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
}

.card-description {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 8px 0;
}

.card-size {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  margin: 0 0 20px 0;
}

.btn-download {
  width: 100%;
  text-decoration: none;
  display: block;
  text-align: center;
  padding: 12px 24px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-download:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

.btn-download:disabled {
  background: rgba(255, 255, 255, 0.1);
  cursor: not-allowed;
  opacity: 0.5;
}

.btn-download:disabled:hover {
  transform: none;
  box-shadow: none;
}

.github-section {
  text-align: center;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 40px;
}

.github-section p {
  margin: 0 0 20px 0;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.6;
}

.btn-github {
  padding: 14px 28px;
  background: #24292e;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.btn-github:hover {
  background: #2f363d;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.github-icon {
  font-size: 1.2rem;
}

.instructions {
  background: rgba(255, 255, 255, 0.03);
  border-radius: 16px;
  padding: 32px;
  margin-bottom: 40px;
}

.instructions h3 {
  margin: 0 0 24px 0;
  text-align: center;
  font-size: 1.5rem;
}

.instruction-section {
  margin-bottom: 32px;
}

.instruction-section:last-child {
  margin-bottom: 0;
}

.instruction-section h4 {
  margin: 0 0 16px 0;
  color: #8b5cf6;
  font-size: 1.2rem;
}

.instruction-section ol {
  margin: 0;
  padding-left: 24px;
  line-height: 1.8;
}

.instruction-section li {
  margin-bottom: 12px;
}

.instruction-section code {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #8b5cf6;
}

.footer-info {
  text-align: center;
  padding-top: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
}

.footer-info p {
  margin: 8px 0;
}

.footer-info a {
  color: #8b5cf6;
  text-decoration: none;
  font-weight: 600;
}

.footer-info a:hover {
  text-decoration: underline;
}

.footer-info a:hover {
  text-decoration: underline;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-container {
  background: #1a1a1a;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(139, 92, 246, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  font-size: 1.2rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.loading,
.no-files {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.6);
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  text-decoration: none;
  color: white;
  transition: all 0.3s ease;
}

.file-item:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.5);
  transform: translateX(4px);
}

.file-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 4px;
  word-break: break-word;
}

.file-size {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.85rem;
}

.download-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  opacity: 0.6;
  transition: all 0.3s ease;
}

.file-item:hover .download-icon {
  opacity: 1;
  transform: translateY(2px);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.9);
}

@media (max-width: 768px) {
  .header h1 {
    font-size: 2rem;
  }

  .downloads-grid {
    grid-template-columns: 1fr;
  }

  .instructions,
  .github-section,
  .info-box {
    padding: 20px;
  }
}
</style>
