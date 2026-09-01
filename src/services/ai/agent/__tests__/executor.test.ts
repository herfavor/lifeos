/**
 * Agent executor tests — run real Zustand stores (jsdom + storage shims)
 * and verify each tool branch mutates local data correctly, never executes
 * against ambiguous targets, and reports zh-CN results.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeAgentAction } from '../executor';
import { useKanbanStore } from '../../../../stores/useKanbanStore';
import { useCalendarStore } from '../../../../stores/useCalendarStore';
import { useNotesStore } from '../../../../stores/useNotesStore';
import { useProjectContextStore } from '../../../../stores/useProjectContextStore';
import { useLinkLibraryStore } from '../../../../stores/useLinkLibraryStore';
import { useAutomationStore } from '../../../../stores/useAutomationStore';
import { useHabitStore } from '../../../../stores/useHabitStore';
import { useEnergyStore } from '../../../../stores/useEnergyStore';
import type { Task } from '../../../../types';

function seedTask(partial: Partial<Task> & { title: string }): Task {
  const task: Task = {
    id: partial.id ?? Math.random().toString(36).slice(2),
    title: partial.title,
    description: '',
    status: 'todo',
    created: new Date().toISOString(),
    startDate: null,
    dueDate: null,
    priority: 'medium',
    tags: [],
    projectIds: [],
    ...partial,
  };
  useKanbanStore.setState((state) => ({ tasks: [...state.tasks, task] }));
  return task;
}

describe('task tools', () => {
  beforeEach(() => {
    useKanbanStore.setState({ tasks: [] });
  });

  it('create_task adds a kanban task with the requested fields', async () => {
    const result = await await executeAgentAction('create_task', {
      title: '买牛奶',
      priority: 'high',
      dueDate: '2026-06-01',
      tags: ['生活'],
      projectIds: ['project-home'],
    });
    expect(result.success).toBe(true);
    const tasks = useKanbanStore.getState().tasks;
    const created = tasks.find((t) => t.title === '买牛奶');
    expect(created).toBeDefined();
    expect(created?.priority).toBe('high');
    expect(created?.dueDate).toBe('2026-06-01');
    expect(created?.tags).toEqual(['生活']);
    expect(created?.projectIds).toEqual(['project-home']);
  });

  it('complete_task moves the matched task to done', async () => {
    const task = seedTask({ title: '写周报' });
    const result = await await executeAgentAction('complete_task', { taskId: task.id });
    expect(result.success).toBe(true);
    expect(useKanbanStore.getState().tasks.find((t) => t.id === task.id)?.status).toBe('done');
  });

  it('update_task applies field patches and tag changes', async () => {
    const task = seedTask({ title: '整理房间', priority: 'low' });
    const result = await await executeAgentAction('update_task', {
      taskId: task.id,
      updates: { dueDate: '2026-05-10', addTags: ['家务'], removeTags: [], status: 'inprogress', projectIds: ['project-home'] },
    });
    expect(result.success).toBe(true);
    const updated = useKanbanStore.getState().tasks.find((t) => t.id === task.id);
    expect(updated?.dueDate).toBe('2026-05-10');
    expect(updated?.tags).toContain('家务');
    expect(updated?.status).toBe('inprogress');
    expect(updated?.projectIds).toEqual(['project-home']);
  });

  it('persists tag replacements even when the tag count is unchanged', async () => {
    const task = seedTask({ title: '替换标签', tags: ['old'] });
    await executeAgentAction('update_task', {
      taskId: task.id,
      updates: { addTags: ['new'], removeTags: ['old'] },
    });
    expect(useKanbanStore.getState().tasks.find((item) => item.id === task.id)?.tags).toEqual(['new']);
  });

  it('delete_task removes the task', async () => {
    const task = seedTask({ title: '过期事项' });
    const result = await await executeAgentAction('delete_task', { titleQuery: '过期' });
    expect(result.success).toBe(true);
    expect(useKanbanStore.getState().tasks.find((t) => t.id === task.id)).toBeUndefined();
  });

  it('refuses to act when the title matches multiple tasks', async () => {
    seedTask({ title: '写周报' });
    seedTask({ title: '写周报草稿' });
    const result = await await executeAgentAction('complete_task', { titleQuery: '写周报' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('找到 2 个匹配的任务');
  });

  it('reports not-found for unmatched titles', async () => {
    const result = await await executeAgentAction('delete_task', { titleQuery: '不存在的任务' });
    expect(result.success).toBe(false);
    expect(result.message).toContain('未找到匹配的任务');
  });

  it('list_tasks filters by priority', async () => {
    seedTask({ title: 'A', priority: 'high' });
    seedTask({ title: 'B', priority: 'low' });
    const result = await await executeAgentAction('list_tasks', { priority: 'high' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('A');
    expect(result.message).not.toContain('- B');
    expect(result.message).toContain('[id:');
  });
});

describe('calendar tools', () => {
  beforeEach(() => {
    useCalendarStore.setState({ events: {} });
  });

  it('create_event inserts an event on the requested date', async () => {
    const result = await await executeAgentAction('create_event', {
      date: '2026-05-04',
      title: '组会',
      startTime: '10:00',
      endTime: '11:00',
    });
    expect(result.success).toBe(true);
    const dayEvents = useCalendarStore.getState().events['2026-5-4'];
    expect(dayEvents.some((e) => e.title === '组会' && e.startTime === '10:00')).toBe(true);
  });

  it('mints collision-safe ids for consecutive events', async () => {
    await executeAgentAction('create_event', { date: '2026-05-04', title: 'A' });
    await executeAgentAction('create_event', { date: '2026-05-04', title: 'B' });
    const ids = useCalendarStore.getState().events['2026-5-4'].map((event) => event.id);
    expect(new Set(ids).size).toBe(2);
  });

  it('update_event changes time without moving the day', async () => {
    await executeAgentAction('create_event', { date: '2026-05-04', title: '牙医' });
    const result = await await executeAgentAction('update_event', {
      titleQuery: '牙医',
      updates: { startTime: '15:30' },
    });
    expect(result.success).toBe(true);
    const evt = useCalendarStore.getState().events['2026-5-4'].find((e) => e.title === '牙医');
    expect(evt?.startTime).toBe('15:30');
  });

  it('update_event can move an event to another day', async () => {
    await executeAgentAction('create_event', { date: '2026-05-04', title: '面试', startTime: '09:00' });
    const result = await await executeAgentAction('update_event', {
      titleQuery: '面试',
      moveTo: '2026-05-06',
    });
    expect(result.success).toBe(true);
    expect(useCalendarStore.getState().events['2026-5-4'] ?? []).toHaveLength(0);
    const moved = (useCalendarStore.getState().events['2026-5-6'] ?? []).find(
      (e) => e.title === '面试'
    );
    expect(moved?.startTime).toBe('09:00');
  });

  it('delete_event removes the matched event only', async () => {
    await executeAgentAction('create_event', { date: '2026-05-04', title: '午餐' });
    // Seed a second event directly to avoid Date.now() id collisions.
    // Note: the calendar store keys days as non-padded YYYY-M-D.
    useCalendarStore.setState((state) => ({
      events: {
        ...state.events,
        '2026-5-4': [
          ...(state.events['2026-5-4'] ?? []),
          { id: 'fixed-dinner', title: '晚宴', projectIds: [] },
        ],
      },
    }));
    const result = await await executeAgentAction('delete_event', { titleQuery: '午餐' });
    expect(result.success).toBe(true);
    const titles = (useCalendarStore.getState().events['2026-5-4'] ?? []).map((e) => e.title);
    expect(titles).not.toContain('午餐');
    expect(titles).toContain('晚宴');
  });

  it('list_events summarizes a range', async () => {
    await executeAgentAction('create_event', { date: '2026-05-04', title: '站会', startTime: '09:30' });
    const result = await await executeAgentAction('list_events', { from: '2026-05-01', to: '2026-05-07' });
    expect(result.success).toBe(true);
    expect(result.message).toContain('2026-05-04 09:30 站会');
  });

  it('stores events under the UI date keys (non-padded YYYY-M-D)', async () => {
    const result = await executeAgentAction('create_event', {
      date: '2026-09-05',
      title: '部署日',
    });
    expect(result.success).toBe(true);
    // Calendar page composes keys as `${year}-${month+1}-${day}` — the AI must
    // land on exactly that key or the event is invisible after creation.
    const uiDay = useCalendarStore.getState().events['2026-9-5'];
    expect(uiDay?.some((e) => e.title === '部署日')).toBe(true);
    expect(useCalendarStore.getState().events['2026-09-05'] ?? []).toHaveLength(0);

    // The same key is what list_events searches.
    const listed = await executeAgentAction('list_events', { from: '2026-09-05', to: '2026-09-05' });
    expect(listed.message).toContain('部署日');
  });
});

describe('note tools', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: {} });
  });

  it('create_note stores markdown content and plain text', async () => {
    const result = await await executeAgentAction('create_note', {
      title: '会议纪要',
      content: '# 议题\n\n- 结论一',
      tags: ['work'],
    });
    expect(result.success).toBe(true);
    const note = Object.values(useNotesStore.getState().notes).find(
      (n) => n.title === '会议纪要'
    );
    expect(note).toBeDefined();
    expect(note?.contentText).toContain('结论一');
    expect(note?.tags).toEqual(['work']);
    // Lexical content must remain parseable JSON state
    expect(() => JSON.parse(note!.content)).not.toThrow();
  });

  it('append_note appends to an existing note', async () => {
    await executeAgentAction('create_note', { title: '灵感本', content: '第一条' });
    const result = await await executeAgentAction('append_note', {
      titleQuery: '灵感本',
      content: '第二条想法',
    });
    expect(result.success).toBe(true);
    const note = Object.values(useNotesStore.getState().notes).find((n) => n.title === '灵感本');
    expect(note?.contentText).toContain('第一条');
    expect(note?.contentText).toContain('第二条想法');
  });

  it('list_notes searches titles and content', async () => {
    await executeAgentAction('create_note', { title: '跑步计划', content: '每周三次' });
    await executeAgentAction('create_note', { title: '菜谱', content: '红烧肉做法' });
    const hit = await executeAgentAction('list_notes', { query: '红烧肉' });
    expect(hit.success).toBe(true);
    expect(hit.message).toContain('菜谱');
    expect(hit.message).not.toContain('跑步计划');
  });
});

describe('expanded workspace tools', () => {
  beforeEach(() => {
    useProjectContextStore.setState({ projects: [], activeProjectIds: [] });
    useLinkLibraryStore.setState({ links: {}, collections: {} });
    useAutomationStore.setState({ rules: [], executionLogs: [] });
    useHabitStore.setState({ habits: [], completions: [], achievements: [] });
    useEnergyStore.setState({ logs: [] });
  });

  it('creates and lists project contexts with precise ids', async () => {
    const created = await executeAgentAction('create_project', { name: '新产品' });
    expect(created.success).toBe(true);
    const listed = await executeAgentAction('list_projects', {});
    expect(listed.message).toContain('新产品');
    expect(listed.message).toContain(created.refId);
  });

  it('creates, updates and soft-deletes bookmarks', async () => {
    const created = await executeAgentAction('create_link', {
      title: '文档',
      url: 'https://example.com',
      tags: ['read'],
    });
    await executeAgentAction('update_link', { linkId: created.refId, updates: { favorite: true } });
    expect(useLinkLibraryStore.getState().links[created.refId!]?.isFavorite).toBe(true);
    await executeAgentAction('delete_link', { linkId: created.refId });
    expect(useLinkLibraryStore.getState().links[created.refId!]?.deletedAt).toBeInstanceOf(Date);
  });

  it('creates and disables an automation rule', async () => {
    const created = await executeAgentAction('create_automation', {
      name: '完成后归档',
      trigger: 'task.completed',
      action: 'archive',
    });
    expect(created.success).toBe(true);
    await executeAgentAction('toggle_automation', { ruleId: created.refId, enabled: false });
    expect(useAutomationStore.getState().rules[0].enabled).toBe(false);
  });

  it('creates a habit and completes a requested date without toggling it off', async () => {
    const created = await executeAgentAction('create_habit', { title: '阅读', frequency: 'daily' });
    await executeAgentAction('complete_habit', { habitId: created.refId, date: '2026-08-05' });
    await executeAgentAction('complete_habit', { habitId: created.refId, date: '2026-08-05' });
    const completions = useHabitStore.getState().completions.filter((item) => item.habitId === created.refId);
    expect(completions).toHaveLength(1);
    expect(completions[0].date).toBe('2026-8-5');
  });

  it('records and queries energy locally', async () => {
    const result = await executeAgentAction('log_energy', { level: 8, timeOfDay: 'morning', note: '睡得好' });
    expect(result.success).toBe(true);
    expect(useEnergyStore.getState().logs[0]).toMatchObject({ level: 8, timeOfDay: 'morning' });
    const listed = await executeAgentAction('list_energy', { days: 1 });
    expect(listed.message).toContain('睡得好');
  });
});
