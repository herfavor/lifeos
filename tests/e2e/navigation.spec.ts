import { test, expect } from '@playwright/test';
import {
  clickPrimaryNavigationLink,
  isMobileViewport,
  navigateTo,
} from './helpers';

test.describe('Primary Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/');
  });

  test('exposes the current core navigation', async ({ page }) => {
    if (isMobileViewport(page)) {
      const nav = page.getByRole('navigation', { name: '移动端导航' });
      for (const label of ['今天', '收件箱', '任务', '笔记']) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
      }
      await expect(nav.getByRole('button', { name: '更多导航选项' })).toBeVisible();
      return;
    }

    const nav = page.getByRole('navigation', { name: '主导航' });
    for (const label of ['今天', '收件箱', '任务', '项目', '日程', '笔记', '回顾']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('keeps secondary destinations behind the 更多功能 disclosure', async ({ page }) => {
    test.skip(isMobileViewport(page), 'Desktop sidebar disclosure is not a mobile interaction.');

    const nav = page.getByRole('navigation', { name: '主导航' });
    await nav.getByRole('button', { name: '更多功能' }).click();

    for (const label of ['概览', 'AI', '收藏']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('navigates through representative core pages', async ({ page }) => {
    for (const [label, route] of [
      ['任务', /\/tasks(?:\?|$)/],
      ['笔记', /\/notes(?:\?|$)/],
      ['日程', /\/schedule(?:\?|$)/],
      ['项目', /\/pm(?:\?|$)/],
      ['概览', /\/$/],
    ] as const) {
      await clickPrimaryNavigationLink(page, label);
      await expect(page).toHaveURL(route);
    }
  });

  test('desktop sidebar can collapse and expand', async ({ page }) => {
    test.skip(isMobileViewport(page), 'Desktop sidebar collapse is not a mobile interaction.');

    const sidebar = page.getByRole('complementary', { name: '主导航侧边栏' });
    await expect(sidebar).toBeVisible();

    await page.getByRole('button', { name: '折叠侧边栏' }).click();
    await expect(page.getByRole('button', { name: '展开侧边栏' })).toBeVisible();

    await page.getByRole('button', { name: '展开侧边栏' }).click();
    await expect(page.getByRole('button', { name: '折叠侧边栏' })).toBeVisible();
  });

  test('mobile More sheet exposes secondary destinations', async ({ page }) => {
    test.skip(!isMobileViewport(page), 'Mobile More sheet is only rendered below the md breakpoint.');

    const nav = page.getByRole('navigation', { name: '移动端导航' });
    await nav.getByRole('button', { name: '更多导航选项' }).click();

    const dialog = page.getByRole('dialog', { name: '更多导航选项' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: '设置', exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  });
});

test.describe('Theme Persistence', () => {
  test('explicit appearance mode persists after reload', async ({ page }) => {
    await navigateTo(page, '/settings?tab=appearance');

    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    const target = wasDark ? '浅色' : '深色';

    await page.getByRole('button', { name: target, exact: true }).click();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(!wasDark);

    await page.reload();
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.classList.contains('dark'))
    ).toBe(!wasDark);
  });
});

test.describe('Direct URL Routing', () => {
  test('loads current core routes', async ({ page }) => {
    await navigateTo(page, '/today');
    await expect(page.getByRole('main')).toBeVisible();

    await navigateTo(page, '/tasks');
    await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();

    await navigateTo(page, '/notes');
    await expect(page.getByRole('tab', { name: '笔记' })).toBeVisible();

    await navigateTo(page, '/schedule');
    await expect(page.getByRole('main')).toBeVisible();

    await navigateTo(page, '/create');
    await expect(page.getByRole('tabpanel')).toBeVisible();

    await navigateTo(page, '/links');
    await expect(page.getByPlaceholder('搜索链接…')).toBeVisible();

    await navigateTo(page, '/settings');
    await expect(page.getByRole('button', { name: '个人与应用', exact: true })).toBeVisible();
  });

  test('loads standalone focus', async ({ page }) => {
    await navigateTo(page, '/focus');
    await expect(page.locator('button[aria-label="退出专注模式"]')).toBeVisible();
  });

  test('legacy routes converge on their current homes', async ({ page }) => {
    await navigateTo(page, '/docs');
    await expect(page).toHaveURL(/\/create$/);

    await navigateTo(page, '/habits');
    await expect(page).toHaveURL(/\/tasks.*tab=habits/);

    await navigateTo(page, '/graph');
    await expect(page).toHaveURL(/\/notes.*tab=graph/);

    await navigateTo(page, '/diagrams/legacy-id');
    await expect(page).toHaveURL(/\/create$/);

    await navigateTo(page, '/forms/legacy-id/edit');
    await expect(page).toHaveURL(/\/create$/);
  });
});
