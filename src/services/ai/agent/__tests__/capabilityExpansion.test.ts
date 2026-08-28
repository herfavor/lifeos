/**
 * Deep-management capability tests: kanban detail tools, note lifecycle,
 * focus, daily goals, routines, resources and task templates — all run
 * against the real Zustand stores (jsdom + storage shims).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { executeAgentAction } from '../executor';
import { useKanbanStore } from '../../../../stores/useKanbanStore';
import { useNotesStore } from '../../../../stores/useNotesStore';
import { useFocusModeStore } from '../../../../stores/useFocusModeStore';
import { useDailyPlanningStore } from '../../../../stores/useDailyPlanningStore';
import { useRoutineStore } from '../../../../stores/useRoutineStore';
import { useResourceStore } from '../../../../stores/useResourceStore';
import { useTemplateStore } from '../../../../stores/useTemplateStore';
import type { Task } from '../../../../types';

function seedTask(partial: Partial<Task> & { title: string; id: string }): Task {
  const task: Task = {
    id: partial.id,
    title: partial.title,
    description: '',
    status: 'todo',
    created: new Date().toISOString(),
    startDate: null,
    dueDate: null,
    priority: 'medium',
    tags: [],
    projectIds: [],
    checklist: [],
    subtasks: [],
    comments: [],
    ...partial,
  };
  useKanbanStore.setState((state) => ({ tasks: [...state.tasks, task] }));
  return task;
}

describe('kanban detail tools', () => {
  beforeEach(() => {
    useKanbanStore.setState({ tasks: [] });
  });

  it('adds, toggles and deletes checklist items', async () => {
    seedTask({ id: 't1', title: '写周报' });
    const add = await executeAgentAction('add_checklist_item', {
      taskId: 't1',
      text: '收集数据',
    });
    expect(add.success).toBe(true);
    expect(add.undo).toBeDefined();

    const task = useKanbanStore.getState().tasks.find((t) => t.id === 't1');
    expect(task!.checklist?.[0]?.text).toBe('收集数据');

    const toggle = await executeAgentAction('toggle_checklist_item', {
      taskId: 't1',
      text: '收集数据',
    });
    expect(toggle.success).toBe(true);
    expect(useKanbanStore.getState().tasks.find((t) => t.id === 't1')!.checklist?.[0]?.completed).toBe(true);

    const del = await executeAgentAction('delete_checklist_item', {
      taskId: 't1',
      text: '收集数据',
    });
    expect(del.success).toBe(true);
    expect(useKanbanStore.getState().tasks.find((t) => t.id === 't1')!.checklist).toHaveLength(0);
  });

  it('comments and subtasks attach to the task', async () => {
    seedTask({ id: 't1', title: '设计评审' });
    const comment = await executeAgentAction('add_comment', {
      taskId: 't1',
      text: '明天上午做',
    });
    expect(comment.success).toBe(true);
    expect(useKanbanStore.getState().tasks[0].comments?.some((c) => c.text === '明天上午做')).toBe(true);

    const subtask = await executeAgentAction('add_subtask', {
      taskId: 't1',
      title: '准备材料',
    });
    expect(subtask.success).toBe(true);
    expect(useKanbanStore.getState().tasks[0].subtasks?.[0]?.title).toBe('准备材料');

    const toggled = await executeAgentAction('toggle_subtask', { taskId: 't1', title: '准备材料' });
    expect(toggled.success).toBe(true);
    expect(useKanbanStore.getState().tasks[0].subtasks?.[0]?.completed).toBe(true);
  });

  it('archives and restores tasks', async () => {
    seedTask({ id: 't1', title: '过期任务' });
    const archived = await executeAgentAction('archive_task', { taskId: 't1' });
    expect(archived.success).toBe(true);
    expect(useKanbanStore.getState().tasks).toHaveLength(0);
    expect(useKanbanStore.getState().getArchivedTasks().some((t) => t.id === 't1')).toBe(true);

    const restored = await executeAgentAction('restore_task', { taskId: 't1' });
    expect(restored.success).toBe(true);
    expect(useKanbanStore.getState().tasks.some((t) => t.id === 't1')).toBe(true);
  });
});

describe('note lifecycle tools', () => {
  beforeEach(() => {
    useNotesStore.setState({ notes: {} });
  });

  it('deletes, restores and pins notes', async () => {
    const created = await executeAgentAction('create_note', { title: '会议纪要', content: '第一条' });
    expect(created.success).toBe(true);
    const id = created.refId!;
    expect(useNotesStore.getState().getNote(id)).toBeDefined();

    const pinned = await executeAgentAction('pin_note', { noteId: id });
    expect(pinned.success).toBe(true);
    expect(useNotesStore.getState().getNote(id)?.isPinned).toBe(true);

    const deleted = await executeAgentAction('delete_note', { noteId: id });
    expect(deleted.success).toBe(true);
    expect(useNotesStore.getState().getNote(id)?.deletedAt).toBeTruthy();

    const restored = await executeAgentAction('restore_note', { noteId: id });
    expect(restored.success).toBe(true);
    expect(useNotesStore.getState().getNote(id)?.deletedAt).toBeFalsy();
  });
});

describe('focus / planning / routines / resources / templates', () => {
  beforeEach(() => {
    useFocusModeStore.setState({ isActive: false, linkedTaskId: null, startedAt: null });
    useDailyPlanningStore.setState({ plans: {} });
    useRoutineStore.setState({ routines: [] });
    useResourceStore.setState({ resources: [] });
    useTemplateStore.setState({ templates: [] });
  });

  it('starts and ends focus mode', async () => {
    const start = await executeAgentAction('start_focus', {});
    expect(start.success).toBe(true);
    expect(useFocusModeStore.getState().isActive).toBe(true);
    const end = await executeAgentAction('end_focus', {});
    expect(end.success).toBe(true);
    expect(useFocusModeStore.getState().isActive).toBe(false);
  });

  it('adds and toggles daily goals on the given date', async () => {
    const add = await executeAgentAction('add_goal', {
      date: '2026-08-27',
      text: '完成周报',
    });
    expect(add.success).toBe(true);
    const plan = useDailyPlanningStore.getState().getPlan('2026-08-27');
    expect(plan.goals[0].text).toBe('完成周报');

    const toggle = await executeAgentAction('toggle_goal', {
      date: '2026-08-27',
      text: '完成周报',
    });
    expect(toggle.success).toBe(true);
    expect(useDailyPlanningStore.getState().getPlan('2026-08-27').goals[0].completed).toBe(true);
  });

  it('creates and deletes routines', async () => {
    const created = await executeAgentAction('create_routine', {
      name: '晨间仪式',
      timeOfDay: 'morning',
      estimatedMinutes: 20,
    });
    expect(created.success).toBe(true);
    expect(useRoutineStore.getState().routines[0]?.name).toBe('晨间仪式');

    const deleted = await executeAgentAction('delete_routine', { routineId: created.refId });
    expect(deleted.success).toBe(true);
    expect(useRoutineStore.getState().routines).toHaveLength(0);
  });

  it('creates and updates resources', async () => {
    const created = await executeAgentAction('create_resource', {
      name: '小王',
      capacity: 32,
      skills: ['前端', '设计'],
    });
    expect(created.success).toBe(true);
    expect(useResourceStore.getState().resources[0]?.name).toBe('小王');

    const updated = await executeAgentAction('update_resource', {
      resourceId: created.refId,
      updates: { capacity: 40 },
    });
    expect(updated.success).toBe(true);
    expect(useResourceStore.getState().resources[0]?.capacity).toBe(40);
  });

  it('creates task templates', async () => {
    const created = await executeAgentAction('create_template', {
      name: '周报模板',
      tags: ['周报'],
    });
    expect(created.success).toBe(true);
    expect(useTemplateStore.getState().templates[0]?.name).toBe('周报模板');
  });
});
