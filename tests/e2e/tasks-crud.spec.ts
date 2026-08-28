import { test, expect } from '@playwright/test';
import { createTask, navigateTo } from './helpers';

test.describe('Tasks Page - Primary Surface', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/tasks');
  });

  test('shows the current primary task surface', async ({ page }) => {
    await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/搜索任务/)).toBeVisible();
    await expect(page.getByRole('heading', { name: '待办' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '进行中' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '已完成' })).toBeVisible();
  });

  test('can create and cancel inline tasks', async ({ page }) => {
    await createTask(page, 'E2E New Task');
    await expect(page.getByText('E2E New Task', { exact: true })).toBeVisible();

    const addButton = page.getByRole('button', { name: '+ 添加任务' }).first();
    await addButton.click();
    const input = page.getByPlaceholder('任务标题…');
    await input.fill('Should Not Be Created');
    await page.getByRole('button', { name: '取消', exact: true }).click();

    await expect(input).not.toBeVisible();
    await expect(page.getByText('Should Not Be Created', { exact: true })).toHaveCount(0);
  });

  test('search filters tasks', async ({ page }) => {
    await createTask(page, 'Alpha Task');
    await createTask(page, 'Beta Task');

    const searchInput = page.getByPlaceholder(/搜索任务/);
    await searchInput.fill('Alpha');

    await expect(page.getByText('Alpha Task', { exact: true })).toBeVisible();
    await expect(page.getByText('Beta Task', { exact: true })).toHaveCount(0);

    await searchInput.clear();
    await expect(page.getByText('Beta Task', { exact: true })).toBeVisible();
  });

  test('supports board and list views', async ({ page }) => {
    const board = page.locator('button[title="看板 视图"]');
    const list = page.locator('button[title="列表 视图"]');

    await expect(board).toBeVisible();
    await expect(list).toBeVisible();

    await list.click();
    await expect(list).toHaveClass(/bg-accent-blue/);

    await board.click();
    await expect(board).toHaveClass(/bg-accent-blue/);
  });

  test('has task export', async ({ page }) => {
    await expect(page.getByRole('button', { name: '导出', exact: true })).toBeVisible();
  });
});

test.describe('Tasks Page - Advanced Routes', () => {
  test('timeline remains reachable through its dedicated route', async ({ page }) => {
    await navigateTo(page, '/tasks?tab=timeline');
    await expect(page.getByText('任务时间线', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '← 返回任务', exact: true })).toBeVisible();
  });

  test('habits remain reachable through their dedicated route', async ({ page }) => {
    await navigateTo(page, '/tasks?tab=habits');
    await expect(page.getByText('习惯', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('今日', { exact: true }).first()).toBeVisible();
  });

  test('resources remain reachable through their dedicated route', async ({ page }) => {
    await navigateTo(page, '/tasks?tab=resources');
    await expect(page.getByRole('heading', { name: '资源利用率' })).toBeVisible();
  });
});

test.describe('Tasks Page - Task Detail', () => {
  test('clicking a task opens its detail dialog', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await createTask(page, 'Detail Test Task');
    await page.getByText('Detail Test Task', { exact: true }).click();

    await expect(page.getByRole('dialog', { name: 'Detail Test Task' })).toBeVisible();
  });
});
