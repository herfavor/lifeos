/**
 * Cross-Module AI Context Builder
 *
 * Aggregates state from all LifeOS modules to provide
 * contextual awareness to AI conversations.
 */

import { useNotesStore } from '../../stores/useNotesStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';
import { useHabitStore } from '../../stores/useHabitStore';
import { formatDateKey } from '../../utils/dateUtils';

export interface CrossModuleContext {
  notes: {
    recentNotes: Array<{ id: string; title: string; updatedAt: string; tags: string[] }>;
    pinnedNotes: Array<{ id: string; title: string }>;
    totalCount: number;
  };
  tasks: {
    inProgress: Array<{ id: string; title: string; priority: string; dueDate: string | null }>;
    overdueCount: number;
    dueTodayCount: number;
    totalActive: number;
  };
  calendar: {
    todayEvents: Array<{ title: string; startTime?: string; endTime?: string }>;
    upcomingEvents: Array<{ title: string; date: string; startTime?: string }>;
  };
  timeTracking: {
    activeTimer: { description: string; startTime: string } | null;
    todayHours: number;
  };
  habits: {
    todayCompleted: string[];
    todayPending: string[];
    topStreaks: Array<{ title: string; streak: number }>;
  };
  recentActivity: Array<{ type: string; module: string; title: string; timestamp: string }>;
  tokenEstimate: number;
}

/**
 * Build a cross-module context snapshot from all stores.
 */
export function buildCrossModuleContext(): CrossModuleContext {
  const today = new Date();
  const todayKey = formatDateKey(today);
  /** Calendar store keys are NON-padded YYYY-M-D; normalize before indexing. */
  const storeTodayKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;

  // --- Notes ---
  const notesState = useNotesStore.getState();
  const allNotes = notesState.getAllNotes().filter((n) => !n.isArchived);
  const sortedByUpdate = [...allNotes].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const recentNotes = sortedByUpdate.slice(0, 5).map((n) => ({
    id: n.id,
    title: n.title,
    updatedAt: new Date(n.updatedAt).toISOString(),
    tags: n.tags,
  }));
  const pinnedNotes = allNotes
    .filter((n) => n.isPinned)
    .map((n) => ({ id: n.id, title: n.title }));

  // --- Tasks (Kanban) ---
  const kanbanState = useKanbanStore.getState();
  const allTasks = kanbanState.tasks ?? [];
  const activeTasks = allTasks.filter(
    (t) => t.status !== 'done'
  );
  const inProgressTasks = allTasks
    .filter((t) => t.status === 'inprogress')
    .map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      dueDate: t.dueDate,
    }));

  const overdueCount = activeTasks.filter((t) => {
    if (!t.dueDate) return false;
    return t.dueDate < todayKey;
  }).length;

  const dueTodayCount = activeTasks.filter((t) => t.dueDate === todayKey).length;

  // --- Calendar ---
  const calendarState = useCalendarStore.getState();
  const allEvents = calendarState.events ?? {};
  const todayEvents = (allEvents[storeTodayKey] ?? []).map((e) => ({
    title: e.title,
    startTime: e.startTime,
    endTime: e.endTime,
  }));

  // Upcoming events: next 3 days (excluding today)
  const upcomingEvents: Array<{ title: string; date: string; startTime?: string }> = [];
  for (let i = 1; i <= 3; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + i);
    const futureKey = `${futureDate.getFullYear()}-${futureDate.getMonth() + 1}-${futureDate.getDate()}`;
    const dayEvents = allEvents[futureKey] ?? [];
    for (const evt of dayEvents) {
      upcomingEvents.push({
        title: evt.title,
        date: futureKey,
        startTime: evt.startTime,
      });
    }
  }

  // --- Time Tracking ---
  const timeState = useTimeTrackingStore.getState();
  const activeEntry = timeState.activeEntry;
  const activeTimer = activeEntry
    ? { description: activeEntry.description, startTime: activeEntry.startTime }
    : null;

  // Calculate today's total hours from entries
  const todayEntries = (timeState.entries ?? []).filter((e) => {
    const entryDate = formatDateKey(new Date(e.startTime));
    return entryDate === todayKey;
  });
  const todaySeconds = todayEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0);
  const todayHours = Math.round((todaySeconds / 3600) * 10) / 10;

  // --- Habits ---
  const habitState = useHabitStore.getState();
  // Habit store uses YYYY-M-D format (1-indexed month, non-padded)
  const habitDateKey = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  const activeHabits = habitState.habits.filter((h) => !h.archivedAt);
  const todayCompletions = habitState.completions.filter((c) => c.date === habitDateKey);
  const completedHabitIds = new Set(todayCompletions.map((c) => c.habitId));

  const todayCompleted = activeHabits
    .filter((h) => completedHabitIds.has(h.id))
    .map((h) => h.title);
  const todayPending = activeHabits
    .filter((h) => !completedHabitIds.has(h.id))
    .map((h) => h.title);
  const topStreaks = [...activeHabits]
    .filter((h) => h.currentStreak > 0)
    .sort((a, b) => b.currentStreak - a.currentStreak)
    .slice(0, 5)
    .map((h) => ({ title: h.title, streak: h.currentStreak }));

  // --- Activity (from activity store, may not exist yet) ---
  let recentActivity: CrossModuleContext['recentActivity'] = [];
  try {
    // Dynamic import attempt — activity store is being created in parallel
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const activityModule = require('../../stores/useActivityStore');
    if (activityModule?.useActivityStore) {
      const activityState = activityModule.useActivityStore.getState();
      const events = activityState.events ?? activityState.activities ?? [];
      recentActivity = events.slice(0, 20).map((e: Record<string, unknown>) => ({
        type: String(e.type ?? 'unknown'),
        module: String(e.module ?? 'unknown'),
        title: String(e.title ?? e.description ?? ''),
        timestamp: String(e.timestamp ?? ''),
      }));
    }
  } catch {
    // Activity store not yet available — that's fine
  }

  // Build the context object
  const context: CrossModuleContext = {
    notes: { recentNotes, pinnedNotes, totalCount: allNotes.length },
    tasks: {
      inProgress: inProgressTasks,
      overdueCount,
      dueTodayCount,
      totalActive: activeTasks.length,
    },
    calendar: { todayEvents, upcomingEvents },
    timeTracking: { activeTimer, todayHours },
    habits: { todayCompleted, todayPending, topStreaks },
    recentActivity,
    tokenEstimate: 0,
  };

  // Calculate token estimate
  const promptText = contextToSystemPrompt(context);
  context.tokenEstimate = estimateTokens(promptText);

  return context;
}

