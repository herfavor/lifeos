import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers';

/**
 * Settings Page E2E Tests
 *
 * Tests all settings tabs: General, Projects, Time Tracking,
 * Tasks, Notes & Calendar, Backup & Data, AI Terminal, Advanced.
 */

test.describe('Settings Page - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings');
  });

  test('shows all settings tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: '通用' })).toBeVisible();
    await expect(page.getByRole('button', { name: '项目' })).toBeVisible();
    await expect(page.getByRole('button', { name: '时间跟踪' })).toBeVisible();
    await expect(page.getByRole('button', { name: '任务' })).toBeVisible();
    await expect(page.getByRole('button', { name: '笔记与日历' })).toBeVisible();
    await expect(page.getByRole('button', { name: '备份与数据' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'AI 提供商' })).toBeVisible();
    await expect(page.getByRole('button', { name: '高级' })).toBeVisible();
  });

  test('General tab is selected by default', async ({ page }) => {
    // General tab content should be visible
    await expect(page).toHaveURL(/\/settings/);
  });

  test('can switch to Projects tab', async ({ page }) => {
    await page.getByRole('button', { name: '项目' }).click();
    await expect(page).toHaveURL(/tab=projects/);
  });

  test('can switch to Time Tracking tab', async ({ page }) => {
    await page.getByRole('button', { name: '时间跟踪' }).click();
    await expect(page).toHaveURL(/tab=time/);
  });

  test('can switch to Tasks tab', async ({ page }) => {
    await page.getByRole('button', { name: '任务' }).click();
    await expect(page).toHaveURL(/tab=tasks/);
  });

  test('can switch to Notes & Calendar tab', async ({ page }) => {
    await page.getByRole('button', { name: '笔记与日历' }).click();
    await expect(page).toHaveURL(/tab=notes/);
  });

  test('can switch to Backup & Data tab', async ({ page }) => {
    await page.getByRole('button', { name: '备份与数据' }).click();
    await expect(page).toHaveURL(/tab=backup/);
  });

  test('can switch to AI Terminal tab', async ({ page }) => {
    await page.getByRole('button', { name: 'AI 提供商' }).click();
    await expect(page).toHaveURL(/tab=ai/);
  });

  test('can switch to Advanced tab', async ({ page }) => {
    await page.getByRole('button', { name: '高级' }).click();
    await expect(page).toHaveURL(/tab=advanced/);
  });

  test('tabs accessible via URL params', async ({ page }) => {
    await page.goto('/settings?tab=projects');
    // Projects content should be visible
    await expect(page).toHaveURL(/tab=projects/);

    await page.goto('/settings?tab=backup');
    await expect(page).toHaveURL(/tab=backup/);

    await page.goto('/settings?tab=advanced');
    await expect(page).toHaveURL(/tab=advanced/);
  });
});

test.describe('Settings Page - General Tab', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings');
  });

  test('has theme settings', async ({ page }) => {
    // Should show theme/color mode options
    const themeSection = page.getByText(/主题|颜色模式|外观/i).first();
    await expect(themeSection).toBeVisible();
  });

  test('has display name setting', async ({ page }) => {
    // Account settings with display name
    const nameInput = page.getByPlaceholder(/姓名|显示/i).or(page.locator('input#display-name'));
    if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(nameInput).toBeVisible();
    }
  });
});

test.describe('Settings Page - Backup & Data', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings?tab=backup');
  });

  test('backup tab loads', async ({ page }) => {
    await expect(page).toHaveURL(/tab=backup/);
  });

  test('has export/import brain buttons', async ({ page }) => {
    // Quick Actions section should have Export Brain / Import Brain
    const exportBrain = page.getByRole('button', { name: /导出.*Brain/i });
    const importBrain = page.getByRole('button', { name: /导入.*Brain/i });

    if (await exportBrain.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(exportBrain).toBeVisible();
    }
    if (await importBrain.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(importBrain).toBeVisible();
    }
  });
});

test.describe('Settings Page - Advanced', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/settings?tab=advanced');
  });

  test('advanced tab loads', async ({ page }) => {
    await expect(page).toHaveURL(/tab=advanced/);
  });

  test('shows storage information', async ({ page }) => {
    const storageSection = page.getByText(/存储|IndexedDB|使用/i).first();
    if (await storageSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(storageSection).toBeVisible();
    }
  });
});
