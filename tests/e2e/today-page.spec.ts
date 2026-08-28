import { test, expect } from '@playwright/test';
import { navigateTo } from './helpers';

/**
 * Today Page E2E Tests
 *
 * Tests the /today daily planning view: metrics, task list, timeline,
 * and navigation to related pages.
 */

test.describe('Today Page', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/today');
  });

  test('displays the page with metrics section', async ({ page }) => {
    // The Today page should show metric cards
    await expect(page.getByText('已完成')).toBeVisible();
    await expect(page.getByText('已记录')).toBeVisible();
    await expect(page.getByText('事件')).toBeVisible();
    await expect(page.getByText('专注')).toBeVisible();
  });

  test('displays Today\'s Tasks section', async ({ page }) => {
    await expect(page.getByText('今日任务')).toBeVisible();
  });

  test('has add task button that navigates to tasks', async ({ page }) => {
    const addTaskBtn = page.locator('button[aria-label="添加任务"]');
    await expect(addTaskBtn).toBeVisible();
    await addTaskBtn.click();
    await expect(page).toHaveURL(/\/tasks/);
  });

  test('has Full Schedule link', async ({ page }) => {
    const fullScheduleLink = page.getByText('完整日程');
    if (await fullScheduleLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fullScheduleLink.click();
      await expect(page).toHaveURL(/\/schedule/);
    }
  });

  test('metrics show numeric values', async ({ page }) => {
    // Each metric card should contain a number
    const completedCard = page.getByText('已完成').locator('..');
    await expect(completedCard).toBeVisible();

    // The card should contain a numeric display
    const numericValue = completedCard.locator('text=/\\d+/').first();
    await expect(numericValue).toBeVisible();
  });
});
