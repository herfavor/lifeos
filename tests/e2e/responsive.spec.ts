import { test, expect } from '@playwright/test';
import { dismissOnboarding, navigateTo } from './helpers';

test.describe('Responsive - Mobile (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('dashboard uses mobile navigation and keeps desktop sidebar inert', async ({ page }) => {
    await navigateTo(page, '/');

    await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeVisible();
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
    await expect(sidebar).toHaveAttribute('inert', '');
  });

  test('notes and tasks expose their primary mobile actions', async ({ page }) => {
    await navigateTo(page, '/notes');
    await expect(page.getByRole('tablist', { name: '笔记导航' }).getByRole('tab', { name: '笔记', exact: true }).first()).toBeVisible();

    await navigateTo(page, '/tasks');
    await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();
  });

  test('focus page works on mobile', async ({ page }) => {
    await navigateTo(page, '/focus');
    await expect(page.locator('button[aria-label="退出专注模式"]')).toBeVisible();
    await expect(page.getByText(/\d{2}:\d{2}/)).toBeVisible();
  });

  test('daily actions and every More-menu destination are touch reachable', async ({ page }) => {
    await navigateTo(page, '/');

    const mobileNav = page.getByRole('navigation', { name: '移动端导航' });
    for (const label of ['AI', '今天', '收件箱', '任务', '笔记']) {
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

  test('dashboard and desktop-style navigation load at md breakpoint', async ({ page }) => {
    await navigateTo(page, '/');

    const nav = page.getByRole('navigation', { name: '主导航' });
    await expect(nav).toBeVisible();
    await nav.getByRole('link', { name: '任务', exact: true }).click();
    await expect(page).toHaveURL(/\/tasks/);
  });
});

test.describe('Responsive - Desktop (1440px)', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('core navigation and AI are visible directly on desktop', async ({ page }) => {
    await navigateTo(page, '/');

    const sidebar = page.getByRole('complementary', { name: '主导航侧边栏' });
    await expect(sidebar).toBeVisible();

    const nav = page.getByRole('navigation', { name: '主导航' });
    for (const label of ['首页', 'AI', '任务', '笔记', '日程', '收藏']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
  });

  test('home keeps the five-step workflow on one row', async ({ page }) => {
    await navigateTo(page, '/');

    const workflow = page.getByRole('navigation', { name: 'LifeOS 工作流' });
    const topPositions: number[] = [];
    for (const label of ['收集', '安排', '专注', '沉淀', '回顾']) {
      const step = workflow.getByRole('link', { name: new RegExp(`^${label}`) });
      await expect(step).toBeVisible();
      const box = await step.boundingBox();
      expect(box).not.toBeNull();
      topPositions.push(Math.round(box!.y));
    }
    expect(new Set(topPositions).size).toBe(1);
    await expect(page.getByRole('button', { name: '收进来' })).toBeVisible();
  });
});

test.describe('Responsive - Wide desktop (2560px)', () => {
  test.use({ viewport: { width: 2560, height: 1187 } });

  test('core workspace uses width without horizontal page overflow', async ({ page }) => {
    await page.goto('/tasks');
    await dismissOnboarding(page);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
    await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();
  });
});
