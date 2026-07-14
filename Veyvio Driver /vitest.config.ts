import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.output/**"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@veyvio/ops": path.resolve(__dirname, "../shared/veyvio-ops"),
      "@veyvio/incidents": path.resolve(__dirname, "../shared/veyvio-incidents"),
    },
  },
});
