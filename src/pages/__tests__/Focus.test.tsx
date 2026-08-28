import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../../types';

const dbMocks = vi.hoisted(() => ({
  addEntry: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../db/timeTrackingDb', () => ({
  timeTrackingDb: {
    addEntry: dbMocks.addEntry,
  },
}));

import { Focus } from '../Focus';
import { useFocusModeStore } from '../../stores/useFocusModeStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useTimeTrackingStore } from '../../stores/useTimeTrackingStore';

const task: Task = {
  id: 'focus-task',
  cardNumber: 1,
  title: '完成专注链路',
  description: '',
  status: 'inprogress',
  priority: 'high',
  tags: [],
  projectIds: ['project-1'],
  startDate: null,
  dueDate: null,
  created: '2026-08-27T00:00:00.000Z',
};

describe('Focus', () => {
  beforeEach(() => {
    dbMocks.addEntry.mockClear();
    useKanbanStore.setState({ tasks: [task] });
    useFocusModeStore.setState({ isActive: false, linkedTaskId: null, startedAt: null });
    useTimeTrackingStore.setState({ activeEntry: null, entries: [] });
  });

  it('starts one shared focus and timer session for the requested task', async () => {
    render(
      <MemoryRouter initialEntries={['/focus?task=focus-task']}>
        <Focus />
      </MemoryRouter>
    );

    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry).not.toBeNull());
    expect(useFocusModeStore.getState()).toMatchObject({
      isActive: true,
      linkedTaskId: task.id,
    });
    expect(useTimeTrackingStore.getState().activeEntry).toMatchObject({
      taskId: task.id,
      projectId: 'project-1',
      description: task.title,
      billable: false,
    });
  });

  it('does not start another entry after the user explicitly stops timing', async () => {
    render(
      <MemoryRouter initialEntries={['/focus?task=focus-task']}>
        <Focus />
      </MemoryRouter>
    );

    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry).not.toBeNull());
    fireEvent.click(screen.getByRole('button', { name: '结束计时' }));

    await waitFor(() => expect(useTimeTrackingStore.getState().activeEntry).toBeNull());
    expect(useTimeTrackingStore.getState().entries).toHaveLength(1);
    expect(dbMocks.addEntry).toHaveBeenCalledTimes(1);
  });
});
