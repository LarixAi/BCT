import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import path from "path";

const isMobileBuild = process.env.VITE_MOBILE_BUILD === "true";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    ...(isMobileBuild
      ? {
          spa: {
            enabled: true,
            prerender: { outputPath: "index.html" },
          },
        }
      : {}),
  },
  nitro: isMobileBuild ? false : undefined,
  vite: {
    resolve: {
      alias: {
        "@veyvio/incidents": path.resolve(__dirname, "../shared/veyvio-incidents"),
        "@veyvio/ops": path.resolve(__dirname, "../shared/veyvio-ops"),
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
