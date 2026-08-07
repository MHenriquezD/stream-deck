import { ref, onMounted, onUnmounted, computed } from 'vue'
import { Capacitor } from '@capacitor/core'

const CLIENT_ID = '9892ad5321dd410ca237dbd24a4673bc'
const isNative = Capacitor.isNativePlatform()
const REDIRECT_URI = isNative
  ? 'spartanhub://callback'
  : 'http://127.0.0.1:5173/callback'
const SCOPES = 'user-read-playback-state user-modify-playback-state user-read-currently-playing'
const TOKEN_KEY = 'spotify_token'
const EXPIRY_KEY = 'spotify_token_expiry'
const REFRESH_KEY = 'spotify_refresh_token'
const VERIFIER_KEY = 'spotify_code_verifier'
const STATE_KEY = 'spotify_auth_state'
const POLL_MS = 4000
const API_BASE = 'https://api.spotify.com/v1'
const AUTH_TIMEOUT_MS = 120000

export interface SpotifyTrack {
  name: string
  artist: string
  album: string
  albumArt: string
  isPlaying: boolean
  progressMs: number
  durationMs: number
}

const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY))
const track = ref<SpotifyTrack | null>(null)
const isConnected = computed(() => !!accessToken.value)

let pollTimer: ReturnType<typeof setInterval> | null = null
let refreshLock: Promise<void> | null = null

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from(crypto.getRandomValues(new Uint8Array(length)),
    b => chars[b % chars.length]).join('')
}

function cleanupAuthState() {
  localStorage.removeItem(VERIFIER_KEY)
  localStorage.removeItem(STATE_KEY)
}

function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') return ''
  return str.replace(/[<>&"']/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;'
  }[c] || c))
}

async function login() {
  const verifier = generateRandomString(128)
  const state = generateRandomString(64)
  localStorage.setItem(VERIFIER_KEY, verifier)
  localStorage.setItem(STATE_KEY, state)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  const authUrl = `https://accounts.spotify.com/authorize?${params}`

  if (window.electronAPI?.spotifyAuth) {
    const code = await window.electronAPI.spotifyAuth(authUrl, REDIRECT_URI)
    if (code) {
      await handleCallback(code, state)
      startPolling()
    } else {
      cleanupAuthState()
    }
  } else if (isNative) {
    const { Browser } = await import('@capacitor/browser')
    const { App } = await import('@capacitor/app')

    let timeoutId: ReturnType<typeof setTimeout>
    const listener = await App.addListener('appUrlOpen', async (event) => {
      if (!event.url.startsWith('spartanhub://callback')) return
      clearTimeout(timeoutId)

      const parsed = new URL(event.url.replace('spartanhub://', 'https://'))
      const code = parsed.searchParams.get('code')
      const returnedState = parsed.searchParams.get('state')

      if (code && returnedState === state) {
        await handleCallback(code, state)
        startPolling()
      } else {
        cleanupAuthState()
      }
      await Browser.close()
      listener.remove()
    })

    timeoutId = setTimeout(() => {
      listener.remove()
      cleanupAuthState()
    }, AUTH_TIMEOUT_MS)

    await Browser.open({ url: authUrl })
  } else {
    window.location.href = authUrl
  }
}

async function handleCallback(code: string, state?: string) {
  const verifier = localStorage.getItem(VERIFIER_KEY)
  const savedState = localStorage.getItem(STATE_KEY)
  if (!verifier) return

  if (state && savedState && state !== savedState) {
    cleanupAuthState()
    return
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  const data = await res.json()
  if (data.access_token) {
    accessToken.value = data.access_token
    localStorage.setItem(TOKEN_KEY, data.access_token)
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000))
    if (data.refresh_token) {
      localStorage.setItem(REFRESH_KEY, data.refresh_token)
    }
  }
  cleanupAuthState()
}

async function refreshToken() {
  if (refreshLock) { await refreshLock; return }

  refreshLock = (async () => {
    const refresh = localStorage.getItem(REFRESH_KEY)
    if (!refresh) { logout(); return }

    try {
      const res = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          grant_type: 'refresh_token',
          refresh_token: refresh,
        }),
      })

      const data = await res.json()
      if (data.access_token) {
        accessToken.value = data.access_token
        localStorage.setItem(TOKEN_KEY, data.access_token)
        localStorage.setItem(EXPIRY_KEY, String(Date.now() + data.expires_in * 1000))
        if (data.refresh_token) {
          localStorage.setItem(REFRESH_KEY, data.refresh_token)
        }
      } else {
        logout()
      }
    } catch {
      logout()
    }
  })()

  await refreshLock
  refreshLock = null
}

function isTokenExpired(): boolean {
  const expiry = localStorage.getItem(EXPIRY_KEY)
  if (!expiry) return true
  return Date.now() > Number(expiry) - 60000
}

async function spotifyFetch(endpoint: string, options: RequestInit = {}) {
  if (!endpoint.startsWith('/')) return null

  if (isTokenExpired()) await refreshToken()
  if (!accessToken.value) return null

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken.value}`, ...options.headers },
  })

  if (res.status === 401) {
    await refreshToken()
    if (!accessToken.value) return null
    return fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken.value}`, ...options.headers },
    })
  }

  return res
}

async function fetchNowPlaying() {
  try {
    const res = await spotifyFetch('/me/player/currently-playing')
    if (!res || res.status === 204) { track.value = null; return }
    const data = await res.json()
    if (!data?.item) { track.value = null; return }

    track.value = {
      name: sanitizeString(data.item.name),
      artist: sanitizeString(data.item.artists?.map((a: { name: string }) => a.name).join(', ')),
      album: sanitizeString(data.item.album?.name),
      albumArt: data.item.album?.images?.[0]?.url ?? '',
      isPlaying: !!data.is_playing,
      progressMs: Number(data.progress_ms) || 0,
      durationMs: Number(data.item.duration_ms) || 0,
    }
  } catch {
    /* ignore network errors */
  }
}

async function play() {
  await spotifyFetch('/me/player/play', { method: 'PUT' })
  if (track.value) track.value.isPlaying = true
}

async function pause() {
  await spotifyFetch('/me/player/pause', { method: 'PUT' })
  if (track.value) track.value.isPlaying = false
}

async function next() {
  await spotifyFetch('/me/player/next', { method: 'POST' })
  setTimeout(fetchNowPlaying, 500)
}

async function previous() {
  await spotifyFetch('/me/player/previous', { method: 'POST' })
  setTimeout(fetchNowPlaying, 500)
}

function logout() {
  accessToken.value = null
  track.value = null
  stopPolling()
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EXPIRY_KEY)
  localStorage.removeItem(REFRESH_KEY)
  cleanupAuthState()
}

function startPolling() {
  if (pollTimer) return
  fetchNowPlaying()
  pollTimer = setInterval(fetchNowPlaying, POLL_MS)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

export function useSpotify() {
  onMounted(() => {
    if (accessToken.value) startPolling()
  })

  onUnmounted(() => {
    stopPolling()
  })

  return {
    isConnected,
    track,
    login,
    logout,
    handleCallback,
    play,
    pause,
    next,
    previous,
    startPolling,
    fetchNowPlaying,
  }
}
