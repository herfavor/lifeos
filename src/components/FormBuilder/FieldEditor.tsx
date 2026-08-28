/**
 * Field Editor Component
 * Edit individual form field configuration
 */

import { useState, useEffect } from 'react';
import type { FormField, FieldType, CalculationSettings, DependentValidation, QuizSettings, FormTemplate } from '../../types/forms';
import { X } from 'lucide-react';
import { ConditionalRuleEditor } from './ConditionalRuleEditor';
import { CalculationFieldEditor } from './CalculationFieldEditor';
import { DependentValidationEditor } from './DependentValidationEditor';
import { QuizSettingsEditor } from './QuizSettingsEditor';
import { toast } from '../../stores/useToastStore';

interface FieldEditorProps {
  field: FormField | null;
  allFields: FormField[]; // All fields for conditional logic
  form: FormTemplate; // Form template for quiz mode detection
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: '文本' },
  { value: 'textarea', label: '多行文本' },
  { value: 'number', label: '数字' },
  { value: 'date', label: '日期' },
  { value: 'time', label: '时间' },
  { value: 'select', label: '选择（下拉）' },
  { value: 'multiselect', label: '多选' },
  { value: 'radio', label: '单选按钮' },
  { value: 'checkbox', label: '复选框' },
  { value: 'rating', label: '评分（1-5）' },
  { value: 'scale', label: '量表（1-10）' },
  { value: 'file', label: '文件上传' }, // File upload field type
  { value: 'calculation', label: '计算' }, // Calculated field type
  { value: 'hidden', label: '隐藏（URL 参数）' }, // Hidden field type
];

