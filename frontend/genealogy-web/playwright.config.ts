import { defineConfig, devices, type Project } from '@playwright/test';

const deviceScaleFactor = Number(process.env.E2E_DEVICE_SCALE_FACTOR || '1');
const allProjects: Project[] = [
  { name: 'chromium', use: { ...devices['Desktop Chrome'], deviceScaleFactor } },
  { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge', deviceScaleFactor } },
  { name: 'firefox', use: { ...devices['Desktop Firefox'], deviceScaleFactor } },
  { name: 'webkit', use: { ...devices['Desktop Safari'], deviceScaleFactor } }
];

const requestedProject = process.env.E2E_BROWSER_PROJECT;
const projects = requestedProject
  ? allProjects.filter((project) => project.name === requestedProject)
  : allProjects.filter((project) => project.name === 'chromium');

if (requestedProject && projects.length === 0) {
  throw new Error(`Unknown E2E_BROWSER_PROJECT: ${requestedProject}`);
}

const reportKey = requestedProject || 'chromium';

export default defineConfig({
  testDir: './e2e',
  outputDir: `test-results/browser-compatibility/${reportKey}`,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [
        ['line'],
        ['html', { outputFolder: `playwright-report-browser/${reportKey}`, open: 'never' }],
        ['json', { outputFile: `test-results/browser-compatibility-${reportKey}.json` }]
      ]
    : [['list'], ['html', { outputFolder: 'playwright-report-browser', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://127.0.0.1:5179',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 900 }
  },
  projects
});
