/**
 * Data Management Section
 *
 * Shows storage breakdown by module and item counts.
 * Provides Export All Data and Clear All Data actions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  FileText,
  CheckSquare,
  Calendar,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  HardDrive,
  BarChart3,
} from 'lucide-react';
import { indexedDBService } from '../../services/indexedDB';
import { exportBrainFile, formatFileSize } from '../../services/brainBackup';
import { logger } from '../../services/logger';

const log = logger.module('DataManagement');

interface MessageState {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface DataManagementSectionProps {
  onMessage: (message: MessageState | null) => void;
}

interface ModuleInfo {
  key: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  sizeBytes: number;
  itemCount: number;
}

const MODULE_CONFIG: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  'notes-storage': { label: '笔记', icon: FileText },
  'kanban-tasks': { label: '任务', icon: CheckSquare },
  'calendar-events': { label: '日历事件', icon: Calendar },
  'time-tracking': { label: '时间记录', icon: Clock },
  'settings-storage': { label: '设置', icon: Database },
  'theme-storage': { label: '主题', icon: Database },
  'habits-storage': { label: '习惯', icon: BarChart3 },
};

/**
 * Count items in a parsed store value (heuristic based on data shape)
 */
function countItems(parsed: unknown): number {
  if (!parsed || typeof parsed !== 'object') return 0;

  const state = (parsed as Record<string, unknown>).state;
  if (!state || typeof state !== 'object') return 0;

  const stateObj = state as Record<string, unknown>;

  // Notes store: state.notes is Record<string, Note>
  if (stateObj.notes && typeof stateObj.notes === 'object' && !Array.isArray(stateObj.notes)) {
    return Object.keys(stateObj.notes as object).length;
  }

  // Kanban: state.tasks is array
  if (Array.isArray(stateObj.tasks)) {
    return stateObj.tasks.length;
  }

  // Calendar: state.events is Record<string, CalendarEvent[]>
  if (stateObj.events && typeof stateObj.events === 'object') {
    const events = stateObj.events as Record<string, unknown[]>;
    return Object.values(events).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0);
  }

  // Time tracking: state.entries is array
  if (Array.isArray(stateObj.entries)) {
    return stateObj.entries.length;
  }

  // Habits: state.habits is array
  if (Array.isArray(stateObj.habits)) {
    return stateObj.habits.length;
  }

  return 0;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  onMessage,
}) => {
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  const loadStorageInfo = useCallback(async () => {
    setLoading(true);
    try {
      const allData = await indexedDBService.getAllData();
      const moduleList: ModuleInfo[] = [];
      let total = 0;

      for (const [key, value] of Object.entries(allData)) {
        const sizeBytes = new Blob([value]).size;
        total += sizeBytes;

        const config = MODULE_CONFIG[key];
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(value);
        } catch {
          // not JSON
        }

        moduleList.push({
          key,
          label: config?.label ?? key,
          icon: config?.icon ?? Database,
          sizeBytes,
          itemCount: countItems(parsed),
        });
      }

      // Sort by size descending
      moduleList.sort((a, b) => b.sizeBytes - a.sizeBytes);
      setModules(moduleList);
      setTotalSize(total);
    } catch (error) {
      log.error('Failed to load storage info', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStorageInfo();
  }, [loadStorageInfo]);

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      onMessage(null);
      const result = await exportBrainFile({ compressed: true });
      onMessage({
        type: 'success',
        text: `所有数据已成功导出。文件：${result.filename}（${formatFileSize(result.size)}）`,
      });
    } catch (error) {
      onMessage({ type: 'error', text: `导出失败：${error}` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearAll = async () => {
    if (clearConfirmText !== 'DELETE ALL DATA') return;

    try {
      setIsClearing(true);
      onMessage(null);

      // Clear all IndexedDB data
      const allData = await indexedDBService.getAllData();
      for (const key of Object.keys(allData)) {
        await indexedDBService.removeItem(key);
      }

      // Clear localStorage stores
      localStorage.removeItem('settings-storage');
      localStorage.removeItem('theme-storage');

      onMessage({
        type: 'success',
        text: '所有数据已清除。页面将在 2 秒后重新加载。',
      });

      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      onMessage({ type: 'error', text: `清除失败：${error}` });
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
      setClearConfirmText('');
    }
  };

  const maxSize = Math.max(...modules.map((m) => m.sizeBytes), 1);

  return (
    <div className="bento-card p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          数据管理
        </h2>
        <button
          onClick={loadStorageInfo}
          className="p-2 rounded-lg text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
          title="刷新"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        查看存储使用明细并管理你的数据
      </p>

      {/* Total Storage */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
        <HardDrive className="w-5 h-5 text-accent-primary flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            已用存储总量
          </p>
          <p className="text-2xl font-bold text-accent-primary">
            {formatFileSize(totalSize)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            {modules.length} 个存储
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            共 {modules.reduce((sum, m) => sum + m.itemCount, 0)} 个项目
          </p>
        </div>
      </div>

      {/* Module Breakdown */}
      {loading ? (
        <div className="text-center py-8 text-text-light-secondary dark:text-text-dark-secondary">
          正在加载存储数据...
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {modules.map((mod) => {
            const Icon = mod.icon;
            const percentage = (mod.sizeBytes / maxSize) * 100;
            return (
              <div
                key={mod.key}
                className="flex items-center gap-3"
              >
                <Icon className="w-4 h-4 text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                      {mod.label}
                    </span>
                    <span className="text-xs text-text-light-secondary dark:text-text-dark-secondary ml-2 flex-shrink-0">
                      {formatFileSize(mod.sizeBytes)}
                      {mod.itemCount > 0 && `（${mod.itemCount} 个项目）`}
                    </span>
                  </div>
                  <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className="h-1.5 rounded-full bg-accent-primary"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3 pt-4 border-t border-border-light dark:border-border-dark">
        <button
          onClick={handleExportAll}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {isExporting ? '正在导出...' : '导出所有数据'}
        </button>

        <button
          onClick={() => setShowClearConfirm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent-red/10 text-accent-red hover:bg-accent-red/20 rounded-lg font-medium transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          清除所有数据
        </button>
      </div>

      {/* Clear Confirmation Dialog */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowClearConfirm(false)}
            />
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative bg-surface-light dark:bg-surface-dark rounded-xl shadow-modal border border-border-light dark:border-border-dark max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-accent-red/10">
                  <AlertTriangle className="w-6 h-6 text-accent-red" />
                </div>
                <h3 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
                  清除所有数据
                </h3>
              </div>

              <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
                这将永久删除你的所有笔记、任务、日历事件、时间记录和设置。
                此操作无法撤销。建议先导出备份。
              </p>

              <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                输入 <span className="font-mono text-accent-red">DELETE ALL DATA</span> 以确认：
              </p>

              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="w-full px-3 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-lg text-text-light-primary dark:text-text-dark-primary placeholder:text-text-light-tertiary dark:placeholder:text-text-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-red mb-4 font-mono"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowClearConfirm(false);
                    setClearConfirmText('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark"
                >
                  取消
                </button>
                <button
                  onClick={handleClearAll}
                  disabled={clearConfirmText !== 'DELETE ALL DATA' || isClearing}
                  className="flex-1 px-4 py-2.5 bg-accent-red hover:bg-accent-red-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClearing ? '正在清除...' : '全部清除'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
