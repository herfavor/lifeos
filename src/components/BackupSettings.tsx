/**
 * BackupSettings Component
 *
 * Settings UI for backup configuration
 * - Enable/disable auto-save
 * - Configure save interval, versions, file name
 * - Test auto-save manually
 * - Change backup folder
 */

import { useState } from 'react';
import { useThemeStore } from '../stores/useThemeStore';
import { autoSaveManager } from '../services/autoSave';
import { requestAutoSaveDirectory } from '../services/brainBackup';

export function BackupSettings() {
  const backupPreferences = useThemeStore((state) => state.backupPreferences);
  const updateBackupPreferences = useThemeStore((state) => state.updateBackupPreferences);

  const [isSelecting, setIsSelecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /**
   * Handle folder selection
   */
  const handleSelectFolder = async () => {
    setIsSelecting(true);
    setTestMessage(null);

    try {
      const dirHandle = await requestAutoSaveDirectory();

      // Update preferences
      updateBackupPreferences({
        hasBackupFolder: true,
        backupFolderPath: dirHandle.name,
        autoSaveEnabled: true,
      });

      // Enable auto-save
      await autoSaveManager.enableLocal(dirHandle);

      setTestMessage({
        type: 'success',
        text: `已选择备份文件夹：${dirHandle.name}`,
      });
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // User cancelled - not an error
        setTestMessage({
          type: 'error',
          text: '已取消文件夹选择',
        });
      } else {
        setTestMessage({
          type: 'error',
          text: `错误：${(error as Error).message}`,
        });
      }
    } finally {
      setIsSelecting(false);
    }
  };

  /**
   * Handle toggle auto-save
   */
  const handleToggleAutoSave = async () => {
    if (backupPreferences.autoSaveEnabled) {
      await autoSaveManager.disableLocal();
      updateBackupPreferences({ autoSaveEnabled: false });
    } else {
      if (backupPreferences.hasBackupFolder) {
        // Re-enable with existing folder
        updateBackupPreferences({ autoSaveEnabled: true });
      } else {
        // Prompt to select folder
        await handleSelectFolder();
      }
    }
  };

  /**
   * Handle test auto-save
   */
  const handleTestSave = async () => {
    setIsTesting(true);
    setTestMessage(null);

    try {
      await autoSaveManager.saveNow();
      setTestMessage({
        type: 'success',
        text: '备份保存成功！',
      });
    } catch (error) {
      setTestMessage({
        type: 'error',
        text: `错误：${(error as Error).message}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  /**
   * Handle save interval change
   */
  const handleSaveIntervalChange = (value: number) => {
    updateBackupPreferences({ saveInterval: value * 1000 }); // Convert to ms
  };

  /**
   * Handle versions to keep change
   */
  const handleVersionsChange = (value: number) => {
    updateBackupPreferences({ versionsToKeep: value });
  };

  /**
   * Handle custom file name change
   * Strips any extension and stores just the base name, then appends .brain
   */
  const handleFileNameChange = (value: string) => {
    // Remove any .brain extension if user types it
    const baseName = value.replace(/\.brain$/i, '').trim();
    // Store with .brain extension
    updateBackupPreferences({ customFileName: baseName ? `${baseName}.brain` : 'LifeOS.brain' });
  };

  /**
   * Get display filename (without .brain extension)
   */
  const getDisplayFileName = () => {
    return (backupPreferences.customFileName || 'LifeOS.brain').replace(/\.brain$/i, '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          备份与同步
        </h2>
        <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1">
          自动将数据备份到云同步文件夹（iCloud、Google Drive、OneDrive、Proton Drive、Dropbox）
        </p>
      </div>

      {/* Current Status */}
      <div className="bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-button p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
              自动保存状态
            </span>
            {backupPreferences.autoSaveEnabled && (
              <span className="px-2 py-0.5 text-xs font-medium bg-accent-green/10 text-accent-green rounded-button">
                已启用
              </span>
            )}
            {!backupPreferences.autoSaveEnabled && (
              <span className="px-2 py-0.5 text-xs font-medium bg-accent-yellow/10 text-accent-yellow rounded-button">
                已禁用
              </span>
            )}
          </div>

          {/* Toggle */}
          <button
            onClick={handleToggleAutoSave}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-standard ease-smooth ${
              backupPreferences.autoSaveEnabled
                ? 'bg-accent-blue'
                : 'bg-border-light dark:bg-border-dark'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                backupPreferences.autoSaveEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Folder Path */}
        {backupPreferences.hasBackupFolder && (
          <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
            <span className="font-medium">文件夹： </span>
            {backupPreferences.backupFolderPath || '未设置'}
          </div>
        )}
      </div>

      {/* Folder Picker */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
          备份文件夹
        </label>
        <div className="flex gap-2">
          <button
            onClick={handleSelectFolder}
            disabled={isSelecting}
            className="px-4 py-2.5 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-button text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-standard ease-smooth"
          >
            {isSelecting ? '选择中…' : backupPreferences.hasBackupFolder ? '更改文件夹' : '选择文件夹'}
          </button>

          {backupPreferences.hasBackupFolder && (
            <button
              onClick={handleTestSave}
              disabled={isTesting || !backupPreferences.autoSaveEnabled}
              className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-surface-light dark:hover:bg-surface-dark text-text-light-primary dark:text-text-dark-primary rounded-button text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-standard ease-smooth border border-border-light dark:border-border-dark"
            >
              {isTesting ? '保存中…' : '测试自动保存'}
            </button>
          )}
        </div>

        {/* Test Message */}
        {testMessage && (
          <div
            className={`text-sm px-3 py-2 rounded-button ${
              testMessage.type === 'success'
                ? 'bg-accent-green/10 text-accent-green'
                : 'bg-accent-red/10 text-accent-red'
            }`}
          >
            {testMessage.text}
          </div>
        )}
      </div>

      {/* Configuration Options */}
      {backupPreferences.hasBackupFolder && (
        <div className="space-y-4 pt-4 border-t border-border-light dark:border-border-dark">
          <h3 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            配置
          </h3>

          {/* Save Interval */}
          <div className="space-y-2">
            <label className="block text-sm text-text-light-primary dark:text-text-dark-primary">
              保存间隔
              <span className="ml-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                （{backupPreferences.saveInterval / 1000} 秒）
              </span>
            </label>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={backupPreferences.saveInterval / 1000}
              onChange={(e) => handleSaveIntervalChange(Number(e.target.value))}
              className="w-full h-2 bg-border-light dark:bg-border-dark rounded-button appearance-none cursor-pointer accent-accent-blue"
            />
            <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
              <span>10 秒</span>
              <span>5 分钟</span>
            </div>
          </div>

          {/* Versions to Keep */}
          <div className="space-y-2">
            <label className="block text-sm text-text-light-primary dark:text-text-dark-primary">
              保留版本数
              <span className="ml-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                （{backupPreferences.versionsToKeep} 个备份）
              </span>
            </label>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={backupPreferences.versionsToKeep}
              onChange={(e) => handleVersionsChange(Number(e.target.value))}
              className="w-full h-2 bg-border-light dark:bg-border-dark rounded-button appearance-none cursor-pointer accent-accent-blue"
            />
            <div className="flex justify-between text-xs text-text-light-secondary dark:text-text-dark-secondary">
              <span>1</span>
              <span>30</span>
            </div>
          </div>

          {/* Custom File Name */}
          <div className="space-y-2">
            <label className="block text-sm text-text-light-primary dark:text-text-dark-primary">
              文件名
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={getDisplayFileName()}
                onChange={(e) => handleFileNameChange(e.target.value)}
                placeholder="MyBackup"
                className="flex-1 px-3 py-2 text-sm rounded-button bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-text-light-primary dark:text-text-dark-primary focus:ring-2 focus:ring-accent-blue"
              />
            </div>
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              LifeOS 备份文件将命名为：{getDisplayFileName()}-YYYY-MM-DD-HHmmss
            </p>
          </div>
        </div>
      )}

      {/* Documentation Link */}
      <div className="pt-4 border-t border-border-light dark:border-border-dark">
        <a
          href="/docs/backup-sync-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-accent-blue hover:underline"
        >
          📖 查看备份与同步文档 →
        </a>
      </div>
    </div>
  );
}
