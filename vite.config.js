import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Minify CSS
    cssMinify: true,
    // Tree-shake target
    target: 'es2020',
    // Optimize chunks
    rollupOptions: {
      output: {
        // Split chunks for better caching and reduced unused JS
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          // Split admin pages into separate chunk (only loaded when visiting /admin)
          if (id.includes('/components/Admin')) {
            return 'admin'
          }
          // Split legal pages (only loaded when visiting /terms or /privacy)
          if (id.includes('/pages/')) {
            return 'pages'
          }
        }
      }
    },
    // Use esbuild for fast minification with dead code elimination
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger']
    }
  }
})
