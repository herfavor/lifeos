/**
 * AIOperationLogPanel
 *
 * 「AI 操作记录」drawer: every AI-executed write (auto or confirmed),
 * newest first, with 查看结果 jumps to the exact module UI and one-click
 * 撤销 (reversed through the same store APIs the UI uses).
 */

import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CheckCircle2,
  History,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
  Zap,
  XCircle,
} from 'lucide-react';
import { formatDateTime } from '../../utils/dateFormatting';
import {
  MAX_AI_OPERATION_RECORDS,
  useAIOperationLogStore,
  type AIOperationRecord,
} from '../../stores/useAIOperationLogStore';
import { AGENT_TOOLS } from '../../services/ai/agent/tools';
import { toolCategory } from '../../services/ai/agent/capabilityMeta';

interface AIOperationLogPanelProps {
  open: boolean;
  onClose: () => void;
  onUndo: (recordId: string) => void;
}

function CategoryDot({ tool }: { tool: string }) {
  const def = AGENT_TOOLS[tool as keyof typeof AGENT_TOOLS];
  if (!def) return <span className="h-2 w-2 shrink-0 rounded-full bg-accent-primary" />;
  const category = toolCategory(def.id);
  const tones: Record<string, string> = {
    task: 'bg-accent-blue',
    calendar: 'bg-accent-cyan',
    note: 'bg-accent-yellow',
    project: 'bg-accent-purple',
    link: 'bg-accent-magenta',
    automation: 'bg-accent-orange',
    habit: 'bg-accent-green',
    energy: 'bg-accent-neon-green',
    time: 'bg-accent-cyan',
    focus: 'bg-accent-purple',
    planning: 'bg-accent-blue',
    routine: 'bg-accent-green',
    resource: 'bg-accent-orange',
    template: 'bg-accent-magenta',
  };
  return <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${tones[category] ?? 'bg-accent-primary'}`} />;
}

function RecordRow({
  record,
  onUndo,
}: {
  record: AIOperationRecord;
  onUndo: (id: string) => void;
}) {
  const def = AGENT_TOOLS[record.tool as keyof typeof AGENT_TOOLS];
  return (
    <li
      data-testid="ai-op-log-item"
      className={`rounded-xl border p-3 transition-colors ${
        record.undone
          ? 'border-border-light/60 bg-surface-light-elevated/40 opacity-60 dark:border-border-dark/60'
          : record.success
            ? 'border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark'
            : 'border-accent-red/30 bg-accent-red/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          <CategoryDot tool={record.tool} />
          <div className="min-w-0">
            <p className="break-words text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              {record.summary}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
              <span>{formatDateTime(record.ts)}</span>
              <span>{def?.label ?? record.tool}</span>
              {record.source === 'auto' ? (
                <span className="flex items-center gap-0.5 rounded-full bg-accent-purple/10 px-1.5 py-0.5 font-medium text-accent-purple">
                  <Zap className="h-2.5 w-2.5" />
                  自动执行
                </span>
              ) : (
                <span className="flex items-center gap-0.5 rounded-full bg-accent-primary/10 px-1.5 py-0.5 font-medium text-accent-primary">
                  <ShieldCheck className="h-2.5 w-2.5" />
                  已确认
                </span>
              )}
              {record.undone && (
                <span className="rounded-full bg-accent-red/10 px-1.5 py-0.5 font-medium text-accent-red">
                  已撤销
                </span>
              )}
              {!record.success && (
                <span className="flex items-center gap-0.5 rounded-full bg-accent-red/10 px-1.5 py-0.5 font-medium text-accent-red">
                  <XCircle className="h-2.5 w-2.5" />
                  失败
                </span>
              )}
            </p>
          </div>
        </div>
        {record.success && !record.undone && (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-green" />
        )}
      </div>

      {(record.destination || record.undo) && !record.undone && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border-light/60 pt-2 text-xs dark:border-border-dark/60">
          {record.destination && (
            <Link
              to={record.destination.to}
              data-testid="ai-op-log-view"
              className="flex items-center gap-1 rounded-lg border border-border-light px-2 py-1 font-medium text-accent-primary transition-colors hover:bg-accent-primary/5 dark:border-border-dark"
            >
              <ArrowUpRight className="h-3 w-3" />
              查看结果：{record.destination.label}
            </Link>
          )}
          {record.undo && (
            <button
              type="button"
              data-testid="ai-op-log-undo"
              onClick={() => onUndo(record.id)}
              title={record.undo.label}
              className="flex items-center gap-1 rounded-lg border border-accent-yellow/40 bg-accent-yellow/5 px-2 py-1 font-medium text-accent-yellow transition-colors hover:bg-accent-yellow/15"
            >
              <RotateCcw className="h-3 w-3" />
              撤销
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export const AIOperationLogPanel: React.FC<AIOperationLogPanelProps> = ({
  open,
  onClose,
  onUndo,
}) => {
  const records = useAIOperationLogStore((s) => s.records);
  const clear = useAIOperationLogStore((s) => s.clear);

  if (!open) return null;

  return (
    <div
      data-testid="ai-op-log-panel"
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border-light bg-surface-light shadow-2xl dark:border-border-dark dark:bg-surface-dark"
      role="dialog"
      aria-label="AI 操作记录"
    >
      <header className="flex items-center justify-between border-b border-border-light px-4 py-3 dark:border-border-dark">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <History className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
              AI 操作记录
            </h2>
            <p className="text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary">
              每次 AI 执行的写操作都可查看结果、一键撤销
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {records.length > 0 && (
            <button
              type="button"
              data-testid="ai-op-log-clear"
              onClick={clear}
              title="清空全部记录"
              className="rounded-lg p-1.5 text-text-light-tertiary transition-colors hover:bg-surface-light-elevated hover:text-accent-red dark:text-text-dark-tertiary dark:hover:bg-surface-dark-elevated"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭操作记录"
            className="rounded-lg p-1.5 text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {records.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border-light p-8 text-center text-sm text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary">
            <History className="mx-auto mb-3 h-8 w-8 text-text-light-tertiary dark:text-text-dark-tertiary" />
            暂无操作记录。
            <br />
            AI 执行写操作(自动或确认)后会自动记录在这里。
          </div>
        ) : (
          <ul className="space-y-2.5">
            {records.map((record) => (
              <RecordRow key={record.id} record={record} onUndo={onUndo} />
            ))}
          </ul>
        )}
      </div>

      <footer className="border-t border-border-light px-4 py-2.5 text-center text-[11px] text-text-light-tertiary dark:border-border-dark dark:text-text-dark-tertiary">
        共 {records.length} 条记录（上限 {MAX_AI_OPERATION_RECORDS}）· 仅保存在本机
      </footer>
    </div>
  );
};
