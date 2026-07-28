import { defineConfig, devices, type Project } from '@playwright/test';

const allProjects: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  { name: 'webkit', use: { ...devices['Desktop Safari'] } }
];

const requestedProject = process.env.E2E_BROWSER_PROJECT;
const projects = requestedProject
  ? allProjects.filter((project) => project.name === requestedProject)
  : allProjects;

if (requestedProject && projects.length === 0) {
  throw new Error(`Unknown E2E_BROWSER_PROJECT: ${requestedProject}`);
}

export default defineConfig({
  testDir: './e2e',
  outputDir: `test-results/browser-compatibility/${requestedProject || 'all-browsers'}`,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: `playwright-report-browser/${requestedProject || 'all-browsers'}`, open: 'never' }],
        ['json', { outputFile: `test-results/browser-compatibility-${requestedProject || 'all-browsers'}.json` }]
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report-browser', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: Number(process.env.E2E_DEVICE_SCALE_FACTOR || '1')
  },
  projects
});
