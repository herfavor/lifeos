import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pause, Play, Square } from 'lucide-react';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { formatDuration } from '../utils/timeFormatters';

/**
 * ActiveTimerIndicator
 *
 * LifeOS compact sidebar timer indicator. LifeOS keeps time tracking out of
 * the main navigation: this component renders NOTHING while no timer is
 * active, and a single compact row while a timer is running or paused.
 *
 * The full-featured TimeTrackingPanel remains in the codebase (preserved)
 * and all timer capabilities stay available on /schedule?tab=timer.
 */
export function ActiveTimerIndicator() {
  const navigate = useNavigate();

  const activeEntry = useTimeTrackingStore((s) => s.activeEntry);
  const pauseTimer = useTimeTrackingStore((s) => s.pauseTimer);
  const resumeTimer = useTimeTrackingStore((s) => s.resumeTimer);
  const stopTimer = useTimeTrackingStore((s) => s.stopTimer);

  // Tick every second only while there is something to show
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeEntry) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeEntry]);

  if (!activeEntry) return null;

  const endMs =
    activeEntry.isPaused && activeEntry.pausedAt
      ? new Date(activeEntry.pausedAt).getTime()
      : now;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((endMs - new Date(activeEntry.startTime).getTime()) / 1000)
  );

  const handleStop = async () => {
    await stopTimer();
  };

  return (
    <div className="mx-2 mb-1 border-t border-border-light dark:border-border-dark pt-2">
      <button
        onClick={() => navigate('/schedule?tab=timer')}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-button bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark transition-colors group"
        title="正在计时 — 点击打开时间统计"
        aria-label={`正在计时：${activeEntry.description || '未命名任务'}，已进行 ${formatDuration(elapsedSeconds, { short: true })}`}
      >
        {/* Pulsing dot */}
        <span className="relative flex h-2 w-2 flex-shrink-0">
          {!activeEntry.isPaused && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-blue opacity-60" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              activeEntry.isPaused ? 'bg-accent-yellow' : 'bg-accent-blue'
            }`}
          />
        </span>

        <span className="flex-1 min-w-0 text-left">
          <span className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary truncate leading-4">
            {activeEntry.description || '未命名任务'}
          </span>
          <span className="block text-[11px] text-text-light-secondary dark:text-text-dark-secondary tabular-nums leading-4">
            {formatDuration(elapsedSeconds, { short: true })}
            {activeEntry.isPaused ? ' · 已暂停' : ''}
          </span>
        </span>
      </button>

      <div className="flex items-center gap-1 px-1 pt-1">
        {activeEntry.isPaused ? (
          <button
            onClick={resumeTimer}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
            title="继续计时"
            aria-label="继续计时"
          >
            <Play className="w-3 h-3" />
            继续
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
            title="暂停计时"
            aria-label="暂停计时"
          >
            <Pause className="w-3 h-3" />
            暂停
          </button>
        )}
        <button
          onClick={handleStop}
          className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[11px] text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
          title="停止计时"
          aria-label="停止计时"
        >
          <Square className="w-3 h-3" />
          停止
        </button>
      </div>
    </div>
  );
}
