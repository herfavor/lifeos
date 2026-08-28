/**
 * SaveConversationModal Component
 *
 * Modal for bulk saving AI Terminal conversation to Notes.
 * Allows filtering by message type (all, user only, assistant only).
 */

import React, { useState, useCallback } from 'react';
import { X, MessageSquare, User, Bot, Calendar, FolderPlus, Loader2 } from 'lucide-react';
import { useTerminalStore } from '../../stores/useTerminalStore';
import {
  saveConversationToNote,
  getOrCreateAITerminalDailyNote,
  createNoteWithConversation,
} from '../../services/aiTerminalNotes';
import { toast } from '../../stores/useToastStore';

type MessageFilter = 'all' | 'user' | 'assistant';

interface SaveConversationModalProps {
  /** Called when modal should close */
  onClose: () => void;
}

export const SaveConversationModal: React.FC<SaveConversationModalProps> = ({
  onClose,
}) => {
  const messages = useTerminalStore((state) => state.messages);
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [isSaving, setIsSaving] = useState(false);
  const [destination, setDestination] = useState<'daily' | 'new'>('daily');
  const [newNoteTitle, setNewNoteTitle] = useState('');

  // Calculate message counts
  const userMessages = messages.filter((m) => m.role === 'user');
  const assistantMessages = messages.filter((m) => m.role === 'assistant');
  const filteredCount =
    filter === 'all'
      ? messages.length
      : filter === 'user'
      ? userMessages.length
      : assistantMessages.length;

  // Handle save to daily notes
  const handleSaveToDailyNote = useCallback(async () => {
    if (messages.length === 0) {
      toast.error('没有可保存的消息');
      return;
    }

    setIsSaving(true);
    try {
      const dailyNote = getOrCreateAITerminalDailyNote();
      saveConversationToNote({
        messages,
        targetNoteId: dailyNote.id,
        filter,
      });
      toast.success(`已将 ${filteredCount} 条消息保存到 "${dailyNote.title}"`);
      onClose();
    } catch (error) {
      toast.error('保存对话失败');
      console.error('Failed to save conversation:', error);
    } finally {
      setIsSaving(false);
    }
  }, [messages, filter, filteredCount, onClose]);

  // Handle create new note with conversation
  const handleCreateNewNote = useCallback(async () => {
    if (messages.length === 0) {
      toast.error('没有可保存的消息');
      return;
    }

    if (!newNoteTitle.trim()) {
      toast.error('请输入笔记标题');
      return;
    }

    setIsSaving(true);
    try {
      const note = createNoteWithConversation({
        messages,
        title: newNoteTitle.trim(),
        filter,
      });
      toast.success(`已创建 "${note.title}"，包含 ${filteredCount} 条消息`);
      onClose();
    } catch (error) {
      toast.error('创建笔记失败');
      console.error('Failed to create note:', error);
    } finally {
      setIsSaving(false);
    }
  }, [messages, newNoteTitle, filter, filteredCount, onClose]);

  // Handle save action based on destination
  const handleSave = useCallback(() => {
    if (destination === 'daily') {
      handleSaveToDailyNote();
    } else {
      handleCreateNewNote();
    }
  }, [destination, handleSaveToDailyNote, handleCreateNewNote]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  if (messages.length === 0) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        onClick={onClose}
        onKeyDown={handleKeyDown}
      >
        <div
          className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-text-light-tertiary dark:text-text-dark-tertiary" />
            <h2 className="text-lg font-semibold mb-2 text-text-light-primary dark:text-text-dark-primary">
              没有可保存的对话
            </h2>
            <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mb-4">
              请先在 AI 助手中开始一段对话。
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-accent-blue/90 transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">
            保存对话
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-tertiary dark:text-text-dark-tertiary transition-colors"
            aria-label="关闭"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Message Filter */}
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              包含的消息
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                  filter === 'all'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-xs font-medium">全部</span>
                <span className="text-xs opacity-70">{messages.length}</span>
              </button>
              <button
                onClick={() => setFilter('user')}
                className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                  filter === 'user'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="text-xs font-medium">提示</span>
                <span className="text-xs opacity-70">{userMessages.length}</span>
              </button>
              <button
                onClick={() => setFilter('assistant')}
                className={`flex flex-col items-center gap-1 p-3 rounded-md border transition-colors ${
                  filter === 'assistant'
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary'
                }`}
              >
                <Bot className="w-5 h-5" />
                <span className="text-xs font-medium">回复</span>
                <span className="text-xs opacity-70">{assistantMessages.length}</span>
              </button>
            </div>
          </div>

          {/* Destination */}
          <div>
            <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
              保存到
            </label>
            <div className="space-y-2">
              <button
                onClick={() => setDestination('daily')}
                className={`w-full flex items-center gap-3 p-3 rounded-md border transition-colors text-left ${
                  destination === 'daily'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }`}
              >
                <Calendar
                  className={`w-5 h-5 ${
                    destination === 'daily' ? 'text-accent-blue' : 'text-text-light-tertiary dark:text-text-dark-tertiary'
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${
                      destination === 'daily' ? 'text-accent-blue' : 'text-text-light-primary dark:text-text-dark-primary'
                    }`}
                  >
                    今日 AI 笔记
                  </div>
                  <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    追加到 AI 助手文件夹中的每日笔记
                  </div>
                </div>
              </button>
              <button
                onClick={() => setDestination('new')}
                className={`w-full flex items-center gap-3 p-3 rounded-md border transition-colors text-left ${
                  destination === 'new'
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-border-light dark:border-border-dark hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                }`}
              >
                <FolderPlus
                  className={`w-5 h-5 ${
                    destination === 'new' ? 'text-accent-green' : 'text-text-light-tertiary dark:text-text-dark-tertiary'
                  }`}
                />
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${
                      destination === 'new' ? 'text-accent-blue' : 'text-text-light-primary dark:text-text-dark-primary'
                    }`}
                  >
                    新建笔记
                  </div>
                  <div className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    在 AI 助手文件夹中创建新笔记
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* New note title input */}
          {destination === 'new' && (
            <div>
              <label className="block text-sm font-medium text-text-light-secondary dark:text-text-dark-secondary mb-2">
                笔记标题
              </label>
              <input
                type="text"
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="为你的笔记输入标题..."
                className="w-full px-3 py-2 text-sm rounded-md border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-text-light-primary dark:text-text-dark-primary placeholder-text-light-tertiary dark:placeholder-text-dark-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-light dark:border-border-dark bg-surface-light-alt dark:bg-surface-dark-alt">
          <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            将保存 {filteredCount} 条消息
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md bg-surface-light-elevated dark:bg-surface-dark-elevated hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary transition-colors"
              disabled={isSaving}
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || (destination === 'new' && !newNoteTitle.trim())}
              className="px-4 py-2 text-sm rounded-md bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存对话'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveConversationModal;
