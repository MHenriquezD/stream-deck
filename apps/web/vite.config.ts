import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
// https://vite.dev/config/
export default defineConfig({
  base: './',

  server: {
    host: '0.0.0.0',
    port: 5173,
  },

  // ⭐ Asegurar que public/ se copie
  publicDir: 'public',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    copyPublicDir: true, // ⭐ Copiar contenido de public/
    rollupOptions: {
      output: {
        // Mantener nombres de archivos de assets
        assetFileNames: (assetInfo) => {
          // Si es un SVG de icons, mantener la ruta
          if (
            assetInfo.name?.endsWith('.svg') &&
            assetInfo.name.includes('icons/')
          ) {
            return 'icons/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        },
      },
    },
  },

  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'icons/**/*.svg'], // ⭐ Incluir todos los SVGs
      manifest: {
        name: 'Spartan Hub',
        short_name: 'SpartanHub',
        description: 'Spartan Hub - Control your PC with a custom stream deck',
        theme_color: '#8b5cf6',
        background_color: '#0f0f0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'], // ⭐ Incluir SVG e ICO
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/command'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // ⭐ Cache para iconos
          {
            urlPattern: /\/icons\/.+\.svg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'icons-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 86400 * 30, // 30 días
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // ⭐ Agrega esto también
      '@shared/core': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
})
