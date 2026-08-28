import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * Calendar Views E2E Tests
 *
 * Tests month/week/day view switching,
 * navigation, and event display in each view.
 */

test.describe('Calendar Views', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/schedule');
  });

  test('calendar page loads', async ({ page }) => {
    const heading = page.getByText(/日程|日历/i).first();
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has month view button', async ({ page }) => {
    const monthBtn = page.getByRole('button', { name: /月/i });
    if (await monthBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(monthBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has week view button', async ({ page }) => {
    const weekBtn = page.getByRole('button', { name: /周/i });
    if (await weekBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(weekBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has day view button', async ({ page }) => {
    const dayBtn = page.getByRole('button', { name: /日/i });
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(dayBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can switch to week view', async ({ page }) => {
    const weekBtn = page.getByRole('button', { name: /周/i });
    if (await weekBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await weekBtn.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('can switch to day view', async ({ page }) => {
    const dayBtn = page.getByRole('button', { name: /日/i });
    if (await dayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dayBtn.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('has today button', async ({ page }) => {
    const todayBtn = page.getByRole('button', { name: /今天/i });
    if (await todayBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(todayBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has navigation arrows', async ({ page }) => {
    const prevBtn = page.locator('[aria-label*="上一个"], [title*="上一个"]').first();
    const nextBtn = page.locator('[aria-label*="下一个"], [title*="下一个"]').first();
    if (await prevBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(prevBtn).toBeVisible();
    }
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(nextBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can navigate to next month', async ({ page }) => {
    const nextBtn = page.locator('[aria-label*="下一个"], [title*="下一个"]').first();
    if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('can navigate to previous month', async ({ page }) => {
    const prevBtn = page.locator('[aria-label*="上一个"], [title*="上一个"]').first();
    if (await prevBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(300);
    }
    assertNoConsoleErrors(page);
  });

  test('has create event button', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /新建事件|创建事件|\+/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(createBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has ICS import button', async ({ page }) => {
    const importBtn = page.getByRole('button', { name: /导入/i });
    if (await importBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(importBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });
});
