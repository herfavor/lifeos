import { useState } from 'react';
import { Activity, Check, Clock, Info } from 'lucide-react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';

/**
 * Automatic Tracking Settings Component
 *
 * UI for configuring automatic time tracking behavior.
 */

export function AutoTrackingSettings() {
  const autoTrackingSettings = useSettingsStore((s) => s.autoTrackingSettings);
  const setAutoTrackingSettings = useSettingsStore((s) => s.setAutoTrackingSettings);
  const setAutomaticTracking = useTimeTrackingStore((s) => s.setAutomaticTracking);
  const setAutoStartThreshold = useTimeTrackingStore((s) => s.setAutoStartThreshold);

  const [enabled, setEnabled] = useState(autoTrackingSettings.enabled);
  const [threshold, setThreshold] = useState(autoTrackingSettings.autoStartThreshold);
  const [stopOnIdle, setStopOnIdle] = useState(autoTrackingSettings.autoStopOnIdle);

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    setAutoTrackingSettings({ enabled: value });
    setAutomaticTracking(value);
  };

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    setAutoTrackingSettings({ autoStartThreshold: value });
    setAutoStartThreshold(value);
  };

  const handleStopOnIdleChange = (value: boolean) => {
    setStopOnIdle(value);
    setAutoTrackingSettings({ autoStopOnIdle: value });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="w-6 h-6 text-accent-primary" />
        <div>
          <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
            自动时间记录
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            根据您的活动自动记录时间
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex gap-3 p-4 bg-accent-blue/10 border border-accent-blue/20 rounded-lg">
        <Info className="w-5 h-5 text-accent-blue dark:text-accent-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
          <p className="font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
            工作原理
          </p>
          <p>
            启用后，LifeOS 将在以下情况自动开始记录时间：
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 ml-2">
            <li>在某个页面停留超过阈值时长</li>
            <li>专注于某个任务或笔记</li>
            <li>持续工作而不进入空闲状态</li>
          </ul>
          <p className="mt-2">
            记录会带有「自动」标签，方便您识别。
          </p>
        </div>
      </div>

      {/* Settings */}
      <div className="space-y-4">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <div>
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
              启用自动记录
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              工作时自动开始记录时间
            </p>
          </div>
          <button
            onClick={() => handleEnabledChange(!enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              enabled
                ? 'bg-accent-primary'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Auto-Start Threshold */}
        <div className="p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
              <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
                自动开始阈值
              </p>
            </div>
            <span className="text-sm font-mono text-accent-primary">
              {threshold}s
            </span>
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-3">
            在同一环境停留多久后自动开始计时
          </p>
          <input
            type="range"
            min="10"
            max="120"
            step="5"
            value={threshold}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            disabled={!enabled}
            className="w-full h-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg appearance-none cursor-pointer accent-accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
            <span>10 秒（立即）</span>
            <span>60 秒（均衡）</span>
            <span>120 秒（耐心）</span>
          </div>
        </div>

        {/* Auto-Stop on Idle */}
        <div className="flex items-center justify-between p-4 bg-surface-light-secondary/50 dark:bg-surface-dark-secondary/50 rounded-lg border border-border-light dark:border-border-dark">
          <div>
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">
              空闲时停止
            </p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              进入空闲状态时自动停止记录
            </p>
          </div>
          <button
            onClick={() => handleStopOnIdleChange(!stopOnIdle)}
            disabled={!enabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              stopOnIdle
                ? 'bg-accent-primary'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                stopOnIdle ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Preview */}
      {enabled && (
        <div className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
          <p className="flex items-center gap-1.5 text-sm font-medium text-accent-green dark:text-accent-green mb-2">
            <Check className="h-4 w-4" aria-hidden />
            自动记录已启用
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            在页面或任务上停留 {threshold} 秒后将自动开始记录。
            {stopOnIdle && ' 空闲时计时器将自动停止。'}
          </p>
        </div>
      )}
    </div>
  );
}
