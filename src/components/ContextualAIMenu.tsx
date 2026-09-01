/**
 * Contextual AI Actions Menu
 *
 * A dropdown menu that provides context-specific AI actions for different modules.
 * For Notes: summarize, extract action items, improve writing, generate outline
 * For Tasks: break into subtasks, estimate time, write description
 * For Calendar: draft meeting agenda, suggest preparation
 *
 * Each action sends context + instruction to the AI Terminal.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Sparkles, BarChart3, CheckCircle2, ClipboardList, FileText, GraduationCap, ListTree, Pencil, Timer, type LucideIcon } from 'lucide-react';
import { useTerminalStore } from '../stores/useTerminalStore';

export type AIContextType = 'note' | 'task' | 'calendar';

interface AIAction {
  id: string;
  label: string;
  icon: LucideIcon;
  instruction: string;
}

const NOTE_ACTIONS: AIAction[] = [
  {
    id: 'summarize',
    label: '总结',
    icon: ClipboardList,
    instruction: '请对以下笔记进行简洁总结，突出关键要点：',
  },
  {
    id: 'extract-actions',
    label: '提取待办事项',
    icon: CheckCircle2,
    instruction: '请从该笔记中提取所有待办事项和任务，以编号列表形式呈现：',
  },
  {
    id: 'improve-writing',
    label: '改进写作',
    icon: Pencil,
    instruction: '请改进该笔记的写作质量：修正语法、提升清晰度和可读性，同时保留原意：',
  },
  {
    id: 'generate-outline',
    label: '生成大纲',
    icon: ListTree,
    instruction: '请根据该笔记的内容生成结构化大纲：',
  },
];

const TASK_ACTIONS: AIAction[] = [
  {
    id: 'break-subtasks',
    label: '拆分为子任务',
    icon: BarChart3,
    instruction: '请将此任务拆分为更小、可执行的子任务，并为每个子任务附上简要说明：',
  },
  {
    id: 'estimate-time',
    label: '预估时间',
    icon: Timer,
    instruction: '请预估完成此任务所需的时间，考虑复杂度并给出范围（乐观、现实、悲观）：',
  },
  {
    id: 'write-description',
    label: '撰写描述',
    icon: FileText,
    instruction: '请为此任务撰写详细描述，包括验收标准和实施说明：',
  },
];

const CALENDAR_ACTIONS: AIAction[] = [
  {
    id: 'draft-agenda',
    label: '起草会议议程',
    icon: ClipboardList,
    instruction: '请为此事件起草会议议程，包括讨论主题、时间分配和需要涵盖的待办事项：',
  },
  {
    id: 'suggest-prep',
    label: '建议准备工作',
    icon: GraduationCap,
    instruction: '请为此事件建议准备工作：会议前应该准备好什么？',
  },
];

function getActionsForType(type: AIContextType): AIAction[] {
  switch (type) {
    case 'note':
      return NOTE_ACTIONS;
    case 'task':
      return TASK_ACTIONS;
    case 'calendar':
      return CALENDAR_ACTIONS;
  }
}

interface ContextualAIMenuProps {
  contextType: AIContextType;
  contextTitle: string;
  contextContent: string;
  contextId: string;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}

export const ContextualAIMenu: React.FC<ContextualAIMenuProps> = ({
  contextType,
  contextTitle,
  contextContent,
  contextId,
  className = '',
  buttonClassName = '',
  iconSize = 14,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const setActiveContext = useTerminalStore((s) => s.setActiveContext);
  const setOpen = useTerminalStore((s) => s.setOpen);
  const addMessage = useTerminalStore((s) => s.addMessage);
  const activeConversationId = useTerminalStore((s) => s.activeConversationId);
  const createConversation = useTerminalStore((s) => s.createConversation);

  const actions = getActionsForType(contextType);

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const handleAction = useCallback(
    (action: AIAction) => {
      // Set context in the terminal store
      setActiveContext({
        type: contextType === 'calendar' ? 'cross-module' : contextType,
        id: contextId,
        title: contextTitle,
        content: contextContent,
      });

      // Open the AI terminal
      setOpen(true);

      // Auto-create conversation if none active
      if (!activeConversationId) {
        createConversation(`${action.label}: ${contextTitle.substring(0, 30)}`);
      }

      // Send the instruction as a user message
      const userMessage = `${action.instruction}\n\n---\n**${contextTitle}**\n${contextContent.slice(0, 2000)}`;
      addMessage({
        role: 'user',
        content: userMessage,
      });

      setIsOpen(false);
    },
    [contextType, contextId, contextTitle, contextContent, setActiveContext, setOpen, addMessage, activeConversationId, createConversation]
  );

  return (
    <div ref={menuRef} className={`relative inline-block ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-1.5 rounded transition-all hover:bg-accent-primary/10 text-text-light-secondary dark:text-text-dark-secondary hover:text-accent-primary ${buttonClassName}`}
        title="AI 操作"
        aria-label="打开 AI 操作菜单"
      >
        <Sparkles size={iconSize} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-1.5 border-b border-border-light dark:border-border-dark">
            <span className="text-[10px] font-medium text-text-light-secondary dark:text-text-dark-tertiary uppercase tracking-wider">
              AI 操作
            </span>
          </div>
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              className="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors text-text-light-primary dark:text-text-dark-primary"
            >
              <action.icon className="h-4 w-4 flex-shrink-0" aria-hidden />
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
