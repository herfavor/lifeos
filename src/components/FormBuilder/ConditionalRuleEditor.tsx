/**
 * Conditional Rule Editor Component
 * UI for configuring conditional logic rules on form fields
 */

import { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import type { ConditionalRule, ConditionalOperator, FormField } from '../../types/forms';
import { toast } from '../../stores/useToastStore';

interface ConditionalRuleEditorProps {
  field: FormField;
  allFields: FormField[]; // All fields in the form (for selecting trigger field)
  onRulesChange: (rules: ConditionalRule[]) => void;
}

export function ConditionalRuleEditor({ field, allFields, onRulesChange }: ConditionalRuleEditorProps) {
  const [rules, setRules] = useState<ConditionalRule[]>(field.conditionalRules || []);
  const [showCircularDependencyWarning, setShowCircularDependencyWarning] = useState(false);

  // Fields that can be used as triggers (only fields that come before this one)
  const availableFields = allFields.filter(f => f.order < field.order && f.id !== field.id);

  const handleAddRule = () => {
    if (availableFields.length === 0) {
      toast.warning('没有可用于触发此规则的字段', '请先在上方添加字段。');
      return;
    }

    const newRule: ConditionalRule = {
      id: crypto.randomUUID(),
      fieldId: availableFields[0].id,
      operator: 'equals',
      value: '',
      action: 'show',
    };

    const newRules = [...rules, newRule];
    setRules(newRules);
    onRulesChange(newRules);
  };

  const handleUpdateRule = (index: number, updates: Partial<ConditionalRule>) => {
    const newRules = rules.map((rule, i) => (i === index ? { ...rule, ...updates } : rule));
    setRules(newRules);
    onRulesChange(newRules);

    // Check for circular dependencies
    if (updates.fieldId) {
      const hasCircularDependency = checkCircularDependency(updates.fieldId, field.id, allFields);
      setShowCircularDependencyWarning(hasCircularDependency);
    }
  };

  const handleDeleteRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    onRulesChange(newRules);
    setShowCircularDependencyWarning(false);
  };

  // Get the field definition for a given ID
  const getField = (fieldId: string) => allFields.find(f => f.id === fieldId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            条件逻辑
          </h4>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
            根据前面问题的答案显示或隐藏此字段
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddRule}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          disabled={availableFields.length === 0}
        >
          <Plus className="w-4 h-4" />
          添加规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg">
          <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
            没有条件规则。此字段将始终显示。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule, index) => {
            const triggerField = getField(rule.fieldId);
            const needsValue =
              rule.operator !== 'is_answered' && rule.operator !== 'is_not_answered';

            return (
              <div
                key={rule.id}
                className="p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated space-y-3"
              >
                {/* Rule number and delete button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                    规则 {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(index)}
                    className="p-1 text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                    aria-label="删除规则"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rule configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Trigger field selection */}
                  <div>
                    <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                      当字段
                    </label>
                    <select
                      value={rule.fieldId}
                      onChange={(e) => handleUpdateRule(index, { fieldId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    >
                      {availableFields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Operator selection */}
                  <div>
                    <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                      运算符
                    </label>
                    <select
                      value={rule.operator}
                      onChange={(e) =>
                        handleUpdateRule(index, {
                          operator: e.target.value as ConditionalOperator,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    >
                      <option value="equals">等于</option>
                      <option value="not_equals">不等于</option>
                      <option value="contains">包含</option>
                      <option value="greater_than">大于</option>
                      <option value="less_than">小于</option>
                      <option value="is_answered">已填写</option>
                      <option value="is_not_answered">未填写</option>
                    </select>
                  </div>

                  {/* Value input (if needed) */}
                  {needsValue && (
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        值
                      </label>
                      {triggerField?.type === 'select' || triggerField?.type === 'radio' ? (
                        // Dropdown for select/radio fields
                        <select
                          value={rule.value !== undefined ? String(rule.value) : ''}
                          onChange={(e) => handleUpdateRule(index, { value: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        >
                          <option value="">请选择一个选项…</option>
                          {triggerField.options?.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Text input for other field types
                        <input
                          type="text"
                          value={rule.value !== undefined ? String(rule.value) : ''}
                          onChange={(e) => handleUpdateRule(index, { value: e.target.value })}
                          placeholder="输入要比较的值…"
                          className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                        />
                      )}
                    </div>
                  )}

                  {/* Action selection */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                      则
                    </label>
                    <select
                      value={rule.action}
                      onChange={(e) => handleUpdateRule(index, { action: e.target.value as 'show' | 'hide' })}
                      className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    >
                      <option value="show">显示此字段</option>
                      <option value="hide">隐藏此字段</option>
                    </select>
                  </div>
                </div>

                {/* Rule summary */}
                <div className="pt-2 border-t border-border-light dark:border-border-dark">
                  <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    {rule.action === 'show' ? '✓ 显示' : '✗ 隐藏'}此字段，当{' '}
                    <span className="font-medium">{triggerField?.label || '未知字段'}</span>{' '}
                    {getOperatorLabel(rule.operator)}{' '}
                    {needsValue && <span className="font-medium">&quot;{rule.value}&quot;</span>}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Circular dependency warning */}
      {showCircularDependencyWarning && (
        <div className="flex items-start gap-2 p-3 bg-accent-yellow/10 border border-accent-yellow/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-accent-yellow shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-accent-yellow">检测到循环依赖</p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              此字段依赖的字段同时也依赖此字段。这可能导致意外行为。
            </p>
          </div>
        </div>
      )}

      {/* Multiple rules note */}
      {rules.length > 1 && (
        <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
          <strong>注意：</strong>当定义了多个规则时，只要<strong>任一</strong>规则的结果为
          &quot;show&quot;（或逻辑），此字段就会显示。
        </div>
      )}
    </div>
  );
}

// Helper: Get human-readable operator label
function getOperatorLabel(operator: ConditionalOperator): string {
  switch (operator) {
    case 'equals':
      return '等于';
    case 'not_equals':
      return '不等于';
    case 'contains':
      return '包含';
    case 'greater_than':
      return '大于';
    case 'less_than':
      return '小于';
    case 'is_answered':
      return '已填写';
    case 'is_not_answered':
      return '未填写';
    default:
      return operator;
  }
}

// Helper: Check for circular dependencies (A depends on B, B depends on A)
function checkCircularDependency(
  triggerFieldId: string,
  currentFieldId: string,
  allFields: FormField[]
): boolean {
  const triggerField = allFields.find(f => f.id === triggerFieldId);
  if (!triggerField || !triggerField.conditionalRules) return false;

  // Check if trigger field depends on current field (direct circular dependency)
  const dependsOnCurrent = triggerField.conditionalRules.some(
    rule => rule.fieldId === currentFieldId
  );

  if (dependsOnCurrent) return true;

  // Check for indirect circular dependencies (A -> B -> C -> A)
  // For simplicity, we only check one level deep (most common case)
  return false;
}
