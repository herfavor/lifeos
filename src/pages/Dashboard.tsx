import React, { Suspense, lazy, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  Palette,
  Plus,
  SlidersHorizontal,
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { BackgroundCustomizer, type BackgroundSettings } from '../components/BackgroundCustomizer';
import { DashboardTemplatePicker } from '../components/DashboardTemplatePicker';
import { DemoDataCard } from '../components/DemoDataCard';
import { HomeOverview } from '../components/dashboard/HomeOverview';
import { PageContent } from '../components/PageContent';
import { PresetManager } from '../components/PresetManager';
import { SortableWidget } from '../components/SortableWidget';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';
import { WidgetManager } from '../components/WidgetManager';
import { useWidgetStore } from '../stores/useWidgetStore';
import { getContentContrastClass } from '../utils/colorUtils';
import { getWidgetComponentMap, registerCustomWidget } from '../widgets/Dashboard/WidgetRegistry';

const CustomWidgetBuilder = lazy(() =>
  import('../components/CustomWidgetBuilder').then((module) => ({ default: module.CustomWidgetBuilder }))
);

const WidgetLoader = () => (
  <div className="h-56 animate-pulse rounded-xl border border-border-light bg-surface-light-elevated dark:border-border-dark dark:bg-surface-dark-elevated" />
);

function readBackgroundSettings(): BackgroundSettings {
  try {
    const saved = localStorage.getItem('dashboard-background');
    if (saved) return JSON.parse(saved) as BackgroundSettings;
  } catch {
    // A malformed legacy value should never prevent the home page from opening.
  }
  return { type: 'none', value: '', opacity: 100, blur: 0 };
}

/**
 * Home is a stable daily workflow. Optional widgets remain available as an
 * advanced, user-controlled layer instead of defining the first-run product.
 */
export const Dashboard: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [showPresetManager, setShowPresetManager] = useState(false);
  const [showBackgroundCustomizer, setShowBackgroundCustomizer] = useState(false);
  const [showWidgetBuilder, setShowWidgetBuilder] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [backgroundSettings, setBackgroundSettings] = useState<BackgroundSettings>(readBackgroundSettings);

  const enabledWidgets = useWidgetStore((state) => state.enabledWidgets);
  const widgetSizes = useWidgetStore((state) => state.widgetSizes);
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);
  const customWidgets = useWidgetStore((state) => state.customWidgets);

  const widgetComponents = useMemo(() => {
    for (const widget of customWidgets) registerCustomWidget(widget);
    return getWidgetComponentMap();
  }, [customWidgets]);

  const contentContrastClass = useMemo(() => {
    if (backgroundSettings.type === 'none' || !backgroundSettings.value) return '';
    return getContentContrastClass(backgroundSettings.value) || '';
  }, [backgroundSettings]);

  const pointerSensorOptions = useMemo(() => ({ activationConstraint: { distance: 6 } }), []);
  const keyboardSensorOptions = useMemo(() => ({ coordinateGetter: sortableKeyboardCoordinates }), []);
  const sensors = useSensors(
    useSensor(PointerSensor, pointerSensorOptions),
    useSensor(KeyboardSensor, keyboardSensorOptions)
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) {
      const oldIndex = enabledWidgets.indexOf(String(active.id));
      const newIndex = enabledWidgets.indexOf(String(over.id));
      if (oldIndex >= 0 && newIndex >= 0) {
        const nextOrder = [...enabledWidgets];
        const [moved] = nextOrder.splice(oldIndex, 1);
        nextOrder.splice(newIndex, 0, moved);
        reorderWidgets(nextOrder);
      }
    }
    setActiveId(null);
  };

  const handleBackgroundChange = (settings: BackgroundSettings) => {
    setBackgroundSettings(settings);
    localStorage.setItem('dashboard-background', JSON.stringify(settings));
  };

  return (
    <PageContent page="dashboard" className={`relative isolate ${contentContrastClass}`}>
      {backgroundSettings.type !== 'none' && (
        <div
          className="dashboard-background pointer-events-none fixed inset-0 z-0"
          style={{
            backgroundImage: backgroundSettings.value,
            backgroundSize: backgroundSettings.type === 'image' ? 'cover' : undefined,
            backgroundPosition: backgroundSettings.type === 'image' ? 'center' : undefined,
            backgroundAttachment: 'fixed',
            opacity: backgroundSettings.opacity / 100,
            filter: `blur(${backgroundSettings.blur}px)`,
          }}
        />
      )}

      <div className="relative z-10">
        <HomeOverview />

        <section className="mt-5 rounded-2xl border border-border-light bg-surface-light/95 dark:border-border-dark dark:bg-surface-dark-elevated/95">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left"
            aria-expanded={showAdvanced}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <LayoutDashboard className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-text-light-primary dark:text-text-dark-primary">我的扩展组件</span>
              <span className="block text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                {enabledWidgets.length > 0 ? `已启用 ${enabledWidgets.length} 个；按需展开，不干扰每日主流程` : '需要时再添加天气、工具或自定义信息'}
              </span>
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="border-t border-border-light px-5 pb-5 pt-4 dark:border-border-dark">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWidgetManager(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent-primary px-3.5 text-sm font-medium text-white hover:opacity-90"
                >
                  <Plus className="h-4 w-4" /> 管理组件
                </button>
                <button
                  type="button"
                  onClick={() => setShowWidgetBuilder(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-light px-3.5 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"
                >
                  <SlidersHorizontal className="h-4 w-4" /> 自定义组件
                </button>
                <button
                  type="button"
                  onClick={() => setShowPresetManager(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-light px-3.5 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"
                >
                  <LayoutDashboard className="h-4 w-4" /> 布局预设
                </button>
                <button
                  type="button"
                  onClick={() => setShowBackgroundCustomizer(true)}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-light px-3.5 text-sm font-medium text-text-light-primary hover:border-accent-primary dark:border-border-dark dark:text-text-dark-primary"
                >
                  <Palette className="h-4 w-4" /> 页面背景
                </button>
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event: DragStartEvent) => setActiveId(String(event.active.id))}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveId(null)}
              >
                <SortableContext items={enabledWidgets} strategy={rectSortingStrategy}>
                  {enabledWidgets.length > 0 ? (
                    <div className="dashboard-grid grid grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
                      {enabledWidgets.map((widgetId) => {
                        const isCustom = widgetId.startsWith('custom-');
                        const baseWidgetId = !isCustom && /^([a-z]+)-\d+$/.test(widgetId)
                          ? widgetId.split('-')[0]
                          : widgetId;
                        const WidgetComponent = widgetComponents[baseWidgetId];
                        if (!WidgetComponent) return null;

                        const size = widgetSizes[widgetId] ?? 1;
                        const sizeClass = size === 3
                          ? 'md:col-span-6 xl:col-span-12'
                          : size === 2
                            ? 'md:col-span-6 xl:col-span-6'
                            : 'md:col-span-3 xl:col-span-4';

                        return (
                          <SortableWidget key={widgetId} id={widgetId} className={sizeClass}>
                            <WidgetErrorBoundary widgetId={widgetId}>
                              <Suspense fallback={<WidgetLoader />}>
                                {isCustom || widgetId !== baseWidgetId ? (
                                  <WidgetComponent widgetId={widgetId} />
                                ) : (
                                  <WidgetComponent />
                                )}
                              </Suspense>
                            </WidgetErrorBoundary>
                          </SortableWidget>
                        );
                      })}
                    </div>
                  ) : (
                    <DashboardTemplatePicker onCustomize={() => setShowWidgetManager(true)} />
                  )}
                </SortableContext>

                <DragOverlay>
                  {activeId ? (
                    <div className="rounded-xl border border-accent-primary bg-surface-light-elevated px-5 py-4 text-sm font-medium text-text-light-primary shadow-lg dark:bg-surface-dark dark:text-text-dark-primary">
                      正在移动组件…
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          )}
        </section>

        <DemoDataCard className="mt-4" />
      </div>

      <WidgetManager isOpen={showWidgetManager} onClose={() => setShowWidgetManager(false)} />
      <PresetManager isOpen={showPresetManager} onClose={() => setShowPresetManager(false)} />
      <BackgroundCustomizer
        isOpen={showBackgroundCustomizer}
        onClose={() => setShowBackgroundCustomizer(false)}
        settings={backgroundSettings}
        onSettingsChange={handleBackgroundChange}
      />
      {showWidgetBuilder && (
        <Suspense fallback={null}>
          <CustomWidgetBuilder isOpen={showWidgetBuilder} onClose={() => setShowWidgetBuilder(false)} />
        </Suspense>
      )}
    </PageContent>
  );
};

export default Dashboard;
