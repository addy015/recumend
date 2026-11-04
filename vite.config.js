import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Vite project configuration
export default defineConfig({
  plugins: [react()],
  // Local development server settings
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    },
  },
  // Production preview server headers (CSP + HSTS)
  preview: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://ui-avatars.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com ws: wss:; frame-src https://accounts.google.com; object-src 'none'; base-uri 'self';",
    },
  },
  // Split large dependencies into separate bundle chunks
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('lucide-react')) return 'icons'
            if (id.includes('react') || id.includes('scheduler')) return 'vendor'
          }
        },
      },
    },
  },
})