export function FieldEditor({ field, allFields, form, onSave, onCancel }: FieldEditorProps) {
  const [formData, setFormData] = useState<FormField>(
    field || {
      id: crypto.randomUUID(),
      type: 'text',
      label: '',
      description: '',
      required: false,
      order: 0,
    }
  );

  const [optionsText, setOptionsText] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  useEffect(() => {
    if (field) {
      setFormData(field);
      if (field.options) {
        setOptionsText(field.options.join('\n'));
      }
    }
  }, [field]);

  const needsOptions = ['select', 'multiselect', 'radio'].includes(formData.type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.label.trim()) {
      toast.warning('字段标签为必填项');
      return;
    }

    if (needsOptions && !optionsText.trim()) {
      toast.warning('此字段类型需要提供选项');
      return;
    }

    const finalField: FormField = {
      ...formData,
      options: needsOptions
        ? optionsText.split('\n').filter((opt) => opt.trim()).map((opt) => opt.trim())
        : undefined,
    };

    onSave(finalField);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark sticky top-0 bg-surface-light dark:bg-surface-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            {field ? '编辑字段' : '添加字段'}
          </h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              字段类型 *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FieldType })}
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {FIELD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Label */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              标签 *
            </label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="例如：'你昨晚睡了几个小时？'"
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
              描述（可选）
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={
                formData.type === 'hidden'
                  ? '内部备注（不显示给用户）。例如："活动来源追踪"'
                  : '此字段的帮助文本'
              }
              rows={2}
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
            {formData.type === 'hidden' && (
              <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1">
                隐藏字段通过 URL 参数填充（例如：?{formData.label || 'field_name'}=value）
              </p>
            )}
          </div>

          {/* Options (for select/radio/multiselect) */}
          {needsOptions && (
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                选项（每行一个）*
              </label>
              <textarea
                value={optionsText}
                onChange={(e) => setOptionsText(e.target.value)}
                placeholder="选项 1&#10;选项 2&#10;选项 3"
                rows={5}
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary font-mono text-sm"
                required
              />
            </div>
          )}

          {/* Validation (for number fields) */}
          {formData.type === 'number' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                  最小值（可选）
                </label>
                <input
                  type="number"
                  value={formData.validation?.min ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validation: {
                        ...formData.validation,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                  最大值（可选）
                </label>
                <input
                  type="number"
                  value={formData.validation?.max ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      validation: {
                        ...formData.validation,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>
            </div>
          )}

          {/* File Upload Configuration */}
          {formData.type === 'file' && (
            <div className="space-y-4 p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated">
              <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                文件上传设置
              </h4>

              {/* Max File Size */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                  最大文件大小（MB）
                </label>
                <input
                  type="number"
                  value={formData.fileConfig?.maxSizeMB ?? 10}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fileConfig: {
                        ...formData.fileConfig,
                        maxSizeMB: Number(e.target.value) || 10,
                        allowedTypes: formData.fileConfig?.allowedTypes || ['image/*', 'application/pdf'],
                        multiple: formData.fileConfig?.multiple ?? false,
                      },
                    })
                  }
                  min={1}
                  max={50}
                  className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-primary"
                />
              </div>

              {/* Allowed File Types */}
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
                  允许的文件类型
                </label>
                <div className="space-y-2">
                  {['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'].map((type) => (
                    <label key={type} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.fileConfig?.allowedTypes?.includes(type) ?? (type === 'image/*' || type === 'application/pdf')}
                        onChange={(e) => {
                          const currentTypes = formData.fileConfig?.allowedTypes || ['image/*', 'application/pdf'];
                          const newTypes = e.target.checked
                            ? [...currentTypes, type]
                            : currentTypes.filter((t) => t !== type);

                          setFormData({
                            ...formData,
                            fileConfig: {
                              maxSizeMB: formData.fileConfig?.maxSizeMB ?? 10,
                              allowedTypes: newTypes,
                              multiple: formData.fileConfig?.multiple ?? false,
                            },
                          });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                        {type === 'image/*' ? '图片（PNG、JPG、GIF 等）' :
                         type === 'application/pdf' ? 'PDF' :
                         type === 'application/msword' ? 'Word (.doc)' :
                         type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word (.docx)' :
                         type === 'text/plain' ? '文本文件' : type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Multiple Files Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multiple-files"
                  checked={formData.fileConfig?.multiple ?? false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      fileConfig: {
                        maxSizeMB: formData.fileConfig?.maxSizeMB ?? 10,
                        allowedTypes: formData.fileConfig?.allowedTypes || ['image/*', 'application/pdf'],
                        multiple: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="multiple-files" className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  允许多个文件
                </label>
              </div>
            </div>
          )}

          {/* Required Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={formData.required}
              onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
              className="w-4 h-4"
            />
            <label htmlFor="required" className="text-sm text-text-light-primary dark:text-text-dark-primary">
              必填字段
            </label>
          </div>

          {/* Advanced Options Toggle */}
          <div className="border-t border-border-light dark:border-border-dark pt-4">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 text-sm font-medium text-accent-primary hover:underline"
            >
              {showAdvancedOptions ? '▼' : '▶'} 高级选项
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="space-y-6 p-4 border border-border-light dark:border-border-dark rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated">
              {/* Calculation Settings (only for calculation field type) */}
              {formData.type === 'calculation' && (
                <CalculationFieldEditor
                  field={formData}
                  allFields={allFields}
                  onSettingsChange={(settings: CalculationSettings) =>
                    setFormData({ ...formData, calculationSettings: settings })
                  }
                />
              )}

              {/* Conditional Logic (not for calculation fields) */}
              {formData.type !== 'calculation' && (
                <ConditionalRuleEditor
                  field={formData}
                  allFields={allFields}
                  onRulesChange={(rules) =>
                    setFormData({ ...formData, conditionalRules: rules })
                  }
                />
              )}

              {/* Dependent Validation (not for calculation fields) */}
              {formData.type !== 'calculation' && (
                <div className="pt-6 border-t border-border-light dark:border-border-dark">
                  <DependentValidationEditor
                    field={formData}
                    allFields={allFields}
                    onValidationsChange={(validations: DependentValidation[]) =>
                      setFormData({ ...formData, dependentValidation: validations })
                    }
                  />
                </div>
              )}

              {/* Quiz Settings (only if quiz mode enabled) */}
              {form.settings.quizMode && (
                <div className="pt-6 border-t border-border-light dark:border-border-dark">
                  <QuizSettingsEditor
                    field={formData}
                    onSettingsChange={(settings: QuizSettings | undefined) =>
                      setFormData({ ...formData, quizSettings: settings })
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg hover:bg-border-light dark:hover:bg-border-dark"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:opacity-90"
            >
              {field ? '保存更改' : '添加字段'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
