/**
 * AI Quick Actions
 * Floating action button that provides contextual AI actions for notes and tasks.
 * Uses the AI terminal's provider router to execute actions.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTerminalStore } from '../stores/useTerminalStore';
import type { AIContext } from '../stores/useTerminalStore';

interface AIQuickAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
}

const NOTE_ACTIONS: AIQuickAction[] = [
  { id: 'summarize', label: '总结', icon: '📋', prompt: '请对以下笔记进行简洁总结：\n\n' },
  { id: 'expand', label: '扩写', icon: '📝', prompt: '请对以下笔记进行更详细的扩充：\n\n' },
  { id: 'fix-grammar', label: '修正语法', icon: '✏️', prompt: '请修正以下文本的语法并提升清晰度：\n\n' },
  { id: 'translate', label: '翻译', icon: '🌐', prompt: '请将以下文本翻译成英文（若已是英文，则翻译成西班牙语）：\n\n' },
  { id: 'outline', label: '生成大纲', icon: '📑', prompt: '请根据以下笔记生成结构化大纲：\n\n' },
];

const TASK_ACTIONS: AIQuickAction[] = [
  { id: 'subtasks', label: '拆分为子任务', icon: '📊', prompt: '请将此任务拆分为更小、可执行的子任务：\n\n' },
  { id: 'estimate', label: '预估时间', icon: '⏱️', prompt: '请预估完成此任务所需的时间并说明理由：\n\n' },
  { id: 'description', label: '撰写描述', icon: '📝', prompt: '请为此任务撰写详细描述：\n\n' },
];

interface AIQuickActionsProps {
  context: AIContext;
  onActionResult?: (result: string) => void;
}

export const AIQuickActions: React.FC<AIQuickActionsProps> = ({ context, onActionResult }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const setActiveContext = useTerminalStore((s) => s.setActiveContext);
  const addMessage = useTerminalStore((s) => s.addMessage);
  const setOpen = useTerminalStore((s) => s.setOpen);

  const actions = context.type === 'note' ? NOTE_ACTIONS : TASK_ACTIONS;

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setResult(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const handleAction = useCallback(
    (action: AIQuickAction) => {
      // Set context in terminal store and send to AI terminal
      setActiveContext(context);
      const fullPrompt = action.prompt + `Title: ${context.title}\n\n${context.content}`;

      // Add as user message and open terminal
      addMessage({ role: 'user', content: fullPrompt });
      setOpen(true);
      setIsOpen(false);
      setResult(null);
    },
    [context, setActiveContext, addMessage, setOpen]
  );

  return (
    <div className="relative" ref={popoverRef}>
      {/* Floating Action Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setResult(null);
        }}
        className={`
          p-2 rounded-full shadow-lg transition-all duration-200
          ${isOpen
            ? 'bg-accent-primary text-white scale-110'
            : 'bg-gradient-to-r from-accent-blue to-accent-primary text-white hover:scale-105 hover:shadow-xl'
          }
        `}
        title="AI 快捷操作"
        aria-label="AI 快捷操作"
      >
        {isOpen ? <X size={16} /> : <Sparkles size={16} />}
      </button>

      {/* Popover */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-56 bg-surface-dark rounded-lg shadow-2xl border border-border-dark overflow-hidden z-50">
          {/* Header */}
          <div className="px-3 py-2 border-b border-border-dark bg-surface-dark-elevated">
            <div className="flex items-center gap-2">
              <Sparkles size={12} className="text-accent-primary" />
              <span className="text-xs font-medium text-text-dark-primary">
                {context.type === 'note' ? '笔记' : '任务'}的 AI 操作
              </span>
            </div>
            <p className="text-[10px] text-text-dark-tertiary mt-0.5 truncate">
              {context.title}
            </p>
          </div>

          {/* Actions List */}
          <div className="py-1">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isLoading}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
                  hover:bg-surface-dark-elevated disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <span className="text-base flex-shrink-0">{action.icon}</span>
                <span className="text-text-dark-primary">{action.label}</span>
                {isLoading && (
                  <span className="ml-auto text-xs text-accent-primary animate-pulse">...</span>
                )}
              </button>
            ))}
          </div>

          {/* Result Preview */}
          {result && (
            <div className="px-3 py-2 border-t border-border-dark bg-surface-dark-elevated">
              <p className="text-xs text-text-dark-secondary line-clamp-4">{result}</p>
              <button
                onClick={() => {
                  onActionResult?.(result);
                  setResult(null);
                  setIsOpen(false);
                }}
                className="mt-1.5 text-xs text-accent-blue hover:underline"
              >
                应用结果
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
