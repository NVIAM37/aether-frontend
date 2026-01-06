import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Server configuration
  server: {
    host: true, // Allow external access
    port: 5173,
    open: true, // Auto-open browser
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild', // Use esbuild instead of terser
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          leaflet: ['leaflet'],
          socket: ['socket.io-client'],
        },
      },
    },
  },
  
  // Development optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'leaflet', 'socket.io-client'],
  },
})
