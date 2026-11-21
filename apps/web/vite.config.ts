/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      pwaAssets: { config: true },
      manifest: {
        name: 'MIGO',
        short_name: 'MIGO',
        description: 'MDRRMO Miagao incident reporting and response',
        lang: 'en',
        start_url: '/',
        display: 'standalone',
        theme_color: '#233052',
        background_color: '#ffffff',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        /*
         * The map page's ~1 MB bundle stays out of the install-time precache,
         * so only people who open Map download it (NFR9). It's cached on first
         * use instead; hashed file names make CacheFirst safe.
         */
        globIgnores: ['**/assets/map-*'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/map-[^/]+\.(?:js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-assets',
              // Old builds' files drop out instead of piling up.
              expiration: { maxEntries: 4 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
  },
});
