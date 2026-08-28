import React from 'react';
import FileUpload from '../../../components/FileUpload';
import AttachmentList from '../../../components/AttachmentList';
import type { TaskAttachment } from '../../../types';

type CoverMode = 'fit' | 'fill';

interface AttachmentsTabContentProps {
  attachments: TaskAttachment[];
  coverMode?: CoverMode;
  onUpload: (file: { filename: string; fileType: string; fileSize: number; dataUrl: string }) => void;
  onDelete: (attachmentId: string) => void;
  onPreview: (attachment: TaskAttachment) => void;
  onCoverModeChange: (mode: CoverMode) => void;
}

/**
 * Attachments Tab Content
 * Handles file uploads, attachment list, and cover mode settings.
 */
export const AttachmentsTabContent: React.FC<AttachmentsTabContentProps> = ({
  attachments,
  coverMode,
  onUpload,
  onDelete,
  onPreview,
  onCoverModeChange,
}) => {
  const hasImageAttachments = attachments.some(a => a.fileType.startsWith('image/'));

  return (
    <div className="space-y-4">
      {/* File Upload */}
      <div>
        <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
          上传文件
        </h4>
        <FileUpload onUpload={onUpload} />
      </div>

      {/* Attachment List */}
      <div>
        <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
          附件（{attachments.length}）
        </h4>
        <AttachmentList
          attachments={attachments}
          onDelete={onDelete}
          onPreview={onPreview}
        />
      </div>

      {/* Card Cover Mode Selector (only show when image attachments exist) */}
      {hasImageAttachments && (
        <div>
          <h4 className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary mb-3">
            卡片封面显示
          </h4>
          <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary mb-2">
            选择卡片上第一张图片的显示方式
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onCoverModeChange('fit')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                coverMode === 'fit' || !coverMode
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              适应（显示完整图片）
            </button>
            <button
              onClick={() => onCoverModeChange('fill')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                coverMode === 'fill'
                  ? 'bg-accent-blue text-white'
                  : 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light dark:hover:bg-surface-dark'
              }`}
            >
              填充（裁剪以适应）
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
