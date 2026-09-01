import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  createBlankNote,
  navigateTo,
  setupConsoleMonitor,
} from './helpers';

test.describe('Note Editor', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
  });

  test('creates an editable titled note', async ({ page }) => {
    const editor = await createBlankNote(page, 'Editor E2E Note');
    await editor.click();
    await page.keyboard.type('Editable body');

    await expect(page.getByPlaceholder('无标题笔记')).toHaveValue('Editor E2E Note');
    await expect(editor).toContainText('Editable body');
    assertNoConsoleErrors(page);
  });

  test('exposes the primary formatting toolbar actions', async ({ page }) => {
    await createBlankNote(page, 'Toolbar E2E Note');

    for (const title of ['加粗 (Cmd+B)', '斜体 (Cmd+I)', '二级标题', '项目符号列表', '插入代码块']) {
      await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('opens slash commands from the editor', async ({ page }) => {
    const editor = await createBlankNote(page, 'Slash Command Note');
    await editor.click();
    await page.keyboard.type('/');

    await expect(page.locator('[role="menu"], [role="listbox"]').first()).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('applies keyboard bold formatting', async ({ page }) => {
    const editor = await createBlankNote(page, 'Bold Note');
    await editor.click();
    await page.keyboard.press('Control+b');
    await page.keyboard.type('bold text');
    await page.keyboard.press('Control+b');

    await expect(editor.locator('strong, b')).toContainText('bold text');
    assertNoConsoleErrors(page);
  });

  test('opens the template library from the empty state', async ({ page }) => {
    await page.getByRole('button', { name: '从模板创建', exact: true }).click();
    await expect(page.getByRole('heading', { name: '模板库', exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('note details are available without a separate folder selector', async ({ page }) => {
    await createBlankNote(page, 'Details Note');
    const details = page.getByRole('button', { name: /详情/ });
    await details.click();
    await expect(details).toHaveAttribute('aria-expanded', 'true');
    assertNoConsoleErrors(page);
  });
});
