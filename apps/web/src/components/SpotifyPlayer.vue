<script setup lang="ts">
import { computed } from 'vue'
import { useSpotify } from '../composables/useSpotify'

const { isConnected, track, login, logout, play, pause, next, previous } = useSpotify()

const progress = computed(() => {
  if (!track.value) return 0
  return (track.value.progressMs / track.value.durationMs) * 100
})

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
</script>

<template>
  <div v-if="!isConnected" class="spotify-connect" @click="login">
    <svg class="spotify-logo" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
    <span>Conectar Spotify</span>
  </div>

  <Transition name="sp">
    <div v-if="isConnected && track" class="spotify-player">
      <img v-if="track.albumArt" :src="track.albumArt" alt="" class="sp-art" />
      <div class="sp-info">
        <span class="sp-name">{{ track.name }}</span>
        <span class="sp-artist">{{ track.artist }}</span>
        <div class="sp-progress">
          <div class="sp-bar">
            <div class="sp-bar-fill" :style="{ width: progress + '%' }"></div>
          </div>
          <div class="sp-times">
            <span>{{ formatTime(track.progressMs) }}</span>
            <span>{{ formatTime(track.durationMs) }}</span>
          </div>
        </div>
      </div>
      <div class="sp-controls">
        <button @click="previous" class="sp-btn" title="Anterior">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>
        <button @click="track.isPlaying ? pause() : play()" class="sp-btn sp-btn-main" :title="track.isPlaying ? 'Pausar' : 'Reproducir'">
          <svg v-if="track.isPlaying" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <button @click="next" class="sp-btn" title="Siguiente">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>
        <button @click="logout" class="sp-btn sp-btn-disconnect" title="Desconectar Spotify">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.spotify-connect {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 24px; cursor: pointer;
  background: rgba(30, 215, 96, 0.15);
  border: 1px solid rgba(30, 215, 96, 0.3);
  color: #1db954; font-size: 0.85rem; font-weight: 600;
  transition: all 0.2s;
}
.spotify-connect:hover {
  background: rgba(30, 215, 96, 0.25);
  transform: scale(1.03);
}
.spotify-connect:active { transform: scale(0.97); }
.spotify-logo { width: 20px; height: 20px; }

.spotify-player {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 16px;
  background: var(--glass-bg, rgba(22, 22, 32, 0.85));
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.08));
  backdrop-filter: blur(var(--glass-blur, 18px)) saturate(160%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.4),
    0 0 20px -4px rgba(30, 215, 96, 0.15);
  width: 100%; max-width: 400px;
}

.sp-art {
  width: 52px; height: 52px; border-radius: 8px; flex-shrink: 0;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.sp-info {
  flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
}
.sp-name {
  font-size: 0.85rem; font-weight: 600; color: var(--text-1);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.sp-artist {
  font-size: 0.72rem; color: var(--text-2);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.sp-progress { margin-top: 4px; }
.sp-bar {
  height: 3px; border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;
}
.sp-bar-fill {
  height: 100%; border-radius: 2px;
  background: #1db954;
  transition: width 1s linear;
}
.sp-times {
  display: flex; justify-content: space-between;
  font-size: 0.6rem; color: var(--text-2); margin-top: 2px;
  font-variant-numeric: tabular-nums;
}

.sp-controls {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
}
.sp-btn {
  width: 32px; height: 32px; border-radius: 50%;
  border: none; background: transparent;
  color: var(--text-1); cursor: pointer;
  display: grid; place-items: center;
  transition: all 0.15s;
}
.sp-btn svg { width: 18px; height: 18px; }
.sp-btn:hover { background: rgba(255, 255, 255, 0.1); transform: scale(1.1); }
.sp-btn:active { transform: scale(0.9); }

.sp-btn-main {
  width: 38px; height: 38px;
  background: #1db954; color: #000; border-radius: 50%;
}
.sp-btn-main:hover { background: #1ed760; }

.sp-btn-disconnect {
  width: 24px; height: 24px; opacity: 0.4;
}
.sp-btn-disconnect svg { width: 14px; height: 14px; }
.sp-btn-disconnect:hover { opacity: 1; background: rgba(239, 68, 68, 0.2); color: #ef4444; }

[data-theme='light'] .spotify-player {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1), 0 0 20px -4px rgba(30, 215, 96, 0.15);
}
[data-theme='light'] .sp-bar { background: rgba(0, 0, 0, 0.08); }
[data-theme='light'] .sp-btn { color: var(--text-1); }
[data-theme='light'] .sp-btn:hover { background: rgba(0, 0, 0, 0.08); }

.sp-enter-active { transition: all 0.35s cubic-bezier(0.22, 1.2, 0.36, 1); }
.sp-leave-active { transition: all 0.2s ease; }
.sp-enter-from { opacity: 0; transform: translateY(12px) scale(0.95); }
.sp-leave-to { opacity: 0; transform: translateY(8px) scale(0.97); }

@media (max-width: 640px) {
  .spotify-player {
    max-width: none; border-radius: 14px; padding: 8px 10px; gap: 10px;
  }
  .sp-art { width: 44px; height: 44px; border-radius: 6px; }
  .sp-name { font-size: 0.8rem; }
  .sp-controls { gap: 2px; }
  .sp-btn { width: 28px; height: 28px; }
  .sp-btn svg { width: 16px; height: 16px; }
  .sp-btn-main { width: 34px; height: 34px; }
}
</style>
