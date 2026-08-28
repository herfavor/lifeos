import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../types';

const dbMocks = vi.hoisted(() => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db/timeTrackingDb', () => ({
  timeTrackingDb: {
    addEntry: dbMocks.addEntry,
    getEntries: vi.fn(() => Promise.resolve([])),
    getProjects: vi.fn(() => Promise.resolve([])),
  },
}));
vi.mock('../../utils/pomodoroNotifications', () => ({ notifyPomodoroComplete: vi.fn(() => Promise.resolve()) }));
vi.mock('../../services/pomodoroHabitBridge', () => ({ onPomodoroComplete: vi.fn() }));

import { PomodoroTimer } from '../PomodoroTimer';
import { usePomodoroStore } from '../../stores/usePomodoroStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';
import { useKanbanStore } from '../../stores/useKanbanStore';

const task: Task = {
  id: 'task-1',
  title: '完成方案',
  description: '',
  status: 'todo',
  created: '2026-08-26T00:00:00.000Z',
  startDate: null,
  dueDate: null,
  priority: 'high',
  tags: [],
  projectIds: ['project-1'],
};

describe('PomodoroTimer shared time session', () => {
  beforeEach(() => {
    dbMocks.addEntry.mockClear();
    useKanbanStore.setState({ tasks: [task] });
    useTimeTrackingStore.setState({ activeEntry: null, entries: [] });
    usePomodoroStore.setState({
      mode: 'focus',
      timeRemaining: 25 * 60,
      isRunning: false,
      isPaused: false,
      sessionsCompleted: 0,
      totalSessionsToday: 0,
      linkedTaskId: task.id,
      linkedTaskName: task.title,
    });
  });

  it('reuses one non-billable entry through start, pause, resume, and stop', async () => {
    render(<PomodoroTimer />);

    fireEvent.click(screen.getByRole('button', { name: '开始' }));
    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry).not.toBeNull());
    expect(useTimeTrackingStore.getState().activeEntry).toMatchObject({
      taskId: task.id,
      projectId: 'project-1',
      projectIds: ['project-1'],
      billable: false,
    });

    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry?.isPaused).toBe(true));

    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry?.isPaused).toBe(false));

    fireEvent.click(screen.getByRole('button', { name: '停止' }));
    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry).toBeNull());
    expect(useTimeTrackingStore.getState().entries).toHaveLength(1);
    expect(dbMocks.addEntry).toHaveBeenCalledTimes(1);
  });
});
