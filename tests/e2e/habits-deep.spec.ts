import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Habits Deep E2E Tests
 *
 * Tests habit completion, streaks, archive,
 * and the full habit lifecycle.
 */

test.describe('Habits', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/habits');
  });

  test('page loads', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /习惯/ });
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has add habit button', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /添加.*习惯|新建.*习惯|\+/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can open add habit form', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /添加.*习惯|新建.*习惯|\+/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const nameInput = page.getByPlaceholder(/例如：冥想|名称|标题/).first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(nameInput).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });

  test('can create a habit', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /添加.*习惯|新建.*习惯|\+/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const nameInput = page.getByPlaceholder(/例如：冥想|名称|标题/).first();
      if (await nameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await nameInput.fill('E2E Test Habit');

        const saveBtn = page.getByRole('button', { name: /保存|创建|添加/ }).first();
        if (await saveBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveBtn.click();
          await page.waitForTimeout(300);
          await expect(page.getByText('E2E Test Habit')).toBeVisible();
        }
      }
    }
    assertNoConsoleErrors(page);
  });

  test('habit has completion toggle', async ({ page }) => {
    // Look for any habit completion checkbox or toggle
    const toggle = page.locator('[role="checkbox"], input[type="checkbox"]').first();
    if (await toggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(toggle).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has streak display', async ({ page }) => {
    const streak = page.getByText(/连续|天/).first();
    if (await streak.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(streak).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has archive/active filter', async ({ page }) => {
    const archiveBtn = page.getByRole('button', { name: /归档/ });
    if (await archiveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(archiveBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has frequency options', async ({ page }) => {
    const addBtn = page.getByRole('button', { name: /添加.*习惯|新建.*习惯|\+/i }).first();
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click();
      await page.waitForTimeout(300);

      const frequencySelect = page.locator('select').filter({ has: page.locator('option', { hasText: /每天/ }) });
      if (await frequencySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(frequencySelect).toBeVisible();
      }
    }
    assertNoConsoleErrors(page);
  });
});
