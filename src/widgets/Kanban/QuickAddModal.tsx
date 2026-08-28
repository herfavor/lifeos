import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useProjectContextStore } from '../../stores/useProjectContextStore';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { NaturalLanguageDateInput } from '../../components/NaturalLanguageDateInput';
import type { TaskPriority, TaskStatus } from '../../types';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultColumn?: string;
  /** Project selected by a deep link such as a project's “add next step” action. */
  defaultProjectId?: string;
}

/**
 * QuickAddModal - Quick task creation with Cmd/Ctrl+K
 * Phase A: Quick Wins - Quick Add Feature
 *
 * Features:
 * - Keyboard-first design (Cmd/Ctrl+K to open)
 * - Smart defaults (remembers last used column and priority)
 * - Minimal UI (title + optional details)
 * - Instant creation (no detail panel needed)
 */
export function QuickAddModal({ isOpen, onClose, defaultColumn, defaultProjectId }: QuickAddModalProps) {
  const { addTask, columns, getCardTemplates } = useKanbanStore();
  const defaultProject = useProjectContextStore((state) =>
    defaultProjectId ? state.projects.find((project) => project.id === defaultProjectId) : undefined
  );
  const confirmedProject = defaultProject && !defaultProject.archivedAt ? defaultProject : undefined;
  const cardTemplates = getCardTemplates();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [column, setColumn] = useState(() => {
    if (defaultColumn) return defaultColumn;
    const saved = localStorage.getItem('kanban-quick-add-column');
    return saved || 'todo';
  });
  const [priority, setPriority] = useState<TaskPriority>(() => {
    const saved = localStorage.getItem('kanban-quick-add-priority');
    return (saved as TaskPriority) || 'medium';
  });
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // Apply template when selected
  const applyTemplate = useCallback((templateId: string | null) => {
    setSelectedTemplate(templateId);
    if (!templateId) {
      // Clear template-related fields but keep title
      setDescription('');
      setTags([]);
      return;
    }
    const template = cardTemplates.find(t => t.id === templateId);
    if (template) {
      setDescription(template.description);
      setPriority(template.defaultPriority);
      setTags(template.defaultTags);
      if (template.defaultColumn) {
        setColumn(template.defaultColumn);
      }
    }
  }, [cardTemplates]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setDueDate('');
      setTags([]);
      setSelectedTemplate(null);
      // Keep column and priority (smart defaults)
    }
  }, [isOpen]);

  // Save preferences when changed
  useEffect(() => {
    localStorage.setItem('kanban-quick-add-column', column);
  }, [column]);

  useEffect(() => {
    localStorage.setItem('kanban-quick-add-priority', priority);
  }, [priority]);

  // Handle ESC key with priority 50 (z-50)
  useEscapeKey({ enabled: isOpen, onEscape: onClose, priority: 50 });

  // Keyboard shortcuts (Cmd+Enter to submit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Cmd/Ctrl+Enter to submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, title, column, priority, description, dueDate, confirmedProject]);

  const handleSubmit = useCallback(() => {
    if (!title.trim()) return;

    addTask({
      title: title.trim(),
      description: description.trim(),
      status: column as TaskStatus,
      priority,
      startDate: null,
      dueDate: dueDate || null,
      tags,
      projectIds: confirmedProject ? [confirmedProject.id] : [],
    });

    onClose();
  }, [title, description, column, priority, dueDate, tags, confirmedProject, addTask, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl mx-4 bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-2xl border border-border-light dark:border-border-dark overflow-hidden max-h-[85vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-base">⚡</span>
              <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
                快速添加任务
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
              aria-label="关闭"
            >
              <span className="text-lg text-text-light-secondary dark:text-text-dark-secondary">×</span>
            </button>
          </div>

          {/* Form */}
          <div className="p-4 space-y-3 flex-1 overflow-y-auto">
            {confirmedProject && (
              <p className="rounded-lg bg-accent-primary/10 px-3 py-2 text-xs text-accent-primary">
                将归入项目：{confirmedProject.name}
              </p>
            )}

            {/* Template Selector */}
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                模板（可选）
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => applyTemplate(null)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                    selectedTemplate === null
                      ? 'bg-accent-blue text-white border-accent-blue'
                      : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                  }`}
                >
                  空白
                </button>
                {cardTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyTemplate(template.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                      selectedTemplate === template.id
                        ? 'bg-accent-blue text-white border-accent-blue'
                        : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                    }`}
                    title={template.name}
                  >
                    {template.icon} {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Title (auto-focused) */}
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                任务标题 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="需要做什么？"
                className="w-full px-2.5 py-1.5 text-xs border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                autoFocus
              />
            </div>

            {/* Row 1: Column + Priority */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  列
                </label>
                <select
                  value={column}
                  onChange={(e) => setColumn(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  优先级
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full px-2.5 py-1.5 text-xs border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>

            {/* Row 2: Due Date (Natural Language) */}
            <div>
              <NaturalLanguageDateInput
                value={dueDate}
                onChange={(date) => setDueDate(date || '')}
                label="截止日期（可选）"
                placeholder="输入日期（例如 “tomorrow”、“next Friday”、“in 2 weeks”）"
              />
            </div>

            {/* Description (optional, collapsible) */}
            <div>
              <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                描述（可选）
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加更多详情…"
                rows={2}
                className="w-full px-2.5 py-1.5 text-xs border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
              />
            </div>

            {/* Tags (from template) */}
            {tags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
                  标签
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 text-[10px] font-medium bg-accent-blue/10 text-accent-blue rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 bg-surface-light-elevated dark:bg-surface-dark border-t border-border-light dark:border-border-dark flex items-center justify-between flex-shrink-0">
            <div className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary">
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark">
                ⌘
              </kbd>
              {' + '}
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated rounded border border-border-light dark:border-border-dark">
                Enter
              </kbd>
              {' '}创建
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-medium bg-surface-light dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg border border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建任务
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
