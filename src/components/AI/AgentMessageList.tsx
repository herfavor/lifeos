/**
 * AgentMessageList
 *
 * Renders the shared agent transcript: user/assistant bubbles (sanitized
 * Markdown) with an assistant avatar, inline action cards with
 * confirmation controls, and the live streaming bubble while a reply is
 * being generated.
 *
 * Owns its scroll container so auto-follow can NEVER scroll ancestors
 * (the page itself): `scrollIntoView` used to drag the whole Dashboard
 * upward on every send/streaming chunk. Follow rules:
 * - Always follow when the user has just sent a message.
 * - Otherwise follow only while pinned near the bottom, so scrolling up
 *   to read history isn't yanked back down mid-stream.
 */

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import { ChevronDown, Loader2, SearchCheck, Sparkles } from 'lucide-react';
import type { AgentChatMessage, AITraceEntry, ProposedAction } from '../../services/ai/agent/types';
import { AgentActionCard } from './AgentActionCard';
import { agentSanitizeSchema } from './sanitizeSchema';

interface AgentMessageListProps {
  messages: AgentChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  emptyHint?: React.ReactNode;
  /** Layout classes for the internal scroll container (height/padding). */
  containerClassName?: string;
  onConfirmAction?: (messageId: string, actionId: string) => void;
  onRejectAction?: (messageId: string, actionId: string) => void;
  onUndoAction?: (messageId: string, actionId: string) => void;
}

function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words dark:prose-invert [&_a]:break-all [&_code]:break-all [&_pre]:overflow-x-auto">
      <ReactMarkdown rehypePlugins={[[rehypeSanitize, agentSanitizeSchema]]}>{text}</ReactMarkdown>
    </div>
  );
}

/** Distance from the bottom within which the view counts as "pinned". */
const PIN_THRESHOLD_PX = 80;

