<script setup lang="ts">
const releases = [
  {
    id: 'windows',
    name: 'Windows',
    icon: '🪟',
    file: 'StreamDeck-Server-Windows-v1.0.0.zip',
    description: 'Ejecutable para Windows 10/11 (64-bit)',
    size: '~40 MB',
  },
  {
    id: 'macos',
    name: 'macOS',
    icon: '🍎',
    file: 'StreamDeck-Server-macOS-v1.0.0.zip',
    description: 'Ejecutable para macOS (Intel & Apple Silicon)',
    size: '~40 MB',
  },
  {
    id: 'linux',
    name: 'Linux',
    icon: '🐧',
    file: 'StreamDeck-Server-Linux-v1.0.0.zip',
    description: 'Ejecutable para Linux (64-bit)',
    size: '~40 MB',
  },
]

const version = '1.0.0'

const downloadFile = (file: string) => {
  const link = document.createElement('a')
  link.href = `/downloads/${file}`
  link.download = file
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<template>
  <div class="downloads-page">
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

      <div class="downloads-grid">
        <div
          v-for="release in releases"
          :key="release.id"
          class="download-card"
        >
          <div class="card-icon">{{ release.icon }}</div>
          <h3>{{ release.name }}</h3>
          <p class="card-description">{{ release.description }}</p>
          <p class="card-size">{{ release.size }}</p>
          <button @click="downloadFile(release.file)" class="btn-download">
            Descargar
          </button>
        </div>
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
              Ingresa la IP del servidor: <code>http://192.168.x.x:3000</code>
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
  </div>
</template>

<style scoped>
.downloads-page {
  min-height: 100vh;
  padding: 40px 20px;
  background: var(--app-background, #0f0f0f);
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
