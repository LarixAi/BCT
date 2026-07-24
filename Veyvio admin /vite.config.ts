import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@veyvio/incidents': path.resolve(__dirname, '../shared/veyvio-incidents'),
      '@veyvio/ops': path.resolve(__dirname, '../shared/veyvio-ops'),
      '@veyvio/yard': path.resolve(__dirname, '../shared/veyvio-yard'),
    },
  },
  // Vitest picks this up when run via `vitest` / `npm test`.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
} as import('vite').UserConfig & { test?: object })
