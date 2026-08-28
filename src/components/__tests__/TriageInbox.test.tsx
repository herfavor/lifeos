import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../../types';
import { TriageInbox } from '../tasks/TriageInbox';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateTask: vi.fn(),
  moveTask: vi.fn(),
  archiveTask: vi.fn(),
  createNote: vi.fn(() => ({ id: 'note-1' })),
  addLink: vi.fn(),
}));

const inboxTask: Task = {
  id: 'task-1',
  title: '阅读 https://example.com/article',
  description: '整理文章要点',
  status: 'backlog',
  created: '2026-08-26T08:00:00.000Z',
  startDate: null,
  dueDate: null,
  priority: 'medium',
  tags: ['阅读'],
  projectIds: [],
};

vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../stores/useKanbanStore', () => ({
  useKanbanStore: () => ({
    tasks: [inboxTask],
    updateTask: mocks.updateTask,
    moveTask: mocks.moveTask,
    archiveTask: mocks.archiveTask,
  }),
}));

vi.mock('../../stores/useProjectContextStore', () => ({
  useProjectContextStore: (selector: (state: unknown) => unknown) => selector({
    projects: [{ id: 'project-1', name: '产品发布', archivedAt: null }],
  }),
}));

vi.mock('../../stores/useNotesStore', () => ({
  useNotesStore: (selector: (state: unknown) => unknown) => selector({ createNote: mocks.createNote }),
}));

vi.mock('../../stores/useLinkLibraryStore', () => ({
  useLinkLibraryStore: (selector: (state: unknown) => unknown) => selector({ addLink: mocks.addLink }),
}));

describe('TriageInbox', () => {
  beforeEach(() => vi.clearAllMocks());

  it('assigns project and date before accepting an inbox item', () => {
    render(<TriageInbox onTaskClick={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('所属项目'), { target: { value: 'project-1' } });
    fireEvent.change(screen.getByLabelText('安排日期'), { target: { value: '2026-08-27' } });
    fireEvent.click(screen.getByRole('button', { name: /接受/ }));

    expect(mocks.updateTask).toHaveBeenCalledWith('task-1', { projectIds: ['project-1'] });
    expect(mocks.updateTask).toHaveBeenCalledWith('task-1', { dueDate: '2026-08-27' });
    expect(mocks.moveTask).toHaveBeenCalledWith('task-1', 'todo');
  });

  it('converts URL input to a bookmark and archives the source task', () => {
    render(<TriageInbox onTaskClick={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '转为收藏' }));

    expect(mocks.addLink).toHaveBeenCalledWith(expect.objectContaining({
      url: 'https://example.com/article',
      projectIds: [],
      isArchived: false,
    }));
    expect(mocks.archiveTask).toHaveBeenCalledWith('task-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/links');
  });

  it('converts an item to a note with the keyboard shortcut', () => {
    render(<TriageInbox onTaskClick={vi.fn()} />);

    fireEvent.keyDown(window, { key: 'n' });

    expect(mocks.createNote).toHaveBeenCalledWith(expect.objectContaining({
      title: inboxTask.title,
      contentText: inboxTask.description,
    }));
    expect(mocks.archiveTask).toHaveBeenCalledWith('task-1');
    expect(mocks.navigate).toHaveBeenCalledWith('/notes?note=note-1');
  });
});
