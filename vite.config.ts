import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FieldWork — Sistem Operasional & Penawaran',
        short_name: 'FieldWork',
        description: 'Sistem Otomasi Penawaran (AR & PCO), SPK, dan Dokumentasi Lapangan PT Guci Emas Pratama.',
        theme_color: '#1a5c38',
        background_color: '#faf9f7',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: [],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 3500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor-three';
            if (id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('xlsx')) return 'vendor-xlsx';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('leaflet')) return 'vendor-maps';
          }
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    hmr: false,
  },
});
