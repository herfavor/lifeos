import React, { useState } from 'react';
import { Sparkles, Trash2 } from 'lucide-react';
import { toast } from '../stores/useToastStore';
import { loadDemoData, clearDemoData, isDemoDataLoaded } from '../services/demoData/demoDataService';

/**
 * Entry point for the bundled sample dataset ("小张的一周").
 * Shown on the dashboard footer and in Settings → 系统与关于.
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
      <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated px-4 py-3 dark:border-border-dark dark:bg-surface-dark-elevated ${className}`}>
        <Sparkles className="h-4 w-4 shrink-0 text-accent-primary" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
          示例数据「小张的一周」已加载，随时可以删除。
        </p>
        <button
          type="button"
          onClick={handleClear}
          disabled={busy}
          className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-status-error/30 px-3 text-sm font-medium text-status-error hover:bg-status-error/10 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden /> 删除示例数据
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface-light-elevated px-4 py-3 dark:border-border-dark dark:bg-surface-dark-elevated ${className}`}>
      <Sparkles className="h-4 w-4 shrink-0 text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
        第一次用？加载示例数据逛一圈 —— 项目、任务、日程、笔记、收藏、习惯一应俱全，不会动你现有的内容。
      </p>
      <button
        type="button"
        onClick={handleLoad}
        disabled={busy}
        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border-light px-3 text-sm font-medium text-text-light-primary transition-colors hover:border-accent-primary hover:text-accent-primary disabled:opacity-50 dark:border-border-dark dark:text-text-dark-primary"
      >
        加载示例数据
      </button>
    </div>
  );
};
