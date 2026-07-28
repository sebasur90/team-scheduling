import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    allowedHosts: ['smoa7001lx', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
        rewrite: (path) => path,
      },
      '/firestore': {
        target: 'http://firebase-emulator:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/firestore/, ''),
        ws: true,
      },
    },
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
  },
})
