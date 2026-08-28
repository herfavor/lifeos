import { test, expect } from '../fixtures/test-utils';
import {
  clearAllStores,
  createMockAutomationRule,
  getStoreData,
  resetTestCounters,
  setStoreData,
  waitForAppLoaded,
  waitForIndexedDB,
} from '../fixtures/test-data';

type PersistedTask = {
  title: string;
  status: string;
  priority: string;
  tags?: string[];
  dueDate?: string | null;
};

test.describe('Automation Engine', () => {
  test.beforeEach(async ({ page }) => {
    resetTestCounters();
    await page.goto('/');
    await waitForAppLoaded(page);
    await clearAllStores(page);
  });

  async function seedRules(page: Parameters<typeof setStoreData>[0], rules: ReturnType<typeof createMockAutomationRule>[]) {
    await setStoreData(page, 'automation-store', { state: { rules }, version: 1 });
    await page.reload();
    await waitForAppLoaded(page);
  }

  async function createTaskFromBoard(page: Parameters<typeof setStoreData>[0], title: string) {
    await page.goto('/tasks');
    await waitForAppLoaded(page);
    await page.getByRole('button', { name: /添加任务/ }).first().click();
    const titleInput = page.getByPlaceholder('任务标题…').first();
    await titleInput.fill(title);
    await titleInput.press('Enter');
    await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
    await waitForIndexedDB(page, 800);
  }

  async function findTask(page: Parameters<typeof setStoreData>[0], title: string): Promise<PersistedTask> {
    const kanban = await getStoreData<{ state: { tasks: PersistedTask[] } }>(page, 'kanban-store');
    const task = kanban?.state.tasks.find((item) => item.title === title);
    expect(task).toBeDefined();
    return task!;
  }

  test('executes a task-created rule and exposes its exact result', async ({ page }) => {
    const rule = createMockAutomationRule({
      name: '新任务标记待跟进',
      trigger: 'task.created',
      action: 'add_tag',
      actionConfig: { tags: ['待跟进'] },
    });
    await seedRules(page, [rule]);

    await createTaskFromBoard(page, '自动化触发任务');
    const task = await findTask(page, '自动化触发任务');
    expect(task.tags).toContain('待跟进');

    await page.goto('/automations');
    await page.getByRole('button', { name: /执行历史/ }).click();
    await expect(page.getByText('新任务标记待跟进', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: /任务：自动化触发任务/ })).toBeVisible();
  });

  test('status actions do not recursively emit task-moved rules', async ({ page }) => {
    const createdRule = createMockAutomationRule({
      name: '创建后进入进行中',
      trigger: 'task.created',
      action: 'set_status',
      actionConfig: { status: 'inprogress' },
    });
    const opposingMoveRule = createMockAutomationRule({
      name: '移动后退回待办',
      trigger: 'task.moved',
      action: 'set_status',
      actionConfig: { status: 'todo' },
    });
    await seedRules(page, [createdRule, opposingMoveRule]);

    await createTaskFromBoard(page, '循环保护任务');
    const task = await findTask(page, '循环保护任务');
    expect(task.status).toBe('inprogress');

    await page.goto('/automations');
    await page.getByRole('button', { name: /执行历史/ }).click();
    await expect(page.getByText('创建后进入进行中', { exact: true })).toHaveCount(2);
    await expect(page.getByText('移动后退回待办', { exact: true })).toHaveCount(1);
  });

  test('executes multiple safe actions for the same trigger', async ({ page }) => {
    const dueDate = '2026-09-03';
    const rules = [
      createMockAutomationRule({ name: '设为高优先级', trigger: 'task.created', action: 'set_priority', actionConfig: { priority: 'high' } }),
      createMockAutomationRule({ name: '设置一周截止', trigger: 'task.created', action: 'set_due_date', actionConfig: { dueDate } }),
      createMockAutomationRule({ name: '添加自动化标签', trigger: 'task.created', action: 'add_tag', actionConfig: { tags: ['自动化'] } }),
    ];
    await seedRules(page, rules);

    await createTaskFromBoard(page, '多规则任务');
    const task = await findTask(page, '多规则任务');
    expect(task.priority).toBe('high');
    expect(task.dueDate).toBe(dueDate);
    expect(task.tags).toContain('自动化');

    await page.goto('/automations');
    await page.getByRole('button', { name: /执行历史/ }).click();
    for (const rule of rules) await expect(page.getByText(rule.name, { exact: true })).toBeVisible();
  });

  test('applies only actions whose conditions match', async ({ page }) => {
    const rules = [
      createMockAutomationRule({
        name: '中优先级命中',
        trigger: 'task.created',
        conditions: [{ field: 'priority', operator: 'equals', value: 'medium' }],
        action: 'add_tag',
        actionConfig: { tags: ['中优先级'] },
      }),
      createMockAutomationRule({
        name: '低优先级不命中',
        trigger: 'task.created',
        conditions: [{ field: 'priority', operator: 'equals', value: 'low' }],
        action: 'add_tag',
        actionConfig: { tags: ['低优先级'] },
      }),
    ];
    await seedRules(page, rules);

    await createTaskFromBoard(page, '条件规则任务');
    const task = await findTask(page, '条件规则任务');
    expect(task.tags).toContain('中优先级');
    expect(task.tags).not.toContain('低优先级');
  });
});
