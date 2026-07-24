import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "path";

const isMobileBuild = process.env.VITE_MOBILE_BUILD === "true";

export default defineConfig(({ command, mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), "VITE_");
  const envDefine: Record<string, string> = {};
  for (const [key, value] of Object.entries(loadedEnv)) {
    envDefine[`import.meta.env.${key}`] = JSON.stringify(value);
  }

  const plugins = [
    tailwindcss(),
    tsconfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      importProtection: {
        behavior: "error",
        client: {
          files: ["**/server/**"],
          specifiers: ["server-only"],
        },
      },
      server: { entry: "server" },
      ...(isMobileBuild
        ? {
            spa: {
              enabled: true,
              prerender: { outputPath: "index.html" },
            },
          }
        : {}),
    }),
    react(),
  ];

  if (command === "build" && !isMobileBuild) {
    plugins.splice(3, 0, nitro({ defaultPreset: "cloudflare-module" }));
  }

  return {
    define: envDefine,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@veyvio/ops": path.resolve(__dirname, "shared/veyvio-ops"),
        "@veyvio/incidents": path.resolve(__dirname, "shared/veyvio-incidents"),
        "@veyvio/yard": path.resolve(__dirname, "shared/veyvio-yard"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
      ],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins,
    server: { host: "::", port: 8080 },
    ...(isMobileBuild
      ? {
          build: {
            outDir: "dist/client",
            emptyOutDir: true,
          },
        }
      : {}),
  };
});
