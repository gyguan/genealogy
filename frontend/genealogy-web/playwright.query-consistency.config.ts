import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-query-consistency',
  outputDir: 'test-results/query-consistency-e2e',
  timeout: 180_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: 'playwright-report-query-consistency', open: 'never' }],
        ['json', { outputFile: 'test-results/query-consistency-results.json' }]
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report-query-consistency', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 40_000
  },
  projects: [{ name: 'chromium-query-consistency', use: { ...devices['Desktop Chrome'] } }]
});
