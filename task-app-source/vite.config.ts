import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: '../client',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/server': {
        target: 'https://taskmanager-60047186223.development.catalystserverless.in',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
