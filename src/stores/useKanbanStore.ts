import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  KanbanState,
  Task,
  TaskStatus,
  TaskPriority,
  KanbanColumn,
  KanbanSection,
  ChecklistItem,
  // TaskComment now managed by useKanbanCommentsStore
  ActivityLogEntry,
  UndoHistoryEntry,
  Subtask,
  TaskDependency,
  CardTemplate,
  ProjectBaseline,
  TaskAttachment
} from '../types';
import { createSyncedStorage } from '../lib/syncedStorage';
import { logger } from '../services/logger';
import { generateNextInstance, shouldGenerateNextInstance, getTaskInstances, updateNextOccurrence } from '../services/taskRecurrence';
import { evaluateRules } from '../services/automationEngine';
import type { AutomationContext } from '../types/automation';
import { migrateDependenciesToTaskLevel, needsMigration } from '../services/dependencyMigration';
// criticalPath and baseline utilities now used via useKanbanDependenciesStore
import { useProjectContextStore, matchesProjectFilter } from './useProjectContextStore';
import { toast } from './useToastStore';
import { useActivityStore } from './useActivityStore';
import { useKanbanArchiveStore } from './useKanbanArchiveStore';
import { useKanbanDependenciesStore } from './useKanbanDependenciesStore';
import { useKanbanCommentsStore } from './useKanbanCommentsStore';
import { useKanbanChecklistStore } from './useKanbanChecklistStore';

const log = logger.module('KanbanStore');

// Default columns (replaces hardcoded columns)
const DEFAULT_COLUMNS: KanbanColumn[] = [
  { id: 'backlog', title: '待处理', color: 'bg-text-light-secondary', order: 0 },
  { id: 'todo', title: '待办', color: 'bg-accent-blue', order: 1 },
  { id: 'inprogress', title: '进行中', color: 'bg-accent-yellow', order: 2 },
  { id: 'review', title: '评审中', color: 'bg-accent-purple', order: 3 },
  { id: 'done', title: '已完成', color: 'bg-accent-green', order: 4 },
];

// Default card templates for quick task creation
const DEFAULT_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'bug-report',
    name: '缺陷报告',
    icon: '🐛',
    description: '**复现步骤：**\n1. \n\n**预期行为：**\n\n**实际行为：**\n\n**环境：**\n- 浏览器：\n- 操作系统：',
    defaultPriority: 'high',
    defaultTags: ['bug'],
    defaultColumn: 'todo',
    isBuiltIn: true,
  },
  {
    id: 'feature-request',
    name: '功能请求',
    icon: '✨',
    description: '**要解决的问题：**\n\n**建议方案：**\n\n**验收标准：**\n- [ ] \n- [ ] ',
    defaultPriority: 'medium',
    defaultTags: ['feature'],
    defaultColumn: 'backlog',
    isBuiltIn: true,
  },
  {
    id: 'task',
    name: '任务',
    icon: '📋',
    description: '**目标：**\n\n**交付物：**\n- [ ] ',
    defaultPriority: 'medium',
    defaultTags: [],
    defaultColumn: 'todo',
    isBuiltIn: true,
  },
  {
    id: 'meeting-notes',
    name: '会议记录',
    icon: '📝',
    description: '**日期：** \n**参会人：** \n\n**议程：**\n1. \n\n**行动项：**\n- [ ] \n\n**备注：**',
    defaultPriority: 'low',
    defaultTags: ['meeting'],
    defaultColumn: 'backlog',
    isBuiltIn: true,
  },
  {
    id: 'research',
    name: '研究',
    icon: '🔬',
    description: '**研究问题：**\n\n**关键发现：**\n\n**来源：**\n- \n\n**结论：**',
    defaultPriority: 'medium',
    defaultTags: ['research'],
    defaultColumn: 'backlog',
    isBuiltIn: true,
  },
];

interface KanbanStore extends KanbanState {
  // Existing task actions
  addTask: (task: Omit<Task, 'id' | 'created'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  /** Direct task field update without auto-logging (for cross-store use) */
  _updateTaskFieldsDirect: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, newStatus: TaskStatus) => void;
  getTasksByStatus: (status: TaskStatus) => Task[];
  getFilteredTasks: () => Task[];

  // Recurring tasks
  setTaskRecurrence: (taskId: string, recurrence: Task['recurrence']) => void;
  generateNextRecurringInstance: (parentTaskId: string, lastCompletedInstance?: Task) => void;
  getRecurringTaskInstances: (parentTaskId: string) => Task[];

  // Column management
  addColumn: (column: Omit<KanbanColumn, 'id' | 'order'>) => void;
  updateColumn: (id: string, updates: Partial<KanbanColumn>) => void;
  deleteColumn: (id: string) => void;
  reorderColumns: (columnIds: string[]) => void;
  replaceAllColumns: (newColumns: Omit<KanbanColumn, 'id' | 'order'>[]) => void;

  // Checklist management
  addChecklistItem: (taskId: string, text: string) => void;
  updateChecklistItem: (taskId: string, itemId: string, updates: Partial<ChecklistItem>) => void;
  deleteChecklistItem: (taskId: string, itemId: string) => void;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  reorderChecklistItems: (taskId: string, itemIds: string[]) => void;

  // Comment management
  addComment: (taskId: string, text: string) => void;
  updateComment: (taskId: string, commentId: string, text: string) => void;
  deleteComment: (taskId: string, commentId: string) => void;

