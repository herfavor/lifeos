/**
 * Weekly Retrospective Page
 *
 * Provides a comprehensive view of weekly productivity metrics
 * with AI-powered insights and week-over-week comparisons.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  Flame,
  CalendarDays,
  Sparkles,
  RefreshCw,
  FileText,
  ListPlus,
} from 'lucide-react';
import { generateRetrospectiveData } from '../services/weeklyRetrospective';
import type { RetroData } from '../services/weeklyRetrospective';
import {
  generateInsights,
  clearInsightsCache,
  formatHours,
  hasRetrospectiveEvidence,
} from '../services/ai/insightsGenerator';
import type { WeeklyInsights } from '../services/ai/insightsGenerator';
import { PageContent } from '../components/PageContent';
import { useNavigate } from 'react-router-dom';
import { useNotesStore } from '../stores/useNotesStore';
import { markdownToLexical } from '../utils/markdownToLexical';
import { useKanbanStore } from '../stores/useKanbanStore';
import { toast } from '../stores/useToastStore';

// ─── Helpers ────────────────────────────────────────────────

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function DeltaBadge({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? 'text-accent-green' : 'text-accent-red'
      }`}
    >
      <Icon size={12} />
      {isPositive ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

// ─── Component ──────────────────────────────────────────────

export function WeeklyRetrospective() {
  const navigate = useNavigate();
  const createNote = useNotesStore((state) => state.createNote);
  const addTask = useKanbanStore((state) => state.addTask);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [retroData, setRetroData] = useState<RetroData | null>(null);
  const [insights, setInsights] = useState<WeeklyInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const isCurrentWeek = useMemo(() => {
    const thisWeek = getWeekStart(new Date());
    return currentWeekStart.getTime() === thisWeek.getTime();
  }, [currentWeekStart]);

  const isFutureWeek = useMemo(() => {
    const thisWeek = getWeekStart(new Date());
    return currentWeekStart.getTime() > thisWeek.getTime();
  }, [currentWeekStart]);

  // Load data for the selected week
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await generateRetrospectiveData(currentWeekStart);
      setRetroData(data);

      // Generate template insights (fast, synchronous)
      const templateInsights = generateInsights(data);
      setInsights(templateInsights);
    } catch (err) {
      console.error('Failed to load retrospective data:', err);
    } finally {
      setLoading(false);
    }
  }, [currentWeekStart]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const navigateWeek = useCallback(
    (direction: -1 | 1) => {
      setCurrentWeekStart((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + direction * 7);
        return next;
      });
    },
    []
  );

  const regenerateInsights = useCallback(() => {
    if (!retroData) return;
    setInsightsLoading(true);
    clearInsightsCache(retroData.weekStart);
    const newInsights = generateInsights(retroData);
    setInsights(newInsights);
    setInsightsLoading(false);
  }, [retroData]);

  const exportAsNote = useCallback(() => {
    if (!retroData || !insights) return;

    const content = `# 每周回顾：${retroData.weekLabel}

## 指标
- **已完成任务：** ${retroData.tasks.completed}
- **创建的任务：** ${retroData.tasks.created}
- **逾期任务：** ${retroData.tasks.overdue}
- **任务完成率：** ${retroData.tasks.total > 0 ? `${retroData.tasks.completionRate}%` : '数据不足'}
- **记录时长：** ${formatHours(retroData.time.totalSeconds)}
- **习惯完成率：** ${retroData.habits.trackedHabits > 0 ? `${retroData.habits.overallCompletionRate}%` : '数据不足'}
- **日历事件：** ${retroData.calendar.totalEvents}

## 亮点
${insights.wins.map((w, i) => `${i + 1}. ${w}`).join('\n')}

## 待改进之处
${insights.improvements.map((imp, i) => `${i + 1}. ${imp}`).join('\n')}

## 行动项
${insights.actionItem}

${hasRetrospectiveEvidence(retroData) ? `## 生产力评分：${insights.productivityScore}/100\n` : '## 状态\n数据不足，本周不评分。\n'}

---
*生成于 ${new Date().toLocaleDateString()}*
`;

    const note = createNote({
      title: `每周回顾：${retroData.weekLabel}`,
      content: markdownToLexical(content),
      contentText: content,
      tags: ['每周回顾'],
    });
    navigate(`/notes?note=${encodeURIComponent(note.id)}`);
  }, [retroData, insights, createNote, navigate]);

  const createActionTask = useCallback(() => {
    if (!retroData || !insights) return;
    const nextWeek = new Date(retroData.weekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const dueDate = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
    addTask({
      title: insights.actionItem,
      description: `来自每周回顾：${retroData.weekLabel}`,
      status: 'todo',
      startDate: null,
      dueDate,
      priority: 'medium',
      tags: ['每周回顾'],
      projectIds: [],
    });
    toast.success('行动项已创建并安排到下周');
    navigate('/tasks');
  }, [addTask, insights, navigate, retroData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-accent-primary border-r-transparent" />
          <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            正在加载每周回顾…
          </p>
        </div>
      </div>
    );
  }

  if (!retroData || !insights) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-text-light-secondary dark:text-text-dark-secondary">
        本周暂无数据。
      </div>
    );
  }

  return (
    <PageContent page="retrospective" className="pb-24">
      <div className="space-y-6">
      {/* Header with week navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            本周概览
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {retroData.weekLabel}
            {isCurrentWeek && (
              <span className="ml-2 text-xs bg-accent-primary/20 text-accent-primary px-2 py-0.5 rounded-full">
                本周
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary transition-colors"
            title="上一周"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentWeekStart(getWeekStart(new Date()))}
            className="px-3 py-1.5 text-sm rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary transition-colors"
          >
            今天
          </button>
          <button
            onClick={() => navigateWeek(1)}
            disabled={isFutureWeek}
            className="p-2 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="下一周"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={<CheckCircle size={20} className="text-accent-green" />}
          label="已完成任务"
          value={retroData.tasks.completed}
          delta={retroData.comparison?.tasks.completedDelta}
        />
        <MetricCard
          icon={<Clock size={20} className="text-accent-blue" />}
          label="记录时长"
          value={formatHours(retroData.time.totalSeconds)}
          delta={
            retroData.comparison
              ? Math.round(retroData.comparison.time.totalSecondsDelta / 3600)
              : undefined
          }
          deltaSuffix="h"
        />
        <MetricCard
          icon={<Flame size={20} className="text-accent-orange" />}
          label="习惯完成率"
          value={retroData.habits.trackedHabits > 0 ? `${retroData.habits.overallCompletionRate}%` : '—'}
          delta={retroData.habits.trackedHabits > 0 ? retroData.comparison?.habits.rateDelta : undefined}
          deltaSuffix="%"
        />
        <MetricCard
          icon={<CalendarDays size={20} className="text-accent-purple" />}
          label="事件"
          value={retroData.calendar.totalEvents}
          delta={retroData.comparison?.calendar.eventsDelta}
        />
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Task Details */}
        <div className="p-4 rounded-xl bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            任务明细
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">已创建</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{retroData.tasks.created}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">已完成</span>
              <span className="font-medium text-accent-green">{retroData.tasks.completed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">逾期</span>
              <span className={`font-medium ${retroData.tasks.overdue > 0 ? 'text-accent-red' : 'text-text-light-primary dark:text-text-dark-primary'}`}>
                {retroData.tasks.overdue}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">完成率</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{retroData.tasks.total > 0 ? `${retroData.tasks.completionRate}%` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Time Details */}
        <div className="p-4 rounded-xl bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            时间记录
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">总计</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{formatHours(retroData.time.totalSeconds)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-secondary dark:text-text-dark-secondary">日均</span>
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{formatHours(retroData.time.dailyAverageSeconds)}</span>
            </div>
            {retroData.time.mostProductiveDay && (
              <div className="flex justify-between">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">最高效的一天</span>
                <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{retroData.time.mostProductiveDay}</span>
              </div>
            )}
            {retroData.time.hoursByProject.length > 0 && (
              <div className="pt-2 border-t border-border-light dark:border-border-dark">
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">重点项目</p>
                {retroData.time.hoursByProject.map((p, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-text-light-secondary dark:text-text-dark-secondary truncate mr-2">{p.projectName}</span>
                    <span className="font-medium text-text-light-primary dark:text-text-dark-primary shrink-0">{formatHours(p.seconds)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="p-5 rounded-xl bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              每周洞察
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-light-elevated dark:bg-surface-dark-secondary text-text-light-secondary dark:text-text-dark-secondary">
              {insights.source === 'ai' ? 'AI 生成' : '模板'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={regenerateInsights}
              disabled={insightsLoading}
              className="p-1.5 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary transition-colors disabled:opacity-50"
              title="重新生成洞察"
            >
              <RefreshCw size={14} className={insightsLoading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={exportAsNote}
              className="p-1.5 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-secondary transition-colors"
              title="保存为笔记"
            >
              <FileText size={14} />
            </button>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-secondary">
          <div className="relative w-12 h-12">
            <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="stroke-current text-border-light dark:text-border-dark"
                strokeWidth="3"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="stroke-current text-accent-primary"
                strokeWidth="3"
                fill="none"
              strokeDasharray={`${hasRetrospectiveEvidence(retroData) ? insights.productivityScore : 0}, 100`}
                strokeLinecap="round"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-light-primary dark:text-text-dark-primary">
              {hasRetrospectiveEvidence(retroData) ? insights.productivityScore : '—'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {hasRetrospectiveEvidence(retroData) ? '生产力评分' : '数据不足'}
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {hasRetrospectiveEvidence(retroData) ? '基于任务、习惯和时间记录' : '没有基线时不做表现评价'}
            </p>
          </div>
        </div>

        {/* 3-2-1 Format */}
        <div className="space-y-4">
          {/* Wins */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-green mb-2">
              3 个亮点
            </h4>
            <ul className="space-y-1.5">
              {insights.wins.map((win, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  <CheckCircle size={14} className="text-accent-green mt-0.5 shrink-0" />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-yellow mb-2">
              2 个待改进项
            </h4>
            <ul className="space-y-1.5">
              {insights.improvements.map((imp, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-light-primary dark:text-text-dark-primary">
                  <TrendingUp size={14} className="text-accent-yellow mt-0.5 shrink-0" />
                  <span>{imp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Item */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-accent-primary mb-2">
              1 个行动项
            </h4>
            <div className="flex flex-col gap-3 rounded-lg border border-accent-primary/20 bg-accent-primary/10 p-3 text-sm text-text-light-primary dark:text-text-dark-primary sm:flex-row sm:items-start">
              <Sparkles size={14} className="text-accent-primary mt-0.5 shrink-0" />
              <span className="flex-1">{insights.actionItem}</span>
              <button type="button" onClick={createActionTask} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white">
                <ListPlus className="h-3.5 w-3.5" /> 创建下周任务
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </PageContent>
  );
}

// ─── Metric Card ────────────────────────────────────────────

function MetricCard({
  icon,
  label,
  value,
  delta,
  deltaSuffix = '',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  delta?: number;
  deltaSuffix?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">{label}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
          {value}
        </span>
        {delta !== undefined && <DeltaBadge value={delta} suffix={deltaSuffix} />}
      </div>
    </div>
  );
}

export default WeeklyRetrospective;
