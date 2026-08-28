import { type Page, type ConsoleMessage, expect } from '@playwright/test';

/**
 * Shared E2E test helpers for LifeOS
 *
 * Provides reliable modal dismissal, navigation, and common operations
 * that all test files need. Uses actual DOM selectors from the source code.
 */

/**
 * Collected console errors for a page session.
 * Call setupConsoleMonitor() in beforeEach, then checkConsoleErrors() after test actions.
 */
const consoleErrors: Map<Page, string[]> = new Map();

/**
 * Start monitoring console for errors and warnings on a page.
 * Call this in test.beforeEach.
 */
export function setupConsoleMonitor(page: Page): void {
  const errors: string[] = [];
  consoleErrors.set(page, errors);

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known benign errors
      if (
        text.includes('favicon.ico') ||
        text.includes('net::ERR_') ||
        text.includes('ResizeObserver') ||
        text.includes('third-party cookie') ||
        text.includes('cloudflareinsights.com') ||
        text.includes('Content Security Policy') ||
        text.includes('CORS policy') ||
        text.includes('unpkg.com/leaflet')
      ) return;
      errors.push(`[console.error] ${text}`);
    }
  });

  page.on('pageerror', (error: Error) => {
    errors.push(`[pageerror] ${error.message}`);
  });
}

/**
 * Assert no unexpected console errors occurred.
 * Call this after test actions to verify clean state.
 */
export function getConsoleErrors(page: Page): string[] {
  return consoleErrors.get(page) ?? [];
}

/**
 * Assert zero console errors. Use in afterEach or at end of test.
 */
export function assertNoConsoleErrors(page: Page): void {
  const errors = getConsoleErrors(page);
  if (errors.length > 0) {
    throw new Error(`Console errors detected:\n${errors.join('\n')}`);
  }
}

/**
 * Dismiss the onboarding modal by clicking "Skip tour", the X close button,
 * or any other dismiss mechanism. Handles the multi-step wizard.
 * Waits for the modal overlay to fully disappear before returning.
 */
export async function dismissOnboarding(page: Page): Promise<void> {
  // Wait briefly for modal to appear
  await page.waitForTimeout(500);

  // Strategy 1: Click "Skip tour" button
  const skipButton = page.getByRole('button', { name: '跳过导览' });
  if (await skipButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipButton.click();
    await page.waitForTimeout(500);
    return;
  }

  // Strategy 2: Click the X close button (aria-label="Close" on the onboarding modal)
  const closeButton = page.locator('[aria-label="关闭"]').first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
    await page.waitForTimeout(500);
    return;
  }

  // Strategy 3: Click any visible close button on a fixed overlay
  const overlayClose = page.locator('.fixed button[aria-label="关闭"], .fixed [aria-label="关闭弹窗"]').first();
  if (await overlayClose.isVisible({ timeout: 1000 }).catch(() => false)) {
    await overlayClose.click();
    await page.waitForTimeout(500);
    return;
  }
}

/**
 * Navigate to a page and dismiss onboarding if it appears.
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await dismissOnboarding(page);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('main')).toBeVisible();
}

export function isMobileViewport(page: Page): boolean {
  return (page.viewportSize()?.width ?? 1280) < 768;
}

export async function clickPrimaryNavigationLink(page: Page, label: string): Promise<void> {
  if (isMobileViewport(page)) {
    const mobileNav = page.getByRole('navigation', { name: '移动端导航' });
    const directLink = mobileNav.getByRole('link', { name: label, exact: true });
    if (await directLink.isVisible().catch(() => false)) {
      await directLink.click();
      return;
    }

    await mobileNav.getByRole('button', { name: '更多导航选项' }).click();
    const moreDialog = page.getByRole('dialog', { name: '更多导航选项' });
    await expect(moreDialog).toBeVisible();
    await moreDialog.getByRole('link', { name: label, exact: true }).click();
    return;
  }

  const primaryNav = page.getByRole('navigation', { name: '主导航' });
  await primaryNav.getByRole('link', { name: label, exact: true }).click();
}

export async function openNotesSidebarIfNeeded(page: Page): Promise<void> {
  if (!isMobileViewport(page)) return;

  const openButton = page.getByRole('button', { name: '打开侧边栏菜单' });
  if (await openButton.isVisible().catch(() => false)) {
    await openButton.click();
    await expect(page.getByRole('button', { name: '关闭侧边栏菜单' })).toBeVisible();
  }
}

export async function createBlankNote(page: Page, title?: string) {
  const emptyCreate = page.getByRole('button', { name: '新建空白笔记', exact: true });

  if (await emptyCreate.isVisible().catch(() => false)) {
    await emptyCreate.click();
  } else {
    await openNotesSidebarIfNeeded(page);
    const listCreate = page.getByRole('button', { name: '+ 新建', exact: true });
    await expect(listCreate).toBeVisible();
    await listCreate.click();

    const closeSidebar = page.getByRole('button', { name: '关闭侧边栏菜单' });
    if (await closeSidebar.isVisible().catch(() => false)) {
      await closeSidebar.click();
    }
  }

  const editor = page.locator('[contenteditable="true"]').first();
  await expect(editor).toBeVisible();

  if (title !== undefined) {
    const titleInput = page.getByPlaceholder('无标题笔记');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
    await expect(titleInput).toHaveValue(title);
  }

  return editor;
}

export async function selectNoteByTitle(page: Page, title: string): Promise<void> {
  await openNotesSidebarIfNeeded(page);

  const noteItem = page.getByText(title, { exact: true }).first();
  await expect(noteItem).toBeVisible();
  await noteItem.click();

  const closeSidebar = page.getByRole('button', { name: '关闭侧边栏菜单' });
  if (await closeSidebar.isVisible().catch(() => false)) {
    await closeSidebar.click();
  }

  await expect(page.getByPlaceholder('无标题笔记')).toHaveValue(title);
}

/**
 * Open Command Palette (Synapse) with Ctrl+K
 */
