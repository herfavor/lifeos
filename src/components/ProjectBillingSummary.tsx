import { useState, useMemo } from 'react';
import { DollarSign, Clock, Copy, Check, Calendar, TrendingUp } from 'lucide-react';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import type { TimeEntry, TimeTrackingProject } from '../types';

type DateRangePreset = 'today' | 'this-week' | 'this-month' | 'last-month' | 'custom';

interface ProjectBillingSummaryProps {
  projectId?: string; // If not provided, shows all projects
}

interface BillingSummary {
  billableHours: number;
  nonBillableHours: number;
  totalAmount: number;
  avgRate: number;
  entryCount: number;
}

/**
 * Format seconds to hours with 2 decimal places
 */
function formatHours(seconds: number): string {
  return (seconds / 3600).toFixed(2);
}

/**
 * Format currency with locale-aware display
 */
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get date range based on preset
 */
function getDateRange(preset: DateRangePreset): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today':
      return { start: today, end: new Date(today.getTime() + 86400000 - 1) };
    case 'this-week': {
      const dayOfWeek = today.getDay();
      const monday = new Date(today);
      monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { start: monday, end: sunday };
    }
    case 'this-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case 'last-month': {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: firstDay, end: lastDay };
    }
    case 'custom':
    default:
      // Default to this month
      return getDateRange('this-month');
  }
}

/**
 * Calculate effective hourly rate for an entry
 */
function getEffectiveRate(
  entry: TimeEntry,
  project: TimeTrackingProject | undefined,
  defaultRate: number
): number {
  return entry.hourlyRate ?? project?.hourlyRate ?? defaultRate;
}

/**
 * ProjectBillingSummary Component
 *
 * Shows billing summary for a project or all projects.
 * Part of Plan 07-03: Billable Time Tracking
 */
export function ProjectBillingSummary({ projectId }: ProjectBillingSummaryProps) {
  const entries = useTimeTrackingStore((s) => s.entries);
  const projects = useTimeTrackingStore((s) => s.projects);
  const defaultHourlyRate = useTimeTrackingStore((s) => s.defaultHourlyRate);
  const billingCurrency = useTimeTrackingStore((s) => s.billingCurrency);

  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('this-month');
  const [copied, setCopied] = useState(false);

  // Get project if specified
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;

  // Calculate billing summary
  const summary = useMemo<BillingSummary>(() => {
    const { start, end } = getDateRange(dateRangePreset);

    // Filter entries by date range and optionally by project
    const filteredEntries = entries.filter((entry) => {
      const entryDate = new Date(entry.startTime);
      const inRange = entryDate >= start && entryDate <= end;
      const matchesProject = !projectId || entry.projectId === projectId;
      return inRange && matchesProject;
    });

    let billableSeconds = 0;
    let nonBillableSeconds = 0;
    let totalAmount = 0;
    let rateSum = 0;
    let rateCount = 0;

    filteredEntries.forEach((entry) => {
      if (entry.billable) {
        billableSeconds += entry.duration;
        const entryProject = entry.projectId
          ? projects.find((p) => p.id === entry.projectId)
          : undefined;
        const rate = getEffectiveRate(entry, entryProject, defaultHourlyRate);
        const hours = entry.duration / 3600;
        totalAmount += hours * rate;
        if (rate > 0) {
          rateSum += rate;
          rateCount++;
        }
      } else {
        nonBillableSeconds += entry.duration;
      }
    });

    return {
      billableHours: billableSeconds / 3600,
      nonBillableHours: nonBillableSeconds / 3600,
      totalAmount,
      avgRate: rateCount > 0 ? rateSum / rateCount : defaultHourlyRate,
      entryCount: filteredEntries.length,
    };
  }, [entries, projects, projectId, dateRangePreset, defaultHourlyRate]);

  // Copy summary to clipboard
  const handleCopyToClipboard = async () => {
    const { start, end } = getDateRange(dateRangePreset);
    const dateFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

    const text = `计费摘要
${project ? `项目：${project.name}` : '全部项目'}
期间：${start.toLocaleDateString('zh-CN', dateFormat)} - ${end.toLocaleDateString('zh-CN', dateFormat)}

可计费：${formatHours(summary.billableHours * 3600)} 小时 @ 平均 ${formatCurrency(summary.avgRate, billingCurrency)}/小时
不可计费：${formatHours(summary.nonBillableHours * 3600)} 小时

合计：${formatCurrency(summary.totalAmount, billingCurrency)}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const { start, end } = getDateRange(dateRangePreset);
  const dateFormat: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };

  return (
    <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-xl border border-border-light dark:border-border-dark">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-accent-primary/10 rounded-lg">
            <TrendingUp className="w-5 h-5 text-accent-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              {project ? project.name : '全部项目'} 计费
            </h3>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {start.toLocaleDateString('zh-CN', dateFormat)} – {end.toLocaleDateString('zh-CN', dateFormat)}
            </p>
          </div>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-surface-light-secondary dark:bg-surface-dark-secondary rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors border border-border-light dark:border-border-dark"
          aria-label="复制摘要到剪贴板"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-accent-green" />
              <span className="text-accent-green">已复制！</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
              <span className="text-text-light-secondary dark:text-text-dark-secondary">复制</span>
            </>
          )}
        </button>
      </div>

      {/* Date Range Selector */}
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
        <div className="flex gap-1">
          {(['today', 'this-week', 'this-month', 'last-month'] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => setDateRangePreset(preset)}
              className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                dateRangePreset === preset
                  ? 'bg-accent-primary text-white'
                  : 'bg-surface-light-secondary dark:bg-surface-dark-secondary text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
              }`}
            >
              {preset === 'today' && '今天'}
              {preset === 'this-week' && '本周'}
              {preset === 'this-month' && '本月'}
              {preset === 'last-month' && '上月'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Billable Hours */}
        <div className="p-4 bg-accent-green/10 rounded-lg border border-accent-green/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-accent-green" />
            <span className="text-xs font-medium text-accent-green uppercase tracking-wide">
              可计费
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatHours(summary.billableHours * 3600)}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            小时 @ 平均 {formatCurrency(summary.avgRate, billingCurrency)}/小时
          </p>
        </div>

        {/* Non-Billable Hours */}
        <div className="p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wide">
              不可计费
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatHours(summary.nonBillableHours * 3600)}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            已记录小时
          </p>
        </div>

        {/* Total Amount */}
        <div className="p-4 bg-accent-primary/10 rounded-lg border border-accent-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-accent-primary" />
            <span className="text-xs font-medium text-accent-primary uppercase tracking-wide">
              合计
            </span>
          </div>
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {formatCurrency(summary.totalAmount, billingCurrency)}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            来自 {summary.entryCount} 条记录
          </p>
        </div>
      </div>

      {/* Empty State */}
      {summary.entryCount === 0 && (
        <div className="text-center py-8 text-text-light-secondary dark:text-text-dark-secondary">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">此期间未找到时间记录。</p>
          <p className="text-xs mt-1">
            开始记录时间即可查看计费摘要。
          </p>
        </div>
      )}
    </div>
  );
}
