import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";
import { handleDemoSubmission } from "./server/demo-pipeline";

function demoApiPlugin() {
  return {
    name: "veyvio-demo-api",
    configureServer(server: import("vite").ViteDevServer) {
      server.middlewares.use("/api/demo", (req, res) => {
        void handleDemoSubmission(req, res);
      });
    },
    configurePreviewServer(server: import("vite").PreviewServer) {
      server.middlewares.use("/api/demo", (req, res) => {
        void handleDemoSubmission(req, res);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), demoApiPlugin()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
  preview: {
    port: 5175,
    strictPort: true,
  },
});
