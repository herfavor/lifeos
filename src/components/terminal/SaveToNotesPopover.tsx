/**
 * SaveToNotesPopover Component
 *
 * Modal for saving AI Terminal messages to Notes.
 * Centered within the AI Terminal sidebar to avoid overflow issues.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, FileText, FolderPlus, FolderSearch, ChevronRight, Loader2, X } from 'lucide-react';
import type { Message } from '../../stores/useTerminalStore';
import {
  saveMessageToDailyNote,
  saveMessageToNote,
  createNoteWithMessage,
  getRecentDestinations,
  getPrecedingPrompt,
} from '../../services/aiTerminalNotes';
import { toast } from '../../stores/useToastStore';
import { NoteDestinationPicker } from './NoteDestinationPicker';

interface SaveToNotesPopoverProps {
  /** The message to save */
  message: Message;
  /** Optional: The prompt that preceded this message (for AI responses) */
  promptMessage?: Message;
  /** Called when modal should close */
  onClose: () => void;
  /** Called after successful save */
  onSaveComplete: () => void;
}

export const SaveToNotesPopover: React.FC<SaveToNotesPopoverProps> = ({
  message,
  promptMessage,
  onClose,
  onSaveComplete,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewNoteInput, setShowNewNoteInput] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [showDestinationPicker, setShowDestinationPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get recent destinations
  const recentNotes = getRecentDestinations();

  // Auto-get the prompt for AI responses if not provided
  const effectivePromptMessage = promptMessage ?? (message.role === 'assistant' ? getPrecedingPrompt(message) : undefined);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus input when showing new note form
  useEffect(() => {
    if (showNewNoteInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNewNoteInput]);

  // Handle save to daily notes
  const handleSaveToDailyNote = useCallback(async () => {
    setIsSaving(true);
    try {
      const { note, saveResult } = saveMessageToDailyNote(message, effectivePromptMessage);
      if (saveResult.skipped) {
        toast.info(`该消息已保存到 "${note.title}"`);
      } else {
        toast.success(`已保存到 "${note.title}"`);
      }
      onSaveComplete();
    } catch (error) {
      toast.error('保存到每日笔记失败');
      console.error('Failed to save to daily notes:', error);
    } finally {
      setIsSaving(false);
    }
  }, [message, effectivePromptMessage, onSaveComplete]);

  // Handle save to recent note
  const handleSaveToRecentNote = useCallback(async (noteId: string, noteTitle: string) => {
    setIsSaving(true);
    try {
      const result = saveMessageToNote({
        message,
        promptMessage: effectivePromptMessage,
        targetNoteId: noteId,
        position: 'append',
      });
      if (result.skipped) {
        toast.info(`该消息已保存到 "${noteTitle}"`);
      } else {
        toast.success(`已保存到 "${noteTitle}"`);
      }
      onSaveComplete();
    } catch (error) {
      toast.error('保存到笔记失败');
      console.error('Failed to save to note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [message, effectivePromptMessage, onSaveComplete]);

  // Handle create new note
  const handleCreateNewNote = useCallback(async () => {
    if (!newNoteTitle.trim()) {
      toast.error('请输入笔记标题');
      return;
    }

    setIsSaving(true);
    try {
      const note = createNoteWithMessage({
        message,
        promptMessage: effectivePromptMessage,
        title: newNoteTitle.trim(),
      });
      toast.success(`已创建 "${note.title}"`);
      onSaveComplete();
    } catch (error) {
      toast.error('创建笔记失败');
      console.error('Failed to create note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [message, effectivePromptMessage, newNoteTitle, onSaveComplete]);

  // Handle enter key in new note input
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreateNewNote();
    }
  }, [handleCreateNewNote]);

  // Handle selecting a note from the destination picker
  const handlePickerSelectNote = useCallback(async (noteId: string, noteTitle: string) => {
    setIsSaving(true);
    try {
      const result = saveMessageToNote({
        message,
        promptMessage: effectivePromptMessage,
        targetNoteId: noteId,
        position: 'append',
      });
      if (result.skipped) {
        toast.info(`该消息已保存到 "${noteTitle}"`);
      } else {
        toast.success(`已保存到 "${noteTitle}"`);
      }
      setShowDestinationPicker(false);
      onSaveComplete();
    } catch (error) {
      toast.error('保存到笔记失败');
      console.error('Failed to save to note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [message, effectivePromptMessage, onSaveComplete]);

  // Handle creating a new note from the destination picker
  const handlePickerCreateNote = useCallback(async (title: string, folderId: string | null) => {
    setIsSaving(true);
    try {
      const note = createNoteWithMessage({
        message,
        promptMessage: effectivePromptMessage,
        title,
        folderId,
      });
      toast.success(`已创建 "${note.title}"`);
      setShowDestinationPicker(false);
      onSaveComplete();
    } catch (error) {
      toast.error('创建笔记失败');
      console.error('Failed to create note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [message, effectivePromptMessage, onSaveComplete]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/40"
      style={{ pointerEvents: 'auto' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="保存到笔记"
    >
      <div
        ref={modalRef}
        className="w-[calc(100%-32px)] max-w-[280px] bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl border border-border-light dark:border-border-dark overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="menu"
        aria-label="保存到笔记选项"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border-light dark:border-border-dark bg-surface-light-alt dark:bg-surface-dark-alt flex items-center justify-between">
          <h3 className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
            保存到笔记
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-tertiary dark:text-text-dark-tertiary transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* New Note Input */}
      {showNewNoteInput ? (
        <div className="p-3 border-b border-border-light dark:border-border-dark">
          <input
            ref={inputRef}
            type="text"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入笔记标题..."
            className="w-full px-3 py-2 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder-text-light-tertiary dark:placeholder-text-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
            disabled={isSaving}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setShowNewNoteInput(false)}
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-surface-light-alt dark:bg-surface-dark-alt hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary transition-colors"
              disabled={isSaving}
            >
              取消
            </button>
            <button
              onClick={handleCreateNewNote}
              disabled={isSaving || !newNoteTitle.trim()}
              className="flex-1 px-3 py-1.5 text-xs rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                '创建'
              )}
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Quick Actions */}
          <div className="py-1">
            {/* Today's AI Notes - Default action */}
            <button
              onClick={handleSaveToDailyNote}
              disabled={isSaving}
              className="w-full px-3 py-2 text-left hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-3 disabled:opacity-50"
              role="menuitem"
            >
              <Calendar className="w-4 h-4 text-accent-blue" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                  今日 AI 笔记
                </div>
                <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary truncate">
                  AI 助手文件夹中的每日笔记
                </div>
              </div>
              {isSaving && <Loader2 className="w-4 h-4 animate-spin text-accent-blue" />}
            </button>

            {/* New Note */}
            <button
              onClick={() => setShowNewNoteInput(true)}
              disabled={isSaving}
              className="w-full px-3 py-2 text-left hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-3 disabled:opacity-50"
              role="menuitem"
            >
              <FolderPlus className="w-4 h-4 text-accent-green" />
              <span className="text-sm text-text-light-primary dark:text-text-dark-primary">
                新建笔记...
              </span>
            </button>
          </div>

          {/* Recent Notes */}
          {recentNotes.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-t border-border-light dark:border-border-dark">
                <span className="text-xs font-medium text-text-light-tertiary dark:text-text-dark-tertiary uppercase tracking-wide">
                  最近
                </span>
              </div>
              <div className="py-1 max-h-32 overflow-y-auto">
                {recentNotes.slice(0, 3).map((note) => (
                  <button
                    key={note.id}
                    onClick={() => handleSaveToRecentNote(note.id, note.title)}
                    disabled={isSaving}
                    className="w-full px-3 py-2 text-left hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-3 disabled:opacity-50"
                    role="menuitem"
                  >
                    <FileText className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
                    <span className="text-sm text-text-light-primary dark:text-text-dark-primary truncate">
                      {note.icon && <span className="mr-1">{note.icon}</span>}
                      {note.title}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* Footer - More Options */}
      {!showNewNoteInput && (
        <div className="border-t border-border-light dark:border-border-dark py-1">
          <button
            onClick={() => setShowDestinationPicker(true)}
            disabled={isSaving}
            className="w-full px-3 py-2 text-left hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-3 disabled:opacity-50"
            role="menuitem"
          >
            <FolderSearch className="w-4 h-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
              选择文件夹/笔记...
            </span>
            <ChevronRight className="w-4 h-4 ml-auto text-text-light-tertiary dark:text-text-dark-tertiary" />
          </button>
        </div>
      )}

      {/* Destination Picker Modal */}
      <NoteDestinationPicker
        isOpen={showDestinationPicker}
        onClose={() => setShowDestinationPicker(false)}
        onSelectNote={handlePickerSelectNote}
        onCreateNote={handlePickerCreateNote}
        title="选择保存位置"
        isSaving={isSaving}
      />
      </div>
    </div>
  );
};

export default SaveToNotesPopover;
