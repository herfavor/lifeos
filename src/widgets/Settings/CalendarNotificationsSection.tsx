import React from 'react';

interface CalendarNotificationsSectionProps {
  notificationPermission: NotificationPermission;
  requestingPermission: boolean;
  onRequestPermission: () => void;
}

/**
 * Calendar Notifications Section
 * Displays notification permission status and provides enable button.
 */
export const CalendarNotificationsSection: React.FC<CalendarNotificationsSectionProps> = ({
  notificationPermission,
  requestingPermission,
  onRequestPermission,
}) => {
  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        🔔 日历通知
      </h2>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        为事件提醒启用浏览器通知。
      </p>

      <div className="mb-4 p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              通知状态
            </p>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
              {notificationPermission === 'granted' && '✅ 通知已启用'}
              {notificationPermission === 'denied' && '❌ 通知已被阻止'}
              {notificationPermission === 'default' && '⏸️ 尚未请求'}
            </p>
          </div>
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            notificationPermission === 'granted'
              ? 'bg-status-success/10 text-status-success'
              : notificationPermission === 'denied'
              ? 'bg-status-error/10 text-status-error'
              : 'bg-status-warning/10 text-status-warning'
          }`}>
            {notificationPermission === 'granted' ? '已启用' : notificationPermission === 'denied' ? '已阻止' : '未设置'}
          </span>
        </div>
      </div>

      {notificationPermission !== 'granted' && (
        <button
          onClick={onRequestPermission}
          disabled={requestingPermission || notificationPermission === 'denied'}
          className="w-full px-4 py-3 bg-accent-primary hover:bg-accent-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200"
        >
          {requestingPermission ? '⏳ 正在请求...' : '🔔 启用通知'}
        </button>
      )}
    </div>
  );
};