export async function openCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Synapse 搜索' })).toBeVisible();
}

/**
 * Close Command Palette
 */
export async function closeCommandPalette(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Synapse 搜索' })).not.toBeVisible();
}

/**
 * Click a sidebar navigation link by exact text
 */
export async function clickSidebarLink(page: Page, linkText: string): Promise<void> {
  const nav = page.locator('nav[aria-label="主导航"]');
  await nav.getByRole('link', { name: linkText, exact: true }).click();
}

/**
 * Ensure sidebar is expanded (not collapsed)
 */
export async function ensureSidebarExpanded(page: Page): Promise<void> {
  const expandButton = page.locator('button[title="展开侧边栏"]');
  if (await expandButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expandButton.click();
    await page.waitForTimeout(300);
  }
}

/**
 * Create a task on the Kanban board. Returns the task title for verification.
 */
export async function createTask(page: Page, title: string): Promise<void> {
  // Click "+ Add task" in the first column (To Do)
  const addButton = page.getByRole('button', { name: '+ 添加任务' }).first();
  await addButton.click();

  // Fill the inline input
  const input = page.getByPlaceholder('任务标题…');
  await expect(input).toBeVisible();
  await input.fill(title);

  // Submit
  await page.getByRole('button', { name: '添加', exact: true }).click();

  // Wait for task to appear
  await expect(page.getByText(title)).toBeVisible();
}

/**
 * Create a note on the Notes page.
 */
export async function createNote(page: Page, content: string): Promise<void> {
  const editor = await createBlankNote(page);
  await editor.click();
  await page.keyboard.type(content);
  await expect(editor).toContainText(content);
}

/**
 * Switch to a specific tab within a page (Tasks, Notes, Schedule, Create).
 */
export async function switchTab(page: Page, tabName: string): Promise<void> {
  const tab = page.getByRole('tab', { name: tabName, exact: true });
  await tab.click();
  await page.waitForTimeout(300);
}

/**
 * Toggle dark/light mode from sidebar
 */
export async function toggleTheme(page: Page): Promise<void> {
  const themeButton = page.getByRole('button', { name: /浅色模式|深色模式/ });
  await themeButton.click();
}

/**
 * Check if the app is in dark mode
 */
export async function isDarkMode(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.classList.contains('dark'));
}

/**
 * Wait for an undo toast to appear after a destructive action.
 */
export async function waitForToast(page: Page, textPattern: RegExp = /撤销/i): Promise<boolean> {
  const toast = page.getByText(textPattern).first();
  return toast.isVisible({ timeout: 3000 }).catch(() => false);
}

/**
 * Create a calendar event from the schedule page.
 */
export async function createEvent(page: Page, title: string): Promise<void> {
  const createBtn = page.getByRole('button', { name: /创建.*事件|添加.*事件|新建.*事件|\+/i }).first();
  if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await createBtn.click();
    await page.waitForTimeout(300);

    const titleInput = page.locator('#event-title');
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill(title);
      const submitBtn = page.getByRole('button', { name: /创建.*事件/i });
      if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(300);
      }
    }
  }
}

/**
 * Open a task's detail panel by clicking on the task title.
 */
export async function openTaskDetail(page: Page, taskTitle: string): Promise<void> {
  const task = page.getByText(taskTitle, { exact: true }).first();
  await task.click();
  await page.waitForTimeout(300);
}

/**
 * Verify data persists after reload. Navigates, creates data, reloads, verifies.
 */
export async function verifyPersistence(
  page: Page,
  path: string,
  textToFind: string
): Promise<boolean> {
  await page.reload();
  await dismissOnboarding(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  const element = page.getByText(textToFind, { exact: true }).first();
  return element.isVisible({ timeout: 5000 }).catch(() => false);
}

/**
 * Measure page load time for a given route.
 * Returns milliseconds from navigation start to networkidle.
 */
export async function measurePageLoad(page: Page, path: string): Promise<number> {
  const start = Date.now();
  await page.goto(path);
  await dismissOnboarding(page);
  await page.waitForLoadState('networkidle').catch(() => {});
  return Date.now() - start;
}

/**
 * Take a named screenshot for visual comparison.
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `tests/results/screenshots/${name}.png`, fullPage: true });
}

/**
 * Assert an element exists (is attached to DOM), even if not visible.
 * Useful for elements that may be off-screen but should exist.
 */
export async function assertElementExists(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector).first()).toBeAttached();
}

/**
 * Wait for the app to be fully ready (no loading spinners).
 */
export async function waitForAppReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle').catch(() => {});
  // Wait for any loading spinners to disappear
  const spinner = page.locator('[role="progressbar"], .animate-spin, [data-loading="true"]');
  if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
  }
}
