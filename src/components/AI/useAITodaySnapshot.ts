/**
 * useAITodaySnapshot
 *
 * Privacy-safe count summary of the user's current day, rendered as the
 * 「今日概览」 mini-cards in the AI workspace side rail. Mirrors the
 * count snapshot injected into the agent prompt (buildTodaySnapshot).
 */

import { useKanbanStore } from '../../stores/useKanbanStore';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useHabitStore } from '../../stores/useHabitStore';
import { useEnergyStore } from '../../stores/useEnergyStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';

function localDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Calendar store keys are NON-padded YYYY-M-D — normalize before indexing. */
function storeDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export interface AITodaySnapshot {
  tasksActive: number;
  tasksOverdue: number;
  tasksDueToday: number;
  tasksInProgress: number;
  eventsToday: number;
  eventsUpcoming: number;
  habitsCompleted: number;
  habitsPending: number;
  timerActive: boolean;
  timerDescription: string | null;
  energyToday: number;
}

/** Fresh count snapshot (cheap reads, always recomputed on render). */
export function useAITodaySnapshot(): AITodaySnapshot {
  const today = localDateKey(new Date());
  const todayStoreKey = storeDateKey(new Date());
  const tasks = (useKanbanStore.getState().tasks ?? []).filter((t) => t.status !== 'done');
  const events = useCalendarStore.getState().events ?? {};
  let upcoming = 0;
  for (let i = 1; i <= 3; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    upcoming += (events[storeDateKey(d)] ?? []).length;
  }
  const habits = useHabitStore.getState();
  const habitDateKey = `${new Date().getFullYear()}-${new Date().getMonth() + 1}-${new Date().getDate()}`;
  const activeHabits = habits.habits.filter((h) => !h.archivedAt);
  const completedToday = habits.completions.filter((c) => c.date === habitDateKey).length;
  const timer = useTimeTrackingStore.getState().activeEntry;

  return {
    tasksActive: tasks.length,
    tasksOverdue: tasks.filter((t) => t.dueDate && t.dueDate < today).length,
    tasksDueToday: tasks.filter((t) => t.dueDate === today).length,
    tasksInProgress: tasks.filter((t) => t.status === 'inprogress').length,
    eventsToday: (events[todayStoreKey] ?? []).length,
    eventsUpcoming: upcoming,
    habitsCompleted: completedToday,
    habitsPending: Math.max(0, activeHabits.length - completedToday),
    timerActive: timer !== null && !timer.isPaused,
    timerDescription: timer?.description ?? null,
    energyToday: useEnergyStore.getState().logs.filter((l) => l.date === today).length,
  };
}
