import React, { useState, useCallback } from 'react';
import { useAutomationStore } from '../../stores/useAutomationStore';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { Archive, Beaker, Copy, Pause, Pencil, Play, RotateCcw, Trash2, Zap } from 'lucide-react';
import type { AutomationRule } from '../../types/automation';

interface AutomationsListProps {
  onEdit: (rule: AutomationRule) => void;
  onDuplicate: (rule: AutomationRule) => void;
  onDryRun: (rule: AutomationRule) => void;
  rules: AutomationRule[];
  view: 'active' | 'archived' | 'trash';
}

const TRIGGER_LABELS: Record<string, string> = {
  'task.created': '创建任务时',
  'task.moved': '移动任务时',
  'task.updated': '更新任务时',
  'task.completed': '完成任务时',
  'task.overdue': '任务逾期时',
  'task.tagged': '添加标签时',
  'recurring.generated': '生成循环任务时',
  'time.daily': '每日定时',
  'time.weekly': '每周定时',
};

export const AutomationsList: React.FC<AutomationsListProps> = ({ onEdit, onDuplicate, onDryRun, rules, view }) => {
  const { toggleRule, deleteRule, archiveRule, restoreRule, permanentlyDeleteRule } = useAutomationStore();
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);

  const handleDeleteClick = useCallback((ruleId: string) => {
    setRuleToDelete(ruleId);
  }, []);

  const confirmDeleteRule = useCallback(() => {
    if (ruleToDelete) {
      if (view === 'trash') permanentlyDeleteRule(ruleToDelete);
      else deleteRule(ruleToDelete);
      setRuleToDelete(null);
    }
  }, [ruleToDelete, view, deleteRule, permanentlyDeleteRule]);

  const ruleBeingDeleted = ruleToDelete ? rules.find(r => r.id === ruleToDelete) : null;

  if (rules.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-light bg-surface-light-elevated/40 px-6 py-14 text-center dark:border-border-dark dark:bg-surface-dark-elevated/30">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-primary/10 text-accent-primary"><Zap className="h-6 w-6" /></span>
        <p className="mt-4 font-medium text-text-light-primary dark:text-text-dark-primary">还没有自动化规则</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-text-light-secondary dark:text-text-dark-secondary">从一个小流程开始，例如“任务完成后自动添加标签”。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rules.map((rule) => (
        <div
          key={rule.id}
          className={`rounded-2xl border p-4 transition-colors sm:p-5 ${rule.enabled ? 'border-accent-primary/25 bg-surface-light dark:bg-surface-dark' : 'border-border-light bg-surface-light-elevated/45 dark:border-border-dark dark:bg-surface-dark-elevated/35'}`}
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-medium text-text-light-primary dark:text-text-dark-primary">
                  {rule.name || '未命名规则'}
                </h3>
                {rule.enabled ? (
                  <span className="text-xs px-2 py-0.5 rounded bg-status-success-bg text-status-success-text">
                    已启用
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary">
                    已禁用
                  </span>
                )}
              </div>

              {rule.description && (
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
                  {rule.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                <span className="rounded-lg bg-surface-light-elevated px-2.5 py-1.5 dark:bg-surface-dark-elevated">
                  <span className="font-medium">当：</span> {TRIGGER_LABELS[rule.trigger?.type] ?? rule.trigger?.type ?? '未知触发器'}
                </span>
                {rule.conditions && rule.conditions.length > 0 && (
                  <span className="rounded-lg bg-surface-light-elevated px-2.5 py-1.5 dark:bg-surface-dark-elevated">
                    <span className="font-medium">条件：</span> {rule.conditions.length} 个条件
                  </span>
                )}
                <span className="rounded-lg bg-surface-light-elevated px-2.5 py-1.5 dark:bg-surface-dark-elevated">
                  <span className="font-medium">执行：</span> {(rule.actions ?? []).length} 个操作
                </span>
                {rule.runCount > 0 && (
                  <span className="rounded-lg bg-surface-light-elevated px-2.5 py-1.5 dark:bg-surface-dark-elevated">
                    <span className="font-medium">运行次数：</span> {rule.runCount}
                    {rule.lastRun && `（上次：${new Date(rule.lastRun).toLocaleDateString()}）`}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
              {view !== 'active' ? (
                <button onClick={() => restoreRule(rule.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-light px-3 py-2 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"><RotateCcw className="h-3.5 w-3.5" /> 恢复</button>
              ) : (
                <>
              <button onClick={() => onDryRun(rule)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-light px-3 py-2 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"><Beaker className="h-3.5 w-3.5" /> 试运行</button>
              <button onClick={() => onEdit(rule)} aria-label={`编辑${rule.name}`} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"><Pencil className="h-3.5 w-3.5" /></button>
              <button onClick={() => onDuplicate(rule)} aria-label={`复制${rule.name}`} className="flex min-h-10 min-w-10 items-center justify-center rounded-xl text-text-light-secondary hover:bg-surface-light-elevated dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated"><Copy className="h-3.5 w-3.5" /></button>
              <button
                onClick={() => toggleRule(rule.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  rule.enabled
                    ? 'bg-status-warning-bg text-status-warning-text hover:bg-status-warning-bg/80'
                    : 'bg-status-success-bg text-status-success-text hover:bg-status-success-bg/80'
                }`}
              >
                {rule.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {rule.enabled ? '停用' : '启用'}
              </button>
              <button onClick={() => archiveRule(rule.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border-light px-3 py-2 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"><Archive className="h-3.5 w-3.5" /> 归档</button>
                </>
              )}
              <button
                onClick={() => handleDeleteClick(rule.id)}
                aria-label={`${view === 'trash' ? '永久删除' : '移到回收站'}${rule.name || '未命名规则'}`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-status-error-bg px-3 py-2 text-sm font-medium text-status-error-text transition-colors hover:bg-status-error-bg/80"
              >
                <Trash2 className="h-3.5 w-3.5" /> {view === 'trash' ? '永久删除' : '删除'}
              </button>
            </div>
          </div>
        </div>
      ))}

      <ConfirmDialog
        isOpen={ruleToDelete !== null}
        onClose={() => setRuleToDelete(null)}
        onConfirm={confirmDeleteRule}
        title={view === 'trash' ? '永久删除自动化' : '移到回收站'}
        message={ruleBeingDeleted ? (view === 'trash' ? `永久删除自动化“${ruleBeingDeleted.name}”？此操作无法恢复。` : `将自动化“${ruleBeingDeleted.name}”移到回收站？之后仍可恢复。`) : ''}
        confirmText={view === 'trash' ? '永久删除' : '移到回收站'}
        variant="danger"
      />
    </div>
  );
};
