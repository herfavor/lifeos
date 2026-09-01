/**
 * GanttView Component
 * Main Gantt chart container with controls
 */

import { useState, useMemo } from 'react';
import { ZoomIn, ZoomOut, Calendar, BarChart3 } from 'lucide-react';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { GanttTimeline } from './GanttTimeline';
import { getTimelineBounds, type ZoomLevel } from './utils';
import type { Task } from '../../types';

interface GanttViewProps {
  onTaskClick?: (task: Task) => void;
}

export function GanttView({ onTaskClick }: GanttViewProps) {
  const tasks = useKanbanStore((state) => state.tasks);
  const updateTask = useKanbanStore((state) => state.updateTask);
  const getCriticalPath = useKanbanStore((state) => state.getCriticalPath);
  const setBaseline = useKanbanStore((state) => state.setBaseline);
  const clearBaseline = useKanbanStore((state) => state.clearBaseline);
  const baseline = useKanbanStore((state) => state.baseline);

  const [zoom, setZoom] = useState<ZoomLevel>('week');
  const [showCriticalPath, setShowCriticalPath] = useState(false);

  // Calculate critical path
  // Note: tasks is intentionally in deps because getCriticalPath reads from the tasks array
  const criticalTaskIds = useMemo(
    () => (showCriticalPath ? getCriticalPath() : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showCriticalPath, getCriticalPath, tasks]
  );

  // Filter tasks with dates
  const tasksWithDates = useMemo(
    () => tasks.filter((task) => task.startDate || task.dueDate),
    [tasks]
  );

  // Calculate timeline bounds
  const { start: timelineStart, end: timelineEnd } = useMemo(
    () => getTimelineBounds(tasksWithDates),
    [tasksWithDates]
  );

  // Zoom controls
  const zoomLevels: ZoomLevel[] = ['day', 'week', 'month'];
  const currentZoomIndex = zoomLevels.indexOf(zoom);

  const handleZoomIn = () => {
    if (currentZoomIndex > 0) {
      setZoom(zoomLevels[currentZoomIndex - 1]);
    }
  };

  const handleZoomOut = () => {
    if (currentZoomIndex < zoomLevels.length - 1) {
      setZoom(zoomLevels[currentZoomIndex + 1]);
    }
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTask(taskId, updates);
  };

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            时间线视图
          </h2>
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            ({tasksWithDates.length} 个任务)
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary mr-2">
            缩放：
          </span>
          <button
            onClick={handleZoomIn}
            disabled={currentZoomIndex === 0}
            className="p-1.5 rounded-button bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-standard ease-smooth"
            aria-label="放大"
          >
            <ZoomIn className="w-4 h-4 text-text-light-primary dark:text-text-dark-primary" />
          </button>
          <div className="flex items-center gap-1">
            {zoomLevels.map((level) => (
              <button
                key={level}
                onClick={() => setZoom(level)}
                className={`px-3 py-1 text-xs font-medium rounded-button transition-all duration-standard ease-smooth ${
                  zoom === level
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
                }`}
              >
                {{ day: '日', week: '周', month: '月' }[level]}
              </button>
            ))}
          </div>
          <button
            onClick={handleZoomOut}
            disabled={currentZoomIndex === zoomLevels.length - 1}
            className="p-1.5 rounded-button bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-standard ease-smooth"
            aria-label="缩小"
          >
            <ZoomOut className="w-4 h-4 text-text-light-primary dark:text-text-dark-primary" />
          </button>

          {/* Critical Path Toggle */}
          <div className="h-6 w-px bg-border-light dark:bg-border-dark mx-2" />
          <button
            onClick={() => setShowCriticalPath(!showCriticalPath)}
            className={`px-3 py-1.5 text-xs font-medium rounded-button transition-all duration-standard ease-smooth ${
              showCriticalPath
                ? 'bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark border border-status-error-border dark:border-status-error-border-dark'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
            }`}
            aria-label="切换关键路径"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-status-error" />
            关键路径
          </button>
          {showCriticalPath && criticalTaskIds.length > 0 && (
            <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              ({criticalTaskIds.length} 个关键任务)
            </span>
          )}

          {/* Baseline Controls */}
          <div className="h-6 w-px bg-border-light dark:bg-border-dark mx-2" />
          {baseline ? (
            <>
              <button
                onClick={clearBaseline}
                className="px-3 py-1.5 text-xs font-medium rounded-button transition-all duration-standard ease-smooth bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark"
                aria-label="清除基线"
              >
                清除基线
              </button>
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                (设定于 {new Date(baseline.setAt).toLocaleDateString()})
              </span>
            </>
          ) : (
            <button
              onClick={setBaseline}
              disabled={tasksWithDates.length === 0}
              className="px-3 py-1.5 text-xs font-medium rounded-button transition-all duration-standard ease-smooth bg-accent-primary text-white hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="设置基线"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1 inline" />
              设置基线
            </button>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden bg-surface-light-elevated dark:bg-surface-dark-elevated">
        <GanttTimeline
          tasks={tasksWithDates}
          startDate={timelineStart}
          endDate={timelineEnd}
          zoom={zoom}
          onTaskUpdate={handleTaskUpdate}
          onTaskClick={handleTaskClick}
          criticalTaskIds={criticalTaskIds}
          baseline={baseline}
        />
      </div>

      {/* Legend */}
      <div className="px-4 py-2 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-text-light-secondary dark:text-text-dark-secondary">优先级：</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-status-error" />
            <span className="text-text-light-tertiary dark:text-text-dark-tertiary">高</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-accent-primary" />
            <span className="text-text-light-tertiary dark:text-text-dark-tertiary">中</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-status-info" />
            <span className="text-text-light-tertiary dark:text-text-dark-tertiary">低</span>
          </div>
          <div className="ml-4 text-text-light-tertiary dark:text-text-dark-tertiary italic">
            拖动条块调整日程 • 拖动右边缘调整大小
          </div>
        </div>
      </div>
    </div>
  );
}
