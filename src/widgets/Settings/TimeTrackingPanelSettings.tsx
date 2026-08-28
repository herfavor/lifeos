/**
 * Time Tracking Panel Settings
 *
 * Settings for the sidebar time tracking panel display preferences.
 * Syncs with TimeTrackingSettingsModal for consistency.
 */

import { Clock, Layout, Timer, RotateCcw } from 'lucide-react';
import {
  useTimeTrackingPanelStore,
  type EntryDisplayDensity,
} from '../../stores/useTimeTrackingPanelStore';
import { useSettingsStore } from '../../stores/useSettingsStore';

export function TimeTrackingPanelSettings() {
  // Global time format (synced app-wide)
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const setTimeFormat = useSettingsStore((s) => s.setTimeFormat);

  // Panel-specific settings
  const {
    showSeconds,
    entryDisplayDensity,
    visibleEntries,
    showMiniSummary,
    autoExpandEnabled,
    setShowSeconds,
    setEntryDisplayDensity,
    setVisibleEntries,
    setShowMiniSummary,
    setAutoExpandEnabled,
    setHasManuallyResized,
    resetToDefaults,
  } = useTimeTrackingPanelStore();

  const handleResetToDefaults = () => {
    resetToDefaults();
    setHasManuallyResized(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Timer className="w-6 h-6 text-accent-primary" />
        <div>
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            时间跟踪面板
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            配置侧边栏时间跟踪面板的显示
          </p>
        </div>
      </div>

      {/* Time Display Settings */}
      <div className="p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
          <h3 className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">
            时间显示
          </h3>
        </div>

        <div className="space-y-4">
          {/* Time Format (Global) */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                时间格式
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                全局设置（也影响顶栏时钟）
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFormat('12h')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  timeFormat === '12h'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-border-light dark:hover:bg-border-dark'
                }`}
              >
                12 小时制
              </button>
              <button
                onClick={() => setTimeFormat('24h')}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                  timeFormat === '24h'
                    ? 'bg-accent-primary text-white'
                    : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-border-light dark:hover:bg-border-dark'
                }`}
              >
                24 小时制
              </button>
            </div>
          </div>

          {/* Show Seconds */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                显示秒
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                在计时器和记录时间中显示秒
              </p>
            </div>
            <button
              onClick={() => setShowSeconds(!showSeconds)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                showSeconds
                  ? 'bg-accent-primary'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
              }`}
              role="switch"
              aria-checked={showSeconds}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-surface-light rounded-full transition-transform ${
                  showSeconds ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Panel Display Settings */}
      <div className="p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
        <div className="flex items-center gap-2 mb-4">
          <Layout className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
          <h3 className="text-base font-medium text-text-light-primary dark:text-text-dark-primary">
            面板显示
          </h3>
        </div>

        <div className="space-y-4">
          {/* Entry Density */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                记录密度
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                时间记录之间的间距
              </p>
            </div>
            <select
              value={entryDisplayDensity}
              onChange={(e) => setEntryDisplayDensity(e.target.value as EntryDisplayDensity)}
              className="px-3 py-1.5 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              <option value="compact">紧凑</option>
              <option value="normal">普通</option>
              <option value="comfortable">宽松</option>
            </select>
          </div>

          {/* Visible Entries */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                最大可见记录数
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                滚动前显示的记录数量
              </p>
            </div>
            <select
              value={visibleEntries}
              onChange={(e) => setVisibleEntries(Number(e.target.value))}
              className="px-3 py-1.5 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} 条记录
                </option>
              ))}
            </select>
          </div>

          {/* Show Mini Summary */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                显示今日总计
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                在面板底部显示每日总计
              </p>
            </div>
            <button
              onClick={() => setShowMiniSummary(!showMiniSummary)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                showMiniSummary
                  ? 'bg-accent-primary'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
              }`}
              role="switch"
              aria-checked={showMiniSummary}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-surface-light rounded-full transition-transform ${
                  showMiniSummary ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Auto-expand */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                新记录自动展开
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                添加记录时自动展开面板
              </p>
            </div>
            <button
              onClick={() => setAutoExpandEnabled(!autoExpandEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoExpandEnabled
                  ? 'bg-accent-primary'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
              }`}
              role="switch"
              aria-checked={autoExpandEnabled}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-surface-light rounded-full transition-transform ${
                  autoExpandEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Reset to Defaults */}
      <div className="flex justify-end">
        <button
          onClick={handleResetToDefaults}
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          将面板重置为默认
        </button>
      </div>
    </div>
  );
}
