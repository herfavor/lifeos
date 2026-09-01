/**
 * Synapse Types
 *
 * Type definitions for Synapse - LifeOS's neural search interface.
 * Provides quick access to all platform data via Ctrl+K / Cmd+K.
 */

import type { ReactNode } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Folder,
  FolderOpen,
  Home,
  Inbox,
  Link,
  Network,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Result types that can appear in search results
 */
export type SearchResultType =
  | 'note'
  | 'task'
  | 'event'
  | 'bookmark'
  | 'page'
  | 'action'
  | 'external'
  | 'diagram'
  | 'form'
  | 'time-entry'
  | 'faq'
  | 'help'
  | 'widget'
  | 'setting'
  | 'automation'
  | 'template'
  | 'project'
  | 'shortcut'
  | 'command'
  | 'recent'
  | 'habit'
  | 'document';

/**
 * Search result item displayed in the command palette
 */
export interface SearchResult {
  /** Unique identifier for this result */
  id: string;
  /** Type of result for categorization and icon selection */
  type: SearchResultType;
  /** Primary display text */
  title: string;
  /** Secondary text (path, description, URL, etc.) */
  subtitle?: string;
  /** Icon to display (emoji, Lucide component, or custom ReactNode) */
  icon?: string | ReactNode;
  /** Relevance score for sorting (higher = more relevant) */
  score: number;
  /** Action to execute when selected */
  action: () => void;
  /** Optional preview content */
  preview?: string;
  /** Additional metadata for filtering/display */
  metadata?: Record<string, unknown>;
  /** Keywords for fuzzy matching (in addition to title/subtitle) */
  keywords?: string[];
}

/**
 * Search source configuration for dynamic data registration
 */
export interface SearchSource {
  /** Unique identifier for this source */
  id: string;
  /** Display name for the source */
  name: string;
  /** Result type produced by this source */
  type: SearchResultType;
  /** Icon for results from this source */
  icon: string | ReactNode;
  /** Function that returns all searchable items */
  getItems: () => SearchResult[];
  /** Priority for ordering sources (higher = shown first) */
  priority?: number;
  /** Whether this source is enabled */
  enabled?: boolean;
}

/**
 * External search engine configuration
 */
export interface SearchEngine {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL template with {query} placeholder */
  urlTemplate: string;
  /** Favicon URL for the search engine (light mode or universal) */
  faviconUrl: string;
  /** Optional dark mode favicon URL (for icons that don't show well on dark backgrounds) */
  faviconUrlDark?: string;
  /** Keyboard shortcut hint (optional) */
  shortcut?: string;
}

/**
 * Built-in search engines with real favicons
 */
export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: 'google',
    name: 'Google',
    urlTemplate: 'https://www.google.com/search?q={query}',
    faviconUrl: 'https://www.google.com/favicon.ico',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    urlTemplate: 'https://duckduckgo.com/?q={query}',
    faviconUrl: 'https://duckduckgo.com/favicon.ico',
  },
  {
    id: 'bing',
    name: 'Bing',
    urlTemplate: 'https://www.bing.com/search?q={query}',
    faviconUrl: 'https://www.bing.com/favicon.ico',
  },
  {
    id: 'brave',
    name: 'Brave Search',
    urlTemplate: 'https://search.brave.com/search?q={query}',
    faviconUrl: 'https://brave.com/static-assets/images/brave-favicon.png',
  },
  {
    id: 'ecosia',
    name: 'Ecosia',
    urlTemplate: 'https://www.ecosia.org/search?q={query}',
    faviconUrl: 'https://www.ecosia.org/favicon.ico',
  },
  {
    id: 'startpage',
    name: 'Startpage',
    urlTemplate: 'https://www.startpage.com/sp/search?query={query}',
    faviconUrl: 'https://www.startpage.com/favicon.ico',
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    urlTemplate: 'https://en.wikipedia.org/w/index.php?search={query}',
    faviconUrl: 'https://en.wikipedia.org/favicon.ico',
  },
  {
    id: 'github',
    name: 'GitHub',
    urlTemplate: 'https://github.com/search?q={query}',
    faviconUrl: 'https://github.com/favicon.ico',
    faviconUrlDark: 'https://github.githubassets.com/favicons/favicon-dark.svg',
  },
  {
    id: 'stackoverflow',
    name: 'Stack Overflow',
    urlTemplate: 'https://stackoverflow.com/search?q={query}',
    faviconUrl: 'https://cdn.sstatic.net/Sites/stackoverflow/Img/favicon.ico',
  },
  {
    id: 'youtube',
    name: 'YouTube',
    urlTemplate: 'https://www.youtube.com/results?search_query={query}',
    faviconUrl: 'https://www.youtube.com/favicon.ico',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    urlTemplate: 'https://chatgpt.com/?hints=search&q={query}',
    faviconUrl: 'https://cdn.oaistatic.com/assets/favicon-miwirzcw.ico',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    urlTemplate: 'https://www.perplexity.ai/search?q={query}',
    faviconUrl: 'https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/perplexity-ai-icon.png',
  },
];

/**
 * Navigation pages available in the app
 */
export interface NavigationPage {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  keywords: string[];
  description?: string;
}

/**
 * All navigable pages in the application
 */
