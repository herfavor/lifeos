/**
 * Backup Options Section Component
 *
 * Toggle options for backup behavior:
 * - Compression enable/disable
 * - Reminder enable/disable
 */

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import {
  savePreferences,
  type BackupPreferences,
} from '../../services/backupPreferences';

interface BackupOptionsSectionProps {
  preferences: BackupPreferences;
  onRefresh: () => void;
  onMessage: (message: { type: 'success' | 'error' | 'info' | 'warning'; text: string } | null) => void;
}

export const BackupOptionsSection: React.FC<BackupOptionsSectionProps> = ({
  preferences,
  onRefresh,
  onMessage,
}) => {
  const [recentlySaved, setRecentlySaved] = useState<'compression' | 'reminder' | null>(null);

  const toggleCompression = async () => {
    const newValue = !preferences.compressionEnabled;
    await savePreferences({ compressionEnabled: newValue });
    onRefresh();
    onMessage({ type: 'info', text: `压缩已${newValue ? '启用' : '禁用'}` });

    setRecentlySaved('compression');
    setTimeout(() => setRecentlySaved(null), 2000);
  };

  const toggleReminder = async () => {
    const newValue = !preferences.reminderEnabled;
    await savePreferences({ reminderEnabled: newValue });
    onRefresh();
    onMessage({ type: 'info', text: `备份提醒已${newValue ? '启用' : '禁用'}` });

    setRecentlySaved('reminder');
    setTimeout(() => setRecentlySaved(null), 2000);
  };

  return (
    <div className="bento-card p-6">
      <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        备份选项
      </h2>

      <div className="space-y-4">
        {/* Compression */}
        <label className="flex items-center justify-between p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg cursor-pointer hover:bg-border-light dark:hover:bg-border-dark transition-colors">
          <div>
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">启用压缩</p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              将文件大小减小约 70%（推荐）
            </p>
          </div>
          <div className="flex items-center gap-2">
            {recentlySaved === 'compression' && (
              <span className="text-sm font-medium text-status-success-text dark:text-status-success-text-dark animate-fade-in">
                <Check className="h-3.5 w-3.5" aria-hidden /> 已保存
              </span>
            )}
            <input
              type="checkbox"
              checked={preferences.compressionEnabled}
              onChange={toggleCompression}
              className="w-6 h-6 rounded"
            />
          </div>
        </label>

        {/* Reminders */}
        <label className="flex items-center justify-between p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg cursor-pointer hover:bg-border-light dark:hover:bg-border-dark transition-colors">
          <div>
            <p className="font-medium text-text-light-primary dark:text-text-dark-primary">备份提醒</p>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              每 {preferences.reminderDays} 天提醒我
            </p>
          </div>
          <div className="flex items-center gap-2">
            {recentlySaved === 'reminder' && (
              <span className="text-sm font-medium text-status-success-text dark:text-status-success-text-dark animate-fade-in">
                <Check className="h-3.5 w-3.5" aria-hidden /> 已保存
              </span>
            )}
            <input
              type="checkbox"
              checked={preferences.reminderEnabled}
              onChange={toggleReminder}
              className="w-6 h-6 rounded"
            />
          </div>
        </label>
      </div>
    </div>
  );
};
