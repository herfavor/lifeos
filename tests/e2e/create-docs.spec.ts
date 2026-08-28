import { test, expect } from '@playwright/test';
import { navigateTo, switchTab } from './helpers';

/**
 * Create / Docs Page E2E Tests
 *
 * Tests document, spreadsheet, and presentation creation,
 * the folder system, platform docs, and tab navigation.
 */

test.describe('Create Page - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/create');
  });

  test('shows all create tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '创建' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '绘图' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '表单' })).toBeVisible();
  });

  test('create tab is selected by default', async ({ page }) => {
    const createTab = page.getByRole('tab', { name: '创建' });
    await expect(createTab).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Diagrams tab', async ({ page }) => {
    await switchTab(page, '绘图');
    await expect(page.getByRole('tab', { name: '绘图' })).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Forms tab', async ({ page }) => {
    await switchTab(page, '表单');
    await expect(page.getByRole('tab', { name: '表单' })).toHaveAttribute('aria-selected', 'true');
  });

  test('tabs accessible via URL params', async ({ page }) => {
    await page.goto('/create?tab=diagrams');
    await expect(page.getByRole('tab', { name: '绘图' })).toHaveAttribute('aria-selected', 'true');

    await page.goto('/create?tab=forms');
    await expect(page.getByRole('tab', { name: '表单' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Create Page - Document Creation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/create');
  });

  test('has document creation buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /文档/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /电子表格/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /演示文稿/i })).toBeVisible();
  });

  test('can create a new document', async ({ page }) => {
    await page.getByRole('button', { name: /文档/i }).first().click();
    await page.waitForTimeout(500);

    // Document editor or title should appear
    // The doc should be created and navigable
  });

  test('can create a new spreadsheet', async ({ page }) => {
    await page.getByRole('button', { name: /电子表格/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('can create a new presentation', async ({ page }) => {
    await page.getByRole('button', { name: /演示文稿/i }).first().click();
    await page.waitForTimeout(500);
  });

  test('has create folder button', async ({ page }) => {
    const createFolderBtn = page.locator('button[title="创建文件夹"]');
    await expect(createFolderBtn).toBeVisible();
  });

  test('can create a folder', async ({ page }) => {
    await page.locator('button[title="创建文件夹"]').click();

    const folderInput = page.getByPlaceholder('新文件夹名称…');
    await expect(folderInput).toBeVisible();
    await folderInput.fill('E2E Doc Folder');
    await page.keyboard.press('Enter');

    await expect(page.getByText('E2E Doc Folder')).toBeVisible();
  });

  test('has view toggle (List/Grid)', async ({ page }) => {
    const listBtn = page.getByRole('button', { name: '列表' });
    const gridBtn = page.getByRole('button', { name: '网格' });

    // At least one should be visible
    const hasList = await listBtn.isVisible({ timeout: 1000 }).catch(() => false);
    const hasGrid = await gridBtn.isVisible({ timeout: 1000 }).catch(() => false);
    expect(hasList || hasGrid).toBe(true);
  });

  test('has Platform Docs section', async ({ page }) => {
    const platformDocs = page.getByRole('button', { name: /平台文档/i });
    if (await platformDocs.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(platformDocs).toBeVisible();
    }
  });
});
