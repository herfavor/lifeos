import { useState } from 'react';

/**
 * Idle Prompt Modal
 *
 * Displays when user returns from idle state, allowing them to:
 * - Keep the idle time (continue tracking)
 * - Discard the idle time (stop timer at idle start)
 * - Adjust the time (manually set when to stop)
 */

export interface IdlePromptProps {
  /**
   * Whether the prompt is visible
   */
  isOpen: boolean;

  /**
   * Idle duration in milliseconds
   */
  idleDuration: number;

  /**
   * When idle period started (ISO timestamp)
   */
  idleStartTime: string;

  /**
   * Timer description (for context)
   */
  timerDescription: string;

  /**
   * Callback when user chooses to keep idle time
   */
  onKeep: () => void;

  /**
   * Callback when user chooses to discard idle time
   */
  onDiscard: () => void;

  /**
   * Callback when user adjusts the time
   * @param adjustedEndTime ISO timestamp when timer should have stopped
   */
  onAdjust: (adjustedEndTime: string) => void;

  /**
   * Callback when user dismisses without action
   */
  onDismiss: () => void;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function IdlePrompt({
  isOpen,
  idleDuration,
  idleStartTime,
  timerDescription,
  onKeep,
  onDiscard,
  onAdjust,
  onDismiss
}: IdlePromptProps) {
  const [adjustedMinutes, setAdjustedMinutes] = useState(Math.floor(idleDuration / 60000));

  if (!isOpen) return null;

  const handleAdjust = () => {
    const idleStart = new Date(idleStartTime);
    const adjustedEndTime = new Date(idleStart.getTime() + adjustedMinutes * 60000);
    onAdjust(adjustedEndTime.toISOString());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            您已空闲一段时间
          </h2>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            已超过 <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{formatDuration(idleDuration)}</span> 未检测到活动
          </p>
        </div>

        {/* Timer info */}
        <div className="mb-6 rounded-md bg-surface-light dark:bg-surface-dark p-3">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">当前计时器：</p>
          <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">{timerDescription}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {/* Keep */}
          <button
            onClick={onKeep}
            className="w-full rounded-md bg-accent-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
          >
            继续计时（包含空闲时间）
          </button>

          {/* Discard */}
          <button
            onClick={onDiscard}
            className="w-full rounded-md bg-status-error/10 px-4 py-2 text-sm font-medium text-status-error transition-colors hover:bg-status-error/20"
          >
            丢弃空闲时间（停止于 {new Date(idleStartTime).toLocaleTimeString()}）
          </button>

          {/* Adjust */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              或调整空闲时间：
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={Math.floor(idleDuration / 60000)}
                value={adjustedMinutes}
                onChange={(e) => setAdjustedMinutes(Number(e.target.value))}
                className="flex-1"
              />
              <span className="min-w-[60px] text-sm text-text-light-secondary dark:text-text-dark-secondary">
                {adjustedMinutes}m
              </span>
            </div>
            <button
              onClick={handleAdjust}
              className="w-full rounded-md bg-surface-light dark:bg-surface-dark px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary transition-colors hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated"
            >
              在空闲开始后 {adjustedMinutes} 分钟停止计时器
            </button>
          </div>
        </div>

        {/* Dismiss */}
        <button
          onClick={onDismiss}
          className="mt-4 w-full text-sm text-text-light-tertiary dark:text-text-dark-tertiary transition-colors hover:text-text-light-secondary dark:text-text-dark-secondary"
        >
          稍后决定
        </button>
      </div>
    </div>
  );
}
