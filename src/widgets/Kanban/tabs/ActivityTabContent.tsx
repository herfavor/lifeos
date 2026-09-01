import React from 'react';
import { ClipboardList } from 'lucide-react';
import type { ActivityLogEntry } from '../../../types';

interface ActivityTabContentProps {
  activityLog: ActivityLogEntry[] | undefined;
}

/**
 * Activity Tab Content
 * Displays the activity log timeline for a task.
 * Read-only view - no state management needed.
 */
export const ActivityTabContent: React.FC<ActivityTabContentProps> = ({
  activityLog,
}) => {
  if (!activityLog || activityLog.length === 0) {
    return (
      <div className="text-center py-2 text-text-light-secondary dark:text-text-dark-secondary text-xs">
        <ClipboardList className="h-3.5 w-3.5" aria-hidden /> 暂无动态
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[500px] overflow-y-auto">
      {activityLog
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map((entry) => (
          <div key={entry.id} className="flex gap-3 items-start">
            <div className="w-2 h-2 mt-2 rounded-full bg-accent-blue flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-text-light-primary dark:text-text-dark-primary">
                {entry.action === 'created' && '创建了任务'}
                {entry.action === 'updated' && entry.field && `更新了 ${entry.field}`}
                {entry.action === 'moved' && '移动到其他列'}
                {entry.action === 'commented' && '添加了评论'}
                {entry.action === 'checklist_updated' && '更新了清单'}
                {entry.oldValue && entry.newValue && (
                  <span className="text-text-light-secondary dark:text-text-dark-secondary">
                    {' '}从“{entry.oldValue}”改为“{entry.newValue}”
                  </span>
                )}
              </p>
              <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {new Date(entry.timestamp).toLocaleString()}
              </span>
            </div>
          </div>
        ))}
    </div>
  );
};
