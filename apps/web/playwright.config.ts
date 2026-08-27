import { defineConfig } from '@playwright/test';

/** Browser-test configuration for reproducible Flowpeek web application checks. */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://[::1]:3000',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    viewport: { height: 900, width: 1440 },
  },
  projects: [{ name: 'chromium' }],
});
