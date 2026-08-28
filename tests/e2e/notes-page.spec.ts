import { test, expect } from '@playwright/test';
import {
  createBlankNote,
  navigateTo,
  openNotesSidebarIfNeeded,
  switchTab,
} from './helpers';
import { getStoreData } from '../fixtures/test-data';

test.describe('Notes Page - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
  });

  test('shows the primary notes tabs by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '笔记' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '每日笔记' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '图谱' })).toHaveCount(0);
  });

  test('notes tab is selected by default', async ({ page }) => {
    await expect(page.getByRole('tab', { name: '笔记' })).toHaveAttribute('aria-selected', 'true');
  });

  test('can switch to Daily Notes tab', async ({ page }) => {
    await switchTab(page, '每日笔记');
    await expect(page.getByRole('tab', { name: '每日笔记' })).toHaveAttribute('aria-selected', 'true');
  });

  test('advanced graph view remains reachable by URL', async ({ page }) => {
    await navigateTo(page, '/notes?tab=graph');
    await expect(page.getByRole('tab', { name: '图谱' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('tabs are addressable through URL params', async ({ page }) => {
    await navigateTo(page, '/notes?tab=daily');
    await expect(page.getByRole('tab', { name: '每日笔记' })).toHaveAttribute('aria-selected', 'true');

    await navigateTo(page, '/notes?tab=graph');
    await expect(page.getByRole('tab', { name: '图谱' })).toHaveAttribute('aria-selected', 'true');
  });
});

test.describe('Notes Page - Folder Sidebar', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await openNotesSidebarIfNeeded(page);
  });

  test('displays folder sidebar elements', async ({ page }) => {
    await expect(page.getByText('文件夹', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder(/搜索笔记/)).toBeVisible();
  });

  test('has All Notes button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /全部笔记/i })).toBeVisible();
  });

  test('can create a new folder', async ({ page }) => {
    await page.locator('button[title="新建文件夹"]').click();

    const folderInput = page.getByPlaceholder(/文件夹.*名称|名称/i);
    await expect(folderInput).toBeVisible();
    await folderInput.fill('E2E Folder');
    await folderInput.press('Enter');

    await expect(page.getByText('E2E Folder', { exact: true })).toBeVisible();
  });

  test('has Manage Tags button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /管理标签/i })).toBeVisible();
  });

  test('search accepts a note query without blocking the UI', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/搜索笔记/);
    await searchInput.fill('nonexistent note xyz123');
    await expect(searchInput).toHaveValue('nonexistent note xyz123');
  });
});

test.describe('Notes Page - CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
  });

  test('can create a new note', async ({ page }) => {
    const editor = await createBlankNote(page, 'E2E Created Note');
    await editor.click();
    await page.keyboard.type('E2E Created Note Content');

    await expect(editor).toContainText('E2E Created Note Content');
  });

  test('notes auto-save to persisted storage', async ({ page }) => {
    const editor = await createBlankNote(page, 'Auto-Save Test Note');
    await editor.click();
    await page.keyboard.type('Auto-Save Test Content');
    await expect(editor).toContainText('Auto-Save Test Content');

    await expect.poll(async () => {
      const persisted = await getStoreData<{ state?: { notes?: Record<string, { title?: string; contentText?: string }> } }>(
        page,
        'notes-store'
      );
      return Object.values(persisted?.state?.notes ?? {}).some(
        (note) => note.title === 'Auto-Save Test Note' && note.contentText?.includes('Auto-Save Test Content')
      );
    }, { timeout: 10_000 }).toBe(true);

    await page.reload();
    await navigateTo(page, '/notes');
    await openNotesSidebarIfNeeded(page);
    await expect(page.getByText('Auto-Save Test Note', { exact: true }).first()).toBeVisible();
  });

  test('can edit note content', async ({ page }) => {
    const editor = await createBlankNote(page, 'Editable Note');
    await editor.click();
    await page.keyboard.type('Initial Note Content');
    await expect(editor).toContainText('Initial Note Content');

    await page.keyboard.press('Control+a');
    await page.keyboard.type('Updated Note Content');

    await expect(editor).toContainText('Updated Note Content');
  });
});

test.describe('Notes Page - Editor Features', () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, '/notes');
    await createBlankNote(page, 'Formatting Test Note');
  });

  test('supports bold formatting with Ctrl+B', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('normal ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('bold');
    await page.keyboard.press('Control+b');

    await expect(editor.locator('strong, b')).toContainText('bold');
  });

  test('supports italic formatting with Ctrl+I', async ({ page }) => {
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('normal ');
    await page.keyboard.press('Control+i');
    await page.keyboard.type('italic');
    await page.keyboard.press('Control+i');

    await expect(editor.locator('em, i')).toContainText('italic');
  });
});

test.describe('Notes Page - Advanced Views', () => {
  test('daily notes tab renders a tab panel', async ({ page }) => {
    await navigateTo(page, '/notes?tab=daily');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });

  test('graph tab renders a tab panel', async ({ page }) => {
    await navigateTo(page, '/notes?tab=graph');
    await expect(page.getByRole('tabpanel')).toBeVisible();
  });
});
