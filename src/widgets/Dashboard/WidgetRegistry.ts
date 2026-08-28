/**
 * Dashboard widget registry.
 *
 * Built-in widgets are intentionally limited to LifeOS domain data and local
 * productivity views. Generic portal/news/finance/entertainment widgets do not
 * belong in the core repository; custom widgets remain available for users who
 * explicitly want external data sources.
 */

import { lazy, type LazyExoticComponent, type FC } from 'react';
import type { CustomWidgetConfig } from '../../stores/useWidgetStore';

export type WidgetCategory = 'core' | 'productivity' | 'custom';

export interface WidgetComponentProps {
  widgetId?: string;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: WidgetCategory;
  defaultEnabled: boolean;
  component?: LazyExoticComponent<FC<WidgetComponentProps>>;
}

const WIDGET_FILE_NAMES: Record<string, string> = {
  taskssummary: 'TasksSummaryWidget',
  upcomingevents: 'UpcomingEventsWidget',
  recentnotes: 'RecentNotesWidget',
  habitsummary: 'HabitSummaryWidget',
  pomodoro: 'PomodoroWidget',
  bookmarks: 'BookmarksWidget',
  activityfeed: 'ActivityFeedWidget',
  energytracker: 'EnergyTrackerWidget',
  portfolio: 'PortfolioWidget',
  weeklyinsights: 'WeeklyInsightsWidget',
  quickadd: 'QuickAddWidget',
  shortcuts: 'ShortcutsWidget',
};

const widgetModules = import.meta.glob<{ [key: string]: FC<WidgetComponentProps> }>([
  './TasksSummaryWidget.tsx',
  './UpcomingEventsWidget.tsx',
  './RecentNotesWidget.tsx',
  './HabitSummaryWidget.tsx',
  './PomodoroWidget.tsx',
  './BookmarksWidget.tsx',
  './ActivityFeedWidget.tsx',
  './EnergyTrackerWidget.tsx',
  './PortfolioWidget.tsx',
  './WeeklyInsightsWidget.tsx',
  './QuickAddWidget.tsx',
  './ShortcutsWidget.tsx',
]);

function createLazyWidget(widgetId: string): LazyExoticComponent<FC<WidgetComponentProps>> | undefined {
  const fileName = WIDGET_FILE_NAMES[widgetId];
  if (!fileName) return undefined;

  const loader = widgetModules[`./${fileName}.tsx`];
  if (!loader) return undefined;

  return lazy(() =>
    loader().then((module) => ({
      default: module[fileName] as FC<WidgetComponentProps>,
    }))
  );
}

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  taskssummary: {
    id: 'taskssummary',
    name: '任务概览',
    description: '查看任务数量与当前状态',
    icon: '📊',
    category: 'core',
    defaultEnabled: false,
  },
  upcomingevents: {
    id: 'upcomingevents',
    name: '即将到来的日程',
    description: '查看接下来的日历事件',
    icon: '📅',
    category: 'core',
    defaultEnabled: false,
  },
  recentnotes: {
    id: 'recentnotes',
    name: '最近笔记',
    description: '快速回到最近更新的笔记',
    icon: '📝',
    category: 'core',
    defaultEnabled: false,
  },
  habitsummary: {
    id: 'habitsummary',
    name: '习惯概览',
    description: '查看今日习惯与连续完成情况',
    icon: '🎯',
    category: 'productivity',
    defaultEnabled: false,
  },
  pomodoro: {
    id: 'pomodoro',
    name: '番茄钟',
    description: '使用 LifeOS 统一番茄钟状态',
    icon: '⏱️',
    category: 'productivity',
    defaultEnabled: false,
  },
  bookmarks: {
    id: 'bookmarks',
    name: '收藏',
    description: '快速访问 LifeOS 中保存的链接',
    icon: '🔖',
    category: 'core',
    defaultEnabled: false,
  },
  activityfeed: {
    id: 'activityfeed',
    name: '活动记录',
    description: '查看 LifeOS 各模块的最近活动',
    icon: '📊',
    category: 'core',
    defaultEnabled: false,
  },
  energytracker: {
    id: 'energytracker',
    name: '精力追踪',
    description: '记录并查看精力变化',
    icon: '⚡',
    category: 'productivity',
    defaultEnabled: false,
  },
  portfolio: {
    id: 'portfolio',
    name: '项目组合',
    description: '查看跨项目的健康度与任务概览',
    icon: '📂',
    category: 'productivity',
    defaultEnabled: false,
  },
  weeklyinsights: {
    id: 'weeklyinsights',
    name: '每周洞察',
    description: '查看每周回顾中的关键结果',
    icon: '📈',
    category: 'productivity',
    defaultEnabled: false,
  },
  quickadd: {
    id: 'quickadd',
    name: '快速添加',
    description: '快速创建任务、笔记或日程',
    icon: '⚡',
    category: 'core',
    defaultEnabled: false,
  },
  shortcuts: {
    id: 'shortcuts',
    name: '快捷键',
    description: '查看 LifeOS 常用键盘快捷键',
    icon: '⌨️',
    category: 'productivity',
    defaultEnabled: false,
  },
};

export function registerCustomWidget(config: CustomWidgetConfig): void {
  WIDGET_REGISTRY[config.id] = {
    id: config.id,
    name: config.name,
    description: config.description,
    icon: config.icon,
    category: 'custom',
    defaultEnabled: false,
  };
}

export function unregisterCustomWidget(id: string): void {
  delete WIDGET_REGISTRY[id];
}

export function getWidgetsByCategory(category: WidgetCategory): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter((widget) => widget.category === category);
}

export function getAllWidgets(): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY);
}

export function getWidget(id: string): WidgetDefinition | undefined {
  return WIDGET_REGISTRY[id];
}

export function getDefaultEnabledWidgets(): string[] {
  return Object.values(WIDGET_REGISTRY)
    .filter((widget) => widget.defaultEnabled)
    .map((widget) => widget.id);
}

const customWidgetModule = import.meta.glob<{ CustomWidget: FC<WidgetComponentProps> }>(
  './CustomWidget.tsx'
);

let cachedCustomWidget: LazyExoticComponent<FC<WidgetComponentProps>> | undefined;

function getCustomWidgetLazy(): LazyExoticComponent<FC<WidgetComponentProps>> {
  if (!cachedCustomWidget) {
    const loader = customWidgetModule['./CustomWidget.tsx'];
    if (!loader) throw new Error('Custom widget module is unavailable');
    cachedCustomWidget = lazy(() => loader().then((module) => ({ default: module.CustomWidget })));
  }
  return cachedCustomWidget;
}

export function getWidgetComponent(id: string): LazyExoticComponent<FC<WidgetComponentProps>> | undefined {
  if (id.startsWith('custom-')) return getCustomWidgetLazy();
  return createLazyWidget(id);
}

export function getWidgetComponentMap(): Record<string, LazyExoticComponent<FC<WidgetComponentProps>>> {
  const map: Record<string, LazyExoticComponent<FC<WidgetComponentProps>>> = {};
  for (const id of Object.keys(WIDGET_REGISTRY)) {
    const component = id.startsWith('custom-') ? getCustomWidgetLazy() : createLazyWidget(id);
    if (component) map[id] = component;
  }
  return map;
}
