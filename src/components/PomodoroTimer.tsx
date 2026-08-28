import { useEffect, useRef, useState, useMemo } from 'react';
import { Play, Pause, Square, SkipForward, Link2, Unlink, Search } from 'lucide-react';
import { usePomodoroStore } from '../stores/usePomodoroStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import { notifyPomodoroComplete } from '../utils/pomodoroNotifications';
import { onPomodoroComplete } from '../services/pomodoroHabitBridge';

/**
 * Pomodoro Timer Component
 *
 * Full-featured Pomodoro timer with:
 * - Timer display with progress ring
 * - Start/pause/stop controls
 * - Mode indicator (Focus/Break)
 * - Session counter
 * - Integration with time tracking
 */

export function PomodoroTimer() {
  const {
    mode,
    timeRemaining,
    isRunning,
    isPaused,
    sessionsCompleted,
    totalSessionsToday,
    linkedTaskId,
    linkedTaskName,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    skipSession,
  } = usePomodoroStore();

  const pomodoroSettings = useSettingsStore((s) => s.pomodoroSettings);
  const activeTimeEntry = useTimeTrackingStore((s) => s.activeEntry);
  const startTimeEntry = useTimeTrackingStore((s) => s.startTimer);
  const pauseTimeEntry = useTimeTrackingStore((s) => s.pauseTimer);
  const resumeTimeEntry = useTimeTrackingStore((s) => s.resumeTimer);
  const stopTimeEntry = useTimeTrackingStore((s) => s.stopTimer);
  const tasks = useKanbanStore((s) => s.tasks);

  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const previousSessionCount = useRef(totalSessionsToday);
  const sharedTimeEntryId = useRef<string | null>(null);

  const linkedTask = useMemo(
    () => tasks.find((task) => task.id === linkedTaskId),
    [tasks, linkedTaskId]
  );

  const filteredTasks = useMemo(() => {
    if (!taskSearch.trim()) return tasks.slice(0, 20);
    const q = taskSearch.toLowerCase();
    return tasks.filter((t) => t.title.toLowerCase().includes(q)).slice(0, 20);
  }, [tasks, taskSearch]);

  // A focus Pomodoro is a duration strategy over the one shared active time
  // entry. Pausing, resuming, stopping, and completion therefore cannot create
  // duplicate time records.
  useEffect(() => {
    if (mode === 'focus' && isRunning) {
      if (!activeTimeEntry) {
        startTimeEntry({
          description: linkedTaskName || '番茄钟专注时段',
          taskId: linkedTask?.id,
          projectId: linkedTask?.projectIds[0],
          billable: false,
        });
        sharedTimeEntryId.current = useTimeTrackingStore.getState().activeEntry?.id ?? null;
      } else {
        sharedTimeEntryId.current = activeTimeEntry.id;
        if (activeTimeEntry.isPaused) resumeTimeEntry();
      }
      return;
    }

    if (mode === 'focus' && isPaused && activeTimeEntry?.id === sharedTimeEntryId.current) {
      if (!activeTimeEntry.isPaused) pauseTimeEntry();
      return;
    }

    if (sharedTimeEntryId.current && activeTimeEntry?.id === sharedTimeEntryId.current) {
      void stopTimeEntry();
    }
    sharedTimeEntryId.current = null;
  }, [
    mode,
    isRunning,
    isPaused,
    activeTimeEntry,
    linkedTask,
    linkedTaskName,
    startTimeEntry,
    pauseTimeEntry,
    resumeTimeEntry,
    stopTimeEntry,
  ]);

  // Notify and update the habit bridge once per completed focus session.
  useEffect(() => {
    const previous = previousSessionCount.current;
    previousSessionCount.current = totalSessionsToday;
    if (totalSessionsToday <= previous) return;

    const recordCompletion = async () => {
        await notifyPomodoroComplete(
          'focus',
          pomodoroSettings.soundEnabled,
          pomodoroSettings.notificationsEnabled
        );
        onPomodoroComplete(totalSessionsToday);
    };
    void recordCompletion();
  }, [totalSessionsToday, pomodoroSettings]);

  // Format time remaining as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const totalDuration = mode === 'focus'
    ? pomodoroSettings.focusDuration * 60
    : mode === 'shortBreak'
    ? pomodoroSettings.shortBreakDuration * 60
    : pomodoroSettings.longBreakDuration * 60;

  const progressPercent = ((totalDuration - timeRemaining) / totalDuration) * 100;

  // Mode styling
  const modeStyles = {
    focus: {
      bg: 'bg-accent-primary/10',
      border: 'border-accent-primary',
      text: 'text-accent-primary',
      ring: 'stroke-accent-primary',
    },
    shortBreak: {
      bg: 'bg-accent-green/10',
      border: 'border-accent-green',
      text: 'text-accent-green',
      ring: 'stroke-accent-green',
    },
    longBreak: {
      bg: 'bg-accent-blue/10',
      border: 'border-accent-blue',
      text: 'text-accent-blue',
      ring: 'stroke-accent-blue',
    },
  };

  const currentStyles = modeStyles[mode];

  const modeLabels = {
    focus: '专注时段',
    shortBreak: '短暂休息',
    longBreak: '长时间休息',
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-8">
      {/* Mode Indicator */}
      <div className="flex items-center gap-3">
        <div className={`px-4 py-2 rounded-full ${currentStyles.bg} ${currentStyles.border} border-2`}>
          <p className={`text-sm font-medium ${currentStyles.text}`}>
            {modeLabels[mode]}
          </p>
        </div>
        {linkedTaskName && (
          <div className="px-4 py-2 rounded-full bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 border border-border-light dark:border-border-dark">
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              {linkedTaskName}
            </p>
          </div>
        )}
      </div>

      {/* Task Linking */}
      <div className="flex items-center gap-2">
        {linkedTaskName ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-primary/10 border border-accent-primary/20">
            <Link2 className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-medium text-accent-primary">
              {linkedTaskName}
            </span>
            <button
              onClick={() => usePomodoroStore.getState().unlinkTask()}
              className="ml-1 p-0.5 rounded hover:bg-accent-primary/20 text-accent-primary transition-colors"
              title="取消关联任务"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={() => setShowTaskPicker(!showTaskPicker)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 border border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors text-text-light-secondary dark:text-text-dark-secondary"
            >
              <Link2 className="w-4 h-4" />
              关联任务
            </button>
            {showTaskPicker && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-xl z-20 p-2">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                  <input
                    type="text"
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    placeholder="搜索任务…"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-surface-light-elevated dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-tertiary dark:placeholder-text-dark-tertiary"
                    autoFocus
                  />
                </div>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {filteredTasks.length === 0 ? (
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary text-center py-3">
                      未找到任务
                    </p>
                  ) : (
                    filteredTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          usePomodoroStore.getState().linkToTask(task.id, task.title);
                          setShowTaskPicker(false);
                          setTaskSearch('');
                        }}
                        className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-surface-light-elevated dark:hover:bg-surface-dark text-text-light-primary dark:text-text-dark-primary transition-colors truncate"
                      >
                        {task.title}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Timer Display with Progress Ring */}
      <div className="relative">
        {/* SVG Progress Ring */}
        <svg className="transform -rotate-90" width="280" height="280">
          {/* Background ring */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-surface-light-secondary/30 dark:text-surface-dark-secondary/30"
          />
          {/* Progress ring */}
          <circle
            cx="140"
            cy="140"
            r="120"
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 120}`}
            strokeDashoffset={`${2 * Math.PI * 120 * (1 - progressPercent / 100)}`}
            className={`transition-all duration-1000 ${currentStyles.ring}`}
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className={`text-6xl font-bold tracking-tight ${currentStyles.text}`}>
            {formatTime(timeRemaining)}
          </p>
          {isRunning && !isPaused && (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-2">
              计时中…
            </p>
          )}
          {isPaused && (
            <p className="text-sm text-status-warning mt-2">
              已暂停
            </p>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRunning && !isPaused && (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            开始
          </button>
        )}

        {isRunning && !isPaused && (
          <button
            onClick={pauseTimer}
            className="flex items-center gap-2 px-6 py-3 bg-status-warning text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Pause className="w-5 h-5" />
            暂停
          </button>
        )}

        {isPaused && (
          <button
            onClick={resumeTimer}
            className="flex items-center gap-2 px-6 py-3 bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Play className="w-5 h-5" fill="currentColor" />
            继续
          </button>
        )}

        {(isRunning || isPaused) && (
          <button
            onClick={stopTimer}
            className="flex items-center gap-2 px-4 py-3 bg-status-error text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Square className="w-5 h-5" />
            停止
          </button>
        )}

        <button
          onClick={skipSession}
          className="flex items-center gap-2 px-4 py-3 bg-surface-light-secondary dark:bg-surface-dark-secondary text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
        >
          <SkipForward className="w-5 h-5" />
          跳过
        </button>
      </div>

      {/* Session Stats */}
      <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
        <div className="text-center p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {sessionsCompleted} / {pomodoroSettings.sessionsUntilLongBreak}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            距长时间休息的剩余次数
          </p>
        </div>
        <div className="text-center p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <p className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {totalSessionsToday}
          </p>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            今日专注次数
          </p>
        </div>
      </div>

    </div>
  );
}
