/**
 * Activity Feed Page
 *
 * Displays a chronological feed of activity events across all modules
 * with filtering, grouping by day, and personal analytics.
 *
 * Uses react-window v2 List for virtualized rendering to handle up to 10,000
 * events without DOM performance degradation.
 */

import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { List } from 'react-window';
import { AutoSizer } from 'react-virtualized-auto-sizer';
import { Activity as ActivityIcon, CheckCircle2, ListTodo } from 'lucide-react';
import { useActivityStore } from '../stores/useActivityStore';
import type { ModuleType, ActivityFilter, ActivityEvent } from '../stores/useActivityStore';
import { PageContent } from '../components/PageContent';
import { EmptyState } from '../components/EmptyState';
import { useKanbanStore } from '../stores/useKanbanStore';
import { toLocalDateKey } from '../utils/todayTasks';
import { useNotesStore } from '../stores/useNotesStore';
import { appendMarkdownToLexical } from '../utils/markdownToLexical';
import { toast } from '../stores/useToastStore';

// Lazy-load analytics components since they pull in Recharts (~200KB)
const ActivityHeatmap = lazy(() => import('../components/Analytics/ActivityHeatmap').then(m => ({ default: m.ActivityHeatmap })));
const ModuleUsageChart = lazy(() => import('../components/Analytics/ModuleUsageChart').then(m => ({ default: m.ModuleUsageChart })));
const ProductivityTrends = lazy(() => import('../components/Analytics/ProductivityTrends').then(m => ({ default: m.ProductivityTrends })));

const MODULE_ICONS: Record<ModuleType, string> = {
  notes: '\u{1F4DD}',
  tasks: '\u2705',
  calendar: '\u{1F4C5}',
  docs: '\u{1F4C4}',
  'time-tracking': '\u23F1\uFE0F',
  habits: '\u{1F3AF}',
  links: '\u{1F517}',
  ai: '\u{1F916}',
  forms: '\u{1F4CB}',
  diagrams: '\u{1F537}',
};

const MODULE_LABELS: Record<ModuleType, string> = {
  notes: '笔记',
  tasks: '任务',
  calendar: '日历',
  docs: '文档',
  'time-tracking': '时间跟踪',
  habits: '习惯',
  links: '链接',
  ai: 'AI',
  forms: '表单',
  diagrams: '绘图',
};

const MODULE_COLORS: Record<ModuleType, string> = {
  notes: 'bg-amber-500/20 text-amber-400',
  tasks: 'bg-green-500/20 text-green-400',
  calendar: 'bg-blue-500/20 text-blue-400',
  docs: 'bg-purple-500/20 text-purple-400',
  'time-tracking': 'bg-cyan-500/20 text-cyan-400',
  habits: 'bg-rose-500/20 text-rose-400',
  links: 'bg-indigo-500/20 text-indigo-400',
  ai: 'bg-emerald-500/20 text-emerald-400',
  forms: 'bg-orange-500/20 text-orange-400',
  diagrams: 'bg-teal-500/20 text-teal-400',
};

const MODULE_ROUTES: Record<ModuleType, string> = {
  notes: '/notes',
  tasks: '/tasks',
  calendar: '/schedule',
  docs: '/create',
  'time-tracking': '/schedule',
  habits: '/tasks?tab=habits',
  links: '/links',
  ai: '/ai',
  forms: '/create?tab=forms',
  diagrams: '/create?tab=diagrams',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  created: '已创建',
  updated: '已更新',
  deleted: '已删除',
  completed: '已完成',
  viewed: '已查看',
};

type DateRange = 'today' | '7d' | '30d' | 'all';

/** Row height in pixels for virtualized list items */
const EVENT_ROW_HEIGHT = 44;
/** Row height for day header separators */
const DAY_HEADER_HEIGHT = 36;

/**
 * Flattened row item: either a day header or an event row.
 * This allows react-window to virtualize a mixed list of headers and events.
 */
type FlatRow =
  | { type: 'day-header'; dayKey: string }
  | { type: 'event'; event: AggregatedActivityEvent };

interface AggregatedActivityEvent extends ActivityEvent {
  repeatCount: number;
}

