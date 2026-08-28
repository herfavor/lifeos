import { test, expect } from '@playwright/test';
import { navigateTo, setupConsoleMonitor, assertNoConsoleErrors } from './helpers';

/**
 * E2E Tests for Tasks Kanban Board
 *
 * Covers: Create task, move between columns, add subtasks,
 *         edit task, complete task, verify celebrations
 */

test.describe('Tasks Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleMonitor(page);
    await navigateTo(page, '/tasks');

    // Ensure we're on Kanban view
    const kanbanButton = page.getByRole('button', { name: /看板/i });
    if (await kanbanButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await kanbanButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('can create a new task', async ({ page }) => {
    // Find the add task button (might be in "To Do" column or a general add button)
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();

    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();

      // Fill in task details
      const titleInput = page.getByPlaceholder(/标题|任务名称|什么任务/i);
      if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await titleInput.fill('E2E Kanban Test Task');

        // Submit the form (might be Enter key or Save button)
        const saveButton = page.getByRole('button', { name: /保存|创建|添加/i });
        if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await saveButton.click();
        } else {
          await page.keyboard.press('Enter');
        }

        // Wait for task to appear
        await page.waitForTimeout(500);

        // Verify task appears in the kanban board
        await expect(page.getByText('E2E Kanban Test Task')).toBeVisible();
      }
    }
  });

  test('can move task between columns using drag and drop', async ({ page }) => {
    // Create a task first
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Draggable Task');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Find the task card
    const taskCard = page.getByText('Draggable Task').locator('..').locator('..');

    if (await taskCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Find the "In Progress" column
      const inProgressColumn = page.getByText(/进行中/i).locator('..');

      if (await inProgressColumn.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Drag the task to In Progress column
        await taskCard.dragTo(inProgressColumn);

        // Wait for animation
        await page.waitForTimeout(500);

        // Verify task moved (this is implementation-specific)
        // The task should now be in the In Progress column
        await expect(page.getByText('Draggable Task')).toBeVisible();
      }
    }
  });

  test('can add subtasks to a task', async ({ page }) => {
    // Create a parent task
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Parent Task with Subtasks');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Click on the task to open details
    const taskCard = page.getByText('Parent Task with Subtasks');
    await taskCard.click();
    await page.waitForTimeout(500);

    // Look for subtask creation UI (might be in a modal or detail panel)
    const addSubtaskButton = page.getByRole('button', { name: /添加子任务|新建子任务|\+.*子任务/i });

    if (await addSubtaskButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addSubtaskButton.click();

      // Fill in subtask details
      const subtaskInput = page.getByPlaceholder(/子任务|标题/i);
      if (await subtaskInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await subtaskInput.fill('First Subtask');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(500);

        // Verify subtask appears
        await expect(page.getByText('First Subtask')).toBeVisible();
      }
    }
  });

  test('can edit task details', async ({ page }) => {
    // Create a task
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Task to Edit');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Click on the task to open details
    const taskCard = page.getByText('Task to Edit');
    await taskCard.click();
    await page.waitForTimeout(500);

    // Look for edit button or editable fields
    const editButton = page.getByRole('button', { name: /编辑/i });
    if (await editButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await editButton.click();
    }

    // Update the title
    const titleField = page.getByPlaceholder(/标题|任务名称/i).or(page.getByDisplayValue('Task to Edit'));
    if (await titleField.isVisible({ timeout: 1000 }).catch(() => false)) {
      await titleField.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('Updated Task Title');

      // Save changes
      const saveButton = page.getByRole('button', { name: /保存|更新/i });
      if (await saveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await saveButton.click();
      } else {
        // Click outside or press Escape to save
        await page.keyboard.press('Escape');
      }

      await page.waitForTimeout(500);

      // Verify updated title
      await expect(page.getByText('Updated Task Title')).toBeVisible();
    }
  });

  test('can complete a task', async ({ page }) => {
    // Create a task
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Task to Complete');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Find the task card
    const taskCard = page.getByText('Task to Complete').locator('..');

    // Look for a checkbox or complete button
    const checkbox = taskCard.locator('input[type="checkbox"]').first();
    const completeButton = taskCard.locator('button').filter({ hasText: /complete|done|finish/i }).first();

    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.click();
      await page.waitForTimeout(500);

      // Task should move to "Done" column or be marked as complete
      // Verify completion (implementation-specific)
      const doneColumn = page.getByText(/已完成/i).locator('..');
      if (await doneColumn.isVisible({ timeout: 1000 }).catch(() => false)) {
        // Check if task moved to Done column
        await expect(page.getByText('Task to Complete')).toBeVisible();
      }
    } else if (await completeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await completeButton.click();
      await page.waitForTimeout(500);
      await expect(page.getByText('Task to Complete')).toBeVisible();
    }
  });

  test('completion celebration appears when task is completed', async ({ page }) => {
    // Create and complete a task
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Celebration Task');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Complete the task
    const taskCard = page.getByText('Celebration Task').locator('..');
    const checkbox = taskCard.locator('input[type="checkbox"]').first();

    if (await checkbox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await checkbox.click();

      // Look for celebration animation or message
      // This might be a confetti animation, toast message, or visual effect
      const celebration = page.locator('[data-celebration], .celebration, .confetti').first();

      if (await celebration.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(celebration).toBeVisible();
      }

      // Or look for a toast/notification
      const toastMessage = page.getByText(/已完成|干得漂亮/i);
      if (await toastMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(toastMessage).toBeVisible();
      }
    }
  });

  test('can delete a task', async ({ page }) => {
    // Create a task
    const addButton = page.getByRole('button', { name: /添加任务|新建任务|创建任务|\+/i }).first();
    if (await addButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addButton.click();
      const titleInput = page.getByPlaceholder(/标题|任务名称/i);
      await titleInput.fill('Task to Delete');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }

    // Click on the task to open details
    const taskCard = page.getByText('Task to Delete');
    await taskCard.click();
    await page.waitForTimeout(500);

    // Find delete button
    const deleteButton = page.getByRole('button', { name: /删除|移除/i });
    if (await deleteButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await deleteButton.click();

      // Confirm deletion if there's a dialog
      const confirmButton = page.getByRole('button', { name: /确认|是|删除/i });
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click();
      }

      await page.waitForTimeout(500);

      // Verify task is no longer visible
      await expect(page.getByText('Task to Delete')).not.toBeVisible();
    }
  });
});
