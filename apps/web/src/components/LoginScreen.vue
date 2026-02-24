<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const props = defineProps<{
  /** 'setup' = desktop configura PIN; 'login' = móvil ingresa PIN */
  mode: 'setup' | 'login'
}>()

const emit = defineEmits<{
  authenticated: []
}>()

const { setupPin, login } = useAuth()

const pin = ref('')
const confirmPin = ref('')
const error = ref('')
const loading = ref(false)
const shake = ref(false)
const step = ref<'pin' | 'confirm'>('pin')

const pinInputs = ref<HTMLInputElement[]>([])
const confirmInputs = ref<HTMLInputElement[]>([])

const handleInput = (
  inputs: HTMLInputElement[],
  index: number,
  event: Event,
) => {
  const input = event.target as HTMLInputElement
  const value = input.value.replace(/\D/g, '')
  input.value = value

  updatePinFromInputs(inputs)

  if (value && index < 3) {
    inputs[index + 1]?.focus()
  }
}

const handleKeydown = (
  inputs: HTMLInputElement[],
  index: number,
  event: KeyboardEvent,
) => {
  if (
    event.key === 'Backspace' &&
    !(event.target as HTMLInputElement).value &&
    index > 0
  ) {
    inputs[index - 1]?.focus()
  }
  if (event.key === 'Enter') {
    handleSubmit()
  }
}

const handlePaste = (inputs: HTMLInputElement[], event: ClipboardEvent) => {
  event.preventDefault()
  const pasted =
    event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, 4) || ''
  for (let i = 0; i < 4; i++) {
    if (inputs[i]) {
      inputs[i].value = pasted[i] || ''
    }
  }
  updatePinFromInputs(inputs)
  if (pasted.length === 4) {
    handleSubmit()
  }
}

const updatePinFromInputs = (inputs: HTMLInputElement[]) => {
  const value = inputs.map((el) => el?.value || '').join('')
  if (inputs === pinInputs.value) {
    pin.value = value
  } else {
    confirmPin.value = value
  }
}

const handleSubmit = async () => {
  error.value = ''

  if (props.mode === 'setup') {
    if (step.value === 'pin') {
      if (pin.value.length !== 4) {
        error.value = 'Ingresa un PIN de 4 dígitos'
        triggerShake()
        return
      }
      // Go to confirm step
      step.value = 'confirm'
      setTimeout(() => confirmInputs.value[0]?.focus(), 100)
      return
    }

    // Confirm step
    if (confirmPin.value.length !== 4) {
      error.value = 'Confirma el PIN de 4 dígitos'
      triggerShake()
      return
    }

    if (pin.value !== confirmPin.value) {
      error.value = 'Los PINs no coinciden'
      triggerShake()
      clearConfirmInputs()
      return
    }

    loading.value = true
    const result = await setupPin(pin.value)
    loading.value = false

    if (result.success) {
      emit('authenticated')
    } else {
      error.value = result.message || 'Error al configurar PIN'
      triggerShake()
      resetAll()
    }
  } else {
    // Login mode (mobile)
    if (pin.value.length !== 4) {
      error.value = 'Ingresa el PIN de 4 dígitos'
      triggerShake()
      return
    }

    loading.value = true
    const result = await login(pin.value)
    loading.value = false

    if (result.success) {
      emit('authenticated')
    } else {
      error.value = result.message || 'PIN incorrecto'
      triggerShake()
      clearPinInputs()
    }
  }
}

const goBackToPin = () => {
  step.value = 'pin'
  confirmPin.value = ''
  error.value = ''
  clearConfirmInputs()
  setTimeout(() => pinInputs.value[0]?.focus(), 100)
}

const clearPinInputs = () => {
  pinInputs.value.forEach((el) => {
    if (el) el.value = ''
  })
  pin.value = ''
  pinInputs.value[0]?.focus()
}

const clearConfirmInputs = () => {
  confirmInputs.value.forEach((el) => {
    if (el) el.value = ''
  })
  confirmPin.value = ''
  confirmInputs.value[0]?.focus()
}

const resetAll = () => {
  step.value = 'pin'
  clearPinInputs()
  clearConfirmInputs()
}

const triggerShake = () => {
  shake.value = true
  setTimeout(() => {
    shake.value = false
  }, 500)
}

const setPinRef = (el: any, index: number) => {
  if (el) pinInputs.value[index] = el
}

const setConfirmRef = (el: any, index: number) => {
  if (el) confirmInputs.value[index] = el
}
</script>

