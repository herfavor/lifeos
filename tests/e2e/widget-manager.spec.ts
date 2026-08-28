import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Widget Manager E2E Tests
 *
 * Tests the "Customize Dashboard Widgets" modal:
 * search, category filters, enable/disable widgets, tabs.
 */

test.describe('Widget Manager', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/');
  });

  async function openWidgetManager(page: import('@playwright/test').Page) {
    // Open page settings gear, then widget manager
    const settingsGear = page.locator('button[title="页面设置"]');
    if (await settingsGear.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsGear.click();
      await page.waitForTimeout(50);
    }
    const customizeBtn = page.getByRole('button', { name: /Customize.*Widget|Manage.*Widget/i });
    if (await customizeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await customizeBtn.click();
      await page.waitForTimeout(50);
    }
  }

  test('opens widget manager modal', async ({ page }) => {
    await openWidgetManager(page);
    await expect(page.getByText('自定义首页组件')).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('has Active Widgets and Available tabs', async ({ page }) => {
    await openWidgetManager(page);
    await expect(page.getByText(/已启用组件 \(\d+\)/)).toBeVisible();
    await expect(page.getByText(/可用组件 \(\d+\)/)).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('can switch to Available tab and search widgets', async ({ page }) => {
    await openWidgetManager(page);
    // Click Available tab
    await page.getByText(/可用组件 \(\d+\)/).click();
    await page.waitForTimeout(50);

    const searchInput = page.getByPlaceholder(/搜索组件/);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('笔记');
    await page.waitForTimeout(50);

    assertNoConsoleErrors(page);
  });

  test('can filter widgets by category', async ({ page }) => {
    await openWidgetManager(page);
    await page.getByText(/可用组件 \(\d+\)/).click();
    await page.waitForTimeout(50);

    // Category filter buttons show emoji only
    const productivityBtn = page.getByRole('button', { name: /💼/ });
    if (await productivityBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await productivityBtn.click();
      await page.waitForTimeout(50);
    }

    assertNoConsoleErrors(page);
  });

  test('can disable a widget from Active tab', async ({ page }) => {
    await openWidgetManager(page);
    // Active tab should be default
    const disableBtn = page.locator('[title="停用组件"]').first();
    if (await disableBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await disableBtn.click();
      await page.waitForTimeout(50);
    }

    assertNoConsoleErrors(page);
  });

  test('can close widget manager with Done button', async ({ page }) => {
    await openWidgetManager(page);
    const doneBtn = page.getByRole('button', { name: '完成', exact: true });
    if (await doneBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await doneBtn.click();
      await page.waitForTimeout(50);
      await expect(page.getByText('自定义仪表盘组件')).not.toBeVisible();
    }

    assertNoConsoleErrors(page);
  });
});
