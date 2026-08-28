/**
 * SaveStatusIndicator
 *
 * Compact local-first save status for the page header:
 * a small dot + short label, replacing the old floating footer pill.
 */

import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useSaveStatus } from '../stores/useSaveStatus';
import type { SaveStatus } from '../stores/useSaveStatus';

const DOT_CLASS: Record<SaveStatus, string> = {
  saving: 'bg-accent-blue animate-pulse',
  saved: 'bg-accent-neon-green',
  error: 'bg-accent-red',
  idle: 'bg-accent-neon-green',
};

export const SaveStatusIndicator: React.FC = () => {
  const { status, lastSaveTime } = useSaveStatus();

  const label =
    status === 'saving'
      ? '保存中…'
      : status === 'error'
        ? '保存失败'
        : lastSaveTime
          ? formatDistanceToNow(lastSaveTime, { addSuffix: true, locale: zhCN })
          : '已本地保存';

  return (
    <div
      className="hidden items-center gap-1.5 rounded-full border border-border-light bg-surface-light/80 px-2.5 py-1 backdrop-blur md:flex dark:border-border-dark dark:bg-surface-dark/80"
      role="status"
      aria-live="polite"
      title="所有数据实时保存在本机浏览器中"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status] ?? DOT_CLASS.idle}`} aria-hidden="true" />
      <span className="text-[11px] font-medium leading-none text-text-light-tertiary dark:text-text-dark-tertiary">
        {label}
      </span>
    </div>
  );
};

export default SaveStatusIndicator;
