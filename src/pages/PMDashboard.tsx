/**
 * PM Dashboard Page
 *
 * Comprehensive project management dashboard with:
 * - Project selector dropdown
 * - ProjectHealthCard with key metrics
 * - BurndownChart for sprint progress
 * - ResourceUtilizationChart
 * - Upcoming deadlines list
 * - Recent activity feed
 * - Blocked tasks list
 *
 * Route: /pm
 */

import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProjectQuickAddPath } from '../utils/projectTaskDeepLink';
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  Activity,
  Clock,
  ChevronDown,
  Filter,
  Plus,
  Archive,
  ArrowRight,
} from 'lucide-react';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useProjectContextStore } from '../stores/useProjectContextStore';
import { ProjectHealthCard } from '../components/pm/ProjectHealthCard';
import { BurndownChart } from '../components/charts/BurndownChart';
import { ResourceUtilizationChart } from '../components/charts/ResourceUtilizationChart';
import { PageContent } from '../components/PageContent';
import { RiskMatrixPanel } from '../components/pm/RiskMatrixPanel';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { ProjectContext } from '../types';

// Sprint date range (default to current month)
function getDefaultSprintDates(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

export function PMDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tasks = useKanbanStore((s) => s.tasks);
  const projects = useProjectContextStore((s) => s.projects);
  const createProject = useProjectContextStore((s) => s.createProject);
  const archiveProject = useProjectContextStore((s) => s.archiveProject);

  // Project filter state
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => searchParams.get('project') || 'all');
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(() => searchParams.get('create') === '1');
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectOutcome, setNewProjectOutcome] = useState('');
  const [projectToArchive, setProjectToArchive] = useState<ProjectContext | null>(null);
  const [dashboardView, setDashboardView] = useState<'overview' | 'analysis' | 'risk'>('overview');

  useEffect(() => {
    const requestedProject = searchParams.get('project');
    if (requestedProject && projects.some((project) => project.id === requestedProject && !project.archivedAt)) {
      setSelectedProjectId(requestedProject);
    } else if (requestedProject) {
      setSelectedProjectId('all');
      setSearchParams({}, { replace: true });
    }
    if (searchParams.get('create') === '1') setShowCreateProject(true);
  }, [projects, searchParams, setSearchParams]);

  // Sprint date range
  const [sprintDates] = useState(getDefaultSprintDates);

  // Filter tasks by selected project
  const filteredTasks = useMemo(() => {
    if (selectedProjectId === 'all') return tasks;
    return tasks.filter((t) => t.projectIds?.includes(selectedProjectId));
  }, [tasks, selectedProjectId]);

  // Get upcoming deadlines (tasks with due dates in next 7 days)
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return filteredTasks
      .filter((task) => {
        if (task.status === 'done') return false;
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate >= now && dueDate <= weekFromNow;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate!);
        const dateB = new Date(b.dueDate!);
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 5);
  }, [filteredTasks]);

  // Get blocked tasks (customStatus === 'blocked' or has incomplete dependencies)
  const blockedTasks = useMemo(() => {
    return filteredTasks
      .filter((task) => {
        if (task.status === 'done') return false;
        // Check if blocked status
        if (task.customStatus === 'blocked') return true;
        // Check if has blocking dependencies
        if (task.dependencies && task.dependencies.length > 0) {
          return task.dependencies.some((dep) => {
            const blockingTask = tasks.find((t) => t.id === dep.taskId);
            return blockingTask && blockingTask.status !== 'done';
          });
        }
        return false;
      })
      .slice(0, 5);
  }, [filteredTasks, tasks]);

  // Get recent activity (tasks with recent changes)
  const recentActivity = useMemo(() => {
    return filteredTasks
      .filter((task) => task.activityLog && task.activityLog.length > 0)
      .flatMap((task) =>
        (task.activityLog || []).map((log) => ({
          ...log,
          taskTitle: task.title,
          taskId: task.id,
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, 8);
  }, [filteredTasks]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter((t) => t.status === 'done').length;
    const inProgress = filteredTasks.filter(
      (t) => t.status === 'inprogress'
    ).length;
    const overdue = filteredTasks.filter((t) => {
      if (t.status === 'done' || !t.dueDate) return false;
      return new Date(t.dueDate) < new Date();
    }).length;

    return { total, completed, inProgress, overdue };
  }, [filteredTasks]);

  const activeProjects = useMemo(
    () => projects.filter((project) => !project.archivedAt),
    [projects]
  );

  const projectSummaries = useMemo(() => activeProjects.map((project) => {
    const projectTasks = tasks.filter((task) => task.projectIds?.includes(project.id));
    const openTasks = projectTasks.filter((task) => task.status !== 'done' && !task.archivedAt);
    const nextTask = [...openTasks].sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 } as const;
      return priority[a.priority] - priority[b.priority] || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
    })[0];
    return { project, total: projectTasks.length, done: projectTasks.length - openTasks.length, nextTask };
  }), [activeProjects, tasks]);

  const handleCreateProject = () => {
    const name = newProjectName.trim();
    if (!name) return;
    const id = createProject({
      name,
      description: newProjectOutcome.trim() || undefined,
      parentId: null,
      color: '#3b82f6',
    });
    setNewProjectName('');
    setNewProjectOutcome('');
    setShowCreateProject(false);
    setSelectedProjectId(id);
  };

  // Get selected project name
  const selectedProjectName =
    selectedProjectId === 'all'
      ? '全部项目'
      : projects.find((p) => p.id === selectedProjectId)?.name || '全部项目';

  return (
    <PageContent page="pm-dashboard">
      {/* Header with Project Selector */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-accent-primary" />
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            项目中心
          </h2>
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateProject((value) => !value)}
            className="flex items-center gap-2 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            创建项目
          </button>
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg hover:bg-surface-light-secondary dark:hover:bg-surface-dark-secondary transition-colors"
          >
            <Filter className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {selectedProjectName}
            </span>
            <ChevronDown className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
          </button>

          {showProjectDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowProjectDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-lg z-20 overflow-hidden">
                <button
                  onClick={() => {
                    setSelectedProjectId('all');
                    setShowProjectDropdown(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-light-secondary dark:hover:bg-surface-dark-secondary transition-colors ${
                    selectedProjectId === 'all'
                      ? 'text-accent-primary font-medium'
                      : 'text-text-light-primary dark:text-text-dark-primary'
                  }`}
                >
                  全部项目
                </button>
                {projects
                  .filter((p) => !p.archivedAt)
                  .map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowProjectDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-surface-light-secondary dark:hover:bg-surface-dark-secondary transition-colors flex items-center gap-2 ${
                        selectedProjectId === project.id
                          ? 'text-accent-primary font-medium'
                          : 'text-text-light-primary dark:text-text-dark-primary'
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: project.color }}
                      />
                      {project.name}
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>
        </div>
      </div>

      <div className="mb-5 flex items-center gap-1 border-b border-border-light dark:border-border-dark">
        {([
          ['overview', '概览'],
          ['analysis', '分析'],
          ['risk', '风险'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setDashboardView(id)}
            className={`border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              dashboardView === id
                ? 'border-accent-primary text-accent-primary'
                : 'border-transparent text-text-light-secondary hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showCreateProject && (
        <div className="mb-6 grid gap-3 rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
          <label className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
            项目名称
            <input
              autoFocus
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
              placeholder="例如：完成个人网站"
            />
          </label>
          <label className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
            期望结果
            <input
              value={newProjectOutcome}
              onChange={(event) => setNewProjectOutcome(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleCreateProject()}
              className="mt-1 block w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
              placeholder="怎样才算完成？"
            />
          </label>
          <button
            onClick={handleCreateProject}
            disabled={!newProjectName.trim()}
            className="self-end rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            保存项目
          </button>
        </div>
      )}

      {projectSummaries.length === 0 ? (
        <div className="mb-6 rounded-xl border border-dashed border-border-light p-8 text-center dark:border-border-dark">
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">从一个明确结果开始</h3>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">创建项目后，为它安排一个可执行的下一步。</p>
          <button onClick={() => setShowCreateProject(true)} className="mt-4 rounded-lg bg-accent-primary px-4 py-2 text-sm font-medium text-white">创建第一个项目</button>
        </div>
      ) : (
        <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projectSummaries.map(({ project, total, done, nextTask }) => (
            <div
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedProjectId(project.id)}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedProjectId(project.id); } }}
              className={`group rounded-xl border p-4 text-left transition-colors ${selectedProjectId === project.id ? 'border-accent-primary bg-accent-primary/5' : 'border-border-light bg-surface-light-elevated hover:border-accent-primary/40 dark:border-border-dark dark:bg-surface-dark-elevated'}`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: project.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-semibold text-text-light-primary dark:text-text-dark-primary">{project.name}</h3>
                    <button
                      onClick={(event) => { event.stopPropagation(); setProjectToArchive(project); }}
                      className="rounded p-1 text-text-light-tertiary hover:bg-surface-light hover:text-text-light-primary dark:text-text-dark-tertiary dark:hover:bg-surface-dark"
                      aria-label={`归档项目 ${project.name}`}
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-sm text-text-light-secondary dark:text-text-dark-secondary">{project.description || '尚未定义期望结果'}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    <span>{total > 0 ? `${done}/${total} 已完成` : '尚未开始'}</span>
                    {nextTask ? (
                      <span className="inline-flex min-w-0 items-center gap-1 truncate">下一步：{nextTask.title} <ArrowRight className="h-3 w-3 shrink-0" /></span>
                    ) : (
                      <Link
                        to={getProjectQuickAddPath(project.id)}
                        onClick={(event) => event.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-accent-primary hover:bg-accent-primary/10"
                        aria-label={`为项目 ${project.name} 添加下一步`}
                      >
                        添加下一步 <ArrowRight className="h-3 w-3 shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
            任务总数
          </p>
          <p className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            {stats.total}
          </p>
        </div>
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
            已完成
          </p>
          <p className="text-xl font-semibold text-status-success">
            {stats.completed}
          </p>
        </div>
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
            进行中
          </p>
          <p className="text-xl font-semibold text-accent-primary">
            {stats.inProgress}
          </p>
        </div>
        <div className="p-4 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
            逾期
          </p>
          <p className="text-xl font-semibold text-status-error">
            {stats.overdue}
          </p>
        </div>
      </div>

      {dashboardView === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
          <section className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">下一步</h3>
                <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">每个项目只需要一个明确的推进动作。</p>
              </div>
              <Link to="/tasks" className="text-xs font-medium text-accent-primary">查看任务</Link>
            </div>
            <div className="space-y-2">
              {projectSummaries.filter(({ nextTask }) => Boolean(nextTask)).slice(0, 6).map(({ project, nextTask }) => (
                <Link
                  key={project.id}
                  to={`/tasks?task=${encodeURIComponent(nextTask!.id)}`}
                  className="flex items-center gap-3 rounded-lg border border-border-light px-3 py-2.5 transition-colors hover:border-accent-primary/40 dark:border-border-dark"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{nextTask!.title}</span>
                    <span className="block truncate text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{project.name}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-text-light-tertiary" />
                </Link>
              ))}
              {projectSummaries.every(({ nextTask }) => !nextTask) && (
                <p className="py-8 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">还没有明确的下一步。</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              <Calendar className="h-4 w-4" />
              即将到期
            </h3>
            <div className="mt-3 space-y-2">
              {upcomingDeadlines.length === 0 ? (
                <p className="py-8 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">未来 7 天没有到期任务</p>
              ) : upcomingDeadlines.map((task) => (
                <Link
                  key={task.id}
                  to={`/tasks?task=${encodeURIComponent(task.id)}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated"
                >
                  <span className="min-w-0 truncate text-sm text-text-light-primary dark:text-text-dark-primary">{task.title}</span>
                  <span className="shrink-0 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    {new Date(task.dueDate!).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Analysis is secondary: keep PM-heavy metrics out of the default project view. */}
      {dashboardView === 'analysis' && (filteredTasks.length > 0 ? (
      <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Row 1: Health Card + Burndown */}
        <div className="bento-card p-4">
          <ProjectHealthCard
            tasks={filteredTasks}
            projectId={selectedProjectId !== 'all' ? selectedProjectId : undefined}
          />
        </div>

        <div className="bento-card p-4">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            冲刺燃尽
          </h3>
          <BurndownChart
            tasks={filteredTasks}
            sprintStart={sprintDates.start}
            sprintEnd={sprintDates.end}
            height={200}
          />
        </div>

        {/* Row 2: Resource Utilization + Upcoming Deadlines */}
        <div className="bento-card p-4">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            资源利用率
          </h3>
          <ResourceUtilizationChart height={200} />
        </div>

        <div className="bento-card p-4">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            即将到期
          </h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary py-8 text-center">
              暂无即将到期的任务
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-light dark:bg-surface-dark"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                      {task.title}
                    </p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                      {new Date(task.dueDate!).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      task.priority === 'high'
                        ? 'bg-status-error/10 text-status-error'
                        : task.priority === 'medium'
                          ? 'bg-status-warning/10 text-status-warning'
                          : 'bg-status-info/10 text-status-info'
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 3: Recent Activity + Blocked Tasks */}
        <div className="bento-card p-4">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            最近动态
          </h3>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary py-8 text-center">
              暂无最近动态
            </p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentActivity.map((activity, idx) => (
                <div
                  key={`${activity.id}-${idx}`}
                  className="flex items-start gap-2 p-2 rounded-lg bg-surface-light dark:bg-surface-dark"
                >
                  <div className="w-6 h-6 rounded-full bg-accent-primary/10 flex items-center justify-center shrink-0">
                    <Activity className="w-3 h-3 text-accent-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-text-light-primary dark:text-text-dark-primary">
                      <span className="font-medium">{activity.taskTitle}</span>
                      <span className="text-text-light-tertiary dark:text-text-dark-tertiary">
                        {' '}
                        – {activity.action}
                        {activity.field && ` (${activity.field})`}
                      </span>
                    </p>
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bento-card p-4">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            受阻任务
          </h3>
          {blockedTasks.length === 0 ? (
            <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary py-8 text-center">
              暂无受阻任务
            </p>
          ) : (
            <div className="space-y-2">
              {blockedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-status-warning/5 border border-status-warning/20"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                      {task.title}
                    </p>
                    {task.dependencies && task.dependencies.length > 0 && (
                      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                        被 {task.dependencies.length} 个任务阻塞
                      </p>
                    )}
                  </div>
                  <AlertTriangle className="w-4 h-4 text-status-warning shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      </>
      ) : (
        <div className="rounded-xl border border-dashed border-border-light p-8 text-center dark:border-border-dark">
          <p className="font-medium text-text-light-primary dark:text-text-dark-primary">暂无可分析的任务数据</p>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">先为项目添加下一步；有计划值和完成样本后，健康度与趋势才会出现。</p>
        </div>
      ))}

      {dashboardView === 'risk' && (
        <div className="space-y-4">
          <section className="rounded-xl border border-border-light bg-surface-light p-4 dark:border-border-dark dark:bg-surface-dark">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-status-warning" />
              <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">需要处理的阻塞</h3>
            </div>
            {blockedTasks.length === 0 ? (
              <p className="py-8 text-center text-sm text-text-light-secondary dark:text-text-dark-secondary">当前没有受阻任务。</p>
            ) : (
              <div className="space-y-2">
                {blockedTasks.map((task) => (
                  <Link
                    key={task.id}
                    to={`/tasks?task=${encodeURIComponent(task.id)}`}
                    className="flex items-center justify-between rounded-lg border border-status-warning/20 px-3 py-2.5 hover:bg-status-warning/5"
                  >
                    <span className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{task.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-text-light-tertiary" />
                  </Link>
                ))}
              </div>
            )}
          </section>
          <RiskMatrixPanel />
        </div>
      )}

      {projectToArchive && (
        <ConfirmDialog
          isOpen
          title="归档项目"
          message={`确定归档项目“${projectToArchive.name}”吗？项目会退出活跃视图，可随时从归档中恢复。`}
          confirmText="归档"
          variant="warning"
          onClose={() => setProjectToArchive(null)}
          onConfirm={() => {
            archiveProject(projectToArchive.id);
            if (selectedProjectId === projectToArchive.id) setSelectedProjectId('all');
            setProjectToArchive(null);
          }}
        />
      )}
    </PageContent>
  );
}

export default PMDashboard;
