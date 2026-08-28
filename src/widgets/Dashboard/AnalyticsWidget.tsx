/**
 * Personal Analytics Widget
 * Productivity metrics and insights dashboard
 */

import { useMemo } from 'react';
import { isWithinInterval } from 'date-fns';
import { BaseWidget } from './BaseWidget';
import { AnalyticsPeriodSelector } from '../../components/Analytics/AnalyticsPeriodSelector';
import { MetricCard } from '../../components/Analytics/MetricCard';
import { CompletionRateChart } from '../../components/Analytics/CompletionRateChart';
import { PriorityDistribution } from '../../components/Analytics/PriorityDistribution';
import { StatusBreakdown } from '../../components/Analytics/StatusBreakdown';
import { TimeByProjectChart } from '../../components/Analytics/TimeByProjectChart';
import { HourlyHeatmap } from '../../components/Analytics/HourlyHeatmap';
import { SessionDurationChart } from '../../components/Analytics/SessionDurationChart';
import { MeetingVsFocusChart } from '../../components/Analytics/MeetingVsFocusChart';
import { TagFrequencyChart } from '../../components/Analytics/TagFrequencyChart';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useNotesStore } from '../../stores/useNotesStore';
import { useAnalyticsStore } from '../../stores/useAnalyticsStore';
import {
  CheckCircle2,
  Clock,
  Calendar as CalendarIcon,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  calculateCompletionRate,
  getOverdueTaskCount,
  calculateTotalTimeTracked,
  getEventCount,
  getNotesCreatedCount,
} from '../../utils/analyticsCalculations';

export default function AnalyticsWidget() {
  // Get data from stores
  const tasks = useKanbanStore((state) => state.tasks);
  const timeEntries = useTimeTrackingStore((state) => state.entries);
  const calendarEvents = useCalendarStore((state) => state.events);
  const notes = useNotesStore((state) => state.notes);

  // Get analytics period
  const getDateRange = useAnalyticsStore((state) => state.getDateRange);
  const dateRange = useMemo(() => getDateRange(), [getDateRange]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const completionRate = calculateCompletionRate(tasks, dateRange);
    const overdueCount = getOverdueTaskCount(tasks);
    const totalTimeSeconds = calculateTotalTimeTracked(timeEntries, dateRange);
    const totalTimeHours = Math.round(totalTimeSeconds / 3600);
    const eventCount = getEventCount(calendarEvents, dateRange);
    const activeNotes = Object.fromEntries(
      Object.entries(notes).filter(([, note]) => !note.deletedAt)
    );
    const notesCount = getNotesCreatedCount(activeNotes, dateRange);
    // Count non-archived tasks created in the range for honest zero-sample display
    const taskCount = tasks.filter((task) => {
      if (task.archivedAt) return false;
      const createdAt = new Date(task.created);
      return !Number.isNaN(createdAt.getTime()) && isWithinInterval(createdAt, dateRange);
    }).length;

    return {
      completionRate: Math.round(completionRate),
      overdueCount,
      totalTimeHours,
      eventCount,
      notesCount,
      taskCount,
    };
  }, [tasks, timeEntries, calendarEvents, notes, dateRange]);

  return (
    <BaseWidget title="个人分析" icon="📊">
      <div className="flex flex-col h-full">
        {/* Period Selector */}
        <div className="mb-4">
          <AnalyticsPeriodSelector />
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <MetricCard
            title="完成率"
            value={metrics.taskCount === 0 ? '—' : `${metrics.completionRate}%`}
            icon={CheckCircle2}
            color="success"
            subtitle={metrics.taskCount === 0 ? '暂无任务样本' : '已完成任务'}
          />

          <MetricCard
            title="计时时长"
            value={`${metrics.totalTimeHours} 小时`}
            icon={Clock}
            color="info"
            subtitle="总时长"
          />

          <MetricCard
            title="事件"
            value={metrics.eventCount}
            icon={CalendarIcon}
            color="cyan"
            subtitle="日历事件"
          />

          <MetricCard
            title="新建笔记"
            value={metrics.notesCount}
            icon={FileText}
            color="magenta"
            subtitle="新笔记"
          />

          <MetricCard
            title="逾期任务"
            value={metrics.overdueCount}
            icon={AlertCircle}
            color="warning"
            subtitle="需要关注"
          />

          <MetricCard
            title="生产力"
            value="--"
            icon={TrendingUp}
            color="success"
            subtitle="即将推出"
          />
        </div>

        {/* Task Analytics Charts */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            任务分析
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Completion Rate Trend */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                完成率趋势
              </h4>
              <CompletionRateChart tasks={tasks} dateRange={dateRange} />
            </div>

            {/* Priority Distribution */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                优先级分布
              </h4>
              <PriorityDistribution tasks={tasks} dateRange={dateRange} />
            </div>

            {/* Status Breakdown */}
            <div className="bento-card p-4 lg:col-span-2">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                状态分布
              </h4>
              <StatusBreakdown tasks={tasks} dateRange={dateRange} />
            </div>
          </div>
        </div>

        {/* Time Tracking Analytics Charts */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            计时分析
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time by Project */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                按项目计时
              </h4>
              <TimeByProjectChart entries={timeEntries} dateRange={dateRange} />
            </div>

            {/* Hourly Distribution Heatmap */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                时段分布
              </h4>
              <HourlyHeatmap entries={timeEntries} dateRange={dateRange} />
            </div>

            {/* Session Duration Trend */}
            <div className="bento-card p-4 lg:col-span-2">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                平均专注时长趋势
              </h4>
              <SessionDurationChart entries={timeEntries} dateRange={dateRange} />
            </div>
          </div>
        </div>

        {/* Calendar & Notes Analytics Charts */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            日历与笔记分析
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Meeting vs Focus Time */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                会议与专注时间
              </h4>
              <MeetingVsFocusChart events={calendarEvents} dateRange={dateRange} />
            </div>

            {/* Tag Frequency */}
            <div className="bento-card p-4">
              <h4 className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wide mb-3">
                常用标签
              </h4>
              <TagFrequencyChart notes={notes} dateRange={dateRange} limit={10} />
            </div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}
