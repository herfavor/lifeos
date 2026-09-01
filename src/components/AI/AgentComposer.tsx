/**
 * AgentComposer
 *
 * Shared input row for the AI 指挥中心 and side panel: auto-growing
 * textarea, Enter-to-send, optional quick-prompt chips, and a provider
 * setup hint when no API key is configured yet.
 */

import React, { useEffect, useRef } from 'react';
import { KeyRound, Loader2, Send, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { QuickPrompt } from './quickPrompts';

interface AgentComposerProps {
  value: string;
  onChange: (value: string) => void;
  /** Called with the chip's prompt when a quick prompt is clicked, else with no args. */
  onSend: (text?: string) => void;
  isStreaming: boolean;
  needsSetup?: boolean;
  quickPrompts?: QuickPrompt[];
  placeholder?: string;
  helperText?: string;
  autoFocus?: boolean;
}

export const AgentComposer: React.FC<AgentComposerProps> = ({
  value,
  onChange,
  onSend,
  isStreaming,
  needsSetup = false,
  quickPrompts,
  placeholder = '让 AI 帮你创建任务、安排日程、写笔记…',
  helperText = '写操作需逐条确认后执行 · Enter 发送 · Shift+Enter 换行 · 对话仅保存在本机',
  autoFocus = false,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) {
      // Slight delay lets opening transitions finish before focus steals scroll
      const t = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div>
      {needsSetup && (
        <Link
          to="/settings?tab=ai"
          className="mb-2 flex items-center gap-2 rounded-xl border border-dashed border-border-light p-2.5 text-sm text-accent-primary transition-colors hover:bg-accent-primary/5 dark:border-border-dark"
        >
          <KeyRound className="h-4 w-4 shrink-0" />
          尚未配置 AI 提供商，点击前往设置（API 密钥本地加密存储）
        </Link>
      )}

      {quickPrompts && quickPrompts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quickPrompts.map((qp) => {
            const Icon = qp.icon;
            return (
              <button
                key={qp.label}
                onClick={() => onSend(qp.prompt)}
                disabled={isStreaming}
                title={qp.prompt}
                className="flex items-center gap-1.5 rounded-full border border-border-light px-3 py-1 text-xs text-text-light-secondary transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 dark:border-border-dark dark:text-text-dark-secondary"
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {qp.label}
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          data-testid="agent-composer-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={Math.min(3, Math.max(1, value.split('\n').length))}
          className="max-h-24 flex-1 resize-none rounded-xl border border-border-light bg-surface-light-elevated px-3 py-2 text-sm text-text-light-primary placeholder-text-light-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark-elevated dark:text-text-dark-primary dark:placeholder-text-dark-tertiary"
        />
        <button
          onClick={() => onSend()}
          disabled={!value.trim() || isStreaming}
          aria-label="发送"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-white transition-opacity disabled:opacity-40"
        >
          {isStreaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1.5 flex items-center justify-center gap-1 text-center text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
        <Sparkles className="h-3 w-3" />
        {helperText}
      </p>
    </div>
  );
};
