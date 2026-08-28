/**
 * AgentActionCard
 *
 * One compact operation row. Normal execution is deliberately neutral; color
 * is reserved for waiting, failure and destructive/risky states so the AI
 * transcript reads like a conversation instead of a system dashboard.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Calendar,
  Check,
  CheckSquare,
  ChevronDown,
  FileText,
  Flag,
  FolderKanban,
  Loader2,
  RotateCcw,
  Search,
  ShieldAlert,
  Target,
  Timer,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import type { ProposedAction } from '../../services/ai/agent/types';
import { AGENT_TOOLS } from '../../services/ai/agent/tools';
import {
  formatActionParams,
  toolCategory,
  toolDestination,
} from '../../services/ai/agent/capabilityMeta';

interface AgentActionCardProps {
  action: ProposedAction;
  onConfirm?: (actionId: string) => void;
  onReject?: (actionId: string) => void;
  onUndo?: (actionId: string) => void;
}

function toolIcon(tool: ProposedAction['tool']): React.ReactNode {
  if (tool.startsWith('list_')) return <Search className="h-3.5 w-3.5" />;
  switch (toolCategory(tool)) {
    case 'task': return <CheckSquare className="h-3.5 w-3.5" />;
    case 'calendar': return <Calendar className="h-3.5 w-3.5" />;
    case 'note': return <FileText className="h-3.5 w-3.5" />;
    case 'project': return <FolderKanban className="h-3.5 w-3.5" />;
    case 'time': return <Timer className="h-3.5 w-3.5" />;
    case 'planning': return <Target className="h-3.5 w-3.5" />;
    case 'automation':
    case 'routine':
    case 'resource':
    case 'template':
      return <Wrench className="h-3.5 w-3.5" />;
    default:
      return <Flag className="h-3.5 w-3.5" />;
  }
}

function Status({ action }: { action: ProposedAction }) {
  const isWrite = AGENT_TOOLS[action.tool]?.risk === 'write';
  switch (action.status) {
    case 'pending':
      return isWrite ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-warning">
          <ShieldAlert className="h-3 w-3" />待确认
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
          <Search className="h-3 w-3" />查询
        </span>
      );
    case 'executing':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
          <Loader2 className="h-3 w-3 animate-spin" />执行中
        </span>
      );
    case 'executed':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
          <Check className="h-3 w-3" />已执行
        </span>
      );
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-error">
          <XCircle className="h-3 w-3" />失败
        </span>
      );
    case 'rejected':
      return <span className="text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">已忽略</span>;
    case 'blocked':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-status-error">
          <ShieldAlert className="h-3 w-3" />已拦截
        </span>
      );
    default:
      return null;
  }
}

export const AgentActionCard: React.FC<AgentActionCardProps> = ({
  action,
  onConfirm,
  onReject,
  onUndo,
}) => {
  const def = AGENT_TOOLS[action.tool];
  const isWrite = def?.risk === 'write';
  const isPending = action.status === 'pending';
  const isExecuted = action.status === 'executed';
  const paramPairs = formatActionParams(action.tool, action.params);
  const destination = isExecuted
    ? toolDestination(action.tool, action.params, action.result)
    : undefined;
  const resultText = action.result?.message ?? '';
  const [resultExpanded, setResultExpanded] = useState(false);
  const resultTooLong = resultText.length > 220;

  const exceptional = action.status === 'failed' || action.status === 'blocked';
  const tone = exceptional
    ? 'border-status-error/30 bg-status-error/5'
    : 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark';

  return (
    <div
      data-testid={`agent-action-${action.status}`}
      className={`rounded-lg border px-3 py-2.5 ${tone}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-light-elevated text-text-light-secondary dark:bg-surface-dark-elevated dark:text-text-dark-secondary">
          {toolIcon(action.tool)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-xs font-medium leading-5 text-text-light-primary dark:text-text-dark-primary">
                {action.summary}
              </p>
              <p className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">
                {def?.label ?? action.tool}
                {action.source === 'auto' && action.status === 'executed' ? ' · 自动完成' : ''}
              </p>
            </div>
            <Status action={action} />
          </div>

          {isPending && isWrite && paramPairs.length > 0 && (
            <details className="mt-2">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] text-text-light-tertiary hover:text-text-light-secondary dark:text-text-dark-tertiary dark:hover:text-text-dark-secondary [&::-webkit-details-marker]:hidden">
                查看将要修改的内容
                <ChevronDown className="h-3 w-3" />
              </summary>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {paramPairs.slice(0, 6).map((pair) => (
                  <span
                    key={pair.label}
                    className="rounded-md bg-surface-light-elevated px-1.5 py-0.5 text-[10px] text-text-light-secondary dark:bg-surface-dark-elevated dark:text-text-dark-secondary"
                  >
                    <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{pair.label}</span>{' '}
                    <span className="font-medium">{pair.value}</span>
                  </span>
                ))}
                {paramPairs.length > 6 && (
                  <span className="text-[10px] text-text-light-tertiary dark:text-text-dark-tertiary">+{paramPairs.length - 6}</span>
                )}
              </div>
            </details>
          )}

          {(action.status === 'executed' || exceptional) && action.result?.message && (
            <div className="mt-2 text-[11px] leading-relaxed text-text-light-secondary dark:text-text-dark-secondary">
              <p className={`whitespace-pre-wrap break-words ${resultTooLong && !resultExpanded ? 'max-h-14 overflow-hidden' : ''}`}>
                {resultTooLong && !resultExpanded ? `${resultText.slice(0, 180)}…` : resultText}
              </p>
              {resultTooLong && (
                <button
                  type="button"
                  onClick={() => setResultExpanded((open) => !open)}
                  className="mt-1 font-medium text-accent-primary hover:opacity-80"
                >
                  {resultExpanded ? '收起' : '展开结果'}
                </button>
              )}
            </div>
          )}

          {isPending && isWrite && (onConfirm || onReject) && (
            <div className="mt-2.5 flex items-center gap-2">
              {onConfirm && (
                <button
                  onClick={() => onConfirm(action.id)}
                  aria-label="确认执行"
                  className="rounded-lg bg-accent-primary px-3 py-1.5 text-[11px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  确认
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(action.id)}
                  aria-label="忽略该操作"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"
                >
                  <X className="h-3 w-3" />忽略
                </button>
              )}
            </div>
          )}

          {isExecuted && (destination || (onUndo && action.logId)) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
              {destination && (
                <Link
                  to={destination.to}
                  data-testid="agent-action-destination"
                  className="inline-flex items-center gap-1 font-medium text-accent-primary hover:opacity-80"
                >
                  查看{destination.label}<ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
              {onUndo && action.logId && (
                <button
                  type="button"
                  onClick={() => onUndo(action.id)}
                  title="撤销此操作"
                  className="inline-flex items-center gap-1 text-text-light-secondary hover:text-accent-primary dark:text-text-dark-secondary"
                >
                  <RotateCcw className="h-3 w-3" />撤销
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
