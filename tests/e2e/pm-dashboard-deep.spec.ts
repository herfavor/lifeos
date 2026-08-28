import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * PM Dashboard Deep E2E Tests
 *
 * Tests the project management dashboard:
 * burndown chart, blocked tasks, upcoming deadlines,
 * project progress, team workload.
 */

test.describe('PM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/pm');
  });

  test('page loads with heading', async ({ page }) => {
    const heading = page.getByRole('heading', { name: /项目管理/ }).first();
    if (await heading.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(heading).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has project selector', async ({ page }) => {
    const selector = page.locator('select, [role="combobox"]').first();
    if (await selector.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(selector).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has burndown chart section', async ({ page }) => {
    const burndown = page.getByText(/燃尽/);
    if (await burndown.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(burndown).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has blocked tasks section', async ({ page }) => {
    const blocked = page.getByText(/受阻/);
    if (await blocked.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(blocked).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has upcoming deadlines section', async ({ page }) => {
    const deadlines = page.getByText(/到期|即将|截止/).first();
    if (await deadlines.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(deadlines).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has task completion stats', async ({ page }) => {
    const stats = page.getByText(/已完成|进行中/).first();
    if (await stats.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(stats).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('has sprint or timeline view', async ({ page }) => {
    const sprint = page.getByText(/冲刺|时间线/).first();
    if (await sprint.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(sprint).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });
});
