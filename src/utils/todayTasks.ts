import type { Task } from '../types';

const PRIORITY_RANK: Record<Task['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** Format a local calendar date without converting it through UTC. */
export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
export function normalizeTaskDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, year, month, day] = match;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export interface TodayTaskQueryOptions {
  /** Keep tasks completed on the selected date, useful for daily review. */
  includeCompleted?: boolean;
}

/** Shared product definition: overdue unfinished + due today + active work. */
export function isTaskInToday(
  task: Task,
  date: Date,
  options: TodayTaskQueryOptions = {}
): boolean {
  if (task.archivedAt) return false;

  const todayKey = toLocalDateKey(date);
  const dueKey = normalizeTaskDate(task.dueDate);

  if (task.status === 'done') {
    return options.includeCompleted === true && dueKey === todayKey;
  }
  if (task.status === 'inprogress' || task.status === 'review') return true;
  return dueKey !== null && dueKey <= todayKey;
}

export function getTodayTasks(
  tasks: Task[],
  date: Date,
  options: TodayTaskQueryOptions = {}
): Task[] {
  return tasks
    .filter((task) => isTaskInToday(task, date, options))
    .sort((a, b) => {
      const dueA = normalizeTaskDate(a.dueDate) ?? '9999-12-31';
      const dueB = normalizeTaskDate(b.dueDate) ?? '9999-12-31';
      const dueOrder = dueA.localeCompare(dueB);
      if (dueOrder !== 0) return dueOrder;
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
}
