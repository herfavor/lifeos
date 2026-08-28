/**
 * Quick Add Widget
 *
 * Quickly add tasks to your Kanban board
 */

import React, { useState } from 'react';
import { BaseWidget } from './BaseWidget';
import { useKanbanStore } from '../../stores/useKanbanStore';

export const QuickAddWidget: React.FC = () => {
  const { addTask } = useKanbanStore();
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      addTask({
        title: input.trim(),
        description: '',
        status: 'todo',
        priority: 'medium',
        tags: [],
        projectIds: [],
        startDate: null,
        dueDate: null,
      });
      setInput('');
    }
  };

  return (
    <BaseWidget title="快速添加" icon="➕">
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="添加任务…"
          className="w-full px-4 py-2 border rounded-button transition-all duration-standard ease-smooth
                     bg-surface-light dark:bg-surface-dark
                     text-text-light-primary dark:text-text-dark-primary
                     border-border-light dark:border-border-dark
                     focus:outline-none focus:ring-2 focus:ring-accent-blue"
        />
        <button
          type="submit"
          className="w-full px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button transition-all duration-standard ease-smooth"
        >
          添加任务
        </button>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          按 Enter 快速添加
        </p>
      </form>
    </BaseWidget>
  );
};
