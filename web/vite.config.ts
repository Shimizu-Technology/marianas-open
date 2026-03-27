import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'images/logos/mo-logo-white.png',
        'images/logos/mo-logo-black.png',
        'robots.txt',
      ],
      manifest: {
        name: 'Marianas Open BJJ Championship',
        short_name: 'Marianas Open',
        description: "Guam's premier international Brazilian Jiu-Jitsu championship. Tournament calendar, rankings, results, and registration.",
        theme_color: '#07111f',
        background_color: '#07111f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'en',
        categories: ['sports', 'martial arts', 'events'],
        icons: [
          {
            src: '/images/pwa/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/pwa/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/images/pwa/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [
          {
            src: '/images/pwa/screenshot-wide.jpg',
            sizes: '1280x800',
            type: 'image/jpeg',
            form_factor: 'wide',
            label: 'Marianas Open — Tournament Calendar',
          },
          {
            src: '/images/pwa/screenshot-mobile.jpg',
            sizes: '390x844',
            type: 'image/jpeg',
            form_factor: 'narrow',
            label: 'Marianas Open — Mobile',
          },
        ],
        shortcuts: [
          {
            name: 'Tournament Calendar',
            short_name: 'Calendar',
            description: 'View upcoming BJJ tournaments',
            url: '/calendar',
            icons: [{ src: '/images/pwa/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Rankings',
            short_name: 'Rankings',
            description: 'ASJJF competitor rankings',
            url: '/rankings',
            icons: [{ src: '/images/pwa/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MiB — covers large tournament posters
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg,woff2}'],
        runtimeCaching: [
          {
            // Cache API calls for events, rankings, settings
            urlPattern: /^https:\/\/marianas-open-api\.onrender\.com\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mo-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 4, // 4 hours
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            // Cache Google Translate API
            urlPattern: /^https:\/\/translate\.googleapis\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-translate-cache',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
              },
            },
          },
          {
            // Cache Cloudinary / CDN images
            urlPattern: /^https:\/\/res\.cloudinary\.com\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
