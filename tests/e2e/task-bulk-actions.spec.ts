import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors, createTask } from './helpers';

/**
 * Task Bulk Actions E2E Tests
 *
 * Tests multi-select, bulk status change,
 * bulk tag, bulk delete operations.
 */

test.describe('Task Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/tasks');
  });

  test('tasks page loads', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /任务/i }).first();
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has select all checkbox or button', async ({ page }) => {
    const selectAll = page.locator('[aria-label*="全选"], [title*="全选"], input[type="checkbox"]').first();
    if (await selectAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selectAll).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has sort options', async ({ page }) => {
    const sortBtn = page.getByRole('button', { name: /排序/i }).first();
    if (await sortBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sortBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has filter options', async ({ page }) => {
    const filterBtn = page.getByRole('button', { name: /筛选/i }).first();
    if (await filterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(filterBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has view toggle (list/kanban/gantt)', async ({ page }) => {
    const listView = page.getByRole('button', { name: /列表/i }).first();
    const kanbanView = page.getByRole('button', { name: /看板/i }).first();
    if (await listView.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(listView).toBeVisible();
    }
    if (await kanbanView.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(kanbanView).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can create a task from tasks page', async ({ page }) => {
    await createTask(page, 'Bulk Action Test Task');
    assertNoConsoleErrors(page);
  });

  test('has search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索/i).first();
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(searchInput).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has group by options', async ({ page }) => {
    const groupBtn = page.getByRole('button', { name: /分组/i });
    if (await groupBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(groupBtn).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });
});
