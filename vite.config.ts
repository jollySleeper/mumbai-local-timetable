import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE ?? '/mumbai-local-timetable/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        name: 'Mumbai Local Timetable',
        short_name: 'Local Trains',
        display: 'standalone',
        theme_color: '#b91c1c',
        background_color: '#ffffff',
        start_url: '.',
        scope: './',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Precache only the app shell; never the thousands of data shards.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        globIgnores: ['**/data/**'],
        runtimeCaching: [
          {
            urlPattern: /\/data\/(stations|train-index|meta)\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'timetable-index',
              networkTimeoutSeconds: 3,
            },
          },
          {
            urlPattern: /\/data\/(departures|trains)\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'timetable-data',
              expiration: { maxEntries: 500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
})
