/**
 * LifeOS Feature Registry
 *
 * Single, centralized place that decides which LifeOS modules are visible
 * in the primary navigation and at which tier they live.
 *
 * Tiers:
 *  - 'core'     → shown in the main sidebar by default
 *  - 'advanced' → grouped under the "更多功能" disclosure in the sidebar
 *                 (and still reachable via routes / command palette)
 *  - 'hidden'   → source code, routes and data are fully preserved, but no
 *                 entry point is exposed in the default UI. Users can still
 *                 reach these via direct URL or in-page tabs.
 *
 * IMPORTANT:
 *  - This registry only controls VISIBILITY. It never deletes code,
 *    components or persisted data.
 *  - Routes for hidden features remain registered in App.tsx.
 *  - To promote/demote a feature, change its `tier` here — nothing else.
 *
 * Note on persistence: sidebar order (useSidebarNavStore) stores feature
 * ids; unknown/stale ids are ignored gracefully, so re-tiering a feature
 * never breaks existing users.
 */

export type FeatureTier = 'core' | 'advanced' | 'hidden';

export interface FeatureDefinition {
  id: string;
  label: string;
  icon: string;
  /** Route path, may include a query string (e.g. '/tasks?tab=inbox'). */
  path?: string;
  tier: FeatureTier;
  /** Short one-line description shown in the "更多功能" panel. */
  description?: string;
}

/** Sidebar items the user may drag-reorder (subset of core). */
export const DRAGGABLE_CORE_IDS = [
  'projects',
  'tasks',
  'calendar',
  'notes',
  'bookmarks',
];

export const FEATURES: FeatureDefinition[] = [
  // ─────────────────────────────────────────────── core (main sidebar)
  {
    id: 'home',
    label: '首页',
    icon: '🏠',
    path: '/',
    tier: 'core',
  },
  {
    id: 'ai-assistant',
    label: 'AI',
    icon: '✨',
    path: '/ai',
    tier: 'core',
    description: '对话式管理任务、日程与笔记',
  },
  {
    id: 'today',
    label: '今天',
    icon: '📆',
    path: '/today',
    tier: 'core',
  },
  {
    id: 'inbox',
    label: '收件箱',
    icon: '📥',
    path: '/inbox',
    tier: 'core',
  },
  {
    id: 'projects',
    label: '项目',
    icon: '📋',
    path: '/pm',
    tier: 'core',
  },
  {
    id: 'tasks',
    label: '任务',
    icon: '✓',
    path: '/tasks',
    tier: 'core',
  },
  {
    id: 'calendar',
    label: '日程',
    icon: '📅',
    path: '/schedule',
    tier: 'core',
  },
  {
    id: 'notes',
    label: '笔记',
    icon: '📝',
    path: '/notes',
    tier: 'core',
  },
  {
    id: 'bookmarks',
    label: '收藏',
    icon: '🔖',
    path: '/links',
    tier: 'core',
  },
  {
    id: 'review',
    label: '回顾',
    icon: '📊',
    path: '/activity',
    tier: 'core',
  },

  // ──────────────────────────────────────────── advanced ("更多功能")
  {
    id: 'time-tracking',
    label: '时间统计',
    icon: '⏱️',
    path: '/time',
    tier: 'advanced',
    description: '计时器、工时表与时间记录',
  },
  {
    id: 'pomodoro',
    label: '番茄钟',
    icon: '🍅',
    path: '/schedule?tab=pomodoro',
    tier: 'advanced',
    description: '专注计时工作法',
  },
  {
    id: 'focus',
    label: '专注模式',
    icon: '🎯',
    path: '/focus',
    tier: 'advanced',
    description: '全屏无干扰工作环境',
  },
  {
    id: 'habits',
    label: '习惯',
    icon: '💪',
    path: '/tasks?tab=habits',
    tier: 'advanced',
    description: '每日打卡与连续记录',
  },
  {
    id: 'gantt',
    label: '甘特图',
    icon: '📈',
    path: '/tasks?tab=timeline',
    tier: 'advanced',
    description: '任务依赖与项目时间线',
  },
  {
    id: 'knowledge-graph',
    label: '知识图谱',
    icon: '🕸️',
    path: '/notes?tab=graph',
    tier: 'advanced',
    description: '可视化笔记之间的关联',
  },
  {
    id: 'automations',
    label: '自动化',
    icon: '⚡',
    path: '/automations',
    tier: 'advanced',
    description: '规则与自动化工作流',
  },
  {
    id: 'retrospective',
    label: '每周回顾',
    icon: '🔄',
    path: '/retrospective',
    tier: 'advanced',
    description: '每周复盘与改进建议',
  },
  {
    id: 'portfolio',
    label: '项目组合',
    icon: '📂',
    path: '/portfolio',
    tier: 'advanced',
    description: '跨项目健康度与高级统计',
  },
  {
    id: 'energy',
    label: '精力追踪',
    icon: '🔋',
    path: '/energy',
    tier: 'advanced',
    description: '记录精力水平，优化日程安排',
  },
  {
    id: 'availability',
    label: '空闲时间',
    icon: '🗓️',
    path: '/availability',
    tier: 'advanced',
    description: '生成并分享你的空闲时段',
  },
  {
    id: 'docs-center',
    label: '文档中心',
    icon: '📄',
    path: '/create',
    tier: 'advanced',
    description: '富文本文档的创作与管理',
  },

  // ─────────────────────────────────────────────── hidden (preserved)
  // Routes stay registered; data stays intact; no default UI entry points.
  {
    id: 'spreadsheets',
    label: '表格',
    icon: '📊',
    path: '/create?tab=spreadsheets',
    tier: 'hidden',
    description: '电子表格（保留能力，未默认展示）',
  },
  {
    id: 'presentations',
    label: '演示文稿',
    icon: '📽️',
    path: '/create?tab=presentations',
    tier: 'hidden',
    description: '幻灯片编辑（保留能力，未默认展示）',
  },
  {
    id: 'diagrams',
    label: '绘图',
    icon: '🔷',
    path: '/create?tab=diagrams',
    tier: 'hidden',
    description: '图表与流程图画布（保留能力）',
  },
  {
    id: 'forms',
    label: '表单',
    icon: '🧾',
    path: '/create?tab=forms',
    tier: 'hidden',
    description: '表单构建与填写（保留能力）',
  },
  {
    id: 'invoices',
    label: '发票',
    icon: '💳',
    path: '/schedule?tab=timer&section=invoices',
    tier: 'hidden',
    description: '从计时记录生成发票（自由职业向，保留能力）',
  },
  {
    id: 'billable-reports',
    label: '计时报表',
    icon: '🧮',
    path: '/schedule?tab=timer&section=reports',
    tier: 'hidden',
    description: '可计费时间报表（自由职业向，保留能力）',
  },
];

