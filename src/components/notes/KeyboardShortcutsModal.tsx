/**
 * KeyboardShortcutsModal Component
 *
 * Modal displaying keyboard shortcuts for the Notes page.
 * Part of the Notes Page Revolution - .
 *
 * Triggered by pressing ? key on the Notes page.
 */

import React from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from '../Modal';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: '文件夹导航',
    shortcuts: [
      { keys: ['↓', 'J'], description: '下一个文件夹' },
      { keys: ['↑', 'K'], description: '上一个文件夹' },
      { keys: ['→', 'L'], description: '展开或进入文件夹' },
      { keys: ['←', 'H'], description: '折叠或返回上级' },
      { keys: ['Enter'], description: '切换展开/折叠' },
      { keys: ['Home'], description: '前往全部笔记' },
      { keys: ['End'], description: '前往最后一个文件夹' },
    ],
  },
  {
    title: '笔记列表导航',
    shortcuts: [
      { keys: ['↓', 'J'], description: '下一条笔记' },
      { keys: ['↑', 'K'], description: '上一条笔记' },
      { keys: ['Enter'], description: '在编辑器中打开笔记' },
      { keys: ['F'], description: '切换收藏' },
      { keys: ['P'], description: '切换置顶' },
      { keys: ['D'], description: '删除笔记（需确认）' },
      { keys: ['Space'], description: '切换选择（批量模式）' },
      { keys: ['Home'], description: '第一条笔记' },
      { keys: ['End'], description: '最后一条笔记' },
    ],
  },
  {
    title: '全局快捷键',
    shortcuts: [
      { keys: ['Cmd', 'K'], description: '聚焦搜索' },
      { keys: ['Cmd', 'N'], description: '新建笔记' },
      { keys: ['Cmd', '\\'], description: '切换侧边栏' },
      { keys: ['Cmd', 'Shift', 'E'], description: '导出笔记' },
      { keys: ['?'], description: '显示此帮助' },
      { keys: ['Escape'], description: '关闭对话框/帮助' },
    ],
  },
];

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="键盘快捷键" maxWidth="xl">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-accent-primary/10 rounded-lg">
            <Keyboard className="w-6 h-6 text-accent-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
              键盘快捷键
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              使用键盘高效地导航和管理笔记
            </p>
          </div>
        </div>

        {/* Shortcut Groups */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-medium uppercase tracking-wide text-text-light-secondary dark:text-text-dark-secondary mb-3">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          <kbd className="px-2 py-1 text-xs font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded">
                            {key}
                          </kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-text-light-tertiary dark:text-text-dark-tertiary text-xs">
                              +
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary text-center">
            随时按 <kbd className="px-1.5 py-0.5 text-xs font-mono bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded">?</kbd> 显示此帮助
          </p>
        </div>
      </div>
    </Modal>
  );
};