<template>
  <div class="login-overlay">
    <div class="login-card" :class="{ shake }">
      <!-- Setup mode (desktop) -->
      <template v-if="mode === 'setup'">
        <div class="login-icon">🔧</div>
        <h2 class="login-title">Configurar PIN</h2>

        <!-- Step 1: Enter PIN -->
        <template v-if="step === 'pin'">
          <p class="login-subtitle">
            Crea un PIN de 4 dígitos para proteger tu servidor
          </p>

          <div class="pin-container">
            <input
              v-for="i in 4"
              :key="'pin-' + i"
              :ref="(el) => setPinRef(el, i - 1)"
              type="tel"
              inputmode="numeric"
              maxlength="1"
              class="pin-input"
              :class="{ 'pin-error': error }"
              @input="handleInput(pinInputs, i - 1, $event)"
              @keydown="handleKeydown(pinInputs, i - 1, $event)"
              @paste="handlePaste(pinInputs, $event)"
              :disabled="loading"
              autocomplete="off"
            />
          </div>
        </template>

        <!-- Step 2: Confirm PIN -->
        <template v-else>
          <p class="login-subtitle">Confirma tu PIN</p>

          <div class="pin-container">
            <input
              v-for="i in 4"
              :key="'confirm-' + i"
              :ref="(el) => setConfirmRef(el, i - 1)"
              type="tel"
              inputmode="numeric"
              maxlength="1"
              class="pin-input"
              :class="{ 'pin-error': error }"
              @input="handleInput(confirmInputs, i - 1, $event)"
              @keydown="handleKeydown(confirmInputs, i - 1, $event)"
              @paste="handlePaste(confirmInputs, $event)"
              :disabled="loading"
              autocomplete="off"
            />
          </div>

          <button class="back-btn" @click="goBackToPin" :disabled="loading">
            ← Volver
          </button>
        </template>
      </template>

      <!-- Login mode (mobile) -->
      <template v-else>
        <div class="login-icon">🔐</div>
        <h2 class="login-title">Spartan Hub</h2>
        <p class="login-subtitle">Ingresa el PIN para conectar</p>

        <div class="pin-container">
          <input
            v-for="i in 4"
            :key="'login-' + i"
            :ref="(el) => setPinRef(el, i - 1)"
            type="tel"
            inputmode="numeric"
            maxlength="1"
            class="pin-input"
            :class="{ 'pin-error': error }"
            @input="handleInput(pinInputs, i - 1, $event)"
            @keydown="handleKeydown(pinInputs, i - 1, $event)"
            @paste="handlePaste(pinInputs, $event)"
            :disabled="loading"
            autocomplete="off"
          />
        </div>
      </template>

      <p v-if="error" class="error-message">{{ error }}</p>

      <button
        class="login-btn"
        :disabled="
          loading ||
          ((step === 'pin' ? pin.length !== 4 : confirmPin.length !== 4) &&
            mode === 'setup') ||
          (mode === 'login' && (loading || pin.length !== 4))
        "
        @click="handleSubmit"
      >
        <span v-if="loading" class="spinner"></span>
        <template v-else>
          <span v-if="mode === 'setup' && step === 'pin'">Continuar</span>
          <span v-else-if="mode === 'setup' && step === 'confirm'"
            >Configurar PIN</span
          >
          <span v-else>Conectar</span>
        </template>
      </button>

      <p class="login-hint" v-if="mode === 'setup'">
        🛡️ Este PIN se pedirá al conectar desde otros dispositivos
      </p>
      <p class="login-hint" v-else>
        💡 El PIN fue configurado desde la app de escritorio
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--confirm-bg-light, #23233a);
  z-index: 9000;
}

.login-card {
  background: var(--edit-bg-color, rgba(41, 41, 41, 0.9));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px 40px;
  width: 90%;
  max-width: 380px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.4s ease;
}

.login-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.login-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--confirm-text-light, #fff);
  margin: 0 0 8px;
}

.login-subtitle {
  font-size: 0.95rem;
  color: var(--hint-color, rgba(255, 255, 255, 0.5));
  margin: 0 0 32px;
}

.pin-container {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.pin-input {
  width: 56px;
  height: 64px;
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 14px;
  background: var(--form-bg-color, rgba(255, 255, 255, 0.1));
  color: var(--confirm-text-light, #fff);
  font-size: 1.8rem;
  font-weight: 700;
  text-align: center;
  outline: none;
  transition: all 0.2s;
  caret-color: #8b5cf6;
}

.pin-input:focus {
  border-color: #8b5cf6;
  background: rgba(139, 92, 246, 0.1);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2);
}

.pin-input.pin-error {
  border-color: #ef4444;
}

.pin-input:disabled {
  opacity: 0.5;
}

.error-message {
  color: #ef4444;
  font-size: 0.85rem;
  margin: 0 0 16px;
  font-weight: 500;
}

.back-btn {
  background: none;
  border: none;
  color: var(--hint-color, rgba(255, 255, 255, 0.5));
  font-size: 0.9rem;
  cursor: pointer;
  margin-bottom: 16px;
  padding: 6px 12px;
  border-radius: 8px;
  transition: all 0.2s;
}

.back-btn:hover {
  color: var(--confirm-text-light, #fff);
  background: rgba(255, 255, 255, 0.1);
}

.login-btn {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.login-hint {
  margin: 24px 0 0;
  font-size: 0.8rem;
  color: var(--hint-color, rgba(255, 255, 255, 0.4));
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.shake {
  animation: shakeAnim 0.4s ease;
}

@keyframes shakeAnim {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-10px);
  }
  40% {
    transform: translateX(10px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
}
</style>
