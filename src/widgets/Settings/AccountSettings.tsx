/**
 * Account Settings Component
 *
 * Local-only user profile settings.
 * Data is persisted locally in IndexedDB via useSettingsStore.
 */

import React from 'react';
import { User, Lock } from 'lucide-react';
import { useSettingsStore } from '../../stores/useSettingsStore';

export const AccountSettings: React.FC = () => {
  const displayName = useSettingsStore((s) => s.displayName);
  const setDisplayName = useSettingsStore((s) => s.setDisplayName);

  return (
    <div id="account" className="bento-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <User className="h-5 w-5 text-text-light-tertiary dark:text-text-dark-tertiary" />
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          个人资料（仅存本机）
        </h2>
      </div>

      <div className="space-y-4">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
            显示名称
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
            placeholder="输入你的姓名"
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-text-light-secondary dark:text-text-dark-secondary">
            用于个性化显示的名称（例如默认任务负责人）。
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="mt-4 p-3 bg-status-info-bg dark:bg-status-info-bg-dark border border-status-info-border dark:border-status-info-border-dark rounded-lg">
          <p className="text-xs text-status-info-text dark:text-status-info-text-dark">
            <strong><Lock className="h-3.5 w-3.5" aria-hidden /> 本地资料：</strong>显示名称只保存在当前设备，不用于登录、账户恢复或云端同步。
          </p>
        </div>
      </div>
    </div>
  );
};
