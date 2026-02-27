<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSocket } from '../composables/useSocket'

const emit = defineEmits<{
  close: []
}>()

const { socket } = useSocket()

// ─── Trackpad State ───
const trackpadRef = ref<HTMLDivElement | null>(null)
const lastTouch = ref<{ x: number; y: number } | null>(null)
const isDragging = ref(false)
const sensitivity = ref(1.8)

// ─── Scroll State ───
const lastScrollY = ref<number | null>(null)
const lastScrollX = ref<number | null>(null)
const isScrolling = ref(false)
let twoFingerStartTime = 0
let twoFingerMoved = false

// ─── Keyboard State ───
const showKeyboard = ref(false)
const keyboardText = ref('')

// ─── Mouse availability ───
const mouseAvailable = ref(true)

onMounted(() => {
  socket.value?.emit('mouse:status', {}, (res: any) => {
    mouseAvailable.value = res?.available ?? false
  })
})

// ─── Trackpad touch handlers ───
const handleTouchStart = (e: TouchEvent) => {
  e.preventDefault()
  if (e.touches.length === 2) {
    // Two-finger: could be scroll or right-click tap
    twoFingerStartTime = Date.now()
    twoFingerMoved = false
    isScrolling.value = true
    lastScrollY.value = e.touches[0].clientY
    lastScrollX.value = e.touches[0].clientX
    return
  }
  lastTouch.value = {
    x: e.touches[0].clientX,
    y: e.touches[0].clientY,
  }
}

const handleTouchMove = (e: TouchEvent) => {
  e.preventDefault()

  // Two-finger scroll (vertical + horizontal)
  if (
    isScrolling.value &&
    e.touches.length === 2 &&
    lastScrollY.value !== null &&
    lastScrollX.value !== null
  ) {
    const currentY = e.touches[0].clientY
    const currentX = e.touches[0].clientX
    const deltaY = lastScrollY.value - currentY
    const deltaX = lastScrollX.value - currentX
    if (Math.abs(deltaY) > 2 || Math.abs(deltaX) > 2) {
      twoFingerMoved = true
      const payload: { amountY?: number; amountX?: number } = {}
      if (Math.abs(deltaY) > 2) {
        payload.amountY = Math.round(deltaY * 2.5)
      }
      if (Math.abs(deltaX) > 2) {
        payload.amountX = Math.round(-deltaX * 2.5)
      }
      socket.value?.emit('mouse:scroll', payload)
      lastScrollY.value = currentY
      lastScrollX.value = currentX
    }
    return
  }

  if (!lastTouch.value || e.touches.length !== 1) return

  const touch = e.touches[0]
  const dx = (touch.clientX - lastTouch.value.x) * sensitivity.value
  const dy = (touch.clientY - lastTouch.value.y) * sensitivity.value

  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
    socket.value?.emit('mouse:move', {
      dx: Math.round(dx),
      dy: Math.round(dy),
    })
  }

  lastTouch.value = {
    x: touch.clientX,
    y: touch.clientY,
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  if (isScrolling.value) {
    // Two-finger tap (no scroll movement, quick release) → right-click
    const elapsed = Date.now() - twoFingerStartTime
    if (!twoFingerMoved && elapsed < 300) {
      handleRightClick()
    }
    isScrolling.value = false
    lastScrollY.value = null
    lastScrollX.value = null
  }
  lastTouch.value = null
}

// ─── Button handlers ───
const handleLeftClick = () => {
  socket.value?.emit('mouse:click')
}

const handleRightClick = () => {
  socket.value?.emit('mouse:rightClick')
}

const handleDoubleClick = () => {
  socket.value?.emit('mouse:doubleClick')
}

