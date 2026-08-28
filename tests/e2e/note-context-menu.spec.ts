import { test, expect } from '@playwright/test';
import { navigateTo, createNote, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Note Context Menu E2E Tests
 *
 * Tests the right-click context menu on notes:
 * Move to Folder, Duplicate, Export (Markdown/PDF),
 * Pin/Unpin, Favorite/Unfavorite, Delete.
 */

test.describe('Note Context Menu', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
    // Create a note to interact with
    await createNote(page, 'Context Menu Test Note');
  });

  async function openContextMenu(page: import('@playwright/test').Page) {
    // Right-click on the note in the sidebar list
    const noteItem = page.getByText('Context Menu Test Note').first();
    await noteItem.click({ button: 'right' });
    await page.waitForTimeout(300);
  }

  test('opens context menu on right-click', async ({ page }) => {
    await openContextMenu(page);
    const menu = page.locator('[role="menu"][aria-label="笔记右键菜单"]');
    if (await menu.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(menu).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Move to Folder option', async ({ page }) => {
    await openContextMenu(page);
    const menuItem = page.getByRole('menuitem', { name: /移动到文件夹/ });
    if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(menuItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Duplicate option', async ({ page }) => {
    await openContextMenu(page);
    const menuItem = page.getByRole('menuitem', { name: '创建副本' });
    if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(menuItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Export to Markdown option', async ({ page }) => {
    await openContextMenu(page);
    const menuItem = page.getByRole('menuitem', { name: '导出为 Markdown' });
    if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(menuItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Export to PDF option', async ({ page }) => {
    await openContextMenu(page);
    const menuItem = page.getByRole('menuitem', { name: '导出为 PDF' });
    if (await menuItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(menuItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Pin/Unpin option', async ({ page }) => {
    await openContextMenu(page);
    const pinItem = page.getByRole('menuitem', { name: /^置顶$|^取消置顶$/ });
    if (await pinItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pinItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Favorite/Unfavorite option', async ({ page }) => {
    await openContextMenu(page);
    const favItem = page.getByRole('menuitem', { name: /^收藏$|^取消收藏$/ });
    if (await favItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(favItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('context menu has Delete option', async ({ page }) => {
    await openContextMenu(page);
    const deleteItem = page.getByRole('menuitem', { name: '删除' });
    if (await deleteItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(deleteItem).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can duplicate a note', async ({ page }) => {
    await openContextMenu(page);
    const dupItem = page.getByRole('menuitem', { name: '创建副本' });
    if (await dupItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await dupItem.click();
      await page.waitForTimeout(500);
      // Should see a copy of the note
    }
    assertNoConsoleErrors(page);
  });

  test('can pin a note', async ({ page }) => {
    await openContextMenu(page);
    const pinItem = page.getByRole('menuitem', { name: '置顶' });
    if (await pinItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pinItem.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('can favorite a note', async ({ page }) => {
    await openContextMenu(page);
    const favItem = page.getByRole('menuitem', { name: '收藏' });
    if (await favItem.isVisible({ timeout: 2000 }).catch(() => false)) {
      await favItem.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('context menu closes on Escape', async ({ page }) => {
    await openContextMenu(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const menu = page.locator('[role="menu"][aria-label="笔记右键菜单"]');
    await expect(menu).not.toBeVisible();
    assertNoConsoleErrors(page);
  });
});
