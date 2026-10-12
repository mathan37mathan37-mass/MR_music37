import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1500,
  },
  server: {
    proxy: {
      '/supabase-storage': {
        target: 'https://fcxspskofubbmqtyqlrw.supabase.co/storage/v1/object/public',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/supabase-storage/, ''),
      },
    },
  },
})
