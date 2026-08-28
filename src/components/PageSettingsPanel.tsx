/**
 * Page Settings Panel
 *
 * Displays page-specific settings in a modal
 * Currently supports Dashboard widget customization
 */

import React from 'react';
import { Modal } from './Modal';
import { WidgetManager } from './WidgetManager';

interface PageSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pagePath: string;
}

export const PageSettingsPanel: React.FC<PageSettingsPanelProps> = ({
  isOpen,
  onClose,
  pagePath,
}) => {
  // Dashboard settings - show widget manager
  if (pagePath === '/') {
    return <WidgetManager isOpen={isOpen} onClose={onClose} />;
  }

  // Notes settings (placeholder for future)
  if (pagePath === '/notes') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="笔记设置">
        <div className="space-y-4">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            笔记功能实现后将提供笔记设置。
          </p>
        </div>
      </Modal>
    );
  }

  // Planning settings (placeholder for future)
  if (pagePath === '/planning') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="规划设置">
        <div className="space-y-4">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            需要时将提供规划设置。
          </p>
        </div>
      </Modal>
    );
  }

  // Tasks settings (placeholder for future)
  if (pagePath === '/tasks') {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="任务设置">
        <div className="space-y-4">
          <p className="text-text-light-secondary dark:text-text-dark-secondary">
            需要时将提供任务设置。
          </p>
        </div>
      </Modal>
    );
  }

  // Default: no settings
  return null;
};
