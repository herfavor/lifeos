/**
 * Task Management Settings Component
 *
 * Settings for task behavior and dependencies:
 * - Auto-shift dependent tasks
 * - WIP (Work In Progress) limits enforcement
 */

import React from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';

export const TaskManagementSettings: React.FC = () => {
  // Task Management Settings
  const autoShiftDependentTasks = useSettingsStore((state) => state.autoShiftDependentTasks);
  const setAutoShiftDependentTasks = useSettingsStore((state) => state.setAutoShiftDependentTasks);
  const enforceWipLimits = useSettingsStore((state) => state.enforceWipLimits);
  const setEnforceWipLimits = useSettingsStore((state) => state.setEnforceWipLimits);

  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        任务管理
      </h2>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
        配置任务和依赖在项目中的行为。
      </p>

      <div className="space-y-4">
        {/* Auto-shift dependent tasks */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="auto-shift-tasks"
            checked={autoShiftDependentTasks}
            onChange={(e) => setAutoShiftDependentTasks(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-accent-primary focus:ring-2 focus:ring-accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="auto-shift-tasks"
              className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer"
            >
              日期更改时自动调整依赖任务
            </label>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              当你移动任务的日期时，依赖任务将根据其依赖类型（结束-开始、开始-开始等）自动调整。应用调整前会显示确认对话框。
            </p>
          </div>
        </div>

        {/* Enforce WIP Limits */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="enforce-wip-limits"
            checked={enforceWipLimits}
            onChange={(e) => setEnforceWipLimits(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-accent-primary focus:ring-2 focus:ring-accent-primary cursor-pointer"
          />
          <div className="flex-1">
            <label
              htmlFor="enforce-wip-limits"
              className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary cursor-pointer"
            >
              严格执行 WIP 限制（阻止移入已满的列）
            </label>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              启用后，你无法将任务拖入已达到 WIP（进行中工作）限制的列。禁用（默认）时，会显示警告但仍允许移动。可在看板的列设置中设置 WIP 限制。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