export function collapseNoisyActivities(events: ActivityEvent[]): AggregatedActivityEvent[] {
  const collapsed: AggregatedActivityEvent[] = [];
  const mergeWindowMs = 5 * 60 * 1000;
  for (const event of events) {
    const previous = collapsed[collapsed.length - 1];
    const isNoisyUpdate = event.type === 'updated' || event.type === 'viewed';
    const canMerge = previous && isNoisyUpdate && previous.type === event.type &&
      previous.module === event.module && previous.entityId === event.entityId &&
      Math.abs(new Date(previous.timestamp).getTime() - new Date(event.timestamp).getTime()) <= mergeWindowMs;
    if (canMerge) {
      previous.repeatCount += 1;
    } else {
      collapsed.push({ ...event, repeatCount: 1 });
    }
  }
  return collapsed;
}

function getEntityPath(event: ActivityEvent): string {
  const encodedId = encodeURIComponent(event.entityId);
  if (event.module === 'notes') return `/notes?note=${encodedId}`;
  if (event.module === 'tasks') return `/tasks?tab=tasks&task=${encodedId}`;
  if (event.module === 'docs') return `/create/${encodedId}`;
  if (event.module === 'diagrams') return `/diagrams/${encodedId}`;
  return MODULE_ROUTES[event.module] || '/';
}

/** Props passed to every row via react-window's rowProps */
interface RowExtraProps {
  flatRows: FlatRow[];
  navigate: (path: string) => void;
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString();
}

function getDateRangeFilter(range: DateRange): { startDate?: string } {
  if (range === 'all') return {};
  const now = new Date();
  const start = new Date(now);
  if (range === 'today') start.setHours(0, 0, 0, 0);
  else if (range === '7d') start.setDate(start.getDate() - 7);
  else if (range === '30d') start.setDate(start.getDate() - 30);
  return { startDate: start.toISOString() };
}

