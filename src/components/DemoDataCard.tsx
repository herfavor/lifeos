import React, { useState } from 'react';
import { PartyPopper, Sparkles, Trash2 } from 'lucide-react';
import { toast } from '../stores/useToastStore';
import { loadDemoData, clearDemoData, isDemoDataLoaded } from '../services/demoData/demoDataService';

/**
 * Entry point for the bundled sample dataset ("小张的一周").
 * Sits prominently under the dashboard hero; 系统与关于 reuses it as a
 * secondary entry. Unloaded state is a highlighted banner; after loading
 * it quiets down to a slim strip with the removal action.
 */
export const DemoDataCard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [loaded, setLoaded] = useState(isDemoDataLoaded);
  const [busy, setBusy] = useState(false);

  const handleLoad = () => {
    setBusy(true);
    try {
      loadDemoData();
      setLoaded(true);
      toast.success('示例数据已加载', '去首页、任务、日程、笔记逛一圈，感受完整的工作流。');
    } finally {
      setBusy(false);
    }
  };

  const handleClear = () => {
    setBusy(true);
    try {
      clearDemoData();
      setLoaded(false);
      toast.success('示例数据已删除', '你自己的内容不受影响。');
    } finally {
      setBusy(false);
    }
  };

  if (loaded) {
    return (
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated px-4 py-2.5 dark:border-border-dark dark:bg-surface-dark-elevated ${className}`}>
        <PartyPopper className="h-4 w-4 shrink-0 text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          示例数据「小张的一周」已加载，逛完可以随时删除。
        </p>
        <button
          type="button"
          onClick={handleClear}
          disabled={busy}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border-light px-2.5 text-xs font-medium text-text-light-secondary transition-colors hover:border-status-error/40 hover:text-status-error disabled:opacity-50 dark:border-border-dark dark:text-text-dark-secondary"
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden /> 删除示例数据
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-4 rounded-xl border border-accent-primary/30 bg-accent-primary/10 px-4 py-3 dark:border-accent-primary/30 dark:bg-accent-primary/15 ${className}`}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-primary text-white">
        <Sparkles className="h-4.5 w-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">
          第一次用？加载示例数据逛一圈
        </p>
        <p className="mt-0.5 text-xs text-text-light-secondary dark:text-text-dark-secondary">
          「小张的一周」自带项目、任务、日程、笔记、收藏和习惯，只合并不覆盖，随时可一键删除。
        </p>
      </div>
      <button
        type="button"
        onClick={handleLoad}
        disabled={busy}
        className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg bg-accent-primary px-4 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4" aria-hidden /> 加载示例数据
      </button>
    </div>
  );
};
