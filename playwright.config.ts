import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  outputDir: "./test-results/playwright",
  use: {
    baseURL: "http://127.0.0.1:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:4174/health",
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      DB_PATH: `/tmp/research-portal-playwright-${process.pid}-${Date.now()}`,
      API_PORT: "4174",
      PORTAL_API_ORIGIN: "http://127.0.0.1:4174",
      PORTAL_WEB_PORT: "5175",
      WEB_ORIGIN: "http://127.0.0.1:5175",
      NODE_ENV: "development",
    },
  },
});
