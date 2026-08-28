import { Trash2, FolderOpen, X } from 'lucide-react';
import { useState } from 'react';
import { ProjectSelector } from './ProjectSelector';
import { ConfirmDialog } from './ConfirmDialog';
import { toast } from '../stores/useToastStore';

interface BulkActionsBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => Promise<void>;
  onBulkChangeProject: (projectId: string | null) => Promise<void>;
}

/**
 * BulkActionsBar Component
 * Action bar that appears when entries are selected for bulk operations
 */
export function BulkActionsBar({
  selectedCount,
  onClearSelection,
  onBulkDelete,
  onBulkChangeProject
}: BulkActionsBarProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsProcessing(true);
    try {
      await onBulkDelete();
    } catch (error) {
      console.error('Bulk delete failed:', error);
      toast.error('删除条目失败', '请重试。');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeProject = async (projectId: string | null) => {
    setIsProcessing(true);
    try {
      await onBulkChangeProject(projectId);
      setShowProjectSelector(false);
    } catch (error) {
      console.error('Bulk project change failed:', error);
      toast.error('更改项目失败', '请重试。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-accent-primary/10 border border-accent-primary/30 rounded-button p-4 mb-4">
      <div className="flex items-center justify-between gap-4">
        {/* Selection Info */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
            已选择 {selectedCount} 个条目
          </span>
          <button
            onClick={onClearSelection}
            disabled={isProcessing}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-all duration-standard ease-smooth disabled:opacity-50"
          >
            <X className="w-3 h-3" />
            清除
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Change Project */}
          {showProjectSelector ? (
            <div className="flex items-center gap-2">
              <div className="w-48">
                <ProjectSelector
                  value={null}
                  onChange={handleChangeProject}
                  placeholder="选择项目…"
                  showNoProject={true}
                />
              </div>
              <button
                onClick={() => setShowProjectSelector(false)}
                disabled={isProcessing}
                className="px-3 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary border border-border-light dark:border-border-dark rounded-button transition-all duration-standard ease-smooth disabled:opacity-50"
              >
                取消
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowProjectSelector(true)}
              disabled={isProcessing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-text-light-primary dark:text-text-dark-primary bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-button hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4" />
              更改项目
            </button>
          )}

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={isProcessing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-status-error rounded-button hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            删除所选
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="删除条目"
        message={`确定要删除 ${selectedCount} 个条目吗？`}
        confirmText="删除"
        variant="danger"
      />
    </div>
  );
}
