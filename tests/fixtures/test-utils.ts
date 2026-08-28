import { test as base, expect } from '@playwright/test';

/**
 * Custom test fixtures for LifeOS E2E tests
 *
 * Extend base test with common setup/teardown patterns.
 */

// Extend base test with custom fixtures
export const test = base.extend({
  // Clear IndexedDB before each test for isolation
  page: async ({ page }, use) => {
    // Playwright gives every test a fresh browser context, so IndexedDB/local
    // storage are already isolated. Deleting databases here races with the app
    // opening its persistence layer and can destroy page.evaluate contexts.
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

// Re-export expect for convenience
export { expect };

/**
 * Helper to wait for app to be ready
 */
export async function waitForAppReady(page: import('@playwright/test').Page) {
  // Wait for main content to load
  await page.waitForSelector('[role="main"], main, #root', { state: 'visible' });

  // Wait for any loading spinners to disappear
  await page.waitForSelector('.animate-pulse, .loading, [data-loading="true"]', {
    state: 'hidden',
    timeout: 10000,
  }).catch(() => {
    // No loading indicators found, app is ready
  });
}

/**
 * Helper to create a test task
 */
export async function createTestTask(
  page: import('@playwright/test').Page,
  title: string
) {
  await page.goto('/tasks');

  // Click add task button
  await page.getByRole('button', { name: /add.*task|new.*task/i }).click();

  // Fill title
  await page.getByPlaceholder(/title|task/i).fill(title);

  // Save
  await page.getByRole('button', { name: /save|create/i }).click();

  // Wait for task to appear
  await expect(page.getByText(title)).toBeVisible();
}

/**
 * Helper to navigate to a specific page
 */
export async function navigateTo(
  page: import('@playwright/test').Page,
  route: 'dashboard' | 'tasks' | 'notes' | 'time' | 'links' | 'settings'
) {
  const routes: Record<string, string> = {
    dashboard: '/',
    tasks: '/tasks',
    notes: '/notes',
    time: '/time',
    links: '/links',
    settings: '/settings',
  };

  await page.goto(routes[route]);
  await waitForAppReady(page);
}