// ─── Tap to click & double-tap-hold to drag ───
let tapStartTime = 0
let tapStartPos = { x: 0, y: 0 }
let lastTapTime = 0
let doubleTapHoldTimer: ReturnType<typeof setTimeout> | null = null
let waitingForDoubleTap = false
const DOUBLE_TAP_WINDOW = 300 // ms between taps to count as double
const HOLD_THRESHOLD = 150 // ms hold after second tap to start drag

const handleTapStart = (e: TouchEvent) => {
  if (e.touches.length === 1) {
    const now = Date.now()
    tapStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY }

    // Check if this is the second tap of a double-tap
    if (now - lastTapTime < DOUBLE_TAP_WINDOW) {
      waitingForDoubleTap = true
      // Start hold timer — if finger stays down, begin drag
      doubleTapHoldTimer = setTimeout(() => {
        if (waitingForDoubleTap) {
          isDragging.value = true
          socket.value?.emit('mouse:pressDown')
          waitingForDoubleTap = false
        }
      }, HOLD_THRESHOLD)
    }

    tapStartTime = now
  }
  handleTouchStart(e)
}

const handleTapEnd = (e: TouchEvent) => {
  // If dragging, release on finger up
  if (isDragging.value) {
    socket.value?.emit('mouse:pressUp')
    isDragging.value = false
  }

  // Cancel double-tap hold detection
  if (doubleTapHoldTimer) {
    clearTimeout(doubleTapHoldTimer)
    doubleTapHoldTimer = null
  }
  waitingForDoubleTap = false

  handleTouchEnd(e)

  // Detect single tap (short touch, minimal movement) → click
  if (e.changedTouches.length === 1) {
    const elapsed = Date.now() - tapStartTime
    const dx = Math.abs(e.changedTouches[0].clientX - tapStartPos.x)
    const dy = Math.abs(e.changedTouches[0].clientY - tapStartPos.y)
    if (elapsed < 200 && dx < 10 && dy < 10) {
      lastTapTime = Date.now()
      handleLeftClick()
    }
  }
}

// ─── Keyboard handlers ───
const handleSendText = () => {
  if (!keyboardText.value.trim()) return
  socket.value?.emit('keyboard:type', { text: keyboardText.value })
  keyboardText.value = ''
}

const handleSpecialKey = (key: string) => {
  socket.value?.emit('keyboard:key', { key })
}

const handleCombo = (keys: string[]) => {
  socket.value?.emit('keyboard:combo', { keys })
}

// ─── Sensitivity ───
const adjustSensitivity = (delta: number) => {
  sensitivity.value = Math.max(0.5, Math.min(4, sensitivity.value + delta))
}
</script>

