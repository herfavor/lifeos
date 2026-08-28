import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKanbanStore } from '../../stores/useKanbanStore';

interface ArchivedViewProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * ArchivedView - Modal to view and manage archived tasks
 * Phase A: Quick Wins - Archive System
 */
export function ArchivedView({ isOpen, onClose }: ArchivedViewProps) {
  const { getArchivedTasks, restoreTask, deleteArchivedTask } = useKanbanStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const archivedTasks = getArchivedTasks();

  // Filter archived tasks by search query
  const filteredTasks = archivedTasks.filter((task) =>
    task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRestore = (taskId: string) => {
    restoreTask(taskId);
  };

  const handleDelete = (taskId: string) => {
    deleteArchivedTask(taskId);
    setDeleteConfirmId(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '未知日期';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-4xl max-h-[80vh] mx-4 bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-2xl border border-border-light dark:border-border-dark overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
            <div>
              <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
                已归档任务
              </h2>
              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
                {archivedTasks.length} 个已归档任务
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
              aria-label="关闭已归档视图"
            >
              <span className="text-2xl text-text-light-secondary dark:text-text-dark-secondary">×</span>
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4 border-b border-border-light dark:border-border-dark">
            <input
              type="text"
              placeholder="搜索已归档任务…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-surface-light-elevated dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-secondary dark:placeholder:text-text-dark-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            />
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-lg">
                  {searchQuery ? '未找到已归档任务' : '暂无已归档任务'}
                </p>
                <p className="text-text-light-secondary dark:text-text-dark-secondary text-sm mt-2">
                  {searchQuery ? '请尝试其他搜索词' : '已完成的任务将在 14 天后自动归档'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-surface-light-elevated dark:bg-surface-dark rounded-lg border border-border-light dark:border-border-dark"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-light-primary dark:text-text-dark-primary truncate">
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                          <span>已归档：{formatDate(task.archivedAt)}</span>
                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded ${
                                task.priority === 'high'
                                  ? 'bg-accent-red/10 dark:bg-accent-red/20 text-accent-red'
                                  : task.priority === 'medium'
                                  ? 'bg-accent-yellow/10 dark:bg-accent-yellow/20 text-accent-yellow'
                                  : 'bg-accent-blue/10 dark:bg-accent-blue/20 text-accent-blue'
                              }`}
                            >
                              {task.priority}
                            </span>
                          )}
                          {task.tags && task.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                              {task.tags.slice(0, 2).map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded bg-accent-blue/10 text-accent-blue"
                                >
                                  {tag}
                                </span>
                              ))}
                              {task.tags.length > 2 && (
                                <span className="text-text-light-secondary dark:text-text-dark-secondary">
                                  +{task.tags.length - 2}
                                </span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRestore(task.id)}
                          className="px-3 py-1.5 text-sm font-medium bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
                          aria-label={`恢复 ${task.title}`}
                        >
                          恢复
                        </button>
                        {deleteConfirmId === task.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="px-3 py-1.5 text-sm font-medium bg-accent-red text-white rounded-lg hover:bg-accent-red-hover transition-colors"
                            >
                              确认
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-3 py-1.5 text-sm font-medium bg-surface-light dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary rounded-lg border border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark transition-colors"
                            >
                              取消
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirmId(task.id)}
                            className="px-3 py-1.5 text-sm font-medium text-accent-red rounded-lg hover:bg-accent-red/10 dark:hover:bg-accent-red/20 transition-colors"
                            aria-label={`永久删除 ${task.title}`}
                          >
                            永久删除
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border-light dark:border-border-dark flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-surface-light-elevated dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary rounded-lg border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark-elevated transition-colors"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
