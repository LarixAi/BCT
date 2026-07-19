import path from "node:path";
import { fileURLToPath } from "node:url";
import base44 from "@base44/vite-plugin"
import basicSsl from "@vitejs/plugin-basic-ssl"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const mobileDev = process.env.DRIVER_MOBILE === 'true'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  base: './',
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: [
      {
        find: "@core-support/brand/ridova-theme.css",
        replacement: path.resolve(rootDir, "../packages/brand/src/ridova-theme.css"),
      },
      {
        find: "@core-support/brand",
        replacement: path.resolve(rootDir, "../packages/brand/src/index.ts"),
      },
      {
        find: /^@\//,
        replacement: `${path.resolve(rootDir, "./src")}/`,
      },
      {
        find: "date-fns",
        replacement: path.resolve(rootDir, "node_modules/date-fns"),
      },
    ],
  },
  plugins: [
    ...(mobileDev ? [basicSsl()] : []),
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      // Lighter dev server when testing the driver app on device
      hmrNotifier: !mobileDev,
      navigationNotifier: !mobileDev,
      analyticsTracker: !mobileDev,
      visualEditAgent: !mobileDev,
    }),
    react(),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    fs: {
      deny: ["**/android/**"],
    },
  },
  optimizeDeps: {
    entries: ["index.html", "src/**/*.{js,jsx,ts,tsx}"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.{test,e2e.test}.{js,jsx,ts,tsx}"],
  },
})
