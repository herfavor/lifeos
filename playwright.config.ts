import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for NeumanOS
 *
 * This configuration is hosted-CI-only. It must not run on TJNMPM or target
 * a remote/production deployment.
 *
 * @see https://playwright.dev/docs/test-configuration
 */

const isApprovedHostedRunner =
  process.platform === 'linux' &&
  process.env.CI === 'true' &&
  process.env.GITHUB_ACTIONS === 'true' &&
  process.env.RUNNER_ENVIRONMENT === 'github-hosted' &&
  process.env.RUNNER_OS === 'Linux' &&
  process.env.GITHUB_EVENT_NAME === 'workflow_dispatch' &&
  process.env.GITHUB_REPOSITORY === 'travisjneuman/neumanos' &&
  process.env.GITHUB_WORKSPACE?.startsWith('/home/runner/work/');

if (!isApprovedHostedRunner) {
  throw new Error('Browser tests are restricted to the approved GitHub-hosted Linux workflow.');
}

if (process.env.TEST_BASE_URL) {
  throw new Error('TEST_BASE_URL is forbidden; browser tests use the task-owned local preview.');
}

const localPreviewURL = 'http://127.0.0.1:4173';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Test file pattern
  testMatch: '**/*.spec.ts',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: true,

  // Do not multiply deterministic failures across the diagnostic matrix.
  retries: 0,

  // Each shard stops after enough evidence to keep the hosted lane bounded.
  maxFailures: 20,

  // Limit parallel workers on CI
  workers: 1,

  // Reporter
  reporter: [
    ['html', { outputFolder: 'tests/reports' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    baseURL: localPreviewURL,

    // Preserve one diagnostic record without requiring a retry.
    trace: 'retain-on-failure',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers + mobile
  projects: [
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
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Build and serve the production PWA only inside the hosted runner.
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: localPreviewURL,
    reuseExistingServer: false,
    timeout: 180 * 1000,
  },

  // Output directory for test artifacts
  outputDir: 'tests/results',

  timeout: 60 * 1000,

  // Expect timeout
  expect: {
    timeout: 10 * 1000,
  },
});
