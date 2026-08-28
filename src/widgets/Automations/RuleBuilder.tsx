import React, { useState } from 'react';
import { useAutomationStore } from '../../stores/useAutomationStore';
import type {
  AutomationTriggerType,
  AutomationActionType,
  AutomationActionConfig,
  AutomationConditionField,
  AutomationConditionOperator,
  AutomationRule,
} from '../../types/automation';
import { toast } from '../../stores/useToastStore';
import type { TaskPriority, TaskStatus } from '../../types';

interface RuleBuilderProps {
  onClose: () => void;
  initialRule?: AutomationRule;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ onClose, initialRule }) => {
  const { addRule, updateRule } = useAutomationStore();
  const initialCondition = initialRule?.conditions?.[0];
  const initialAction = initialRule?.actions?.[0];

  const [name, setName] = useState(initialRule?.name ?? '');
  const [description, setDescription] = useState(initialRule?.description ?? '');
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>(initialRule?.trigger.type ?? 'task.created');
  const [actionType, setActionType] = useState<AutomationActionType>(initialAction?.type ?? 'move_task');
  const [actionConfig, setActionConfig] = useState<AutomationActionConfig>(initialAction?.config ?? {});
  const [conditionEnabled, setConditionEnabled] = useState(Boolean(initialCondition));
  const [conditionField, setConditionField] = useState<AutomationConditionField>(initialCondition?.field ?? 'status');
  const [conditionOperator, setConditionOperator] = useState<AutomationConditionOperator>(initialCondition?.operator ?? 'equals');
  const [conditionValue, setConditionValue] = useState(initialCondition?.value === null || initialCondition?.value === undefined ? '' : String(initialCondition.value));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.warning('请输入规则名称');
      return;
    }

    const requiredKey: Partial<Record<AutomationActionType, keyof AutomationActionConfig>> = {
      move_task: 'status',
      set_status: 'status',
      set_priority: 'priority',
      add_tag: 'tag',
      remove_tag: 'tag',
      add_comment: 'text',
      set_due_date: 'dueDate',
      set_estimate: 'estimatedHours',
      notify: 'message',
    };
    const key = requiredKey[actionType];
    if (key && (actionConfig[key] === undefined || actionConfig[key] === '')) {
      toast.warning('请完成操作配置');
      return;
    }
    const conditionNeedsValue = !['is_set', 'is_not_set'].includes(conditionOperator);
    if (conditionEnabled && conditionNeedsValue && !conditionValue.trim()) {
      toast.warning('请填写条件值');
      return;
    }
    const numericCondition = ['estimatedHours', 'progress'].includes(conditionField);
    if (conditionEnabled && conditionNeedsValue && numericCondition && !Number.isFinite(Number(conditionValue))) {
      toast.warning('该条件需要数字');
      return;
    }
    const parsedConditionValue = !conditionNeedsValue
      ? null
      : numericCondition
        ? Number(conditionValue)
        : conditionValue.trim();

    const ruleUpdates = {
      name: name.trim(),
      description: description.trim() || undefined,
      trigger: { type: triggerType },
      conditions: conditionEnabled
        ? [{ field: conditionField, operator: conditionOperator, value: parsedConditionValue }]
        : [],
      actions: [
        {
          type: actionType,
          config: actionConfig,
        },
      ],
    };

    if (initialRule?.id) {
      updateRule(initialRule.id, ruleUpdates);
      toast.success('自动化规则已更新');
    } else {
      addRule(ruleUpdates);
      toast.success('自动化规则已创建');
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-2xl border border-accent-primary/20 bg-accent-primary/5 p-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
        <p className="font-medium text-text-light-primary dark:text-text-dark-primary">规则逻辑</p>
        <p className="mt-1">当选定的任务事件发生时，系统会在本机执行一个操作。创建后可随时停用。</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          规则名称 *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：自动归档已完成的任务"
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          描述
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="可选描述…"
          rows={2}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          当（触发器）*
        </label>
        <select
          value={triggerType}
          onChange={(e) => setTriggerType(e.target.value as AutomationTriggerType)}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
        >
          <option value="task.created">任务已创建</option>
          <option value="task.moved">任务已移动</option>
          <option value="task.completed">任务已完成</option>
        </select>
      </div>

      <div className="rounded-2xl border border-border-light p-4 dark:border-border-dark">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">仅当（可选条件）</span>
            <span className="mt-0.5 block text-xs text-text-light-tertiary dark:text-text-dark-tertiary">条件不匹配时，规则会安全跳过</span>
          </span>
          <input type="checkbox" checked={conditionEnabled} onChange={(event) => setConditionEnabled(event.target.checked)} className="h-5 w-5 rounded border-border-light text-accent-primary focus:ring-accent-primary dark:border-border-dark" />
        </label>
        {conditionEnabled && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <select value={conditionField} onChange={(event) => setConditionField(event.target.value as AutomationConditionField)} className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary">
              <option value="status">状态</option>
              <option value="priority">优先级</option>
              <option value="tags">标签</option>
              <option value="title">标题</option>
              <option value="description">描述</option>
              <option value="dueDate">截止日期</option>
              <option value="estimatedHours">预估工时</option>
              <option value="progress">进度</option>
            </select>
            <select value={conditionOperator} onChange={(event) => setConditionOperator(event.target.value as AutomationConditionOperator)} className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary">
              <option value="equals">等于</option>
              <option value="not_equals">不等于</option>
              <option value="contains">包含</option>
              <option value="not_contains">不包含</option>
              <option value="greater_than">大于</option>
              <option value="less_than">小于</option>
              <option value="is_set">已设置</option>
              <option value="is_not_set">未设置</option>
            </select>
            {!['is_set', 'is_not_set'].includes(conditionOperator) && (
              <input value={conditionValue} onChange={(event) => setConditionValue(event.target.value)} placeholder="条件值" className="rounded-lg border border-border-light bg-surface-light px-3 py-2 text-sm text-text-light-primary outline-none focus:ring-2 focus:ring-accent-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-dark-primary" />
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          然后（操作）*
        </label>
        <select
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value as AutomationActionType);
            setActionConfig({}); // Reset config when action changes
          }}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
        >
          <option value="move_task">将任务移动到状态</option>
          <option value="set_priority">设置优先级</option>
          <option value="add_tag">添加标签</option>
          <option value="remove_tag">移除标签</option>
          <option value="set_status">设置任务状态</option>
          <option value="add_comment">添加评论</option>
          <option value="set_due_date">设置截止日期</option>
          <option value="set_estimate">设置预估工时</option>
          <option value="duplicate">复制任务</option>
          <option value="notify">发送本地通知</option>
          <option value="archive">归档任务</option>
        </select>
      </div>

      {/* Action Configuration */}
      {(actionType === 'move_task' || actionType === 'set_status') && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            移动到状态
          </label>
          <select
            value={actionConfig.status || ''}
            onChange={(e) => setActionConfig({ status: e.target.value as TaskStatus })}
            className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          >
            <option value="">选择状态…</option>
            <option value="backlog">积压</option>
            <option value="todo">待办</option>
            <option value="inprogress">进行中</option>
            <option value="review">审核中</option>
            <option value="done">已完成</option>
          </select>
        </div>
      )}

      {actionType === 'set_priority' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            设置优先级
          </label>
          <select
            value={actionConfig.priority || ''}
            onChange={(e) => setActionConfig({ priority: e.target.value as TaskPriority })}
            className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          >
            <option value="">选择优先级…</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
        </div>
      )}

      {(actionType === 'add_tag' || actionType === 'remove_tag') && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            标签
          </label>
          <input
            type="text"
            value={actionConfig.tag || ''}
            onChange={(e) => setActionConfig({ tag: e.target.value })}
            placeholder="例如：urgent"
            className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none"
          />
        </div>
      )}

      {actionType === 'add_comment' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            评论内容
          </label>
          <textarea
            value={actionConfig.text || ''}
            onChange={(e) => setActionConfig({ text: e.target.value })}
            placeholder="例如：由自动化自动移动"
            rows={2}
            className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none resize-none"
          />
        </div>
      )}

      {actionType === 'set_due_date' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">截止日期</label>
          <input type="date" value={actionConfig.dueDate || ''} onChange={(e) => setActionConfig({ dueDate: e.target.value })} className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none" />
        </div>
      )}

      {actionType === 'set_estimate' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">预估工时（小时）</label>
          <input type="number" min="0.25" step="0.25" value={actionConfig.estimatedHours ?? ''} onChange={(e) => setActionConfig({ estimatedHours: Number(e.target.value) })} className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none" />
        </div>
      )}

      {actionType === 'notify' && (
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">通知内容</label>
          <textarea value={actionConfig.message || ''} onChange={(e) => setActionConfig({ message: e.target.value })} placeholder="例如：高优先级任务已完成" rows={2} className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue outline-none resize-none" />
        </div>
      )}

      <div className="flex gap-2 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-colors"
        >
          {initialRule?.id ? '保存修改' : '创建规则'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary text-sm font-medium rounded-lg hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
        >
          取消
        </button>
      </div>
    </form>
  );
};