  // Activity log (auto-tracked)
  logActivity: (taskId: string, entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;

  // Bulk actions
  bulkUpdateStatus: (taskIds: string[], newStatus: TaskStatus) => void;
  bulkUpdatePriority: (taskIds: string[], newPriority: TaskPriority) => void;
  bulkDeleteTasks: (taskIds: string[]) => void;

  // Subtask management
  addSubtask: (taskId: string, subtaskData: Omit<Subtask, 'id' | 'parentTaskId' | 'createdAt' | 'order'>) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtask: (taskId: string, subtaskId: string) => void;
  reorderSubtasks: (taskId: string, subtaskIds: string[]) => void;

  // File attachment management
  addAttachment: (taskId: string, attachment: Omit<TaskAttachment, 'id' | 'taskId' | 'uploadedAt'>) => void;
  deleteAttachment: (taskId: string, attachmentId: string) => void;

  // Dependency management (Professional types: FS/SS/FF/SF with lag)
  addDependency: (taskId: string, dependency: TaskDependency) => void;
  removeDependency: (taskId: string, dependencyId: string) => void;
  getBlockers: (taskId: string) => Task[];
  getBlocked: (taskId: string) => Task[];
  getOverdueBlockers: (taskId: string) => Task[]; // Dependency Warnings

  // Auto-shift dependent tasks
  applyDependentShifts: (shifts: Array<{taskId: string; newStartDate: string | null; newDueDate: string | null; reason: string}>) => void;

  // Critical path analysis
  getCriticalPath: () => string[];
  getTaskSlack: (taskId: string) => number;

  // Baseline comparison
  setBaseline: () => void;
  clearBaseline: () => void;
  getBaseline: () => ProjectBaseline | null;

  // Archive management
  archiveTask: (id: string) => void;
  notify: (title: string, body: string) => void;
  restoreTask: (id: string) => void;
  deleteArchivedTask: (id: string) => void;
  getArchivedTasks: () => Task[];
  autoArchiveCompletedTasks: () => void;

  // Time tracking
  startTimer: (taskId: string) => void;
  stopTimer: (taskId: string) => void;
  updateTimeEstimate: (taskId: string, hours: number) => void;

  // Custom fields
  updateEffort: (taskId: string, effort: import('../types').EffortEstimate | undefined) => void;
  updateCustomStatus: (taskId: string, customStatus: import('../types').CustomStatus | undefined) => void;

  // Bulk import
  bulkImportTasks: (importedTasks: Array<{
    title: string;
    description?: string;
    dueDate?: string;
    priority?: TaskPriority;
    tags?: string[];
    status?: TaskStatus;
    completed?: boolean;
    estimatedHours?: number;
    progress?: number;
    checklist?: Array<{ text: string; completed: boolean }>;
  }>) => import('../types/import').ImportResult;

  // UI Preferences
  setVisibleColumns: (count: number) => void;

  // Undo system
  undoHistory: UndoHistoryEntry[];
  addToUndoHistory: (entry: Omit<UndoHistoryEntry, 'id' | 'timestamp'>) => void;
  undo: () => void;
  clearUndoHistory: () => void;

  // Card templates
  getCardTemplates: () => CardTemplate[];

  // Section management
  addSection: (columnId: string, title: string) => void;
  deleteSection: (id: string) => void;
  renameSection: (id: string, title: string) => void;
  toggleSectionCollapse: (id: string) => void;
}

export const useKanbanStore = create<KanbanStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tasks: [],
      columns: DEFAULT_COLUMNS,
      sections: [], // Kanban sections
      dependencies: [], // Task dependencies
      // archivedTasks moved to useKanbanArchiveStore
      nextCardNumber: 1, // Auto-incrementing card number counter
      visibleColumns: 5, // UI: Number of columns visible before scrolling (default: 5)
      undoHistory: [], // Undo system: stores last 5 actions
      baseline: null, // Project baseline snapshot

      // ==================== TASK ACTIONS ====================

      addTask: (taskData) => {
        const currentNumber = get().nextCardNumber || 1;

        const newTask: Task = {
          ...taskData,
          id: Date.now().toString(),
          created: new Date().toISOString(),
          cardNumber: currentNumber, // Assign auto-incrementing card number
          checklist: [],
          comments: [],
          activityLog: [],
        };

        set((state) => ({
          tasks: [...state.tasks, newTask],
          nextCardNumber: currentNumber + 1, // Increment counter
        }));

        // Log creation
        get().logActivity(newTask.id, {
          action: 'created',
        });
        useActivityStore.getState().logActivity({
          type: 'created',
          module: 'tasks',
          entityId: newTask.id,
          entityTitle: newTask.title,
        });

        // Trigger automation rules for 'task.created'
        setTimeout(async () => {
          const { useAutomationStore } = await import('./useAutomationStore');
          const automationStore = useAutomationStore.getState();
          const context: AutomationContext = {
            taskId: newTask.id,
            timestamp: new Date().toISOString(),
          };

          const logs = await evaluateRules(
            automationStore.rules,
            'task.created',
            newTask,
            context,
            get()
          );
          logs.forEach((log) => automationStore.addExecutionLog(log));
        }, 0);
      },

