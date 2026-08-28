/**
 * Notification Preferences Settings Section
 *
 * Controls notification types, quiet hours, and sound preferences.
 */

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX, Moon } from 'lucide-react';
import { useNotificationStore } from '../../stores/useNotificationStore';

export const NotificationPreferencesSection: React.FC = () => {
  const store = useNotificationStore();
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) return;

    const permission = await Notification.requestPermission();
    setPermissionStatus(permission);

    if (permission === 'granted') {
      store.setEnabled(true);
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    if (enabled && permissionStatus !== 'granted') {
      handleEnableNotifications();
    } else {
      store.setEnabled(enabled);
    }
  };

  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <Bell className="w-5 h-5 text-accent-primary" />
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          通知偏好
        </h2>
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        控制你接收哪些通知以及何时接收。
      </p>

      {/* Master Toggle */}
      <div className="mb-6 p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {store.enabled ? (
              <Bell className="w-5 h-5 text-accent-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
            )}
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                启用通知
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {permissionStatus === 'denied'
                  ? '已被浏览器阻止。请在浏览器设置中启用。'
                  : permissionStatus === 'granted'
                  ? '允许浏览器通知'
                  : '尚未请求权限'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleToggleEnabled(!store.enabled)}
            disabled={permissionStatus === 'denied'}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              store.enabled
                ? 'bg-accent-primary'
                : 'bg-neutral-300 dark:bg-neutral-700'
            } ${permissionStatus === 'denied' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                store.enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notification Types */}
      <div className="space-y-3 mb-6">
        <h3 className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
          通知类型
        </h3>

        <ToggleRow
          label="习惯提醒"
          description="提醒你未完成的习惯"
          enabled={store.habitReminders}
          disabled={!store.enabled}
          onChange={store.setHabitReminders}
        />

        <ToggleRow
          label="任务到期提醒"
          description="任务即将到期时通知"
          enabled={store.taskDueReminders}
          disabled={!store.enabled}
          onChange={store.setTaskDueReminders}
        />

        <ToggleRow
          label="事件提醒"
          description="日历事件通知"
          enabled={store.eventReminders}
          disabled={!store.enabled}
          onChange={store.setEventReminders}
        />
      </div>

      {/* Quiet Hours */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Moon className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary" />
          <h3 className="text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary">
            免打扰时段
          </h3>
        </div>
        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mb-3">
          免打扰时段内不会发送任何通知。
        </p>
        <div className="flex items-center gap-3">
          <div>
            <label className="block text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
              开始
            </label>
            <input
              type="time"
              value={store.quietHoursStart}
              onChange={(e) => store.setQuietHoursStart(e.target.value)}
              disabled={!store.enabled}
              className="px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50"
            />
          </div>
          <span className="text-text-light-tertiary dark:text-text-dark-tertiary mt-5">至</span>
          <div>
            <label className="block text-xs text-text-light-secondary dark:text-text-dark-secondary mb-1">
              结束
            </label>
            <input
              type="time"
              value={store.quietHoursEnd}
              onChange={(e) => store.setQuietHoursEnd(e.target.value)}
              disabled={!store.enabled}
              className="px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-primary disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Sound */}
      <div>
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors">
          <div className="flex items-center gap-3">
            {store.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-accent-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            )}
            <div>
              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                通知声音
              </p>
              <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                收到通知时播放声音
              </p>
            </div>
          </div>
          <button
            onClick={() => store.setSoundEnabled(!store.soundEnabled)}
            disabled={!store.enabled}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              store.soundEnabled
                ? 'bg-accent-primary'
                : 'bg-neutral-300 dark:bg-neutral-700'
            } ${!store.enabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                store.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Toggle Row
// ---------------------------------------------------------------------------

interface ToggleRowProps {
  label: string;
  description: string;
  enabled: boolean;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, enabled, disabled, onChange }) => (
  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors">
    <div>
      <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
        {label}
      </p>
      <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
        {description}
      </p>
    </div>
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        enabled
          ? 'bg-accent-primary'
          : 'bg-neutral-300 dark:bg-neutral-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  </div>
);
