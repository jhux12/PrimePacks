import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "live-commerce.spec.ts",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://127.0.0.1:3002",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 1000 },
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  webServer: {
    command:
      "VITE_USE_EMULATORS=true node_modules/.bin/vite build --outDir test-artifacts/integration-site && node_modules/.bin/vite preview --outDir test-artifacts/integration-site --host 127.0.0.1 --port 3002 --strictPort",
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
  },
});
