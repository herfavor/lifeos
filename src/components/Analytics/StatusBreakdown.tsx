/**
 * Status Breakdown Chart
 * Bar chart showing task counts by status (backlog/todo/inprogress/review/done)
 */

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Task } from '../../types';
import type { DateRange } from '../../stores/useAnalyticsStore';
import { getTasksByStatus } from '../../utils/analyticsCalculations';

interface StatusBreakdownProps {
  tasks: Task[];
  dateRange: DateRange;
}

const STATUS_LABELS = {
  backlog: '积压',
  todo: '待办',
  inprogress: '进行中',
  review: '审核',
  done: '已完成',
};

const STATUS_COLORS = {
  backlog: '#6b7280', // Gray
  todo: '#3b82f6', // Blue
  inprogress: '#f59e0b', // Orange
  review: '#8b5cf6', // Purple
  done: '#10b981', // Green
};

export function StatusBreakdown({ tasks, dateRange }: StatusBreakdownProps) {
  const chartData = useMemo(() => {
    const statuses = getTasksByStatus(tasks, dateRange);

    return [
      { name: STATUS_LABELS.backlog, count: statuses.backlog, status: 'backlog' },
      { name: STATUS_LABELS.todo, count: statuses.todo, status: 'todo' },
      { name: STATUS_LABELS.inprogress, count: statuses.inprogress, status: 'inprogress' },
      { name: STATUS_LABELS.review, count: statuses.review, status: 'review' },
      { name: STATUS_LABELS.done, count: statuses.done, status: 'done' },
    ];
  }, [tasks, dateRange]);

  const hasSample = chartData.some((entry) => entry.count > 0);

  if (!hasSample) {
    return (
      <div className="flex h-64 w-full flex-col items-center justify-center text-center">
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">所选时间段内暂无任务样本</p>
      </div>
    );
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border-light dark:stroke-border-dark" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            className="fill-text-light-secondary dark:fill-text-dark-secondary"
          />
          <YAxis
            tick={{ fontSize: 12 }}
            className="fill-text-light-secondary dark:fill-text-dark-secondary"
            label={{ value: '任务数量', angle: -90, position: 'insideLeft', className: 'fill-text-light-secondary dark:fill-text-dark-secondary' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface-light-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: '8px',
            }}
            formatter={(value) => [`${value ?? 0} 个任务`, '数量']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
