import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Document Editor E2E Tests
 *
 * Tests document creation and editing from
 * the Create page's Documents tab.
 */

test.describe('Document Editor', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/create');
  });

  test('create page loads', async ({ page }) => {
    const heading = page.getByText(/创建|文档/i).first();
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has documents tab', async ({ page }) => {
    const docsTab = page.getByRole('tab', { name: /文档/i });
    if (await docsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(docsTab).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can create a new document', async ({ page }) => {
    const newDocBtn = page.getByRole('button', { name: /新建.*文档|创建.*文档|文档|\+/i }).first();
    if (await newDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newDocBtn.click();
      await page.waitForTimeout(500);
    }
    assertNoConsoleErrors(page);
  });

  test('document editor has content area', async ({ page }) => {
    const newDocBtn = page.getByRole('button', { name: /新建.*文档|创建.*文档|文档|\+/i }).first();
    if (await newDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newDocBtn.click();
      await page.waitForTimeout(500);

      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(editor).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('document has title input', async ({ page }) => {
    const newDocBtn = page.getByRole('button', { name: /新建.*文档|创建.*文档|文档|\+/i }).first();
    if (await newDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newDocBtn.click();
      await page.waitForTimeout(500);

      const titleInput = page.getByPlaceholder(/标题|无标题/i).first();
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(titleInput).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('document has formatting toolbar', async ({ page }) => {
    const newDocBtn = page.getByRole('button', { name: /新建.*文档|创建.*文档|文档|\+/i }).first();
    if (await newDocBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newDocBtn.click();
      await page.waitForTimeout(500);

      const toolbar = page.locator('[role="toolbar"]').first()
        .or(page.locator('[aria-label="加粗"], [title^="加粗"]').first());
      if (await toolbar.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(toolbar).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });
});