/**
 * Convert the structured context into a natural language system prompt.
 */
export function contextToSystemPrompt(context: CrossModuleContext): string {
  const sections: string[] = [];

  sections.push(
    '你是 LifeOS（本地优先的个人管理平台）的 AI 助手。' +
    '以下是用户的当前状态：'
  );

  // Notes
  if (context.notes.totalCount > 0) {
    const recentTitles = context.notes.recentNotes.map((n) => `"${n.title}"`).join(', ');
    let noteSection = `**笔记：** 用户共有 ${context.notes.totalCount} 条笔记。`;
    if (context.notes.recentNotes.length > 0) {
      noteSection += ` 最近处理：${recentTitles}。`;
    }
    if (context.notes.pinnedNotes.length > 0) {
      const pinned = context.notes.pinnedNotes.map((n) => `"${n.title}"`).join(', ');
      noteSection += ` 已置顶：${pinned}。`;
    }
    sections.push(noteSection);
  }

  // Tasks
  if (context.tasks.totalActive > 0) {
    let taskSection = `**任务：** ${context.tasks.totalActive} 个活跃任务。`;
    if (context.tasks.inProgress.length > 0) {
      const inProg = context.tasks.inProgress
        .map((t) => `"${t.title}" (${t.priority})`)
        .join(', ');
      taskSection += ` 进行中：${inProg}。`;
    }
    if (context.tasks.overdueCount > 0) {
      taskSection += ` ${context.tasks.overdueCount} 项已逾期。`;
    }
    if (context.tasks.dueTodayCount > 0) {
      taskSection += ` ${context.tasks.dueTodayCount} 项今日到期。`;
    }
    sections.push(taskSection);
  }

  // Calendar
  if (context.calendar.todayEvents.length > 0 || context.calendar.upcomingEvents.length > 0) {
    let calSection = '**日历：**';
    if (context.calendar.todayEvents.length > 0) {
      const todayList = context.calendar.todayEvents
        .map((e) => {
          let s = `"${e.title}"`;
          if (e.startTime) s += ` 于 ${e.startTime}`;
          return s;
        })
        .join(', ');
      calSection += ` 今日：${todayList}。`;
    }
    if (context.calendar.upcomingEvents.length > 0) {
      const upcoming = context.calendar.upcomingEvents
        .map((e) => `"${e.title}" 于 ${e.date}`)
        .join(', ');
      calSection += ` 即将到来：${upcoming}。`;
    }
    sections.push(calSection);
  }

  // Time Tracking
  if (context.timeTracking.activeTimer || context.timeTracking.todayHours > 0) {
    let timeSection = '**时间追踪：**';
    if (context.timeTracking.activeTimer) {
      timeSection += ` 正在追踪："${context.timeTracking.activeTimer.description}"。`;
    }
    if (context.timeTracking.todayHours > 0) {
      timeSection += ` 今日已记录 ${context.timeTracking.todayHours} 小时。`;
    }
    sections.push(timeSection);
  }

  // Habits
  if (context.habits.todayCompleted.length > 0 || context.habits.todayPending.length > 0) {
    let habitSection = '**习惯：**';
    if (context.habits.todayCompleted.length > 0) {
      habitSection += ` 今日已完成：${context.habits.todayCompleted.join(', ')}。`;
    }
    if (context.habits.todayPending.length > 0) {
      habitSection += ` 待完成：${context.habits.todayPending.join(', ')}。`;
    }
    if (context.habits.topStreaks.length > 0) {
      const streaks = context.habits.topStreaks
        .map((s) => `${s.title}（连续 ${s.streak} 天）`)
        .join(', ');
      habitSection += ` 最长连续：${streaks}。`;
    }
    sections.push(habitSection);
  }

  return sections.join('\n\n');
}

/**
 * Rough token estimate: ~4 characters per token.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
