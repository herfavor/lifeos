/**
 * ProjectHealthCard
 *
 * Health indicator card for projects showing key PM metrics.
 * Features:
 * - Schedule Performance Index (SPI): earned value / planned value
 * - On-time completion rate: tasks completed by dueDate
 * - Scope change indicator: tasks added after baseline
 * - Resource utilization: actual hours / estimated hours
 * - Overall health indicator (green/yellow/red)
 * - Trend arrow showing improvement/decline
 */

import { useMemo } from 'react';
import {
  Activity,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import type { Task } from '../../types';

interface ProjectHealthCardProps {
  tasks: Task[];
  projectId?: string; // Filter by project, or show all if not provided
  compact?: boolean; // Compact mode for smaller displays
}

interface HealthMetrics {
  spi: number | null; // null when no planned value exists
  onTimeRate: number | null; // null when no completed task has a due date
  scopeChange: number | null; // null when no baseline exists
  utilization: number | null; // null when no estimate exists
  overallHealth: 'healthy' | 'at-risk' | 'critical' | null;
  trend: 'improving' | 'declining' | 'stable' | null;
}

/**
 * Calculate health metrics for a set of tasks
 */
export function calculateHealthMetrics(tasks: Task[]): HealthMetrics {
  const now = new Date();
  const completedTasks = tasks.filter((t) => t.status === 'done');

  // 1. Schedule Performance Index (SPI)
  // Earned Value = completed task hours
  // Planned Value = expected hours by now (based on due dates)
  let earnedValue = 0;
  let plannedValue = 0;

  completedTasks.forEach((task) => {
    const hours = task.estimatedHours || 1;
    earnedValue += hours;
  });

  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const dueDate = new Date(task.dueDate);
    if (dueDate <= now) {
      // This task should be completed by now
      plannedValue += task.estimatedHours || 1;
    }
  });

  const spi = plannedValue > 0 ? earnedValue / plannedValue : null;

  // 2. On-time completion rate
  // Tasks that were completed by their due date
  let onTimeTasks = 0;
  let tasksWithDueDate = 0;

  completedTasks.forEach((task) => {
    if (!task.dueDate) return;
    tasksWithDueDate++;
    const dueDate = new Date(task.dueDate);
    const completedDate = task.lastCompletedAt
      ? new Date(task.lastCompletedAt)
      : null;
    if (completedDate && completedDate <= dueDate) {
      onTimeTasks++;
    }
  });

  const onTimeRate =
    tasksWithDueDate > 0 ? (onTimeTasks / tasksWithDueDate) * 100 : null;

  // 3. Scope change indicator
  // Compare current task count to baseline (if available)
  // For now, estimate based on tasks without baseline data
  const tasksWithBaseline = tasks.filter((t) => t.baseline);
  const tasksWithoutBaseline = tasks.filter((t) => !t.baseline);
  const scopeChange =
    tasksWithBaseline.length > 0
      ? (tasksWithoutBaseline.length / tasksWithBaseline.length) * 100
      : null;

  // 4. Resource utilization
  // Actual hours / Estimated hours
  let totalEstimated = 0;
  let totalActual = 0;

  tasks.forEach((task) => {
    if (task.estimatedHours) totalEstimated += task.estimatedHours;
    if (task.actualHours) totalActual += task.actualHours;
    // Also consider timeTracking.actual
    if (task.timeTracking?.actual) {
      totalActual += task.timeTracking.actual;
    }
  });

  const utilization =
    totalEstimated > 0 ? (totalActual / totalEstimated) * 100 : null;

  // 5. Overall health determination
  let overallHealth: HealthMetrics['overallHealth'] = null;
  if (spi !== null || onTimeRate !== null) {
    overallHealth = 'healthy';
    if ((spi !== null && spi < 0.7) || (onTimeRate !== null && onTimeRate < 50)) {
      overallHealth = 'critical';
    } else if ((spi !== null && spi < 0.9) || (onTimeRate !== null && onTimeRate < 75)) {
      overallHealth = 'at-risk';
    }
  }

  // 6. Trend calculation (compare recent vs older tasks)
  // Look at last 7 days vs previous 7 days
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const recentCompleted = completedTasks.filter((t) => {
    if (!t.lastCompletedAt) return false;
    const d = new Date(t.lastCompletedAt);
    return d >= sevenDaysAgo;
  }).length;

  const olderCompleted = completedTasks.filter((t) => {
    if (!t.lastCompletedAt) return false;
    const d = new Date(t.lastCompletedAt);
    return d >= fourteenDaysAgo && d < sevenDaysAgo;
  }).length;

  let trend: HealthMetrics['trend'] = null;
  if (recentCompleted > 0 || olderCompleted > 0) {
    trend = 'stable';
    if (recentCompleted > olderCompleted * 1.2) {
      trend = 'improving';
    } else if (recentCompleted < olderCompleted * 0.8) {
      trend = 'declining';
    }
  }

  return {
    spi: spi === null ? null : Math.round(spi * 100) / 100,
    onTimeRate: onTimeRate === null ? null : Math.round(onTimeRate),
    scopeChange: scopeChange === null ? null : Math.round(scopeChange),
    utilization: utilization === null ? null : Math.round(utilization),
    overallHealth,
    trend,
  };
}

