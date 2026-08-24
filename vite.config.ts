import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    assetsInlineLimit: 4096, // Only inline assets < 4kB; keep woff2 files separate
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Recharts and charting internals (used only in TaxReports analytics tab)
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // Core React runtime (shared across all pages)
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/react-router-dom/')) {
            return 'vendor-react';
          }
          // UI icons (lucide-react used throughout the app)
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          // Keep remaining node_modules in a general vendor chunk
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    chunkSizeWarningLimit: 600, // Suppress warnings for vendor chunks
  },
})
