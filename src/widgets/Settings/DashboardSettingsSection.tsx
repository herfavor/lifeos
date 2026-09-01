import React from 'react';
import { LayoutTemplate, Settings2 } from 'lucide-react';

interface DashboardSettingsSectionProps {
  onOpenPresetManager: () => void;
}

/**
 * Dashboard Settings Section
 * Provides buttons to customize dashboard widgets and manage presets.
 */
export const DashboardSettingsSection: React.FC<DashboardSettingsSectionProps> = ({
  onOpenPresetManager,
}) => {
  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        首页设置
      </h2>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
        自定义首页下方按需显示的扩展组件。
      </p>

      <button
        onClick={() => {
          window.location.href = '/#customize-widgets';
        }}
        className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
      >
        <Settings2 className="h-4 w-4" aria-hidden />
        <span>自定义首页组件</span>
      </button>

      <div className="mt-4">
        <button
          onClick={onOpenPresetManager}
          className="flex items-center gap-2 px-4 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-lg font-medium transition-colors"
        >
          <LayoutTemplate className="h-4 w-4" aria-hidden />
          <span>管理首页预设</span>
        </button>
      </div>
    </div>
  );
};
