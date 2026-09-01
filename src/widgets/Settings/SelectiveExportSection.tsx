/**
 * Selective Export Section
 *
 * Allows exporting specific data modules rather than everything.
 * Users can pick which stores to include in the .brain file.
 */

import React, { useState, useCallback } from 'react';
import {
  Download,
  FileText,
  CheckSquare,
  Calendar,
  Clock,
  Settings,
  BarChart3,
  Palette,
  Package,
} from 'lucide-react';
import { indexedDBService } from '../../services/indexedDB';
import { formatFileSize } from '../../services/brainBackup';
import { BUILD_HASH, BUILD_TIMESTAMP } from '../../utils/buildInfo';
import { logger } from '../../services/logger';

const log = logger.module('SelectiveExport');

interface MessageState {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface SelectiveExportSectionProps {
  onMessage: (message: MessageState | null) => void;
}

interface ExportModule {
  key: string;
  label: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  checked: boolean;
}

const DEFAULT_MODULES: Omit<ExportModule, 'checked'>[] = [
  {
    key: 'notes-storage',
    label: '笔记',
    description: '所有笔记、文件夹和笔记元数据',
    icon: FileText,
  },
  {
    key: 'kanban-tasks',
    label: '任务',
    description: '任务、列、清单和评论',
    icon: CheckSquare,
  },
  {
    key: 'calendar-events',
    label: '日历',
    description: '事件、重复和提醒',
    icon: Calendar,
  },
  {
    key: 'time-tracking',
    label: '时间跟踪',
    description: '时间记录、项目和计时器',
    icon: Clock,
  },
  {
    key: 'habits-storage',
    label: '习惯',
    description: '习惯定义、完成记录和连续天数',
    icon: BarChart3,
  },
  {
    key: 'settings-storage',
    label: '设置',
    description: '应用偏好和配置',
    icon: Settings,
  },
  {
    key: 'theme-preferences',
    label: '主题',
    description: '主题和颜色模式偏好',
    icon: Palette,
  },
];

export const SelectiveExportSection: React.FC<SelectiveExportSectionProps> = ({
  onMessage,
}) => {
  const [modules, setModules] = useState<ExportModule[]>(
    DEFAULT_MODULES.map((m) => ({ ...m, checked: true }))
  );
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'brain' | 'json'>('brain');

  const toggleModule = useCallback((key: string) => {
    setModules((prev) =>
      prev.map((m) => (m.key === key ? { ...m, checked: !m.checked } : m))
    );
  }, []);

  const selectAll = useCallback(() => {
    setModules((prev) => prev.map((m) => ({ ...m, checked: true })));
  }, []);

  const selectNone = useCallback(() => {
    setModules((prev) => prev.map((m) => ({ ...m, checked: false })));
  }, []);

  const selectedCount = modules.filter((m) => m.checked).length;

  const handleExport = async () => {
    const selectedKeys = modules.filter((m) => m.checked).map((m) => m.key);
    if (selectedKeys.length === 0) {
      onMessage({ type: 'warning', text: '请至少选择一个要导出的模块。' });
      return;
    }

    try {
      setIsExporting(true);
      onMessage(null);

      // Get all data from IndexedDB
      const allData = await indexedDBService.getAllData();

      // Filter to selected modules only
      const filteredData: Record<string, unknown> = {};
      for (const key of selectedKeys) {
        if (allData[key]) {
          try {
            filteredData[key] = JSON.parse(allData[key]);
          } catch {
            filteredData[key] = allData[key];
          }
        }
      }

      // Also check localStorage for settings/theme stores
      for (const key of selectedKeys) {
        if (!filteredData[key]) {
          const lsValue = localStorage.getItem(key);
          if (lsValue) {
            try {
              filteredData[key] = JSON.parse(lsValue);
            } catch {
              filteredData[key] = lsValue;
            }
          }
        }
      }

      // Create export package
      const exportPackage = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appBuild: BUILD_HASH,
        appBuildTimestamp: BUILD_TIMESTAMP,
        exportType: 'selective',
        includedModules: selectedKeys,
        compressed: exportFormat === 'brain',
        data: filteredData,
      };

      const jsonString = exportFormat === 'json'
        ? JSON.stringify(exportPackage, null, 2)
        : JSON.stringify(exportPackage);

      let blob: Blob;
      let extension: string;

      if (exportFormat === 'brain') {
        // Compress with gzip
        const rawBlob = new Blob([jsonString]);
        const stream = rawBlob.stream();
        const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
        blob = await new Response(compressedStream).blob();
        extension = 'brain';
      } else {
        blob = new Blob([jsonString], { type: 'application/json' });
        extension = 'json';
      }

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const moduleLabel = selectedKeys.length === DEFAULT_MODULES.length
        ? 'full'
        : selectedKeys.length === 1
        ? selectedKeys[0].replace('-storage', '').replace('-', '')
        : `${selectedKeys.length}modules`;
      const filename = `LifeOS-${moduleLabel}-${timestamp}.${extension}`;

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onMessage({
        type: 'success',
        text: `已导出 ${selectedKeys.length} 个模块至 ${filename}（${formatFileSize(blob.size)}）`,
      });

      log.info('Selective export complete', { modules: selectedKeys, size: blob.size });
    } catch (error) {
      log.error('Selective export failed', { error });
      onMessage({ type: 'error', text: `导出失败：${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <Package className="w-5 h-5 text-accent-primary" />
        <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
          选择性导出
        </h2>
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        只导出特定模块而非全部内容。适用于部分备份或迁移个别部分。
      </p>

      {/* Select All / None */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={selectAll}
          className="text-xs text-accent-primary hover:underline"
        >
          全选
        </button>
        <span className="text-text-light-tertiary dark:text-text-dark-tertiary">|</span>
        <button
          onClick={selectNone}
          className="text-xs text-accent-primary hover:underline"
        >
          全不选
        </button>
        <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary ml-auto">
          已选择 {selectedCount}/{modules.length}
        </span>
      </div>

      {/* Module Checkboxes */}
      <div className="space-y-2 mb-6">
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <label
              key={mod.key}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                mod.checked
                  ? 'bg-accent-primary/5 border border-accent-primary/20'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated border border-transparent hover:border-border-light dark:hover:border-border-dark'
              }`}
            >
              <input
                type="checkbox"
                checked={mod.checked}
                onChange={() => toggleModule(mod.key)}
                className="w-4 h-4 rounded border-border-light dark:border-border-dark text-accent-primary focus:ring-accent-primary"
              />
              <Icon className={`w-4 h-4 flex-shrink-0 ${
                mod.checked ? 'text-accent-primary' : 'text-text-light-tertiary dark:text-text-dark-tertiary'
              }`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  mod.checked
                    ? 'text-text-light-primary dark:text-text-dark-primary'
                    : 'text-text-light-secondary dark:text-text-dark-secondary'
                }`}>
                  {mod.label}
                </p>
                <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  {mod.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Format Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
          导出格式
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setExportFormat('brain')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              exportFormat === 'brain'
                ? 'bg-accent-primary text-white'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-border-light dark:hover:bg-border-dark'
            }`}
          >
            LifeOS 备份（压缩）
          </button>
          <button
            onClick={() => setExportFormat('json')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              exportFormat === 'json'
                ? 'bg-accent-primary text-white'
                : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary hover:bg-border-light dark:hover:bg-border-dark'
            }`}
          >
            .json（可读）
          </button>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || selectedCount === 0}
        className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {isExporting
          ? '正在导出…'
          : `导出 ${selectedCount} 个模块`}
      </button>
    </div>
  );
};
