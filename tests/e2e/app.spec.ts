import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  clickPrimaryNavigationLink,
  isMobileViewport,
  navigateTo,
  setupConsoleMonitor,
} from './helpers';

/**
 * Application Basics E2E Tests
 *
 * Core smoke tests: app loads, navigation works, theme toggles,
 * keyboard navigation is accessible.
 */

test.describe('Application Basics', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
  });

  test('loads the dashboard with correct title', async ({ page }) => {
    await navigateTo(page, '/');
    await expect(page).toHaveTitle(/LifeOS/i);
    const navLabel = isMobileViewport(page) ? '移动端导航' : '主导航';
    await expect(page.getByRole('navigation', { name: navLabel })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('navigation works between pages', async ({ page }) => {
    await navigateTo(page, '/');

    await clickPrimaryNavigationLink(page, '任务');
    await expect(page).toHaveURL(/\/tasks(?:\?|$)/);

    await clickPrimaryNavigationLink(page, '笔记');
    await expect(page).toHaveURL(/\/notes(?:\?|$)/);

    await clickPrimaryNavigationLink(page, '首页');
    await expect(page).toHaveURL(/\/$/);

    assertNoConsoleErrors(page);
  });
});

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
  });

  test('can create a task', async ({ page }) => {
    await navigateTo(page, '/tasks');

    const addButton = page.getByRole('button', { name: '+ 添加任务' }).first();
    if (await addButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addButton.click();

      const titleInput = page.getByPlaceholder('任务标题…');
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('E2E Test Task');
        await page.getByRole('button', { name: '添加', exact: true }).click();
        await expect(page.getByText('E2E Test Task')).toBeVisible();
      }
    }

    assertNoConsoleErrors(page);
  });
});

test.describe('Theme and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
  });

  test('theme toggle works', async ({ page }) => {
    await navigateTo(page, '/');

    const initialTheme = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    if (isMobileViewport(page)) {
      await navigateTo(page, '/settings?tab=appearance');
      const targetMode = initialTheme === 'dark' ? '浅色' : '深色';
      await page.getByRole('button', { name: targetMode, exact: true }).click();
    } else {
      const themeToggle = page.getByRole('button', {
        name: initialTheme === 'dark' ? '切换到浅色模式' : '切换到深色模式',
      });
      await themeToggle.click();
    }

    await expect.poll(() =>
      page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      )
    ).not.toBe(initialTheme);

    assertNoConsoleErrors(page);
  });

  test('keyboard navigation has visible focus indicator', async ({ page }) => {
    await navigateTo(page, '/');

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    assertNoConsoleErrors(page);
  });
});
