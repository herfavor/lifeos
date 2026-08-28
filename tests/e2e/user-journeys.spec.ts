import { test, expect } from '@playwright/test';
import { navigateTo, createTask, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * End-to-End User Journey Tests
 *
 * These tests simulate complete user workflows across multiple features.
 * They verify the UX from the perspective of a real user, not individual components.
 */

test.describe('User Journey: First-Time User', () => {
  test('completes onboarding and creates first content', async ({ page }) => {
    setupConsoleMonitor(page);
    await page.goto('/');

    // Step 1: Welcome
    await expect(page.getByText('你的隐私优先生产力平台')).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /下一步/ }).click();

    // Step 2: Features
    await expect(page.getByText('井然有序所需的一切')).toBeVisible();
    await page.getByRole('button', { name: /下一步/ }).click();

    // Step 3: Setup
    await expect(page.getByText('个性化你的体验')).toBeVisible();
    const nameInput = page.locator('input#display-name');
    await nameInput.fill('Test User');
    await page.getByRole('button', { name: /下一步/ }).click();

    // Step 4: Done
    await expect(page.getByText("一切就绪！")).toBeVisible();

    // Click "创建你的第一篇笔记" to go directly to notes
    await page.getByRole('button', { name: '创建你的第一篇笔记' }).click();
    await expect(page).toHaveURL(/\/notes/);

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Daily Productivity Workflow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/');
  });

  test('check today, create task, track time, take notes', async ({ page }) => {
    // 1. Check Today page
    await page.goto('/today');
    await expect(page.getByText("今日任务")).toBeVisible();
    await expect(page.getByText('已完成')).toBeVisible();

    // 2. Navigate to Tasks and create a task
    await page.goto('/tasks');
    await createTask(page, 'Daily Review Task');
    await expect(page.getByText('Daily Review Task')).toBeVisible();

    // 3. Navigate to Notes and create a note
    await page.goto('/notes');
    const createButton = page.getByRole('button', { name: /新建笔记|创建新笔记|\+/i }).first();
    await createButton.click();
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Daily review notes for today');
    await page.waitForTimeout(500);

    // 4. Check Focus mode
    await page.goto('/focus');
    await expect(page.locator('button[aria-label="启动计时器"]')).toBeVisible();
    // Start and immediately stop
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await page.keyboard.press('Escape');

    // 5. Back to Dashboard
    await expect(page).not.toHaveURL(/\/focus/);

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Project Management', () => {
  test('create tasks, organize, and review in PM dashboard', async ({ page }) => {
    setupConsoleMonitor(page);

    // Create several tasks
    await navigateTo(page, '/tasks');
    await createTask(page, 'PM Task Alpha');
    await createTask(page, 'PM Task Beta');
    await createTask(page, 'PM Task Gamma');

    // Switch to Timeline view
    await page.getByRole('tab', { name: '时间线' }).click();
    await expect(page.getByRole('tab', { name: '时间线' })).toHaveAttribute('aria-selected', 'true');

    // Check PM Dashboard
    await page.goto('/pm');
    await expect(page).toHaveURL(/\/pm/);

    // Should show task stats
    const statsText = page.getByText(/任务总数|已完成|进行中|逾期/i).first();
    await expect(statsText).toBeVisible();

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Notes & Knowledge Management', () => {
  test('create notes, use formatting, navigate graph', async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');

    // Create a note with formatting
    const createButton = page.getByRole('button', { name: /新建笔记|创建新笔记|\+/i }).first();
    await createButton.click();
    const editor = page.locator('[contenteditable="true"]').first();
    await expect(editor).toBeVisible();
    await editor.click();

    // Type with bold
    await page.keyboard.type('Meeting Notes: ');
    await page.keyboard.press('Control+b');
    await page.keyboard.type('Important');
    await page.keyboard.press('Control+b');
    await page.keyboard.type(' points discussed');
    await page.waitForTimeout(500);

    // Verify bold text rendered
    await expect(editor.locator('strong, b')).toContainText('Important');

    // Switch to Daily Notes tab
    await page.getByRole('tab', { name: '每日笔记' }).click();
    await expect(page.getByRole('tab', { name: '每日笔记' })).toHaveAttribute('aria-selected', 'true');

    // Switch to Graph tab
    await page.getByRole('tab', { name: '图谱' }).click();
    await expect(page.getByRole('tab', { name: '图谱' })).toHaveAttribute('aria-selected', 'true');

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Search & Navigation', () => {
  test('use command palette to navigate and execute commands', async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/');

    // Open Synapse
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Synapse 搜索' });
    await expect(dialog).toBeVisible();

    // Search for a page
    const input = page.getByRole('combobox');
    await input.fill('Tasks');

    // Should show results
    const results = page.getByRole('option').first();
    await expect(results).toBeVisible();

    // Navigate to Tasks via result
    await results.click();
    await expect(page).toHaveURL(/\/tasks/);

    // Open Synapse again for a command
    await page.keyboard.press('Control+k');
    await expect(dialog).toBeVisible();

    // Use command mode
    await input.fill('>Toggle');
    const toggleCmd = page.getByRole('option', { name: /Toggle.*Mode/i }).first();
    if (await toggleCmd.isVisible({ timeout: 2000 }).catch(() => false)) {
      const themeBefore = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      await toggleCmd.click();
      const themeAfter = await page.evaluate(() =>
        document.documentElement.classList.contains('dark') ? 'dark' : 'light'
      );
      expect(themeAfter).not.toBe(themeBefore);
    }

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Content Creation', () => {
  test('create document, spreadsheet, and presentation', async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/create');

    // Create a document
    await page.getByRole('button', { name: /文档/ }).first().click();
    await page.waitForTimeout(500);

    // Go back to create page
    const backBtn = page.locator('button[aria-label="返回创建"]');
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(300);
    } else {
      await page.goto('/create');
    }

    // Create a spreadsheet
    await page.getByRole('button', { name: /电子表格/ }).first().click();
    await page.waitForTimeout(500);

    // Go back
    if (await backBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await backBtn.click();
    } else {
      await page.goto('/create');
    }

    // Create a presentation
    await page.getByRole('button', { name: /演示文稿/ }).first().click();
    await page.waitForTimeout(500);

    assertNoConsoleErrors(page);
  });

  test('switch between Diagrams and Forms tabs', async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/create');

    // Switch to Diagrams
    await page.getByRole('tab', { name: '绘图' }).click();
    await expect(page.getByRole('tab', { name: '绘图' })).toHaveAttribute('aria-selected', 'true');

    // Switch to Forms
    await page.getByRole('tab', { name: '表单' }).click();
    await expect(page.getByRole('tab', { name: '表单' })).toHaveAttribute('aria-selected', 'true');

    // Back to Create
    await page.getByRole('tab', { name: '创建' }).click();
    await expect(page.getByRole('tab', { name: '创建' })).toHaveAttribute('aria-selected', 'true');

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Settings Configuration', () => {
  test('navigate all settings tabs and verify content loads', async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/settings');

    const tabs = [
      { name: '通用', url: /\/settings/ },
      { name: '项目', url: /tab=projects/ },
      { name: '时间跟踪', url: /tab=time/ },
      { name: '任务', url: /tab=tasks/ },
      { name: '笔记与日历', url: /tab=notes/ },
      { name: '备份与数据', url: /tab=backup/ },
      { name: 'AI 提供商', url: /tab=ai/ },
      { name: '高级', url: /tab=advanced/ },
    ];

    for (const tab of tabs) {
      await page.getByRole('button', { name: tab.name }).click();
      await expect(page).toHaveURL(tab.url);
      await page.waitForTimeout(200);
    }

    assertNoConsoleErrors(page);
  });
});

test.describe('User Journey: Full App Navigation', () => {
  test('visits every page without console errors', async ({ page }) => {
    setupConsoleMonitor(page);

    const pages = [
      '/',
      '/today',
      '/tasks',
      '/tasks?tab=timeline',
      '/tasks?tab=habits',
      '/tasks?tab=resources',
      '/notes',
      '/notes?tab=daily',
      '/notes?tab=graph',
      '/schedule',
      '/schedule?tab=timer',
      '/schedule?tab=pomodoro',
      '/create',
      '/create?tab=diagrams',
      '/create?tab=forms',
      '/links',
      '/pm',
      '/settings',
      '/settings?tab=projects',
      '/settings?tab=time',
      '/settings?tab=tasks',
      '/settings?tab=notes',
      '/settings?tab=backup',
      '/settings?tab=ai',
      '/settings?tab=advanced',
      '/focus',
    ];

    for (const path of pages) {
      await navigateTo(page, path);
      // Verify page loaded without crash — title should still be LifeOS
      if (path !== '/focus') {
        // Focus is full-screen overlay, may not show title
        await expect(page).toHaveTitle(/LifeOS/i);
      }
    }

    // Check for console errors accumulated across all pages
    assertNoConsoleErrors(page);
  });
});
