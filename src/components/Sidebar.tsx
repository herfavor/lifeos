import React, { useEffect, useState, useRef, lazy, Suspense, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSidebarStore } from '../stores/useSidebarStore';
import { useSidebarNavStore } from '../stores/useSidebarNavStore';
import { useNavExpansionStore } from '../stores/useNavExpansionStore';
import { useThemeStore } from '../stores/useThemeStore';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '../stores/useSettingsStore';
import { BREAKPOINTS, useMediaQuery } from '../hooks/useMediaQuery';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlarmClock,
  BatteryCharging,
  Bookmark,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  FileStack,
  FolderKanban,
  GanttChartSquare,
  Home,
  Inbox,
  ListChecks,
  Moon,
  Network,
  NotebookPen,
  PackageOpen,
  PanelLeftClose,
  PanelLeftOpen,
  Repeat2,
  Settings,
  Settings2,
  Sparkles,
  Sun,
  Target,
  Timer,
  Dumbbell,
  Workflow,
  Briefcase,
} from 'lucide-react';
import {
  CORE_FEATURES,
  DRAGGABLE_CORE_IDS,
  DRAGGABLE_CORE_FEATURES,
  ADVANCED_FEATURES,
  type FeatureDefinition,
} from '../config/features';

// Lazy load sidebar panels to reduce initial bundle
const PageSettingsPanel = lazy(() => import('./PageSettingsPanel').then(m => ({ default: m.PageSettingsPanel })));
const ActiveTimerIndicator = lazy(() => import('./ActiveTimerIndicator').then(m => ({ default: m.ActiveTimerIndicator })));

// Storage key used inside useNavExpansionStore for the "更多功能" panel state
const MORE_PANEL_KEY = '__lifeos-more';

/** Shared row styling for navigation entries */
const NAV_ROW_CLASS = `
  flex items-center gap-3 px-3 h-11 rounded-button
  transition-all duration-standard ease-smooth
  relative group w-full text-left
`;

const activeRowClass = `${NAV_ROW_CLASS}
  bg-accent-primary/10 text-accent-primary ring-1 ring-inset ring-accent-primary/15`;

const inactiveRowClass = `${NAV_ROW_CLASS}
  text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated`;

const NAV_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  'ai-assistant': Sparkles,
  today: CalendarDays,
  inbox: Inbox,
  projects: FolderKanban,
  tasks: ListChecks,
  calendar: CalendarRange,
  notes: NotebookPen,
  bookmarks: Bookmark,
  review: ChartNoAxesCombined,
  'time-tracking': Timer,
  pomodoro: AlarmClock,
  focus: Target,
  habits: Dumbbell,
  gantt: GanttChartSquare,
  'knowledge-graph': Network,
  retrospective: Repeat2,
  energy: BatteryCharging,
  availability: CalendarCheck2,
  'docs-center': FileStack,
  automations: Workflow,
  portfolio: Briefcase,
};

/**
 * LifeOS main sidebar.
 *
 * Navigation is driven by the central Feature Registry
 * (src/config/features.ts):
 *  - core features render directly in the sidebar
 *  - advanced features live behind the "更多功能" disclosure
 *  - hidden features are not listed here at all (routes stay available)
 */
