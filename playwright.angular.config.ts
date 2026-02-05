import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration para Angular Frontend
 * Sin webServer ya que Angular corre en localhost:4200
 */
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "angular-*.spec.ts",
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: [["list"]],

  use: {
    baseURL: "http://localhost:4200",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    viewport: { width: 1280, height: 720 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Cordoba",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  outputDir: "test-results/",

  // No usar webServer - asume que Angular ya está corriendo
});
