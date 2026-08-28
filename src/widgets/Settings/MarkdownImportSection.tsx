/**
 * Markdown / Obsidian Import Section
 *
 * Allows importing a folder of markdown files as notes.
 * Parses frontmatter, wiki-links, and tags.
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  FolderOpen,
  Upload,
  Check,
  AlertTriangle,
  Tag,
  Link2,
} from 'lucide-react';
import {
  importMarkdownFiles,
  collectFolderPaths,
  remapWikiLinks,
  type MarkdownImportResult,
  type MarkdownImportProgress,
} from '../../services/markdownImport';
import { useNotesStore } from '../../stores/useNotesStore';
import { useFoldersStore } from '../../stores/useFoldersStore';
import { logger } from '../../services/logger';

const log = logger.module('MarkdownImportSection');

interface MessageState {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}

interface MarkdownImportSectionProps {
  onMessage: (message: MessageState | null) => void;
}

type ImportStage = 'idle' | 'parsing' | 'preview' | 'importing' | 'complete';

export const MarkdownImportSection: React.FC<MarkdownImportSectionProps> = ({
  onMessage,
}) => {
  const [stage, setStage] = useState<ImportStage>('idle');
  const [progress, setProgress] = useState<MarkdownImportProgress | null>(null);
  const [result, setResult] = useState<MarkdownImportResult | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createNote = useNotesStore((s) => s.createNote);
  const updateNote = useNotesStore((s) => s.updateNote);
  const createFolder = useFoldersStore((s) => s.createFolder);
  const folders = useFoldersStore((s) => s.folders);

  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setStage('parsing');
      onMessage(null);

      const importResult = await importMarkdownFiles(files, (p) => {
        setProgress(p);
      });

      setResult(importResult);
      setStage('preview');
    } catch (error) {
      log.error('Markdown import failed', { error });
      onMessage({ type: 'error', text: `导入失败：${error}` });
      setStage('idle');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!result) return;

    setStage('importing');
    let count = 0;

    try {
      // Step 1: Create folder hierarchy from import paths
      const folderPaths = collectFolderPaths(result.notes);
      const pathToFolderIdMap = new Map<string, string>();

      for (const folderPath of folderPaths) {
        const parts = folderPath.split('/');
        const folderName = parts[parts.length - 1];
        const parentPath = parts.slice(0, -1).join('/');
        const parentId = parentPath ? pathToFolderIdMap.get(parentPath) ?? null : null;

        // Check if folder already exists under this parent
        const existingFolder = Object.values(folders).find(
          (f) => f.name === folderName && f.parentId === parentId
        );

        if (existingFolder) {
          pathToFolderIdMap.set(folderPath, existingFolder.id);
        } else {
          const newFolder = createFolder({ name: folderName, parentId });
          pathToFolderIdMap.set(folderPath, newFolder.id);
        }
      }

      // Step 2: Create all notes (with correct folder assignments)
      const titleToIdMap = new Map<string, string>();
      const createdNoteIds: string[] = [];

      for (const note of result.notes) {
        const folderId = note.folderPath
          ? pathToFolderIdMap.get(note.folderPath) ?? null
          : null;

        const newNote = createNote({
          title: note.title,
          contentText: note.content,
          tags: note.tags,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          folderId,
        });

        titleToIdMap.set(note.title.toLowerCase(), newNote.id);
        createdNoteIds.push(newNote.id);
        count++;
        setImportedCount(count);
      }

      // Step 3: Remap wiki-links to internal IDs
      const linkedNotesMap = remapWikiLinks(result.notes, titleToIdMap);
      linkedNotesMap.forEach((linkedNoteIds, noteTitle) => {
        const noteId = titleToIdMap.get(noteTitle.toLowerCase());
        if (noteId) {
          updateNote(noteId, { linkedNotes: linkedNoteIds });
        }
      });

      const foldersCreated = folderPaths.length;
      const linksRemapped = linkedNotesMap.size;

      setStage('complete');
      onMessage({
        type: 'success',
        text: `已导入 ${count} 条笔记、${foldersCreated} 个文件夹，并重新映射 ${linksRemapped} 个 wiki 链接。`,
      });
    } catch (error) {
      log.error('Note creation failed during import', { error });
      onMessage({
        type: 'error',
        text: `导入部分失败：已导入 ${result.notes.length} 条笔记中的 ${count} 条。错误：${error}`,
      });
      setStage('complete');
    }
  };

  const handleReset = () => {
    setStage('idle');
    setProgress(null);
    setResult(null);
    setImportedCount(0);
  };

  // Collect all unique tags and links from result
  const allTags = result
    ? [...new Set(result.notes.flatMap((n) => n.tags))]
    : [];
  const allLinks = result
    ? [...new Set(result.notes.flatMap((n) => n.linkedNotes))]
    : [];

  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-3 mb-1">
        <FileText className="w-5 h-5 text-accent-primary" />
        <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
          Markdown / Obsidian 导入
        </h2>
      </div>
      <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-6">
        将包含 .md 文件的文件夹作为笔记导入。支持 YAML frontmatter、[[wiki-links]] 和 #tags。
      </p>

      {/* Idle State */}
      {stage === 'idle' && (
        <div className="border-2 border-dashed border-border-light dark:border-border-dark rounded-lg p-8 text-center">
          <FolderOpen className="w-12 h-12 mx-auto mb-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
            选择包含要导入的 markdown（.md）文件的文件夹
          </p>
          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            选择文件夹
            <input
              ref={fileInputRef}
              type="file"
              // @ts-expect-error - webkitdirectory is not in standard types
              webkitdirectory=""
              multiple
              className="hidden"
              onChange={handleFolderSelect}
            />
          </label>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-3">
            非 .md 文件将被跳过。隐藏的文件/文件夹会被排除。
          </p>
        </div>
      )}

      {/* Parsing State */}
      {stage === 'parsing' && progress && (
        <div className="text-center py-8">
          <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-2 mb-4 overflow-hidden">
            <motion.div
              className="h-2 rounded-full bg-accent-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            正在解析文件：{progress.current} / {progress.total}...
          </p>
          <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary mt-1 truncate">
            {progress.currentFile}
          </p>
        </div>
      )}

      {/* Preview State */}
      <AnimatePresence>
        {stage === 'preview' && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {/* Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <SummaryCard
                label="找到的笔记"
                value={result.notes.length}
                icon={FileText}
              />
              <SummaryCard
                label="已扫描文件"
                value={result.totalFiles}
                icon={FolderOpen}
              />
              <SummaryCard
                label="唯一标签"
                value={allTags.length}
                icon={Tag}
              />
              <SummaryCard
                label="Wiki 链接"
                value={allLinks.length}
                icon={Link2}
              />
            </div>

            {/* Warnings / Errors */}
            {(result.warnings.length > 0 || result.errors.length > 0) && (
              <div className="mb-4 p-3 rounded-lg bg-status-warning-bg dark:bg-status-warning-bg-dark border border-status-warning-border dark:border-status-warning-border-dark">
                {result.errors.map((err, i) => (
                  <p key={`err-${i}`} className="text-xs text-status-error-text dark:text-status-error-text-dark flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    {err}
                  </p>
                ))}
                {result.warnings.map((warn, i) => (
                  <p key={`warn-${i}`} className="text-xs text-status-warning-text dark:text-status-warning-text-dark">
                    {warn}
                  </p>
                ))}
              </div>
            )}

            {/* Sample Notes */}
            {result.notes.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-2">
                  示例笔记（前 5 条）
                </h3>
                <div className="space-y-2">
                  {result.notes.slice(0, 5).map((note, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg"
                    >
                      <FileText className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary truncate">
                          {note.title}
                        </p>
                        <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                          {note.relativePath}
                          {note.tags.length > 0 && ` | 标签：${note.tags.join(', ')}`}
                        </p>
                      </div>
                    </div>
                  ))}
                  {result.notes.length > 5 && (
                    <p className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary text-center">
                      ...以及另外 {result.notes.length - 5} 条
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleConfirmImport}
                disabled={result.notes.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-accent-primary hover:bg-accent-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                导入 {result.notes.length} 条笔记
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark"
              >
                取消
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Importing State */}
      {stage === 'importing' && result && (
        <div className="text-center py-8">
          <div className="w-full bg-border-light dark:bg-border-dark rounded-full h-2 mb-4 overflow-hidden">
            <motion.div
              className="h-2 rounded-full bg-accent-green"
              initial={{ width: 0 }}
              animate={{ width: `${(importedCount / result.notes.length) * 100}%` }}
            />
          </div>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            正在创建第 {importedCount} 条笔记（共 {result.notes.length} 条）...
          </p>
        </div>
      )}

      {/* Complete State */}
      {stage === 'complete' && (
        <div className="text-center py-8">
          <Check className="w-12 h-12 mx-auto mb-4 text-accent-green" />
          <p className="text-sm text-text-light-primary dark:text-text-dark-primary font-medium mb-2">
            导入完成
          </p>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
            已成功导入 {importedCount} 条笔记
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-border-light dark:hover:bg-border-dark text-text-light-primary dark:text-text-dark-primary rounded-lg font-medium transition-colors border border-border-light dark:border-border-dark"
          >
            继续导入
          </button>
        </div>
      )}
    </div>
  );
};

// Summary Card sub-component
interface SummaryCardProps {
  label: string;
  value: number;
  icon: React.FC<{ className?: string }>;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, icon: Icon }) => (
  <div className="p-3 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-lg text-center">
    <Icon className="w-4 h-4 mx-auto mb-1 text-text-light-tertiary dark:text-text-dark-tertiary" />
    <p className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
      {value}
    </p>
    <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
      {label}
    </p>
  </div>
);
