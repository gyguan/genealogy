import { defineConfig, devices, type Project } from '@playwright/test';

const deviceScaleFactor = Number(process.env.E2E_DEVICE_SCALE_FACTOR || '1');
const allProjects: Project[] = [
  { name: 'chromium-real', use: { ...devices['Desktop Chrome'], deviceScaleFactor } },
  { name: 'edge-real', use: { ...devices['Desktop Edge'], channel: 'msedge', deviceScaleFactor } },
  { name: 'firefox-real', use: { ...devices['Desktop Firefox'], deviceScaleFactor } },
  { name: 'webkit-real', use: { ...devices['Desktop Safari'], deviceScaleFactor } }
];

const requestedProject = process.env.E2E_BROWSER_PROJECT;
const projects = requestedProject
  ? allProjects.filter((project) => project.name === requestedProject)
  : allProjects.filter((project) => project.name === 'chromium-real');

if (requestedProject && projects.length === 0) {
  throw new Error(`Unknown E2E_BROWSER_PROJECT: ${requestedProject}`);
}

const reportKey = requestedProject || 'chromium-real';

export default defineConfig({
  testDir: './e2e-real',
  outputDir: `test-results/real-e2e/${reportKey}`,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: `playwright-report-real/${reportKey}`, open: 'never' }],
        ['json', { outputFile: `test-results/real-e2e-results-${reportKey}.json` }]
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report-real', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1440, height: 900 }
  },
  projects
});
