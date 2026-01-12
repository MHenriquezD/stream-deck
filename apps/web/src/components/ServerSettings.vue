<script setup lang="ts">
import { onMounted, ref } from 'vue'

const show = defineModel<boolean>('show', { required: true })
const serverUrl = ref('http://localhost:3000')
const isConnecting = ref(false)
const connectionStatus = ref<'success' | 'error' | null>(null)

onMounted(() => {
  const saved = localStorage.getItem('serverUrl')
  if (saved) {
    serverUrl.value = saved
  }
})

const testConnection = async () => {
  isConnecting.value = true
  connectionStatus.value = null

  try {
    const response = await fetch(`${serverUrl.value}/command`, {
      method: 'GET',
    })

    if (response.ok) {
      connectionStatus.value = 'success'
    } else {
      connectionStatus.value = 'error'
    }
  } catch (error) {
    connectionStatus.value = 'error'
  } finally {
    isConnecting.value = false
  }
}

const save = () => {
  localStorage.setItem('serverUrl', serverUrl.value)
  window.location.reload()
}

const close = () => {
  show.value = false
}
</script>

<template>
  <div v-if="show" class="settings-overlay" @click="close">
    <div class="settings-dialog" @click.stop>
      <div class="settings-header">
        <h2>⚙️ Configuración del Servidor</h2>
        <button @click="close" class="close-btn">✕</button>
      </div>

      <div class="settings-content">
        <div class="info-box">
          <p>
            <strong>Conecta desde otro dispositivo:</strong><br />
            1. Inicia el servidor en tu PC<br />
            2. Anota la IP local que aparece en la consola<br />
            3. En tu tablet/móvil, ingresa: http://[IP]:3000<br />
            4. Guarda y recarga la página
          </p>
        </div>

        <div class="form-group">
          <label for="serverUrl">URL del Servidor</label>
          <input
            id="serverUrl"
            v-model="serverUrl"
            type="text"
            placeholder="http://192.168.1.100:3000"
            class="server-input"
          />
          <small>Ejemplo: http://192.168.1.100:3000</small>
        </div>

        <button
          @click="testConnection"
          :disabled="isConnecting"
          class="btn-test"
        >
          {{ isConnecting ? '🔄 Probando...' : '🔍 Probar Conexión' }}
        </button>

        <div v-if="connectionStatus" class="connection-result">
          <div v-if="connectionStatus === 'success'" class="success">
            ✅ Conexión exitosa
          </div>
          <div v-else class="error">
            ❌ No se pudo conectar. Verifica la IP y que el servidor esté
            corriendo.
          </div>
        </div>
      </div>

      <div class="settings-footer">
        <button @click="close" class="btn-cancel">Cancelar</button>
        <button @click="save" class="btn-save">💾 Guardar y Recargar</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s;
}

.settings-dialog {
  background: linear-gradient(145deg, #1a1a1a, #0f0f0f);
  border-radius: 20px;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s;
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

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.settings-header h2 {
  margin: 0;
  font-size: 1.4rem;
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

.settings-content {
  padding: 24px;
}

.info-box {
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.info-box strong {
  color: #8b5cf6;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

.server-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-family: 'Courier New', monospace;
  transition: all 0.3s;
}

.server-input:focus {
  outline: none;
  border-color: #8b5cf6;
  background: rgba(255, 255, 255, 0.08);
}

.form-group small {
  display: block;
  margin-top: 6px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
}

.btn-test {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 16px;
}

.btn-test:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

.btn-test:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.connection-result {
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
}

.connection-result .success {
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  color: #4ade80;
}

.connection-result .error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.settings-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-cancel,
.btn-save {
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.15);
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  color: #fff;
}

.btn-save:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}
</style>
