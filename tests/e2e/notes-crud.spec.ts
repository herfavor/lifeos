import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  createBlankNote,
  navigateTo,
  openNotesSidebarIfNeeded,
  selectNoteByTitle,
  setupConsoleMonitor,
} from './helpers';

test.describe('Notes CRUD Operations', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
  });

  test('creates and edits a note', async ({ page }) => {
    const editor = await createBlankNote(page, 'CRUD Note');
    await editor.click();
    await page.keyboard.type('Initial Content');
    await expect(editor).toContainText('Initial Content');

    await page.keyboard.press('Control+a');
    await page.keyboard.type('Updated Content');
    await expect(editor).toContainText('Updated Content');

    await openNotesSidebarIfNeeded(page);
    await expect(page.getByText('CRUD Note', { exact: true }).first()).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('organizes a new note inside a folder', async ({ page }) => {
    await openNotesSidebarIfNeeded(page);
    await page.locator('button[title="新建文件夹"]').click();

    const folderInput = page.getByPlaceholder(/文件夹.*名称|名称/i);
    await folderInput.fill('E2E Test Folder');
    await folderInput.press('Enter');

    const folder = page.getByText('E2E Test Folder', { exact: true }).first();
    await expect(folder).toBeVisible();
    await folder.click();

    const closeSidebar = page.getByRole('button', { name: '关闭侧边栏菜单' });
    if (await closeSidebar.isVisible().catch(() => false)) await closeSidebar.click();

    await createBlankNote(page, 'Folder Note');
    await selectNoteByTitle(page, 'Folder Note');
    assertNoConsoleErrors(page);
  });

  test('search filters by stable note titles', async ({ page }) => {
    await createBlankNote(page, 'Searchable Alpha');
    await createBlankNote(page, 'Searchable Beta');
    await createBlankNote(page, 'Different Note');

    await openNotesSidebarIfNeeded(page);
    const search = page.getByPlaceholder(/搜索笔记/);
    await search.fill('Searchable');

    await expect(page.getByText('Searchable Alpha', { exact: true })).toBeVisible();
    await expect(page.getByText('Searchable Beta', { exact: true })).toBeVisible();
    await expect(page.getByText('Different Note', { exact: true })).toHaveCount(0);
    assertNoConsoleErrors(page);
  });
});