// ─────────────────────────────────────────────────────────── helpers

const byTier = (tier: FeatureTier): FeatureDefinition[] =>
  FEATURES.filter((f) => f.tier === tier);

/** Core features in display order (top of the sidebar). */
export const CORE_FEATURES = byTier('core');

/**
 * Core features split into the fixed head section (before the draggable
 * workspace block) and the draggable block itself.
 */
export const FIXED_CORE_FEATURES = CORE_FEATURES.filter(
  (f) => !DRAGGABLE_CORE_IDS.includes(f.id) && f.id !== 'review'
);

/**
 * Core features rendered after the draggable block (review).
 * Kept out of the drag group so their position stays stable.
 */
export const TRAILING_CORE_FEATURES = CORE_FEATURES.filter(
  (f) => f.id === 'review'
);

/** Draggable workspace features in canonical order. */
export const DRAGGABLE_CORE_FEATURES = DRAGGABLE_CORE_IDS.map(
  (id) => CORE_FEATURES.find((f) => f.id === id)!
).filter(Boolean);

/** Advanced features shown inside the "更多功能" panel. */
export const ADVANCED_FEATURES = byTier('advanced');

/** Hidden features (documentation / palette-filtering purposes). */
export const HIDDEN_FEATURES = byTier('hidden');

export function getFeature(id: string): FeatureDefinition | undefined {
  return FEATURES.find((f) => f.id === id);
}

/** Whether a feature may appear in the default product UI. */
export function isFeatureExposed(id: string): boolean {
  return getFeature(id)?.tier !== 'hidden';
}

/**
 * Dashboard widgets backed by a hidden product feature must follow the same
 * visibility contract as navigation, search, and page tabs.  Keeping this
 * mapping here prevents a second, contradictory feature registry from
 * emerging in the widget manager.
 */
const WIDGET_FEATURE_IDS: Readonly<Record<string, string>> = {
  forms: 'forms',
};

export function isWidgetExposed(widgetId: string): boolean {
  const featureId = WIDGET_FEATURE_IDS[widgetId];
  return featureId ? isFeatureExposed(featureId) : true;
}
