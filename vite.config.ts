// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

const isMobileBuild = process.env.VITE_MOBILE_BUILD === "true";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ...(isMobileBuild
      ? {
          spa: {
            enabled: true,
            prerender: {
              outputPath: "index.html",
            },
          },
        }
      : {}),
  },
  // Capacitor ships a static SPA bundle — no Nitro server in the APK.
  nitro: isMobileBuild ? false : undefined,
  vite: {
    resolve: {
      alias: {
        "@veyvio/ops": path.resolve(__dirname, "shared/veyvio-ops"),
        "@veyvio/incidents": path.resolve(__dirname, "shared/veyvio-incidents"),
      },
    },
    ...(isMobileBuild
      ? {
          build: {
            outDir: "dist/client",
            emptyOutDir: true,
          },
        }
      : {}),
  },
});
