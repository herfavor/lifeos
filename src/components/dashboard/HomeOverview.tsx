import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  FolderKanban,
  Inbox,
  Plus,
  Target,
} from 'lucide-react';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useNotesStore } from '../../stores/useNotesStore';
import { useProjectContextStore } from '../../stores/useProjectContextStore';
import { getTodayTasks, toLocalDateKey } from '../../utils/todayTasks';

const FLOW_STEPS = [
  { label: '收集', hint: '先记下来', path: '/tasks?tab=inbox', icon: Inbox },
  { label: '安排', hint: '放进今天', path: '/today', icon: CalendarDays },
  { label: '专注', hint: '推进下一步', path: '/focus', icon: Target },
  { label: '沉淀', hint: '记下结果', path: '/notes', icon: FileText },
  { label: '回顾', hint: '开始下一轮', path: '/activity', icon: CheckCircle2 },
] as const;

const priorityRank = { high: 0, medium: 1, low: 2 } as const;

function safeTimestamp(value: string | Date): number {
  const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDateKeys(date: Date): string[] {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return [`${year}-${month}-${day}`, `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`];
}

export const HomeOverview: React.FC = () => {
  const navigate = useNavigate();
  const tasks = useKanbanStore((state) => state.tasks);
  const updateTask = useKanbanStore((state) => state.updateTask);
  const addTask = useKanbanStore((state) => state.addTask);
  const events = useCalendarStore((state) => state.events);
  const notes = useNotesStore((state) => state.notes);
  const createNote = useNotesStore((state) => state.createNote);
  const projects = useProjectContextStore((state) => state.projects);

  const [captureType, setCaptureType] = useState<'task' | 'note'>('task');
  const [captureText, setCaptureText] = useState('');
  const [captureStatus, setCaptureStatus] = useState('');

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => toLocalDateKey(today), [today]);

  const allTodayTasks = useMemo(
    () => getTodayTasks(tasks, today),
    [tasks, today]
  );

  const todayTasks = useMemo(
    () => allTodayTasks.slice(0, 6),
    [allTodayTasks]
  );

  const todayEvents = useMemo(() => {
    const seen = new Set<string>();
    return getDateKeys(today)
      .flatMap((key) => events[key] ?? [])
      .filter((event) => {
        if (seen.has(event.id)) return false;
        seen.add(event.id);
        return true;
      })
      .sort((a, b) => (a.startTime ?? '24:00').localeCompare(b.startTime ?? '24:00'))
      .slice(0, 5);
  }, [events, today]);

  const recentNotes = useMemo(
    () =>
      Object.values(notes)
        .filter((note) => !note.isArchived && !note.deletedAt)
        .sort((a, b) => safeTimestamp(b.updatedAt) - safeTimestamp(a.updatedAt))
        .slice(0, 4),
    [notes]
  );

  const activeProjects = useMemo(
    () =>
      projects
        .filter((project) => !project.archivedAt)
        .map((project) => {
          const projectTasks = tasks.filter((task) => task.projectIds?.includes(project.id) && task.status !== 'done');
          const nextTask = [...projectTasks].sort((a, b) => {
            const priority = priorityRank[a.priority] - priorityRank[b.priority];
            if (priority !== 0) return priority;
            return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
          })[0];
          return { project, openCount: projectTasks.length, nextTask };
        })
        .sort((a, b) => b.openCount - a.openCount)
        .slice(0, 3),
    [projects, tasks]
  );

  const overdueCount = useMemo(
    () => tasks.filter((task) => task.status !== 'done' && !task.archivedAt && task.dueDate && task.dueDate < todayIso).length,
    [tasks, todayIso]
  );

  const inboxCount = useMemo(
    () => tasks.filter((task) => task.status === 'backlog' && !task.archivedAt).length,
    [tasks]
  );

  const focusTask = todayTasks[0];
  const greeting = today.getHours() < 12 ? '早上好' : today.getHours() < 18 ? '下午好' : '晚上好';

  const handleCapture = (event: React.FormEvent) => {
    event.preventDefault();
    const title = captureText.trim();
    if (!title) return;

    if (captureType === 'task') {
      addTask({
        title,
        description: '',
        status: 'backlog',
        startDate: null,
        dueDate: null,
        priority: 'medium',
        tags: [],
        projectIds: [],
      });
      setCaptureStatus('已收进任务收件箱');
      setCaptureText('');
      return;
    }

    const note = createNote({
      title,
      contentText: '',
      tags: [],
    });
    setCaptureText('');
    navigate(`/notes?note=${encodeURIComponent(note.id)}`);
  };

  return (
    <div className="space-y-4 pb-2" data-testid="home-overview">
      <section className="relative overflow-hidden rounded-3xl bg-text-light-primary text-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.75)] dark:bg-surface-dark-elevated">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-accent-primary/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-36 left-1/3 h-72 w-72 rounded-full bg-accent-cyan/10 blur-3xl" />

        <div className="relative grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:px-8 lg:py-6">
          <div className="flex min-w-0 flex-col justify-between">
            <div>
              <p className="text-sm font-semibold text-white/65">{greeting}，这里是你的今日工作台</p>
              <h2 className="mt-1.5 max-w-xl text-[28px] font-bold tracking-tight text-white leading-tight">
                {focusTask ? '现在，只推进这一件事。' : '先决定今天最重要的一步。'}
              </h2>

              {focusTask ? (
                <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-sm">
                  <button
                    type="button"
                    onClick={() => updateTask(focusTask.id, { status: 'done' })}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/25 text-white transition hover:bg-white/10"
                    aria-label={`完成任务：${focusTask.title}`}
                  >
                    <Circle className="h-5 w-5" />
                  </button>
                  <button type="button" onClick={() => navigate('/today')} className="min-w-0 flex-1 text-left">
                    <span className="block text-xs font-medium text-white/55">当前焦点</span>
                    <span className="mt-0.5 block truncate text-base font-semibold text-white">{focusTask.title}</span>
                  </button>
                  <Link
                    to={`/focus?task=${encodeURIComponent(focusTask.id)}`}
                    className="hidden shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-text-light-primary transition hover:bg-white/90 sm:inline-flex"
                  >
                    开始专注 <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
                  不需要把一天塞满。先从收件箱选出真正值得完成的一件事。
                </p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2" aria-label="今日概览">
              <Link to="/today" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/15">
                今日 {allTodayTasks.length} 项
              </Link>
              <Link to="/tasks?tab=inbox" className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/15">
                待分拣 {inboxCount} 项
              </Link>
              <Link to="/tasks" className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${overdueCount > 0 ? 'bg-status-error/25 text-white' : 'bg-white/10 text-white/80 hover:bg-white/15'}`}>
                {overdueCount > 0 ? `逾期 ${overdueCount} 项` : '没有逾期'}
              </Link>
            </div>
          </div>

          <form onSubmit={handleCapture} className="self-center rounded-2xl border border-white/15 bg-white/10 p-3.5 backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">快速收集</p>
                <p className="mt-0.5 text-xs text-white/55">先接住，稍后再整理</p>
              </div>
              <div className="flex rounded-lg bg-black/15 p-1" aria-label="快速记录类型">
                {(['task', 'note'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setCaptureType(type);
                      setCaptureStatus('');
                    }}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      captureType === type ? 'bg-white text-text-light-primary' : 'text-white/65 hover:text-white'
                    }`}
                  >
                    {type === 'task' ? '任务' : '笔记'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label htmlFor="home-quick-capture" className="sr-only">
                {captureType === 'task' ? '记录一个待办事项' : '记录一篇笔记标题'}
              </label>
              <input
                id="home-quick-capture"
                value={captureText}
                onChange={(event) => {
                  setCaptureText(event.target.value);
                  setCaptureStatus('');
                }}
                placeholder={captureType === 'task' ? '有什么需要记住？' : '这个想法叫什么？'}
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-white/25 bg-white/10 px-4 text-base text-white outline-none transition placeholder:text-white/50 focus:border-white focus:ring-2 focus:ring-white/25"
              />
              <button
                type="submit"
                disabled={!captureText.trim()}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-text-light-primary shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
                收进来
              </button>
            </div>
            <div className="mt-2 min-h-4 text-right text-xs text-white/65" aria-live="polite">
              {captureStatus || '回车即可保存到本机'}
            </div>
          </form>
        </div>
      </section>

      <section className="rounded-2xl border border-border-light bg-surface-light px-3 py-3 shadow-[0_10px_30px_-28px_rgba(15,23,42,0.6)] dark:border-border-dark dark:bg-surface-dark-elevated">
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-light-tertiary dark:text-text-dark-tertiary">你的工作循环</p>
          <p className="hidden text-xs text-text-light-tertiary sm:block dark:text-text-dark-tertiary">每次只走到下一步</p>
        </div>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-5" aria-label="LifeOS 工作流">
          {FLOW_STEPS.map(({ label, hint, path, icon: Icon }, index) => (
            <Link
              key={label}
              to={path}
              className="group relative flex items-center gap-2.5 rounded-xl px-3 py-3 transition-colors hover:bg-surface-light-elevated dark:hover:bg-surface-dark"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-light-elevated text-text-light-secondary transition group-hover:bg-accent-primary group-hover:text-white dark:bg-surface-dark-elevated dark:text-text-dark-secondary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{label}</span>
                <span className="block truncate text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{hint}</span>
              </span>
              {index < FLOW_STEPS.length - 1 && (
                <ArrowRight className="absolute -right-1 top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-border-light sm:block dark:text-border-dark" />
              )}
            </Link>
          ))}
        </nav>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.72fr)]">
        <div className="rounded-2xl border border-border-light bg-surface-light p-5 shadow-[0_14px_40px_-34px_rgba(15,23,42,0.65)] dark:border-border-dark dark:bg-surface-dark-elevated lg:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-primary">今天的节奏</p>
              <h3 className="mt-1 text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">安排少一点，完成重要的</h3>
              <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {today.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>
            <Link to="/today" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-accent-primary hover:bg-accent-primary/5">
              打开今天 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {todayTasks.length === 0 && todayEvents.length === 0 ? (
            <div className="mt-5 flex flex-col items-start justify-between gap-4 rounded-2xl bg-surface-light-elevated px-5 py-5 dark:bg-surface-dark sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                  <Target className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-text-light-primary dark:text-text-dark-primary">今天还没有选定重点</p>
                  <p className="mt-0.5 text-sm text-text-light-secondary dark:text-text-dark-secondary">从收件箱安排一件事，给今天一个清晰起点。</p>
                </div>
              </div>
              <Link to="/today" className="inline-flex min-h-10 shrink-0 items-center rounded-xl bg-accent-primary px-4 text-sm font-semibold text-white hover:brightness-105">
                安排今天
              </Link>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(15rem,0.85fr)]">
              <div className="space-y-1">
                {todayTasks.map((task) => (
                  <div key={task.id} className="group flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark">
                    <button
                      type="button"
                      onClick={() => updateTask(task.id, { status: 'done' })}
                      className="mt-0.5 text-text-light-tertiary transition-colors hover:text-accent-primary dark:text-text-dark-tertiary"
                      aria-label={`完成任务：${task.title}`}
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <button type="button" onClick={() => navigate('/tasks')} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">{task.title}</span>
                      <span className={`mt-0.5 block text-xs ${task.dueDate && task.dueDate < todayIso ? 'text-accent-red' : 'text-text-light-tertiary dark:text-text-dark-tertiary'}`}>
                        {task.dueDate ? (task.dueDate < todayIso ? `已逾期 · ${task.dueDate}` : `截止 ${task.dueDate}`) : '正在进行'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
              <div className="rounded-xl bg-surface-light-elevated p-3 dark:bg-surface-dark">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">今日日程</h4>
                  <Link to="/schedule" className="text-xs font-semibold text-accent-primary">全部</Link>
                </div>
                <div className="space-y-1">
                  {todayEvents.length > 0 ? todayEvents.map((event) => (
                    <button key={event.id} type="button" onClick={() => navigate('/schedule')} className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left hover:bg-surface-light dark:hover:bg-surface-dark-elevated">
                      <span className="w-12 shrink-0 text-xs font-semibold text-accent-primary">{event.startTime ?? '全天'}</span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{event.title}</span>
                    </button>
                  )) : (
                    <p className="px-2 py-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">今天没有日程冲突。</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <aside className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark-elevated">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                <FolderKanban className="h-4.5 w-4.5 text-accent-primary" /> 正在推进
              </h3>
              <Link to="/pm" className="text-xs font-semibold text-accent-primary">全部</Link>
            </div>
            <div className="mt-3 space-y-1">
              {activeProjects.length > 0 ? activeProjects.map(({ project, openCount, nextTask }) => (
                <Link key={project.id} to="/pm" className="block rounded-xl px-2 py-2.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark">
                  <span className="flex items-center gap-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: project.color }} />
                    <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    <span className="text-xs font-normal text-text-light-tertiary dark:text-text-dark-tertiary">{openCount}</span>
                  </span>
                  <span className="mt-1 block truncate pl-4 text-xs text-text-light-secondary dark:text-text-dark-secondary">{nextTask ? `下一步：${nextTask.title}` : '还没有设置下一步'}</span>
                </Link>
              )) : (
                <Link to="/pm" className="block rounded-xl bg-surface-light-elevated px-3 py-3 text-sm text-text-light-secondary dark:bg-surface-dark dark:text-text-dark-secondary">创建项目，把相关行动串起来。</Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border-light bg-surface-light p-5 dark:border-border-dark dark:bg-surface-dark-elevated">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                <FileText className="h-4.5 w-4.5 text-accent-primary" /> 最近笔记
              </h3>
              <Link to="/notes" className="text-xs font-semibold text-accent-primary">全部</Link>
            </div>
            <div className="mt-3 space-y-1">
              {recentNotes.length > 0 ? recentNotes.map((note) => (
                <Link key={note.id} to={`/notes?note=${encodeURIComponent(note.id)}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-light-elevated dark:hover:bg-surface-dark">
                  <FileText className="h-4 w-4 shrink-0 text-text-light-tertiary dark:text-text-dark-tertiary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{note.title || '无标题笔记'}</span>
                </Link>
              )) : (
                <Link to="/notes" className="flex items-center gap-2 rounded-xl bg-surface-light-elevated px-3 py-3 text-sm text-text-light-secondary dark:bg-surface-dark dark:text-text-dark-secondary"><Plus className="h-4 w-4" /> 写下第一个想法</Link>
              )}
            </div>
          </div>
        </aside>
      </section>

      <p className="flex items-center justify-center gap-2 py-1 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
        <Check className="h-3.5 w-3.5" /> 所有内容默认只保存在当前设备
      </p>
    </div>
  );
};

export default HomeOverview;
