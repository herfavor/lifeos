import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createEditor } from 'lexical';
import { HomeOverview } from '../HomeOverview';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useNotesStore } from '../../../stores/useNotesStore';
import { useProjectContextStore } from '../../../stores/useProjectContextStore';

describe('HomeOverview', () => {
  beforeEach(() => {
    localStorage.clear();
    useKanbanStore.setState({ tasks: [], nextCardNumber: 1 });
    useCalendarStore.setState({ events: {} });
    useNotesStore.setState({ notes: {}, activeNoteId: null });
    useProjectContextStore.setState({ projects: [], activeProjectIds: [] });
  });

  it('explains the core loop and exposes one integrated quick capture', () => {
    render(
      <MemoryRouter>
        <HomeOverview />
      </MemoryRouter>
    );

    expect(screen.getAllByText(/收集/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/安排/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/专注/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/回顾/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /收集/ })).toHaveAttribute('href', '/tasks?tab=inbox');
  });

  it('captures a task into the inbox without opening another surface', () => {
    render(
      <MemoryRouter>
        <HomeOverview />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('记录一个待办事项'), {
      target: { value: '整理周报材料' },
    });
    fireEvent.click(screen.getByRole('button', { name: '收进来' }));

    const task = useKanbanStore.getState().tasks.find((item) => item.title === '整理周报材料');
    expect(task?.status).toBe('backlog');
    expect(screen.getByText('已收进任务收件箱')).toBeInTheDocument();
  });

  it('captures a note with a Lexical state that can be applied by the editor', () => {
    render(
      <MemoryRouter>
        <HomeOverview />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: '笔记' }));
    fireEvent.change(screen.getByLabelText('记录一篇笔记标题'), {
      target: { value: '首页灵感' },
    });
    fireEvent.click(screen.getByRole('button', { name: '收进来' }));

    const note = Object.values(useNotesStore.getState().notes).find((item) => item.title === '首页灵感');
    expect(note).toBeDefined();
    const editor = createEditor();
    expect(() => editor.setEditorState(editor.parseEditorState(note!.content))).not.toThrow();
  });

  it('shows honest overview counts and keeps AI out of the daily workflow', () => {
    useKanbanStore.setState({
      tasks: [
        {
          id: 'inbox-task',
          cardNumber: 1,
          title: '待分拣想法',
          description: '',
          status: 'backlog',
          priority: 'medium',
          tags: [],
          projectIds: [],
          startDate: null,
          dueDate: null,
          created: new Date().toISOString(),
        },
      ],
      nextCardNumber: 2,
    });

    render(
      <MemoryRouter>
        <HomeOverview />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: '待分拣 1 项' })).toHaveAttribute('href', '/tasks?tab=inbox');
    expect(screen.getByRole('navigation', { name: 'LifeOS 工作流' })).not.toHaveTextContent('AI');
  });

  it('passes the current focus task to Focus', () => {
    useKanbanStore.setState({
      tasks: [
        {
          id: 'focus-task',
          cardNumber: 1,
          title: '完成首页专注链路',
          description: '',
          status: 'inprogress',
          priority: 'high',
          tags: [],
          projectIds: [],
          startDate: null,
          dueDate: null,
          created: new Date().toISOString(),
        },
      ],
      nextCardNumber: 2,
    });

    render(
      <MemoryRouter>
        <HomeOverview />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /开始专注/ })).toHaveAttribute('href', '/focus?task=focus-task');
  });
});
