/**
 * ExportDialog Component
 * Modal for exporting Gantt timeline in various formats (PNG, PDF, Excel)
 */

import { useState } from 'react';
import { X, Download, FileImage, FileText, FileSpreadsheet } from 'lucide-react';
import type { Task } from '../../types';
import { exportGanttToPNG, exportGanttToPDF, exportGanttToExcel } from '../../utils/ganttExport';

export type ExportFormat = 'png' | 'pdf' | 'excel';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  timelineElement: HTMLElement | null;
  dateRange: { start: Date; end: Date };
  projectName?: string;
}

export function ExportDialog({
  isOpen,
  onClose,
  tasks,
  timelineElement,
  dateRange,
  projectName = 'Project Timeline',
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('png');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [includeDependencies, setIncludeDependencies] = useState(true);
  const [includeSubtasks, setIncludeSubtasks] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    if (!timelineElement) {
      setError('未找到时间线元素，请重试。');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      switch (selectedFormat) {
        case 'png':
          await exportGanttToPNG(timelineElement, `${projectName}.png`);
          break;

        case 'pdf':
          await exportGanttToPDF(tasks, timelineElement, {
            orientation,
            includeDependencies,
            projectName,
            dateRange,
          });
          break;

        case 'excel':
          await exportGanttToExcel(tasks, `${projectName}.xlsx`, {
            includeSubtasks,
            includeCustomFields: true,
          });
          break;
      }

      // Close dialog on success
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            导出时间线
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded transition-colors"
            aria-label="关闭对话框"
          >
            <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
              导出格式
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedFormat('png')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  selectedFormat === 'png'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
                }`}
              >
                <FileImage className="w-6 h-6" />
                <span className="text-xs font-medium">PNG</span>
              </button>

              <button
                onClick={() => setSelectedFormat('pdf')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  selectedFormat === 'pdf'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
                }`}
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs font-medium">PDF</span>
              </button>

              <button
                onClick={() => setSelectedFormat('excel')}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                  selectedFormat === 'excel'
                    ? 'border-accent-primary bg-accent-primary/10'
                    : 'border-border-light dark:border-border-dark hover:border-accent-primary/50'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span className="text-xs font-medium">Excel</span>
              </button>
            </div>
          </div>

          {/* PDF Options */}
          {selectedFormat === 'pdf' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  方向
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      orientation === 'portrait'
                        ? 'border-accent-primary bg-accent-primary/10 text-text-light-primary dark:text-text-dark-primary'
                        : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-accent-primary/50'
                    }`}
                  >
                    纵向
                  </button>
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      orientation === 'landscape'
                        ? 'border-accent-primary bg-accent-primary/10 text-text-light-primary dark:text-text-dark-primary'
                        : 'border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:border-accent-primary/50'
                    }`}
                  >
                    横向
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDependencies}
                  onChange={(e) => setIncludeDependencies(e.target.checked)}
                  className="w-4 h-4 rounded border-border-light dark:border-border-dark accent-accent-primary"
                />
                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  包含任务摘要页
                </span>
              </label>
            </div>
          )}

          {/* Excel Options */}
          {selectedFormat === 'excel' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSubtasks}
                  onChange={(e) => setIncludeSubtasks(e.target.checked)}
                  className="w-4 h-4 rounded border-border-light dark:border-border-dark accent-accent-primary"
                />
                <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                  包含子任务（缩进显示）
                </span>
              </label>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-status-error-bg dark:bg-status-error-bg-dark border border-status-error-border dark:border-status-error-border-dark rounded-lg">
              <p className="text-sm text-status-error-text dark:text-status-error-text-dark">{error}</p>
            </div>
          )}

          {/* Format Description */}
          <div className="p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg">
            <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
              {selectedFormat === 'png' &&
                '将当前时间线视图导出为高清图片（2 倍 DPI）。'}
              {selectedFormat === 'pdf' &&
                '导出为包含项目元数据及可选任务摘要的多页 PDF 文档。'}
              {selectedFormat === 'excel' &&
                '将任务数据（含所有字段）导出为 Excel 电子表格，可导入 MS Project。'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                正在导出…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                导出 {selectedFormat.toUpperCase()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
