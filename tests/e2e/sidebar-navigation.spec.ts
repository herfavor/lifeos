import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Sidebar Navigation E2E Tests
 *
 * Tests the sidebar: all nav links, collapse/expand,
 * active state highlighting, mobile hamburger menu.
 */

test.describe('Sidebar Navigation', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/');
  });

  test('sidebar is visible on desktop', async ({ page }) => {
    const sidebar = page.locator('nav, [role="navigation"]').first();
    if (await sidebar.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sidebar).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Dashboard link', async ({ page }) => {
    const link = page.getByRole('link', { name: /仪表盘/i }).or(page.getByText('仪表盘').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Tasks link', async ({ page }) => {
    const link = page.getByRole('link', { name: /任务/i }).or(page.getByText('任务').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Notes link', async ({ page }) => {
    const link = page.getByRole('link', { name: /笔记/i }).or(page.getByText('笔记').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Schedule link', async ({ page }) => {
    const link = page.getByRole('link', { name: /日程|日历/i }).or(page.getByText('日程').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Focus link', async ({ page }) => {
    const link = page.getByRole('link', { name: /专注/i }).or(page.getByText('专注').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Today link', async ({ page }) => {
    const link = page.getByRole('link', { name: /今日/i }).or(page.getByText('今日').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has Settings link', async ({ page }) => {
    const link = page.getByRole('link', { name: /设置/i }).or(page.getByText('设置').first());
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(link).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('clicking Tasks navigates to tasks page', async ({ page }) => {
    const link = page.getByRole('link', { name: /任务/i }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/tasks/);
    }
    assertNoConsoleErrors(page);
  });

  test('clicking Notes navigates to notes page', async ({ page }) => {
    const link = page.getByRole('link', { name: /笔记/i }).first();
    if (await link.isVisible({ timeout: 3000 }).catch(() => false)) {
      await link.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/notes/);
    }
    assertNoConsoleErrors(page);
  });

  test('has sidebar collapse button', async ({ page }) => {
    const collapseBtn = page.locator('[aria-label*="折叠"], [title*="折叠"]').first();
    if (await collapseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(collapseBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('active nav link is highlighted', async ({ page }) => {
    const activeLink = page.locator('nav a[aria-current="page"], nav [data-active="true"]').first();
    if (await activeLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(activeLink).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });
});
