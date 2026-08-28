import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers';

test.describe('Create Page - Document Center', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/create');
  });

  test('exposes the document center without retired office tabs', async ({ page }) => {
    await expect(page.getByRole('tabpanel')).toBeVisible();
    await expect(page.getByRole('tab', { name: '绘图' })).toHaveCount(0);
    await expect(page.getByRole('tab', { name: '表单' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /电子表格/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /演示文稿/i })).toHaveCount(0);
  });

  test('opens the document template picker', async ({ page }) => {
    const sidebar = page.locator('aside').filter({ has: page.getByText('平台文档', { exact: true }) });
    await sidebar.getByRole('button', { name: '文档', exact: true }).click();

    await expect(page.getByRole('heading', { name: '选择模板' })).toBeVisible();
    await expect(page.getByRole('button', { name: /空白文档/ })).toBeVisible();
  });

  test('can create a blank document', async ({ page }) => {
    const sidebar = page.locator('aside').filter({ has: page.getByText('平台文档', { exact: true }) });
    await sidebar.getByRole('button', { name: '文档', exact: true }).click();
    await page.getByRole('button', { name: /空白文档/ }).click();

    await expect(page).toHaveURL(/\/create\/[^/?#]+$/);
    await expect(page.getByLabel(/文档编辑器：空白文档/)).toBeVisible();
  });

  test('can create a folder', async ({ page }) => {
    await page.locator('button[title="创建文件夹"]').click();

    const folderInput = page.getByPlaceholder('新文件夹名称…');
    await expect(folderInput).toBeVisible();
    await folderInput.fill('E2E Doc Folder');
    await folderInput.press('Enter');

    await expect(page.getByText('E2E Doc Folder', { exact: true })).toBeVisible();
  });

  test('keeps platform documentation available', async ({ page }) => {
    await expect(page.getByRole('button', { name: /平台文档/i })).toBeVisible();
  });
});

test.describe('Create Page - Retired Office Routes', () => {
  test('legacy diagram routes return to the document center', async ({ page }) => {
    await navigateTo(page, '/diagrams/legacy-id');
    await expect(page).toHaveURL(/\/create$/);
  });

  test('legacy form routes return to the document center', async ({ page }) => {
    await navigateTo(page, '/forms/legacy-id/edit');
    await expect(page).toHaveURL(/\/create$/);
  });
});
