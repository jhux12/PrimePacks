import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "commerce.spec.ts",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:3001",
    headless: true,
    trace: "retain-on-failure",
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox"] }
      : {},
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node_modules/.bin/vite --host 127.0.0.1 --port 3001 --strictPort",
    url: "http://127.0.0.1:3001",
    reuseExistingServer: !process.env.CI,
  },
});
