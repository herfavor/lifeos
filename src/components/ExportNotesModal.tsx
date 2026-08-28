/**
 * Export Notes Modal Component
 * Provides UI for exporting notes to markdown with various options
 */

import { useState, useMemo } from 'react';
import { X, Download, FileDown, FolderOpen, AlertCircle } from 'lucide-react';
import { useNotesStore } from '../stores/useNotesStore';
import { useFoldersStore } from '../stores/useFoldersStore';
import {
  exportNoteToMarkdown,
  exportNotesWithFolders,
  downloadBlob,
  getExportFilename,
  getMarkdownFilename,
} from '../utils/markdownExport';
import { logger } from '../services/logger';

const log = logger.module('ExportNotesModal');

interface ExportNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportScope = 'single' | 'folder' | 'all';

export function ExportNotesModal({ isOpen, onClose }: ExportNotesModalProps) {
  const activeNoteId = useNotesStore((state) => state.activeNoteId);
  const activeFolderId = useFoldersStore((state) => state.activeFolderId);
  const notes = useNotesStore((state) => state.notes);
  const folders = useFoldersStore((state) => state.folders);
  const [exportScope, setExportScope] = useState<ExportScope>('single');
  const [includeFolderStructure, setIncludeFolderStructure] = useState(true);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get active note if exists
  const activeNote = activeNoteId ? notes[activeNoteId] : null;

  // Calculate note counts for preview
  const noteCounts = useMemo(() => {
    const allNotes = Object.values(notes).filter((note) => !note.deletedAt);
    const folderNotes = activeFolderId
      ? allNotes.filter((n) => n.folderId === activeFolderId)
      : [];

    const filteredAll = includeArchived
      ? allNotes
      : allNotes.filter((n) => !n.isArchived);

    const filteredFolder = includeArchived
      ? folderNotes
      : folderNotes.filter((n) => !n.isArchived);

    return {
      single: activeNote ? 1 : 0,
      folder: filteredFolder.length,
      all: filteredAll.length,
    };
  }, [notes, activeFolderId, includeArchived, activeNote]);

  // Get folder name for display
  const folderName = activeFolderId && folders[activeFolderId]
    ? folders[activeFolderId].name
    : '全部笔记';

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setExportProgress(null);

    try {
      const allNotes = Object.values(notes).filter((note) => !note.deletedAt);
      const allFolders = Object.values(folders);
      const allNotesMap = Object.fromEntries(allNotes.map((n) => [n.id, n]));

      if (exportScope === 'single') {
        // Single note export
        if (!activeNote) {
          throw new Error('未选择笔记');
        }

        setExportProgress('正在将笔记转换为 Markdown…');
        const markdown = exportNoteToMarkdown(activeNote, allNotesMap, allFolders);
        const filename = getMarkdownFilename(activeNote);

        // Download as .md file
        const blob = new Blob([markdown], { type: 'text/markdown' });
        downloadBlob(blob, filename);

        log.info('Single note exported', { noteId: activeNote.id, filename });
        onClose();
      } else {
        // Multi-note export (folder or all)
        const notesToExport =
          exportScope === 'folder'
            ? allNotes.filter(
                (n) =>
                  n.folderId === activeFolderId &&
                  (includeArchived || !n.isArchived)
              )
            : allNotes.filter((n) => includeArchived || !n.isArchived);

        if (notesToExport.length === 0) {
          throw new Error('没有可导出的笔记');
        }

        // Show progress for large exports
        const totalNotes = notesToExport.length;
        if (totalNotes > 50) {
          setExportProgress(`正在准备导出 ${totalNotes} 篇笔记…`);
        }

        setExportProgress(`正在导出 ${totalNotes} 篇笔记…`);

        // Create ZIP with folder structure (if enabled)
        const zip = await exportNotesWithFolders(notesToExport, allFolders);
        const filename = getExportFilename();

        // Download ZIP
        downloadBlob(zip, filename);

        log.info('Bulk notes exported', {
          count: totalNotes,
          scope: exportScope,
          includeFolderStructure,
          includeArchived,
        });

        // Success message
        setExportProgress(`已成功导出 ${totalNotes} 篇笔记！`);
        setTimeout(() => onClose(), 1500); // Close after brief success message
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '导出失败';
      log.error('Export failed', { error: err });
      setError(message);
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  // Preview text for current selection
  const getPreviewText = () => {
    const count = noteCounts[exportScope];
    if (count === 0) {
      if (exportScope === 'single') return '未选择笔记';
      if (exportScope === 'folder') return '此文件夹中没有笔记';
      return '没有可导出的笔记';
    }

    const scopeLabel = exportScope === 'single' ? '' : `，来自${exportScope === 'folder' ? folderName : '全部文件夹'}`;
    return `将导出 ${count} 篇笔记${scopeLabel}`;
  };

  const canExport = noteCounts[exportScope] > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-accent-blue" />
            <h2 className="text-xl font-semibold text-text-light-primary dark:text-text-dark-primary">
              导出笔记
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated rounded-button transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Export Scope Selection */}
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-3">
              导出什么？
            </label>
            <div className="space-y-2">
              {/* Single Note Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  exportScope === 'single'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                } ${!activeNote ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="single"
                  checked={exportScope === 'single'}
                  onChange={(e) => setExportScope(e.target.value as ExportScope)}
                  disabled={!activeNote}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    当前笔记
                  </div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    {activeNote ? `导出“${activeNote.title}”` : '未选择笔记'}
                  </div>
                </div>
              </label>

              {/* Folder Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  exportScope === 'folder'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="folder"
                  checked={exportScope === 'folder'}
                  onChange={(e) => setExportScope(e.target.value as ExportScope)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary flex items-center gap-2">
                    <FolderOpen className="w-4 h-4" />
                    当前文件夹
                  </div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    导出“{folderName}”中的所有笔记
                  </div>
                </div>
              </label>

              {/* All Notes Option */}
              <label
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  exportScope === 'all'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }`}
              >
                <input
                  type="radio"
                  name="exportScope"
                  value="all"
                  checked={exportScope === 'all'}
                  onChange={(e) => setExportScope(e.target.value as ExportScope)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-text-light-primary dark:text-text-dark-primary">
                    全部笔记
                  </div>
                  <div className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    导出完整笔记库及全部文件夹层级
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Export Options */}
          {exportScope !== 'single' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                导出选项
              </label>

              {/* Include Folder Structure */}
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeFolderStructure}
                  onChange={(e) => setIncludeFolderStructure(e.target.checked)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                    包含文件夹结构
                  </div>
                  <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    在 ZIP 导出中保留文件夹层级
                  </div>
                </div>
              </label>

              {/* Include Archived */}
              <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                    包含已归档笔记
                  </div>
                  <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                    连同当前笔记一起导出已归档笔记
                  </div>
                </div>
              </label>
            </div>
          )}

          {/* Preview */}
          <div className="p-4 rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark">
            <div className="flex items-center gap-2 text-sm">
              <Download className="w-4 h-4 text-accent-blue" />
              <span className="font-medium text-text-light-primary dark:text-text-dark-primary">
                {getPreviewText()}
              </span>
            </div>
            {exportScope !== 'single' && (
              <div className="mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                {includeFolderStructure
                  ? 'ZIP 文件将保留文件夹结构'
                  : '所有笔记将导出到单个文件夹'}
              </div>
            )}
          </div>

          {/* Progress Indicator */}
          {exportProgress && (
            <div className="p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/30">
              <div className="flex items-center gap-2 text-sm text-accent-blue">
                <div className="w-4 h-4 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
                <span>{exportProgress}</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg bg-accent-red/10 border border-accent-red/30">
              <div className="flex items-start gap-2 text-sm text-accent-red">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-light dark:border-border-dark bg-surface-light-elevated dark:bg-surface-dark-elevated">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 rounded-button text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary border border-border-light dark:border-border-dark hover:bg-surface-light dark:hover:bg-surface-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport || isExporting}
            className="px-4 py-2 rounded-button text-sm font-medium bg-accent-blue hover:bg-accent-blue-hover text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            导出笔记
          </button>
        </div>
      </div>
    </div>
  );
}
