/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Cost Control is a workspace app. Load the shared, git-ignored Veyvio
  // frontend environment from the repository root.
  envDir: '..',
  plugins: [react(), tailwindcss()],
  server: { port: 5176 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
