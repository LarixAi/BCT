import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: process.env.WEBSITE_BASE_URL ?? "http://localhost:5175",
    trace: "on-first-retry",
  },
  webServer: process.env.WEBSITE_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        port: 5175,
        reuseExistingServer: true,
      },
});
