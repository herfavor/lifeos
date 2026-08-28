/**
 * Focus Page - Full-screen distraction-free focus mode
 *
 * A minimalist view designed for deep work sessions.
 * Features: large timer display, current task, keyboard controls.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Play, Pause, X, RotateCcw, Target, Clock, CheckCircle2 } from 'lucide-react';
import { useFocusModeStore } from '../stores/useFocusModeStore';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { useKanbanStore } from '../stores/useKanbanStore';
import { useShortcut } from '../hooks/useShortcut';

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const Focus: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTaskId = searchParams.get('task');

  // Focus mode state
  const {
    isActive,
    linkedTaskId,
    startedAt,
    startFocus,
    endFocus,
  } = useFocusModeStore();

  // Time tracking state
  const { activeEntry, startTimer, stopTimer } = useTimeTrackingStore();

  // Get linked task details
  const tasks = useKanbanStore((state) => state.tasks);
  const moveTask = useKanbanStore((state) => state.moveTask);
  // A route task is used only for a new session. If a focus session already
  // exists, its linked task remains the source of truth for the shared timer.
  const sessionTaskId = isActive ? linkedTaskId : (requestedTaskId || linkedTaskId);
  const linkedTask = sessionTaskId ? tasks.find((t) => t.id === sessionTaskId) : null;
  const initializedSessionRef = useRef(false);

  // Session duration (updates every second)
  const [sessionDuration, setSessionDuration] = useState(0);

  // A focus session and its time record are one shared active session. This
  // intentionally runs once on entry: stopping a timer is an explicit user
  // action and must not be mistaken for a reason to create another one.
  useEffect(() => {
    if (initializedSessionRef.current) return;
    initializedSessionRef.current = true;

    if (!isActive) {
      startFocus(sessionTaskId || undefined);
    }

    if (!activeEntry) {
      startTimer({
        taskId: sessionTaskId || undefined,
        projectId: linkedTask?.projectIds[0] || undefined,
        description: linkedTask?.title || '专注时段',
        billable: false,
      });
    }
  }, [activeEntry, isActive, linkedTask, linkedTaskId, requestedTaskId, sessionTaskId, startFocus, startTimer]);

  // Update session duration every second. The shared time-tracking entry is
  // the source of truth: while it is paused, freeze the display at the pause
  // moment instead of counting wall-clock time from the focus start.
  useEffect(() => {
    if (!startedAt && !activeEntry?.startTime) return;

    const updateDuration = () => {
      if (activeEntry?.isPaused && activeEntry.pausedAt) {
        setSessionDuration(
          Math.max(0, Math.floor(
            (new Date(activeEntry.pausedAt).getTime() - new Date(activeEntry.startTime).getTime()) / 1000
          ))
        );
        return;
      }
      const start = new Date(activeEntry?.startTime ?? startedAt!).getTime();
      const now = Date.now();
      setSessionDuration(Math.max(0, Math.floor((now - start) / 1000)));
    };

    updateDuration();

    if (activeEntry?.isPaused) return; // Frozen while paused; resume resumes ticking.
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [startedAt, activeEntry?.startTime, activeEntry?.isPaused, activeEntry?.pausedAt]);

  // Handle exit focus mode
  const handleExit = useCallback(() => {
    if (activeEntry && !window.confirm('当前仍在计时。要结束计时并退出专注模式吗？')) {
      return;
    }
    if (activeEntry) {
      void stopTimer();
    }
    endFocus();
    navigate(-1);
  }, [activeEntry, stopTimer, endFocus, navigate]);

  // Handle timer toggle
  const handleTimerToggle = useCallback(() => {
    if (activeEntry) {
      stopTimer();
    } else if (linkedTaskId) {
      // Start timer linked to task
      startTimer({
        taskId: linkedTaskId,
        projectId: linkedTask?.projectIds[0] || undefined,
        description: linkedTask?.title || '专注时段',
      });
    } else {
      // Start timer without task
      startTimer({
        description: '专注时段',
      });
    }
  }, [activeEntry, linkedTaskId, linkedTask, startTimer, stopTimer]);

  const handleCompleteTask = useCallback(() => {
    if (!linkedTask) return;
    moveTask(linkedTask.id, 'done');
    if (activeEntry) void stopTimer();
    endFocus();
    navigate(-1);
  }, [linkedTask, moveTask, activeEntry, stopTimer, endFocus, navigate]);

  // Handle reset (restart session)
  const handleReset = useCallback(() => {
    startFocus(linkedTaskId || undefined);
  }, [startFocus, linkedTaskId]);

  // Keyboard shortcuts
  useShortcut({
    id: 'focus-exit',
    keys: ['Escape'],
    label: '退出专注模式',
    description: '退出专注模式并返回上一页',
    handler: handleExit,
    priority: 100, // High priority
  });

  useShortcut({
    id: 'focus-timer-toggle',
    keys: ['Space'],
    label: '切换计时器',
    description: '启动或停止专注计时器',
    handler: handleTimerToggle,
    priority: 90,
  });

  useShortcut({
    id: 'focus-reset',
    keys: ['r'],
    label: '重置专注时段',
    description: '重置专注时段计时器',
    handler: handleReset,
    priority: 80,
  });

  return (
    <div className="fixed inset-0 bg-surface-dark z-50 flex flex-col items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 via-transparent to-accent-primary/10" />

      {/* Exit button */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-3 rounded-full bg-surface-dark-elevated hover:bg-surface-dark-elevated/80 text-text-dark-secondary hover:text-text-dark-primary transition-all"
        title="退出专注模式 (Esc)"
        aria-label="退出专注模式"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main content */}
      <div className="relative z-10 text-center space-y-8">
        {/* Session duration - large display */}
        <div className="space-y-2">
          <div className="text-8xl md:text-9xl font-light text-text-dark-primary tracking-tight">
            {formatDuration(sessionDuration)}
          </div>
          <div className="flex items-center justify-center gap-2 text-text-dark-secondary">
            <Clock className="w-4 h-4" />
            <span className="text-sm uppercase tracking-wide">专注时间</span>
          </div>
        </div>

        {/* Linked task */}
        {linkedTask && (
          <div className="flex items-center justify-center gap-3 px-6 py-3 rounded-lg bg-surface-dark-elevated border border-border-dark">
            <Target className="w-5 h-5 text-accent-primary" />
            <span className="text-lg text-text-dark-primary font-medium">
              {linkedTask.title}
            </span>
            {linkedTask.status === 'done' && (
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
            )}
          </div>
        )}

        {/* Timer controls */}
        <div className="flex items-center justify-center gap-4">
          {/* Reset button */}
          <button
            onClick={handleReset}
            className="p-4 rounded-full bg-surface-dark-elevated hover:bg-surface-dark-elevated/80 text-text-dark-secondary hover:text-text-dark-primary transition-all"
            title="重置专注时段 (R)"
            aria-label="重置专注时段"
          >
            <RotateCcw className="w-6 h-6" />
          </button>

          {/* Play/Pause timer button */}
          <button
            onClick={handleTimerToggle}
            className={`p-6 rounded-full transition-all shadow-lg ${
              activeEntry
                ? 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                : 'bg-accent-secondary hover:bg-accent-secondary/90 text-white'
            }`}
            title={activeEntry ? '结束计时 (Space)' : '启动计时 (Space)'}
            aria-label={activeEntry ? '结束计时' : '启动计时'}
          >
            {activeEntry ? (
              <Pause className="w-10 h-10" />
            ) : (
              <Play className="w-10 h-10 ml-1" />
            )}
          </button>

          {linkedTask ? (
            <button
              onClick={handleCompleteTask}
              className="p-4 rounded-full bg-accent-green/20 text-accent-green transition-colors hover:bg-accent-green/30"
              title="完成任务并结束专注"
              aria-label="完成任务并结束专注"
            >
              <CheckCircle2 className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-14 h-14" />
          )}
        </div>

        {/* Active timer indicator */}
        {activeEntry && (
          <div className="flex items-center justify-center gap-2 text-accent-primary animate-pulse">
            <div className="w-2 h-2 rounded-full bg-accent-primary" />
            <span className="text-sm font-medium uppercase tracking-wide">记录中</span>
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-6 text-text-dark-secondary text-xs">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-surface-dark-elevated border border-border-dark font-mono">
            Space
          </kbd>
          <span>计时器</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-surface-dark-elevated border border-border-dark font-mono">
            R
          </kbd>
          <span>重置</span>
        </div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-1 rounded bg-surface-dark-elevated border border-border-dark font-mono">
            Esc
          </kbd>
          <span>退出</span>
        </div>
      </div>
    </div>
  );
};

export default Focus;
