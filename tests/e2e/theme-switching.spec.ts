import { test, expect } from '@playwright/test';
import { assertNoConsoleErrors, navigateTo, setupConsoleMonitor } from './helpers';

test.describe('Theme Switching', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/settings?tab=appearance');
  });

  test('exposes light, dark, and system modes', async ({ page }) => {
    await expect(page.getByRole('button', { name: '浅色', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '深色', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '跟随系统', exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('dark mode applies the dark class', async ({ page }) => {
    await page.getByRole('button', { name: '深色', exact: true }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(true);
    assertNoConsoleErrors(page);
  });

  test('light mode removes the dark class', async ({ page }) => {
    await page.getByRole('button', { name: '浅色', exact: true }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(false);
    assertNoConsoleErrors(page);
  });

  test('explicit mode persists across page navigation and reload', async ({ page }) => {
    await page.getByRole('button', { name: '深色', exact: true }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(true);

    await navigateTo(page, '/tasks');
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(true);

    await page.reload();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(true);
    assertNoConsoleErrors(page);
  });
});
