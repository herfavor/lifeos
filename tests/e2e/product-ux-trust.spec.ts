import { expect, test, type Page } from '@playwright/test';
import { assertNoConsoleErrors, dismissOnboarding, setupConsoleMonitor } from './helpers';
import { setStoreData } from '../fixtures/test-data';

async function writeSyncedState(page: Page, key: string, value: unknown): Promise<void> {
  await page.goto('/');
  await setStoreData(page, key, value);
}

test.describe('Product trust regressions', () => {
  test.beforeEach(async ({ page }) => setupConsoleMonitor(page));

  test('empty Today uses an honest no-sample state', async ({ page }) => {
    await page.goto('/today');
    await dismissOnboarding(page);

    await expect(page.getByText('暂无计划').first()).toBeVisible();
    await expect(page.getByText('—').first()).toBeVisible();
    await expect(page.getByText('100%', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '从收件箱安排' })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('legacy 900+ bookmark data opens with archive and trash intact', async ({ page }) => {
    const links = Array.from({ length: 925 }, (_, index) => ({
      id: `legacy-${index}`,
      title: `旧收藏 ${index}`,
      url: `https://example.com/${index}`,
      createdAt: index % 2 === 0 ? '2024-01-01T00:00:00.000Z' : null,
      updatedAt: 'invalid-date',
      tags: index % 5 === 0 ? ['旧数据'] : undefined,
      isArchived: index === 923,
      deletedAt: index === 924 ? '2026-08-26T00:00:00.000Z' : undefined,
    }));
    await writeSyncedState(page, 'link-library', { state: { links, collections: [] }, version: 1 });

    await page.goto('/links');
    await expect(page.getByText('925 个链接')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ 添加链接' })).toBeVisible();
    await expect(page.getByText(/加载收藏时出现问题/)).toHaveCount(0);

    await page.getByText('已归档', { exact: true }).click();
    await expect(page.getByText('旧收藏 923')).toBeVisible();
    await page.getByText('最近删除', { exact: true }).click();
    await expect(page.getByText('旧收藏 924')).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('availability renders one global heading and accurate copy action', async ({ page }) => {
    await page.goto('/availability');
    await dismissOnboarding(page);

    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('button', { name: /复制空闲时段/ })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('focus stays standalone while retired editor routes return to Create', async ({ page }) => {
    await page.goto('/focus');
    await dismissOnboarding(page);
    await expect(page.locator('aside[aria-label="主导航侧边栏"]')).toHaveCount(0);

    for (const path of ['/diagrams/missing', '/forms/missing/fill', '/forms/missing/responses']) {
      await page.goto(path);
      await dismissOnboarding(page);
      await expect(page).toHaveURL(/\/create$/);
      await expect(page.locator('#root')).toBeVisible();
    }

    assertNoConsoleErrors(page);
  });
});