function formatDayHeader(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return '今天';
  if (date.getTime() === yesterday.getTime()) return '昨天';
  return date.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Memoized event row component to prevent unnecessary re-renders
 * in the virtualized list.
 */
const EventRow = React.memo(function EventRow({
  event,
  navigate,
}: {
  event: AggregatedActivityEvent;
  navigate: (path: string) => void;
}) {
  return (
    <button
      onClick={() => navigate(getEntityPath(event))}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-all text-left group"
    >
      <span className="text-lg flex-shrink-0">{event.entityIcon || MODULE_ICONS[event.module]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
            {EVENT_TYPE_LABELS[event.type] || event.type} {event.entityTitle}
          </span>
          {event.repeatCount > 1 && (
            <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">×{event.repeatCount}</span>
          )}
        </div>
      </div>
      <span className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full ${MODULE_COLORS[event.module]}`}>
        {MODULE_LABELS[event.module]}
      </span>
      <span className="flex-shrink-0 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
        {getRelativeTime(event.timestamp)}
      </span>
    </button>
  );
});

/**
 * Row component for react-window v2 List.
 * Receives index, style, and rowProps (flatRows + navigate).
 */
function VirtualRow({
  index,
  style,
  flatRows,
  navigate,
}: {
  index: number;
  style: React.CSSProperties;
  flatRows: FlatRow[];
  navigate: (path: string) => void;
}) {
  const row = flatRows[index];
  if (row.type === 'day-header') {
    return (
      <div style={style} className="flex items-end px-3 pb-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">
          {formatDayHeader(row.dayKey)}
        </h3>
      </div>
    );
  }
  return (
    <div style={style}>
      <EventRow event={row.event} navigate={navigate} />
    </div>
  );
}

export const ActivityFeed: React.FC = () => {
  const navigate = useNavigate();
  const getActivities = useActivityStore((s) => s.getActivities);
  const events = useActivityStore((s) => s.events);
  const tasks = useKanbanStore((s) => s.tasks);
  const updateTask = useKanbanStore((s) => s.updateTask);
  const archiveTask = useKanbanStore((s) => s.archiveTask);
  const addTask = useKanbanStore((s) => s.addTask);
  const getOrCreateDailyNote = useNotesStore((s) => s.getOrCreateDailyNote);
  const updateNote = useNotesStore((s) => s.updateNote);

  const [moduleFilter, setModuleFilter] = useState<ModuleType | ''>('');
  const [dateRange, setDateRange] = useState<DateRange>('all');
  const [activeTab, setActiveTab] = useState<'review' | 'feed' | 'analytics'>('review');
  const [learning, setLearning] = useState('');
  const [energy, setEnergy] = useState('');
  const [nextActions, setNextActions] = useState('');

  const filter: ActivityFilter = useMemo(() => {
    const f: ActivityFilter = {};
    if (moduleFilter) f.module = moduleFilter;
    const rangeFilter = getDateRangeFilter(dateRange);
    if (rangeFilter.startDate) f.startDate = rangeFilter.startDate;
    return f;
  }, [moduleFilter, dateRange]);

  const rawFilteredEvents = useMemo(() => getActivities(filter), [events, filter, getActivities]);
  const filteredEvents = useMemo(() => collapseNoisyActivities(rawFilteredEvents), [rawFilteredEvents]);
  const mergedEventCount = rawFilteredEvents.length - filteredEvents.length;

  const completedResults = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return tasks
      .filter((task) => task.status === 'done' && new Date(task.lastCompletedAt ?? task.created).getTime() >= cutoff)
      .sort((a, b) => new Date(b.lastCompletedAt ?? b.created).getTime() - new Date(a.lastCompletedAt ?? a.created).getTime())
      .slice(0, 8);
  }, [tasks]);

  const openLoops = useMemo(() => {
    const todayKey = toLocalDateKey(new Date());
    return tasks
      .filter((task) => !task.archivedAt && task.status !== 'done' && (
        (task.dueDate !== null && task.dueDate <= todayKey) ||
        task.status === 'inprogress' || task.status === 'review'
      ))
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      .slice(0, 8);
  }, [tasks]);

  const decideOpenLoop = useCallback((taskId: string, decision: 'tomorrow' | 'someday' | 'abandon') => {
    if (decision === 'abandon') {
      archiveTask(taskId);
      toast.success('已放弃并归档');
      return;
    }
    if (decision === 'someday') {
      updateTask(taskId, { dueDate: null, whenTag: 'someday', status: 'backlog' });
      toast.success('已移到以后');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    updateTask(taskId, { dueDate: toLocalDateKey(tomorrow), whenTag: 'upcoming', status: 'todo' });
    toast.success('已安排到明天');
  }, [archiveTask, updateTask]);

  const saveDailyReview = useCallback(() => {
    const actionTitles = nextActions.split('\n').map((item) => item.trim()).filter(Boolean).slice(0, 3);
    const completedLines = completedResults.length > 0
      ? completedResults.map((task) => `- ${task.title}`).join('\n')
      : '- 暂无完成记录';
    const reviewMarkdown = `## 日回顾

### 完成了什么
${completedLines}

### 学到了什么
${learning.trim() || '暂无记录'}

### 精力如何
${energy ? `${energy}/10` : '暂无记录'}

### 下一轮三件事
${actionTitles.length > 0 ? actionTitles.map((title) => `- [ ] ${title}`).join('\n') : '- [ ] 暂无'}
`;
    const note = getOrCreateDailyNote(new Date());
    updateNote(note.id, {
      content: appendMarkdownToLexical(note.content, reviewMarkdown),
      contentText: `${note.contentText || ''}\n\n${reviewMarkdown}`.trim(),
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (const title of actionTitles) {
      addTask({
        title,
        description: '来自日回顾',
        status: 'todo',
        startDate: null,
        dueDate: toLocalDateKey(tomorrow),
        priority: 'medium',
        tags: ['日回顾'],
        projectIds: [],
      });
    }
    setLearning('');
    setEnergy('');
    setNextActions('');
    toast.success(actionTitles.length > 0 ? `回顾已写入每日笔记，并创建 ${actionTitles.length} 个任务` : '回顾已写入每日笔记');
    navigate(`/notes?note=${encodeURIComponent(note.id)}`);
  }, [addTask, completedResults, energy, getOrCreateDailyNote, learning, navigate, nextActions, updateNote]);

  /**
   * Flatten grouped events into a single array of FlatRow items
   * for react-window virtualization. Day headers and events are
   * interleaved so the virtualizer can render them as variable-height rows.
   */
  const flatRows: FlatRow[] = useMemo(() => {
    const rows: FlatRow[] = [];
    let currentDay = '';
    for (const event of filteredEvents) {
      const dayKey = event.timestamp.split('T')[0];
      if (dayKey !== currentDay) {
        currentDay = dayKey;
        rows.push({ type: 'day-header', dayKey });
      }
      rows.push({ type: 'event', event });
    }
    return rows;
  }, [filteredEvents]);

  /** Returns the pixel height of each row based on whether it's a header or event */
  const getItemSize = useCallback(
    (index: number): number => {
      const row = flatRows[index];
      return row.type === 'day-header' ? DAY_HEADER_HEIGHT : EVENT_ROW_HEIGHT;
    },
    [flatRows],
  );

  /** Stable rowProps object for react-window v2 */
  const rowProps: RowExtraProps = useMemo(
    () => ({ flatRows, navigate }),
    [flatRows, navigate],
  );

  const allModules: ModuleType[] = ['notes', 'tasks', 'calendar', 'docs', 'time-tracking', 'habits', 'links', 'ai', 'forms', 'diagrams'];

  return (
    <PageContent page="activity" variant="full-height">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 border-b border-border-light dark:border-border-dark">
        <div>
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">工作记录</h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-0.5">
            {activeTab === 'review' ? '关闭开放循环，决定下一轮' : `${filteredEvents.length} 个事件${mergedEventCount > 0 ? ` · 已合并 ${mergedEventCount} 条重复更新` : ''}`}
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-1 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg p-1">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'review' ? 'bg-accent-primary text-white' : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'}`}
          >
            回顾
          </button>
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'feed'
                ? 'bg-accent-primary text-white'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
            }`}
          >
            动态
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === 'analytics'
                ? 'bg-accent-primary text-white'
                : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
            }`}
          >
            分析
          </button>
        </div>
      </div>

      {activeTab === 'review' ? (
        <div className="flex-1 overflow-y-auto px-4 py-5 md:px-6">
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border-light bg-surface-light-elevated p-5 dark:border-border-dark dark:bg-surface-dark-elevated">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">最近七天完成的成果</h3>
                <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{completedResults.length} 项</span>
              </div>
              {completedResults.length === 0 ? (
                <EmptyState size="sm" icon={CheckCircle2} title="还没有完成记录" description="从一个小的下一步开始，完成后会在这里留下成果。" action={{ label: '处理今天', onClick: () => navigate('/today'), variant: 'secondary' }} />
              ) : (
                <div className="mt-3 space-y-1">
                  {completedResults.map((task) => (
                    <button key={task.id} onClick={() => navigate(`/tasks?tab=tasks&task=${encodeURIComponent(task.id)}`)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-text-light-primary hover:bg-surface-light dark:text-text-dark-primary dark:hover:bg-surface-dark">
                      <span className="text-accent-green">✓</span><span className="truncate">{task.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border-light bg-surface-light-elevated p-5 dark:border-border-dark dark:bg-surface-dark-elevated">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">需要决定的开放循环</h3>
                <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{openLoops.length} 项</span>
              </div>
              {openLoops.length === 0 ? (
                <EmptyState size="sm" icon={ListTodo} title="没有待决定的遗留项" description="保持这个节奏；新的任务会在这里等待你决定下一步。" action={{ label: '查看任务', onClick: () => navigate('/tasks'), variant: 'secondary' }} />
              ) : (
                <div className="mt-3 space-y-1">
                  {openLoops.map((task) => (
                    <div key={task.id} className="rounded-lg border border-border-light px-3 py-2 dark:border-border-dark">
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={() => navigate(`/tasks?tab=tasks&task=${encodeURIComponent(task.id)}`)} className="truncate text-left text-sm text-text-light-primary hover:text-accent-primary dark:text-text-dark-primary">{task.title}</button>
                        <span className="shrink-0 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{task.dueDate && task.dueDate < toLocalDateKey(new Date()) ? '已逾期' : '待决定'}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" onClick={() => decideOpenLoop(task.id, 'tomorrow')} className="min-h-8 rounded-md bg-accent-primary/10 px-2.5 text-xs text-accent-primary">明天</button>
                        <button type="button" onClick={() => decideOpenLoop(task.id, 'someday')} className="min-h-8 rounded-md bg-surface-light px-2.5 text-xs text-text-light-secondary dark:bg-surface-dark dark:text-text-dark-secondary">以后</button>
                        <button type="button" onClick={() => decideOpenLoop(task.id, 'abandon')} className="min-h-8 rounded-md px-2.5 text-xs text-status-error-text hover:bg-status-error-bg">放弃并归档</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          <section className="mt-5 rounded-xl border border-border-light bg-surface-light-elevated p-5 dark:border-border-dark dark:bg-surface-dark-elevated">
            <div>
              <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">沉淀并决定下一轮</h3>
              <p className="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">保存后会追加到今天的每日笔记；下一轮事项会创建为明天的任务。</p>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_10rem]">
              <label className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                学到了什么
                <textarea value={learning} onChange={(event) => setLearning(event.target.value)} rows={3} placeholder="记录一条可复用的经验…" className="mt-2 w-full resize-none rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm font-normal outline-none focus:border-accent-primary dark:border-border-dark dark:bg-surface-dark" />
              </label>
              <label className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                今日精力（可选）
                <select value={energy} onChange={(event) => setEnergy(event.target.value)} className="mt-2 w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm font-normal dark:border-border-dark dark:bg-surface-dark">
                  <option value="">未记录</option>
                  {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}/10</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              下一轮三件事（每行一项）
              <textarea value={nextActions} onChange={(event) => setNextActions(event.target.value)} rows={3} placeholder={'第一件事\n第二件事\n第三件事'} className="mt-2 w-full resize-none rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm font-normal outline-none focus:border-accent-primary dark:border-border-dark dark:bg-surface-dark" />
            </label>
            <button type="button" onClick={saveDailyReview} className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white">保存回顾并创建下一轮</button>
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={() => navigate('/today')} className="rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white">处理今天</button>
            <button onClick={() => navigate('/retrospective')} className="rounded-lg border border-border-light px-4 py-2 text-sm font-medium text-text-light-primary dark:border-border-dark dark:text-text-dark-primary">开始每周回顾</button>
            <button onClick={() => setActiveTab('feed')} className="rounded-lg border border-border-light px-4 py-2 text-sm text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary">展开活动记录</button>
          </div>
        </div>
      ) : activeTab === 'feed' ? (
        <>
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 py-3 md:px-6 border-b border-border-light dark:border-border-dark">
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value as ModuleType | '')}
              className="h-9 rounded-lg border border-border-light bg-surface-light-elevated px-3 text-sm text-text-light-primary focus:outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary"
            >
              <option value="">全部模块</option>
              {allModules.map((m) => (
                <option key={m} value={m}>
                  {MODULE_ICONS[m]} {MODULE_LABELS[m]}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg p-0.5 border border-border-light dark:border-border-dark">
              {(['today', '7d', '30d', 'all'] as DateRange[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                    dateRange === r
                      ? 'bg-accent-primary text-white'
                      : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                  }`}
                >
                  {r === 'today' ? '今天' : r === '7d' ? '7 天' : r === '30d' ? '30 天' : '全部'}
                </button>
              ))}
            </div>
          </div>

          {/* Virtualized Event List */}
          <div className="flex-1 min-h-0 px-4 py-4 md:px-6">
            {filteredEvents.length === 0 ? (
              <EmptyState size="md" icon={ActivityIcon} title="还没有动态" description="创建笔记、完成任务或记录时间后，这里会形成你的工作时间线。" action={{ label: '处理今天', onClick: () => navigate('/today') }} />
            ) : (
              <AutoSizer
                renderProp={({ height, width }) => {
                  if (!height || !width) return null;
                  return (
                    <List<RowExtraProps>
                      style={{ width, height }}
                      rowCount={flatRows.length}
                      rowHeight={getItemSize}
                      overscanCount={15}
                      rowProps={rowProps}
                      rowComponent={VirtualRow}
                    />
                  );
                }}
              />
            )}
          </div>
        </>
      ) : (
        /* Analytics Tab */
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 md:px-6">
          <Suspense fallback={<div className="h-48 rounded-xl border border-border-light dark:border-border-dark animate-pulse bg-surface-light-elevated dark:bg-surface-dark-elevated" />}>
            <ActivityHeatmap />
          </Suspense>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Suspense fallback={<div className="h-48 rounded-xl border border-border-light dark:border-border-dark animate-pulse bg-surface-light-elevated dark:bg-surface-dark-elevated" />}>
              <ModuleUsageChart />
            </Suspense>
            <Suspense fallback={<div className="h-48 rounded-xl border border-border-light dark:border-border-dark animate-pulse bg-surface-light-elevated dark:bg-surface-dark-elevated" />}>
              <ProductivityTrends />
            </Suspense>
          </div>
        </div>
      )}
    </PageContent>
  );
};

export default ActivityFeed;
