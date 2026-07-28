import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-member-scope',
  outputDir: 'test-results/member-scope-e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: 'playwright-report-member-scope', open: 'never' }],
        ['json', { outputFile: 'test-results/member-scope-results.json' }]
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report-member-scope', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  projects: [{ name: 'chromium-member-scope', use: { ...devices['Desktop Chrome'] } }]
});
