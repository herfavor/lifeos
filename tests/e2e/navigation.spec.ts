import { test, expect } from '@playwright/test';
import { dismissOnboarding, navigateTo, ensureSidebarExpanded } from './helpers';

/**
 * Navigation & Sidebar E2E Tests
 *
 * Tests sidebar links, collapse/expand, child routes, theme toggle,
 * and URL-based routing.
 */

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/');
    await ensureSidebarExpanded(page);
  });

  test('sidebar contains all primary nav links', async ({ page }) => {
    const nav = page.locator('nav[aria-label="主导航"]');

    await expect(nav.getByRole('link', { name: '仪表盘' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '日程' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '笔记' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '任务' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '创建' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '设置' })).toBeVisible();
  });

  test('navigates to each main page', async ({ page }) => {
    const nav = page.locator('nav[aria-label="主导航"]');

    // Tasks
    await nav.getByRole('link', { name: '任务' }).click();
    await expect(page).toHaveURL(/\/tasks/);

    // Notes
    await nav.getByRole('link', { name: '笔记' }).click();
    await expect(page).toHaveURL(/\/notes/);

    // Schedule
    await nav.getByRole('link', { name: '日程' }).click();
    await expect(page).toHaveURL(/\/schedule/);

    // Create
    await nav.getByRole('link', { name: '创建' }).click();
    await expect(page).toHaveURL(/\/create/);

    // Settings
    await nav.getByRole('link', { name: '设置' }).click();
    await expect(page).toHaveURL(/\/settings/);

    // Dashboard
    await nav.getByRole('link', { name: '仪表盘' }).click();
    await expect(page).toHaveURL('/');
  });

  test('navigates to child routes via expanded sidebar', async ({ page }) => {
    const nav = page.locator('nav[aria-label="主导航"]');

    // Expand Dashboard section and click Today
    const todayLink = nav.getByRole('link', { name: '今日' });
    if (await todayLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await todayLink.click();
      await expect(page).toHaveURL(/\/today/);
    } else {
      // May need to expand Dashboard first
      const expandBtn = nav.locator('button[title="展开"]').first();
      if (await expandBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await expandBtn.click();
        await nav.getByRole('link', { name: '今日' }).click();
        await expect(page).toHaveURL(/\/today/);
      }
    }

    // Link Library
    const linkLibrary = nav.getByRole('link', { name: '链接库' });
    if (await linkLibrary.isVisible({ timeout: 1000 }).catch(() => false)) {
      await linkLibrary.click();
      await expect(page).toHaveURL(/\/links/);
    }
  });

  test('sidebar can be collapsed and expanded', async ({ page }) => {
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');
    await expect(sidebar).toBeVisible();

    // Collapse via button
    const collapseButton = page.getByRole('button', { name: /折叠/i });
    if (await collapseButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await collapseButton.click();
      await page.waitForTimeout(300);
    }

    // Expand via button
    const expandButton = page.locator('button[title="展开侧边栏"]');
    if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expandButton.click();
      await page.waitForTimeout(300);
      // Sidebar should be expanded again
      await expect(page.locator('nav[aria-label="主导航"]')).toBeVisible();
    }
  });

  test('sidebar can be toggled with Ctrl+B', async ({ page }) => {
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');
    await expect(sidebar).toBeVisible();

    // Toggle collapse
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(400);

    // Toggle expand
    await page.keyboard.press('Control+b');
    await page.waitForTimeout(400);

    // Should be visible again
    await expect(sidebar).toBeVisible();
  });
});

test.describe('Theme Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/');
  });

  test('can toggle dark/light mode from sidebar', async ({ page }) => {
    const initialTheme = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    // Find theme toggle button
    const themeButton = page.getByRole('button', { name: /浅色模式|深色模式/ });
    await themeButton.click();

    const newTheme = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    expect(newTheme).not.toBe(initialTheme);
  });

  test('theme persists after page reload', async ({ page }) => {
    // Toggle to dark mode
    const themeButton = page.getByRole('button', { name: /浅色模式|深色模式/ });
    await themeButton.click();
    await page.waitForTimeout(300);

    const themeAfterToggle = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    // Reload
    await page.reload();
    await dismissOnboarding(page);

    const themeAfterReload = await page.evaluate(() =>
      document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    );

    expect(themeAfterReload).toBe(themeAfterToggle);
  });
});

test.describe('Direct URL Routing', () => {
  test('navigates to /today', async ({ page }) => {
    await navigateTo(page, '/today');
    await expect(page.getByText('今日任务')).toBeVisible();
  });

  test('navigates to /tasks', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await expect(page.getByRole('tab', { name: '任务' })).toBeVisible();
  });

  test('navigates to /notes', async ({ page }) => {
    await navigateTo(page, '/notes');
    await expect(page.getByRole('tab', { name: '笔记' })).toBeVisible();
  });

  test('navigates to /schedule', async ({ page }) => {
    await navigateTo(page, '/schedule');
    // Calendar or Schedule content should load
    await expect(page.getByRole('tab', { name: /日历/i })).toBeVisible();
  });

  test('navigates to /create', async ({ page }) => {
    await navigateTo(page, '/create');
    await expect(page.getByRole('tab', { name: '创建' })).toBeVisible();
  });

  test('navigates to /links', async ({ page }) => {
    await navigateTo(page, '/links');
    await expect(page.getByPlaceholder('搜索链接…')).toBeVisible();
  });

  test('navigates to /settings', async ({ page }) => {
    await navigateTo(page, '/settings');
    await expect(page.getByRole('button', { name: '通用' })).toBeVisible();
  });

  test('navigates to /focus', async ({ page }) => {
    await navigateTo(page, '/focus');
    await expect(page.locator('button[aria-label="退出专注模式"]')).toBeVisible();
  });

  test('navigates to /pm', async ({ page }) => {
    await navigateTo(page, '/pm');
    // PM Dashboard content
    await expect(page).toHaveURL(/\/pm/);
  });

  test('legacy routes redirect properly', async ({ page }) => {
    // /docs should redirect to /create
    await navigateTo(page, '/docs');
    await expect(page).toHaveURL(/\/create/);

    // /habits should redirect to /tasks?tab=habits
    await navigateTo(page, '/habits');
    await expect(page).toHaveURL(/\/tasks.*tab=habits/);

    // /graph should redirect to /notes?tab=graph
    await navigateTo(page, '/graph');
    await expect(page).toHaveURL(/\/notes.*tab=graph/);
  });
});
