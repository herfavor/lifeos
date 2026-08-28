/**
 * Time Tracking Settings Modal
 * Configure time tracking panel display preferences
 */

import { Modal } from './Modal';
import {
  useTimeTrackingPanelStore,
  type EntryDisplayDensity,
} from '../stores/useTimeTrackingPanelStore';
import { useSettingsStore, type TimeFormat } from '../stores/useSettingsStore';

interface TimeTrackingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TimeTrackingSettingsModal({
  isOpen,
  onClose,
}: TimeTrackingSettingsModalProps) {
  // Global time format from settings store (synced app-wide)
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const setTimeFormat = useSettingsStore((s) => s.setTimeFormat);

  // Panel-specific settings from time tracking panel store
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="时间记录设置"
      maxWidth="sm"
    >
      <div className="space-y-4">
        {/* Time Display Section */}
        <div>
          <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            时间显示
          </h4>
          <div className="space-y-3 pl-1">
            {/* Time Format (Global) */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  时间格式
                </label>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  全局设置
                </p>
              </div>
              <select
                value={timeFormat}
                onChange={(e) => setTimeFormat(e.target.value as TimeFormat)}
                className="px-2 py-1 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="12h">12 小时制（下午 1:30）</option>
                <option value="24h">24 小时制（13:30）</option>
              </select>
            </div>

            {/* Show Seconds */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                显示秒数
              </label>
              <button
                onClick={() => setShowSeconds(!showSeconds)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  showSeconds
                    ? 'bg-accent-primary'
                    : 'bg-border-light dark:bg-border-dark'
                }`}
                role="switch"
                aria-checked={showSeconds}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    showSeconds ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Panel Display Section */}
        <div className="pt-2 border-t border-border-light dark:border-border-dark">
          <h4 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            面板显示
          </h4>
          <div className="space-y-3 pl-1">
            {/* Entry Density */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                记录密度
              </label>
              <select
                value={entryDisplayDensity}
                onChange={(e) =>
                  setEntryDisplayDensity(e.target.value as EntryDisplayDensity)
                }
                className="px-2 py-1 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
              >
                <option value="compact">紧凑</option>
                <option value="normal">常规</option>
                <option value="comfortable">宽松</option>
              </select>
            </div>

            {/* Visible Entries */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                最大可见记录数
              </label>
              <select
                value={visibleEntries}
                onChange={(e) => setVisibleEntries(Number(e.target.value))}
                className="px-2 py-1 text-sm bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
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
              <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                显示今日总计
              </label>
              <button
                onClick={() => setShowMiniSummary(!showMiniSummary)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  showMiniSummary
                    ? 'bg-accent-primary'
                    : 'bg-border-light dark:bg-border-dark'
                }`}
                role="switch"
                aria-checked={showMiniSummary}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    showMiniSummary ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Auto-expand */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  新记录自动展开
                </label>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  手动调整大小后禁用
                </p>
              </div>
              <button
                onClick={() => setAutoExpandEnabled(!autoExpandEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  autoExpandEnabled
                    ? 'bg-accent-primary'
                    : 'bg-border-light dark:bg-border-dark'
                }`}
                role="switch"
                aria-checked={autoExpandEnabled}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    autoExpandEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
          <button
            onClick={handleResetToDefaults}
            className="px-3 py-1.5 text-sm text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary transition-colors"
          >
            恢复默认设置
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-accent-primary text-white rounded-button text-sm font-medium hover:opacity-90 transition-opacity"
          >
            完成
          </button>
        </div>
      </div>
    </Modal>
  );
}
