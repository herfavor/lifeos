import type { Task } from '../types';

interface TaskShift {
  taskId: string;
  newStartDate: string | null;
  newDueDate: string | null;
  reason: string;
}

interface DependentShiftConfirmationProps {
  shifts: TaskShift[];
  tasks: Task[];
  onConfirm: () => void;
  onCancel: () => void;
  onDontAskAgain: () => void;
}

export function DependentShiftConfirmation({
  shifts,
  tasks,
  onConfirm,
  onCancel,
  onDontAskAgain,
}: DependentShiftConfirmationProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '未设置';
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border-light dark:border-border-dark">
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            顺延依赖任务？
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mt-2">
            移动此任务将影响 <strong>{shifts.length}</strong> 个依赖任务
          </p>
        </div>

        {/* Affected Tasks List */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {shifts.map((shift) => {
              const task = tasks.find(t => t.id === shift.taskId);
              if (!task) return null;

              const oldStart = formatDate(task.startDate);
              const newStart = formatDate(shift.newStartDate);
              const oldDue = formatDate(task.dueDate);
              const newDue = formatDate(shift.newDueDate);

              return (
                <div
                  key={shift.taskId}
                  className="bg-surface-light-elevated dark:bg-surface-dark rounded-lg p-4 border border-border-light dark:border-border-dark"
                >
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                    {task.title}
                  </div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary space-y-1">
                    {task.startDate !== shift.newStartDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">开始：</span>
                        <span className="line-through text-text-light-tertiary dark:text-text-dark-tertiary">{oldStart}</span>
                        <span className="text-accent-primary">→</span>
                        <span className="text-text-light-primary dark:text-text-dark-primary font-medium">{newStart}</span>
                      </div>
                    )}
                    {task.dueDate !== shift.newDueDate && (
                      <div className="flex items-center gap-2">
                        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">截止：</span>
                        <span className="line-through text-text-light-tertiary dark:text-text-dark-tertiary">{oldDue}</span>
                        <span className="text-accent-primary">→</span>
                        <span className="text-text-light-primary dark:text-text-dark-primary font-medium">{newDue}</span>
                      </div>
                    )}
                    <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-2 italic">
                      {shift.reason}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-border-light dark:border-border-dark flex items-center justify-between">
          <button
            onClick={onDontAskAgain}
            className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-secondary dark:text-text-dark-secondary transition-colors"
          >
            不再询问
          </button>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary hover:bg-surface-light-elevated dark:bg-surface-dark transition-colors"
            >
              取消
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary-hover transition-colors"
            >
              顺延所有任务
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
