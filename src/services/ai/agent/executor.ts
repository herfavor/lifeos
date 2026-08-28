/**
 * Agent Action Executor
 *
 * Executes validated agent actions directly against the local Zustand
 * stores (Kanban / Calendar / Notes). No network, no server: everything
 * happens on-device, consistent with LifeOS's local-first model.
 *
 * Resolution rules:
 * - Actions may reference entities either by explicit id or by a
 *   case-insensitive title substring (`titleQuery`).
 * - Ambiguous references NEVER execute blindly: the executor fails with a
 *   candidate list so the model/user can disambiguate on the next turn.
 */

import type {
  ActionResult,
  AgentToolId,
  UndoAction,
  UndoDescriptor,
  UndoKind,
} from './types';
import type { Habit, ProjectContext, Task, TaskPriority, TaskStatus } from '../../../types';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import { useNotesStore } from '../../../stores/useNotesStore';
import { useProjectContextStore } from '../../../stores/useProjectContextStore';
import { useLinkLibraryStore, type Link } from '../../../stores/useLinkLibraryStore';
import { useAutomationStore } from '../../../stores/useAutomationStore';
import { useHabitStore } from '../../../stores/useHabitStore';
import { useEnergyStore } from '../../../stores/useEnergyStore';
import { useTimeTrackingStore } from '../../../stores/useTimeTrackingStore';
import { useFocusModeStore } from '../../../stores/useFocusModeStore';
import { useDailyPlanningStore } from '../../../stores/useDailyPlanningStore';
import { useRoutineStore } from '../../../stores/useRoutineStore';
import { useResourceStore } from '../../../stores/useResourceStore';
import { useTemplateStore } from '../../../stores/useTemplateStore';
import type { CalendarEvent } from '../../../types';
import type { Note, NoteUpdate } from '../../../types/notes';
import type { AutomationRule } from '../../../types/automation';
import type { TimeEntry } from '../../../types';
import {
  markdownToLexical,
  appendMarkdownToLexical,
} from '../../../utils/markdownToLexical';
import { logger } from '../../logger';

const log = logger.module('AIAgentExecutor');
// ────────────────────────────────────────────── helpers

interface RefFailure {
  ok: false;
  result: ActionResult;
}
interface RefSuccess<T> {
  ok: true;
  value: T;
}

function ambiguityError(kind: string, candidates: Array<{ id: string; title: string }>): RefFailure {
  const list = candidates
    .slice(0, 5)
    .map((c) => `「${c.title}」(id: ${c.id})`)
    .join('、');
  return {
    ok: false,
    result: {
      success: false,
      message: `找到 ${candidates.length} 个匹配的${kind}：${list}。请使用更精确的标题或直接指定 id。`,
    },
  };
}

function notFoundError(kind: string, query: string): RefFailure {
  return {
    ok: false,
    result: { success: false, message: `未找到匹配的${kind}：「${query}」` },
  };
}

