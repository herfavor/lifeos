import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  createBlankNote,
  navigateTo,
  openNotesSidebarIfNeeded,
  setupConsoleMonitor,
} from './helpers';

test.describe('Note Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
    await createBlankNote(page, 'Context Menu Test Note');
  });

  async function openContextMenu(page: import('@playwright/test').Page) {
    await openNotesSidebarIfNeeded(page);
    const noteItem = page.getByText('Context Menu Test Note', { exact: true }).first();
    await expect(noteItem).toBeVisible();
    await noteItem.click({ button: 'right' });

    const menu = page.locator('[role="menu"][aria-label="笔记右键菜单"]');
    await expect(menu).toBeVisible();
    return menu;
  }

  test('exposes the core note actions', async ({ page }) => {
    const menu = await openContextMenu(page);
    for (const label of ['移动到文件夹', '创建副本', '导出为 Markdown', '导出为 PDF', '置顶', '收藏', '删除']) {
      await expect(menu.getByRole('menuitem', { name: label, exact: true })).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can duplicate a note', async ({ page }) => {
    const menu = await openContextMenu(page);
    await menu.getByRole('menuitem', { name: '创建副本', exact: true }).click();
    await expect(menu).not.toBeVisible();

    await openNotesSidebarIfNeeded(page);
    await expect(page.getByText(/Context Menu Test Note/)).toHaveCount(2);
    assertNoConsoleErrors(page);
  });

  test('can pin and favorite a note', async ({ page }) => {
    let menu = await openContextMenu(page);
    await menu.getByRole('menuitem', { name: '置顶', exact: true }).click();

    menu = await openContextMenu(page);
    await expect(menu.getByRole('menuitem', { name: '取消置顶', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');

    menu = await openContextMenu(page);
    await menu.getByRole('menuitem', { name: '收藏', exact: true }).click();

    menu = await openContextMenu(page);
    await expect(menu.getByRole('menuitem', { name: '取消收藏', exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('closes on Escape', async ({ page }) => {
    const menu = await openContextMenu(page);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    assertNoConsoleErrors(page);
  });
});
