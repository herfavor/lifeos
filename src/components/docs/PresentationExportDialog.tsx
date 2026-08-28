/**
 * Presentation export dialog.
 *
 * LifeOS keeps PDF export for hidden presentation data compatibility.
 * PPTX export was removed because its dependency chain contained unresolved
 * high-severity vulnerabilities.
 */

import { useState } from 'react';
import { X, FileText, Loader2 } from 'lucide-react';
import { toast } from '../../stores/useToastStore';
import type { Slide } from '../../types';
import { exportToPDF } from './presentationExport';

interface PresentationExportDialogProps {
  slides: Slide[];
  title: string;
  onClose: () => void;
}

export function PresentationExportDialog({
  slides,
  title,
  onClose,
}: PresentationExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleExport = async () => {
    setIsExporting(true);
    setProgress({ current: 0, total: slides.length });

    try {
      await exportToPDF(slides, title, (current, total) => {
        setProgress({ current, total });
      });
      toast.success('PDF 导出成功');
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('导出 PDF 失败');
    } finally {
      setIsExporting(false);
    }
  };

  const percentage =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-light dark:bg-surface-dark-elevated rounded-lg shadow-xl w-[400px]">
        <div className="flex items-center justify-between p-4 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            导出演示文稿
          </h2>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1 text-text-light-tertiary dark:text-text-dark-tertiary hover:text-text-light-primary dark:hover:text-text-dark-primary disabled:opacity-50"
            aria-label="关闭导出对话框"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="p-4 rounded-lg border-2 border-accent-primary bg-accent-primary/5 flex flex-col items-center gap-2">
            <FileText className="w-8 h-8 text-status-error" />
            <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
              PDF
            </span>
            <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
              保留视觉布局，适合查看与分享
            </span>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-light-secondary dark:text-text-dark-secondary">
                  正在导出…
                </span>
                <span className="text-text-light-tertiary dark:text-text-dark-tertiary">
                  {progress.current} / {progress.total} 张幻灯片
                </span>
              </div>
              <div className="w-full h-2 bg-surface-light-alt dark:bg-surface-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}

          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            PDF 导出不会修改原始演示数据。
          </p>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary hover:text-text-light-primary dark:hover:text-text-dark-primary disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                正在导出…
              </>
            ) : (
              <>导出 PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