function matchTitle(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

function todayKey(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Calendar store uses NON-padded YYYY-M-D keys (MiniCalendar / month grid
 * compose keys as `${year}-${month+1}-${day}`). The agent protocol accepts
 * padded YYYY-MM-DD everywhere; normalize at the storage boundary so
 * AI-created events are visible in exactly the same place manual clicks put
 * them — otherwise they land under a key nothing reads.
 */
function storeDateKey(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return `${y}-${m}-${d}`;
}

/** Padded YYYY-MM-DD for user-facing display (from any legal key). */
function displayDateKey(key: string): string {
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(key)) {
    const [y, m, d] = key.split('-').map(Number);
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return key;
}

function addDaysKey(base: string, days: number): string {
  const [y, m, d] = base.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${mm}-${dd}`;
}

function shiftDayKey(key: string, days: number): string {
  return addDaysKey(key, days);
}

function habitDateKey(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return `${year}-${month}-${day}`;
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Build a serialisable undo descriptor attached to write results. */
function makeUndo(
  kind: UndoKind,
  action: UndoAction,
  refId: string | undefined,
  detail: Record<string, unknown>,
  label: string
): UndoDescriptor {
  return { kind, action, refId, detail, label };
}

function undoForCreated(
  kind: UndoKind,
  refId: string | undefined,
  detail: Record<string, unknown>,
  noun: string
): UndoDescriptor {
  return makeUndo(kind, 'created', refId, detail, `撤销创建${noun}`);
}

// ────────────────────────────────────────────── task resolution

function resolveTask(params: {
  taskId?: unknown;
  titleQuery?: unknown;
}): RefSuccess<Task> | RefFailure {
  const kanban = useKanbanStore.getState();
  const all = (kanban.tasks ?? []) as Task[];

  if (typeof params.taskId === 'string' && params.taskId.trim()) {
    const found = all.find((t) => t.id === params.taskId);
    if (!found) return notFoundError('任务', params.taskId);
    return { ok: true, value: found };
  }

  const query = typeof params.titleQuery === 'string' ? params.titleQuery.trim() : '';
  if (!query) return notFoundError('任务', '');
  const matches = all.filter((t) => matchTitle(t.title, query));
  if (matches.length === 0) return notFoundError('任务', query);
  if (matches.length > 1) return ambiguityError('任务', matches);
  return { ok: true, value: matches[0] };
}

// ────────────────────────────────────────────── event resolution

interface EventHit {
  dateKey: string;
  event: CalendarEvent;
}

function collectEventsInRange(fromKey?: string, toKey?: string): EventHit[] {
  const { events } = useCalendarStore.getState();
  const from = fromKey ? storeDateKey(fromKey) : undefined;
  const to = toKey ? storeDateKey(toKey) : undefined;
  const hits: EventHit[] = [];
  for (const [dateKey, dayEvents] of Object.entries(events ?? {})) {
    if (from && dateKey < from) continue;
    if (to && dateKey > to) continue;
    for (const event of dayEvents ?? []) {
      hits.push({ dateKey, event });
    }
  }
  return hits.sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey < b.dateKey ? -1 : 1;
    return (a.event.startTime ?? '') < (b.event.startTime ?? '') ? -1 : 1;
  });
}

function resolveEvent(params: {
  eventId?: unknown;
  titleQuery?: unknown;
  date?: unknown;
}): RefSuccess<EventHit> | RefFailure {
  const scoped = collectEventsInRange(
    typeof params.date === 'string' ? params.date : undefined,
    typeof params.date === 'string' ? params.date : undefined
  );

  if (typeof params.eventId === 'string' && params.eventId.trim()) {
    const hit =
      scoped.find((h) => h.event.id === params.eventId) ??
      collectEventsInRange().find((h) => h.event.id === params.eventId);
    if (!hit) return notFoundError('日程', params.eventId);
    return { ok: true, value: hit };
  }

  const query = typeof params.titleQuery === 'string' ? params.titleQuery.trim() : '';
  if (!query) return notFoundError('日程', '');
  const pool = scoped.length > 0 || params.date ? scoped : collectEventsInRange();
  const matches = pool.filter((h) => matchTitle(h.event.title, query));
  if (matches.length === 0) return notFoundError('日程', query);
  if (matches.length > 1) {
    return ambiguityError(
      '日程',
      matches.map((m) => ({ id: m.event.id, title: `${m.dateKey} ${m.event.title}` }))
    );
  }
  return { ok: true, value: matches[0] };
}

// ────────────────────────────────────────────── note resolution

function resolveNote(params: {
  noteId?: unknown;
  titleQuery?: unknown;
}): RefSuccess<Note> | RefFailure {
  const notes = useNotesStore.getState();
  const all = notes.getAllNotes().filter((n) => !n.isArchived);

  if (typeof params.noteId === 'string' && params.noteId.trim()) {
    const direct = notes.getNote(params.noteId);
    const found = all.find((n) => n.id === params.noteId) ??
      (direct && !direct.deletedAt && !direct.isArchived ? direct : undefined);
    if (!found) return notFoundError('笔记', params.noteId);
    return { ok: true, value: found };
  }

  const query = typeof params.titleQuery === 'string' ? params.titleQuery.trim() : '';
  if (!query) return notFoundError('笔记', '');
  const matches = all.filter((n) => matchTitle(n.title, query));
  if (matches.length === 0) return notFoundError('笔记', query);
  if (matches.length > 1) return ambiguityError('笔记', matches);
  return { ok: true, value: matches[0] };
}

function resolveNamed<T extends { id: string }>(
  kind: string,
  values: T[],
  params: Record<string, unknown>,
  idKey: string,
  queryKey: string,
  label: (value: T) => string
): RefSuccess<T> | RefFailure {
  const id = typeof params[idKey] === 'string' ? String(params[idKey]).trim() : '';
  if (id) {
    const found = values.find((value) => value.id === id);
    return found ? { ok: true, value: found } : notFoundError(kind, id);
  }
  const query = typeof params[queryKey] === 'string' ? String(params[queryKey]).trim() : '';
  const matches = values.filter((value) => matchTitle(label(value), query));
  if (matches.length === 0) return notFoundError(kind, query);
  if (matches.length > 1) {
    return ambiguityError(kind, matches.map((value) => ({ id: value.id, title: label(value) })));
  }
  return { ok: true, value: matches[0] };
}

// ────────────────────────────────────────────── individual executors

function executeListTasks(params: Record<string, unknown>): ActionResult {
  const tasks = (useKanbanStore.getState().tasks ?? []) as Task[];
  const query = typeof params.query === 'string' ? params.query : '';
  const filtered = tasks.filter((t) => {
    if (params.status && t.status !== params.status) return false;
    if (params.priority && t.priority !== params.priority) return false;
    if (params.tag && !(t.tags ?? []).includes(String(params.tag))) return false;
    if (query && !matchTitle(`${t.title} ${t.description}`, query)) return false;
    return true;
  });
  const limit = typeof params.limit === 'number' ? params.limit : 15;
  const shown = filtered.slice(0, limit);

  if (filtered.length === 0) {
    return { success: true, message: '当前没有符合条件的任务。' };
  }
  const statusLabel: Record<TaskStatus, string> = {
    backlog: '待规划',
    todo: '待办',
    inprogress: '进行中',
    review: '复审',
    done: '已完成',
  };
  const lines = shown.map((t) => {
    const bits = [
      statusLabel[t.status] ?? t.status,
      t.priority !== 'medium' ? String(t.priority) : '',
      t.dueDate ? `截止 ${t.dueDate}` : '',
    ].filter(Boolean);
    return `- ${t.title}${bits.length ? `（${bits.join('，')}）` : ''} [id: ${t.id}]`;
  });
  const suffix = filtered.length > shown.length ? `\n（共 ${filtered.length} 条，仅显示前 ${shown.length} 条）` : '';
  return { success: true, message: `查询到 ${filtered.length} 个任务：\n${lines.join('\n')}${suffix}` };
}

function executeCreateTask(params: Record<string, unknown>): ActionResult {
  useKanbanStore.getState().addTask({
    title: String(params.title),
    description: typeof params.description === 'string' ? params.description : '',
    status: (params.status as TaskStatus) || 'todo',
    priority: (params.priority as TaskPriority) || 'medium',
    tags: Array.isArray(params.tags) ? (params.tags as string[]) : [],
    startDate: typeof params.startDate === 'string' ? params.startDate : null,
    dueDate: typeof params.dueDate === 'string' ? params.dueDate : null,
    projectIds: [],
    order: 0,
  });
  // Re-read fresh state: getState() snapshots are stale after a mutation.
  const tasksAfter = (useKanbanStore.getState().tasks ?? []) as Task[];
  const ref = [...tasksAfter].reverse().find((t) => t.title === String(params.title));
  return {
    success: true,
    message: `已创建任务「${String(params.title)}」`,
    refId: ref?.id,
    undo: undoForCreated('task', ref?.id, {}, '任务'),
  };
}

function executeUpdateTask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;

  const task = resolved.value;
  const kanban = useKanbanStore.getState();
  const updates = (params.updates ?? {}) as Record<string, unknown>;
  const applied: string[] = [];

  if (typeof updates.status === 'string' && updates.status !== task.status) {
    kanban.moveTask(task.id, updates.status as TaskStatus);
    applied.push(`状态 → ${updates.status}`);
  }
  const patch: Partial<Task> = {};
  if (typeof updates.title === 'string' && updates.title !== task.title) {
    patch.title = updates.title;
    applied.push(`标题 → 「${updates.title}」`);
  }
  if (typeof updates.description === 'string') {
    patch.description = updates.description;
    applied.push('已更新描述');
  }
  if (typeof updates.priority === 'string' && updates.priority !== task.priority) {
    patch.priority = updates.priority as TaskPriority;
    applied.push(`优先级 → ${updates.priority}`);
  }
  if (updates.dueDate !== undefined) {
    patch.dueDate = (updates.dueDate as string | null) ?? null;
    applied.push(patch.dueDate ? `截止日期 → ${patch.dueDate}` : '已清除截止日期');
  }
  if (updates.startDate !== undefined) {
    patch.startDate = (updates.startDate as string | null) ?? null;
    applied.push(patch.startDate ? `开始日期 → ${patch.startDate}` : '已清除开始日期');
  }
  let tags = [...(task.tags ?? [])];
  if (Array.isArray(updates.addTags)) {
    for (const tag of updates.addTags as string[]) {
      if (!tags.includes(tag)) tags.push(tag);
    }
    applied.push(`添加标签 ${(updates.addTags as string[]).join(', ')}`);
  }
  if (Array.isArray(updates.removeTags)) {
    tags = tags.filter((t) => !(updates.removeTags as string[]).includes(t));
    applied.push(`移除标签 ${(updates.removeTags as string[]).join(', ')}`);
  }
  if (!arraysEqual(tags, task.tags ?? [])) {
    patch.tags = tags;
  }
  if (Object.keys(patch).length > 0) {
    kanban.updateTask(task.id, patch);
  }

  if (applied.length === 0) {
    return { success: true, message: `任务「${task.title}」无需修改`, refId: task.id };
  }
  return {
    success: true,
    message: `已修改任务「${task.title}」：${applied.join('；')}`,
    refId: task.id,
    undo: makeUndo(
      'task',
      'updated',
      task.id,
      {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        dueDate: task.dueDate,
        startDate: task.startDate,
        tags: task.tags ?? [],
      },
      `撤销修改任务「${task.title}」`
    ),
  };
}

function executeCompleteTask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  if (task.status === 'done') {
    return { success: true, message: `任务「${task.title}」已经是完成状态`, refId: task.id };
  }
  useKanbanStore.getState().moveTask(task.id, 'done');
  return {
    success: true,
    message: `已完成任务「${task.title}」`,
    refId: task.id,
    undo: makeUndo('task', 'completed', task.id, { status: task.status }, `撤销完成任务「${task.title}」`),
  };
}

function executeArchiveTask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  useKanbanStore.getState().archiveTask(task.id);
  return {
    success: true,
    message: `已归档任务「${task.title}」`,
    refId: task.id,
    undo: makeUndo('task', 'archived', task.id, {}, `撤销归档任务「${task.title}」`),
  };
}

function executeRestoreTask(params: Record<string, unknown>): ActionResult {
  // Restored targets live in the archived store, so resolve there first.
  const archived = useKanbanStore.getState().getArchivedTasks();
  if (typeof params.taskId === 'string' && params.taskId.trim()) {
    const found = archived.find((t) => t.id === params.taskId);
    if (!found) return notFoundError('任务', params.taskId).result;
    useKanbanStore.getState().restoreTask(found.id);
    return {
      success: true,
      message: `已恢复任务「${found.title}」`,
      refId: found.id,
      undo: makeUndo('task', 'archived', found.id, {}, `撤销恢复任务「${found.title}」`),
    };
  }
  const query = typeof params.titleQuery === 'string' ? params.titleQuery.trim() : '';
  if (!query) return notFoundError('任务', '').result;
  const matches = archived.filter((t) => matchTitle(t.title, query));
  if (matches.length === 0) return notFoundError('任务', query).result;
  if (matches.length > 1) return ambiguityError('任务', matches).result;
  const task = matches[0];
  useKanbanStore.getState().restoreTask(task.id);
  return {
    success: true,
    message: `已恢复任务「${task.title}」`,
    refId: task.id,
    undo: makeUndo('task', 'archived', task.id, {}, `撤销恢复任务「${task.title}」`),
  };
}

function executeAddChecklistItem(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  useKanbanStore.getState().addChecklistItem(task.id, String(params.text));
  return {
    success: true,
    message: `已为任务「${task.title}」添加清单项「${String(params.text)}」`,
    refId: task.id,
    undo: makeUndo(
      'task',
      'updated',
      task.id,
      { checklistBefore: task.checklist ?? [] },
      `撤销任务「${task.title}」的清单项`
    ),
  };
}

function resolveChecklistItem(task: Task, text: string): { itemId: string; done: boolean; text: string } | null {
  const item = (task.checklist ?? []).find((c) => c.text === text);
  if (!item) return null;
  return { itemId: item.id, done: item.completed, text: item.text };
}

function executeToggleChecklistItem(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  const found = resolveChecklistItem(task, String(params.text));
  if (!found) {
    return { success: false, message: `任务「${task.title}」中没有匹配的清单项：「${String(params.text)}」` };
  }
  useKanbanStore.getState().toggleChecklistItem(task.id, found.itemId);
  return {
    success: true,
    message: `已${found.done ? '取消勾选' : '勾选'}任务「${task.title}」的清单项「${found.text}」`,
    refId: task.id,
  };
}

function executeDeleteChecklistItem(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  const found = resolveChecklistItem(task, String(params.text));
  if (!found) {
    return { success: false, message: `任务「${task.title}」中没有匹配的清单项：「${String(params.text)}」` };
  }
  useKanbanStore.getState().deleteChecklistItem(task.id, found.itemId);
  return {
    success: true,
    message: `已删除任务「${task.title}」的清单项「${found.text}」`,
    refId: task.id,
    undo: makeUndo(
      'task',
      'updated',
      task.id,
      { checklistBefore: task.checklist ?? [] },
      `撤销删除任务「${task.title}」的清单项`
    ),
  };
}

function executeAddComment(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  useKanbanStore.getState().addComment(task.id, String(params.text));
  return {
    success: true,
    message: `已为任务「${task.title}」添加评论（${String(params.text).length} 字）`,
    refId: task.id,
    undo: makeUndo(
      'task',
      'updated',
      task.id,
      { commentsBefore: task.comments ?? [] },
      `撤销任务「${task.title}」的评论`
    ),
  };
}

function executeAddSubtask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  useKanbanStore.getState().addSubtask(task.id, {
    title: String(params.title),
    description: typeof params.description === 'string' ? params.description : undefined,
    completed: false,
  });
  return {
    success: true,
    message: `已为任务「${task.title}」添加子任务「${String(params.title)}」`,
    refId: task.id,
    undo: makeUndo(
      'task',
      'updated',
      task.id,
      { subtasksBefore: task.subtasks ?? [] },
      `撤销任务「${task.title}」的子任务`
    ),
  };
}

function executeToggleSubtask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  const subtask = (task.subtasks ?? []).find((s) => s.title === String(params.title));
  if (!subtask) {
    return { success: false, message: `任务「${task.title}」中没有匹配的子任务：「${String(params.title)}」` };
  }
  useKanbanStore.getState().toggleSubtask(task.id, subtask.id);
  return {
    success: true,
    message: `已${subtask.completed ? '重新打开' : '完成'}任务「${task.title}」的子任务「${subtask.title}」`,
    refId: task.id,
  };
}

function executeDeleteTask(params: Record<string, unknown>): ActionResult {
  const resolved = resolveTask(params);
  if (!resolved.ok) return resolved.result;
  const task = resolved.value;
  useKanbanStore.getState().deleteTask(task.id);
  return {
    success: true,
    message: `已删除任务「${task.title}」`,
    refId: task.id,
    undo: makeUndo('task', 'deleted', task.id, {}, `撤销删除任务「${task.title}」`),
  };
}

function executeListEvents(params: Record<string, unknown>): ActionResult {
  const from = typeof params.from === 'string' ? params.from : todayKey();
  const to = typeof params.to === 'string' ? params.to : shiftDayKey(from, 6);
  const hits = collectEventsInRange(from < to ? from : to, to > from ? to : from);
  if (hits.length === 0) {
    return { success: true, message: `${from} 至 ${to} 期间没有日程安排。` };
  }
  const shown = hits.slice(0, 20);
  const lines = shown.map((h) => {
    const time = h.event.startTime
      ? ` ${h.event.startTime}${h.event.endTime ? `-${h.event.endTime}` : ''}`
      : '';
    return `- ${displayDateKey(h.dateKey)}${time} ${h.event.title} [id: ${h.event.id}]`;
  });
  const suffix = hits.length > shown.length ? `\n（共 ${hits.length} 条，仅显示前 ${shown.length} 条）` : '';
  return { success: true, message: `${displayDateKey(from)} 至 ${displayDateKey(to)} 的日程（${hits.length} 条）：\n${lines.join('\n')}${suffix}` };
}

function executeCreateEvent(params: Record<string, unknown>): ActionResult {
  const calendar = useCalendarStore.getState();
  const dateKey = storeDateKey(String(params.date));
  const displayDate = displayDateKey(dateKey);
  const title = String(params.title);
  const existingIds = new Set((calendar.events?.[dateKey] ?? []).map((e) => e.id));
  calendar.addEvent(
    dateKey,
    title,
    typeof params.description === 'string' ? params.description : '',
    {
      startTime: typeof params.startTime === 'string' ? params.startTime : undefined,
      endTime: typeof params.endTime === 'string' ? params.endTime : undefined,
    }
  );
  const fresh = (useCalendarStore.getState().events?.[dateKey] ?? []).find(
    (e) => !existingIds.has(e.id) && e.title === title
  );
  const timeSuffix = typeof params.startTime === 'string' ? ` ${params.startTime}` : '';
  return {
    success: true,
    message: `已在 ${displayDate}${timeSuffix} 创建日程「${title}」`,
    refId: fresh?.id,
    undo: makeUndo('event', 'created', fresh?.id, { dateKey }, `撤销创建日程「${title}」`),
  };
}

function executeUpdateEvent(params: Record<string, unknown>): ActionResult {
  const resolved = resolveEvent(params);
  if (!resolved.ok) return resolved.result;
  const { dateKey, event } = resolved.value;
  const calendar = useCalendarStore.getState();
  const updates = (params.updates ?? {}) as Record<string, unknown>;
  const moveTo = typeof params.moveTo === 'string' && params.moveTo ? storeDateKey(params.moveTo) : null;

  const nextTitle = typeof updates.title === 'string' ? updates.title : event.title;
  const nextDescription =
    updates.description !== undefined && typeof updates.description === 'string'
      ? updates.description
      : (event.description ?? '');
  const nextStartTime =
    updates.startTime !== undefined && typeof updates.startTime === 'string'
      ? updates.startTime
      : event.startTime;
  const nextEndTime =
    updates.endTime !== undefined && typeof updates.endTime === 'string'
      ? updates.endTime
      : event.endTime;

  const applied: string[] = [];
  if (nextTitle !== event.title) applied.push(`标题 → 「${nextTitle}」`);
  if (nextStartTime !== event.startTime) applied.push(nextStartTime ? `开始时间 → ${nextStartTime}` : '已清除开始时间');
  if (nextEndTime !== event.endTime) applied.push(nextEndTime ? `结束时间 → ${nextEndTime}` : '已清除结束时间');
  if (updates.description !== undefined && nextDescription !== (event.description ?? '')) {
    applied.push('已更新描述');
  }

  if (moveTo && moveTo !== dateKey) {
    // Preserve every user-facing field except identity; the store mints a new id.
    const { id: _ignored, ...rest } = event;
    calendar.deleteEvent(dateKey, event.id);
    const freshEvents = (useCalendarStore.getState().events?.[moveTo] ?? []).filter(
      (e) => e.title !== nextTitle || e.startTime !== nextStartTime
    );
    calendar.addEvent(moveTo, nextTitle, nextDescription, {
      ...(rest as Partial<CalendarEvent>),
      startTime: nextStartTime,
      endTime: nextEndTime,
    });
    const fresh = (useCalendarStore.getState().events?.[moveTo] ?? []).find(
      (e) => !freshEvents.includes(e)
    );
    applied.push(`日期 ${displayDateKey(dateKey)} → ${displayDateKey(moveTo)}`);
    return {
      success: true,
      message: `已修改日程「${nextTitle}」：${applied.join('；')}`,
      refId: fresh?.id,
      undo: makeUndo(
        'event',
        'updated',
        fresh?.id,
        {
          oldDateKey: dateKey,
          oldTitle: event.title,
          oldDescription: event.description ?? '',
          oldStartTime: event.startTime ?? '',
          oldEndTime: event.endTime ?? '',
          newDateKey: moveTo,
        },
        `撤销日程「${nextTitle}」的修改`
      ),
    };
  }

  calendar.updateEvent(dateKey, event.id, nextTitle, nextDescription, {
    startTime: nextStartTime,
    endTime: nextEndTime,
  });

  if (applied.length === 0) {
    return { success: true, message: `日程「${event.title}」无需修改`, refId: event.id };
  }
  return {
    success: true,
    message: `已修改日程「${nextTitle}」：${applied.join('；')}`,
    refId: event.id,
    undo: makeUndo(
      'event',
      'updated',
      event.id,
      {
        dateKey,
        oldTitle: event.title,
        oldDescription: event.description ?? '',
        oldStartTime: event.startTime ?? '',
        oldEndTime: event.endTime ?? '',
      },
      `撤销日程「${nextTitle}」的修改`
    ),
  };
}

function executeDeleteEvent(params: Record<string, unknown>): ActionResult {
  const resolved = resolveEvent(params);
  if (!resolved.ok) return resolved.result;
  const { dateKey, event } = resolved.value;
  useCalendarStore.getState().deleteEvent(dateKey, event.id);
  return {
    success: true,
    message: `已删除日程「${event.title}」（${displayDateKey(dateKey)}）`,
    refId: event.id,
    undo: makeUndo(
      'event',
      'deleted',
      event.id,
      {
        dateKey,
        title: event.title,
        description: event.description ?? '',
        startTime: event.startTime ?? '',
        endTime: event.endTime ?? '',
      },
      `撤销删除日程「${event.title}」`
    ),
  };
}

function executeCreateNote(params: Record<string, unknown>): ActionResult {
  const notes = useNotesStore.getState();
  const title = String(params.title);
  const markdown = typeof params.content === 'string' ? params.content : '';
  const tags = Array.isArray(params.tags) ? (params.tags as string[]) : [];
  const note = notes.createNote({
    title,
    content: markdownToLexical(markdown),
    contentText: markdown,
    tags,
  });
  return {
    success: true,
    message: `已创建笔记「${title}」${markdown ? `（${markdown.length} 字）` : ''}`,
    refId: note.id,
    undo: makeUndo('note', 'created', note.id, {}, `撤销创建笔记「${title}」`),
  };
}

function executeAppendNote(params: Record<string, unknown>): ActionResult {
  const resolved = resolveNote(params);
  if (!resolved.ok) return resolved.result;
  const note = resolved.value;
  const markdown = String(params.content);
  const notes = useNotesStore.getState();
  const mergedContent = appendMarkdownToLexical(note.content || '', markdown, '\n\n');
  const mergedText = `${note.contentText ? `${note.contentText}\n\n` : ''}${markdown}`;
  notes.updateNote(note.id, { content: mergedContent, contentText: mergedText });
  return {
    success: true,
    message: `已向笔记「${note.title}」追加 ${markdown.length} 字内容`,
    refId: note.id,
    undo: makeUndo(
      'note',
      'updated',
      note.id,
      { contentBefore: note.content, contentTextBefore: note.contentText },
      `撤销向笔记「${note.title}」追加内容`
    ),
  };
}

function executeListNotes(params: Record<string, unknown>): ActionResult {
  const notes = useNotesStore.getState();
  const query = typeof params.query === 'string' ? params.query : '';
  const limit = typeof params.limit === 'number' ? params.limit : 10;
  const pool = notes.getAllNotes().filter((n) => !n.isArchived);
  const matched = query
    ? pool.filter((n) => matchTitle(`${n.title}\n${n.contentText}`, query))
    : [...pool].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  if (matched.length === 0) {
    return { success: true, message: query ? `未找到与「${query}」相关的笔记。` : '当前没有笔记。' };
  }
  const shown = matched.slice(0, limit);
  const lines = shown.map((n) => {
    const preview = n.contentText.replace(/\s+/g, ' ').slice(0, 40);
    return `- ${n.title}${preview ? `：${preview}${n.contentText.length > 40 ? '…' : ''}` : ''} [id: ${n.id}]`;
  });
  const suffix = matched.length > shown.length ? `\n（共 ${matched.length} 篇，仅显示前 ${shown.length} 篇）` : '';
  return { success: true, message: `相关笔记（${matched.length} 篇）：\n${lines.join('\n')}${suffix}` };
}

// ────────────────────────────────────────────── time tracking / focus /
// planning / routines / resources / templates ── (below)

function toLocalDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function executeListTimeEntries(params: Record<string, unknown>): ActionResult {
  const store = useTimeTrackingStore.getState();
  const today = toLocalDateKey(new Date());
  const date = typeof params.date === 'string' ? params.date : null;
  const days = typeof params.days === 'number' ? params.days : 7;
  const from = date ?? shiftDayKey(today, -(days - 1));
  const to = date ?? today;
  const pool = (store.entries ?? []).filter((e) => {
    const key = toLocalDateKey(new Date(e.startTime));
    return key >= from && key <= to;
  });
  const active = store.activeEntry;
  const limit = typeof params.limit === 'number' ? params.limit : 15;
  const shown = pool.slice(0, limit);
  if (shown.length === 0 && !active) {
    return { success: true, message: `${from} 至 ${to} 没有时间记录。` };
  }
  const lines: string[] = [];
  if (active) {
    lines.push(`- 计时中：${active.description}（自 ${new Date(active.startTime).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} 起）[id: ${active.id}]`);
  }
  for (const e of shown) {
    const start = new Date(e.startTime);
    const durationMin = Math.round((e.duration ?? 0) / 60);
    lines.push(`- ${toLocalDateKey(start)} ${start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} ${e.description}（${durationMin} 分钟）[id: ${e.id}]`);
  }
  return { success: true, message: `时间记录（${shown.length} 条${active ? ' + 1 条进行中' : ''}）：\n${lines.slice(0, limit + 1).join('\n')}` };
}

function executeStartTimer(params: Record<string, unknown>): ActionResult {
  const store = useTimeTrackingStore.getState();
  if (store.activeEntry) {
    return { success: false, message: `已有计时器在运行：「${store.activeEntry.description}」。请先停止或暂停后再开始新的计时。` };
  }
  store.startTimer({
    description: String(params.description),
    taskId: typeof params.taskId === 'string' ? params.taskId : undefined,
    projectId: typeof params.projectId === 'string' ? params.projectId : undefined,
    billable: params.billable === true,
  });
  const active = useTimeTrackingStore.getState().activeEntry;
  return {
    success: true,
    message: `已开始计时「${String(params.description)}」`,
    refId: active?.id,
    undo: makeUndo('time', 'started', active?.id, { description: String(params.description) }, `撤销开始计时「${String(params.description)}」`),
  };
}

async function executeStopTimer(): Promise<ActionResult> {
  const store = useTimeTrackingStore.getState();
  const active = store.activeEntry;
  if (!active) {
    return { success: false, message: '当前没有运行中的计时器。' };
  }
  await store.stopTimer();
  const entry = useTimeTrackingStore.getState().entries.find((e) => e.id === active.id);
  return {
    success: true,
    message: `已停止计时「${active.description}」（${Math.round((entry?.duration ?? 0) / 60)} 分钟）`,
    refId: active.id,
    undo: makeUndo('time', 'stopped', active.id, { description: active.description }, `撤销停止计时「${active.description}」`),
  };
}

async function executeAddTimeEntry(params: Record<string, unknown>): Promise<ActionResult> {
  const description = String(params.description);
  const startTime = `${String(params.date)}T${String(params.startTime)}:00`;
  const endTime = `${String(params.date)}T${String(params.endTime)}:00`;
  const durationSec = Math.max(60, Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000));
  const before = useTimeTrackingStore.getState().entries.length;
  await useTimeTrackingStore.getState().addManualEntry({
    description,
    startTime,
    endTime,
    duration: durationSec,
    tags: Array.isArray(params.tags) ? (params.tags as string[]) : [],
    notes: typeof params.notes === 'string' ? params.notes : undefined,
    billable: params.billable === true,
    projectIds: [],
  });
  const after = useTimeTrackingStore.getState().entries;
  const refId = after.length > before ? after[after.length - 1].id : undefined;
  return {
    success: true,
    message: `已补录时间「${description}」（${String(params.date)} ${String(params.startTime)}-${String(params.endTime)}）`,
    refId,
    undo: makeUndo('time', 'stopped', refId, { description }, `撤销补录时间「${description}」`),
  };
}

function resolveTimeEntry(params: Record<string, unknown>): RefSuccess<TimeEntry> | RefFailure {
  const entries = useTimeTrackingStore.getState().entries ?? [];
  const entryId = typeof params.entryId === 'string' ? params.entryId.trim() : '';
  if (entryId) {
    const hit = entries.find((e) => e.id === entryId);
    return hit ? { ok: true, value: hit } : notFoundError('时间记录', entryId);
  }
  const query = typeof params.descriptionQuery === 'string' ? params.descriptionQuery.trim() : '';
  if (!query) return notFoundError('时间记录', '');
  const matches = entries.filter((e) => matchTitle(e.description, query));
  if (matches.length === 0) return notFoundError('时间记录', query);
  if (matches.length > 1) return ambiguityError('时间记录', matches.map((e) => ({ id: e.id, title: e.description })));
  return { ok: true, value: matches[0] };
}

async function executeDeleteTimeEntry(params: Record<string, unknown>): Promise<ActionResult> {
  const resolved = resolveTimeEntry(params);
  if (!resolved.ok) return resolved.result;
  const entry = resolved.value;
  await useTimeTrackingStore.getState().deleteEntry(entry.id);
  return { success: true, message: `已删除时间记录「${entry.description}」`, refId: entry.id };
}

function executeStartFocus(params: Record<string, unknown>): ActionResult {
  const focus = useFocusModeStore.getState();
  if (focus.isActive) {
    return { success: true, message: '已处于专注模式', refId: focus.linkedTaskId ?? undefined };
  }
  const taskId = typeof params.taskId === 'string' ? params.taskId : undefined;
  focus.startFocus(taskId);
  return {
    success: true,
    message: taskId ? '已进入专注模式（关联任务）' : '已进入专注模式',
    undo: makeUndo('focus', 'started', taskId, {}, '撤销开始专注'),
  };
}

function executeEndFocus(): ActionResult {
  const focus = useFocusModeStore.getState();
  if (!focus.isActive) {
    return { success: true, message: '当前未处于专注模式' };
  }
  focus.endFocus();
  return {
    success: true,
    message: '已退出专注模式',
    undo: makeUndo('focus', 'stopped', focus.linkedTaskId ?? undefined, {}, '撤销结束专注'),
  };
}

function planningDateKey(params: Record<string, unknown>): string {
  return typeof params.date === 'string' ? params.date : todayKey();
}

function executeAddGoal(params: Record<string, unknown>): ActionResult {
  const dateKey = planningDateKey(params);
  const store = useDailyPlanningStore.getState();
  const text = String(params.text);
  const before = store.getPlan(dateKey).goals.length;
  store.addGoal(dateKey, text);
  const after = store.getPlan(dateKey).goals;
  const goal = after.length > before ? after[after.length - 1] : null;
  return {
    success: true,
    message: `已为 ${dateKey} 添加目标「${text}」`,
    refId: goal?.id,
    undo: makeUndo('goal', 'created', goal?.id, { dateKey }, `撤销添加目标「${text}」`),
  };
}

function executeToggleGoal(params: Record<string, unknown>): ActionResult {
  const dateKey = planningDateKey(params);
  const store = useDailyPlanningStore.getState();
  const text = String(params.text);
  const plan = store.getPlan(dateKey);
  const goal = plan.goals.find((g) => g.text === text);
  if (!goal) {
    return { success: false, message: `${dateKey} 没有匹配的目标：「${text}」` };
  }
  store.toggleGoal(dateKey, goal.id);
  return {
    success: true,
    message: `已${goal.completed ? '取消完成' : '完成'}目标「${text}」`,
    refId: goal.id,
  };
}

function executeListRoutines(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const routines = useRoutineStore.getState().routines.filter(
    (r) => !query || matchTitle(`${r.name} ${r.description}`, query)
  );
  if (routines.length === 0) return { success: true, message: '当前没有例行程序。' };
  const lines = routines.map((r) => `- ${r.name}（${r.timeOfDay}，${r.habitIds.length} 个习惯，约 ${r.estimatedMinutes} 分钟）[id: ${r.id}]`);
  return { success: true, message: `例行程序（${routines.length} 个）：\n${lines.join('\n')}` };
}

function executeCreateRoutine(params: Record<string, unknown>): ActionResult {
  const id = useRoutineStore.getState().createRoutine({
    name: String(params.name),
    description: typeof params.description === 'string' ? params.description : '',
    icon: 'r',
    habitIds: Array.isArray(params.habitIds) ? (params.habitIds as string[]) : [],
    timeOfDay: (params.timeOfDay as 'morning' | 'afternoon' | 'evening' | 'anytime') ?? 'anytime',
    estimatedMinutes: typeof params.estimatedMinutes === 'number' ? params.estimatedMinutes : 30,
  });
  return {
    success: true,
    message: `已创建例行「${String(params.name)}」`,
    refId: id,
    undo: makeUndo('routine', 'created', id, {}, `撤销创建例行「${String(params.name)}」`),
  };
}

function resolveRoutine(params: Record<string, unknown>): RefSuccess<{ id: string; name: string }> | RefFailure {
  return resolveNamed('例行', useRoutineStore.getState().routines, params, 'routineId', 'nameQuery', (r) => r.name);
}

function executeDeleteRoutine(params: Record<string, unknown>): ActionResult {
  const resolved = resolveRoutine(params);
  if (!resolved.ok) return resolved.result;
  useRoutineStore.getState().deleteRoutine(resolved.value.id);
  return { success: true, message: `已删除例行「${resolved.value.name}」`, refId: resolved.value.id };
}

function executeListResources(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const skills = Array.isArray(params.skills) ? (params.skills as string[]) : [];
  const resources = useResourceStore.getState().resources.filter((r) => {
    const matchesQuery =
      !query ||
      matchTitle(`${r.name} ${r.email ?? ''} ${r.skills.join(' ')}`, query);
    const matchesSkills = skills.length === 0 || skills.every((s) => r.skills.includes(s));
    return matchesQuery && matchesSkills;
  });
  if (resources.length === 0) return { success: true, message: '当前没有符合条件的资源。' };
  const lines = resources.map((r) => `- ${r.name}（${r.capacity} 小时/周，技能：${r.skills.join('、') || '无'}）[id: ${r.id}]`);
  return { success: true, message: `资源（${resources.length} 个）：\n${lines.join('\n')}` };
}

function executeCreateResource(params: Record<string, unknown>): ActionResult {
  const before = useResourceStore.getState().resources.length;
  useResourceStore.getState().addResource({
    name: String(params.name),
    email: typeof params.email === 'string' ? params.email : undefined,
    capacity: typeof params.capacity === 'number' ? params.capacity : 40,
    skills: Array.isArray(params.skills) ? (params.skills as string[]) : [],
    assignedTasks: [],
  });
  const after = useResourceStore.getState().resources;
  const refId = after.length > before ? after[after.length - 1].id : undefined;
  return {
    success: true,
    message: `已创建资源「${String(params.name)}」`,
    refId,
    undo: makeUndo('resource', 'created', refId, {}, `撤销创建资源「${String(params.name)}」`),
  };
}

function resolveResource(params: Record<string, unknown>): RefSuccess<{ id: string; name: string }> | RefFailure {
  return resolveNamed('资源', useResourceStore.getState().resources, params, 'resourceId', 'nameQuery', (r) => r.name);
}

function executeUpdateResource(params: Record<string, unknown>): ActionResult {
  const resolved = resolveResource(params);
  if (!resolved.ok) return resolved.result;
  const resource = resolved.value;
  const updates = (params.updates ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  if (typeof updates.name === 'string') patch.name = updates.name;
  if (typeof updates.email === 'string') patch.email = updates.email;
  if (typeof updates.capacity === 'number') patch.capacity = updates.capacity;
  if (Array.isArray(updates.skills)) patch.skills = updates.skills as string[];
  useResourceStore.getState().updateResource(resource.id, patch);
  return {
    success: true,
    message: `已修改资源「${resource.name}」`,
    refId: resource.id,
    undo: makeUndo('resource', 'updated', resource.id, {
      name: resource.name,
      email: (resource as Record<string, unknown>).email,
      capacity: (resource as Record<string, unknown>).capacity,
      skills: (resource as Record<string, unknown>).skills,
    }, `撤销修改资源「${resource.name}」`),
  };
}

function executeListTemplates(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const templates = useTemplateStore.getState().templates.filter(
    (t) => !query || matchTitle(`${t.name} ${t.description} ${t.tags.join(' ')}`, query)
  );
  if (templates.length === 0) return { success: true, message: '当前没有任务模板。' };
  const lines = templates.map((t) => `- ${t.name}（标签：${t.tags.join('、') || '无'}）[id: ${t.id}]`);
  return { success: true, message: `任务模板（${templates.length} 个）：\n${lines.join('\n')}` };
}

function executeCreateTemplate(params: Record<string, unknown>): ActionResult {
  const template = useTemplateStore.getState().createTemplate({
    title: String(params.name),
    description: typeof params.description === 'string' ? params.description : '',
    tags: Array.isArray(params.tags) ? (params.tags as string[]) : [],
  });
  return {
    success: true,
    message: `已创建任务模板「${String(params.name)}」`,
    refId: template.id,
    undo: makeUndo('template', 'created', template.id, {}, `撤销创建任务模板「${String(params.name)}」`),
  };
}

// ────────────────────────────────────────────── dispatcher

/**
 * Execute one validated action against local stores. Never throws:
 * unexpected errors are converted into a failed ActionResult.
 */
function executeUpdateNote(params: Record<string, unknown>): ActionResult {
  const resolved = resolveNote(params);
  if (!resolved.ok) return resolved.result;
  const note = resolved.value;
  const updates = params.updates as Record<string, unknown>;
  const patch: NoteUpdate = {};
  if (typeof updates.title === 'string') patch.title = updates.title;
  if (typeof updates.content === 'string') {
    patch.content = markdownToLexical(updates.content);
    patch.contentText = updates.content;
  }
  if (Array.isArray(updates.tags)) patch.tags = updates.tags as string[];
  useNotesStore.getState().updateNote(note.id, patch);
  return {
    success: true,
    message: `已修改笔记「${note.title}」`,
    refId: note.id,
    undo: makeUndo(
      'note',
      'updated',
      note.id,
      { titleBefore: note.title, contentBefore: note.content, contentTextBefore: note.contentText, tagsBefore: note.tags },
      `撤销修改笔记「${note.title}」`
    ),
  };
}

function executeArchiveNote(params: Record<string, unknown>): ActionResult {
  const resolved = resolveNote(params);
  if (!resolved.ok) return resolved.result;
  useNotesStore.getState().archiveNotes([resolved.value.id]);
  return {
    success: true,
    message: `已归档笔记「${resolved.value.title}」`,
    refId: resolved.value.id,
    undo: makeUndo('note', 'archived', resolved.value.id, {}, `撤销归档笔记「${resolved.value.title}」`),
  };
}

function executeDeleteNote(params: Record<string, unknown>): ActionResult {
  const resolved = resolveNote(params);
  if (!resolved.ok) return resolved.result;
  useNotesStore.getState().deleteNote(resolved.value.id);
  return {
    success: true,
    message: `已删除笔记「${resolved.value.title}」`,
    refId: resolved.value.id,
    undo: makeUndo('note', 'deleted', resolved.value.id, {}, `撤销删除笔记「${resolved.value.title}」`),
  };
}

function executeRestoreNote(params: Record<string, unknown>): ActionResult {
  const noteId = typeof params.noteId === 'string' && params.noteId.trim() ? params.noteId : '';
  if (noteId) {
    useNotesStore.getState().restoreNote(noteId);
    return { success: true, message: `已恢复笔记`, refId: noteId };
  }
  const query = typeof params.titleQuery === 'string' ? params.titleQuery.trim() : '';
  if (!query) return notFoundError('笔记', '').result;
  // Search trash + archive + all notes by title.
  const all = useNotesStore.getState().getAllNotes();
  const matches = all.filter((n) => matchTitle(n.title, query));
  if (matches.length === 0) return notFoundError('笔记', query).result;
  if (matches.length > 1) return ambiguityError('笔记', matches).result;
  useNotesStore.getState().restoreNote(matches[0].id);
  return {
    success: true,
    message: `已恢复笔记「${matches[0].title}」`,
    refId: matches[0].id,
    undo: makeUndo('note', 'deleted', matches[0].id, {}, `撤销恢复笔记「${matches[0].title}」`),
  };
}

function executePinNote(params: Record<string, unknown>): ActionResult {
  const resolved = resolveNote(params);
  if (!resolved.ok) return resolved.result;
  const note = resolved.value;
  useNotesStore.getState().togglePin(note.id);
  return {
    success: true,
    message: `已${note.isPinned ? '取消置顶' : '置顶'}笔记「${note.title}」`,
    refId: note.id,
  };
}

function executeListProjects(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const includeArchived = params.includeArchived === true;
  const projects = useProjectContextStore.getState().projects.filter((project) =>
    (includeArchived || !project.archivedAt) &&
    (!query || matchTitle(`${project.name} ${project.description ?? ''}`, query))
  );
  if (projects.length === 0) return { success: true, message: '当前没有符合条件的项目。' };
  const lines = projects.slice(0, 30).map((project) => {
    const parent = project.parentId ? `，父项目 id: ${project.parentId}` : '';
    const archived = project.archivedAt ? '，已归档' : '';
    return `- ${project.name}${archived}${parent} [id: ${project.id}]`;
  });
  return { success: true, message: `项目（${projects.length} 个）：\n${lines.join('\n')}` };
}

function resolveProject(params: Record<string, unknown>): RefSuccess<ProjectContext> | RefFailure {
  return resolveNamed('项目', useProjectContextStore.getState().projects, params, 'projectId', 'nameQuery', (project) => project.name);
}

function executeCreateProject(params: Record<string, unknown>): ActionResult {
  const projects = useProjectContextStore.getState();
  const parentId = typeof params.parentId === 'string' ? params.parentId : null;
  if (parentId && !projects.projects.some((project) => project.id === parentId && !project.archivedAt)) {
    return notFoundError('父项目', parentId).result;
  }
  const id = projects.createProject({
    name: String(params.name),
    description: typeof params.description === 'string' ? params.description : undefined,
    parentId,
    color: typeof params.color === 'string' ? params.color : '',
    icon: typeof params.icon === 'string' ? params.icon : undefined,
  });
  return {
    success: true,
    message: `已创建项目「${String(params.name)}」`,
    refId: id,
    undo: makeUndo('project', 'created', id, {}, `撤销创建项目「${String(params.name)}」`),
  };
}

function executeUpdateProject(params: Record<string, unknown>): ActionResult {
  const resolved = resolveProject(params);
  if (!resolved.ok) return resolved.result;
  const project = resolved.value;
  const updates = params.updates as Record<string, unknown>;
  const patch: Partial<ProjectContext> = {};
  if (typeof updates.name === 'string') patch.name = updates.name;
  if (typeof updates.description === 'string') patch.description = updates.description;
  if (typeof updates.color === 'string') patch.color = updates.color;
  if (typeof updates.icon === 'string') patch.icon = updates.icon;
  const store = useProjectContextStore.getState();
  if (Object.keys(patch).length) store.updateProject(project.id, patch);
  if (updates.parentId !== undefined) {
    const parentId = typeof updates.parentId === 'string' ? updates.parentId : null;
    if (parentId && !store.projects.some((candidate) => candidate.id === parentId && !candidate.archivedAt)) {
      return notFoundError('父项目', parentId).result;
    }
    store.moveProject(project.id, parentId);
  }
  return {
    success: true,
    message: `已修改项目「${project.name}」`,
    refId: project.id,
    undo: makeUndo(
      'project',
      'updated',
      project.id,
      {
        nameBefore: project.name,
        descriptionBefore: project.description,
        colorBefore: project.color,
        iconBefore: project.icon,
        parentIdBefore: project.parentId ?? null,
      },
      `撤销修改项目「${project.name}」`
    ),
  };
}

function executeArchiveProject(params: Record<string, unknown>): ActionResult {
  const resolved = resolveProject(params);
  if (!resolved.ok) return resolved.result;
  useProjectContextStore.getState().archiveProject(resolved.value.id);
  return {
    success: true,
    message: `已归档项目「${resolved.value.name}」`,
    refId: resolved.value.id,
    undo: makeUndo('project', 'archived', resolved.value.id, {}, `撤销归档项目「${resolved.value.name}」`),
  };
}

function activeLinks(): Link[] {
  return Object.values(useLinkLibraryStore.getState().links).filter((link) => !link.deletedAt);
}

function resolveLink(params: Record<string, unknown>): RefSuccess<Link> | RefFailure {
  return resolveNamed('收藏', activeLinks(), params, 'linkId', 'titleQuery', (link) => link.title || link.url);
}

function executeListLinks(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const links = activeLinks().filter((link) =>
    !link.isArchived &&
    (params.favoriteOnly !== true || link.isFavorite) &&
    (!query || matchTitle(`${link.title} ${link.url} ${link.description ?? ''} ${link.tags.join(' ')}`, query))
  );
  const limit = typeof params.limit === 'number' ? params.limit : 15;
  if (links.length === 0) return { success: true, message: '当前没有符合条件的收藏。' };
  const lines = links.slice(0, limit).map((link) => `- ${link.title} — ${link.url}${link.isFavorite ? ' ★' : ''} [id: ${link.id}]`);
  return { success: true, message: `收藏（${links.length} 条）：\n${lines.join('\n')}` };
}

function executeCreateLink(params: Record<string, unknown>): ActionResult {
  const link = useLinkLibraryStore.getState().addLink({
    url: String(params.url),
    title: String(params.title),
    description: typeof params.description === 'string' ? params.description : undefined,
    tags: Array.isArray(params.tags) ? params.tags as string[] : [],
    projectIds: Array.isArray(params.projectIds) ? params.projectIds as string[] : [],
    isFavorite: params.favorite === true,
    isArchived: false,
    sortOrder: 0,
  });
  return {
    success: true,
    message: `已收藏链接「${link.title}」`,
    refId: link.id,
    undo: makeUndo('link', 'created', link.id, {}, `撤销收藏链接「${link.title}」`),
  };
}

function executeUpdateLink(params: Record<string, unknown>): ActionResult {
  const resolved = resolveLink(params);
  if (!resolved.ok) return resolved.result;
  const updates = params.updates as Record<string, unknown>;
  const patch: Partial<Link> = {};
  if (typeof updates.url === 'string') patch.url = updates.url;
  if (typeof updates.title === 'string') patch.title = updates.title;
  if (typeof updates.description === 'string') patch.description = updates.description;
  if (Array.isArray(updates.tags)) patch.tags = updates.tags as string[];
  if (Array.isArray(updates.projectIds)) patch.projectIds = updates.projectIds as string[];
  if (typeof updates.favorite === 'boolean') patch.isFavorite = updates.favorite;
  if (typeof updates.archived === 'boolean') patch.isArchived = updates.archived;
  useLinkLibraryStore.getState().updateLink(resolved.value.id, patch);
  return {
    success: true,
    message: `已修改收藏「${resolved.value.title}」`,
    refId: resolved.value.id,
    undo: makeUndo(
      'link',
      'updated',
      resolved.value.id,
      {
        title: resolved.value.title,
        url: resolved.value.url,
        description: resolved.value.description ?? '',
        tags: resolved.value.tags,
        isFavorite: resolved.value.isFavorite,
        isArchived: resolved.value.isArchived,
        projectIds: resolved.value.projectIds,
      },
      `撤销修改收藏「${resolved.value.title}」`
    ),
  };
}

function executeDeleteLink(params: Record<string, unknown>): ActionResult {
  const resolved = resolveLink(params);
  if (!resolved.ok) return resolved.result;
  useLinkLibraryStore.getState().deleteLink(resolved.value.id);
  return {
    success: true,
    message: `已将收藏「${resolved.value.title}」移入回收站`,
    refId: resolved.value.id,
    undo: makeUndo(
      'link',
      'deleted',
      resolved.value.id,
      {
        title: resolved.value.title,
        url: resolved.value.url,
        description: resolved.value.description ?? '',
        tags: resolved.value.tags,
        isFavorite: resolved.value.isFavorite,
        projectIds: resolved.value.projectIds,
      },
      `撤销删除收藏「${resolved.value.title}」`
    ),
  };
}

function resolveAutomation(params: Record<string, unknown>): RefSuccess<AutomationRule> | RefFailure {
  return resolveNamed('自动化', useAutomationStore.getState().rules, params, 'ruleId', 'nameQuery', (rule) => rule.name);
}

function executeListAutomations(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const rules = useAutomationStore.getState().rules.filter((rule) => !query || matchTitle(`${rule.name} ${rule.description ?? ''}`, query));
  if (rules.length === 0) return { success: true, message: '当前没有符合条件的自动化。' };
  const lines = rules.map((rule) => `- ${rule.name}（${rule.enabled ? '已启用' : '已停用'}，${rule.trigger.type} → ${rule.actions.map((action) => action.type).join(', ') || '无操作'}） [id: ${rule.id}]`);
  return { success: true, message: `自动化（${rules.length} 条）：\n${lines.join('\n')}` };
}

function executeCreateAutomation(params: Record<string, unknown>): ActionResult {
  const store = useAutomationStore.getState();
  const before = new Set(store.rules.map((rule) => rule.id));
  store.addRule({
    name: String(params.name),
    description: typeof params.description === 'string' ? params.description : undefined,
    trigger: { type: params.trigger as AutomationRule['trigger']['type'] },
    conditions: [],
    actions: [{
      type: params.action as AutomationRule['actions'][number]['type'],
      config: (params.actionConfig ?? {}) as AutomationRule['actions'][number]['config'],
    }],
  });
  const created = useAutomationStore.getState().rules.find((rule) => !before.has(rule.id));
  return {
    success: true,
    message: `已创建自动化「${String(params.name)}」`,
    refId: created?.id,
    undo: makeUndo('automation', 'created', created?.id, {}, `撤销创建自动化「${String(params.name)}」`),
  };
}

function executeToggleAutomation(params: Record<string, unknown>): ActionResult {
  const resolved = resolveAutomation(params);
  if (!resolved.ok) return resolved.result;
  const enabled = params.enabled === true;
  if (resolved.value.enabled !== enabled) useAutomationStore.getState().toggleRule(resolved.value.id);
  return {
    success: true,
    message: `已${enabled ? '启用' : '停用'}自动化「${resolved.value.name}」`,
    refId: resolved.value.id,
    undo: makeUndo(
      'automation',
      'toggled',
      resolved.value.id,
      { enabledBefore: resolved.value.enabled },
      `撤销${enabled ? '启用' : '停用'}自动化「${resolved.value.name}」`
    ),
  };
}

function executeDeleteAutomation(params: Record<string, unknown>): ActionResult {
  const resolved = resolveAutomation(params);
  if (!resolved.ok) return resolved.result;
  useAutomationStore.getState().deleteRule(resolved.value.id);
  return { success: true, message: `已删除自动化「${resolved.value.name}」`, refId: resolved.value.id };
}

function resolveHabit(params: Record<string, unknown>): RefSuccess<Habit> | RefFailure {
  return resolveNamed('习惯', useHabitStore.getState().habits, params, 'habitId', 'titleQuery', (habit) => habit.title);
}

function executeListHabits(params: Record<string, unknown>): ActionResult {
  const query = typeof params.query === 'string' ? params.query : '';
  const habits = useHabitStore.getState().habits.filter((habit) =>
    (params.includeArchived === true || !habit.archivedAt) &&
    (!query || matchTitle(`${habit.title} ${habit.description ?? ''}`, query))
  );
  if (habits.length === 0) return { success: true, message: '当前没有符合条件的习惯。' };
  const lines = habits.map((habit) => `- ${habit.title}（${habit.frequency}，连续 ${habit.currentStreak} 天，累计 ${habit.totalCompletions} 次${habit.archivedAt ? '，已归档' : ''}） [id: ${habit.id}]`);
  return { success: true, message: `习惯（${habits.length} 个）：\n${lines.join('\n')}` };
}

function executeCreateHabit(params: Record<string, unknown>): ActionResult {
  const id = useHabitStore.getState().addHabit({
    title: String(params.title),
    description: typeof params.description === 'string' ? params.description : undefined,
    icon: typeof params.icon === 'string' ? params.icon : undefined,
    color: typeof params.color === 'string' ? params.color : '#6366f1',
    category: (params.category as Habit['category']) ?? 'uncategorized',
    difficulty: (params.difficulty as Habit['difficulty']) ?? 'easy',
    frequency: (params.frequency as Habit['frequency']) ?? 'daily',
    targetDays: Array.isArray(params.targetDays) ? params.targetDays as number[] : undefined,
    timesPerWeek: typeof params.timesPerWeek === 'number' ? params.timesPerWeek : undefined,
    projectIds: Array.isArray(params.projectIds) ? params.projectIds as string[] : [],
    freezesPerWeek: 1,
  });
  return {
    success: true,
    message: `已创建习惯「${String(params.title)}」`,
    refId: id,
    undo: makeUndo('habit', 'created', id, {}, `撤销创建习惯「${String(params.title)}」`),
  };
}

function executeCompleteHabit(params: Record<string, unknown>): ActionResult {
  const resolved = resolveHabit(params);
  if (!resolved.ok) return resolved.result;
  const isoDate = typeof params.date === 'string' ? params.date : todayKey();
  const date = habitDateKey(isoDate);
  const store = useHabitStore.getState();
  if (store.isCompletedOnDate(resolved.value.id, date)) {
    return { success: true, message: `习惯「${resolved.value.title}」在 ${isoDate} 已打卡`, refId: resolved.value.id };
  }
  store.toggleCompletion(resolved.value.id, date, typeof params.note === 'string' ? params.note : undefined);
  return {
    success: true,
    message: `已为习惯「${resolved.value.title}」完成 ${isoDate} 打卡`,
    refId: resolved.value.id,
    undo: makeUndo('habit', 'checked', resolved.value.id, { date }, `撤销习惯「${resolved.value.title}」的 ${isoDate} 打卡`),
  };
}

function executeArchiveHabit(params: Record<string, unknown>): ActionResult {
  const resolved = resolveHabit(params);
  if (!resolved.ok) return resolved.result;
  useHabitStore.getState().archiveHabit(resolved.value.id);
  return {
    success: true,
    message: `已归档习惯「${resolved.value.title}」`,
    refId: resolved.value.id,
    undo: makeUndo('habit', 'archived', resolved.value.id, {}, `撤销归档习惯「${resolved.value.title}」`),
  };
}

function executeListEnergy(params: Record<string, unknown>): ActionResult {
  const logs = useEnergyStore.getState().logs;
  const date = typeof params.date === 'string' ? params.date : null;
  const days = typeof params.days === 'number' ? params.days : 7;
  const from = date ?? shiftDayKey(todayKey(), -(days - 1));
  const to = date ?? todayKey();
  const matched = logs.filter((log) => log.date >= from && log.date <= to).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  if (matched.length === 0) return { success: true, message: `${from}${from === to ? '' : ` 至 ${to}`} 没有能量记录。` };
  const labels = { morning: '早晨', afternoon: '下午', evening: '晚间' } as const;
  const lines = matched.map((log) => `- ${log.date} ${labels[log.timeOfDay]} ${log.level}/10${log.note ? `：${log.note}` : ''} [id: ${log.id}]`);
  return { success: true, message: `能量记录（${matched.length} 条）：\n${lines.join('\n')}` };
}

function executeLogEnergy(params: Record<string, unknown>): ActionResult {
  const before = useEnergyStore.getState().logs.length;
  useEnergyStore.getState().logEnergy(
    Number(params.level),
    params.timeOfDay as 'morning' | 'afternoon' | 'evening',
    typeof params.note === 'string' ? params.note : undefined
  );
  const after = useEnergyStore.getState().logs;
  const refId = after.length > before ? after[after.length - 1].id : undefined;
  return {
    success: true,
    message: `已记录${String(params.timeOfDay)}能量 ${String(params.level)}/10`,
    refId,
    undo: makeUndo('energy', 'logged', refId, {}, `撤销能量记录 ${String(params.level)}/10`),
  };
}

/**
 * Execute one validated action against local stores. Never throws:
 * unexpected errors are converted into a failed ActionResult.
 * Some operations (time tracking) persist to IndexedDB, so this is async.
 */
export async function executeAgentAction(
  tool: AgentToolId,
  params: Record<string, unknown>
): Promise<ActionResult> {
  try {
    switch (tool) {
      case 'list_tasks':
        return executeListTasks(params);
      case 'create_task':
        return executeCreateTask(params);
      case 'update_task':
        return executeUpdateTask(params);
      case 'complete_task':
        return executeCompleteTask(params);
      case 'delete_task':
        return executeDeleteTask(params);
      case 'archive_task':
        return executeArchiveTask(params);
      case 'restore_task':
        return executeRestoreTask(params);
      case 'add_checklist_item':
        return executeAddChecklistItem(params);
      case 'toggle_checklist_item':
        return executeToggleChecklistItem(params);
      case 'delete_checklist_item':
        return executeDeleteChecklistItem(params);
      case 'add_comment':
        return executeAddComment(params);
      case 'add_subtask':
        return executeAddSubtask(params);
      case 'toggle_subtask':
        return executeToggleSubtask(params);
      case 'list_events':
        return executeListEvents(params);
      case 'create_event':
        return executeCreateEvent(params);
      case 'update_event':
        return executeUpdateEvent(params);
      case 'delete_event':
        return executeDeleteEvent(params);
      case 'create_note':
        return executeCreateNote(params);
      case 'append_note':
        return executeAppendNote(params);
      case 'update_note':
        return executeUpdateNote(params);
      case 'archive_note':
        return executeArchiveNote(params);
      case 'delete_note':
        return executeDeleteNote(params);
      case 'restore_note':
        return executeRestoreNote(params);
      case 'pin_note':
        return executePinNote(params);
      case 'list_notes':
        return executeListNotes(params);
      case 'list_projects':
        return executeListProjects(params);
      case 'create_project':
        return executeCreateProject(params);
      case 'update_project':
        return executeUpdateProject(params);
      case 'archive_project':
        return executeArchiveProject(params);
      case 'list_links':
        return executeListLinks(params);
      case 'create_link':
        return executeCreateLink(params);
      case 'update_link':
        return executeUpdateLink(params);
      case 'delete_link':
        return executeDeleteLink(params);
      case 'list_automations':
        return executeListAutomations(params);
      case 'create_automation':
        return executeCreateAutomation(params);
      case 'toggle_automation':
        return executeToggleAutomation(params);
      case 'delete_automation':
        return executeDeleteAutomation(params);
      case 'list_habits':
        return executeListHabits(params);
      case 'create_habit':
        return executeCreateHabit(params);
      case 'complete_habit':
        return executeCompleteHabit(params);
      case 'archive_habit':
        return executeArchiveHabit(params);
      case 'list_energy':
        return executeListEnergy(params);
      case 'log_energy':
        return executeLogEnergy(params);
      case 'list_time_entries':
        return executeListTimeEntries(params);
      case 'start_timer':
        return executeStartTimer(params);
      case 'stop_timer':
        return executeStopTimer();
      case 'add_time_entry':
        return executeAddTimeEntry(params);
      case 'delete_time_entry':
        return executeDeleteTimeEntry(params);
      case 'start_focus':
        return executeStartFocus(params);
      case 'end_focus':
        return executeEndFocus();
      case 'add_goal':
        return executeAddGoal(params);
      case 'toggle_goal':
        return executeToggleGoal(params);
      case 'list_routines':
        return executeListRoutines(params);
      case 'create_routine':
        return executeCreateRoutine(params);
      case 'delete_routine':
        return executeDeleteRoutine(params);
      case 'list_resources':
        return executeListResources(params);
      case 'create_resource':
        return executeCreateResource(params);
      case 'update_resource':
        return executeUpdateResource(params);
      case 'list_templates':
        return executeListTemplates(params);
      case 'create_template':
        return executeCreateTemplate(params);
      default:
        return { success: false, message: `未知工具：${tool}` };
    }
  } catch (error) {
    log.error('Action execution failed', { tool, error });
    return {
      success: false,
      message: `执行失败：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
