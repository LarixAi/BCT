import path from "node:path";
import { fileURLToPath } from "node:url";
import base44 from "@base44/vite-plugin"
import basicSsl from "@vitejs/plugin-basic-ssl"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const mobileDev = process.env.DRIVER_MOBILE === 'true'
const rootDir = path.dirname(fileURLToPath(import.meta.url))

const enableBase44 = process.env.VITE_ENABLE_BASE44 === 'true'
const enablePhvModule = process.env.VITE_ENABLE_PHV_MODULE === 'true'
const useLegacyBase44 = enableBase44 || enablePhvModule

// https://vite.dev/config/
export default defineConfig({
  base: './',
  logLevel: 'error', // Suppress warnings, only show errors
  resolve: {
    alias: [
      ...(useLegacyBase44
        ? []
        : [
            {
              find: "@/api/base44Client",
              replacement: path.resolve(rootDir, "./src/api/base44Client.stub.js"),
            },
            {
              find: "@base44/sdk",
              replacement: path.resolve(rootDir, "./src/api/base44-sdk.stub.js"),
            },
          ]),
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
    ...(enableBase44
      ? [
          base44({
            legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
            hmrNotifier: !mobileDev,
            navigationNotifier: !mobileDev,
            analyticsTracker: !mobileDev,
            visualEditAgent: !mobileDev,
          }),
        ]
      : []),
    react(),
    {
      name: "capacitor-strip-crossorigin",
      transformIndexHtml(html) {
        // WKWebView on iOS fails to load ES modules when crossorigin is set on capacitor:// URLs.
        return html.replace(/\s+crossorigin(?:="[^"]*")?/g, "");
      },
    },
  ],
  build: {
    modulePreload: false,
  },
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
