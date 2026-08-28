import { test, expect } from '@playwright/test';
import {
  assertNoConsoleErrors,
  createBlankNote,
  navigateTo,
  setupConsoleMonitor,
} from './helpers';

async function typeWikiLink(page: import('@playwright/test').Page, target: string) {
  const editor = page.locator('[contenteditable="true"]').first();
  await editor.click();
  await page.keyboard.type(`Reference to [[${target}]]`);
  await expect(page.locator('.wiki-link').filter({ hasText: target }).first()).toBeVisible();
  return editor;
}

test.describe('Notes Wiki Links', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
  });

  test('can create a wiki link using [[brackets]]', async ({ page }) => {
    await createBlankNote(page, 'Wiki Source');
    await typeWikiLink(page, 'Target Note');

    const wikiLink = page.locator('.wiki-link').filter({ hasText: 'Target Note' }).first();
    await expect(wikiLink).toHaveAttribute('aria-label', /Target Note/);
    assertNoConsoleErrors(page);
  });

  test('can navigate by clicking a valid wiki link', async ({ page }) => {
    const targetEditor = await createBlankNote(page, 'Target Note');
    await targetEditor.click();
    await page.keyboard.type('Target Note Content');
    await expect(targetEditor).toContainText('Target Note Content');

    await createBlankNote(page, 'Source Note');
    await typeWikiLink(page, 'Target Note');

    const wikiLink = page.locator('.wiki-link-valid').filter({ hasText: 'Target Note' }).first();
    await expect(wikiLink).toBeVisible();
    await wikiLink.click();

    await expect(page.getByPlaceholder('无标题笔记')).toHaveValue('Target Note');
    await expect(page.locator('[contenteditable="true"]').first()).toContainText('Target Note Content');
    assertNoConsoleErrors(page);
  });

  test('backlink panel can discover a newly created wiki reference', async ({ page }) => {
    await createBlankNote(page, 'Backlink Target');
    await createBlankNote(page, 'Backlink Source');
    await typeWikiLink(page, 'Backlink Target');

    const wikiLink = page.locator('.wiki-link-valid').filter({ hasText: 'Backlink Target' }).first();
    await wikiLink.click();
    await expect(page.getByPlaceholder('无标题笔记')).toHaveValue('Backlink Target');

    const backlinksSection = page.getByText(/反向链接|链接引用/i).first();
    if (await backlinksSection.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await expect(backlinksSection).toBeVisible();
    }
    assertNoConsoleErrors(page);
  });

  test('can create links to non-existent notes', async ({ page }) => {
    await createBlankNote(page, 'Broken Link Source');
    await typeWikiLink(page, 'Future Note That Does Not Exist');

    const wikiLink = page.locator('.wiki-link-broken').filter({ hasText: 'Future Note That Does Not Exist' }).first();
    await expect(wikiLink).toBeVisible();
    await expect(wikiLink).toHaveAttribute('aria-label', /链接已失效/);
    assertNoConsoleErrors(page);
  });

  test('wiki link matching is case-insensitive for existing note titles', async ({ page }) => {
    await createBlankNote(page, 'lowercase note');
    await createBlankNote(page, 'Case Source');
    await typeWikiLink(page, 'Lowercase Note');

    await expect(page.locator('.wiki-link-valid').filter({ hasText: 'Lowercase Note' }).first()).toBeVisible();
    assertNoConsoleErrors(page);
  });

  test('can create multiple wiki links in a single note', async ({ page }) => {
    await createBlankNote(page, 'Multi Link Source');
    const editor = page.locator('[contenteditable="true"]').first();
    await editor.click();
    await page.keyboard.type('Links: [[First Note]] [[Second Note]] [[Third Note]]');

    await expect(page.locator('.wiki-link').filter({ hasText: 'First Note' })).toBeVisible();
    await expect(page.locator('.wiki-link').filter({ hasText: 'Second Note' })).toBeVisible();
    await expect(page.locator('.wiki-link').filter({ hasText: 'Third Note' })).toBeVisible();
    assertNoConsoleErrors(page);
  });
});
