import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';

interface RecurringEventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onThisEvent: () => void;
  onAllEvents: () => void;
  action: 'edit' | 'delete';
  eventTitle: string;
}

/**
 * RecurringEventDialog - Choice dialog for recurring events
 * User selects whether to modify this instance or all instances
 */
export const RecurringEventDialog: React.FC<RecurringEventDialogProps> = ({
  isOpen,
  onClose,
  onThisEvent,
  onAllEvents,
  action,
  eventTitle,
}) => {
  const handleThisEvent = () => {
    onThisEvent();
    onClose();
  };

  const handleAllEvents = () => {
    onAllEvents();
    onClose();
  };

  const title = action === 'edit' ? '编辑重复事件' : '删除重复事件';
  const Icon = action === 'edit' ? Pencil : Trash2;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4">
        {/* Icon + Message */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0"><Icon className="w-7 h-7 text-text-light-primary dark:text-text-dark-primary" /></div>
          <div className="flex-1">
            <p className="text-text-light-primary dark:text-text-dark-primary font-medium mb-2">
              "{eventTitle}"
            </p>
            <p className="text-text-light-secondary dark:text-text-dark-secondary">
              这是一个重复事件。你希望{action === 'edit' ? '编辑' : '删除'}仅此一次事件，还是整个系列中的所有事件？
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleThisEvent}
            className="w-full px-4 py-3 rounded-button bg-accent-blue hover:bg-accent-blue-hover text-white font-medium transition-all duration-standard ease-smooth text-left"
          >
            <div className="font-semibold">仅此事件</div>
            <div className="text-sm opacity-90 mt-1">
              {action === 'edit'
                ? '仅修改此一次事件'
                : '仅删除此一次事件'}
            </div>
          </button>
          <button
            onClick={handleAllEvents}
            className="w-full px-4 py-3 rounded-button bg-accent-primary hover:bg-accent-primary-hover text-white font-medium transition-all duration-standard ease-smooth text-left"
          >
            <div className="font-semibold">系列中的所有事件</div>
            <div className="text-sm opacity-90 mt-1">
              {action === 'edit'
                ? '修改所有重复事件'
                : '删除所有重复事件'}
            </div>
          </button>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-button border border-border-light dark:border-border-dark text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-all duration-standard ease-smooth"
            autoFocus
          >
            取消
          </button>
        </div>
      </div>
    </Modal>
  );
};