export const Sidebar: React.FC = () => {
  const { isCollapsed, toggleCollapse, isMobileMenuOpen, setMobileMenuOpen } = useSidebarStore();
  const { mode, toggleTheme } = useThemeStore();
  const logoSrc = mode === 'dark' ? '/images/logos/lifeos-logo-white.svg' : '/images/logos/lifeos-logo.svg';
  const iconSrc = '/images/logos/lifeos-icon.svg';
  const navOrder = useSidebarNavStore((state) => state.navOrder);
  const setNavOrder = useSidebarNavStore((state) => state.setNavOrder);
  const { isExpanded, toggleExpanded } = useNavExpansionStore();
  const location = useLocation();
  const [pageSettingsOpen, setPageSettingsOpen] = useState<string | null>(null);
  const [isDisablingClicks, setIsDisablingClicks] = useState(false);
  const disableTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const dailyNotesEnabled = useSettingsStore((state) => state.dailyNotes.enabled);
  const isMobile = useMediaQuery(BREAKPOINTS.mobile);
  const mobileSidebarHidden = isMobile && !isMobileMenuOpen;
  const moreExpanded = isExpanded(MORE_PANEL_KEY);

  // Split core features into the three rendered groups
  const headFeatures = useMemo(
    () =>
      CORE_FEATURES.filter(
        (f) => !DRAGGABLE_CORE_IDS.includes(f.id) && f.id !== 'review'
      ),
    []
  );

  // Sort draggable workspace features by saved order
  const sortedDraggableFeatures = useMemo(() => {
    return [...DRAGGABLE_CORE_FEATURES].sort((a, b) => {
      const aIndex = navOrder.indexOf(a.id);
      const bIndex = navOrder.indexOf(b.id);
      // If id not found in saved order, keep canonical order at the end
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
  }, [navOrder]);

  const tailFeatures = useMemo(
    () => CORE_FEATURES.filter((f) => f.id === 'review'),
    []
  );

  // Check if a nav path is active (handles both pathname and query params)
  const isActive = (path: string) => {
    if (!path) return false;
    // Handle paths with query params (e.g., /tasks?tab=inbox)
    if (path.includes('?')) {
      const [pathname, query] = path.split('?');
      if (location.pathname !== pathname) return false;
      const params = new URLSearchParams(query);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, value] of params.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    }
    if (location.pathname !== path) return false;

    // Query-specific core entries take precedence over their parent page.
    // Example: /tasks?tab=inbox highlights 收件箱, not both 收件箱 and 任务.
    return !CORE_FEATURES.some((feature) => {
      if (!feature.path?.startsWith(`${path}?`)) return false;
      const query = feature.path.split('?')[1];
      const expected = new URLSearchParams(query);
      const current = new URLSearchParams(location.search);
      return Array.from(expected.entries()).every(([key, value]) => current.get(key) === value);
    });
  };

  // Configure drag sensors with keyboard support for accessibility
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = () => {
    // Clear any existing timeout to prevent race conditions
    if (disableTimeoutRef.current) {
      clearTimeout(disableTimeoutRef.current);
    }
    setIsDisablingClicks(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = navOrder.indexOf(active.id as string);
      const newIndex = navOrder.indexOf(over.id as string);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(navOrder, oldIndex, newIndex);
        setNavOrder(newOrder);
      }
    }

    // Re-enable clicks after a delay to prevent accidental navigation
    disableTimeoutRef.current = setTimeout(() => {
      setIsDisablingClicks(false);
      disableTimeoutRef.current = null;
    }, 150);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (disableTimeoutRef.current) {
        clearTimeout(disableTimeoutRef.current);
      }
    };
  }, []);

  const handlePageSettings = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    setPageSettingsOpen(path);
  };

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, setMobileMenuOpen]);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapse]);

  // Keyboard shortcut: Cmd/Ctrl + D to open today's daily note
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'd' && dailyNotesEnabled) {
        e.preventDefault();
        navigate('/notes?daily=true');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dailyNotesEnabled, navigate]);

  /**
   * Render one core/advanced feature row.
   * Every feature is a plain router link. `handleProps` (dnd-kit
   * listeners/attributes) are attached to the icon, which acts as the drag
   * handle for draggable items.
   */
  const renderFeatureRow = (
    feature: FeatureDefinition,
    handleProps?: Record<string, unknown>
  ) => {
    const active = isActive(feature.path ?? '');
    const rowClass = `${active ? activeRowClass : inactiveRowClass}${handleProps ? ' cursor-grab active:cursor-grabbing' : ''}`;
    const FeatureIcon = NAV_ICONS[feature.id];

    const content = (
      <>
        {/* Active indicator (left accent) */}
        {active && feature.path && (
          <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent-primary rounded-r" />
        )}

        {/* Icon — also the drag handle for draggable items */}
        <span
          {...(handleProps ?? {})}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${active ? 'bg-accent-primary text-white' : 'text-text-light-tertiary group-hover:text-text-light-primary dark:text-text-dark-tertiary dark:group-hover:text-text-dark-primary'} ${handleProps ? 'cursor-grab active:cursor-grabbing' : ''}`}
          role={handleProps ? 'button' : undefined}
          aria-label={handleProps ? `拖动${feature.label}以重新排序` : undefined}
          tabIndex={handleProps ? 0 : undefined}
          aria-hidden={handleProps ? undefined : true}
        >
          {FeatureIcon ? <FeatureIcon className="h-[18px] w-[18px]" /> : feature.icon}
        </span>

        {!isCollapsed && (
          <span className="flex-1 text-base leading-5 font-medium truncate">
            {feature.label}
          </span>
        )}

        {/* Page Settings Icon (dashboard only, shown on hover) */}
        {feature.id === 'home' && !isCollapsed && (
          <button
            onClick={(e) => handlePageSettings(e, feature.path!)}
            className="
              opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100
              w-5 h-5 flex items-center justify-center flex-shrink-0
              text-text-light-secondary dark:text-text-dark-secondary
              hover:text-text-light-primary dark:text-text-dark-primary
              transition-opacity duration-200
            "
            title="页面设置"
            aria-label={`${feature.label}的页面设置`}
          >
            <Settings2 className="h-4 w-4" />
          </button>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <span className="
            absolute left-full ml-2 px-2 py-1
            bg-surface-light-elevated dark:bg-surface-dark-elevated
            text-text-light-primary dark:text-text-dark-primary text-xs rounded
            opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100
            pointer-events-none transition-opacity duration-200
            whitespace-nowrap z-50
          ">
            {feature.label}
          </span>
        )}
      </>
    );

    return (
      <Link
        key={feature.id}
        to={feature.path!}
        onClick={(e) => {
          if (isDisablingClicks) {
            e.preventDefault();
          }
        }}
        className={rowClass}
        style={{ pointerEvents: isDisablingClicks ? 'none' : 'auto' }}
        title={isCollapsed ? feature.label : undefined}
        aria-current={active ? 'page' : undefined}
      >
        {content}
      </Link>
    );
  };

  /** Sortable wrapper around a draggable feature row */
  const SortableFeature = ({ feature }: { feature: FeatureDefinition }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: feature.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <li
        ref={setNodeRef}
        style={{ ...style, pointerEvents: isDisablingClicks ? 'none' : 'auto' }}
        {...attributes}
      >
        {renderFeatureRow(feature, { ...listeners, tabIndex: 0 })}
      </li>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="主导航侧边栏"
        aria-hidden={mobileSidebarHidden || undefined}
        inert={mobileSidebarHidden || undefined}
        className={`
          fixed left-0 top-0 h-screen
          bg-surface-light dark:bg-surface-dark
          border-r border-border-light dark:border-border-dark
          transition-all duration-200 ease-in-out
          flex flex-col
          z-40
          ${isCollapsed ? 'w-[64px]' : 'w-[224px]'}

          ${/* Mobile: slide in/out as drawer */ ''}
          md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
      {/* Logo Section */}
      <div className="border-b border-border-light px-4 py-4 dark:border-border-dark">
        <Link to="/" className="flex flex-col items-center overflow-hidden" aria-label="LifeOS 首页">
          {!isCollapsed ? (
            <>
              <img
                src={logoSrc}
                alt="LifeOS"
                className="w-full h-auto object-contain"
              />
              <p className="mt-1 w-full text-center text-xs tracking-[0.18em] text-text-light-secondary dark:text-text-dark-secondary">
                本地优先的个人管理平台
              </p>
            </>
          ) : (
            <img
              src={iconSrc}
              alt="LifeOS"
              className="w-9 h-9 object-contain"
            />
          )}
        </Link>
      </div>

      {/* Navigation Items */}
      <nav aria-label="主导航" className="flex-1 overflow-y-auto overflow-x-hidden py-3">
        <ul className="space-y-1 px-2.5">
          {/* Fixed head section (首页 / AI 指挥中心 / 今天 / 收件箱) */}
          {headFeatures.map((f) => (
            <li key={f.id}>{renderFeatureRow(f)}</li>
          ))}

          {/* Draggable workspace section (项目 / 任务 / 日程 / 笔记 / 收藏) */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedDraggableFeatures.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {sortedDraggableFeatures.map((feature) => (
                <SortableFeature key={feature.id} feature={feature} />
              ))}
            </SortableContext>
          </DndContext>

          {/* Trailing section (回顾) */}
          {tailFeatures.map((f) => (
            <li key={f.id}>{renderFeatureRow(f)}</li>
          ))}

          {/* 更多功能 stays in the same scroll flow: expanding never covers or pushes fixed footer controls. */}
          <li className="pt-2">
            <button
              onClick={() => toggleExpanded(MORE_PANEL_KEY)}
              className={`${inactiveRowClass} ${moreExpanded ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated' : ''}`}
              aria-expanded={moreExpanded}
              aria-controls="lifeos-more-panel"
              title={isCollapsed ? '更多功能' : undefined}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden="true">
                <PackageOpen className="h-[18px] w-[18px]" />
              </span>
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-sm leading-5 font-medium text-left truncate">更多功能</span>
                  <span
                    className={`text-xs text-text-light-secondary dark:text-text-dark-secondary transition-transform duration-200 ${moreExpanded ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  >
                    ▶
                  </span>
                </>
              )}
            </button>

            {moreExpanded && !isCollapsed && (
              <div id="lifeos-more-panel" className="mt-1 space-y-0.5 pl-2">
                {ADVANCED_FEATURES.map((f) => {
                  const AdvancedIcon = NAV_ICONS[f.id];
                  return (
                    <Link
                      key={f.id}
                      to={f.path || '#'}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-light-secondary transition-colors hover:bg-surface-light-elevated hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:bg-surface-dark-elevated dark:hover:text-text-dark-primary"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden="true">
                        {AdvancedIcon ? <AdvancedIcon className="h-4 w-4" /> : f.icon}
                      </span>
                      <span className="truncate">{f.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </li>
        </ul>
      </nav>

      {/* Compact active-timer indicator — renders nothing while idle */}
      <Suspense fallback={null}>
        <ActiveTimerIndicator />
      </Suspense>

      {/* Bottom Section */}
      <div className="border-t border-border-light dark:border-border-dark p-2 space-y-1">
        {/* Settings (Fixed) */}
        <Link
          to="/settings"
          className={`
            w-full flex items-center gap-3 px-3 h-11 rounded-button
            ${isActive('/settings')
              ? 'bg-surface-light-elevated dark:bg-surface-dark-elevated text-text-light-primary dark:text-text-dark-primary'
              : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
            }
            transition-all duration-standard ease-smooth
            group relative
          `}
          title={isCollapsed ? '设置' : undefined}
          aria-current={isActive('/settings') ? 'page' : undefined}
        >
          {/* Active indicator (left accent) */}
          {isActive('/settings') && (
            <div className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent-primary rounded-r" />
          )}

          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary"><Settings className="h-[18px] w-[18px]" /></span>
          {!isCollapsed && (
            <span className="flex-1 text-base leading-5 font-medium text-left truncate">
              设置
            </span>
          )}
          {isCollapsed && (
            <div className="
              absolute left-full ml-2 px-2 py-1
              bg-surface-dark text-text-dark-primary text-xs rounded
              opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100
              pointer-events-none transition-opacity duration-200
              whitespace-nowrap z-50
            ">
              设置
            </div>
          )}
        </Link>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`
            w-full flex items-center gap-3 px-3 h-11 rounded-button
            text-text-light-secondary dark:text-text-dark-secondary
            hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated
            transition-all duration-standard ease-smooth
            group relative
          `}
          title={isCollapsed ? (mode === 'dark' ? '浅色模式' : '深色模式') : undefined}
          aria-label={mode === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden="true">
            {mode === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </span>
          {!isCollapsed && (
            <span className="flex-1 text-base leading-5 font-medium text-left">
              {mode === 'dark' ? '浅色模式' : '深色模式'}
            </span>
          )}
          {isCollapsed && (
            <div className="
              absolute left-full ml-2 px-2 py-1
              bg-surface-dark text-text-dark-primary text-xs rounded
              opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100
              pointer-events-none transition-opacity duration-200
              whitespace-nowrap z-50
            ">
              {mode === 'dark' ? '浅色模式' : '深色模式'}
            </div>
          )}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleCollapse}
          className={`
            w-full flex items-center gap-3 px-3 h-11 rounded-button
            text-text-light-secondary dark:text-text-dark-secondary
            hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated
            transition-all duration-standard ease-smooth
            group relative
          `}
          title={isCollapsed ? '展开侧边栏' : undefined}
          aria-label={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden="true">
            {isCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </span>
          {!isCollapsed && (
            <span className="flex-1 text-base leading-5 font-medium text-left">
              折叠
            </span>
          )}
          {isCollapsed && (
            <div className="
              absolute left-full ml-2 px-2 py-1
              bg-surface-dark text-text-dark-primary text-xs rounded
              opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100
              pointer-events-none transition-opacity duration-200
              whitespace-nowrap z-50
            ">
              展开侧边栏
            </div>
          )}
        </button>
      </div>
    </aside>

    {/* Page Settings Panel (lazy loaded) */}
    <Suspense fallback={null}>
      {pageSettingsOpen && (
        <PageSettingsPanel
          isOpen={true}
          onClose={() => setPageSettingsOpen(null)}
          pagePath={pageSettingsOpen}
        />
      )}
    </Suspense>
    </>
  );
};
