import React, { useState, useEffect, useCallback, memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Paperclip } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { convertTaskToHabit } from '../../services/habitTaskBridge';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CustomFieldDisplay } from '../../components/CustomFieldDisplay';
import { TaskTimerButton } from '../../components/tasks/TaskTimerButton';
import { WhenTagBadge } from '../../components/tasks/WhenTagPicker';
import type { Task, TaskPriority } from '../../types';

interface KanbanCardProps {
  task: Task;
  isDragging?: boolean;
  isSelected?: boolean;
  onRegisterRef?: (ref: { triggerEdit: () => void }) => void;
  onCardClick?: (task: Task, tab?: 'subtasks' | 'checklist' | 'comments' | 'activity') => void;
}

const KanbanCardComponent: React.FC<KanbanCardProps> = ({
  task,
  isDragging = false,
  isSelected = false,
  onRegisterRef,
  onCardClick,
}) => {
  const { tasks, updateTask, deleteTask, archiveTask, getBlockers, getBlocked, getCriticalPath, getOverdueBlockers } = useKanbanStore();
  const { getTotalTimeForCard, activeEntry } = useTimeTrackingStore();
  const members = useSettingsStore((state) => state.members);
  const taskFieldDefinitions = useSettingsStore((state) => state.customFieldDefinitions.tasks);

  // Check if this task is on critical path
  const isCritical = tasks.length >= 5 && (task.dependencies?.length ?? 0) > 0 && getCriticalPath().includes(task.id);

  // Get overdue blockers for dependency warnings
  const overdueBlockers = getOverdueBlockers(task.id);

  // Get assigned members
  const assignedMembers = (task.assignees || [])
    .map(id => members.find(m => m.id === id))
    .filter(Boolean) as typeof members;
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Get total time logged for this card
  const totalSeconds = getTotalTimeForCard(task.id);
  const hasTimeTracked = totalSeconds > 0;
  const isTimerActive = activeEntry?.taskId === task.id;

  // Count Pomodoro sessions for this task
  const { entries } = useTimeTrackingStore();
  const pomodoroCount = entries.filter(
    (e) => e.taskId === task.id && e.tags?.includes('Pomodoro')
  ).length;
  const [editedTask, setEditedTask] = useState({
    title: task.title,
    description: task.description,
    priority: task.priority,
    startDate: task.startDate || '',
    dueDate: task.dueDate || '',
  });

  // Register ref for keyboard shortcut access
  useEffect(() => {
    if (onRegisterRef) {
      onRegisterRef({
        triggerEdit: () => setIsEditing(true),
      });
    }
  }, [onRegisterRef]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    disabled: isEditing,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  const priorityLabels = {
    low: '低',
    medium: '中',
    high: '高',
  };

  // Format seconds to hours with 1 decimal (e.g., "2.5h")
  const formatTime = (seconds: number): string => {
    const hours = seconds / 3600;
    return hours < 0.1 ? '<0.1h' : `${hours.toFixed(1)}h`;
  };

  // Get custom fields that are visible in cards and have values for this task
  const activeCustomFields = task.customFields
    ? taskFieldDefinitions
        .filter(field => {
          // Check visibility flag (default to true for backward compatibility)
          const isVisible = field.visibleInCard !== false;
          const value = task.customFields?.[field.id];
          const hasValue = value !== null && value !== undefined && value !== '';
          return isVisible && hasValue;
        })
        .map(field => ({
          field,
          value: task.customFields![field.id]
        }))
    : [];

  const handleSave = useCallback(() => {
    updateTask(task.id, {
      title: editedTask.title.trim() || task.title,
      description: editedTask.description,
      priority: editedTask.priority,
      startDate: editedTask.startDate || null,
      dueDate: editedTask.dueDate || null,
    });
    setIsEditing(false);
    setShowMenu(false);
  }, [task.id, task.title, editedTask, updateTask]);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    setShowDeleteDialog(true);
    setShowMenu(false);
  }, []);

  const confirmDelete = useCallback(() => {
    deleteTask(task.id);
    setShowDeleteDialog(false);
  }, [task.id, deleteTask]);

  const cancelDelete = useCallback(() => {
    setShowDeleteDialog(false);
    setIsDeleting(false);
  }, []);

  const handleArchive = useCallback(() => {
    archiveTask(task.id);
    setShowMenu(false);
  }, [task.id, archiveTask]);

  const handleCardClick = useCallback(() => {
    if (!isDeleting && onCardClick) {
      onCardClick(task);
    }
  }, [isDeleting, task, onCardClick]);

  if (isEditing) {
    return (
      <div className="kanban-card-edit bg-surface-light dark:bg-surface-dark-elevated rounded-lg p-3 shadow-md border-2 border-accent-blue">
        <input
          type="text"
          value={editedTask.title}
          onChange={(e) => setEditedTask({ ...editedTask, title: e.target.value })}
          placeholder="任务标题"
          className="w-full mb-2 px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:outline-none"
          autoFocus
        />
        <textarea
          value={editedTask.description}
          onChange={(e) => setEditedTask({ ...editedTask, description: e.target.value })}
          placeholder="描述（可选）"
          rows={2}
          className="w-full mb-2 px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:outline-none resize-none"
        />

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">开始日期</label>
            <input
              type="date"
              value={editedTask.startDate}
              onChange={(e) => setEditedTask({ ...editedTask, startDate: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
            />
          </div>
          <div>
            <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">截止日期</label>
            <input
              type="date"
              value={editedTask.dueDate}
              onChange={(e) => setEditedTask({ ...editedTask, dueDate: e.target.value })}
              className="w-full px-2 py-1 text-xs border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
            />
          </div>
        </div>

        <div className="mb-2">
          <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary">优先级</label>
          <select
            value={editedTask.priority}
            onChange={(e) =>
              setEditedTask({ ...editedTask, priority: e.target.value as TaskPriority })
            }
            className="w-full px-2 py-1 text-sm border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary"
          >
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-1 text-sm bg-accent-blue text-white rounded hover:bg-accent-blue-hover transition-colors"
          >
            保存
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1 text-sm bg-surface-dark text-white rounded hover:opacity-80 transition-opacity"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  // Get first image attachment for cover
  const coverImage = task.attachments?.find(a => a.fileType.startsWith('image/'));
  const coverMode = task.coverMode || 'fit';

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={handleCardClick}
      className={`kanban-card bg-surface-light dark:bg-surface-dark-elevated rounded-lg border border-border-light/90 dark:border-border-dark cursor-grab active:cursor-grabbing hover:border-accent-primary/35 transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${
        isSelected ? 'ring-2 ring-accent-blue ring-offset-2 ring-offset-surface-light dark:ring-offset-surface-dark' : ''
      } ${coverImage ? 'p-0' : 'p-3'} overflow-hidden rounded-lg`}
    >
      {/* Card Cover Image */}
      {coverImage && (
        <div className="relative w-full h-[120px] overflow-hidden rounded-t-lg">
          <img
            src={coverImage.dataUrl}
            alt={coverImage.filename}
            className={`w-full h-full ${
              coverMode === 'fit'
                ? 'object-contain bg-surface-light-elevated dark:bg-surface-dark-elevated'
                : 'object-cover'
            }`}
            loading="lazy"
          />
        </div>
      )}

      <div className={coverImage ? 'p-3' : ''}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          {/* Card Number */}
          {task.cardNumber && (
            <span className="mr-2 text-[10px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary">
              KAN-{task.cardNumber}
            </span>
          )}
          <h4 className="line-clamp-2 text-sm font-medium leading-5 text-text-light-primary dark:text-text-dark-primary">
            {/* Milestone indicator */}
            {task.isMilestone && (
              <span className="shrink-0 text-sm" title="里程碑">📍</span>
            )}
            {task.title}
          </h4>
          {/* Critical path indicator */}
          {isCritical && (
            <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark border border-status-error-border dark:border-status-error-border-dark">
              🔴 关键路径
            </span>
          )}
          {/* Overdue blocker warning */}
          {overdueBlockers.length > 0 && (
            <span
              className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-status-warning-bg dark:bg-status-warning-bg-dark text-status-warning-text dark:text-status-warning-text-dark border border-status-warning-border dark:border-status-warning-border-dark"
              title={`被 ${overdueBlockers.length} 个逾期任务阻塞：${overdueBlockers.map(b => b.title).join(', ')}`}
            >
              ⚠️ {overdueBlockers.length} 逾期
            </span>
          )}
        </div>
        <div className="relative flex items-center gap-1">
          <span className="hidden"><TaskTimerButton taskId={task.id} taskTitle={task.title} size="sm" /></span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary p-1"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded shadow-lg z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  setIsEditing(true);
                  setShowMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light-elevated dark:hover:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary"
              >
                编辑
              </button>
              {!task.linkedHabitId && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    convertTaskToHabit(task.id);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light-elevated dark:hover:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary"
                >
                  作为习惯跟踪
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  handleArchive();
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light-elevated dark:hover:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary"
              >
                📦 归档
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation(); // Prevent card click
                  handleDelete();
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-surface-light-elevated dark:hover:bg-surface-dark text-status-error"
              >
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2 line-clamp-2">
          {task.description}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap [&>*:nth-child(n+4)]:hidden">
        {/* Priority Badge */}
        <span className="text-xs px-2 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary">
          {priorityLabels[task.priority]}
        </span>

        {/* Due Date with overdue/due soon indicators */}
        {task.dueDate && (() => {
          const dueDate = new Date(task.dueDate);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = daysUntilDue < 0;
          const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 3;

          return (
            <span className={`text-xs px-2 py-0.5 rounded ${
              isOverdue
                ? 'bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark'
                : isDueSoon
                ? 'bg-status-warning-bg dark:bg-status-warning-bg-dark text-status-warning-text dark:text-status-warning-text-dark'
                : 'bg-surface-light-elevated dark:bg-surface-dark text-accent-blue'
            }`}>
              📅 {dueDate.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          );
        })()}

        {/* Recurring Task Indicator */}
        {(task.recurrence || task.recurrenceId) && (
          <span
            className="text-xs px-2 py-0.5 rounded bg-accent-blue/10 dark:bg-accent-blue/20 text-accent-blue dark:text-accent-blue-hover font-medium"
            title={
              task.isRecurringParent
                ? `重复任务（${task.recurrence?.frequency === 'daily' ? '每天' : task.recurrence?.frequency === 'weekly' ? '每周' : task.recurrence?.frequency === 'monthly' ? '每月' : task.recurrence?.frequency === 'yearly' ? '每年' : task.recurrence?.frequency}）${task.nextOccurrence ? ` • 下次：${task.nextOccurrence}` : ''}`
                : '重复任务的实例'
            }
          >
            🔁 {task.isRecurringParent ? '重复' : '实例'}
          </span>
        )}

        {/* When Tag () */}
        {task.whenTag && <WhenTagBadge tag={task.whenTag} />}

        {/* Estimated Hours */}
        {task.estimatedHours && (
          <span className="text-xs px-2 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary">
            ⏱️ {task.estimatedHours}h
          </span>
        )}

        {/* Time Tracked (Time Tracking Integration) */}
        {hasTimeTracked && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (onCardClick) {
                onCardClick(task);
              }
            }}
            className={`text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:scale-105 ${
              isTimerActive
                ? 'bg-accent-blue text-white hover:bg-accent-blue/90 animate-pulse'
                : 'bg-surface-light-elevated dark:bg-surface-dark text-accent-blue dark:text-accent-blue-hover'
            }`}
            title={isTimerActive ? '计时中 - 点击查看' : '已记录总时长 - 点击查看'}
          >
            {isTimerActive && '⏱️ '}🕐 {formatTime(totalSeconds)}
          </span>
        )}

        {/* Pomodoro Sessions Count */}
        {pomodoroCount > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 font-medium"
            title={`${pomodoroCount} 个番茄钟已完成`}
          >
            🍅 {pomodoroCount}
          </span>
        )}

        {/* Tags */}
        {task.tags && task.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded bg-accent-blue/10 dark:bg-accent-blue/20 text-accent-blue dark:text-accent-blue-hover"
          >
            #{tag}
          </span>
        ))}
        {task.tags && task.tags.length > 2 && (
          <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">+{task.tags.length - 2}</span>
        )}

        {/* Custom Fields () */}
        {activeCustomFields.map(({ field, value }) => (
          <CustomFieldDisplay
            key={field.id}
            field={field}
            value={value}
            variant="card"
          />
        ))}

        {/* Dependency Indicators () */}
        {(() => {
          const blockers = getBlockers(task.id);
          const incompleteBlockers = blockers.filter((b) => b.status !== 'done');

          if (incompleteBlockers.length > 0) {
            return (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCardClick) {
                    onCardClick(task);
                  }
                }}
                className="text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:scale-105 bg-status-warning-bg dark:bg-status-warning-bg-dark text-status-warning-text dark:text-status-warning-text-dark hover:opacity-80"
                title={`被 ${incompleteBlockers.length} 个任务阻塞`}
              >
                🔒 被阻塞 {incompleteBlockers.length}
              </span>
            );
          }

          const blocked = getBlocked(task.id);
          if (blocked.length > 0) {
            return (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  if (onCardClick) {
                    onCardClick(task);
                  }
                }}
                className="text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:scale-105 bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark-elevated"
                title={`阻塞 ${blocked.length} 个任务`}
              >
                ⚠️ 阻塞 {blocked.length}
              </span>
            );
          }

          return null;
        })()}

        {/* Subtask Progress Badge */}
        {task.subtasks && task.subtasks.length > 0 && (() => {
          const completedCount = task.subtasks.filter(st => st.completed).length;
          const totalCount = task.subtasks.length;
          const isComplete = completedCount === totalCount;

          return (
            <span
              onClick={(e) => {
                e.stopPropagation();
                if (onCardClick) {
                  onCardClick(task, 'subtasks');
                }
              }}
              className={`text-xs px-2 py-0.5 rounded font-medium cursor-pointer transition-all hover:scale-105 ${
                isComplete
                  ? 'bg-status-success text-white hover:bg-status-success/90'
                  : completedCount > 0
                  ? 'bg-accent-blue text-white hover:bg-accent-blue/90'
                  : 'bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark-elevated'
              }`}
            >
              ✓ {completedCount}/{totalCount} 子任务
            </span>
          );
        })()}

        {/* Assignee Avatars - */}
        {assignedMembers.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {assignedMembers.slice(0, 3).map((member, index) => (
              <div
                key={member.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-[10px] border-2 border-surface-light dark:border-surface-dark-elevated shrink-0"
                style={{
                  backgroundColor: member.avatarColor,
                  zIndex: assignedMembers.length - index
                }}
                title={member.name}
              >
                {member.initials}
              </div>
            ))}
            {assignedMembers.length > 3 && (
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium bg-surface-light-elevated dark:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary border-2 border-surface-light dark:border-surface-dark-elevated"
                title={`+${assignedMembers.length - 3} 更多`}
              >
                +{assignedMembers.length - 3}
              </div>
            )}
          </div>
        )}

        {/* Attachment Badge - */}
        {task.attachments && task.attachments.length > 0 && (
          <span
            className="flex items-center gap-1 text-xs text-text-light-secondary dark:text-text-dark-secondary"
            title={`${task.attachments.length} 个附件`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            {task.attachments.length}
          </span>
        )}
      </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <ConfirmDialog
          isOpen={true}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          title="移出活跃任务"
          message={`将“${task.title}”移到归档吗？之后可在任务归档中恢复或永久删除。`}
          confirmText="移到归档"
          variant="danger"
        />
      )}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
// Only re-render if task, isDragging, or isSelected props change
export const KanbanCard = memo(KanbanCardComponent, (prevProps, nextProps) => {
  const prevAssignees = prevProps.task.assignees || [];
  const nextAssignees = nextProps.task.assignees || [];
  const prevAttachments = prevProps.task.attachments || [];
  const nextAttachments = nextProps.task.attachments || [];
  const prevCustomFields = prevProps.task.customFields || {};
  const nextCustomFields = nextProps.task.customFields || {};

  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.description === nextProps.task.description &&
    prevProps.task.priority === nextProps.task.priority &&
    prevProps.task.dueDate === nextProps.task.dueDate &&
    prevProps.task.startDate === nextProps.task.startDate &&
    prevProps.task.tags.length === nextProps.task.tags.length &&
    prevAssignees.length === nextAssignees.length &&
    prevAttachments.length === nextAttachments.length &&
    prevProps.task.coverMode === nextProps.task.coverMode &&
    Object.keys(prevCustomFields).length === Object.keys(nextCustomFields).length &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.isSelected === nextProps.isSelected
  );
});
