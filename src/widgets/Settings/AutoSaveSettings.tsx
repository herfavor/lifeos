/**
 * Auto-Save Settings Component
 *
 * Configures auto-save to local file system:
 * - Directory selection (File System Access API)
 * - Filename customization
 * - Version count
 * - Manual save trigger
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Check, CheckCircle2, FolderOpen, Save } from 'lucide-react';
import {
  isFileSystemAccessSupported,
  requestAutoSaveDirectory,
  autoSave,
  getDirectoryHandle,
  formatFileSize,
} from '../../services/brainBackup';
import {
  loadPreferences,
  savePreferences,
  addHistoryEntry,
  type BackupPreferences,
} from '../../services/backupPreferences';
import { autoSaveManager } from '../../services/autoSave';
import { logger } from '../../services/logger';

const log = logger.module('AutoSaveSettings');

interface AutoSaveSettingsProps {
  onMessage: (message: { type: 'success' | 'error' | 'info' | 'warning'; text: string } | null) => void;
  onRefresh: () => void;
}

export const AutoSaveSettings: React.FC<AutoSaveSettingsProps> = ({
  onMessage,
  onRefresh,
}) => {
  const [preferences, setPreferences] = useState<BackupPreferences | null>(null);
  const [autoSaveDirectory, setAutoSaveDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [customFilename, setCustomFilename] = useState('');
  const [versionCount, setVersionCount] = useState(7);
  const [recentlySaved, setRecentlySaved] = useState<'autoSave' | null>(null);

  const loadData = useCallback(async () => {
    const prefs = await loadPreferences();
    setPreferences(prefs);

    // Initialize customization state
    const filename = prefs.customFilename || 'LifeOS';
    const nameWithoutExt = filename.replace(/\.brain$/i, '');
    setCustomFilename(nameWithoutExt);
    setVersionCount(prefs.versionCount || 7);

    // Restore saved directory handle
    if (prefs.autoSaveEnabled) {
      try {
        const savedHandle = await getDirectoryHandle();
        if (savedHandle) {
          setAutoSaveDirectory(savedHandle);
        }
      } catch (error) {
        log.warn('Could not restore auto-save directory handle', { error });
      }
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Restore directory handle on mount
  useEffect(() => {
    const restoreDirectoryHandle = async () => {
      try {
        const savedHandle = await getDirectoryHandle();
        if (savedHandle) {
          setAutoSaveDirectory(savedHandle);
        }
      } catch (error) {
        console.error('Failed to restore directory handle:', error);
      }
    };
    restoreDirectoryHandle();
  }, []);

  const handleSetupAutoSave = async () => {
    try {
      const dirHandle = await requestAutoSaveDirectory();
      setAutoSaveDirectory(dirHandle);

      // Enable auto-save with directory handle
      await autoSaveManager.enableLocal(dirHandle);

      await loadData();
      onRefresh();
      onMessage({ type: 'success', text: '已启用自动保存！你的数据将自动保存到所选文件夹。' });
    } catch (error) {
      onMessage({ type: 'error', text: `${error}` });
    }
  };

  const handleAutoSaveNow = async () => {
    if (!autoSaveDirectory) {
      onMessage({ type: 'error', text: '请先配置自动保存目录' });
      return;
    }

    try {
      onMessage({ type: 'info', text: '正在保存...' });
      const result = await autoSave(autoSaveDirectory);

      await addHistoryEntry({
        filename: result.filename,
        size: result.size,
        compressed: result.compressed,
        type: 'auto',
        destination: 'local',
        status: 'success',
      });

      await loadData();
      onRefresh();
      onMessage({ type: 'success', text: `已自动保存：${result.filename}（${formatFileSize(result.size)}）` });
    } catch (error) {
      onMessage({ type: 'error', text: `自动保存失败：${error}` });
    }
  };

  const toggleAutoSave = async () => {
    if (!preferences) return;

    if (preferences.autoSaveEnabled) {
      // Disable auto-save
      await autoSaveManager.disableLocal();
      setAutoSaveDirectory(null);
      await loadData();
      onRefresh();
      onMessage({ type: 'info', text: '已禁用自动保存' });

      setRecentlySaved('autoSave');
      setTimeout(() => setRecentlySaved(null), 2000);
    } else {
      // Enable auto-save - request directory
      await handleSetupAutoSave();
    }
  };

  const persistCustomization = async () => {
    if (!preferences) return;

    if (!customFilename.trim()) {
      onMessage({ type: 'error', text: '文件名不能为空' });
      return;
    }

    if (versionCount < 1 || versionCount > 100) {
      onMessage({ type: 'error', text: '版本数量必须在 1 到 100 之间' });
      return;
    }

    try {
      const filenameWithExtension = `${customFilename.trim()}.brain`;

      await savePreferences({
        customFilename: filenameWithExtension,
        versionCount: versionCount,
      });

      await loadData();
      onRefresh();
      onMessage({ type: 'success', text: '自动保存偏好已更新。' });
    } catch (error) {
      onMessage({ type: 'error', text: `保存偏好失败：${error}` });
    }
  };

  if (!preferences) {
    return null;
  }

  return (
    <>
      {/* Simple Auto-Save Card (for File System Access API browsers) */}
      {isFileSystemAccessSupported() && (
        <div className="bento-card p-6">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
            自动保存
          </h2>
          <p className="text-text-light-secondary dark:text-text-dark-secondary mb-4">
            自动将备份保存到你电脑上的文件夹中
          </p>

          {!autoSaveDirectory ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSetupAutoSave}
              className="w-full p-4 rounded-lg bg-surface-dark dark:bg-surface-dark-elevated text-white hover:bg-border-dark dark:hover:bg-border-dark transition-colors"
            >
              <span className="flex items-center justify-center gap-2"><FolderOpen className="h-5 w-5" />选择自动保存文件夹</span>
            </motion.button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-accent-green">
                <CheckCircle2 className="h-4 w-4" />
                <span>已配置自动保存文件夹</span>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAutoSaveNow}
                className="w-full p-4 rounded-lg bg-accent-green text-white hover:bg-accent-green-hover transition-colors"
              >
                <span className="flex items-center justify-center gap-2"><Save className="h-4 w-4" />立即保存</span>
              </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Detailed Auto-Save Configuration */}
      <div className="bento-card p-6">
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary mb-4">
          自动保存到文件
        </h2>

        {!isFileSystemAccessSupported() ? (
          <div className="flex gap-3 p-4 bg-status-warning-bg dark:bg-status-warning-bg-dark border border-status-warning-border dark:border-status-warning-border-dark border-l-4 border-l-status-warning rounded-lg">
            <AlertTriangle className="h-5 w-5 shrink-0 text-status-warning" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-status-warning-text dark:text-status-warning-text-dark">
                不支持 {navigator.userAgent.includes('Firefox') ? 'Firefox' : navigator.userAgent.includes('Safari') ? 'Safari' : '此浏览器'}
              </p>
              <p className="text-sm text-status-warning-text dark:text-status-warning-text-dark mt-1">
                自动保存到文件需要使用基于 Chromium 的浏览器（Chrome、Edge、Brave、Arc、Opera 等）。
                你的数据仍会自动保存到 IndexedDB，你也可以随时手动导出备份。
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <label className="flex items-center justify-between p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg cursor-pointer hover:bg-border-light dark:hover:bg-border-dark transition-colors">
              <div>
                <p className="font-medium text-text-light-primary dark:text-text-dark-primary">启用自动保存</p>
                <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                  {preferences.autoSaveEnabled
                    ? '你的数据会自动保存到所选文件夹'
                    : '自动将你的数据保存到本地文件'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {recentlySaved === 'autoSave' && (
                  <span className="text-sm font-medium text-accent-green animate-fade-in">
                    <Check className="h-3.5 w-3.5" aria-hidden /> 已保存
                  </span>
                )}
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.autoSaveEnabled}
                  aria-label="启用自动保存"
                  onClick={toggleAutoSave}
                  className={`relative h-6 w-11 rounded-full transition-colors ${preferences.autoSaveEnabled ? 'bg-accent-primary' : 'bg-surface-light dark:bg-surface-dark'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${preferences.autoSaveEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </label>

            {/* Auto-Save Status */}
            {preferences.autoSaveEnabled && (
              <div className="p-4 bg-status-success-bg dark:bg-status-success-bg-dark border border-status-success-border dark:border-status-success-border-dark rounded-lg">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-status-success mt-0.5" aria-hidden />
                  <div className="flex-1">
                    <p className="font-semibold text-status-success-text dark:text-status-success-text-dark mb-1">
                      已启用自动保存
                    </p>
                    <p className="text-sm text-status-success-text dark:text-status-success-text-dark">
                      每当发生更改时，你的数据都会自动备份到你选择的文件夹。
                      {preferences.lastAutoSave && (
                        <>
                          <br />
                          <strong>上次自动保存：</strong> {new Date(preferences.lastAutoSave).toLocaleString()}
                        </>
                      )}
                    </p>
                    {preferences.customFilename && (
                      <p className="text-sm text-status-success-text dark:text-status-success-text-dark mt-2">
                        <strong>文件名：</strong> {preferences.customFilename}
                        <br />
                        <strong>保留版本数：</strong> {preferences.versionCount || 7}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Customization Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                自定义自动保存
              </h3>

              {/* Filename Input */}
              <div>
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  备份文件名
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customFilename}
                    onChange={(e) => setCustomFilename(e.target.value)}
                    onBlur={() => { void persistCustomization(); }}
                    placeholder="我的备份"
                    className="flex-1 px-4 py-2 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                  />
                </div>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  输入名称（例如："LifeOS"、"我的备份"）。更改会在离开输入框后立即保存。
                </p>
              </div>

              {/* Version Count Input */}
              <div>
                <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                  保留版本数
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={versionCount}
                  onChange={(e) => setVersionCount(parseInt(e.target.value) || 7)}
                  onBlur={() => { void persistCustomization(); }}
                  className="w-full px-4 py-2 bg-surface-light dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-primary focus:border-transparent transition-all"
                />
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                  保留在 LifeOS 备份文件夹中的带时间戳备份数量（1-100）。更改会立即保存。
                </p>
              </div>
            </div>

            {/* Manual Save Now Button */}
            {preferences.autoSaveEnabled && (
              <button
                onClick={handleAutoSaveNow}
                className="w-full px-4 py-3 bg-accent-secondary hover:bg-accent-secondary-hover text-white rounded-lg font-medium shadow-soft hover:shadow-medium transition-all duration-200"
              >
                <span className="flex items-center justify-center gap-2"><Save className="h-4 w-4" />立即创建备份</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
