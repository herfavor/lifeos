import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AutomationsList } from './AutomationsList';
import { RuleBuilder } from './RuleBuilder';
import { useAutomationStore } from '../../stores/useAutomationStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { executeRule, previewRule } from '../../services/automationEngine';
import type { AutomationRule } from '../../types/automation';
import { toast } from '../../stores/useToastStore';
import { PageContent } from '../../components/PageContent';
import { Activity, Beaker, Check, History, Plus, RefreshCw, ShieldCheck, Workflow, X } from 'lucide-react';

const AUTOMATION_TEMPLATES: AutomationRule[] = [
  {
    id: '',
    name: '完成后标记待回顾',
    description: '任务完成后添加“待回顾”标签，便于在回顾中集中处理。',
    enabled: true,
    trigger: { type: 'task.completed' },
    conditions: [],
    actions: [{ type: 'add_tag', config: { tag: '待回顾' } }],
    created: '',
    runCount: 0,
  },
  {
    id: '',
    name: '高优先级任务提醒',
    description: '创建高优先级任务时发送一条本机通知。',
    enabled: true,
    trigger: { type: 'task.created' },
    conditions: [{ field: 'priority', operator: 'equals', value: 'high' }],
    actions: [{ type: 'notify', config: { message: '已创建一项高优先级任务。' } }],
    created: '',
    runCount: 0,
  },
  {
    id: '',
    name: '逾期任务升级',
    description: '任务逾期后自动提升为高优先级并加上「需关注」标签。',
    enabled: true,
    trigger: { type: 'task.overdue' },
    conditions: [],
    actions: [
      { type: 'set_priority', config: { priority: 'high' } },
      { type: 'add_tag', config: { tag: '需关注' } },
      { type: 'notify', config: { message: '有任务逾期了，已帮你标出。' } },
    ],
    created: '',
    runCount: 0,
  },
  {
    id: '',
    name: '完成后自动归档',
    description: '任务完成后直接归档，让看板只留下还没做的事。',
    enabled: true,
    trigger: { type: 'task.completed' },
    conditions: [],
    actions: [{ type: 'archive', config: {} }],
    created: '',
    runCount: 0,
  },
];

const ACTION_LABELS: Record<string, string> = {
  move_task: '移动任务状态',
  set_status: '设置任务状态',
  set_priority: '设置优先级',
  add_tag: '添加标签',
  remove_tag: '移除标签',
  add_comment: '添加评论',
  archive: '归档任务',
  delete: '删除任务',
  set_due_date: '设置截止日期',
  set_estimate: '设置预估工时',
  duplicate: '复制任务',
  notify: '发送本机通知',
};

