import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '..', '')
  const frontendPort = Number(process.env.VITE_PORT || env.VITE_PORT || 3000)
  const apiTarget = process.env.VITE_API_TARGET || env.VITE_API_TARGET || 'http://127.0.0.1:5000'

  return {
    envDir: '..',
    plugins: [react(), tailwindcss()],
    server: {
      host: '127.0.0.1',
      port: frontendPort,
      // Never silently open a different port and accidentally leave the user on an old build.
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        }
      }
    }
  }
})
