/**
 * Portfolio Page
 *
 * Cross-project dashboard showing aggregate metrics,
 * health status, and timelines across all projects.
 *
 * Route: /portfolio
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  List,
  GanttChart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useProjectContextStore } from '../stores/useProjectContextStore';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { PageContent } from '../components/PageContent';
import { PortfolioTimeline } from '../components/portfolio/PortfolioTimeline';
import { PortfolioMetrics } from '../components/portfolio/PortfolioMetrics';
import type { ProjectContext, Task } from '../types';

type ViewMode = 'cards' | 'list' | 'timeline';

interface ProjectSummary {
  project: ProjectContext;
  openCount: number;
  inProgressCount: number;
  doneCount: number;
  overdueCount: number;
  totalCount: number;
  completionPercent: number;
  health: 'green' | 'yellow' | 'red' | null;
  hoursThisWeek: number;
  nextDeadline: string | null;
}

function getHealth(completionPercent: number, overdueCount: number, totalCount: number): ProjectSummary['health'] {
  if (totalCount === 0) return null;
  if (overdueCount > 3) return 'red';
  if (overdueCount > 0) return 'yellow';
  if (completionPercent >= 75) return 'green';
  if (completionPercent >= 40) return 'yellow';
  return 'red';
}

function getHealthColor(health: ProjectSummary['health']): string {
  switch (health) {
    case 'green': return 'bg-accent-green';
    case 'yellow': return 'bg-accent-yellow';
    case 'red': return 'bg-accent-red';
    default: return 'bg-text-light-tertiary dark:bg-text-dark-tertiary';
  }
}

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function buildProjectSummaries(
  projects: ProjectContext[],
  tasks: Task[],
  timeEntries: { projectIds: string[]; startTime: string; duration: number }[],
): ProjectSummary[] {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const weekStart = getWeekStart();

  return projects.map((project) => {
    const projectTasks = tasks.filter((t) => t.projectIds?.includes(project.id));
    const totalCount = projectTasks.length;

    const doneCount = projectTasks.filter((t) => t.status === 'done').length;
    const inProgressCount = projectTasks.filter((t) => t.status === 'inprogress').length;
    const overdueCount = projectTasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate < todayStr
    ).length;
    const openCount = totalCount - doneCount - inProgressCount;

    const completionPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

    // Hours this week from time entries
    const hoursThisWeek = timeEntries
      .filter(
        (e) =>
          e.projectIds?.includes(project.id) &&
          new Date(e.startTime) >= weekStart
      )
      .reduce((sum, e) => sum + e.duration, 0) / 3600;

    // Next deadline
    const upcomingDueDates = projectTasks
      .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate >= todayStr)
      .map((t) => t.dueDate!)
      .sort();
    const nextDeadline = upcomingDueDates[0] ?? null;

    return {
      project,
      openCount,
      inProgressCount,
      doneCount,
      overdueCount,
      totalCount,
      completionPercent,
      health: getHealth(completionPercent, overdueCount, totalCount),
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
      nextDeadline,
    };
  });
}

// ============================================================================
// Card View
// ============================================================================

function ProjectCard({ summary, onOpen }: { summary: ProjectSummary; onOpen: (projectId: string) => void }) {
  const { project, openCount, inProgressCount, doneCount, overdueCount, totalCount, completionPercent, health, hoursThisWeek, nextDeadline } = summary;

  return (
    <button type="button" onClick={() => onOpen(project.id)} className="w-full bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg p-4 hover:shadow-md transition-shadow text-left">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-3 h-3 rounded-full ${getHealthColor(health)}`} title={health ? `健康：${health}` : '数据不足'} />
        {project.icon && <span className="text-lg">{project.icon}</span>}
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate flex-1">
          {project.name}
        </h3>
        <span
          className="text-xs px-1.5 py-0.5 rounded"
          style={{ backgroundColor: project.color + '22', color: project.color }}
        >
          {totalCount > 0 ? `${completionPercent}%` : '—'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface-light dark:bg-surface-dark rounded-full mb-3">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getHealthColor(health)}`}
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      {/* Task summary */}
      <div className="grid grid-cols-4 gap-2 text-xs mb-3">
        <div className="text-center">
          <div className="font-semibold text-text-light-primary dark:text-text-dark-primary">{openCount}</div>
          <div className="text-text-light-secondary dark:text-text-dark-secondary">待办</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-accent-blue">{inProgressCount}</div>
          <div className="text-text-light-secondary dark:text-text-dark-secondary">进行中</div>
        </div>
        <div className="text-center">
          <div className="font-semibold text-accent-green">{doneCount}</div>
          <div className="text-text-light-secondary dark:text-text-dark-secondary">已完成</div>
        </div>
        <div className="text-center">
          <div className={`font-semibold ${overdueCount > 0 ? 'text-accent-red' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
            {overdueCount}
          </div>
          <div className="text-text-light-secondary dark:text-text-dark-secondary">逾期</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary border-t border-border-light dark:border-border-dark pt-2">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          本周 {hoursThisWeek}h
        </span>
        {nextDeadline && (
          <span className="flex items-center gap-1">
            {new Date(nextDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    </button>
  );
}

// ============================================================================
// List View
// ============================================================================

type SortKey = 'name' | 'completion' | 'overdue' | 'health' | 'hours';

function ListView({ summaries, onOpen }: { summaries: ProjectSummary[]; onOpen: (projectId: string) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    const arr = [...summaries];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'name': cmp = a.project.name.localeCompare(b.project.name); break;
        case 'completion': cmp = a.completionPercent - b.completionPercent; break;
        case 'overdue': cmp = a.overdueCount - b.overdueCount; break;
        case 'health': {
          const order = { green: 0, yellow: 1, red: 2, unknown: 3 };
          cmp = order[a.health ?? 'unknown'] - order[b.health ?? 'unknown'];
          break;
        }
        case 'hours': cmp = a.hoursThisWeek - b.hoursThisWeek; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [summaries, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const headerClass = 'cursor-pointer hover:text-text-light-primary dark:hover:text-text-dark-primary select-none';
  const indicator = (key: SortKey) => sortKey === key ? (sortAsc ? ' ^' : ' v') : '';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-light-secondary dark:text-text-dark-secondary border-b border-border-light dark:border-border-dark">
            <th className={`pb-2 pr-4 ${headerClass}`} onClick={() => handleSort('name')}>
              项目{indicator('name')}
            </th>
            <th className={`pb-2 pr-4 ${headerClass} text-center`} onClick={() => handleSort('health')}>
              健康{indicator('health')}
            </th>
            <th className={`pb-2 pr-4 ${headerClass} text-right`} onClick={() => handleSort('completion')}>
              进度{indicator('completion')}
            </th>
            <th className="pb-2 pr-4 text-right">待办</th>
            <th className="pb-2 pr-4 text-right">进行中</th>
            <th className="pb-2 pr-4 text-right">已完成</th>
            <th className={`pb-2 pr-4 text-right ${headerClass}`} onClick={() => handleSort('overdue')}>
              逾期{indicator('overdue')}
            </th>
            <th className={`pb-2 pr-4 text-right ${headerClass}`} onClick={() => handleSort('hours')}>
              小时/周{indicator('hours')}
            </th>
            <th className="pb-2 text-right">下个截止日期</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.project.id}
              className="cursor-pointer border-b border-border-light/50 dark:border-border-dark/50 hover:bg-surface-light-elevated/50 dark:hover:bg-surface-dark-elevated/50"
              onClick={() => onOpen(s.project.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onOpen(s.project.id);
                }
              }}
              tabIndex={0}
              aria-label={`打开项目 ${s.project.name}`}
            >
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.project.color }} />
                  {s.project.icon && <span>{s.project.icon}</span>}
                  <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{s.project.name}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-center">
                <div className={`w-2.5 h-2.5 rounded-full mx-auto ${getHealthColor(s.health)}`} />
              </td>
              <td className="py-2.5 pr-4 text-right">
                <div className="flex items-center gap-2 justify-end">
                  <div className="w-16 h-1.5 bg-surface-light dark:bg-surface-dark rounded-full">
                    <div
                      className={`h-full rounded-full ${getHealthColor(s.health)}`}
                      style={{ width: `${s.completionPercent}%` }}
                    />
                  </div>
                  <span className="text-text-light-secondary dark:text-text-dark-secondary w-8 text-right">{s.totalCount > 0 ? `${s.completionPercent}%` : '—'}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 text-right text-text-light-secondary dark:text-text-dark-secondary">{s.openCount}</td>
              <td className="py-2.5 pr-4 text-right text-accent-blue">{s.inProgressCount}</td>
              <td className="py-2.5 pr-4 text-right text-accent-green">{s.doneCount}</td>
              <td className={`py-2.5 pr-4 text-right ${s.overdueCount > 0 ? 'text-accent-red font-medium' : 'text-text-light-secondary dark:text-text-dark-secondary'}`}>
                {s.overdueCount}
              </td>
              <td className="py-2.5 pr-4 text-right text-text-light-secondary dark:text-text-dark-secondary">{s.hoursThisWeek}h</td>
              <td className="py-2.5 text-right text-text-light-secondary dark:text-text-dark-secondary">
                {s.nextDeadline
                  ? new Date(s.nextDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                  : '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function Portfolio() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const storedTasks = useKanbanStore((s) => s.tasks);
  const projects = useProjectContextStore((s) => s.projects);
  const storedTimeEntries = useTimeTrackingStore((s) => s.entries);

  // Never call an array-producing store getter inside a Zustand selector:
  // React 19 treats the fresh array as a changed external-store snapshot and
  // repeatedly renders until the page crashes. Derive it from stable raw state.
  const allProjects = useMemo(
    () =>
      (Array.isArray(projects) ? projects : [])
        .filter((project) => !project.archivedAt)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [projects]
  );
  const tasks = useMemo(
    () => (Array.isArray(storedTasks) ? storedTasks : []),
    [storedTasks]
  );
  const timeEntries = useMemo(
    () => (Array.isArray(storedTimeEntries) ? storedTimeEntries : []),
    [storedTimeEntries]
  );

  const summaries = useMemo(
    () => buildProjectSummaries(allProjects, tasks, timeEntries),
    [allProjects, tasks, timeEntries]
  );

  // Overall metrics
  const totalTasks = summaries.reduce((sum, s) => sum + s.totalCount, 0);
  const totalHours = summaries.reduce((sum, s) => sum + s.hoursThisWeek, 0);
  const atRiskCount = summaries.filter((s) => s.health === 'red').length;
  const openProject = (projectId: string) => navigate(`/pm?project=${encodeURIComponent(projectId)}`);

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: 'cards', icon: LayoutGrid, label: '卡片' },
    { mode: 'list', icon: List, label: '列表' },
    { mode: 'timeline', icon: GanttChart, label: '时间线' },
  ];

  return (
    <PageContent page="portfolio">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              组合视图
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              跨项目总览与健康追踪
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-surface-light dark:bg-surface-dark rounded-lg p-1">
            {viewButtons.map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  viewMode === mode
                    ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary shadow-sm'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary'
                }`}
                title={label}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Overall metrics bar */}
        <div className="flex items-center gap-6 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-green" />
            <span className="text-text-light-secondary dark:text-text-dark-secondary">
              {totalTasks} 个任务总计
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-blue" />
            <span className="text-text-light-secondary dark:text-text-dark-secondary">
              本周 {Math.round(totalHours * 10) / 10}h
            </span>
          </div>
          {atRiskCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-red" />
              <span className="text-accent-red font-medium">
                {atRiskCount} 个项目存在风险
              </span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-purple" />
            <span className="text-text-light-secondary dark:text-text-dark-secondary">
              {allProjects.length} 个活跃项目
            </span>
          </div>
        </div>

        {/* Aggregate Metrics */}
        <PortfolioMetrics summaries={summaries} tasks={tasks} />

        {/* Content by view mode */}
        {allProjects.length === 0 ? (
          <div className="text-center py-16 text-text-light-secondary dark:text-text-dark-secondary">
            <LayoutGrid className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-2">暂无项目</p>
            <p className="text-sm">创建一个有明确结果的项目，即可在此查看。</p>
            <button type="button" onClick={() => navigate('/pm?create=1')} className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white">新建项目</button>
          </div>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map((s) => (
              <ProjectCard key={s.project.id} summary={s} onOpen={openProject} />
            ))}
          </div>
        ) : viewMode === 'list' ? (
          <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg p-4">
            <ListView summaries={summaries} onOpen={openProject} />
          </div>
        ) : (
          <PortfolioTimeline summaries={summaries} tasks={tasks} onOpenProject={openProject} />
        )}
      </div>
    </PageContent>
  );
}

export default Portfolio;