export const NAVIGATION_PAGES: NavigationPage[] = [
  {
    id: 'dashboard',
    name: '首页',
    path: '/',
    icon: Home,
    keywords: ['home', 'overview', 'widgets', 'main'],
    description: '收集、安排、专注与回顾的每日入口',
  },
  {
    id: 'ai-command-center',
    name: 'AI 指挥中心',
    path: '/ai',
    icon: Sparkles,
    keywords: ['ai', 'assistant', 'command', 'openai', 'claude'],
    description: '唯一的 AI 对话与管理页面',
  },
  {
    id: 'today',
    name: '今天',
    path: '/today',
    icon: Sun,
    keywords: ['today', 'day', 'focus', 'plan'],
    description: '安排今天最值得推进的事情',
  },
  {
    id: 'inbox',
    name: '收件箱',
    path: '/tasks?tab=inbox',
    icon: Inbox,
    keywords: ['inbox', 'capture', 'collect', 'quick'],
    description: '处理尚未安排的任务',
  },
  {
    id: 'projects',
    name: '项目',
    path: '/pm',
    icon: Folder,
    keywords: ['project', 'pm', 'next action'],
    description: '把任务与进展组织成项目',
  },
  {
    id: 'notes',
    name: '笔记',
    path: '/notes',
    icon: FileText,
    keywords: ['note', 'write', 'document', 'text', 'markdown'],
    description: '创建并管理笔记',
  },
  {
    id: 'graph',
    name: '图谱视图',
    path: '/graph',
    icon: Network,
    keywords: ['graph', 'network', 'links', 'connections', 'knowledge'],
    description: '可视化笔记之间的关联',
  },
  {
    id: 'tasks',
    name: '任务',
    path: '/tasks',
    icon: CheckCircle2,
    keywords: ['task', 'todo', 'kanban', 'project', 'board'],
    description: '看板任务管理',
  },
  {
    id: 'schedule',
    name: '日程',
    path: '/schedule',
    icon: CalendarDays,
    keywords: ['calendar', 'schedule', 'time', 'events', 'tracking'],
    description: '日历与时间追踪',
  },
  {
    id: 'links',
    name: '链接库',
    path: '/links',
    icon: Link,
    keywords: ['bookmark', 'link', 'url', 'web', 'save'],
    description: '保存的书签与链接',
  },
  {
    id: 'automations',
    name: '自动化',
    path: '/automations',
    icon: Zap,
    keywords: ['automation', 'workflow', 'rule', 'trigger', 'action'],
    description: '任务自动化规则',
  },
  {
    id: 'settings',
    name: '设置',
    path: '/settings',
    icon: Settings2,
    keywords: ['settings', 'preferences', 'config', 'options', 'theme'],
    description: '应用设置与偏好',
  },
  {
    id: 'activity',
    name: '回顾',
    path: '/activity',
    icon: BarChart3,
    keywords: ['activity', 'feed', 'history', 'log', 'analytics', 'heatmap'],
    description: '动态流与个人分析',
  },
  {
    id: 'portfolio',
    name: '项目组合',
    path: '/portfolio',
    icon: FolderOpen,
    keywords: ['portfolio', 'projects', 'overview', 'health', 'cross-project', 'dashboard'],
    description: '跨项目组合总览',
  },
  {
    id: 'energy',
    name: 'Energy',
    path: '/energy',
    icon: Zap,
    keywords: ['energy', 'tracking', 'burnout', 'schedule', 'productivity', 'fatigue'],
    description: 'Track energy levels and optimize scheduling',
  },
  {
    id: 'retrospective',
    name: 'Weekly Retrospective',
    path: '/retrospective',
    icon: BarChart3,
    keywords: ['retrospective', 'weekly', 'review', 'insights', 'productivity', 'score', 'retro'],
    description: 'Weekly productivity review and planning',
  },
  {
    id: 'availability',
    name: 'Availability',
    path: '/availability',
    icon: ClipboardList,
    keywords: ['availability', 'free', 'busy', 'share', 'schedule', 'time', 'slots', 'meeting'],
    description: 'Share your free time blocks with others',
  },
];

/**
 * Command palette state
 */
export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedIndex: number;
  results: SearchResult[];
  isLoading: boolean;
}

/**
 * Type filter tabs for the command palette
 * Allows users to filter results by category
 */
export type SearchFilterTab = 'all' | 'notes' | 'tasks' | 'events' | 'links' | 'docs' | 'other';

export interface SearchFilterTabConfig {
  id: SearchFilterTab;
  label: string;
  icon: LucideIcon;
  /** Which SearchResultTypes this tab includes */
  types: SearchResultType[];
}

export const SEARCH_FILTER_TABS: SearchFilterTabConfig[] = [
  { id: 'all', label: '全部', icon: Search, types: [] },
  { id: 'notes', label: '笔记', icon: FileText, types: ['note'] },
  { id: 'tasks', label: '任务', icon: CheckCircle2, types: ['task', 'project', 'template'] },
  { id: 'events', label: '事件', icon: CalendarDays, types: ['event', 'time-entry'] },
  { id: 'links', label: '链接', icon: Link, types: ['bookmark'] },
  { id: 'docs', label: '文档', icon: FileText, types: ['diagram', 'form', 'document'] },
  { id: 'other', label: '其他', icon: Zap, types: ['page', 'action', 'setting', 'widget', 'automation', 'habit', 'faq', 'help', 'shortcut', 'command'] },
];

/**
 * Command palette input modes
 * Detected from query prefix
 */
export type CommandPaletteMode = 'search' | 'command' | 'help' | 'navigation' | 'create';

/**
 * Executable command for the command palette
 * Commands are executed directly without navigation
 */
export interface Command {
  /** Unique identifier */
  id: string;
  /** Display name (e.g., "Toggle Dark Mode") */
  name: string;
  /** Alternative names for fuzzy matching */
  aliases: string[];
  /** Brief description */
  description: string;
  /** Icon emoji or component */
  icon: string;
  /** Action to execute - returns true if palette should close */
  handler: () => void | boolean | Promise<void | boolean>;
  /** Category for grouping */
  category: 'theme' | 'navigation' | 'create' | 'data' | 'timer' | 'view';
  /** Keywords for fuzzy matching */
  keywords: string[];
}
