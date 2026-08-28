/**
 * AI Agent Panel
 *
 * Global right-side panel sharing the exact transcript with the homepage
 * AI 指挥中心. Opened from the sidebar 「AI 助手」 entry, the floating
 * action button, or Ctrl/Cmd+Shift+A. The classic AI Terminal (provider
 * settings, notes workspace, multi-conversations) remains reachable via
 * the header button.
 */

import React, { useEffect } from 'react';
import { SquareTerminal, Sparkles, Trash2, X } from 'lucide-react';
import { useAIRuntime } from '../../hooks/useAIRuntime';
import { useAgentPanelStore } from '../../stores/useAgentPanelStore';
import { useTerminalStore } from '../../stores/useTerminalStore';
import { AgentComposer } from './AgentComposer';
import { AgentMessageList } from './AgentMessageList';
import { AGENT_QUICK_PROMPTS } from './quickPrompts';

export const AIAgentPanel: React.FC = () => {
  const { isOpen, close } = useAgentPanelStore();
  const openClassicTerminal = useTerminalStore((s) => s.toggleTerminal);

  const {
    messages,
    mode,
    isStreaming,
    streamingContent,
    inputDraft,
    setInputDraft,
    sendMessage,
    confirmAction,
    rejectAction,
    undoAction,
    clearConversation,
    pendingWriteCount,
    needsSetup,
    executionMode,
  } = useAIRuntime();

  // Escape closes the panel
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const handleOpenClassic = () => {
    close();
    openClassicTerminal();
  };

  return (
    <aside
      data-testid="ai-agent-panel"
      role="dialog"
      aria-label="AI 管理面板"
      className="fixed bottom-0 right-0 top-0 z-40 flex h-full w-full flex-col border-l border-border-light bg-surface-light shadow-2xl sm:w-[400px] dark:border-border-dark dark:bg-surface-dark"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              AI 管理面板
              {pendingWriteCount > 0 && (
                <span className="ml-1.5 rounded-full bg-accent-yellow/20 px-1.5 py-0.5 text-[10px] font-medium text-accent-yellow">
                  {pendingWriteCount} 待确认
                </span>
              )}
            </p>
            <p className="text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
              {mode === 'tools' ? '工具模式' : '聊天模式'} ·{' '}
              {executionMode === 'ask'
                ? '写操作需确认'
                : executionMode === 'auto'
                  ? '自动执行'
                  : '只读'} · 与首页指挥中心共享同一会话
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenClassic}
            title="打开经典 AI 终端（多会话 / 提供商设置）"
            aria-label="打开经典 AI 终端"
            className="rounded-lg p-1.5 text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-primary"
          >
            <SquareTerminal className="h-4 w-4" />
          </button>
          <button
            onClick={() => clearConversation()}
            title="清空当前模式的对话"
            aria-label="清空当前模式的对话"
            className="rounded-lg p-1.5 text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-accent-red dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={close}
            title="关闭面板（Esc）"
            aria-label="关闭 AI 面板"
            className="rounded-lg p-1.5 text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Transcript (scrolls internally; auto-follow never scrolls the page) */}
      <AgentMessageList
        containerClassName="flex-1 px-4 py-3"
        messages={messages}
        isStreaming={isStreaming}
        streamingContent={streamingContent}
        onConfirmAction={confirmAction}
        onRejectAction={rejectAction}
        onUndoAction={undoAction}
        emptyHint={
          <div className="rounded-xl bg-accent-primary/5 p-3 text-sm leading-relaxed text-text-light-secondary dark:text-text-dark-secondary">
            你好！我是你的 LifeOS 管理助手，可以直接帮你创建/修改任务、安排日程、写笔记。
            所有改动都会先让你确认。试试下面的快捷指令，或直接输入需求。
          </div>
        }
      />

      {/* Composer */}
      <div className="border-t border-border-light p-3 dark:border-border-dark">
        <AgentComposer
          value={inputDraft}
          onChange={setInputDraft}
          onSend={(text) => sendMessage(text)}
          isStreaming={isStreaming}
          needsSetup={needsSetup}
          quickPrompts={AGENT_QUICK_PROMPTS.slice(0, 4)}
          autoFocus
        />
      </div>
    </aside>
  );
};
