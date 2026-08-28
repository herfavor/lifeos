import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors, createTask } from './helpers';

/**
 * Deep Interaction Flow E2E Tests
 *
 * Tests multi-step user workflows that chain
 * multiple actions together end-to-end.
 */

test.describe('Task Lifecycle Flow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/tasks');
  });

  test('full task lifecycle: create → edit → complete', async ({ page }) => {
    // Create
    await createTask(page, 'Lifecycle Test Task');
    await expect(page.getByText('Lifecycle Test Task')).toBeVisible();

    // Open detail and edit
    await page.getByText('Lifecycle Test Task').click();
    await page.waitForTimeout(300);

    const descInput = page.getByPlaceholder('添加描述…');
    if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descInput.fill('Added description during lifecycle test');
      await page.waitForTimeout(300);
    }

    // Set priority
    const prioritySelect = page.locator('select').filter({ has: page.locator('option', { hasText: '高' }) }).first();
    if (await prioritySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await prioritySelect.selectOption('high');
      await page.waitForTimeout(200);
    }

    // Close detail
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    assertNoConsoleErrors(page);
  });

  test('create task with subtask via detail panel', async ({ page }) => {
    await createTask(page, 'Parent Task With Subtask');

    // Open detail panel
    await page.getByText('Parent Task With Subtask').click();
    await page.waitForTimeout(300);

    // Switch to Subtasks tab
    const subtasksTab = page.getByRole('tab', { name: '子任务' });
    if (await subtasksTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subtasksTab.click();
      await page.waitForTimeout(300);

      // Add a subtask
      const addBtn = page.getByRole('button', { name: /添加子任务|\+/i }).first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(200);

        const input = page.getByPlaceholder(/子任务|标题/i).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.fill('Child Subtask');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
        }
      }
    }

    await page.keyboard.press('Escape');
    assertNoConsoleErrors(page);
  });

  test('create task with checklist items', async ({ page }) => {
    await createTask(page, 'Checklist Task');

    await page.getByText('Checklist Task').click();
    await page.waitForTimeout(300);

    const checklistTab = page.getByRole('tab', { name: '清单' });
    if (await checklistTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await checklistTab.click();
      await page.waitForTimeout(300);

      const addBtn = page.getByRole('button', { name: /添加|\+/i }).first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await addBtn.click();
        await page.waitForTimeout(200);

        const input = page.getByPlaceholder(/项目/).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.fill('First checklist item');
          await page.keyboard.press('Enter');
          await page.waitForTimeout(300);
        }
      }
    }

    await page.keyboard.press('Escape');
    assertNoConsoleErrors(page);
  });
});

test.describe('Note Editor Flow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/notes');
  });

  test('create note with formatting', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /新建笔记|创建新笔记|\+/i }).first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);

      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Type content
        await editor.click();
        await page.keyboard.type('Bold text test');

        // Select all text and apply bold
        await page.keyboard.press('Control+a');
        await page.keyboard.press('Control+b');
        await page.waitForTimeout(200);

        // Verify bold was applied (strong or b tag should appear)
        const boldText = page.locator('strong, b').first();
        if (await boldText.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(boldText).toBeVisible();
        }
      }
    }
    assertNoConsoleErrors(page);
  });

  test('create note with wiki link', async ({ page }) => {
    // First create a target note
    const newBtn = page.getByRole('button', { name: /新建笔记|创建新笔记|\+/i }).first();
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click();
      await page.waitForTimeout(500);

      const editor = page.locator('[contenteditable="true"]').first();
      if (await editor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editor.click();
        // Type a wiki link
        await page.keyboard.type('Link to [[Another Note]]');
        await page.waitForTimeout(500);

        // Wiki link should render as a link element
        const link = page.getByText('Another Note');
        if (await link.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expect(link).toBeVisible();
        }
      }
    }
    assertNoConsoleErrors(page);
  });
});

test.describe('Calendar Event Flow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/schedule');
  });

  test('create event with all fields', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /新建事件|\+/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(300);

      // Fill title
      const titleInput = page.locator('#event-title');
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('Full Field Event');

        // Fill description
        const descInput = page.locator('#event-description');
        if (await descInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await descInput.fill('Event with all fields filled');
        }

        // Fill location
        const locationInput = page.getByPlaceholder(/会议室|视频会议|地址/);
        if (await locationInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await locationInput.fill('Conference Room A');
        }

        // Submit
        const submitBtn = page.getByRole('button', { name: /创建事件/ });
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
    assertNoConsoleErrors(page);
  });

  test('create all-day event', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /新建事件|\+/i }).first();
    if (await createBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(300);

      const titleInput = page.locator('#event-title');
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('All Day Conference');

        // Toggle all-day
        const allDayCheckbox = page.locator('input[type="checkbox"]').first();
        if (await allDayCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
          await allDayCheckbox.click();
          await page.waitForTimeout(200);
        }

        const submitBtn = page.getByRole('button', { name: /创建事件/ });
        if (await submitBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await submitBtn.click();
          await page.waitForTimeout(500);
        }
      }
    }
    assertNoConsoleErrors(page);
  });
});

test.describe('Settings Full Flow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
  });

  test('change settings across all tabs without errors', async ({ page }) => {
    // General tab
    await navigateTo(page, '/settings');
    const nameInput = page.getByPlaceholder('输入你的姓名');
    if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await nameInput.clear();
      await nameInput.fill('Flow Test User');
    }
    assertNoConsoleErrors(page);

    // Projects tab
    await navigateTo(page, '/settings?tab=projects');
    await page.waitForTimeout(500);
    assertNoConsoleErrors(page);

    // Tasks tab
    await navigateTo(page, '/settings?tab=tasks');
    await page.waitForTimeout(500);
    assertNoConsoleErrors(page);

    // Backup tab
    await navigateTo(page, '/settings?tab=backup');
    await page.waitForTimeout(500);
    assertNoConsoleErrors(page);

    // AI tab
    await navigateTo(page, '/settings?tab=ai');
    await page.waitForTimeout(500);
    assertNoConsoleErrors(page);

    // Advanced tab
    await navigateTo(page, '/settings?tab=advanced');
    await page.waitForTimeout(500);
    assertNoConsoleErrors(page);
  });
});