<template>
  <div class="mouse-controller">
    <!-- Header -->
    <div class="mc-header">
      <button @click="emit('close')" class="mc-back-btn">
        <i class="pi pi-arrow-left"></i>
      </button>
      <h3>Mouse & Teclado</h3>
      <div class="mc-header-actions">
        <button
          @click="showKeyboard = !showKeyboard"
          class="mc-toggle-btn"
          :class="{ active: showKeyboard }"
        >
          <i class="fas fa-keyboard" style="font-size: 1.2rem"></i>
        </button>
      </div>
    </div>

    <div v-if="!mouseAvailable" class="mc-unavailable">
      <i class="pi pi-exclamation-triangle" style="font-size: 2rem"></i>
      <p>Mouse controller no disponible en el servidor</p>
    </div>

    <template v-else>
      <!-- Trackpad Surface -->
      <div
        ref="trackpadRef"
        class="mc-trackpad"
        @touchstart="handleTapStart"
        @touchmove="handleTouchMove"
        @touchend="handleTapEnd"
        @touchcancel="handleTouchEnd"
      >
        <div class="trackpad-hint">
          <i
            class="pi pi-arrows-alt"
            style="font-size: 1.5rem; opacity: 0.2"
          ></i>
          <span>Desliza para mover el cursor</span>
          <span class="trackpad-sub-hint"
            >Toca = click · 2 dedos: toca = derecho, desliza = scroll · Doble
            toque + mantener = arrastrar</span
          >
        </div>

        <!-- Sensitivity indicator -->
        <div class="sensitivity-control">
          <button @click.stop="adjustSensitivity(-0.3)" class="sens-btn">
            −
          </button>
          <span class="sens-label">{{ sensitivity.toFixed(1) }}x</span>
          <button @click.stop="adjustSensitivity(0.3)" class="sens-btn">
            +
          </button>
        </div>

        <!-- Drag indicator -->
        <div v-if="isDragging" class="drag-indicator">🔒 Arrastrando</div>
      </div>

      <!-- Mouse Buttons -->
      <div class="mc-buttons">
        <button @click="handleLeftClick" class="mc-btn mc-btn-left">
          Click
        </button>
        <button @click="handleDoubleClick" class="mc-btn mc-btn-middle">
          Doble
        </button>
        <button @click="handleRightClick" class="mc-btn mc-btn-right">
          Derecho
        </button>
      </div>

      <!-- Keyboard Panel -->
      <div v-if="showKeyboard" class="mc-keyboard">
        <div class="keyboard-input-row">
          <input
            v-model="keyboardText"
            type="text"
            placeholder="Escribe texto para enviar..."
            class="keyboard-input"
            @keyup.enter="handleSendText"
          />
          <button @click="handleSendText" class="keyboard-send-btn">
            <i class="pi pi-send"></i>
          </button>
        </div>

        <!-- Quick keys -->
        <div class="quick-keys">
          <button @click="handleSpecialKey('Return')" class="qk-btn">
            Enter
          </button>
          <button @click="handleSpecialKey('Escape')" class="qk-btn">
            Esc
          </button>
          <button @click="handleSpecialKey('Tab')" class="qk-btn">Tab</button>
          <button @click="handleSpecialKey('Backspace')" class="qk-btn">
            ⌫
          </button>
          <button @click="handleSpecialKey('Delete')" class="qk-btn">
            Del
          </button>
          <button @click="handleSpecialKey('Space')" class="qk-btn">
            Space
          </button>
        </div>

        <!-- Arrow keys -->
        <div class="arrow-keys">
          <div class="arrow-row">
            <button @click="handleSpecialKey('Up')" class="qk-btn arrow-btn">
              ↑
            </button>
          </div>
          <div class="arrow-row">
            <button @click="handleSpecialKey('Left')" class="qk-btn arrow-btn">
              ←
            </button>
            <button @click="handleSpecialKey('Down')" class="qk-btn arrow-btn">
              ↓
            </button>
            <button @click="handleSpecialKey('Right')" class="qk-btn arrow-btn">
              →
            </button>
          </div>
        </div>

        <!-- Combos -->
        <div class="combo-keys">
          <button
            @click="handleCombo(['LeftControl', 'C'])"
            class="qk-btn combo-btn"
          >
            Ctrl+C
          </button>
          <button
            @click="handleCombo(['LeftControl', 'V'])"
            class="qk-btn combo-btn"
          >
            Ctrl+V
          </button>
          <button
            @click="handleCombo(['LeftControl', 'Z'])"
            class="qk-btn combo-btn"
          >
            Ctrl+Z
          </button>
          <button
            @click="handleCombo(['LeftControl', 'A'])"
            class="qk-btn combo-btn"
          >
            Ctrl+A
          </button>
          <button
            @click="handleCombo(['LeftAlt', 'F4'])"
            class="qk-btn combo-btn"
          >
            Alt+F4
          </button>
          <button
            @click="handleCombo(['LeftAlt', 'Tab'])"
            class="qk-btn combo-btn"
          >
            Alt+Tab
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mouse-controller {
  position: fixed;
  inset: 0;
  z-index: 1100;
  display: flex;
  flex-direction: column;
  background: var(--mc-bg);
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* Header */
.mc-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--mc-header-bg);
  border-bottom: 1px solid var(--mc-header-border);
}

