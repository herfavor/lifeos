/**
 * Template Library Modal Component
 * Gallery view for browsing, creating, editing, and selecting note templates
 */

import React, { useState, useMemo } from 'react';
import { X, Plus, Edit2, Trash2, Search, Sparkles, Tag as TagIcon, BookOpen, Briefcase, CheckCircle2, User, type LucideIcon } from 'lucide-react';
import { useNotesStore } from '../stores/useNotesStore';
import type { NoteTemplate } from '../types/notes';
import { ConfirmDialog } from './ConfirmDialog';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect?: (template: NoteTemplate) => void;
}

type TemplateCategory = 'Work' | 'Personal' | 'Productivity' | 'All';

const categoryIcons: Record<TemplateCategory, LucideIcon> = {
  All: BookOpen,
  Work: Briefcase,
  Personal: User,
  Productivity: CheckCircle2,
};

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  All: '全部',
  Work: '工作',
  Personal: '个人',
  Productivity: '效率',
};

/**
 * Template Create/Edit Form Component
 */
interface TemplateFormProps {
  template?: NoteTemplate;
  onSave: (template: Partial<NoteTemplate>) => void;
  onCancel: () => void;
}

function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [icon, setIcon] = useState(template?.icon || '');
  const [category, setCategory] = useState<'Work' | 'Personal' | 'Productivity'>(
    (template?.category as 'Work' | 'Personal' | 'Productivity') || 'Work'
  );
  const [defaultTags, setDefaultTags] = useState<string[]>(template?.defaultTags || []);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = '名称是必填项';
    if (!description.trim()) newErrors.description = '描述是必填项';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim() || undefined,
      category,
      defaultTags,
    });
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !defaultTags.includes(trimmed)) {
      setDefaultTags([...defaultTags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDefaultTags(defaultTags.filter((t) => t !== tag));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Input */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          模板名称 *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：会议记录"
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
          autoFocus
        />
        {errors.name && <p className="text-sm text-accent-red mt-1">{errors.name}</p>}
      </div>

      {/* Icon Input */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          图标（表情符号或文字）
        </label>
        <input
          type="text"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          placeholder="e.g., 📋 or MB"
          maxLength={4}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
        />
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          用于标识此模板的简短表情符号或文字
        </p>
      </div>

      {/* Category Dropdown */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          分类
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as 'Work' | 'Personal' | 'Productivity')}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
        >
          <option value="Work">工作</option>
          <option value="Personal">个人</option>
          <option value="Productivity">效率</option>
        </select>
      </div>

      {/* Description Textarea */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          模板内容 *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="在此输入模板内容…"
          rows={10}
          className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue font-mono text-sm resize-y"
        />
        {errors.description && <p className="text-sm text-accent-red mt-1">{errors.description}</p>}
        <div className="mt-2 p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg border border-border-light dark:border-border-dark">
          <p className="text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            可用的模板变量：
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{date}'}
              </code>{' '}
              当前日期
            </div>
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{time}'}
              </code>{' '}
              当前时间
            </div>
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{datetime}'}
              </code>{' '}
              日期和时间
            </div>
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{title}'}
              </code>{' '}
              笔记标题
            </div>
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{user}'}
              </code>{' '}
              用户名
            </div>
            <div>
              <code className="px-1.5 py-0.5 bg-accent-purple/10 text-accent-purple rounded">
                {'{timestamp}'}
              </code>{' '}
              Unix 时间戳
            </div>
          </div>
        </div>
      </div>

      {/* Default Tags */}
      <div>
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
          默认标签
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="添加标签…"
            className="flex-1 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
          >
            添加
          </button>
        </div>
        {defaultTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {defaultTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-1 bg-accent-purple/10 text-accent-purple rounded text-sm"
              >
                <TagIcon className="w-3 h-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-accent-red"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
          从该模板创建的笔记会自动应用这些标签
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end pt-4 border-t border-border-light dark:border-border-dark">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
        >
          {template ? '保存更改' : '创建模板'}
        </button>
      </div>
    </form>
  );
}

/**
 * Template Card Component
 */
interface TemplateCardProps {
  template: NoteTemplate;
  onSelect?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

function TemplateCard({ template, onSelect, onEdit, onDelete }: TemplateCardProps) {
  const canEdit = !template.isBuiltIn;

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-4 hover:border-accent-primary hover:shadow-md transition-all">
      {/* Built-in Badge */}
      {template.isBuiltIn && (
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-accent-blue/10 text-accent-blue text-xs font-medium rounded">
          内置
        </div>
      )}

      {/* Icon */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 flex items-center justify-center bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg text-xl">
          {template.icon || '📄'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
            {template.name}
          </h3>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            {template.category}
          </p>
        </div>
      </div>

      {/* Description Preview */}
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary line-clamp-3 mb-4">
        {template.description.slice(0, 100)}...
      </p>

      {/* Default Tags */}
      {template.defaultTags && template.defaultTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {template.defaultTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-purple/10 text-accent-purple text-xs rounded"
            >
              <TagIcon className="w-3 h-3" />
              {tag}
            </span>
          ))}
          {template.defaultTags.length > 3 && (
            <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary px-1">
              +{template.defaultTags.length - 3} 更多
            </span>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onSelect && (
          <button
            onClick={onSelect}
            className="flex-1 px-3 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Sparkles className="w-4 h-4" />
            使用模板
          </button>
        )}
        {canEdit && onEdit && (
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg hover:bg-border-light dark:hover:bg-border-dark transition-colors"
            title="编辑模板"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
        {canEdit && onDelete && (
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-accent-red/10 text-accent-red rounded-lg hover:bg-accent-red/20 transition-colors"
            title="删除模板"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Template Library Modal Component
 */
export function TemplateLibrary({ isOpen, onClose, onSelect }: TemplateLibraryProps) {
  const getAllNoteTemplates = useNotesStore((state) => state.getAllNoteTemplates);
  const createNoteTemplate = useNotesStore((state) => state.createNoteTemplate);
  const updateNoteTemplate = useNotesStore((state) => state.updateNoteTemplate);
  const deleteNoteTemplate = useNotesStore((state) => state.deleteNoteTemplate);

  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | undefined>(undefined);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<NoteTemplate | null>(null);

  // Get all templates
  const allTemplates = getAllNoteTemplates();

  // Filter templates
  const filteredTemplates = useMemo(() => {
    let filtered = allTemplates;

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          (t.defaultTags && t.defaultTags.some((tag) => tag.toLowerCase().includes(query)))
      );
    }

    return filtered;
  }, [allTemplates, selectedCategory, searchQuery]);

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setShowForm(true);
  };

  const handleEditTemplate = (template: NoteTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleSaveTemplate = (data: Partial<NoteTemplate>) => {
    if (editingTemplate) {
      updateNoteTemplate(editingTemplate.id, data);
    } else {
      createNoteTemplate(data);
    }
    setShowForm(false);
    setEditingTemplate(undefined);
  };

  const handleDeleteTemplate = (template: NoteTemplate) => {
    setDeleteConfirmTemplate(template);
  };

  const confirmDelete = () => {
    if (deleteConfirmTemplate) {
      deleteNoteTemplate(deleteConfirmTemplate.id);
      setDeleteConfirmTemplate(null);
    }
  };

  const handleSelectTemplate = (template: NoteTemplate) => {
    if (onSelect) {
      onSelect(template);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50">
      {/* Backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface-light dark:bg-surface-dark rounded-lg shadow-modal border border-border-light dark:border-border-dark w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark flex-shrink-0">
          <h2 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary">
            {showForm ? (editingTemplate ? '编辑模板' : '创建模板') : '模板库'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
            aria-label="关闭弹窗"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            /* Template Form */
            <TemplateForm
              template={editingTemplate}
              onSave={handleSaveTemplate}
              onCancel={() => {
                setShowForm(false);
                setEditingTemplate(undefined);
              }}
            />
          ) : (
            /* Template Gallery */
            <>
              {/* Controls */}
              <div className="mb-6 space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
                  <input
                    type="text"
                    placeholder="按名称、描述或标签搜索模板…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>

                {/* Category Filter + New Button */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex gap-2 overflow-x-auto">
                    {(['All', 'Work', 'Personal', 'Productivity'] as TemplateCategory[]).map((cat) => {
                      const CatIcon = categoryIcons[cat];
                      return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                          selectedCategory === cat
                            ? 'bg-accent-primary text-white'
                            : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-border-light dark:hover:bg-border-dark'
                        }`}
                      >
                        <CatIcon className="w-4 h-4" />
                        {CATEGORY_LABELS[cat]}
                      </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={handleCreateTemplate}
                    className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    新建模板
                  </button>
                </div>
              </div>

              {/* Template Grid */}
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-light-secondary dark:text-text-dark-secondary">
                    {searchQuery.trim()
                      ? `未找到与“${searchQuery}”匹配的模板`
                      : selectedCategory !== 'All'
                      ? `“${selectedCategory}”分类中没有模板`
                      : '暂无可用模板'}
                  </p>
                  {!searchQuery.trim() && selectedCategory === 'All' && (
                    <button
                      onClick={handleCreateTemplate}
                      className="mt-4 px-6 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      创建你的第一个模板
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={onSelect ? () => handleSelectTemplate(template) : undefined}
                      onEdit={!template.isBuiltIn ? () => handleEditTemplate(template) : undefined}
                      onDelete={!template.isBuiltIn ? () => handleDeleteTemplate(template) : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmTemplate && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteConfirmTemplate(null)}
          onConfirm={confirmDelete}
          title="删除模板"
          message={`确定要删除模板“${deleteConfirmTemplate.name}”吗？此操作无法撤销。`}
          confirmText="删除"
          variant="danger"
        />
      )}
    </div>
  );
}
