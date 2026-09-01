/**
 * Backup History Section Component
 *
 * Displays list of past backups with status, size, and type information.
 */

import React from 'react';
import { formatFileSize } from '../../services/brainBackup';
import { AlertTriangle, Cloud, Package, RefreshCw } from 'lucide-react';
import type { BackupHistoryEntry } from '../../services/backupPreferences';

interface BackupHistorySectionProps {
  backupHistory: BackupHistoryEntry[];
}

export const BackupHistorySection: React.FC<BackupHistorySectionProps> = ({
  backupHistory,
}) => {
  return (
    <div className="bento-card p-6">
      <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
        备份历史
      </h2>

      {backupHistory.length === 0 ? (
        <p className="text-text-light-secondary dark:text-text-dark-secondary">暂无备份</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {backupHistory.map((entry) => {
            const statusClasses =
              entry.status === 'success'
                ? 'text-status-success-text dark:text-status-success-text-dark'
                : 'text-status-error-text dark:text-status-error-text-dark';
            const destinationLabel =
              entry.destination === 'google-drive'
                ? 'Google Drive'
                : entry.destination === 'local'
                  ? '本地文件夹'
                  : '下载';
            const attemptsLabel =
              entry.attempts && entry.attempts > 1
                ? `${entry.attempts} 次尝试`
                : entry.attempts === 1
                  ? '1 次尝试'
                  : undefined;
            const icon =
              entry.destination === 'google-drive' ? (
                <Cloud className="h-6 w-6" aria-hidden />
              ) : entry.type === 'auto' ? (
                <RefreshCw className="h-6 w-6" aria-hidden />
              ) : (
                <Package className="h-6 w-6" aria-hidden />
              );

            return (
              <div
                key={entry.id}
                className="p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <p className="font-medium text-text-light-primary dark:text-text-dark-primary">{entry.filename}</p>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {new Date(entry.timestamp).toLocaleString()} • {formatFileSize(entry.size)}
                    {entry.compressed && ' • 已压缩'} • {destinationLabel}
                  </p>
                  <p className={`text-sm ${statusClasses}`}>
                    {entry.status === 'success' ? '成功' : '失败'}
                    {attemptsLabel ? ` • ${attemptsLabel}` : ''}
                  </p>
                  {entry.errorMessage && (
                    <p className="text-sm text-status-error-text dark:text-status-error-text-dark">
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {entry.errorMessage}
                    </p>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-2xl">{icon}</span>
                  <span className={`text-xs font-semibold ${statusClasses}`}>
                    {entry.status === 'success' ? '成功' : '失败'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