/** Compact 「操作过程」strip: which data the AI queried to answer. */
function TraceStrip({ trace }: { trace: AITraceEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  if (trace.length === 0) return null;

  return (
    <div className="mt-2 rounded-lg border border-border-light/70 bg-surface-light/60 px-2.5 py-1.5 dark:border-border-dark/70 dark:bg-surface-dark/60">
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-1.5 text-[11px] text-text-light-tertiary transition-colors hover:text-accent-primary dark:text-text-dark-tertiary"
      >
        <SearchCheck className="h-3 w-3 shrink-0 text-accent-blue" />
        <span className="font-medium">查询过程</span>
        <span className="hidden shrink-0 sm:inline">
          {trace.map((entry) => `${entry.label} · ${entry.summary}`).join(' ／ ')}
        </span>
        <span className="inline shrink-0 sm:hidden">{trace.length} 次查询</span>
        <ChevronDown
          className={`ml-auto h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="mt-1.5 space-y-1.5 border-t border-border-light/60 pt-1.5 dark:border-border-dark/60">
          {trace.map((entry, index) => (
            <div key={`${entry.tool}-${index}`} className="text-[11px] leading-relaxed">
              <p className="font-medium text-text-light-secondary dark:text-text-dark-secondary">
                {index + 1}. {entry.label} —— {entry.summary}
              </p>
              <pre className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded-md bg-surface-light-elevated/80 p-2 text-[10px] text-text-light-secondary dark:bg-surface-dark-elevated/80 dark:text-text-dark-secondary">
                {entry.detail}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActionGroup({
  messageId,
  actions,
  onConfirmAction,
  onRejectAction,
  onUndoAction,
}: {
  messageId: string;
  actions: ProposedAction[];
  onConfirmAction?: AgentMessageListProps['onConfirmAction'];
  onRejectAction?: AgentMessageListProps['onRejectAction'];
  onUndoAction?: AgentMessageListProps['onUndoAction'];
}) {
  if (actions.length === 1) {
    const action = actions[0];
    return (
      <AgentActionCard
        action={action}
        onConfirm={onConfirmAction ? () => onConfirmAction(messageId, action.id) : undefined}
        onReject={onRejectAction ? () => onRejectAction(messageId, action.id) : undefined}
        onUndo={onUndoAction ? () => onUndoAction(messageId, action.id) : undefined}
      />
    );
  }

  const pending = actions.filter((a) => a.status === 'pending').length;
  const failed = actions.filter((a) => a.status === 'failed' || a.status === 'blocked').length;
  const executed = actions.filter((a) => a.status === 'executed').length;
  const rejected = actions.filter((a) => a.status === 'rejected').length;
  const shouldOpen = pending > 0 || failed > 0;
  const summary = pending > 0
    ? `${pending} 项待确认`
    : failed > 0
      ? `${failed} 项需要处理`
      : executed > 0
        ? `已完成 ${executed} 项操作`
        : `已处理 ${actions.length - rejected} 项操作`;

  return (
    <details
      open={shouldOpen}
      className="group rounded-xl border border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark"
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs [&::-webkit-details-marker]:hidden">
        <span className={`flex h-5 w-5 items-center justify-center rounded-full ${
          failed > 0
            ? 'bg-status-error/10 text-status-error'
            : pending > 0
              ? 'bg-status-warning/10 text-status-warning'
              : 'bg-status-success/10 text-status-success'
        }`}>
          {failed > 0 ? '!' : pending > 0 ? '…' : '✓'}
        </span>
        <span className="font-medium text-text-light-primary dark:text-text-dark-primary">{summary}</span>
        <span className="truncate text-text-light-tertiary dark:text-text-dark-tertiary">
          {actions.slice(0, 3).map((a) => a.summary).join(' · ')}
          {actions.length > 3 ? ` · +${actions.length - 3}` : ''}
        </span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-text-light-tertiary transition-transform group-open:rotate-180 dark:text-text-dark-tertiary" />
      </summary>
      <div className="space-y-1.5 border-t border-border-light px-2 py-2 dark:border-border-dark">
        {actions.map((action) => (
          <AgentActionCard
            key={action.id}
            action={action}
            onConfirm={onConfirmAction ? () => onConfirmAction(messageId, action.id) : undefined}
            onReject={onRejectAction ? () => onRejectAction(messageId, action.id) : undefined}
            onUndo={onUndoAction ? () => onUndoAction(messageId, action.id) : undefined}
          />
        ))}
        {pending > 1 && onConfirmAction && (
          <button
            onClick={() => actions.filter((a) => a.status === 'pending').forEach((a) => onConfirmAction(messageId, a.id))}
            className="w-full rounded-lg bg-accent-primary px-3 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
          >
            一次确认这 {pending} 项
          </button>
        )}
      </div>
    </details>
  );
}

export const AgentMessageList: React.FC<AgentMessageListProps> = ({
  messages,
  isStreaming,
  streamingContent,
  emptyHint,
  containerClassName,
  onConfirmAction,
  onRejectAction,
  onUndoAction,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const prevCountRef = useRef(messages.length);

  // Track whether the user is pinned near the bottom of THIS container.
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distance < PIN_THRESHOLD_PX;
  };

  // Auto-follow, scoped strictly to the transcript container.
  useEffect(() => {
    const el = scrollRef.current;
    const count = messages.length;
    const addedMessage = count > prevCountRef.current;
    prevCountRef.current = count;
    if (!el) return;

    const lastIsUser = messages[count - 1]?.role === 'user';
    // A freshly sent user message always brings itself into view.
    const follow = stickToBottomRef.current || (addedMessage && lastIsUser);
    if (!follow) return;

    try {
      el.scrollTo({ top: el.scrollHeight });
    } catch {
      // jsdom / legacy engines: direct assignment is universally supported.
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamingContent]);

  const showStreamingText = isStreaming && streamingContent.length > 0;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={`space-y-3.5 overflow-y-auto ${containerClassName ?? ''}`}
    >
      {messages.length === 0 && !isStreaming && emptyHint}

      {messages.map((m) => {
        // Intermediate tool-calling rounds are hidden: the final answer of
        // the turn carries a compact process trace instead.
        if (m.transient) return null;

        // A message that is only actions (no prose) renders as a card stack
        const hasProse = m.content.trim().length > 0;
        if (!hasProse && !m.actions?.length && !m.isError && !m.trace?.length) return null;

        return (
          <div
            key={m.id}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <span
                aria-hidden
                className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            )}
            <div
              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === 'user'
                  ? 'rounded-br-md bg-accent-primary text-white'
                  : m.isError
                    ? 'rounded-bl-md border border-accent-red/30 bg-accent-red/5'
                    : 'rounded-bl-md border border-border-light/70 bg-surface-light dark:border-border-dark/70 dark:bg-surface-dark'
              }`}
            >
              {m.role === 'user' ? (
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
              ) : (
                <>
                  {hasProse && <MarkdownContent text={m.content} />}
                  {m.trace && m.trace.length > 0 && <TraceStrip trace={m.trace} />}
                  {m.actions && m.actions.length > 0 && (
                    <div className={`space-y-1.5 ${hasProse || (m.trace?.length ?? 0) > 0 ? 'mt-2 border-t border-border-light pt-2 dark:border-border-dark' : ''}`}>
                      <ActionGroup
                        messageId={m.id}
                        actions={m.actions}
                        onConfirmAction={onConfirmAction}
                        onRejectAction={onRejectAction}
                        onUndoAction={onUndoAction}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Streaming bubble */}
      {isStreaming && (
        <div className="flex justify-start">
          <span
            aria-hidden
            className="mr-2 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border-light/70 bg-surface-light px-3.5 py-2.5 text-sm text-text-light-primary dark:border-border-dark/70 dark:bg-surface-dark dark:text-text-dark-primary">
            {showStreamingText ? (
              <MarkdownContent text={streamingContent} />
            ) : (
              <span className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                思考中…
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
