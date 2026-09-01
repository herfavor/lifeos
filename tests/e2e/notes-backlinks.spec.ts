import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  createBlankNote,
  navigateTo,
  selectNoteByTitle,
  setupConsoleMonitor,
} from './helpers';

async function openRelations(page: import('@playwright/test').Page) {
  const summary = page.getByText('关联与提及', { exact: true });
  await expect(summary).toBeVisible();
  await summary.click();
}

test.describe('Notes Relationships', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
  });

  test('shows a backlink from a wiki-linked source note', async ({ page }) => {
    await createBlankNote(page, 'Backlink Target');

    const source = await createBlankNote(page, 'Backlink Source');
    await source.click();
    await page.keyboard.type('Reference [[Backlink Target]]');
    await expect(page.locator('.wiki-link-valid').filter({ hasText: 'Backlink Target' })).toBeVisible();

    await selectNoteByTitle(page, 'Backlink Target');
    await openRelations(page);

    await expect(page.getByText('链接到这里', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /Backlink Source/ })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('detects and converts an unlinked mention', async ({ page }) => {
    await createBlankNote(page, 'Mention Target');

    const source = await createBlankNote(page, 'Mention Source');
    await source.click();
    await page.keyboard.type('This text mentions Mention Target without brackets.');
    await expect(source).toContainText('Mention Target');

    await selectNoteByTitle(page, 'Mention Target');
    await openRelations(page);

    await expect(page.getByText('可建立链接的提及', { exact: true })).toBeVisible();
    await expect(page.getByText('Mention Source', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: '建立链接', exact: true }).click();
    await expect(page.getByText('链接到这里', { exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('surfaces broken links without creating data silently', async ({ page }) => {
    const editor = await createBlankNote(page, 'Broken Link Source');
    await editor.click();
    await page.keyboard.type('Reference [[Future Missing Note]]');
    await expect(page.locator('.wiki-link-broken').filter({ hasText: 'Future Missing Note' })).toBeVisible();

    await openRelations(page);
    await expect(page.getByText(/失效链接 1/)).toBeVisible();
    await expect(page.getByRole('button', { name: '创建', exact: true })).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('clicking a backlink opens the source note', async ({ page }) => {
    await createBlankNote(page, 'Navigation Target');

    const source = await createBlankNote(page, 'Navigation Source');
    await source.click();
    await page.keyboard.type('Reference [[Navigation Target]]');
    await expect(page.locator('.wiki-link-valid').filter({ hasText: 'Navigation Target' })).toBeVisible();

    await selectNoteByTitle(page, 'Navigation Target');
    await openRelations(page);

    await page.getByRole('button', { name: /Navigation Source/ }).click();
    await expect(page.getByPlaceholder('无标题笔记')).toHaveValue('Navigation Source');
    assertNoConsoleErrors(page);
  });
});
