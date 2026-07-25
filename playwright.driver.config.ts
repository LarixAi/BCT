import { defineConfig, devices } from "@playwright/test";

const driverPort = 4174;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "driver-gate1-device-exit.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",
  timeout: 120_000,
  projects: [
    {
      name: "android-pixel",
      use: { ...devices["Pixel 7"], browserName: "chromium" },
    },
    {
      name: "ios-iphone",
      use: { ...devices["iPhone 14"], browserName: "chromium" },
    },
  ],
  use: {
    baseURL: `http://127.0.0.1:${driverPort}`,
    trace: "on-first-retry",
    actionTimeout: 30_000,
  },
  webServer: {
    command: `npm run preview -- --port ${driverPort} --host 127.0.0.1`,
    cwd: "./veyvio-driver-App",
    url: `http://127.0.0.1:${driverPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
