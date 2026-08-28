import { test, expect } from '@playwright/test';
import { isMobileViewport, navigateTo } from './helpers';

/**
 * Accessibility E2E Tests
 *
 * Tests ARIA landmarks, keyboard navigation, focus management,
 * and semantic structure across key pages.
 */

test.describe('Accessibility - ARIA Landmarks', () => {
  test('dashboard exposes the active navigation landmark', async ({ page }) => {
    await navigateTo(page, '/');
    const label = isMobileViewport(page) ? '移动端导航' : '主导航';
    await expect(page.getByRole('navigation', { name: label })).toBeVisible();
  });

  test('sidebar is accessible on desktop and inert while closed on mobile', async ({ page }) => {
    await navigateTo(page, '/');
    const sidebar = page.locator('aside[aria-label="主导航侧边栏"]');

    if (isMobileViewport(page)) {
      await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
      await expect(sidebar).toHaveAttribute('inert', '');
    } else {
      await expect(sidebar).toBeVisible();
      await expect(sidebar).not.toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('primary navigation has an explicit accessible name', async ({ page }) => {
    await navigateTo(page, '/');
    const label = isMobileViewport(page) ? '移动端导航' : '主导航';
    await expect(page.getByRole('navigation', { name: label })).toBeVisible();
  });
});

test.describe('Accessibility - Focus Management', () => {
  test('tab navigation reaches interactive elements', async ({ page }) => {
    await navigateTo(page, '/');

    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Something should be focused
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('modals trap focus', async ({ page }) => {
    await navigateTo(page, '/');

    // Open Command Palette
    await page.keyboard.press('Control+k');
    await expect(page.getByRole('dialog', { name: 'Synapse 搜索' })).toBeVisible();

    // The input should be focused
    const input = page.getByRole('combobox');
    await expect(input).toBeFocused();

    // Tab should keep focus within the dialog
    await page.keyboard.press('Tab');
    const dialog = page.getByRole('dialog', { name: 'Synapse 搜索' });
    await expect.poll(() =>
      dialog.evaluate((element) => element.contains(document.activeElement))
    ).toBe(true);
  });
});

test.describe('Accessibility - Task Surface', () => {
  test('tasks page exposes a named primary create action', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await expect(page.getByRole('button', { name: '新建任务', exact: true })).toBeVisible();
  });

  test('task view controls remain keyboard-addressable buttons', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await expect(page.getByRole('button', { name: /看板/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /列表/ }).first()).toBeVisible();
  });

  test('task search is present on the primary surface', async ({ page }) => {
    await navigateTo(page, '/tasks');
    await expect(page.getByPlaceholder(/搜索任务/)).toBeVisible();
  });
});

test.describe('Accessibility - Notes Tabs', () => {
  test('notes page has proper tablist', async ({ page }) => {
    await navigateTo(page, '/notes');

    const tablist = page.locator('[role="tablist"][aria-label="笔记导航"]');
    await expect(tablist).toBeVisible();
  });
});

test.describe('Accessibility - Command Palette', () => {
  test('command palette has proper dialog role', async ({ page }) => {
    await navigateTo(page, '/');
    await page.keyboard.press('Control+k');

    const dialog = page.getByRole('dialog', { name: 'Synapse 搜索' });
    await expect(dialog).toBeVisible();

    const combobox = page.getByRole('combobox');
    await expect(combobox).toBeVisible();

    const listbox = page.locator('#command-palette-results');
    // Listbox appears when results are present
  });
});
