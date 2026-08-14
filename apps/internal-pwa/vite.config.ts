/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['vip-club-mark.svg'],
      manifest: {
        name: 'VIP Club Internal Management',
        short_name: 'VIP Club',
        description: 'VIP Club role-based internal management workbench',
        theme_color: '#ffffff',
        background_color: '#f4f6f8',
        display: 'standalone',
        start_url: base,
        icons: [{ src: `${base}vip-club-mark.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { navigateFallback: `${base}index.html`, runtimeCaching: [], cleanupOutdatedCaches: true },
      devOptions: { enabled: true },
    }),
  ],
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4173 },
  test: {
    environment: 'jsdom',
    testTimeout: 10000,
    setupFiles: './src/test/setup.ts',
    css: true,
    alias: {
      'virtual:pwa-register/react': fileURLToPath(new URL('./src/test/pwaRegisterMock.ts', import.meta.url)),
    },
  },
})
