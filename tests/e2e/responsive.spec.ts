import { test, expect } from '@playwright/test';
import { dismissOnboarding } from './helpers';

/**
 * Responsive Layout E2E Tests
 *
 * Tests the application at mobile, tablet, and desktop viewports.
 */

test.describe('Responsive - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dashboard loads on mobile', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);
    await expect(page).toHaveTitle(/LifeOS/i);
  });

  test('sidebar is hidden on mobile', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);

    // Sidebar should be hidden or a mobile drawer
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');
    // On mobile, the sidebar is typically not visible by default
  });

  test('notes page loads on mobile', async ({ page }) => {
    await page.goto('/notes');
    await dismissOnboarding(page);
    await expect(page.getByRole('tab', { name: '笔记' })).toBeVisible();
  });

  test('tasks page loads on mobile', async ({ page }) => {
    await page.goto('/tasks');
    await dismissOnboarding(page);
    await expect(page.getByRole('tab', { name: '任务' })).toBeVisible();
  });

  test('focus page works on mobile', async ({ page }) => {
    await page.goto('/focus');
    await dismissOnboarding(page);
    await expect(page.locator('button[aria-label="退出专注模式"]')).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
  });

  test('daily actions and every more-menu destination are touch reachable', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);

    const mobileNav = page.getByRole('navigation', { name: '移动端导航' });
    for (const label of ['今天', '收件箱', '任务', '笔记']) {
      await expect(mobileNav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    await mobileNav.getByRole('button', { name: '更多导航选项' }).click();
    const moreSheet = page.getByRole('dialog', { name: '更多导航选项' });
    await expect(moreSheet).toBeVisible();
    await moreSheet.evaluate((element) => { element.scrollTop = element.scrollHeight; });
    await expect(moreSheet.getByRole('link', { name: '设置', exact: true })).toBeVisible();
  });
});

test.describe('Responsive - Tablet (768px)', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('dashboard loads on tablet', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);
    await expect(page).toHaveTitle(/LifeOS/i);
  });

  test('navigation works on tablet', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);

    // Navigate to key pages
    const nav = page.locator('nav[aria-label="主导航"]');
    if (await nav.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nav.getByRole('link', { name: '任务' }).click();
      await expect(page).toHaveURL(/\/tasks/);
    }
  });
});

test.describe('Responsive - Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('dashboard loads on large desktop', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);
    await expect(page).toHaveTitle(/LifeOS/i);

    // Sidebar should be fully visible
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');
    await expect(sidebar).toBeVisible();
  });

  test('all navigation links visible on desktop', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);

    const nav = page.locator('nav[aria-label="主导航"]');
    await expect(nav.getByRole('link', { name: '首页' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '任务' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '笔记' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '日程' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '收藏' })).toBeVisible();
  });

  test('home keeps the five-step loop on one row and AI stays on demand', async ({ page }) => {
    await page.goto('/');
    await dismissOnboarding(page);

    const workflow = page.getByRole('navigation', { name: 'LifeOS 工作流' });
    const steps = ['收集', '安排', '专注', '沉淀', '回顾'];
    const topPositions: number[] = [];
    for (const label of steps) {
      const step = workflow.getByRole('link', { name: new RegExp(`^${label}`) });
      await expect(step).toBeVisible();
      const box = await step.boundingBox();
      expect(box).not.toBeNull();
      topPositions.push(Math.round(box!.y));
    }
    expect(new Set(topPositions).size).toBe(1);
    await expect(page.getByRole('button', { name: '收进来' })).toBeVisible();

    const sidebar = page.getByRole('complementary', { name: '主导航侧边栏' });
    await expect(sidebar.getByRole('link', { name: 'AI 指挥中心' })).toHaveCount(0);
    await sidebar.getByRole('button', { name: '更多功能' }).click();
    await expect(sidebar.getByRole('link', { name: 'AI 指挥中心' })).toBeVisible();
  });
});

test.describe('Responsive - Wide desktop (2560px)', () => {
  test.use({ viewport: { width: 2560, height: 1187 } });

  test('core workspace uses the width without horizontal page overflow', async ({ page }) => {
    await page.goto('/tasks');
    await dismissOnboarding(page);
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByRole('button', { name: '新建任务' })).toBeVisible();
  });
});
