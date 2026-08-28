import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTimeTrackingStore } from '../stores/useTimeTrackingStore';
import { ProjectSelector } from './ProjectSelector';
import { TagInput } from './TagInput';
import type { TimeEntry } from '../types';

interface EditTimeEntryModalProps {
  entry: TimeEntry;
  onClose: () => void;
}

/**
 * EditTimeEntryModal Component
 * Modal dialog for editing existing time entries
 */
export function EditTimeEntryModal({ entry, onClose }: EditTimeEntryModalProps) {
  const { updateEntry } = useTimeTrackingStore();

  const [description, setDescription] = useState(entry.description);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [projectId, setProjectId] = useState<string | null>(entry.projectId || null);
  const [notes, setNotes] = useState(entry.notes || '');
  const [entryTags, setEntryTags] = useState<string[]>(entry.tags || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Format times for datetime-local input
    const formatDateTimeLocal = (isoString: string) => {
      const date = new Date(isoString);
      return date.toISOString().slice(0, 16);
    };

    setStartTime(formatDateTimeLocal(entry.startTime));
    if (entry.endTime) {
      setEndTime(formatDateTimeLocal(entry.endTime));
    }
  }, [entry]);

  const handleSave = async () => {
    setError('');

    // Validation
    if (!description.trim()) {
      setError('请填写描述');
      return;
    }

    if (!startTime) {
      setError('请填写开始时间');
      return;
    }

    if (!endTime) {
      setError('请填写结束时间');
      return;
    }

    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (endDate <= startDate) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    setSaving(true);
    try {
      // Calculate new duration
      const newDuration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

      await updateEntry(entry.id, {
        description: description.trim(),
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        duration: newDuration,
        projectId: projectId || undefined,
        notes: notes.trim() || undefined,
        tags: entryTags
      });

      onClose();
    } catch (err) {
      console.error('Failed to update entry:', err);
      setError('保存更改失败，请重试。');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-light dark:bg-surface-dark rounded-button border border-border-light dark:border-border-dark shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-light dark:border-border-dark">
          <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
            编辑时间记录
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-button hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary transition-all duration-standard ease-smooth"
            aria-label="关闭弹窗"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          {error && (
            <div className="px-3 py-2 bg-status-error/10 border border-status-error/20 rounded-button text-status-error text-xs">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              描述
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary"
              placeholder="你做了什么？"
            />
          </div>

          {/* Start Time */}
          <div>
            <label
              htmlFor="startTime"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              开始时间
            </label>
            <input
              id="startTime"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
            />
          </div>

          {/* End Time */}
          <div>
            <label
              htmlFor="endTime"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              结束时间
            </label>
            <input
              id="endTime"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary"
            />
          </div>

          {/* Project */}
          <div>
            <label
              htmlFor="project"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              项目
            </label>
            <ProjectSelector
              value={projectId}
              onChange={setProjectId}
              placeholder="无项目"
              showNoProject={true}
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              备注（可选）
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-2.5 py-1.5 text-xs bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button focus:outline-none focus:ring-2 focus:ring-accent-primary text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary resize-none"
              placeholder="添加关于此时间记录的更多详情…"
            />
          </div>

          {/* Tags */}
          <div>
            <label
              className="block text-xs font-medium text-text-light-primary dark:text-text-dark-primary mb-1.5"
            >
              标签
            </label>
            <TagInput tags={entryTags} onChange={setEntryTags} compact />
          </div>

          {/* Duration Preview */}
          {startTime && endTime && (
            <div className="px-2.5 py-2 bg-surface-light-elevated dark:bg-surface-dark-elevated rounded-button border border-border-light dark:border-border-dark">
              <div className="text-xs text-text-light-secondary dark:text-text-dark-secondary">
                时长：{' '}
                <span className="font-mono font-semibold text-accent-primary">
                  {(() => {
                    const start = new Date(startTime).getTime();
                    const end = new Date(endTime).getTime();
                    const durationSeconds = Math.floor((end - start) / 1000);
                    const hours = Math.floor(durationSeconds / 3600);
                    const minutes = Math.floor((durationSeconds % 3600) / 60);
                    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
                  })()}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-light dark:border-border-dark">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-text-light-primary dark:text-text-dark-primary bg-surface-light-elevated dark:bg-surface-dark-elevated border border-border-light dark:border-border-dark rounded-button hover:bg-surface-light dark:hover:bg-surface-dark transition-all duration-standard ease-smooth disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs font-medium text-white dark:text-text-dark-primary bg-accent-primary rounded-button hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? '保存中…' : '保存更改'}
          </button>
        </div>
      </div>
    </div>
  );
}