export function ProjectHealthCard({
  tasks,
  projectId,
  compact = false,
}: ProjectHealthCardProps) {
  const filteredTasks = useMemo(() => {
    if (!projectId) return tasks;
    return tasks.filter((t) => t.projectIds?.includes(projectId));
  }, [tasks, projectId]);

  const metrics = useMemo(
    () => calculateHealthMetrics(filteredTasks),
    [filteredTasks]
  );

  // Health color mapping
  const healthColors = {
    unknown: {
      bg: 'bg-surface-light-elevated dark:bg-surface-dark-elevated',
      border: 'border-border-light dark:border-border-dark',
      text: 'text-text-light-tertiary dark:text-text-dark-tertiary',
      icon: Minus,
    },
    healthy: {
      bg: 'bg-status-success/10',
      border: 'border-status-success/30',
      text: 'text-status-success',
      icon: CheckCircle,
    },
    'at-risk': {
      bg: 'bg-status-warning/10',
      border: 'border-status-warning/30',
      text: 'text-status-warning',
      icon: AlertTriangle,
    },
    critical: {
      bg: 'bg-status-error/10',
      border: 'border-status-error/30',
      text: 'text-status-error',
      icon: AlertTriangle,
    },
  };

  const healthConfig = healthColors[metrics.overallHealth ?? 'unknown'];
  const HealthIcon = healthConfig.icon;

  // Trend icon
  const TrendIcon =
    metrics.trend === 'improving'
      ? TrendingUp
      : metrics.trend === 'declining'
        ? TrendingDown
        : Minus;
  const trendColor =
    metrics.trend === 'improving'
      ? 'text-status-success'
      : metrics.trend === 'declining'
        ? 'text-status-error'
        : 'text-text-light-tertiary dark:text-text-dark-tertiary';

  // SPI color
  const spiColor = metrics.spi === null
    ? 'text-text-light-primary dark:text-text-dark-primary'
    : metrics.spi >= 1
      ? 'text-status-success'
      : metrics.spi >= 0.9
        ? 'text-status-warning'
        : 'text-status-error';

  if (compact) {
    return (
      <div
        className={`p-3 rounded-lg border ${healthConfig.bg} ${healthConfig.border}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HealthIcon className={`w-4 h-4 ${healthConfig.text}`} />
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {metrics.overallHealth === null
                ? '数据不足'
                : metrics.overallHealth === 'healthy'
                ? '健康'
                : metrics.overallHealth === 'at-risk'
                  ? '有风险'
                  : '严重'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon className={`w-3 h-3 ${trendColor}`} />
            <span className={`text-xs ${spiColor}`}>
              SPI: {metrics.spi === null ? '—' : metrics.spi.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border ${healthConfig.bg} ${healthConfig.border}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <HealthIcon className={`w-5 h-5 ${healthConfig.text}`} />
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
            项目健康度
          </h3>
          </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`w-4 h-4 ${trendColor}`} />
          <span
            className={`text-xs capitalize ${trendColor}`}
          >
            {metrics.trend === null
              ? '数据不足'
              : metrics.trend === 'improving'
              ? '改善中'
              : metrics.trend === 'declining'
                ? '下滑中'
                : '稳定'}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* SPI */}
        <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              进度绩效
            </span>
          </div>
          <p className={`text-xl font-bold ${spiColor}`}>
            {metrics.spi === null ? '—' : metrics.spi.toFixed(2)}
          </p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {metrics.spi === null
              ? '尚无计划值'
              : metrics.spi >= 1
              ? '进度超前'
              : metrics.spi >= 0.9
                ? '符合预期'
                : '进度落后'}
          </p>
        </div>

        {/* On-time Rate */}
        <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              按时完成率
            </span>
          </div>
          <p
            className={`text-xl font-bold ${
              metrics.onTimeRate === null
                ? 'text-text-light-primary dark:text-text-dark-primary'
                : metrics.onTimeRate >= 80
                ? 'text-status-success'
                : metrics.onTimeRate >= 60
                  ? 'text-status-warning'
                  : 'text-status-error'
            }`}
          >
            {metrics.onTimeRate === null ? '—' : `${metrics.onTimeRate}%`}
          </p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {filteredTasks.filter((t) => t.status === 'done' && t.dueDate)
              .length}{' '}
            项任务有截止日期
          </p>
        </div>

        {/* Scope Change */}
        <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              范围变更
            </span>
          </div>
          <p
            className={`text-xl font-bold ${
              metrics.scopeChange === null
                ? 'text-text-light-primary dark:text-text-dark-primary'
                : metrics.scopeChange === 0
                ? 'text-status-success'
                : metrics.scopeChange <= 20
                  ? 'text-status-warning'
                  : 'text-status-error'
            }`}
          >
            {metrics.scopeChange !== null && metrics.scopeChange > 0 ? '+' : ''}
            {metrics.scopeChange === null ? '—' : `${metrics.scopeChange}%`}
          </p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {metrics.scopeChange === null
              ? '尚无项目基线'
              : metrics.scopeChange === 0
              ? '无范围蔓延'
              : '相对基线新增'}
          </p>
        </div>

        {/* Utilization */}
        <div className="p-3 bg-surface-light dark:bg-surface-dark rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              工时利用率
            </span>
          </div>
          <p
            className={`text-xl font-bold ${
              metrics.utilization === null
                ? 'text-text-light-primary dark:text-text-dark-primary'
                : metrics.utilization <= 100
                ? 'text-status-success'
                : metrics.utilization <= 120
                  ? 'text-status-warning'
                  : 'text-status-error'
            }`}
          >
            {metrics.utilization === null ? '—' : `${metrics.utilization}%`}
          </p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            {metrics.utilization === null
              ? '尚无工时估算'
              : metrics.utilization <= 100
              ? '在预算内'
              : '超出预算'}
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border-light dark:border-border-dark">
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
          SPI：挣值 ÷ 计划值 • {'>'}1.0 = 超前，1.0 = 符合预期，
          {'<'}1.0 = 落后
        </p>
      </div>
    </div>
  );
}

export default ProjectHealthCard;