      updateTask: (id, updates) => {
        const oldTask = get().tasks.find((t) => t.id === id);
        if (!oldTask) return;

        // Tasks can be completed from the detail panel and integrations, not
        // only by dragging a card. Keep the completion timestamp consistent
        // for reviews and auto-archive regardless of the entry point.
        const completionUpdates: Partial<Task> = updates.status === 'done' && oldTask.status !== 'done'
          ? { lastCompletedAt: new Date().toISOString() }
          : updates.status !== undefined && updates.status !== 'done' && oldTask.status === 'done'
            ? { lastCompletedAt: undefined }
            : {};

        // Check if date changes trigger dependent shifts
        // Note: This only updates the primary task. Components must call
        // calculateDependentShifts separately and show confirmation dialog
        // before calling applyDependentShifts.

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, ...completionUpdates } : task
          ),
        }));

        // Log updates (track specific fields)
        Object.keys(updates).forEach((field) => {
          if (field !== 'activityLog') { // Don't log the log itself
            get().logActivity(id, {
              action: 'updated',
              field,
              oldValue: String(oldTask[field as keyof Task] ?? ''),
              newValue: String(updates[field as keyof Task] ?? ''),
            });
          }
        });
        useActivityStore.getState().logActivity({
          type: 'updated',
          module: 'tasks',
          entityId: id,
          entityTitle: oldTask.title,
        });
      },

      /**
       * Direct task field update without auto-logging
       * Used by useKanbanCommentsStore to avoid double-logging when updating comments/activity
       */
      _updateTaskFieldsDirect: (id, updates) => {
        const oldTask = get().tasks.find((t) => t.id === id);
        if (!oldTask) return;
        const completionUpdates: Partial<Task> = updates.status === 'done' && oldTask.status !== 'done'
          ? { lastCompletedAt: new Date().toISOString() }
          : updates.status !== undefined && updates.status !== 'done' && oldTask.status === 'done'
            ? { lastCompletedAt: undefined }
            : {};
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates, ...completionUpdates } : task
          ),
        }));
      },

      // User-facing deletion follows the recoverable lifecycle. Permanent
      // removal is available only from ArchivedView after a second decision.
      deleteTask: (id) => {
        get().archiveTask(id);
      },

      moveTask: (id, newStatus) => {
        const oldTask = get().tasks.find((t) => t.id === id);
        if (!oldTask) return;

        // Validate dependencies before moving to "done"
        if (newStatus === 'done') {
          const blockers = get().getBlockers(id);
          const incompleteBlockers = blockers.filter((b) => b.status !== 'done');

          if (incompleteBlockers.length > 0) {
            log.warn('Cannot complete task: blocked by incomplete tasks', {
              taskId: id,
              taskTitle: oldTask.title,
              blockerCount: incompleteBlockers.length
            });
            const blockerNames = incompleteBlockers.map(b => b.title).slice(0, 2).join('、');
            const suffix = incompleteBlockers.length > 2 ? ` 等 ${incompleteBlockers.length - 2} 个` : '';
            toast.warning(
              `无法完成“${oldTask.title}”`,
              `被以下任务阻塞：${blockerNames}${suffix}`
            );
            return; // Prevent move
          }
        }

        // Track when task is completed (for auto-archive)
        const updates: Partial<Task> = { status: newStatus };
        if (newStatus === 'done' && oldTask.status !== 'done') {
          updates.lastCompletedAt = new Date().toISOString();
        }

        // AUTO-GENERATE NEXT RECURRING INSTANCE
        // If completing a recurring task instance, generate next occurrence
        const isCompletingRecurringInstance = newStatus === 'done' && oldTask.recurrenceId;

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id ? { ...task, ...updates } : task
          ),
        }));

        // Generate next instance after state update (avoid mutation during update)
        if (isCompletingRecurringInstance) {
          setTimeout(() => {
            // Pass the completed task instance for recurFromCompletion calculation
            const completedTask = get().tasks.find((t) => t.id === id);
            get().generateNextRecurringInstance(oldTask.recurrenceId!, completedTask);
          }, 0);
        }

        // Log move
        get().logActivity(id, {
          action: 'moved',
          field: 'status',
          oldValue: oldTask.status,
          newValue: newStatus,
        });
        if (newStatus === 'done') {
          useActivityStore.getState().logActivity({
            type: 'completed',
            module: 'tasks',
            entityId: id,
            entityTitle: oldTask.title,
          });
        }

        // Trigger automation rules for 'task.moved' and potentially 'task.completed'
        setTimeout(async () => {
          const { useAutomationStore } = await import('./useAutomationStore');
          const automationStore = useAutomationStore.getState();
          const updatedTask = get().tasks.find((t) => t.id === id);
          if (!updatedTask) return;

          const context: AutomationContext = {
            taskId: id,
            previousStatus: oldTask.status,
            newStatus,
            timestamp: new Date().toISOString(),
          };

          // Trigger 'task.moved' for all status changes
          const movedLogs = await evaluateRules(
            automationStore.rules,
            'task.moved',
            updatedTask,
            context,
            get()
          );
          movedLogs.forEach((log) => automationStore.addExecutionLog(log));

          // Also trigger 'task.completed' if moved to done
          if (newStatus === 'done') {
            const completedLogs = await evaluateRules(
              automationStore.rules,
              'task.completed',
              updatedTask,
              context,
              get()
            );
            completedLogs.forEach((log) => automationStore.addExecutionLog(log));
          }
        }, 0);
      },

      getTasksByStatus: (status) => {
        return get().tasks.filter((task) => task.status === status);
      },

      getFilteredTasks: () => {
        const { activeProjectIds } = useProjectContextStore.getState();
        const tasks = get().tasks;

        // Use centralized project filter utility
        return tasks.filter((task) =>
          matchesProjectFilter(task.projectIds, activeProjectIds)
        );
      },

      // ==================== RECURRING TASK ACTIONS () ====================

      setTaskRecurrence: (taskId, recurrence) => {
        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) {
          log.warn('Task not found for recurrence', { taskId });
          return;
        }

        // Mark as recurring parent and calculate next occurrence
        const updates: Partial<Task> = {
          recurrence,
          isRecurringParent: recurrence ? true : undefined,
          nextOccurrence: recurrence ? updateNextOccurrence({ ...task, recurrence }) : undefined,
        };

        get().updateTask(taskId, updates);

        log.info('Task recurrence set', { taskId, frequency: recurrence?.frequency });
      },

      generateNextRecurringInstance: (parentTaskId, lastCompletedInstance) => {
        const parentTask = get().tasks.find((t) => t.id === parentTaskId);
        if (!parentTask || !parentTask.isRecurringParent) {
          log.warn('Not a recurring parent task', { parentTaskId });
          return;
        }

        // Check if we should generate next instance
        if (!shouldGenerateNextInstance(parentTask, get().tasks)) {
          log.debug('Next instance not needed yet', { parentTaskId });
          return;
        }

        // Generate new instance (pass completed instance for recurFromCompletion)
        const instance = generateNextInstance(parentTask, lastCompletedInstance);
        if (!instance) {
          log.debug('No more instances to generate (series ended)', { parentTaskId });
          return;
        }

        // Add instance to tasks
        set((state) => ({
          tasks: [...state.tasks, instance],
        }));

        // Update parent's nextOccurrence
        const nextOccurrence = updateNextOccurrence(parentTask);
        get().updateTask(parentTaskId, { nextOccurrence });

        log.info('Generated recurring task instance', {
          parentId: parentTaskId,
          instanceId: instance.id,
          dueDate: instance.dueDate,
        });
      },

      getRecurringTaskInstances: (parentTaskId) => {
        return getTaskInstances(
          get().tasks.find((t) => t.id === parentTaskId)!,
          get().tasks
        );
      },

      // ==================== COLUMN ACTIONS ====================

      addColumn: (columnData) => {
        const columns = get().columns;
        const newColumn: KanbanColumn = {
          ...columnData,
          id: `col-${Date.now()}`,
          order: columns.length,
        };

        set((state) => ({
          columns: [...state.columns, newColumn],
        }));
      },

      updateColumn: (id, updates) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, ...updates } : col
          ),
        }));
      },

      deleteColumn: (id) => {
        const state = get();
        const columnToDelete = state.columns.find(col => col.id === id);

        if (!columnToDelete) {
          log.warn('Column not found for deletion', { columnId: id });
          return;
        }

        // Save undo entry BEFORE making changes
        get().addToUndoHistory({
          action: 'deleteColumn',
          description: `已删除列“${columnToDelete.title}”`,
          previousState: {
            columns: state.columns,
            tasks: state.tasks,
          },
        });

        // Find first remaining column (fallback, not hardcoded 'backlog')
        const firstRemainingColumn = state.columns.find(col => col.id !== id);

        if (!firstRemainingColumn) {
          log.error('Cannot delete last column');
          return;
        }

        // Move all tasks from deleted column to first remaining column
        set((state) => ({
          columns: state.columns.filter((col) => col.id !== id),
          tasks: state.tasks.map((task) =>
            task.status === id as TaskStatus
              ? { ...task, status: firstRemainingColumn.id as TaskStatus }
              : task
          ),
        }));
      },

      reorderColumns: (columnIds) => {
        const columns = get().columns;
        const reordered = columnIds
          .map((id) => columns.find((col) => col.id === id))
          .filter((col): col is KanbanColumn => col !== undefined)
          .map((col, index) => ({ ...col, order: index }));

        set({ columns: reordered });
      },

      replaceAllColumns: (newColumns: Omit<KanbanColumn, 'id' | 'order'>[]) => {
        const state = get();

        // Save undo entry BEFORE making changes
        get().addToUndoHistory({
          action: 'replaceAllColumns',
          description: `已应用模板`,
          previousState: {
            columns: state.columns,
            tasks: state.tasks,
          },
        });

        // Generate new columns with fresh IDs and correct order
        const columns: KanbanColumn[] = newColumns.map((col, index) => ({
          ...col,
          id: `col-${Date.now()}-${index}`,
          order: index,
        }));

        if (columns.length === 0) {
          log.error('No columns provided for replacement');
          return;
        }

        // Smart mapping: Try to preserve task positions based on column titles
        const tasks = state.tasks.map(task => {
          const oldColumn = state.columns.find(c => c.id === task.status);
          if (!oldColumn) {
            // Task has invalid status, move to first column
            return { ...task, status: columns[0].id as TaskStatus };
          }

          // Try exact match first (case-insensitive)
          let newColumn = columns.find(c =>
            c.title.toLowerCase() === oldColumn.title.toLowerCase()
          );

          // If no exact match, try partial match (contains)
          if (!newColumn) {
            newColumn = columns.find(c =>
              c.title.toLowerCase().includes(oldColumn.title.toLowerCase()) ||
              oldColumn.title.toLowerCase().includes(c.title.toLowerCase())
            );
          }

          // Fallback: first column
          if (!newColumn) {
            newColumn = columns[0];
          }

          return { ...task, status: newColumn.id as TaskStatus };
        });

        set({ columns, tasks });
      },

      // ==================== CHECKLIST ACTIONS ====================
      // Delegated to useKanbanChecklistStore

      addChecklistItem: (taskId, text) => {
        const checklistStore = useKanbanChecklistStore.getState();
        checklistStore.addChecklistItem(taskId, text, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
          logActivity: get().logActivity,
        }));
      },

      updateChecklistItem: (taskId, itemId, updates) => {
        const checklistStore = useKanbanChecklistStore.getState();
        checklistStore.updateChecklistItem(taskId, itemId, updates, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      deleteChecklistItem: (taskId, itemId) => {
        const checklistStore = useKanbanChecklistStore.getState();
        checklistStore.deleteChecklistItem(taskId, itemId, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
          logActivity: get().logActivity,
        }));
      },

      toggleChecklistItem: (taskId, itemId) => {
        const checklistStore = useKanbanChecklistStore.getState();
        checklistStore.toggleChecklistItem(taskId, itemId, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
          logActivity: get().logActivity,
        }));
      },

      reorderChecklistItems: (taskId, itemIds) => {
        const checklistStore = useKanbanChecklistStore.getState();
        checklistStore.reorderChecklistItems(taskId, itemIds, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      // ==================== COMMENT ACTIONS ====================
      // Delegated to useKanbanCommentsStore

      addComment: (taskId, text) => {
        const commentsStore = useKanbanCommentsStore.getState();
        commentsStore.addComment(taskId, text, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      updateComment: (taskId, commentId, text) => {
        const commentsStore = useKanbanCommentsStore.getState();
        commentsStore.updateComment(taskId, commentId, text, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      deleteComment: (taskId, commentId) => {
        const commentsStore = useKanbanCommentsStore.getState();
        commentsStore.deleteComment(taskId, commentId, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      // ==================== ACTIVITY LOG ====================
      // Delegated to useKanbanCommentsStore

      logActivity: (taskId, entry) => {
        const commentsStore = useKanbanCommentsStore.getState();
        commentsStore.logActivity(taskId, entry, () => ({
          tasks: get().tasks,
          _updateTaskFieldsDirect: get()._updateTaskFieldsDirect,
        }));
      },

      // ==================== UNDO SYSTEM ====================

      addToUndoHistory: (entry) => {
        const newEntry: UndoHistoryEntry = {
          ...entry,
          id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };

        set((state) => ({
          undoHistory: [
            ...state.undoHistory,
            newEntry,
          ].slice(-5), // Keep last 5 entries max (prevent memory bloat)
        }));
      },

      undo: () => {
        const history = get().undoHistory;
        if (history.length === 0) {
          log.warn('No undo history available');
          return;
        }

        // Get most recent entry
        const lastEntry = history[history.length - 1];

        // Restore previous state
        set({
          columns: lastEntry.previousState.columns,
          tasks: lastEntry.previousState.tasks,
          undoHistory: history.slice(0, -1), // Remove this entry from history
        });
      },

      clearUndoHistory: () => {
        set({ undoHistory: [] });
      },

      // ==================== BULK ACTIONS ====================

      bulkUpdateStatus: (taskIds, newStatus) => {
        const state = get();

        // Save undo state
        get().addToUndoHistory({
          action: 'bulkDelete',
          description: `已更改 ${taskIds.length} 个任务的状态`,
          previousState: {
            columns: state.columns,
            tasks: state.tasks,
          },
        });

        set((state) => ({
          tasks: state.tasks.map((task) =>
            taskIds.includes(task.id)
              ? { ...task, status: newStatus }
              : task
          ),
        }));

        // Log activity for each task
        taskIds.forEach(taskId => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            get().logActivity(taskId, {
              action: 'updated',
              field: 'status',
              oldValue: task.status,
              newValue: newStatus,
            });
          }
        });
      },

      bulkUpdatePriority: (taskIds, newPriority) => {
        const state = get();

        // Save undo state
        get().addToUndoHistory({
          action: 'bulkDelete',
          description: `已更改 ${taskIds.length} 个任务的优先级`,
          previousState: {
            columns: state.columns,
            tasks: state.tasks,
          },
        });

        set((state) => ({
          tasks: state.tasks.map((task) =>
            taskIds.includes(task.id)
              ? { ...task, priority: newPriority }
              : task
          ),
        }));

        // Log activity for each task
        taskIds.forEach(taskId => {
          const task = state.tasks.find(t => t.id === taskId);
          if (task) {
            get().logActivity(taskId, {
              action: 'updated',
              field: 'priority',
              oldValue: task.priority,
              newValue: newPriority,
            });
          }
        });
      },

      bulkDeleteTasks: (taskIds) => {
        const state = get();

        // Save undo state
        get().addToUndoHistory({
          action: 'bulkDelete',
          description: `已删除 ${taskIds.length} 个任务`,
          previousState: {
            columns: state.columns,
            tasks: state.tasks,
          },
        });

        set((state) => ({
          tasks: state.tasks.filter((task) => !taskIds.includes(task.id)),
        }));
      },

      // ==================== SUBTASK ACTIONS ====================

      addSubtask: (taskId, subtaskData) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const subtasks = task.subtasks || [];
              const newSubtask: Subtask = {
                ...subtaskData,
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                parentTaskId: taskId,
                order: subtasks.length,
                createdAt: new Date().toISOString(),
              };
              return {
                ...task,
                subtasks: [...subtasks, newSubtask],
              };
            }
            return task;
          }),
        }));

        // Log activity
        get().logActivity(taskId, {
          action: 'created',
          field: 'subtask',
          newValue: subtaskData.title,
        });
      },

      updateSubtask: (taskId, subtaskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId && task.subtasks) {
              return {
                ...task,
                subtasks: task.subtasks.map((subtask) =>
                  subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
                ),
              };
            }
            return task;
          }),
        }));

        // Log activity
        get().logActivity(taskId, {
          action: 'updated',
          field: 'subtask',
          newValue: JSON.stringify(updates),
        });
      },

      deleteSubtask: (taskId, subtaskId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        const subtask = task?.subtasks?.find((s) => s.id === subtaskId);

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId && task.subtasks) {
              return {
                ...task,
                subtasks: task.subtasks.filter((s) => s.id !== subtaskId),
              };
            }
            return task;
          }),
        }));

        // Log activity
        if (subtask) {
          get().logActivity(taskId, {
            action: 'created',
            field: 'subtask',
            oldValue: subtask.title,
          });
        }
      },

      toggleSubtask: (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId && task.subtasks) {
              return {
                ...task,
                subtasks: task.subtasks.map((subtask) => {
                  if (subtask.id === subtaskId) {
                    const completed = !subtask.completed;
                    return {
                      ...subtask,
                      completed,
                      completedAt: completed ? new Date().toISOString() : undefined,
                    };
                  }
                  return subtask;
                }),
              };
            }
            return task;
          }),
        }));

        // Log activity
        const task = get().tasks.find((t) => t.id === taskId);
        const subtask = task?.subtasks?.find((s) => s.id === subtaskId);
        if (subtask) {
          get().logActivity(taskId, {
            action: 'updated',
            field: 'subtask',
            newValue: subtask.completed ? '已完成' : '未完成',
          });
        }
      },

      reorderSubtasks: (taskId, subtaskIds) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId && task.subtasks) {
              const reorderedSubtasks = subtaskIds
                .map((id, index) => {
                  const subtask = task.subtasks!.find((s) => s.id === id);
                  return subtask ? { ...subtask, order: index } : null;
                })
                .filter((s): s is Subtask => s !== null);

              return {
                ...task,
                subtasks: reorderedSubtasks,
              };
            }
            return task;
          }),
        }));

        // Log activity
        get().logActivity(taskId, {
          action: 'updated',
          field: 'subtasks',
          newValue: '已重新排序',
        });
      },

      // ==================== FILE ATTACHMENT ACTIONS ====================

      addAttachment: (taskId, attachment) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const attachments = task.attachments || [];
              const newAttachment: TaskAttachment = {
                ...attachment,
                id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                taskId,
                uploadedAt: new Date().toISOString(),
              };
              return {
                ...task,
                attachments: [...attachments, newAttachment],
              };
            }
            return task;
          }),
        }));

        // Log activity
        get().logActivity(taskId, {
          action: 'created',
          field: 'attachment',
          newValue: attachment.filename,
        });

        log.info('Attachment added', { taskId, filename: attachment.filename });
      },

      deleteAttachment: (taskId, attachmentId) => {
        const task = get().tasks.find((t) => t.id === taskId);
        const attachment = task?.attachments?.find((a) => a.id === attachmentId);

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId && task.attachments) {
              return {
                ...task,
                attachments: task.attachments.filter((a) => a.id !== attachmentId),
              };
            }
            return task;
          }),
        }));

        // Log activity
        if (attachment) {
          get().logActivity(taskId, {
            action: 'updated',
            field: 'attachment',
            oldValue: attachment.filename,
          });

          log.info('Attachment deleted', { taskId, attachmentId, filename: attachment.filename });
        }
      },

      // ==================== DEPENDENCY ACTIONS ====================

      addDependency: (taskId, dependency) => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();

        // Use centralized validation from dependencies store
        const validation = dependenciesStore.validateDependency(taskId, dependency, tasks);
        if (!validation.valid) {
          log.error(validation.error || 'Invalid dependency', { taskId, dependsOn: dependency.taskId });
          return;
        }

        // Add dependency to task
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id === taskId) {
              const existingDeps = t.dependencies || [];
              return {
                ...t,
                dependencies: [...existingDeps, dependency],
              };
            }
            return t;
          }),
        }));

        // Log activity with dependency type info
        const dependencyLabel = {
          'finish-to-start': 'FS（完成到开始）',
          'start-to-start': 'SS（开始到开始）',
          'finish-to-finish': 'FF（完成到完成）',
          'start-to-finish': 'SF（开始到完成）',
        }[dependency.type];

        const lagLabel = dependency.lag !== 0
          ? `，滞后 ${dependency.lag > 0 ? '+' : ''}${dependency.lag} 天`
          : '';

        get().logActivity(taskId, {
          action: 'created',
          field: 'dependency',
          newValue: `依赖任务 ${dependency.taskId}（${dependencyLabel}${lagLabel}）`,
        });
      },

      removeDependency: (taskId, dependencyId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task || !task.dependencies) {
          log.warn('Task or dependencies not found', { taskId });
          return;
        }

        const dependency = task.dependencies.find(d => d.taskId === dependencyId);
        if (!dependency) {
          log.warn('Dependency not found', { taskId, dependencyId });
          return;
        }

        // Remove dependency from task
        set((state) => ({
          tasks: state.tasks.map(t => {
            if (t.id === taskId) {
              return {
                ...t,
                dependencies: (t.dependencies || []).filter(d => d.taskId !== dependencyId),
              };
            }
            return t;
          }),
        }));

        // Log activity
        const dependencyLabel = {
          'finish-to-start': 'FS',
          'start-to-start': 'SS',
          'finish-to-finish': 'FF',
          'start-to-finish': 'SF',
        }[dependency.type];

        get().logActivity(taskId, {
          action: 'updated',
          field: 'dependency',
          oldValue: `曾依赖任务 ${dependencyId}（${dependencyLabel}）`,
        });
      },

      // Dependency queries delegated to useKanbanDependenciesStore

      getBlockers: (taskId) => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getBlockers(taskId, tasks);
      },

      getBlocked: (taskId) => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getBlocked(taskId, tasks);
      },

      getOverdueBlockers: (taskId) => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getOverdueBlockers(taskId, tasks);
      },

      // ==================== AUTO-SHIFT DEPENDENT TASKS ====================

      applyDependentShifts: (shifts) => {
        if (shifts.length === 0) return;

        log.info(`Applying ${shifts.length} dependent task shifts`);

        set((state) => ({
          tasks: state.tasks.map((task) => {
            const shift = shifts.find(s => s.taskId === task.id);
            if (!shift) return task;

            return {
              ...task,
              startDate: shift.newStartDate,
              dueDate: shift.newDueDate,
            };
          }),
        }));

        // Log activity for each shifted task
        shifts.forEach(shift => {
          get().logActivity(shift.taskId, {
            action: 'updated',
            field: 'dates',
            newValue: shift.reason,
          });
        });

        log.info('Dependent shifts applied successfully');
      },

      // ==================== CRITICAL PATH ANALYSIS ====================
      // Delegated to useKanbanDependenciesStore for single-responsibility

      getCriticalPath: () => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getCriticalPath(tasks);
      },

      getTaskSlack: (taskId) => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getTaskSlack(taskId, tasks);
      },

      // ==================== BASELINE COMPARISON ====================
      // Delegated to useKanbanDependenciesStore for single-responsibility

      setBaseline: () => {
        const tasks = get().tasks;
        const dependenciesStore = useKanbanDependenciesStore.getState();
        dependenciesStore.setBaseline(tasks);
      },

      clearBaseline: () => {
        const dependenciesStore = useKanbanDependenciesStore.getState();
        dependenciesStore.clearBaseline();
      },

      getBaseline: () => {
        const dependenciesStore = useKanbanDependenciesStore.getState();
        return dependenciesStore.getBaseline();
      },

      // ==================== ARCHIVE ACTIONS ====================
      // Delegated to useKanbanArchiveStore for single-responsibility

      archiveTask: (id) => {
        let task = get().tasks.find((t) => t.id === id);
        if (!task) return;

        // Record the transition while the task is still in the active store,
        // then archive the updated snapshot so the audit trail is preserved.
        get().logActivity(id, {
          action: 'updated',
          field: 'archived',
          newValue: 'true',
        });
        task = get().tasks.find((t) => t.id === id) ?? task;

        // Delegate to archive store
        const archiveStore = useKanbanArchiveStore.getState();
        archiveStore.archiveTask(task);

        // Remove from active tasks
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
      },

      notify: (title, body) => {
        toast.info(body, title);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, { body });
        }
      },

      restoreTask: (id) => {
        // Delegate to archive store
        const archiveStore = useKanbanArchiveStore.getState();
        const restoredTask = archiveStore.restoreTask(id);

        if (!restoredTask) return;

        // Add back to active tasks
        set((state) => ({
          tasks: [...state.tasks, restoredTask],
        }));

        // Log restore action
        get().logActivity(id, {
          action: 'updated',
          field: 'archived',
          oldValue: 'true',
          newValue: 'false',
        });
      },

      deleteArchivedTask: (id) => {
        // Delegate to archive store
        const archiveStore = useKanbanArchiveStore.getState();
        archiveStore.deleteArchivedTask(id);
      },

      getArchivedTasks: () => {
        // Delegate to archive store
        const archiveStore = useKanbanArchiveStore.getState();
        return archiveStore.getArchivedTasks();
      },

      autoArchiveCompletedTasks: () => {
        const archiveStore = useKanbanArchiveStore.getState();
        const tasksToArchive = archiveStore.getTasksToAutoArchive(get().tasks);

        if (tasksToArchive.length === 0) return;

        // Bulk archive for efficiency
        archiveStore.bulkArchiveTasks(tasksToArchive);

        // Remove from active tasks
        const archiveIds = new Set(tasksToArchive.map((t) => t.id));
        set((state) => ({
          tasks: state.tasks.filter((t) => !archiveIds.has(t.id)),
        }));

        log.info('Auto-archived completed tasks', { count: tasksToArchive.length });
      },

      // ==================== TIME TRACKING ====================

      startTimer: (taskId) => {
        const now = new Date().toISOString();

        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                timeTracking: {
                  estimated: task.timeTracking?.estimated,
                  actual: task.timeTracking?.actual || 0,
                  activeTimerStart: now,
                  timerHistory: task.timeTracking?.timerHistory || [],
                },
              };
            }
            return task;
          }),
        }));

        // Log timer start
        get().logActivity(taskId, {
          action: 'updated',
          field: 'timer',
          newValue: '已开始',
        });
      },

      stopTimer: (taskId) => {
        const now = new Date().toISOString();
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);

        if (!task || !task.timeTracking?.activeTimerStart) {
          log.warn('No active timer for task', { taskId });
          return;
        }

        const startTime = new Date(task.timeTracking.activeTimerStart);
        const endTime = new Date(now);
        const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000); // seconds

        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId && t.timeTracking) {
              const newEntry = {
                id: crypto.randomUUID(),
                startTime: task.timeTracking!.activeTimerStart!,
                endTime: now,
                duration,
              };

              return {
                ...t,
                timeTracking: {
                  estimated: t.timeTracking.estimated,
                  actual: t.timeTracking.actual + duration,
                  activeTimerStart: undefined,
                  timerHistory: [...(t.timeTracking.timerHistory || []), newEntry],
                },
              };
            }
            return t;
          }),
        }));

        // Log timer stop
        get().logActivity(taskId, {
          action: 'updated',
          field: 'timer',
          oldValue: '运行中',
          newValue: `已停止（+${Math.floor(duration / 60)} 分钟）`,
        });
      },

      updateTimeEstimate: (taskId, hours) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              return {
                ...task,
                timeTracking: {
                  estimated: hours,
                  actual: task.timeTracking?.actual || 0,
                  activeTimerStart: task.timeTracking?.activeTimerStart,
                  timerHistory: task.timeTracking?.timerHistory || [],
                },
              };
            }
            return task;
          }),
        }));

        // Log estimate update
        get().logActivity(taskId, {
          action: 'updated',
          field: 'time_estimate',
          newValue: `${hours}h`,
        });
      },

      // ==================== CUSTOM FIELDS ====================

      updateEffort: (taskId, effort) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const oldEffort = task.effort;

              // Log activity if changed
              if (oldEffort !== effort) {
                setTimeout(() => {
                  get().logActivity(taskId, {
                    action: 'updated',
                    field: 'effort',
                    oldValue: oldEffort?.toString(),
                    newValue: effort?.toString(),
                  });
                }, 0);
              }

              return { ...task, effort };
            }
            return task;
          }),
        }));
      },

      updateCustomStatus: (taskId, customStatus) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            if (task.id === taskId) {
              const oldStatus = task.customStatus;

              // Log activity if changed
              if (oldStatus !== customStatus) {
                setTimeout(() => {
                  get().logActivity(taskId, {
                    action: 'updated',
                    field: 'custom_status',
                    oldValue: oldStatus,
                    newValue: customStatus,
                  });
                }, 0);
              }

              return { ...task, customStatus };
            }
            return task;
          }),
        }));
      },

      // ==================== BULK IMPORT ====================

      bulkImportTasks: (importedTasks: Array<{
        title: string;
        description?: string;
        dueDate?: string;
        priority?: TaskPriority;
        tags?: string[];
        status?: TaskStatus;
        completed?: boolean;
        estimatedHours?: number;
        progress?: number;
        checklist?: Array<{ text: string; completed: boolean }>;
      }>) => {
        const now = new Date().toISOString();
        const importedTaskIds: string[] = [];
        const newTags: string[] = [];

        // Get next card number
        let nextCardNumber = get().nextCardNumber || 1;

        // Process tasks
        const newTasks: Task[] = importedTasks.map((imported) => {
          const taskId = crypto.randomUUID();
          importedTaskIds.push(taskId);

          // Convert checklist to ChecklistItem format if provided
          const checklist: ChecklistItem[] | undefined = imported.checklist?.map((item, idx) => ({
            id: crypto.randomUUID(),
            text: item.text,
            completed: item.completed,
            order: idx,
            createdAt: now,
          }));

          // Track new tags
          imported.tags?.forEach(tag => {
            if (tag && !newTags.includes(tag)) {
              newTags.push(tag);
            }
          });

          const task: Task = {
            id: taskId,
            title: imported.title,
            description: imported.description || '',
            status: imported.completed ? 'done' : (imported.status || 'todo'),
            created: now,
            startDate: null,
            dueDate: imported.dueDate || null,
            priority: imported.priority || 'medium',
            tags: imported.tags || [],
            cardNumber: nextCardNumber++,
            checklist,
            estimatedHours: imported.estimatedHours,
            progress: imported.progress,
            projectIds: [],
          };

          return task;
        });

        // Update state
        set((state) => ({
          tasks: [...state.tasks, ...newTasks],
          nextCardNumber,
        }));

        log.info('Bulk imported tasks', {
          count: newTasks.length,
          newTags: newTags.length,
        });

        return {
          success: true,
          tasksImported: newTasks.length,
          tagsCreated: newTags,
          errors: [],
          warnings: [],
        };
      },

      // ==================== UI PREFERENCES ====================

      setVisibleColumns: (count) => {
        // Validate input (3-7 columns)
        const validCount = Math.min(Math.max(count, 3), 7);
        set({ visibleColumns: validCount });
      },

      // ==================== CARD TEMPLATES ====================

      getCardTemplates: () => {
        return DEFAULT_CARD_TEMPLATES;
      },

      // ==================== SECTION MANAGEMENT ====================

      addSection: (columnId, title) => {
        const sections = get().sections;
        const columnSections = sections.filter(s => s.columnId === columnId);
        const newSection: KanbanSection = {
          id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title,
          columnId,
          order: columnSections.length,
          collapsed: false,
        };

        set((state) => ({
          sections: [...state.sections, newSection],
        }));
      },

      deleteSection: (id) => {
        // Unassign tasks from this section
        set((state) => ({
          sections: state.sections.filter(s => s.id !== id),
          tasks: state.tasks.map(t =>
            t.sectionId === id ? { ...t, sectionId: undefined } : t
          ),
        }));
      },

      renameSection: (id, title) => {
        set((state) => ({
          sections: state.sections.map(s =>
            s.id === id ? { ...s, title } : s
          ),
        }));
      },

      toggleSectionCollapse: (id) => {
        set((state) => ({
          sections: state.sections.map(s =>
            s.id === id ? { ...s, collapsed: !s.collapsed } : s
          ),
        }));
      },
    }),
    {
      name: 'kanban-tasks',
      storage: createJSONStorage(() => createSyncedStorage()),
      version: 5, // v5: Migrate baseline to useKanbanDependenciesStore
      migrate: (persistedState: any, version: number) => {
        let state = persistedState;

        // Migration v1 -> v2: Migrate from global SimpleTaskDependency[] to task-level TaskDependency[]
        if (version < 2 && needsMigration(state)) {
          log.info('Migrating dependencies from global array to task level');
          const migratedTasks = migrateDependenciesToTaskLevel(
            state.tasks || [],
            state.dependencies || []
          );

          state = {
            ...state,
            tasks: migratedTasks,
            dependencies: undefined, // Remove old dependencies field
          };
        }

        // Migration v2 -> v3: Add projectIds field to all tasks
        if (version < 3 && state.tasks) {
          log.info('Adding projectIds field to all tasks');
          state = {
            ...state,
            tasks: state.tasks.map((task: any) => ({
              ...task,
              projectIds: task.projectIds ?? [],
            })),
            archivedTasks: state.archivedTasks?.map((task: any) => ({
              ...task,
              projectIds: task.projectIds ?? [],
            })),
          };
        }

        // Migration v3 -> v4: Migrate archivedTasks to useKanbanArchiveStore
        if (version < 4 && state.archivedTasks && state.archivedTasks.length > 0) {
          log.info('Migrating archivedTasks to useKanbanArchiveStore', {
            count: state.archivedTasks.length,
          });

          // Schedule migration to archive store after hydration
          // We can't call the store directly during migration, so we'll do it on next tick
          setTimeout(() => {
            const archiveStore = useKanbanArchiveStore.getState();
            const existingArchived = archiveStore.archivedTasks;

            // Only migrate if archive store is empty (avoid duplicates)
            if (existingArchived.length === 0 && state.archivedTasks?.length > 0) {
              archiveStore.bulkArchiveTasks(
                state.archivedTasks.map((task: Task) => ({
                  ...task,
                  // Preserve existing archivedAt or set now
                  archivedAt: task.archivedAt || new Date().toISOString(),
                }))
              );
              log.info('Migration complete: archivedTasks moved to archive store');
            }
          }, 100);

          // Remove archivedTasks from this store's state
          state = {
            ...state,
            archivedTasks: undefined,
          };
        }

        // Migration v4 -> v5: Migrate baseline to useKanbanDependenciesStore
        if (version < 5 && state.baseline) {
          log.info('Migrating baseline to useKanbanDependenciesStore');

          // Schedule migration to dependencies store after hydration
          setTimeout(() => {
            const dependenciesStore = useKanbanDependenciesStore.getState();
            const existingBaseline = dependenciesStore.getBaseline();

            // Only migrate if dependencies store has no baseline
            if (!existingBaseline && state.baseline) {
              // Directly set the baseline state in dependencies store
              useKanbanDependenciesStore.setState({ baseline: state.baseline });
              log.info('Migration complete: baseline moved to dependencies store');
            }
          }, 100);

          // Remove baseline from this store's state
          state = {
            ...state,
            baseline: undefined,
          };
        }

        return state;
      },
    }
  )
);
