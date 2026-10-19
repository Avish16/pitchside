import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'
import { resolve } from 'node:path'

const shared = {
  externalizeDeps: {
    exclude: ['@pitchside/shared'],
  },
}

export default defineConfig({
  main: {
    build: shared,
  },
  preload: {
    build: shared,
  },
  renderer: {
    server: {
      port: 43123,
      strictPort: false,
    },
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          overlay: resolve(__dirname, 'src/renderer/overlay.html'),
          panel: resolve(__dirname, 'src/renderer/panel.html'),
        },
      },
    },
  },
})
