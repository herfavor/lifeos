/**
 * SpreadsheetConditionalFormatting Component
 *
 * Dialog for building conditional formatting rules with style preview.
 */

import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { CellStyle, FilterOperator, FormatCondition } from '../../types';

interface ConditionalFormat {
  range: string;
  condition: FormatCondition;
  style: Partial<CellStyle>;
}

interface SpreadsheetConditionalFormattingProps {
  conditionalFormats: ConditionalFormat[];
  onChange: (formats: ConditionalFormat[]) => void;
  onClose: () => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: 'contains', label: '包含' },
  { value: 'not-contains', label: '不包含' },
  { value: 'equals', label: '等于' },
  { value: 'not-equals', label: '不等于' },
  { value: 'greater-than', label: '大于' },
  { value: 'less-than', label: '小于' },
  { value: 'between', label: '介于' },
  { value: 'empty', label: '为空' },
  { value: 'not-empty', label: '不为空' },
];

const PRESET_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#3B82F6', '#8B5CF6',
  '#EC4899', '#000000', '#374151', '#FFFFFF',
];

function createDefaultFormat(): ConditionalFormat {
  return {
    range: 'A1:A100',
    condition: { type: 'value', operator: 'greater-than', value: '0' },
    style: { backgroundColor: '#22C55E' },
  };
}

export function SpreadsheetConditionalFormatting({
  conditionalFormats: initial,
  onChange,
  onClose,
}: SpreadsheetConditionalFormattingProps) {
  const [formats, setFormats] = useState<ConditionalFormat[]>(initial);

  const addFormat = () => {
    setFormats([...formats, createDefaultFormat()]);
  };

  const removeFormat = (index: number) => {
    setFormats(formats.filter((_, i) => i !== index));
  };

  const updateFormat = (index: number, updates: Partial<ConditionalFormat>) => {
    setFormats(formats.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const updateCondition = (index: number, updates: Partial<FormatCondition>) => {
    setFormats(
      formats.map((f, i) =>
        i === index ? { ...f, condition: { ...f.condition, ...updates } } : f
      )
    );
  };

  const updateStyle = (index: number, updates: Partial<CellStyle>) => {
    setFormats(
      formats.map((f, i) => (i === index ? { ...f, style: { ...f.style, ...updates } } : f))
    );
  };

  const handleApply = () => {
    onChange(formats);
    onClose();
  };

  const inputClass =
    'px-2 py-1 text-sm rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-1 focus:ring-accent-primary';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-xl w-[560px] max-h-[80vh] flex flex-col border border-border-light dark:border-border-dark">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            条件格式
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-light-alt dark:hover:bg-surface-dark text-text-light-secondary dark:text-text-dark-secondary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Rules */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {formats.length === 0 && (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              没有条件格式规则。点击“添加规则”创建一条。
            </p>
          )}

          {formats.map((fmt, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border border-border-light dark:border-border-dark space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
                  规则 {i + 1}
                </span>
                <button
                  onClick={() => removeFormat(i)}
                  className="p-1 rounded text-text-light-secondary dark:text-text-dark-secondary hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Range */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary w-14">
                  范围
                </label>
                <input
                  type="text"
                  value={fmt.range}
                  onChange={(e) => updateFormat(i, { range: e.target.value })}
                  placeholder="A1:A100"
                  className={inputClass + ' flex-1'}
                />
              </div>

              {/* Condition */}
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary w-14">
                  当
                </label>
                <select
                  value={fmt.condition.operator}
                  onChange={(e) =>
                    updateCondition(i, { operator: e.target.value as FilterOperator })
                  }
                  className={inputClass + ' w-36'}
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {fmt.condition.operator !== 'empty' &&
                  fmt.condition.operator !== 'not-empty' && (
                    <input
                      type="text"
                      value={fmt.condition.value}
                      onChange={(e) => updateCondition(i, { value: e.target.value })}
                      placeholder="值"
                      className={inputClass + ' flex-1 min-w-[60px]'}
                    />
                  )}
                {fmt.condition.operator === 'between' && (
                  <input
                    type="text"
                    value={fmt.condition.value2 ?? ''}
                    onChange={(e) => updateCondition(i, { value2: e.target.value })}
                    placeholder="值 2"
                    className={inputClass + ' w-20'}
                  />
                )}
              </div>

              {/* Style */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary w-14">
                  样式
                </label>

                {/* Background color */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    背景:
                  </span>
                  <div className="flex gap-0.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => updateStyle(i, { backgroundColor: color })}
                        className={`w-4 h-4 rounded border ${
                          fmt.style.backgroundColor === color
                            ? 'ring-2 ring-accent-primary ring-offset-1'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Text color */}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    文字:
                  </span>
                  <div className="flex gap-0.5">
                    {['#000000', '#FFFFFF', '#EF4444', '#3B82F6'].map((color) => (
                      <button
                        key={color}
                        onClick={() => updateStyle(i, { textColor: color })}
                        className={`w-4 h-4 rounded border ${
                          fmt.style.textColor === color
                            ? 'ring-2 ring-accent-primary ring-offset-1'
                            : 'border-border-light dark:border-border-dark'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Bold toggle */}
                <button
                  onClick={() => updateStyle(i, { bold: !fmt.style.bold })}
                  className={`px-1.5 py-0.5 text-xs font-bold rounded border ${
                    fmt.style.bold
                      ? 'bg-accent-primary/10 text-accent-primary border-accent-primary'
                      : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary'
                  }`}
                >
                  B
                </button>
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2">
                <label className="text-xs text-text-light-secondary dark:text-text-dark-secondary w-14">
                  预览
                </label>
                <div
                  className="px-3 py-1 rounded text-sm border border-border-light dark:border-border-dark"
                  style={{
                    backgroundColor: fmt.style.backgroundColor ?? 'transparent',
                    color: fmt.style.textColor ?? 'inherit',
                    fontWeight: fmt.style.bold ? 'bold' : 'normal',
                  }}
                >
                  示例文本
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addFormat}
            className="flex items-center gap-1 text-sm text-accent-primary hover:underline"
          >
            <Plus className="w-3.5 h-3.5" />
            添加规则
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark">
          <button
            onClick={() => {
              setFormats([]);
              onChange([]);
              onClose();
            }}
            className="px-3 py-1.5 text-sm rounded text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-alt dark:hover:bg-surface-dark"
          >
            全部清除
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-alt dark:hover:bg-surface-dark"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              className="px-3 py-1.5 text-sm rounded bg-accent-primary text-white hover:bg-accent-primary/90"
            >
              应用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
