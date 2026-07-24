import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "shared/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@veyvio/ops": path.resolve(__dirname, "./shared/veyvio-ops"),
      "@veyvio/incidents": path.resolve(__dirname, "./shared/veyvio-incidents"),
      "@veyvio/yard": path.resolve(__dirname, "./shared/veyvio-yard"),
    },
  },
});
