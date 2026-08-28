/**
 * Form Builder Page
 * Full-screen form editor with field management and live preview
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StoreErrorBoundary } from '../components/StoreErrorBoundary';
import { useFormsStore } from '../stores/useFormsStore';
import { FieldEditor } from '../components/FormBuilder/FieldEditor';
import { FieldList } from '../components/FormBuilder/FieldList';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { FormField } from '../types/forms';
import { ArrowLeft, Save, Plus, Eye } from 'lucide-react';
import { toast } from '../stores/useToastStore';

export default function FormBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const getForm = useFormsStore((s) => s.getForm);
  const updateForm = useFormsStore((s) => s.updateForm);

  const [form, setForm] = useState(id ? getForm(id) : null);
  const [title, setTitle] = useState(form?.title || '');
  const [description, setDescription] = useState(form?.description || '');
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [isAddingField, setIsAddingField] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      navigate('/forms');
      return;
    }

    const foundForm = getForm(id);
    if (!foundForm) {
      navigate('/forms');
      return;
    }

    setForm(foundForm);
    setTitle(foundForm.title);
    setDescription(foundForm.description || '');
  }, [id, getForm, navigate]);

  if (!form || !id) return null;

  const handleSave = () => {
    updateForm(id, {
      title,
      description,
      fields: form.fields,
    });
    toast.success('表单保存成功');
  };

  const handleAddField = (field: FormField) => {
    const newField = {
      ...field,
      order: form.fields.length,
    };

    const updatedForm = {
      ...form,
      fields: [...form.fields, newField],
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
    setIsAddingField(false);
  };

  const handleEditField = (field: FormField) => {
    const updatedForm = {
      ...form,
      fields: form.fields.map((f) => (f.id === field.id ? field : f)),
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
    setEditingField(null);
  };

  const handleDeleteField = (fieldId: string) => {
    setFieldToDelete(fieldId);
  };

  const confirmDeleteField = () => {
    if (!fieldToDelete || !form || !id) return;

    const updatedFields = form.fields
      .filter((f) => f.id !== fieldToDelete)
      .map((f, index) => ({ ...f, order: index }));

    const updatedForm = {
      ...form,
      fields: updatedFields,
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
    setFieldToDelete(null);
  };

  const handleDuplicateField = (field: FormField) => {
    const newField = {
      ...field,
      id: crypto.randomUUID(),
      label: `${field.label}（副本）`,
      order: form.fields.length,
    };

    const updatedForm = {
      ...form,
      fields: [...form.fields, newField],
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
  };

  const handleMoveUp = (fieldId: string) => {
    const currentIndex = form.fields.findIndex((f) => f.id === fieldId);
    if (currentIndex <= 0) return;

    const newFields = [...form.fields];
    [newFields[currentIndex - 1], newFields[currentIndex]] = [
      newFields[currentIndex],
      newFields[currentIndex - 1],
    ];

    const reorderedFields = newFields.map((f, index) => ({ ...f, order: index }));

    const updatedForm = {
      ...form,
      fields: reorderedFields,
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
  };

  const handleMoveDown = (fieldId: string) => {
    const currentIndex = form.fields.findIndex((f) => f.id === fieldId);
    if (currentIndex >= form.fields.length - 1) return;

    const newFields = [...form.fields];
    [newFields[currentIndex + 1], newFields[currentIndex]] = [
      newFields[currentIndex],
      newFields[currentIndex + 1],
    ];

    const reorderedFields = newFields.map((f, index) => ({ ...f, order: index }));

    const updatedForm = {
      ...form,
      fields: reorderedFields,
    };

    setForm(updatedForm);
    updateForm(id, { fields: updatedForm.fields });
  };

  const handleToggleProgressBar = () => {
    const updatedForm = {
      ...form,
      settings: {
        ...form.settings,
        showProgressBar: !form.settings.showProgressBar,
      },
    };

    setForm(updatedForm);
    updateForm(id, { settings: updatedForm.settings });
  };

  const handleToggleSpamProtection = () => {
    const updatedForm = {
      ...form,
      settings: {
        ...form.settings,
        enableSpamProtection: !form.settings.enableSpamProtection,
      },
    };

    setForm(updatedForm);
    updateForm(id, { settings: updatedForm.settings });
  };

  return (
    <StoreErrorBoundary storeName="forms">
      <div className="flex flex-col h-screen bg-surface-light dark:bg-surface-dark">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/forms')}
              className="p-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-lg transition-colors"
              aria-label="返回表单"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSave}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-accent-primary rounded px-2 py-1"
                placeholder="表单标题"
              />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleSave}
                className="text-sm text-text-light-secondary dark:text-text-dark-secondary bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-accent-primary rounded px-2 py-1 block mt-1"
                placeholder="描述（可选）"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress Bar Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="checkbox"
                checked={form.settings.showProgressBar ?? false}
                onChange={handleToggleProgressBar}
                className="w-4 h-4 rounded accent-accent-blue dark:accent-accent-blue"
              />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                显示进度条
              </span>
            </label>

            {/* Spam Protection Toggle */}
            <label className="flex items-center gap-2 px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg cursor-pointer hover:opacity-80 transition-opacity">
              <input
                type="checkbox"
                checked={form.settings.enableSpamProtection ?? false}
                onChange={handleToggleSpamProtection}
                className="w-4 h-4 rounded accent-accent-blue dark:accent-accent-blue"
              />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                垃圾回复防护
              </span>
            </label>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                showPreview
                  ? 'bg-accent-blue dark:bg-accent-blue text-white'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
              }`}
            >
              <Eye className="w-4 h-4" />
              {showPreview ? '隐藏预览' : '显示预览'}
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Field List */}
          <div className="w-1/2 p-6 overflow-y-auto border-r border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
                字段
              </h2>
              <button
                onClick={() => setIsAddingField(true)}
                className="flex items-center gap-2 px-4 py-2 bg-accent-blue dark:bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover"
              >
                <Plus className="w-4 h-4" />
                添加字段
              </button>
            </div>

            <FieldList
              fields={form.fields}
              onEdit={setEditingField}
              onDelete={handleDeleteField}
              onDuplicate={handleDuplicateField}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
            />
          </div>

          {/* Right Panel - Preview */}
          <div className="w-1/2 p-6 overflow-y-auto bg-surface-light dark:bg-surface-dark">
            {showPreview ? (
              <>
                <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
                  预览
                </h2>
                <div className="max-w-2xl mx-auto bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-text-light-primary dark:text-text-dark-primary mb-2">
                    {title || '未命名表单'}
                  </h3>
                  {description && (
                    <p className="text-text-light-secondary dark:text-text-dark-secondary mb-6">
                      {description}
                    </p>
                  )}
                  <div className="space-y-4">
                    {form.fields.length === 0 ? (
                      <p className="text-center text-text-light-tertiary dark:text-text-dark-tertiary py-8">
                        还没有字段。添加字段后即可在此预览。
                      </p>
                    ) : (
                      form.fields
                        .sort((a, b) => a.order - b.order)
                        .map((field) => <FieldPreview key={field.id} field={field} />)
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-text-light-tertiary dark:text-text-dark-tertiary">
                  点击“显示预览”查看表单效果
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Field Editor Modal */}
      {(isAddingField || editingField) && (
        <FieldEditor
          field={editingField}
          allFields={form.fields}
          form={form}
          onSave={editingField ? handleEditField : handleAddField}
          onCancel={() => {
            setIsAddingField(false);
            setEditingField(null);
          }}
        />
      )}

      <ConfirmDialog
        isOpen={fieldToDelete !== null}
        onClose={() => setFieldToDelete(null)}
        onConfirm={confirmDeleteField}
        title="删除字段"
        message="确定删除此字段？"
        confirmText="删除"
        variant="danger"
      />
    </StoreErrorBoundary>
  );
}

// Simple field preview component
function FieldPreview({ field }: { field: FormField }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
        {field.label}
        {field.required && <span className="text-accent-red ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-2">
          {field.description}
        </p>
      )}
      <div className="px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary">
        {field.type === 'textarea'
          ? '文本区域输入…'
          : field.type === 'select' || field.type === 'radio' || field.type === 'multiselect'
          ? `${field.options?.join(', ') || '无选项'}`
          : field.type === 'checkbox'
          ? '☐ 复选框'
          : field.type === 'rating'
          ? '★★★★★'
          : field.type === 'scale'
          ? '1 2 3 4 5 6 7 8 9 10'
          : `${field.type} 输入…`}
      </div>
    </div>
  );
}
