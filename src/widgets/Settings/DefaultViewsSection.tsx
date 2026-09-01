/**
 * Default Views Settings Section
 *
 * Configure the default view for Tasks, Calendar, and Notes modules.
 */

import React from 'react';
import { Layout } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import type { DefaultViews } from '../../stores/useSettingsStore';

const TASK_VIEWS: { value: DefaultViews['tasks']; label: string }[] = [
  { value: 'board', label: '看板' },
  { value: 'list', label: '列表' },
  { value: 'eisenhower', label: '艾森豪威尔矩阵' },
  { value: 'gantt', label: '甘特图' },
];

const CALENDAR_VIEWS: { value: DefaultViews['calendar']; label: string }[] = [
  { value: 'month', label: '月' },
  { value: 'week', label: '周' },
  { value: 'day', label: '日' },
];

const NOTES_VIEWS: { value: DefaultViews['notes']; label: string }[] = [
  { value: 'list', label: '列表' },
  { value: 'grid', label: '网格' },
];

export const DefaultViewsSection: React.FC = () => {
  const defaultViews = useSettingsStore((s) => s.defaultViews);
  const setDefaultViews = useSettingsStore((s) => s.setDefaultViews);

  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <Layout className="w-5 h-5 text-accent-primary" />
        <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
          默认视图
        </h2>
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        设置打开各模块时的默认视图。
      </p>

      <div className="space-y-4">
        {/* Tasks Default View */}
        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            任务
          </label>
          <select
            value={defaultViews?.tasks ?? 'board'}
            onChange={(e) => setDefaultViews({ tasks: e.target.value as DefaultViews['tasks'] })}
            className="w-full sm:w-64 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {TASK_VIEWS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Calendar Default View */}
        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            日历
          </label>
          <select
            value={defaultViews?.calendar ?? 'month'}
            onChange={(e) => setDefaultViews({ calendar: e.target.value as DefaultViews['calendar'] })}
            className="w-full sm:w-64 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {CALENDAR_VIEWS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Notes Default View */}
        <div>
          <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
            笔记
          </label>
          <select
            value={defaultViews?.notes ?? 'list'}
            onChange={(e) => setDefaultViews({ notes: e.target.value as DefaultViews['notes'] })}
            className="w-full sm:w-64 px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {NOTES_VIEWS.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
