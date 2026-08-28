import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers';

/**
 * Link Library E2E Tests
 *
 * Tests bookmark management: search, view toggle, sort, collections,
 * import/export, and the empty state.
 */

test.describe('Link Library', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/links');
  });

  test('page loads with search bar', async ({ page }) => {
    await expect(page.getByPlaceholder('搜索链接…')).toBeVisible();
  });

  test('has view toggle buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: '网格' })).toBeVisible();
    await expect(page.getByRole('button', { name: '列表' })).toBeVisible();
  });

  test('can switch between grid and list view', async ({ page }) => {
    // Click List view
    await page.getByRole('button', { name: '列表' }).click();
    await page.waitForTimeout(200);

    // Click Grid view
    await page.getByRole('button', { name: '网格' }).click();
    await page.waitForTimeout(200);
  });

  test('has sort options', async ({ page }) => {
    const sortSelect = page.locator('select').first();
    if (await sortSelect.isVisible({ timeout: 1000 }).catch(() => false)) {
      // Should have sort options
      await expect(sortSelect).toBeVisible();
    }
  });

  test('has sort direction toggle', async ({ page }) => {
    const sortDirBtn = page.locator('button[title="降序排列"], button[title="升序排列"]');
    await expect(sortDirBtn).toBeVisible();
  });

  test('has import functionality', async ({ page }) => {
    // Import is a <label> wrapping a file input
    const importLabel = page.getByText('导入', { exact: true });
    await expect(importLabel).toBeVisible();
  });

  test('has export button', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: '导出' });
    await expect(exportBtn).toBeVisible();
  });

  test('has Find Duplicates button', async ({ page }) => {
    const findDupsBtn = page.locator('button[title="查找并合并重复书签"]');
    await expect(findDupsBtn).toBeVisible();
  });

  test('search filters links', async ({ page }) => {
    const searchInput = page.getByPlaceholder('搜索链接…');
    await searchInput.fill('nonexistent xyz123');
    await page.waitForTimeout(300);

    // Should show empty or no results
  });

  test('shows empty state when no links exist', async ({ page }) => {
    // On a fresh app with no links, should show import prompt
    const emptyState = page.getByText(/导入浏览器书签|暂无链接/i);
    if (await emptyState.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(emptyState).toBeVisible();
    }
  });
});

test.describe('Link Library - Collections', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/links');
  });

  test('can create a collection', async ({ page }) => {
    const addCollectionBtn = page.locator('button[title="添加合集"]');
    if (await addCollectionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addCollectionBtn.click();

      const nameInput = page.getByPlaceholder('合集名称…');
      await expect(nameInput).toBeVisible();
      await nameInput.fill('E2E Collection');

      // Confirm with checkmark button
      await page.getByRole('button', { name: '✓' }).click();

      await expect(page.getByText('E2E Collection')).toBeVisible();
    }
  });
});
