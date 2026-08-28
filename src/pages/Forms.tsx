/**
 * Forms Page - Library View
 * Grid of all form templates with create/search/delete
 *
 * Exports FormsContent component for embedding in Create page
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StoreErrorBoundary } from '../components/StoreErrorBoundary';
import { useFormsStore } from '../stores/useFormsStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Plus, Search, Grid3x3, List, FileText, Trash2, RotateCcw } from 'lucide-react';

/**
 * FormsContent - Exportable content component for embedding in Create page
 * Renders without page wrapper for use as a tab
 */
export function FormsContent() {
  const navigate = useNavigate();
  // Subscribe to raw data arrays (stable references)
  const forms = useFormsStore((s) => s.forms);
  const responses = useFormsStore((s) => s.responses);
  const createForm = useFormsStore((s) => s.createForm);
  const deleteForm = useFormsStore((s) => s.deleteForm);
  const restoreForm = useFormsStore((s) => s.restoreForm);
  const permanentlyDeleteForm = useFormsStore((s) => s.permanentlyDeleteForm);
  const duplicateForm = useFormsStore((s) => s.duplicateForm);

  // Compute derived stats in useMemo to avoid infinite loop
  const formsWithStats = useMemo(() => {
    return forms.map((form) => {
      const formResponses = responses.filter((r) => r.formId === form.id);
      const sortedResponses = [...formResponses].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      return {
        ...form,
        responseCount: formResponses.length,
        lastSubmittedAt: sortedResponses.length > 0 ? sortedResponses[0].submittedAt : undefined,
      };
    });
  }, [forms, responses]);

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [formToPermanentlyDelete, setFormToPermanentlyDelete] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);

  const handleCreateForm = () => {
    const newForm = createForm('未命名表单');
    navigate(`/forms/${newForm.id}/edit`);
  };

  const handleOpenBuilder = (id: string) => {
    navigate(`/forms/${id}/edit`);
  };

  const handleFillForm = (id: string) => {
    navigate(`/forms/${id}/fill`);
  };

  const handleViewResponses = (id: string) => {
    navigate(`/forms/${id}/responses`);
  };

  const handleDeleteForm = (id: string) => {
    setFormToDelete(id);
  };

  const confirmDeleteForm = () => {
    if (formToDelete) {
      deleteForm(formToDelete);
      setFormToDelete(null);
    }
  };

  const confirmPermanentDeleteForm = () => {
    if (formToPermanentlyDelete) {
      permanentlyDeleteForm(formToPermanentlyDelete);
      setFormToPermanentlyDelete(null);
    }
  };

  const handleDuplicateForm = (id: string) => {
    const duplicate = duplicateForm(id);
    if (duplicate) {
      navigate(`/forms/${duplicate.id}/edit`);
    }
  };

  // Active forms only; trash is listed separately below.
  const activeFormsWithStats = formsWithStats.filter((form) => !form.deletedAt);
  const trashedForms = forms
    .filter((form) => form.deletedAt)
    .sort((a, b) => new Date(b.deletedAt?.getTime() ?? 0).getTime() - new Date(a.deletedAt?.getTime() ?? 0).getTime());

  // Filter forms by search query
  const filteredForms = activeFormsWithStats.filter((form) =>
    form.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort by most recently updated
  const sortedForms = [...filteredForms].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
        <div>
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            表单
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
            {sortedForms.length} 个表单
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <input
              type="text"
              placeholder="搜索表单…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
          </div>

          {/* View mode toggle */}
          <div className="flex gap-1 bg-surface-light dark:bg-surface-dark rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-accent-blue dark:bg-accent-blue text-white'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
              }`}
              aria-label="网格视图"
            >
              <Grid3x3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-accent-blue dark:bg-accent-blue text-white'
                  : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
              }`}
              aria-label="列表视图"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreateForm}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
          >
            <Plus className="w-4 h-4" />
            新建表单
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {sortedForms.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 mb-4 rounded-full bg-surface-light dark:bg-surface-dark flex items-center justify-center">
              <FileText className="w-12 h-12 text-text-light-tertiary dark:text-text-dark-tertiary" />
            </div>
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-2">
              {searchQuery ? '未找到表单' : '还没有表单'}
            </h2>
            <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6 max-w-md">
              {searchQuery
                ? '请调整搜索关键词'
                : '创建你的第一个表单，用于追踪习惯、收集数据或制作自定义调查问卷'}
            </p>
            {!searchQuery && (
              <button
                onClick={handleCreateForm}
                className="flex items-center gap-2 px-6 py-3 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
              >
                <Plus className="w-5 h-5" />
                创建你的第一个表单
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          // Grid view
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedForms.map((form) => (
              <FormCard
                key={form.id}
                form={form}
                onEdit={() => handleOpenBuilder(form.id)}
                onFill={() => handleFillForm(form.id)}
                onViewResponses={() => handleViewResponses(form.id)}
                onDelete={() => handleDeleteForm(form.id)}
                onDuplicate={() => handleDuplicateForm(form.id)}
              />
            ))}
          </div>
        ) : (
          // List view
          <div className="space-y-2">
            {sortedForms.map((form) => (
              <FormListItem
                key={form.id}
                form={form}
                onEdit={() => handleOpenBuilder(form.id)}
                onFill={() => handleFillForm(form.id)}
                onViewResponses={() => handleViewResponses(form.id)}
                onDelete={() => handleDeleteForm(form.id)}
                onDuplicate={() => handleDuplicateForm(form.id)}
              />
            ))}
          </div>
        )}

        {/* Recycle bin */}
        {trashedForms.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowTrash(!showTrash)}
              className="flex items-center gap-2 text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary mb-4"
            >
              <Trash2 className="w-4 h-4" />
              回收站（{trashedForms.length}）
            </button>
            {showTrash && (
              <div className="space-y-2 opacity-70">
                {trashedForms.map((form) => (
                  <div
                    key={form.id}
                    className="flex items-center justify-between bg-surface-light dark:bg-surface-dark-elevated rounded-lg p-3 border border-border-light dark:border-border-dark"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-light-primary dark:text-text-dark-primary">{form.title || '未命名表单'}</p>
                      <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">删除于 {new Date(form.deletedAt?.getTime() ?? Date.now()).toLocaleString()}（回复会保留到永久删除）</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreForm(form.id)}
                        className="p-2 hover:bg-surface-light-alt dark:hover:bg-surface-dark rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary"
                        title="恢复"
                        aria-label={`恢复表单 ${form.title}`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setFormToPermanentlyDelete(form.id)}
                        className="p-2 hover:bg-status-error/10 rounded-lg text-status-error"
                        title="永久删除"
                        aria-label={`永久删除表单 ${form.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={formToDelete !== null}
        onClose={() => setFormToDelete(null)}
        onConfirm={confirmDeleteForm}
        title="删除表单"
        message="确定将表单移到回收站吗？回复会保留；之后仍可恢复表单。"
        confirmText="移到回收站"
        variant="warning"
      />

      <ConfirmDialog
        isOpen={formToPermanentlyDelete !== null}
        onClose={() => setFormToPermanentlyDelete(null)}
        onConfirm={confirmPermanentDeleteForm}
        title="永久删除表单"
        message="确定要永久删除此表单及其所有回复吗？此操作无法撤销。"
        confirmText="永久删除"
        variant="danger"
      />
    </>
  );
}

/**
 * Forms Page - Wraps FormsContent with page structure
 */
export default function Forms() {
  return (
    <StoreErrorBoundary storeName="forms">
      <main className="flex flex-col h-full bg-surface-light dark:bg-surface-dark">
        <FormsContent />
      </main>
    </StoreErrorBoundary>
  );
}

// Form Card Component (Grid View)
interface FormCardProps {
  form: {
    id: string;
    title: string;
    description?: string;
    updatedAt: Date;
    fields: unknown[];
    responseCount: number;
    lastSubmittedAt?: Date;
  };
  onEdit: () => void;
  onFill: () => void;
  onViewResponses: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function FormCard({ form, onEdit, onFill, onViewResponses, onDelete, onDuplicate }: FormCardProps) {
  return (
    <div className="group bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-4 bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 dark:from-accent-blue/20 dark:to-accent-purple/10">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate mb-1">
          {form.title}
        </h3>
        {form.description && (
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary line-clamp-2">
            {form.description}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary mb-3">
          <span>{form.fields.length} 个字段</span>
          <span>{form.responseCount} 条回复</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onFill}
            className="w-full px-3 py-2 text-sm bg-accent-blue dark:bg-accent-blue text-white rounded hover:bg-accent-blue-hover"
          >
            填写表单
          </button>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="flex-1 px-2 py-1 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              编辑
            </button>
            <button
              onClick={onViewResponses}
              className="flex-1 px-2 py-1 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              回复
            </button>
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="flex-1 px-2 py-1 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
            >
              复制
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="flex-1 px-2 py-1 text-xs bg-accent-red/10 text-accent-red rounded hover:bg-accent-red/20"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Form List Item Component (List View)
function FormListItem({ form, onEdit, onFill, onViewResponses, onDelete, onDuplicate }: FormCardProps) {
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg hover:shadow-md transition-shadow">
      {/* Icon */}
      <div className="w-12 h-12 bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 rounded flex items-center justify-center flex-shrink-0">
        <FileText className="w-6 h-6 text-accent-blue dark:text-accent-purple" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
          {form.title}
        </h3>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
          {form.fields.length} 个字段 • {form.responseCount} 条回复 • 更新于 {new Date(form.updatedAt).toLocaleDateString()}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onFill}
          className="px-4 py-2 text-sm bg-accent-blue dark:bg-accent-blue text-white rounded hover:bg-accent-blue-hover"
        >
          填写表单
        </button>
        <button
          onClick={onEdit}
          className="px-3 py-2 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
        >
          编辑
        </button>
        <button
          onClick={onViewResponses}
          className="px-3 py-2 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
        >
          回复
        </button>
        <button
          onClick={onDuplicate}
          className="px-3 py-2 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated rounded hover:bg-surface-light dark:hover:bg-surface-dark"
        >
          复制
        </button>
        <button
          onClick={onDelete}
          className="px-3 py-2 text-sm bg-accent-red/10 text-accent-red rounded hover:bg-accent-red/20"
        >
          删除
        </button>
      </div>
    </div>
  );
}
