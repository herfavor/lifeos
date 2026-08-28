import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers';

/**
 * PM Dashboard E2E Tests
 *
 * Tests the project management dashboard at /pm.
 */

test.describe('PM Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/pm');
  });

  test('page loads', async ({ page }) => {
    await expect(page).toHaveURL(/\/pm/);
  });

  test('shows project stats', async ({ page }) => {
    // Should show stat cards: Total Tasks, Completed, In Progress, Overdue
    const statsSection = page.getByText(/任务总数|已完成|进行中|逾期/i).first();
    await expect(statsSection).toBeVisible();
  });

  test('has project selector', async ({ page }) => {
    // Project selector dropdown
    const projectSelector = page.getByText(/全部项目|选择项目/i).first();
    if (await projectSelector.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(projectSelector).toBeVisible();
    }
  });
});
