import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file patterns
  testMatch: '**/*.spec.ts',

  // Timeout for each test
  timeout: 30000,

  // Expect timeout
  expect: {
    timeout: 5000,
  },

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if test.only is left
  forbidOnly: !!process.env.CI,

  // Retry failed tests
  retries: process.env.CI ? 2 : 0,

  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  // Shared settings
  use: {
    // Base URL
    baseURL: 'http://localhost:5173',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshots
    screenshot: 'only-on-failure',

    // Video
    video: 'on-first-retry',

    // Viewport
    viewport: { width: 1280, height: 720 },

    // Locale
    locale: 'es-AR',

    // Timezone
    timezoneId: 'America/Argentina/Cordoba',
  },

  // Projects for different browsers
  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },

    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  // Web server configuration
  webServer: [
    {
      command: 'npm run preview',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'npm run start --workspace=apps/backend',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],

  // Output folder for artifacts
  outputDir: 'test-results/',

  // Global setup
  globalSetup: undefined,

  // Global teardown
  globalTeardown: undefined,
});




