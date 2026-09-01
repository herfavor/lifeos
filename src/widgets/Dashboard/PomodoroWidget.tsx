/**
 * Dashboard view of the shared Pomodoro timer.
 */

import React from 'react';
import { BaseWidget } from './BaseWidget';
import { usePomodoroStore } from '../../stores/usePomodoroStore';
import { Timer } from 'lucide-react';

export const PomodoroWidget: React.FC = () => {
  const {
    mode,
    timeRemaining,
    isRunning,
    isPaused,
    settings,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
  } = usePomodoroStore();

  const durationMinutes =
    mode === 'focus'
      ? settings.focusDuration
      : mode === 'shortBreak'
        ? settings.shortBreakDuration
        : settings.longBreakDuration;
  const durationSeconds = Math.max(1, durationMinutes * 60);
  const progress = Math.max(0, Math.min(100, (timeRemaining / durationSeconds) * 100));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (isPaused) {
      resumeTimer();
      return;
    }
    startTimer();
  };

  return (
    <BaseWidget title="番茄钟" icon={<Timer className="h-6 w-6" aria-hidden />}>
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-border-light dark:text-border-dark"
            />
            <circle
              cx="64"
              cy="64"
              r="60"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeDasharray={377}
              strokeDashoffset={377 - (377 * progress) / 100}
              className="text-accent-blue transition-all"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold text-text-light-primary dark:text-text-dark-primary">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {isRunning ? (
            <button
              onClick={pauseTimer}
              className="px-4 py-2 bg-accent-yellow text-white rounded-button hover:bg-accent-yellow-hover transition-all duration-standard ease-smooth"
            >
              暂停
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-accent-blue text-white rounded-button hover:bg-accent-blue-hover transition-all duration-standard ease-smooth"
            >
              {isPaused ? '继续' : '开始'}
            </button>
          )}
          <button
            onClick={stopTimer}
            className="px-4 py-2 bg-surface-dark text-white rounded-button hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth"
          >
            重置
          </button>
        </div>
      </div>
    </BaseWidget>
  );
};
