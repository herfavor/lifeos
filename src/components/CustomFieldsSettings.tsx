import { useState } from 'react';
import { CalendarDays, CheckSquare, ClipboardList, FileText, Hash, Lightbulb, Link, Mail, Pin, Plus, Tag, X, type LucideIcon } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import type { FieldDefinition, FieldType } from '../types/customFields';
import { toast } from '../stores/useToastStore';

/**
 * Custom Fields Settings Component
 *
 * Manages custom field definitions for tasks and notes.
 * Users can create, edit, and delete custom field definitions.
 *
 * Features:
 * - Separate tabs for Tasks and Notes
 * - Create new field with modal
 * - Edit field inline
 * - Delete field with confirmation
 * - Field type selector (text, number, date, select, checkbox)
 * - Options management for select type
 */

type FieldTarget = 'tasks' | 'notes';

interface CreateFieldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: Omit<FieldDefinition, 'id' | 'createdAt' | 'updatedAt'>) => void;
  target: FieldTarget;
}

function CreateFieldModal({ isOpen, onClose, onSave, target }: CreateFieldModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [description, setDescription] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState<string[]>(['']);

  const resetForm = () => {
    setName('');
    setType('text');
    setDescription('');
    setRequired(false);
    setOptions(['']);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.warning('字段名称不能为空');
      return;
    }

    if ((type === 'select' || type === 'multi-select') && options.filter((opt) => opt.trim()).length === 0) {
      toast.warning('选择类型字段至少需要一个选项');
      return;
    }

    const field: Omit<FieldDefinition, 'id' | 'createdAt' | 'updatedAt'> = {
      name: name.trim(),
      type,
      description: description.trim() || undefined,
      required,
      options: (type === 'select' || type === 'multi-select') ? options.filter((opt) => opt.trim()) : undefined,
      visibleInCard: true, // Default: visible in cards
      visibleInList: true, // Default: visible in list view
    };

    onSave(field);
    handleClose();
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 1) return;
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              创建自定义字段（{target === 'tasks' ? '任务' : '笔记'}）
            </h3>
            <button
              onClick={handleClose}
              className="text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
              aria-label="关闭"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Field Name */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              字段名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：Bug ID、Sprint、客户名称"
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
              autoFocus
            />
          </div>

          {/* Field Type */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              字段类型 *
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as FieldType)}
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            >
              <option value="text">文本（单行）</option>
              <option value="number">数字</option>
              <option value="date">日期</option>
              <option value="select">选择（下拉菜单）</option>
              <option value="multi-select">多选（标签）</option>
              <option value="checkbox">复选框</option>
              <option value="url">URL（带打开链接）</option>
              <option value="email">邮箱（带发送按钮）</option>
            </select>
          </div>

          {/* Options (only for select type) */}
          {(type === 'select' || type === 'multi-select') && (
            <div>
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                选项 *
              </label>
              <div className="space-y-2">
                {options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`选项 ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    />
                    {options.length > 1 && (
                      <button
                        onClick={() => removeOption(index)}
                        className="inline-flex items-center px-3 py-2 bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark rounded-lg hover:opacity-80 transition-opacity"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addOption}
                  className="w-full px-3 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-medium transition-colors"
                >
                  + 添加选项
                </button>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              描述（可选）
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="此字段的可选帮助文本"
              rows={2}
              className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue resize-none"
            />
          </div>

          {/* Required Checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={required}
              onChange={(e) => setRequired(e.target.checked)}
              className="w-4 h-4 rounded border-border-light dark:border-border-dark focus:ring-2 focus:ring-accent-blue"
            />
            <label htmlFor="required" className="text-sm text-text-light-primary dark:text-text-dark-primary">
              必填字段
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium hover:bg-surface-light dark:hover:bg-surface-dark transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              创建字段
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface FieldListItemProps {
  field: FieldDefinition;
  onDelete: (fieldId: string) => void;
  onUpdate: (fieldId: string, changes: Partial<FieldDefinition>) => void;
}

function FieldListItem({ field, onDelete, onUpdate }: FieldListItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    onDelete(field.id);
    setShowDeleteConfirm(false);
  };

  const getFieldTypeIcon = (type: FieldType): LucideIcon => {
    switch (type) {
      case 'text':
        return FileText;
      case 'number':
        return Hash;
      case 'date':
        return CalendarDays;
      case 'select':
        return ClipboardList;
      case 'checkbox':
        return CheckSquare;
      case 'multi-select':
        return Tag;
      case 'url':
        return Link;
      case 'email':
        return Mail;
      default:
        return Pin;
    }
  };

  const getFieldTypeLabel = (type: FieldType): string => {
    switch (type) {
      case 'text':
        return '文本';
      case 'number':
        return '数字';
      case 'date':
        return '日期';
      case 'select':
        return '选择';
      case 'multi-select':
        return '多选';
      case 'checkbox':
        return '复选框';
      case 'url':
        return 'URL';
      case 'email':
        return '邮箱';
      default:
        return type;
    }
  };

  const TypeIcon = getFieldTypeIcon(field.type);

  return (
    <div className="p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Field Name + Type Icon */}
          <div className="flex items-center gap-2 mb-1">
            <TypeIcon className="h-5 w-5 shrink-0" aria-hidden />
            <h4 className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
              {field.name}
            </h4>
            {field.required && (
              <span className="px-2 py-0.5 bg-status-error-bg dark:bg-status-error-bg-dark text-status-error-text dark:text-status-error-text-dark text-xs rounded-full">
                必填
              </span>
            )}
          </div>

          {/* Field Type */}
          <div className="flex items-center gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
            <span className="font-medium">{getFieldTypeLabel(field.type)}</span>
            {(field.type === 'select' || field.type === 'multi-select') && field.options && (
              <span>• {field.options.length} 个选项</span>
            )}
          </div>

          {/* Description */}
          {field.description && (
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {field.description}
            </p>
          )}

          {/* Options (for select/multi-select type) */}
          {(field.type === 'select' || field.type === 'multi-select') && field.options && field.options.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {field.options.map((option, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-accent-blue/10 text-accent-blue text-xs rounded-full"
                >
                  {option}
                </span>
              ))}
            </div>
          )}

          {/* Visibility Toggles () */}
          <div className="mt-3 flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${field.id}-visible-card`}
                checked={field.visibleInCard !== false}
                onChange={(e) => onUpdate(field.id, { visibleInCard: e.target.checked })}
                className="w-4 h-4 rounded border-border-light dark:border-border-dark focus:ring-2 focus:ring-accent-blue cursor-pointer"
              />
              <label
                htmlFor={`${field.id}-visible-card`}
                className="text-text-light-secondary dark:text-text-dark-secondary cursor-pointer select-none"
              >
                在卡片中显示
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`${field.id}-visible-list`}
                checked={field.visibleInList !== false}
                onChange={(e) => onUpdate(field.id, { visibleInList: e.target.checked })}
                className="w-4 h-4 rounded border-border-light dark:border-border-dark focus:ring-2 focus:ring-accent-blue cursor-pointer"
              />
              <label
                htmlFor={`${field.id}-visible-list`}
                className="text-text-light-secondary dark:text-text-dark-secondary cursor-pointer select-none"
              >
                在列表中显示
              </label>
            </div>
          </div>
        </div>

        {/* Delete Button */}
        <div>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm text-status-error-text dark:text-status-error-text-dark hover:bg-status-error-bg dark:hover:bg-status-error-bg-dark rounded-lg transition-colors"
            >
              删除
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 text-xs bg-surface-light dark:bg-surface-dark rounded"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-xs bg-status-error text-white rounded hover:opacity-80"
              >
                确认
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CustomFieldsSettings() {
  const [activeTab, setActiveTab] = useState<FieldTarget>('tasks');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { customFieldDefinitions, addFieldDefinition, updateFieldDefinition, deleteFieldDefinition } = useSettingsStore();

  const taskFields = customFieldDefinitions.tasks;
  const noteFields = customFieldDefinitions.notes;

  const activeFields = activeTab === 'tasks' ? taskFields : noteFields;

  const handleCreateField = (field: Omit<FieldDefinition, 'id' | 'createdAt' | 'updatedAt'>) => {
    addFieldDefinition(activeTab, field);
  };

  const handleUpdateField = (fieldId: string, changes: Partial<FieldDefinition>) => {
    updateFieldDefinition(activeTab, fieldId, changes);
  };

  const handleDeleteField = (fieldId: string) => {
    deleteFieldDefinition(activeTab, fieldId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
          创建自定义字段，为任务和笔记添加结构化元数据。自定义字段支持强大的筛选、排序和分析。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-accent-primary text-white'
              : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
          }`}
        >
          任务字段（{taskFields.length}）
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'notes'
              ? 'bg-accent-primary text-white'
              : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light dark:hover:bg-surface-dark'
          }`}
        >
          笔记字段（{noteFields.length}）
        </button>
      </div>

      {/* Create Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full px-4 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200 flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" aria-hidden />
        <span>创建自定义字段</span>
      </button>

      {/* Field List */}
      {activeFields.length > 0 ? (
        <div className="space-y-3">
          {activeFields.map((field) => (
            <FieldListItem
              key={field.id}
              field={field}
              onDelete={handleDeleteField}
              onUpdate={handleUpdateField}
            />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-dashed border-border-light dark:border-border-dark">
          <p className="text-lg text-text-light-secondary dark:text-text-dark-secondary mb-2">
            还没有自定义字段
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            点击上方“创建自定义字段”添加你的第一个{activeTab === 'tasks' ? '任务' : '笔记'}字段。
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-status-info-bg dark:bg-status-info-bg-dark border border-status-info-border dark:border-status-info-border-dark rounded-lg">
        <p className="text-xs text-status-info-text dark:text-status-info-text-dark">
          <strong><Lightbulb className="mr-1 inline h-3.5 w-3.5" aria-hidden />提示：</strong>自定义字段非常适合跟踪领域特定的元数据，如 Bug ID、Sprint 编号、客户名称、精力水平等。字段值可以在单个{' '}
          {activeTab === 'tasks' ? '任务' : '笔记'}上设置。
        </p>
      </div>

      {/* Create Modal */}
      <CreateFieldModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateField}
        target={activeTab}
      />
    </div>
  );
}
