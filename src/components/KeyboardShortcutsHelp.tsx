import React from 'react';
import { Modal } from './Modal';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Keyboard Shortcuts Help Modal
 * Shows all available keyboard shortcuts organized by category
 */
export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcuts = [
    {
      category: '全局',
      items: [
        { keys: ['Ctrl+K'], description: '打开 Synapse（命令面板）' },
        { keys: ['F1'], description: '打开帮助与支持' },
        { keys: ['Ctrl+/'], description: '打开帮助' },
        { keys: ['Ctrl+B'], description: '切换侧边栏' },
        { keys: ['Ctrl+Shift+A'], description: '前往 AI 指挥中心' },
        { keys: ['Ctrl+Shift+P'], description: '切换项目上下文' },
        { keys: ['Esc'], description: '关闭弹窗 / 清除选择' },
      ],
    },
    {
      category: '导航（Ctrl+数字键）',
      items: [
        { keys: ['Ctrl+1'], description: '首页' },
        { keys: ['Ctrl+2'], description: '今日' },
        { keys: ['Ctrl+3'], description: '笔记' },
        { keys: ['Ctrl+4'], description: '任务' },
        { keys: ['Ctrl+5'], description: '日程' },
        { keys: ['Ctrl+6'], description: '创建（文档）' },
        { keys: ['Ctrl+7'], description: '链接库' },
        { keys: ['Ctrl+8'], description: '设置' },
      ],
    },
    {
      category: '跳转（先按 G 再按按键）',
      items: [
        { keys: ['G', 'D'], description: '前往首页' },
        { keys: ['G', 'T'], description: '前往任务' },
        { keys: ['G', 'N'], description: '前往笔记' },
        { keys: ['G', 'H'], description: '前往习惯' },
        { keys: ['G', 'C'], description: '前往日历' },
        { keys: ['G', 'S'], description: '前往设置' },
        { keys: ['G', 'O'], description: '前往今日' },
        { keys: ['G', 'L'], description: '前往链接' },
        { keys: ['G', 'F'], description: '前往专注' },
      ],
    },
    {
      category: '快速创建',
      items: [
        { keys: ['C'], description: '快速添加任务' },
        { keys: ['Ctrl+N'], description: '新建笔记' },
        { keys: ['Ctrl+T'], description: '新建任务' },
        { keys: ['Ctrl+E'], description: '新建事件（前往日历）' },
        { keys: ['Ctrl+Shift+T'], description: '智能模板' },
      ],
    },
    {
      category: '看板',
      items: [
        { keys: ['J'], description: '向下移动到下一个任务' },
        { keys: ['K'], description: '向上移动到上一个任务' },
        { keys: ['H'], description: '向左移动到上一列' },
        { keys: ['L'], description: '向右移动到下一列' },
        { keys: ['N'], description: '在当前列新建任务' },
        { keys: ['E'], description: '编辑所选任务' },
        { keys: ['D'], description: '删除所选任务' },
      ],
    },
    {
      category: '笔记编辑器',
      items: [
        { keys: ['Ctrl+D'], description: '创建每日笔记' },
        { keys: ['Ctrl+Shift+E'], description: '导出笔记' },
        { keys: ['Ctrl+B'], description: '加粗文本' },
        { keys: ['Ctrl+I'], description: '斜体文本' },
        { keys: ['Ctrl+U'], description: '下划线文本' },
        { keys: ['/'], description: '打开斜杠命令' },
        { keys: ['[['], description: '插入 wiki 链接' },
      ],
    },
    {
      category: 'Synapse（命令面板）',
      items: [
        { keys: ['>'], description: '进入命令模式' },
        { keys: ['?'], description: '进入帮助模式' },
        { keys: ['/'], description: '进入导航模式' },
        { keys: ['tag:name'], description: '按标签筛选' },
        { keys: ['date:today'], description: '按日期筛选' },
      ],
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="键盘快捷键">
      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
        {shortcuts.map((section) => (
          <div key={section.category}>
            <h4 className="text-sm font-semibold text-accent-blue mb-2 uppercase tracking-wide">
              {section.category}
            </h4>
            <div className="space-y-1">
              {section.items.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-1.5 border-b border-border-light dark:border-border-dark last:border-0"
                >
                  <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                    {shortcut.description}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    {shortcut.keys.map((key, keyIndex) => (
                      <kbd
                        key={keyIndex}
                        className="px-2 py-1 text-xs font-mono font-semibold bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-button border border-border-light dark:border-border-dark shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-3 border-t border-border-light dark:border-border-dark">
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            提示：单键快捷键（C、G、J、K、H、L）仅在未在输入框中输入时生效。在 Mac 上请使用 Cmd 代替 Ctrl。
          </p>
        </div>
      </div>
    </Modal>
  );
};
