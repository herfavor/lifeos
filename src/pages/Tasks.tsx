import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GanttView } from '../components/GanttView';
import { ExportTasksModal } from '../components/ExportTasksModal';
import { FileDown } from 'lucide-react';
import { PageContent } from '../components/PageContent';
import { HabitsContent } from './Habits';
import { ResourceUtilizationChart } from '../components/charts/ResourceUtilizationChart';

// Lazy load Kanban widget
const Kanban = lazy(() =>
  import('../widgets/Kanban').then((module) => ({ default: module.Kanban }))
);

const WidgetLoader = () => (
  <div className="h-[600px] animate-pulse rounded-xl border border-border-light p-4 dark:border-border-dark">
    <div className="h-full rounded-lg bg-surface-light-elevated dark:bg-surface-dark-elevated" />
  </div>
);

// Advanced task surfaces remain reachable from their dedicated sidebar links
// and legacy URLs, but the primary /tasks page is deliberately just “tasks”.
type TabType = 'tasks' | 'timeline' | 'habits' | 'resources';
const VALID_TABS: TabType[] = ['tasks', 'timeline', 'habits', 'resources'];

const ADVANCED_LABELS: Record<Exclude<TabType, 'tasks'>, string> = {
  timeline: '任务时间线',
  habits: '习惯',
  resources: '资源',
};

export const Tasks: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromUrl = (): TabType => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && VALID_TABS.includes(tab as TabType)) return tab as TabType;

    // Legacy support
    const view = params.get('view');
    if (view === 'gantt') return 'timeline';
    return 'tasks';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getTabFromUrl);
  const [showExportModal, setShowExportModal] = useState(false);

  // Older sidebar/bookmarks used /tasks?tab=inbox. Inbox now has one clear home.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'inbox') navigate('/inbox', { replace: true });
  }, [location.search, navigate]);

  useEffect(() => {
    const next = getTabFromUrl();
    if (next !== activeTab) setActiveTab(next);
  }, [location.search]);

  useEffect(() => {
    document.title = activeTab === 'tasks'
      ? '任务 · LifeOS'
      : `${ADVANCED_LABELS[activeTab as Exclude<TabType, 'tasks'>]} · LifeOS`;
  }, [activeTab]);

  const isAdvancedView = activeTab !== 'tasks';

  return (
    <PageContent page="tasks">
      <div className="mb-3 flex min-h-9 flex-wrap items-center justify-between gap-3">
        {isAdvancedView ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/tasks', { replace: true })}
              className="text-sm font-medium text-accent-primary hover:opacity-80"
            >
              ← 返回任务
            </button>
            <span className="text-sm text-text-light-tertiary dark:text-text-dark-tertiary">
              {ADVANCED_LABELS[activeTab as Exclude<TabType, 'tasks'>]}
            </span>
          </div>
        ) : (
          <span className="text-xs text-text-light-tertiary dark:text-text-dark-tertiary">只看明确、可执行的下一步；未决定的留在收件箱。</span>
        )}

        {(activeTab === 'tasks' || activeTab === 'timeline') && (
          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-light px-3 text-sm text-text-light-secondary transition-colors hover:border-accent-primary/50 hover:text-accent-primary dark:border-border-dark dark:text-text-dark-secondary"
            title="将任务导出为 Markdown"
          >
            <FileDown className="h-4 w-4" />
            导出
          </button>
        )}
      </div>

      <div className="min-h-[600px]">
        {activeTab === 'tasks' && (
          <Suspense fallback={<WidgetLoader />}>
            <Kanban />
          </Suspense>
        )}
        {activeTab === 'timeline' && (
          <div className="rounded-xl border border-border-light dark:border-border-dark">
            <GanttView />
          </div>
        )}
        {activeTab === 'habits' && <HabitsContent />}
        {activeTab === 'resources' && (
          <div className="rounded-xl border border-border-light p-5 dark:border-border-dark">
            <h2 className="text-base font-semibold text-text-light-primary dark:text-text-dark-primary">
              资源利用率
            </h2>
            <div className="mt-4">
              <ResourceUtilizationChart height={400} />
            </div>
            <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
              资源属于高级规划能力；在设置中管理资源，在任务详情里分配。
            </p>
          </div>
        )}
      </div>

      <ExportTasksModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />
    </PageContent>
  );
};