export const Automations: React.FC = () => {
  const navigate = useNavigate();
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [builderRule, setBuilderRule] = useState<AutomationRule | undefined>();
  const [previewingRule, setPreviewingRule] = useState<AutomationRule | null>(null);
  const [previewTaskId, setPreviewTaskId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showClearLogsConfirm, setShowClearLogsConfirm] = useState(false);
  const [showClearTrashConfirm, setShowClearTrashConfirm] = useState(false);
  const [ruleView, setRuleView] = useState<'active' | 'archived' | 'trash'>('active');
  const executionLogs = useAutomationStore((state) => state.executionLogs);
  const rules = useAutomationStore((state) => state.rules);
  const clearExecutionLogs = useAutomationStore((state) => state.clearExecutionLogs);
  const addExecutionLog = useAutomationStore((state) => state.addExecutionLog);
  const addRule = useAutomationStore((state) => state.addRule);
  const permanentlyDeleteRule = useAutomationStore((state) => state.permanentlyDeleteRule);
  const tasks = useKanbanStore((state) => state.tasks);
  const activeRules = rules.filter((rule) => !rule.archivedAt && !rule.deletedAt);
  const archivedRules = rules.filter((rule) => rule.archivedAt && !rule.deletedAt);
  const deletedRules = rules.filter((rule) => rule.deletedAt);
  const visibleRules = ruleView === 'archived' ? archivedRules : ruleView === 'trash' ? deletedRules : activeRules;
  const enabledCount = activeRules.filter((rule) => rule.enabled).length;
  const activeTasks = useMemo(() => tasks.filter((task) => !task.archivedAt), [tasks]);
  const previewTask = activeTasks.find((task) => task.id === previewTaskId);
  const preview = previewingRule && previewTask ? previewRule(previewingRule, previewTask) : null;

  const handleClearLogs = useCallback(() => {
    setShowClearLogsConfirm(true);
  }, []);

  const confirmClearLogs = useCallback(() => {
    clearExecutionLogs();
    setShowClearLogsConfirm(false);
  }, [clearExecutionLogs]);

  const openBuilder = useCallback((rule?: AutomationRule) => {
    setBuilderRule(rule);
    setShowRuleBuilder(true);
  }, []);

  const duplicateRule = useCallback((rule: AutomationRule) => {
    addRule({
      name: `${rule.name}（副本）`,
      description: rule.description,
      trigger: { ...rule.trigger, config: rule.trigger.config ? { ...rule.trigger.config } : undefined },
      conditions: rule.conditions?.map((condition) => ({ ...condition })),
      actions: rule.actions.map((action) => ({ ...action, config: { ...action.config } })),
    });
    toast.success('自动化规则已复制');
  }, [addRule]);

  const openDryRun = useCallback((rule: AutomationRule) => {
    setPreviewingRule(rule);
    setPreviewTaskId(activeTasks[0]?.id ?? '');
  }, [activeTasks]);

  const retryExecution = useCallback(async (ruleId: string, taskId: string) => {
    const rule = useAutomationStore.getState().rules.find((item) => item.id === ruleId);
    const task = useKanbanStore.getState().tasks.find((item) => item.id === taskId);
    if (!rule || rule.archivedAt || rule.deletedAt || !task) {
      toast.error('无法重试：规则或任务已不存在');
      return;
    }
    const log = await executeRule(rule, task, { taskId, timestamp: new Date().toISOString() }, useKanbanStore.getState());
    addExecutionLog(log);
    if (log.success) toast.success('自动化已重新执行');
    else toast.error('自动化重试仍然失败', log.error);
  }, [addExecutionLog]);

  return (
    <PageContent page="automations" className="pb-24">
      <section className="overflow-hidden rounded-3xl border border-border-light bg-gradient-to-br from-accent-primary/12 via-surface-light to-accent-blue/8 p-5 dark:border-border-dark dark:via-surface-dark sm:p-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-primary text-white shadow-sm"><Workflow className="h-6 w-6" /></span>
            <div>
              <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">让重复工作自动流动</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-text-light-secondary dark:text-text-dark-secondary">当任务创建、移动或完成时，自动更新状态、优先级、标签或评论。规则和运行数据都保留在本机。</p>
            </div>
          </div>
          <button onClick={() => openBuilder()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5">
            <Plus className="h-4 w-4" /> 新建规则
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: '活跃规则', value: activeRules.length, icon: Workflow },
            { label: '正在运行', value: enabledCount, icon: ShieldCheck },
            { label: '执行记录', value: executionLogs.length, icon: Activity },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/40 bg-surface-light/75 p-3 dark:border-white/10 dark:bg-surface-dark/70 sm:p-4">
              <Icon className="h-4 w-4 text-accent-primary" />
              <p className="mt-2 text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">{value}</p>
              <p className="text-[11px] text-text-light-tertiary dark:text-text-dark-tertiary sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border-light bg-surface-light-elevated/40 p-4 dark:border-border-dark dark:bg-surface-dark-elevated/30">
        <p className="text-xs font-semibold uppercase tracking-wider text-text-light-tertiary dark:text-text-dark-tertiary">安全模板</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AUTOMATION_TEMPLATES.map((template) => (
            <button key={template.name} type="button" onClick={() => openBuilder(template)} className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary">
              {template.name}
            </button>
          ))}
        </div>
      </section>

      <div className="mb-4 mt-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary">规则列表</h2>
          <p className="mt-0.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">停用保留在列表；归档退出活跃流程；删除先进入回收站</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            aria-expanded={showHistory}
            className="inline-flex items-center gap-2 rounded-xl border border-border-light bg-surface-light px-3 py-2 text-sm font-medium text-text-light-primary transition-colors hover:border-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary"
          >
            <History className="h-4 w-4" /> {showHistory ? '收起历史' : '执行历史'}
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="自动化规则状态">
        {([
          ['active', `活跃 ${activeRules.length}`],
          ['archived', `已归档 ${archivedRules.length}`],
          ['trash', `回收站 ${deletedRules.length}`],
        ] as const).map(([view, label]) => (
          <button key={view} onClick={() => setRuleView(view)} className={`rounded-lg px-3 py-2 text-sm font-medium ${ruleView === view ? 'bg-accent-primary text-white' : 'border border-border-light text-text-light-secondary dark:border-border-dark dark:text-text-dark-secondary'}`}>{label}</button>
        ))}
        {ruleView === 'trash' && deletedRules.length > 0 && (
          <button type="button" onClick={() => setShowClearTrashConfirm(true)} className="ml-auto inline-flex min-h-10 items-center rounded-lg border border-status-error/30 px-3 py-2 text-sm text-status-error hover:bg-status-error-bg">
            清空回收站
          </button>
        )}
      </div>

      {showHistory && (
        <div className="mb-6 rounded-2xl border border-border-light bg-surface-light-elevated/60 p-4 dark:border-border-dark dark:bg-surface-dark-elevated/60">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-light-primary dark:text-text-dark-primary">
              执行历史
            </h2>
            {executionLogs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-status-error-text hover:underline"
              >
                清空记录
              </button>
            )}
          </div>

          {executionLogs.length === 0 ? (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary text-center py-4">
              暂无自动化执行记录
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {executionLogs.slice(0, 50).map((log) => (
                <div
                  key={log.id}
                  className="p-3 bg-surface-light dark:bg-surface-dark rounded border border-border-light dark:border-border-dark"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-text-light-primary dark:text-text-dark-primary">
                          {log.ruleName}
                        </span>
                        {log.success ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-status-success-bg text-status-success-text">
                            <Check className="h-3 w-3" aria-hidden /> 成功
                          </span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-status-error-bg text-status-error-text">
                            <X className="h-3 w-3" aria-hidden /> 失败
                          </span>
                        )}
                      </div>
                      <button type="button" onClick={() => navigate(`/tasks?tab=tasks&task=${encodeURIComponent(log.taskId)}`)} className="text-xs text-accent-primary hover:underline">任务：{log.taskTitle}</button>
                      <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                        {new Date(log.timestamp).toLocaleString()} · {log.actionsExecuted} 个操作
                      </div>
                      {log.error && (
                        <div className="text-xs text-status-error-text mt-1">
                          错误：{log.error}
                        </div>
                      )}
                    </div>
                    {!log.success && (
                      <button type="button" onClick={() => retryExecution(log.ruleId, log.taskId)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"><RefreshCw className="h-3 w-3" /> 重试</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AutomationsList rules={visibleRules} view={ruleView} onEdit={openBuilder} onDuplicate={duplicateRule} onDryRun={openDryRun} />

      <Modal
        isOpen={showRuleBuilder}
        onClose={() => setShowRuleBuilder(false)}
        title={builderRule?.id ? '编辑自动化规则' : builderRule ? '从模板创建规则' : '创建自动化规则'}
        maxWidth="lg"
      >
        <RuleBuilder key={builderRule?.id || builderRule?.name || 'new'} initialRule={builderRule} onClose={() => setShowRuleBuilder(false)} />
      </Modal>

      <Modal isOpen={previewingRule !== null} onClose={() => setPreviewingRule(null)} title="试运行（不会修改数据）" maxWidth="lg">
        <div className="space-y-4">
          <div className="rounded-xl border border-accent-primary/20 bg-accent-primary/5 p-3 text-sm text-text-light-secondary dark:text-text-dark-secondary">
            <div className="flex items-center gap-2 font-medium text-text-light-primary dark:text-text-dark-primary"><Beaker className="h-4 w-4 text-accent-primary" /> 只检查条件并预览操作，不会执行任何写入。</div>
          </div>
          {activeTasks.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">没有可用于试运行的任务。</p>
              <button type="button" onClick={() => navigate('/tasks?new=1')} className="mt-3 rounded-lg bg-accent-primary px-3 py-2 text-sm font-medium text-white">创建任务</button>
            </div>
          ) : (
            <>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                测试任务
                <select value={previewTaskId} onChange={(event) => setPreviewTaskId(event.target.value)} className="mt-2 w-full rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm dark:border-border-dark dark:bg-surface-dark">
                  {activeTasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
                </select>
              </label>
              {preview && (
                <div className={`rounded-xl border p-4 ${preview.conditionsMatch ? 'border-status-success-border bg-status-success-bg' : 'border-border-light bg-surface-light-elevated dark:border-border-dark dark:bg-surface-dark-elevated'}`}>
                  <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{preview.conditionsMatch ? `条件匹配，将计划 ${preview.plannedActions.length} 个操作` : '条件不匹配，不会执行操作'}</p>
                  {preview.plannedActions.length > 0 && <ul className="mt-2 space-y-2">{preview.plannedActions.map((action, index) => <li key={`${action.type}-${index}`} className="rounded-lg bg-surface-light/70 px-3 py-2 text-xs text-text-light-secondary dark:bg-surface-dark/70 dark:text-text-dark-secondary"><span className="font-medium text-text-light-primary dark:text-text-dark-primary">{ACTION_LABELS[action.type] ?? action.type}</span><span className="ml-2">{JSON.stringify(action.config)}</span></li>)}</ul>}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showClearLogsConfirm}
        onClose={() => setShowClearLogsConfirm(false)}
        onConfirm={confirmClearLogs}
        title="清空执行记录"
        message="确定清空全部执行记录吗？此操作无法撤销。"
        confirmText="清空"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={showClearTrashConfirm}
        onClose={() => setShowClearTrashConfirm(false)}
        onConfirm={() => {
          deletedRules.forEach((rule) => permanentlyDeleteRule(rule.id));
          setShowClearTrashConfirm(false);
        }}
        title="清空自动化回收站"
        message={`永久删除回收站中的 ${deletedRules.length} 条规则？此操作无法恢复。`}
        confirmText="永久删除全部"
        variant="danger"
      />
    </PageContent>
  );
};
