/**
 * Dependent Validation Editor Component
 * UI for configuring conditional validation rules on form fields
 */

import { useState } from 'react';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import type {
  DependentValidation,
  DependentValidationType,
  FormField,
  ConditionalOperator,
} from '../../types/forms';
import { toast } from '../../stores/useToastStore';

interface DependentValidationEditorProps {
  field: FormField;
  allFields: FormField[];
  onValidationsChange: (validations: DependentValidation[]) => void;
}

export function DependentValidationEditor({
  field,
  allFields,
  onValidationsChange,
}: DependentValidationEditorProps) {
  const [validations, setValidations] = useState<DependentValidation[]>(
    field.dependentValidation || []
  );

  // Fields that can be used in conditions (only fields before this one)
  const availableFields = allFields.filter((f) => f.order < field.order && f.id !== field.id);

  const handleAddValidation = () => {
    if (availableFields.length === 0) {
      toast.warning('没有可用于条件的字段', '请先在上方添加字段。');
      return;
    }

    const newValidation: DependentValidation = {
      id: crypto.randomUUID(),
      type: 'require_if',
      condition: {
        id: crypto.randomUUID(),
        fieldId: availableFields[0].id,
        operator: 'equals',
        value: '',
        action: 'show',
      },
      validationRule: {
        message: '此字段为必填项',
      },
    };

    const newValidations = [...validations, newValidation];
    setValidations(newValidations);
    onValidationsChange(newValidations);
  };

  const handleUpdateValidation = (index: number, updates: Partial<DependentValidation>) => {
    const newValidations = validations.map((val, i) => (i === index ? { ...val, ...updates } : val));
    setValidations(newValidations);
    onValidationsChange(newValidations);
  };

  const handleDeleteValidation = (index: number) => {
    const newValidations = validations.filter((_, i) => i !== index);
    setValidations(newValidations);
    onValidationsChange(newValidations);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            条件验证
          </h4>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
            根据其他字段的值应用验证规则
          </p>
        </div>
        <button
          type="button"
          onClick={handleAddValidation}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-accent-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          disabled={availableFields.length === 0}
        >
          <Plus className="w-4 h-4" />
          添加规则
        </button>
      </div>

      {validations.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-border-light dark:border-border-dark rounded-lg">
          <p className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
            没有条件验证规则。将应用标准验证。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {validations.map((validation, index) => {
            const triggerField = allFields.find((f) => f.id === validation.condition.fieldId);
            const needsValue =
              validation.condition.operator !== 'is_answered' &&
              validation.condition.operator !== 'is_not_answered';
            const needsValidationValue =
              validation.type === 'min_if' ||
              validation.type === 'max_if' ||
              validation.type === 'pattern_if';

            return (
              <div
                key={validation.id}
                className="p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated space-y-3"
              >
                {/* Rule header */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                    规则 {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteValidation(index)}
                    className="p-1 text-accent-red hover:bg-accent-red/10 rounded transition-colors"
                    aria-label="删除验证规则"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Validation Type */}
                <div>
                  <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                    验证类型
                  </label>
                  <select
                    value={validation.type}
                    onChange={(e) =>
                      handleUpdateValidation(index, {
                        type: e.target.value as DependentValidationType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="require_if">如果…则必填</option>
                    <option value="min_if">如果…则最小值</option>
                    <option value="max_if">如果…则最大值</option>
                    <option value="pattern_if">如果…则匹配模式</option>
                  </select>
                </div>

                {/* Condition */}
                <div className="space-y-3 p-3 bg-surface-light dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark">
                  <div className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                    条件：
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Trigger field */}
                    <div>
                      <label className="block text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        当字段
                      </label>
                      <select
                        value={validation.condition.fieldId}
                        onChange={(e) =>
                          handleUpdateValidation(index, {
                            condition: { ...validation.condition, fieldId: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      >
                        {availableFields.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Operator */}
                    <div>
                      <label className="block text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                        运算符
                      </label>
                      <select
                        value={validation.condition.operator}
                        onChange={(e) =>
                          handleUpdateValidation(index, {
                            condition: {
                              ...validation.condition,
                              operator: e.target.value as ConditionalOperator,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
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

                    {/* Value */}
                    {needsValue && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary mb-1">
                          值
                        </label>
                        {triggerField?.type === 'select' || triggerField?.type === 'radio' ? (
                          <select
                            value={validation.condition.value !== undefined ? String(validation.condition.value) : ''}
                            onChange={(e) =>
                              handleUpdateValidation(index, {
                                condition: { ...validation.condition, value: e.target.value },
                              })
                            }
                            className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                          >
                            <option value="">请选择一个选项…</option>
                            {triggerField.options?.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={validation.condition.value !== undefined ? String(validation.condition.value) : ''}
                            onChange={(e) =>
                              handleUpdateValidation(index, {
                                condition: { ...validation.condition, value: e.target.value },
                              })
                            }
                            placeholder="输入值…"
                            className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Validation Rule */}
                <div className="space-y-3">
                  {/* Validation Value (for min/max/pattern) */}
                  {needsValidationValue && (
                    <div>
                      <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                        {validation.type === 'min_if'
                          ? '最小值'
                          : validation.type === 'max_if'
                          ? '最大值'
                          : '正则表达式模式'}
                      </label>
                      <input
                        type={validation.type === 'pattern_if' ? 'text' : 'number'}
                        value={validation.validationRule.value || ''}
                        onChange={(e) =>
                          handleUpdateValidation(index, {
                            validationRule: {
                              ...validation.validationRule,
                              value: e.target.value,
                            },
                          })
                        }
                        placeholder={
                          validation.type === 'pattern_if'
                            ? '例如：^[A-Z]{3}$'
                            : '输入值…'
                        }
                        className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                      />
                    </div>
                  )}

                  {/* Custom Error Message */}
                  <div>
                    <label className="block text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-1">
                      自定义错误消息
                    </label>
                    <input
                      type="text"
                      value={validation.validationRule.message}
                      onChange={(e) =>
                        handleUpdateValidation(index, {
                          validationRule: {
                            ...validation.validationRule,
                            message: e.target.value,
                          },
                        })
                      }
                      placeholder="显示给用户的错误消息"
                      className="w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                    />
                  </div>
                </div>

                {/* Rule Summary */}
                <div className="pt-2 border-t border-border-light dark:border-border-dark">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-accent-yellow shrink-0 mt-0.5" />
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                      {getValidationSummary(validation, triggerField?.label || '未知字段')}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Generate human-readable summary of validation rule
 */
function getValidationSummary(validation: DependentValidation, triggerFieldLabel: string): string {
  const { type, condition, validationRule } = validation;

  const operatorText = getOperatorLabel(condition.operator);
  const valueText =
    condition.operator === 'is_answered' || condition.operator === 'is_not_answered'
      ? ''
      : ` "${condition.value}"`;

  const validationType =
    type === 'require_if'
      ? '必填'
      : type === 'min_if'
      ? `最小值：${validationRule.value}`
      : type === 'max_if'
      ? `最大值：${validationRule.value}`
      : `模式：${validationRule.value}`;

  return `当 ${triggerFieldLabel} ${operatorText}${valueText} 时，${validationType}`;
}

/**
 * Get human-readable operator label
 */
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
