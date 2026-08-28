import React, { useMemo, useState } from 'react';
import { ArrowRight, Inbox as InboxIcon, ListChecks, SlidersHorizontal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageContent } from '../components/PageContent';
import { TriageInbox } from '../components/tasks/TriageInbox';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useProjectContextStore } from '../stores/useProjectContextStore';
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

function InboxTaskCard({
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

  return (
    <article className="rounded-xl border border-border-light bg-surface-light p-4 transition-colors hover:border-accent-primary/35 dark:border-border-dark dark:bg-surface-dark">
      <div className="flex items-start gap-3">
        <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${priorityDot[task.priority]}`} aria-label={`${PRIORITY_LABELS[task.priority]}优先级`} />
        <button
          type="button"
          onClick={() => onOpen(task)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            {task.cardNumber && (
              <span className="text-[11px] font-mono text-text-light-tertiary dark:text-text-dark-tertiary">
                KAN-{task.cardNumber}
              </span>
            )}
            <h3 className="truncate text-[15px] font-semibold text-text-light-primary dark:text-text-dark-primary">
              {task.title}
            </h3>
          </div>
          {task.description && (
            <p className="mt-1 line-clamp-2 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {task.description}
            </p>
          )}
        </button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
        <label className="sr-only" htmlFor={`inbox-project-${task.id}`}>所属项目</label>
        <select
          id={`inbox-project-${task.id}`}
          value={task.projectIds[0] ?? ''}
          onChange={(event) => updateTask(task.id, { projectIds: event.target.value ? [event.target.value] : [] })}
          className="h-9 min-w-0 rounded-lg border border-border-light bg-surface-light px-2.5 text-sm text-text-light-secondary outline-none focus:border-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-secondary"
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
          className="h-9 rounded-lg border border-border-light bg-surface-light px-2.5 text-sm text-text-light-secondary outline-none focus:border-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-secondary"
        />

        <button
          type="button"
          onClick={() => moveTask(task.id, 'todo')}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          安排
          <ArrowRight className="h-3.5 w-3.5" />
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
            新想法可以继续从首页快速收集，明确后再安排到任务或日程。
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
              <div className="grid gap-3 xl:grid-cols-2">
                {grouped.needsArrangement.map((task) => (
                  <InboxTaskCard key={task.id} task={task} projects={projects} onOpen={openTask} />
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
              <div className="grid gap-3 xl:grid-cols-2">
                {grouped.ready.map((task) => (
                  <InboxTaskCard key={task.id} task={task} projects={projects} onOpen={openTask} />
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
