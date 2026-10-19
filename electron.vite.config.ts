import react from '@vitejs/plugin-react'
import { defineConfig } from 'electron-vite'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    server: {
      port: 43123,
      strictPort: false,
    },
    plugins: [react()],
  },
})
