import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QuickAddModal } from '../QuickAddModal';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useProjectContextStore } from '../../../stores/useProjectContextStore';

describe('QuickAddModal project defaults', () => {
  beforeEach(() => {
    useKanbanStore.setState({ tasks: [], nextCardNumber: 1 });
    useProjectContextStore.setState({
      projects: [{
        id: 'project-1',
        name: '整理产品体验',
        color: '#3b82f6',
        parentId: null,
        createdAt: '2026-08-27T00:00:00.000Z',
        updatedAt: '2026-08-27T00:00:00.000Z',
      }],
      activeProjectIds: [],
    });
  });

  it('shows and persists a deep-linked project when creating the next task', () => {
    const onClose = vi.fn();
    render(<QuickAddModal isOpen onClose={onClose} defaultProjectId="project-1" />);

    expect(screen.getByText('将归入项目：整理产品体验')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('需要做什么？'), { target: { value: '写下第一步' } });
    fireEvent.click(screen.getByRole('button', { name: '创建任务' }));

    expect(useKanbanStore.getState().tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '写下第一步', projectIds: ['project-1'] }),
    ]));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('degrades a stale project deep link to an unassigned new task', () => {
    useProjectContextStore.setState({ projects: [], activeProjectIds: [] });
    const onClose = vi.fn();
    render(<QuickAddModal isOpen onClose={onClose} defaultProjectId="deleted-project" />);

    expect(screen.queryByText(/将归入项目/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('需要做什么？'), { target: { value: '安全降级任务' } });
    fireEvent.click(screen.getByRole('button', { name: '创建任务' }));

    expect(useKanbanStore.getState().tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: '安全降级任务', projectIds: [] }),
    ]));
  });
});
