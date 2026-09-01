import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PartyPopper } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useProjectContextStore } from '../../stores/useProjectContextStore';
import { useNotesStore } from '../../stores/useNotesStore';
import { useLinkLibraryStore } from '../../stores/useLinkLibraryStore';
import { toast } from '../../stores/useToastStore';
import type { Task, TaskPriority } from '../../types';
import { markdownToLexical } from '../../utils/markdownToLexical';

interface TriageInboxProps {
  onTaskClick: (task: Task) => void;
}

/**
 * TriageInbox — Linear-style task triage
 *
 * Shows backlog tasks that haven't been categorized.
 * Keyboard-first: j/k navigate, 1-4 priority, Enter accept, s snooze.
 */
export const TriageInbox: React.FC<TriageInboxProps> = ({ onTaskClick }) => {
  const navigate = useNavigate();
  const { tasks, updateTask, moveTask, archiveTask } = useKanbanStore();
  const projects = useProjectContextStore((state) => state.projects);
  const createNote = useNotesStore((state) => state.createNote);
  const addLink = useLinkLibraryStore((state) => state.addLink);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get tasks to triage: backlog tasks not snoozed
  const triageTasks = useMemo(() => {
    const now = new Date().toISOString();
    return tasks.filter((t) => {
      if (t.status !== 'backlog') return false;
      if (t.snoozedUntil && t.snoozedUntil > now) return false;
      return true;
    });
  }, [tasks]);

  const currentTask = triageTasks[currentIndex] || null;
  const remaining = triageTasks.length;

  // Keep index in bounds
  useEffect(() => {
    if (currentIndex >= triageTasks.length && triageTasks.length > 0) {
      setCurrentIndex(triageTasks.length - 1);
    }
  }, [triageTasks.length, currentIndex]);

  const handleSetPriority = useCallback((priority: TaskPriority) => {
    if (!currentTask) return;
    updateTask(currentTask.id, { priority });
  }, [currentTask, updateTask]);

  const handleAccept = useCallback(() => {
    if (!currentTask) return;
    moveTask(currentTask.id, 'todo');
    toast.success('已移入待办列表', `「${currentTask.title}」可在任务页继续处理。`);
    // Index auto-adjusts through useMemo recalculation
  }, [currentTask, moveTask]);

  const handleSnooze = useCallback(() => {
    if (!currentTask) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    updateTask(currentTask.id, { snoozedUntil: tomorrow.toISOString() });
  }, [currentTask, updateTask]);

  const handleArchive = useCallback(() => {
    if (!currentTask) return;
    archiveTask(currentTask.id);
  }, [currentTask, archiveTask]);

  const handleConvertToNote = useCallback(() => {
    if (!currentTask) return;
    const markdown = currentTask.description || currentTask.title;
    const note = createNote({
      title: currentTask.title,
      content: markdownToLexical(markdown),
      contentText: markdown,
      tags: currentTask.tags,
      projectIds: currentTask.projectIds,
    });
    archiveTask(currentTask.id);
    navigate(`/notes?note=${encodeURIComponent(note.id)}`);
  }, [currentTask, createNote, archiveTask, navigate]);

  const detectedUrl = useMemo(() => {
    if (!currentTask) return null;
    return `${currentTask.title} ${currentTask.description}`.match(/https?:\/\/[^\s)\]}]+/)?.[0] ?? null;
  }, [currentTask]);

  const handleConvertToBookmark = useCallback(() => {
    if (!currentTask || !detectedUrl) return;
    addLink({
      url: detectedUrl,
      title: currentTask.title === detectedUrl ? detectedUrl : currentTask.title,
      description: currentTask.description || undefined,
      tags: currentTask.tags,
      projectIds: currentTask.projectIds,
      isFavorite: false,
      isArchived: false,
      sortOrder: 0,
    });
    archiveTask(currentTask.id);
    navigate('/links');
  }, [currentTask, detectedUrl, addLink, archiveTask, navigate]);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, triageTasks.length - 1));
  }, [triageTasks.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0));
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          handleNext();
          break;
        case 'k':
          e.preventDefault();
          handlePrev();
          break;
        case '1':
          e.preventDefault();
          handleSetPriority('low');
          break;
        case '2':
          e.preventDefault();
          handleSetPriority('medium');
          break;
        case '3':
          e.preventDefault();
          handleSetPriority('high');
          break;
        case 'Enter':
          e.preventDefault();
          handleAccept();
          break;
        case 's':
          e.preventDefault();
          handleSnooze();
          break;
        case 'a':
          e.preventDefault();
          handleArchive();
          break;
        case 'n':
          e.preventDefault();
          handleConvertToNote();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleSetPriority, handleAccept, handleSnooze, handleArchive, handleConvertToNote]);

  if (remaining === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <PartyPopper className="w-9 h-9 mb-4" />
        <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
          收件箱清零
        </h3>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-5">
          所有积压任务都已分拣完毕。干得漂亮。
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button
            onClick={() => navigate('/today')}
            className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            回到今天
          </button>
          <button
            onClick={() => navigate('/')}
            className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"
          >
            快速记录新想法
          </button>
        </div>
      </div>
    );
  }

  const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-status-info/10 text-status-info border-status-info/30',
    medium: 'bg-status-warning/10 text-status-warning-text dark:text-status-warning-text-dark border-status-warning/30',
    high: 'bg-status-error/10 text-status-error border-status-error/30',
  };

  return (
    <div className="triage-inbox max-w-2xl mx-auto">
      {/* Counter */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide">
          分拣收件箱
        </h3>
        <span className="px-3 py-1 text-sm font-medium rounded-full bg-accent-blue/10 text-accent-blue">
          {remaining} 项待分拣
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="h-1 rounded-full bg-surface-light-elevated dark:bg-surface-dark-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-blue transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / remaining) * 100}%` }}
          />
        </div>
        <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1 text-right">
          {currentIndex + 1} / {remaining}
        </div>
      </div>

      {/* Current Task Card */}
      {currentTask && (
        <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
          {/* Card Number */}
          {currentTask.cardNumber && (
            <span className="text-xs font-mono text-text-light-secondary dark:text-text-dark-secondary">
              KAN-{currentTask.cardNumber}
            </span>
          )}

          {/* Title */}
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mt-1 mb-3">
            {currentTask.title}
          </h2>

          {/* Description */}
          {currentTask.description && (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4 whitespace-pre-wrap">
              {currentTask.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center gap-3 flex-wrap mb-6">
            <span className={`text-xs px-2 py-1 rounded border ${priorityColors[currentTask.priority]}`}>
              {currentTask.priority === 'high' ? '高' : currentTask.priority === 'medium' ? '中' : '低'}
            </span>
            {currentTask.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue">
                #{tag}
              </span>
            ))}
            {currentTask.dueDate && (
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                截止：{new Date(currentTask.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </span>
            )}
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              创建：{new Date(currentTask.created).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="mb-5 grid gap-3 rounded-lg bg-surface-light-elevated p-3 sm:grid-cols-2 dark:bg-surface-dark">
            <label className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              所属项目
              <select
                value={currentTask.projectIds[0] ?? ''}
                onChange={(event) => updateTask(currentTask.id, { projectIds: event.target.value ? [event.target.value] : [] })}
                className="mt-1 block w-full rounded-md border border-border-light bg-surface-light px-2.5 py-2 text-sm text-text-light-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary"
              >
                <option value="">未归属</option>
                {projects.filter((project) => !project.archivedAt).map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              安排日期
              <input
                type="date"
                value={currentTask.dueDate ?? ''}
                onChange={(event) => updateTask(currentTask.id, { dueDate: event.target.value || null })}
                className="mt-1 block w-full rounded-md border border-border-light bg-surface-light px-2.5 py-2 text-sm text-text-light-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap border-t border-border-light dark:border-border-dark pt-4">
            {/* Priority shortcuts */}
            <div className="flex items-center gap-1 mr-4">
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary mr-1">优先级：</span>
              {(['low', 'medium', 'high'] as const).map((p, i) => (
                <button
                  key={p}
                  onClick={() => handleSetPriority(p)}
                  className={`px-2 py-1 text-xs rounded border transition-colors ${
                    currentTask.priority === p
                      ? priorityColors[p] + ' font-semibold'
                      : 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-accent-blue'
                  }`}
                >
                  <kbd className="font-mono mr-1">{i + 1}</kbd>{p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <button
              onClick={handleConvertToNote}
              className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
              title="转为笔记并归档原输入（n）"
            >
              转为笔记
            </button>
            {detectedUrl && (
              <button
                onClick={handleConvertToBookmark}
                className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
                title="转为收藏并归档原输入"
              >
                转为收藏
              </button>
            )}
            <button
              onClick={handleArchive}
              className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
              title="不再处理，归档（a）"
            >
              归档
            </button>
            <button
              onClick={handleSnooze}
              className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
              title="稍后提醒 24 小时（s）"
            >
              <kbd className="font-mono text-xs mr-1">s</kbd> 稍后提醒
            </button>
            <button
              onClick={() => onTaskClick(currentTask)}
              className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
              title="查看详情"
            >
              详情
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-1.5 text-sm font-medium rounded bg-accent-blue text-white hover:bg-accent-blue-hover transition-colors"
              title="接受并移至待办（Enter）"
            >
              <kbd className="font-mono text-xs mr-1">↵</kbd> 接受
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <kbd className="font-mono text-xs mr-1">k</kbd> 上一个
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex >= remaining - 1}
          className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下一个 <kbd className="font-mono text-xs ml-1">j</kbd>
        </button>
      </div>

      {/* Keyboard hints */}
      <div className="mt-6 text-center text-xs text-text-light-secondary dark:text-text-dark-secondary">
        <kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">j/k</kbd> 导航
        {' '}<kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">1-3</kbd> 优先级
        {' '}<kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">Enter</kbd> 接受
        {' '}<kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">s</kbd> 稍后提醒
        {' '}<kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">n</kbd> 转笔记
        {' '}<kbd className="px-1.5 py-0.5 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark font-mono">a</kbd> 归档
      </div>
    </div>
  );
};