.mc-header h3 {
  flex: 1;
  margin: 0;
  font-size: 1.1rem;
  color: var(--mc-text);
}

.mc-back-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: var(--mc-surface);
  color: var(--mc-text);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mc-header-actions {
  display: flex;
  gap: 8px;
}

.mc-toggle-btn {
  width: 40px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: var(--mc-surface);
  color: var(--mc-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.mc-toggle-btn.active {
  background: var(--mc-toggle-active-bg);
  color: var(--mc-toggle-active-text);
}

/* Unavailable state */
.mc-unavailable {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--mc-text-hint-muted);
}

/* Trackpad */
.mc-trackpad {
  flex: 1;
  position: relative;
  touch-action: none;
  user-select: none;
  background: var(--mc-surface-subtle);
  border-bottom: 1px solid var(--mc-surface-border);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.trackpad-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--mc-text-hint);
  font-size: 0.85rem;
  pointer-events: none;
}

.trackpad-sub-hint {
  font-size: 0.7rem;
  opacity: 0.7;
}

.sensitivity-control {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--mc-sens-bg);
  border-radius: 20px;
  padding: 4px 12px;
}

.sens-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--mc-sens-btn-bg);
  color: var(--mc-sens-btn-text);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sens-label {
  font-size: 0.7rem;
  color: var(--mc-text-hint-muted);
  min-width: 30px;
  text-align: center;
}

.drag-indicator {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--mc-drag-active-bg);
  color: var(--mc-drag-active-text);
  padding: 4px 16px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* Mouse Buttons */
.mc-buttons {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
}

.mc-btn {
  flex: 1;
  padding: 16px 8px;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s;
  color: #fff;
}

.mc-btn:active {
  transform: scale(0.95);
  filter: brightness(0.8);
}

.mc-btn-left {
  background: #3b82f6;
  border-radius: 12px 0 0 12px;
}

.mc-btn-middle {
  background: #6366f1;
  border-radius: 0;
}

.mc-btn-right {
  background: #8b5cf6;
  border-radius: 0 12px 12px 0;
}

/* Extra buttons */
.mc-extra-buttons {
  display: flex;
  padding: 0 12px 8px;
  gap: 8px;
}

.mc-btn-drag {
  background: var(--mc-drag-bg);
  color: var(--mc-drag-text);
  border-radius: 10px;
  font-size: 0.85rem;
}

.mc-btn-drag.active {
  background: var(--mc-drag-active-bg);
  color: var(--mc-drag-active-text);
}

/* Keyboard panel */
.mc-keyboard {
  padding: 8px 12px 12px;
  border-top: 1px solid var(--mc-kbd-panel-border);
  background: var(--mc-kbd-panel-bg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.keyboard-input-row {
  display: flex;
  gap: 8px;
}

.keyboard-input {
  flex: 1;
  background: var(--mc-kbd-bg);
  border: 1px solid var(--mc-kbd-border);
  border-radius: 10px;
  padding: 10px 14px;
  color: var(--mc-kbd-text);
  font-size: 0.95rem;
  outline: none;
}

.keyboard-input:focus {
  border-color: rgba(139, 92, 246, 0.5);
}

.keyboard-send-btn {
  width: 44px;
  border-radius: 10px;
  border: none;
  background: #8b5cf6;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.keyboard-send-btn:active {
  transform: scale(0.93);
}

/* Quick keys */
.quick-keys,
.combo-keys {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.qk-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: none;
  background: var(--mc-qk-bg);
  color: var(--mc-qk-text);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.qk-btn:active {
  transform: scale(0.92);
}

.combo-btn {
  background: var(--mc-combo-bg);
  color: var(--mc-combo-text);
}

/* Arrow keys */
.arrow-keys {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.arrow-row {
  display: flex;
  gap: 4px;
}

.arrow-btn {
  width: 44px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}
</style>
