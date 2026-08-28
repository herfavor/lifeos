import { describe, expect, it } from 'vitest';
import type { Task } from '../../types';
import { getTodayTasks, isTaskInToday, toLocalDateKey } from '../todayTasks';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task',
    title: overrides.title ?? '任务',
    description: '',
    status: 'todo',
    created: '2026-08-20T00:00:00.000Z',
    startDate: null,
    dueDate: null,
    priority: 'medium',
    tags: [],
    projectIds: [],
    ...overrides,
  };
}

describe('Today task query', () => {
  const today = new Date(2026, 7, 26, 14, 30);

  it('uses the local calendar day rather than UTC', () => {
    expect(toLocalDateKey(today)).toBe('2026-08-26');
  });

  it('includes overdue, due-today, in-progress and review tasks', () => {
    const tasks = [
      task({ id: 'overdue', dueDate: '2026-08-25' }),
      task({ id: 'today', dueDate: '2026-8-26' }),
      task({ id: 'progress', status: 'inprogress' }),
      task({ id: 'review', status: 'review' }),
      task({ id: 'future', dueDate: '2026-08-27' }),
      task({ id: 'backlog', status: 'backlog' }),
    ];

    expect(getTodayTasks(tasks, today).map((item) => item.id)).toEqual([
      'overdue', 'today', 'progress', 'review',
    ]);
  });

  it('excludes archived and completed tasks from the execution view', () => {
    expect(isTaskInToday(task({ dueDate: '2026-08-26', status: 'done' }), today)).toBe(false);
    expect(isTaskInToday(task({ dueDate: '2026-08-26', archivedAt: '2026-08-26' }), today)).toBe(false);
  });

  it('includes only same-day completed tasks for review metrics', () => {
    expect(isTaskInToday(task({ dueDate: '2026-08-26', status: 'done' }), today, { includeCompleted: true })).toBe(true);
    expect(isTaskInToday(task({ dueDate: '2026-08-25', status: 'done' }), today, { includeCompleted: true })).toBe(false);
  });
});
