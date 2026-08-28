/**
 * Portfolio Timeline Component
 *
 * Horizontal bar chart showing project timelines from earliest task
 * to latest deadline, with a today marker and color by health status.
 */

import { useState, useMemo } from 'react';
import type { Task } from '../../types';

type ZoomLevel = 'week' | 'month' | 'quarter';

interface ProjectSummaryInput {
  project: { id: string; name: string; color: string; icon?: string };
  health: 'green' | 'yellow' | 'red' | null;
  completionPercent: number;
}

interface Props {
  summaries: ProjectSummaryInput[];
  tasks: Task[];
  onOpenProject?: (projectId: string) => void;
}

function getHealthBg(health: 'green' | 'yellow' | 'red' | null): string {
  switch (health) {
    case 'green': return 'bg-accent-green';
    case 'yellow': return 'bg-accent-yellow';
    case 'red': return 'bg-accent-red';
    default: return 'bg-text-light-tertiary dark:bg-text-dark-tertiary';
  }
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

export function PortfolioTimeline({ summaries, tasks, onOpenProject }: Props) {
  const [zoom, setZoom] = useState<ZoomLevel>('month');

  const projectRanges = useMemo(() => {
    return summaries.map((s) => {
      const projectTasks = tasks.filter((t) => t.projectIds?.includes(s.project.id));

      let earliest: string | null = null;
      let latest: string | null = null;

      for (const t of projectTasks) {
        if (t.startDate && (!earliest || t.startDate < earliest)) earliest = t.startDate;
        if (t.created && (!earliest || t.created.split('T')[0] < (earliest || ''))) {
          earliest = t.created.split('T')[0];
        }
        if (t.dueDate && (!latest || t.dueDate > latest)) latest = t.dueDate;
      }

      return {
        ...s,
        earliest,
        latest,
        taskCount: projectTasks.length,
      };
    }).filter((r) => r.earliest || r.latest);
  }, [summaries, tasks]);

  // Compute global time range
  const { rangeStart, rangeEnd, totalDays } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let minDate = today;
    let maxDate = today;

    for (const r of projectRanges) {
      if (r.earliest) {
        const d = new Date(r.earliest);
        if (d < minDate) minDate = d;
      }
      if (r.latest) {
        const d = new Date(r.latest);
        if (d > maxDate) maxDate = d;
      }
    }

    // Add padding based on zoom
    const padding = zoom === 'week' ? 7 : zoom === 'month' ? 14 : 30;
    const rangeStart = addDays(minDate, -padding);
    const rangeEnd = addDays(maxDate, padding);
    const totalDays = Math.max(daysBetween(rangeStart, rangeEnd), 1);

    return { rangeStart, rangeEnd, totalDays };
  }, [projectRanges, zoom]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPercent = Math.max(0, Math.min(100, (daysBetween(rangeStart, today) / totalDays) * 100));

  // Generate tick marks
  const ticks = useMemo(() => {
    const result: { date: Date; label: string; percent: number }[] = [];
    const interval = zoom === 'week' ? 7 : zoom === 'month' ? 14 : 30;
    let current = new Date(rangeStart);

    while (current <= rangeEnd) {
      const percent = (daysBetween(rangeStart, current) / totalDays) * 100;
      result.push({ date: new Date(current), label: formatDate(current), percent });
      current = addDays(current, interval);
    }
    return result;
  }, [rangeStart, rangeEnd, totalDays, zoom]);

  if (projectRanges.length === 0) {
    return (
      <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg p-8 text-center text-text-light-secondary dark:text-text-dark-secondary">
        <p>暂无项目时间线数据。添加带截止日期的任务即可查看时间线。</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg p-4">
      {/* Zoom controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
          项目时间线
        </h3>
        <div className="flex items-center gap-1 text-xs">
          {(['week', 'month', 'quarter'] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className={`px-2.5 py-1 rounded transition-colors capitalize ${
                zoom === z
                  ? 'bg-accent-blue text-white'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              {z === 'week' ? '周' : z === 'month' ? '月' : '季度'}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="relative overflow-x-auto">
        {/* Time axis */}
        <div className="relative h-6 mb-2 border-b border-border-light dark:border-border-dark">
          {ticks.map((tick, i) => (
            <div
              key={i}
              className="absolute text-[10px] text-text-light-secondary dark:text-text-dark-secondary transform -translate-x-1/2"
              style={{ left: `${tick.percent}%` }}
            >
              {tick.label}
            </div>
          ))}
        </div>

        {/* Project bars */}
        <div className="space-y-2 relative">
          {/* Today marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-accent-red/60 z-10"
            style={{ left: `${todayPercent}%` }}
          >
            <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-accent-red font-medium whitespace-nowrap">
              今天
            </div>
          </div>

          {projectRanges.map((r) => {
            const startDate = r.earliest ? new Date(r.earliest) : today;
            const endDate = r.latest ? new Date(r.latest) : today;

            const leftPercent = Math.max(0, (daysBetween(rangeStart, startDate) / totalDays) * 100);
            const widthPercent = Math.max(1, (daysBetween(startDate, endDate) / totalDays) * 100);

            return (
              <div key={r.project.id} className="flex items-center gap-2 h-8">
                {/* Project label */}
                <button type="button" onClick={() => onOpenProject?.(r.project.id)} className="w-32 flex-shrink-0 flex items-center gap-1.5 text-xs truncate rounded-md text-left hover:text-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.project.color }} />
                  {r.project.icon && <span className="text-sm">{r.project.icon}</span>}
                  <span className="truncate text-text-light-primary dark:text-text-dark-primary font-medium">
                    {r.project.name}
                  </span>
                </button>

                {/* Bar area */}
                <div className="flex-1 relative h-6">
                  <div
                    className={`absolute top-0 h-full rounded ${getHealthBg(r.health)} opacity-75`}
                    style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, minWidth: '4px' }}
                    title={`${r.project.name}：${r.earliest || '无开始日期'} - ${r.latest || '无结束日期'}（${r.completionPercent}% 已完成）`}
                  >
                    {/* Completion fill */}
                    <div
                      className={`h-full rounded ${getHealthBg(r.health)} opacity-100`}
                      style={{ width: `${r.completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
