import React, { useMemo, useState } from 'react';
import { Archive, ArrowRight, Inbox as InboxIcon, ListChecks, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContent } from '../components/PageContent';
import { TriageInbox } from '../components/tasks/TriageInbox';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useProjectContextStore } from '../stores/useProjectContextStore';
import { toast } from '../stores/useToastStore';
import type { Task, TaskPriority } from '../types';

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const priorityDot: Record<TaskPriority, string> = {
  low: 'bg-text-light-tertiary dark:bg-text-dark-tertiary',
  medium: 'bg-status-warning',
  high: 'bg-status-error',
};

function InboxTaskRow({
  task,
  projects,
  onOpen,
}: {
  task: Task;
  projects: ReturnType<typeof useProjectContextStore.getState>['projects'];
  onOpen: (task: Task) => void;
}) {
  const updateTask = useKanbanStore((s) => s.updateTask);
  const moveTask = useKanbanStore((s) => s.moveTask);
  const archiveTask = useKanbanStore((s) => s.archiveTask);
  const scheduleTask = () => {
    moveTask(task.id, 'todo');
    const [, month, day] = (task.dueDate ?? '').split('-').map(Number);
    const dateLabel = month && day ? `${month} 月 ${day} 日` : '待办列表';
    toast.success(`已安排到${dateLabel}`, '任务已移入待办，可在任务页继续处理。');
  };
  const archiveInboxTask = () => {
    archiveTask(task.id);
    toast.success(`已归档「${task.title}」`);
  };

  return (
    <article className="group flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 transition-colors hover:bg-surface-light-elevated/60 dark:hover:bg-surface-dark-elevated/40">
      <span className={`h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} aria-label={`${PRIORITY_LABELS[task.priority]}优先级`} />

      <button
        type="button"
        onClick={() => onOpen(task)}
        className="min-w-0 flex-1 text-left"
      >
        <span className="flex items-baseline gap-2">
          {task.cardNumber && (
            <span className="text-[11px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary">
              KAN-{task.cardNumber}
            </span>
          )}
          <span className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            {task.title}
          </span>
        </span>
        {task.description && (
          <span className="mt-0.5 block truncate text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {task.description}
          </span>
        )}
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <label className="sr-only" htmlFor={`inbox-project-${task.id}`}>所属项目</label>
        <select
          id={`inbox-project-${task.id}`}
          value={task.projectIds[0] ?? ''}
          onChange={(event) => updateTask(task.id, { projectIds: event.target.value ? [event.target.value] : [] })}
          className="h-8 w-36 rounded-lg border border-transparent bg-transparent px-2 text-xs text-text-light-secondary outline-none hover:border-border-light focus:border-accent-primary dark:text-text-dark-secondary dark:hover:border-border-dark"
        >
          <option value="">未归属项目</option>
          {projects.filter((project) => !project.archivedAt).map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <label className="sr-only" htmlFor={`inbox-date-${task.id}`}>安排日期</label>
        <input
          id={`inbox-date-${task.id}`}
          type="date"
          value={task.dueDate ?? ''}
          onChange={(event) => updateTask(task.id, { dueDate: event.target.value || null })}
          className="h-8 rounded-lg border border-transparent bg-transparent px-2 text-xs text-text-light-secondary outline-none hover:border-border-light focus:border-accent-primary dark:text-text-dark-secondary dark:hover:border-border-dark"
        />

        <button
          type="button"
          onClick={scheduleTask}
          className="inline-flex h-8 items-center justify-center gap-1 rounded-lg px-2.5 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary/10"
        >
          安排
          <ArrowRight className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={archiveInboxTask}
          aria-label={`归档「${task.title}」`}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-text-light-tertiary opacity-0 transition hover:bg-surface-light-elevated hover:text-text-light-secondary focus:opacity-100 group-hover:opacity-100 dark:text-text-dark-tertiary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-secondary"
          title="归档"
        >
          <Archive className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}

export const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const tasks = useKanbanStore((s) => s.tasks);
  const projects = useProjectContextStore((s) => s.projects);
  const [focusTriage, setFocusTriage] = useState(false);

  const inboxTasks = useMemo(() => {
    const now = new Date().toISOString();
    return tasks
      .filter((task) => task.status === 'backlog' && (!task.snoozedUntil || task.snoozedUntil <= now))
      .sort((a, b) => {
        const priorityWeight = { high: 0, medium: 1, low: 2 } as const;
        return priorityWeight[a.priority] - priorityWeight[b.priority] || +new Date(a.created) - +new Date(b.created);
      });
  }, [tasks]);

  const grouped = useMemo(() => {
    const needsArrangement = inboxTasks.filter((task) => task.projectIds.length === 0 || !task.dueDate);
    const ready = inboxTasks.filter((task) => task.projectIds.length > 0 && Boolean(task.dueDate));
    return { needsArrangement, ready };
  }, [inboxTasks]);

  const openTask = (task: Task) => navigate(`/tasks?task=${encodeURIComponent(task.id)}`);

  return (
    <PageContent page="inbox">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-accent-primary" />
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">待处理</h2>
            <span className="rounded-full bg-surface-light-elevated px-2 py-0.5 text-xs text-text-light-secondary dark:bg-surface-dark-elevated dark:text-text-dark-secondary">
              {inboxTasks.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            先看清积压了什么，再决定项目、日期或直接安排。
          </p>
        </div>

        {inboxTasks.length > 0 && (
          <button
            type="button"
            onClick={() => setFocusTriage((value) => !value)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
              focusTriage
                ? 'border-accent-primary bg-accent-primary/10 text-accent-primary'
                : 'border-border-light text-text-light-secondary hover:border-accent-primary/50 hover:text-accent-primary dark:border-border-dark dark:text-text-dark-secondary'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {focusTriage ? '返回全部' : '专注分拣'}
          </button>
        )}
      </div>

      {focusTriage ? (
        <div className="rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark">
          <TriageInbox onTaskClick={openTask} />
        </div>
      ) : inboxTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-light px-6 py-16 text-center dark:border-border-dark">
          <ListChecks className="mx-auto h-8 w-8 text-accent-primary" />
          <h3 className="mt-3 text-base font-semibold text-text-light-primary dark:text-text-dark-primary">收件箱清空</h3>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            新想法可以继续从概览快速收集，明确后再安排到任务或日程。
          </p>
        </div>
      ) : (
        <div className="space-y-7">
          {grouped.needsArrangement.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">需要安排</h3>
                  <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">缺少项目或日期，先补一个关键决定。</p>
                </div>
                <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{grouped.needsArrangement.length} 项</span>
              </div>
              <div className="divide-y divide-border-light/70 overflow-hidden rounded-xl border border-border-light bg-surface-light dark:divide-border-dark/50 dark:border-border-dark dark:bg-surface-dark">
                {grouped.needsArrangement.map((task) => (
                  <InboxTaskRow key={task.id} task={task} projects={projects} onOpen={openTask} />
                ))}
              </div>
            </section>
          )}

          {grouped.ready.length > 0 && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">可以直接进入待办</h3>
                  <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">已有项目和日期，确认后就不再留在收件箱。</p>
                </div>
                <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{grouped.ready.length} 项</span>
              </div>
              <div className="divide-y divide-border-light/70 overflow-hidden rounded-xl border border-border-light bg-surface-light dark:divide-border-dark/50 dark:border-border-dark dark:bg-surface-dark">
                {grouped.ready.map((task) => (
                  <InboxTaskRow key={task.id} task={task} projects={projects} onOpen={openTask} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContent>
  );
};

export default Inbox;
