import { test, expect } from '@playwright/test';
import { createTask, navigateTo } from './helpers';

test.describe('Task Detail Panel', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/tasks');
    await createTask(page, 'Detail Panel Test');
    await page.getByText('Detail Panel Test', { exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Detail Panel Test' })).toBeVisible();
  });

  test('opens with the task title', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    await expect(dialog.locator('input[type="text"]').first()).toHaveValue('Detail Panel Test');
  });

  test('can edit task title', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    const titleInput = dialog.locator('input[type="text"]').first();

    await titleInput.fill('Renamed Task');
    await titleInput.blur();

    await expect(page.getByText('Renamed Task', { exact: true }).first()).toBeVisible();
  });

  test('can set task priority', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    const priority = dialog.locator('select').filter({ has: page.locator('option[value="high"]') }).first();

    await priority.selectOption('high');
    await expect(priority).toHaveValue('high');
  });

  test('can add a description', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    const description = dialog.getByPlaceholder('添加描述…');

    await description.fill('This is a test description for the task');
    await description.blur();
    await expect(description).toHaveValue(/test description/);
  });

  test('exposes detail sections', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    for (const section of ['子任务', '清单', '评论', '动态']) {
      await expect(dialog.getByText(section, { exact: false }).first()).toBeVisible();
    }
  });

  test('closes with Escape', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: 'Detail Panel Test' });
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});
