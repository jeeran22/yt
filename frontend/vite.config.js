import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: the backend (src/server.js) listens on http://localhost:1000 and
// exposes endpoints at the root (e.g. GET /health, POST /generate-image).
// The frontend always talks to "/api/..." and vite rewrites the prefix so the
// backend sees plain paths — CORS-free local development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:1000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});