/**
 * Field List Component
 * Display and manage list of form fields with reordering
 */

import type { FormField } from '../../types/forms';
import { GripVertical, Edit, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';

interface FieldListProps {
  fields: FormField[];
  onEdit: (field: FormField) => void;
  onDelete: (id: string) => void;
  onDuplicate: (field: FormField) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

export function FieldList({
  fields,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: FieldListProps) {
  const sortedFields = [...fields].sort((a, b) => a.order - b.order);

  if (fields.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-border-light dark:border-border-dark rounded-lg">
        <p className="text-text-light-secondary dark:text-text-dark-secondary">
          还没有字段。点击“添加字段”开始。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedFields.map((field, index) => (
        <FieldListItem
          key={field.id}
          field={field}
          isFirst={index === 0}
          isLast={index === sortedFields.length - 1}
          onEdit={() => onEdit(field)}
          onDelete={() => onDelete(field.id)}
          onDuplicate={() => onDuplicate(field)}
          onMoveUp={() => onMoveUp(field.id)}
          onMoveDown={() => onMoveDown(field.id)}
        />
      ))}
    </div>
  );
}

interface FieldListItemProps {
  field: FormField;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FieldListItem({
  field,
  isFirst,
  isLast,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: FieldListItemProps) {
  const getFieldTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      text: '文本',
      textarea: '多行文本',
      number: '数字',
      date: '日期',
      time: '时间',
      select: '选择',
      multiselect: '多选',
      radio: '单选',
      checkbox: '复选框',
      rating: '评分',
      scale: '量表',
    };
    return labels[type] || type;
  };

  return (
    <div className="flex items-center gap-2 p-3 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-md transition-shadow group">
      {/* Drag Handle (visual only) */}
      <div className="flex-shrink-0 text-text-light-tertiary dark:text-text-dark-tertiary cursor-grab">
        <GripVertical className="w-5 h-5" />
      </div>

      {/* Field Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
            {field.label}
          </h4>
          {field.required && (
            <span className="text-xs px-1.5 py-0.5 bg-accent-red/10 text-accent-red rounded">
              必填
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          <span className="px-2 py-0.5 bg-accent-primary/10 text-accent-primary rounded">
            {getFieldTypeLabel(field.type)}
          </span>
          {field.description && (
            <span className="truncate">{field.description}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity">
        {/* Move Up/Down */}
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="上移"
          aria-label="上移字段"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded disabled:opacity-30 disabled:cursor-not-allowed"
          title="下移"
          aria-label="下移字段"
        >
          <ChevronDown className="w-4 h-4" />
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded"
          title="编辑字段"
          aria-label="编辑字段"
        >
          <Edit className="w-4 h-4" />
        </button>

        {/* Duplicate */}
        <button
          onClick={onDuplicate}
          className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded"
          title="复制字段"
          aria-label="复制字段"
        >
          <Copy className="w-4 h-4" />
        </button>

        {/* Delete */}
        <button
          onClick={onDelete}
          className="p-1 hover:bg-accent-red/10 text-accent-red rounded"
          title="删除字段"
          aria-label="删除字段"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
