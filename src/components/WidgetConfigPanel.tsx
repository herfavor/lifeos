/**
 * Widget Configuration Panels
 *
 * Renders widget-specific settings forms based on widget ID.
 * Used inside WidgetSettingsModal for per-widget configuration.
 */

import React from 'react';
import { useWidgetStore, type WidgetSettings } from '../stores/useWidgetStore';

interface WidgetConfigPanelProps {
  widgetId: string;
}

/** Refresh interval options shared across refreshable widgets */
const REFRESH_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '仅手动', value: 0 },
  { label: '1 分钟', value: 1 },
  { label: '5 分钟', value: 5 },
  { label: '15 分钟', value: 15 },
  { label: '30 分钟', value: 30 },
  { label: '1 小时', value: 60 },
];

/** Reusable select for refresh interval */
const RefreshIntervalSelect: React.FC<{
  value: number;
  onChange: (value: number) => void;
}> = ({ value, onChange }) => (
  <div>
    <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
      自动刷新间隔
    </label>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full px-3 py-2 text-sm rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-standard ease-smooth"
    >
      {REFRESH_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

/** Reusable text input field */
const SettingsInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}> = ({ label, value, onChange, placeholder, hint }) => (
  <div>
    <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-standard ease-smooth"
    />
    {hint && (
      <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-1">
        {hint}
      </p>
    )}
  </div>
);

/** Reusable number input field */
const SettingsNumber: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}> = ({ label, value, onChange, min = 1, max = 50, hint }) => (
  <div>
    <label className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5">
      {label}
    </label>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="w-full px-3 py-2 text-sm rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue focus:border-transparent transition-all duration-standard ease-smooth"
    />
    {hint && (
      <p className="text-[10px] text-text-light-secondary dark:text-text-dark-secondary mt-1">
        {hint}
      </p>
    )}
  </div>
);

/** Configuration panels for each widget type */
const WIDGET_CONFIGS: Record<string, React.FC<{
  settings: WidgetSettings;
  update: (patch: Partial<WidgetSettings>) => void;
}>> = {
  hackernews: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 15}
        onChange={(v) => update({ refreshRate: v })}
      />
      <SettingsNumber
        label="显示故事数"
        value={settings.maxItems ?? 5}
        onChange={(v) => update({ maxItems: v })}
        min={3}
        max={15}
        hint="显示的热门故事数量"
      />
    </div>
  ),

  crypto: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 1}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  reddit: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="Subreddit"
        value={settings.subreddit ?? 'programming'}
        onChange={(v) => update({ subreddit: v })}
        placeholder="programming"
        hint="不带 r/ 的 Subreddit 名称"
      />
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 15}
        onChange={(v) => update({ refreshRate: v })}
      />
      <SettingsNumber
        label="显示帖子数"
        value={settings.maxItems ?? 5}
        onChange={(v) => update({ maxItems: v })}
        min={3}
        max={15}
      />
    </div>
  ),

  github: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="GitHub 用户名"
        value={settings.username ?? ''}
        onChange={(v) => update({ username: v })}
        placeholder="octocat"
      />
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  quote: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  unsplash: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="图片分类"
        value={settings.category ?? 'nature'}
        onChange={(v) => update({ category: v })}
        placeholder="nature, architecture, travel..."
      />
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  pomodoro: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsNumber
        label="专注时长（分钟）"
        value={settings.duration ?? 25}
        onChange={(v) => update({ duration: v })}
        min={5}
        max={90}
        hint="常规：25 分钟（番茄钟）或 50 分钟（深度工作）"
      />
    </div>
  ),

  devto: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 30}
        onChange={(v) => update({ refreshRate: v })}
      />
      <SettingsNumber
        label="显示文章数"
        value={settings.maxItems ?? 5}
        onChange={(v) => update({ maxItems: v })}
        min={3}
        max={15}
      />
    </div>
  ),

  worldclock: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="时区"
        value={(settings.timezones ?? []).join(', ')}
        onChange={(v) => update({ timezones: v.split(',').map((s) => s.trim()).filter(Boolean) })}
        placeholder="America/New_York, Europe/London, Asia/Tokyo"
        hint="用逗号分隔的时区标识符"
      />
    </div>
  ),

  currency: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="基础货币"
        value={settings.baseCurrency ?? 'USD'}
        onChange={(v) => update({ baseCurrency: v.toUpperCase() })}
        placeholder="USD"
      />
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  weathermap: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  stockmarket: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),

  ainews: ({ settings, update }) => (
    <div className="space-y-3">
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
      <SettingsNumber
        label="显示论文数"
        value={settings.maxItems ?? 5}
        onChange={(v) => update({ maxItems: v })}
        min={3}
        max={10}
      />
    </div>
  ),

  packagestats: ({ settings, update }) => (
    <div className="space-y-3">
      <SettingsInput
        label="NPM 包"
        value={(settings.packageNames ?? []).join(', ')}
        onChange={(v) => update({ packageNames: v.split(',').map((s) => s.trim()).filter(Boolean) })}
        placeholder="react, vue, svelte"
        hint="用逗号分隔的包名"
      />
      <RefreshIntervalSelect
        value={settings.refreshRate ?? 60}
        onChange={(v) => update({ refreshRate: v })}
      />
    </div>
  ),
};

/** Widgets that support refresh interval but have no other settings */
const REFRESH_ONLY_WIDGETS = new Set([
  'facts', 'joke', 'wikipedia', 'bored', 'wordofday',
  'ipinfo', 'airquality', 'githubtrending', 'awesomelists', 'sports',
]);

export const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({ widgetId }) => {
  // Strip instance suffix for multi-instance widgets (e.g., "github-1" -> "github")
  const baseType = widgetId.replace(/-\d+$/, '');

  const settings = useWidgetStore((state) => state.getWidgetSettings(widgetId));
  const updateSettings = useWidgetStore((state) => state.updateWidgetSettings);

  const handleUpdate = (patch: Partial<WidgetSettings>) => {
    updateSettings(widgetId, patch);
  };

  // Check for dedicated config panel
  const ConfigComponent = WIDGET_CONFIGS[baseType];
  if (ConfigComponent) {
    return <ConfigComponent settings={settings} update={handleUpdate} />;
  }

  // Fallback: refresh-only widgets
  if (REFRESH_ONLY_WIDGETS.has(baseType)) {
    return (
      <div className="space-y-3">
        <RefreshIntervalSelect
          value={settings.refreshRate ?? 60}
          onChange={(v) => handleUpdate({ refreshRate: v })}
        />
      </div>
    );
  }

  // Widgets with no configurable settings
  return (
    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
      此组件没有其他设置。
    </p>
  );
};
