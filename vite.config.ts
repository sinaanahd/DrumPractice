import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Tempo — Drum Training',
        short_name: 'Tempo',
        description: 'A calm, offline-first personal drum practice companion.',
        theme_color: '#17231f',
        background_color: '#f3f1eb',
        display: 'standalone',
        start_url: '/',
        orientation: 'any',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true
      },
      devOptions: { enabled: true }
    })
  ]
})
