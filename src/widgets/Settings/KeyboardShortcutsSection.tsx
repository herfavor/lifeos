/**
 * Keyboard Shortcuts Settings Section
 *
 * Shows all available keyboard shortcuts grouped by context.
 * Allows rebinding shortcuts with conflict detection.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, RotateCcw, AlertTriangle, Search } from 'lucide-react';
import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  parseKeyboardEvent,
  type ShortcutDefinition,
  type ShortcutContext,
} from '../../services/shortcuts';
import { useKeyboardShortcutsStore } from '../../stores/useKeyboardShortcutsStore';

interface ShortcutGroup {
  context: ShortcutContext;
  label: string;
  shortcuts: ShortcutDefinition[];
}

// Additional shortcuts from across the app (not all registered centrally)
const EXTENDED_SHORTCUTS: ShortcutDefinition[] = [
  // Global
  { id: 'toggle-sidebar', keys: ['mod', 'b'], label: '切换侧边栏', context: 'global' },
  { id: 'go-dashboard', keys: ['g', 'd'], label: '前往首页', context: 'global' },
  { id: 'go-tasks', keys: ['g', 't'], label: '前往任务', context: 'global' },
  { id: 'go-notes', keys: ['g', 'n'], label: '前往笔记', context: 'global' },
  { id: 'go-calendar', keys: ['g', 'c'], label: '前往日历', context: 'global' },
  { id: 'go-settings', keys: ['g', 's'], label: '前往设置', context: 'global' },

  // Notes
  { id: 'new-note', keys: ['mod', 'n'], label: '新建笔记', context: 'notes' },
  { id: 'save-note', keys: ['mod', 's'], label: '保存笔记', context: 'notes' },
  { id: 'search-notes', keys: ['mod', 'f'], label: '在笔记中搜索', context: 'notes' },
  { id: 'bold', keys: ['mod', 'b'], label: '加粗文本', context: 'notes' },
  { id: 'italic', keys: ['mod', 'i'], label: '斜体文本', context: 'notes' },
  { id: 'underline', keys: ['mod', 'u'], label: '下划线文本', context: 'notes' },

  // Tasks / Kanban
  { id: 'new-task', keys: ['n'], label: '新建任务', context: 'kanban' },
  { id: 'search-tasks', keys: ['/'], label: '搜索任务', context: 'kanban' },

  // Calendar
  { id: 'new-event', keys: ['n'], label: '新建事件', context: 'calendar' },
  { id: 'today-view', keys: ['t'], label: '前往今天', context: 'calendar' },
  { id: 'prev-period', keys: ['left'], label: '上一个周期', context: 'calendar' },
  { id: 'next-period', keys: ['right'], label: '下一个周期', context: 'calendar' },
];

// EXTENDED_SHORTCUTS may overlap with centrally registered shortcuts; first
// definition wins so the list (and React keys) stays unique per shortcut id.
const ALL_SHORTCUTS = Array.from(
  new Map([...DEFAULT_SHORTCUTS, ...EXTENDED_SHORTCUTS].map((s) => [s.id, s])).values(),
);

const CONTEXT_LABELS: Record<ShortcutContext, string> = {
  global: '全局',
  kanban: '任务 / 看板',
  notes: '笔记编辑器',
  calendar: '日历',
  diagram: '绘图',
  modal: '弹窗',
};

function groupShortcuts(shortcuts: ShortcutDefinition[]): ShortcutGroup[] {
  const grouped = new Map<ShortcutContext, ShortcutDefinition[]>();

  for (const shortcut of shortcuts) {
    const context = shortcut.context ?? 'global';
    const existing = grouped.get(context) ?? [];
    existing.push(shortcut);
    grouped.set(context, existing);
  }

  const order: ShortcutContext[] = ['global', 'notes', 'kanban', 'calendar', 'diagram', 'modal'];

  return order
    .filter((ctx) => grouped.has(ctx))
    .map((ctx) => ({
      context: ctx,
      label: CONTEXT_LABELS[ctx],
      shortcuts: grouped.get(ctx)!,
    }));
}

export const KeyboardShortcutsSection: React.FC = () => {
  const customBindings = useKeyboardShortcutsStore((s) => s.customBindings);
  const setBinding = useKeyboardShortcutsStore((s) => s.setBinding);
  const resetBinding = useKeyboardShortcutsStore((s) => s.resetBinding);
  const resetAll = useKeyboardShortcutsStore((s) => s.resetAll);
  const checkConflict = useKeyboardShortcutsStore((s) => s.checkConflict);
  const getStoreBinding = useKeyboardShortcutsStore((s) => s.getBinding);

  const [rebindingId, setRebindingId] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const rebindRef = useRef<HTMLDivElement>(null);

  const hasCustomBindings = Object.keys(customBindings).length > 0;

  const getEffectiveKeys = useCallback(
    (shortcutId: string, defaultKeys: string[]): string[] => {
      return getStoreBinding(shortcutId, defaultKeys);
    },
    [getStoreBinding]
  );

  const handleRebindStart = useCallback((shortcutId: string) => {
    setRebindingId(shortcutId);
    setConflictWarning(null);
  }, []);

  const handleKeyCapture = useCallback(
    (e: KeyboardEvent) => {
      if (!rebindingId) return;

      e.preventDefault();
      e.stopPropagation();

      // Ignore lone modifier keys
      if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) return;

      // Escape cancels rebinding
      if (e.key === 'Escape') {
        setRebindingId(null);
        setConflictWarning(null);
        return;
      }

      const newKeys = parseKeyboardEvent(e);

      // Check for conflicts via the store
      const conflictLabel = checkConflict(newKeys, rebindingId);

      if (conflictLabel) {
        setConflictWarning(`与“${conflictLabel}”冲突`);
        // Still allow the binding, just warn
      } else {
        setConflictWarning(null);
      }

      // Save the new binding via the store
      setBinding(rebindingId, newKeys);
      setRebindingId(null);
    },
    [rebindingId, checkConflict, setBinding]
  );

  // Listen for key capture when rebinding
  useEffect(() => {
    if (rebindingId) {
      window.addEventListener('keydown', handleKeyCapture, true);
      return () => window.removeEventListener('keydown', handleKeyCapture, true);
    }
  }, [rebindingId, handleKeyCapture]);

  const handleResetShortcut = useCallback(
    (shortcutId: string) => {
      resetBinding(shortcutId);
    },
    [resetBinding]
  );

  const handleResetAll = useCallback(() => {
    resetAll();
    setConflictWarning(null);
  }, [resetAll]);

  // Filter shortcuts by search
  const groups = groupShortcuts(ALL_SHORTCUTS);
  const filteredGroups = searchQuery
    ? groups
        .map((group) => ({
          ...group,
          shortcuts: group.shortcuts.filter(
            (s) =>
              s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              s.id.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((g) => g.shortcuts.length > 0)
    : groups;

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <Keyboard className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            键盘快捷键
          </h2>
        </div>
        {hasCustomBindings && (
          <button
            onClick={handleResetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            全部重置
          </button>
        )}
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        查看并自定义键盘快捷键。点击快捷键可重新绑定。
      </p>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索快捷键…"
          className="w-full pl-9 pr-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-tertiary dark:placeholder:text-text-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Conflict Warning */}
      <AnimatePresence>
        {conflictWarning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 rounded-lg bg-status-warning-bg dark:bg-status-warning-bg-dark border border-status-warning-border dark:border-status-warning-border-dark flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 text-status-warning-text dark:text-status-warning-text-dark flex-shrink-0" />
            <p className="text-sm text-status-warning-text dark:text-status-warning-text-dark">
              {conflictWarning}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shortcut Groups */}
      <div className="space-y-6" ref={rebindRef}>
        {filteredGroups.map((group) => (
          <div key={group.context}>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary mb-3">
              {group.label}
            </h3>
            <div className="space-y-1">
              {group.shortcuts.map((shortcut) => {
                const effectiveKeys = getEffectiveKeys(shortcut.id, shortcut.keys);
                const isCustom = shortcut.id in customBindings;
                const isRebinding = rebindingId === shortcut.id;

                return (
                  <div
                    key={shortcut.id}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                      isRebinding
                        ? 'bg-accent-primary/10 ring-2 ring-accent-primary'
                        : 'hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {shortcut.label}
                      </p>
                      {shortcut.description && (
                        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                          {shortcut.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isRebinding ? (
                        <span className="px-3 py-1 text-xs font-medium rounded bg-accent-primary/20 text-accent-primary animate-pulse">
                          按下组合键…
                        </span>
                      ) : (
                        <button
                          onClick={() => handleRebindStart(shortcut.id)}
                          className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                            isCustom
                              ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
                              : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary border border-border-light dark:border-border-dark hover:border-accent-primary'
                          }`}
                          title="点击重新绑定"
                        >
                          {formatShortcut(effectiveKeys)}
                        </button>
                      )}

                      {isCustom && !isRebinding && (
                        <button
                          onClick={() => handleResetShortcut(shortcut.id)}
                          className="p-1 text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
                          title="重置为默认"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {filteredGroups.length === 0 && (
          <p className="text-center text-sm text-text-light-tertiary dark:text-text-dark-tertiary py-8">
            没有匹配搜索的快捷键
          </p>
        )}
      </div>
    </div>
  );
};
