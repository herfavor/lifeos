/**
 * Synapse - Neural Search Interface
 *
 * Quick-access search and navigation for LifeOS, accessible via Ctrl+K (Win/Linux) or Cmd+K (Mac).
 * Named after synapses - the connection points in the brain where signals fire rapidly.
 * Provides instant access to notes, tasks, events, settings, and web search.
 *
 * Features:
 * - Global search across all data types (notes, tasks, events, habits, docs, links)
 * - Type filter tabs for focused searching
 * - Recent items section with access timestamps
 * - Context-rich search previews
 * - Command mode (> prefix), help mode (? prefix), navigation mode (/ prefix)
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Search, X, ExternalLink, ArrowRight, Settings, Clock, BarChart3, CalendarDays, CheckCircle2, ClipboardList, FileText, Folder, Globe, HelpCircle, Home, Keyboard, Link, Lightbulb, Puzzle, Settings2, Square, Target, Timer, Zap, type LucideIcon } from 'lucide-react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import {
  searchAll,
  groupResultsByType,
  getTypeLabel,
  detectMode,
  stripModePrefix,
  searchCommands,
  getQuickCreateResult,
  getRecentCommandResults,
  getRecentItemResults,
  getContextSnippet,
  parseSearchQuery,
  applySearchFilters,
} from './searchRegistry';
import { SEARCH_ENGINES, SEARCH_FILTER_TABS } from './types';
import type { SearchResult, CommandPaletteMode, SearchFilterTab } from './types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useThemeStore } from '../../stores/useThemeStore';
import { useRecentItemsStore } from '../../stores/useRecentItemsStore';
import { CommandPaletteSettings } from './CommandPaletteSettings';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSupportModal?: (tab: 'report' | 'help' | 'docs') => void;
  onOpenModal?: (modalId: string) => void;
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  page: Home,
  note: FileText,
  task: CheckCircle2,
  event: CalendarDays,
  bookmark: Link,
  diagram: BarChart3,
  form: ClipboardList,
  'time-entry': Timer,
  external: Globe,
  action: Square,
  faq: HelpCircle,
  help: Lightbulb,
  widget: Puzzle,
  setting: Settings2,
  automation: Zap,
  template: ClipboardList,
  project: Folder,
  shortcut: Keyboard,
  recent: Clock,
  habit: Target,
  document: FileText,
};

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, onOpenSupportModal, onOpenModal }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchFilterTab>('all');

  const preferredSearchEngine = useSettingsStore(
    (state) => state.commandPalette?.preferredSearchEngine ?? 'google'
  );
  const isDarkMode = useThemeStore((state) => state.mode === 'dark');
  const trackAccess = useRecentItemsStore((state) => state.trackAccess);

  useEscapeKey({
    enabled: isOpen,
    onEscape: () => {
      if (showSettings) {
        setShowSettings(false);
      } else {
        onClose();
      }
    },
    priority: 10000,
  });

  const mode: CommandPaletteMode = useMemo(() => detectMode(query), [query]);

  // Get filter tab config for active filter
  const activeFilterConfig = useMemo(
    () => SEARCH_FILTER_TABS.find((t) => t.id === activeFilter),
    [activeFilter]
  );

  // Parse search query for tag:, in:, status:, date: modifiers
  const parsedQuery = useMemo(() => parseSearchQuery(query), [query]);
  const hasActiveModifiers = parsedQuery.filters.length > 0;

  // Search results with filtering
  const results = useMemo(() => {
    if (!isOpen) return [];

    if (mode === 'command') {
      return searchCommands(stripModePrefix(query), navigate, onOpenModal);
    }

    if (mode === 'help') {
      const allResults = searchAll(stripModePrefix(query), navigate, preferredSearchEngine, onOpenSupportModal, onOpenModal);
      return allResults.filter(r => r.type === 'faq' || r.type === 'help' || r.type === 'shortcut');
    }

    if (mode === 'navigation') {
      const allResults = searchAll(stripModePrefix(query), navigate, preferredSearchEngine, onOpenSupportModal, onOpenModal);
      return allResults.filter(r => r.type === 'page');
    }

    // Use parsed text (without modifiers) for the actual search
    const searchQuery = hasActiveModifiers ? parsedQuery.text : query;
    const searchResults = searchAll(searchQuery, navigate, preferredSearchEngine, onOpenSupportModal, onOpenModal);

    // If query is empty (no text, no modifiers), show recent items + recent commands
    if (!query.trim()) {
      const recentItems = getRecentItemResults(navigate);
      const recentCommands = getRecentCommandResults(navigate, onOpenModal);
      const combined = [...recentItems, ...recentCommands, ...searchResults];

      if (activeFilter !== 'all' && activeFilterConfig) {
        return combined.filter(
          (r) => r.type === 'recent' || activeFilterConfig.types.includes(r.type)
        );
      }
      return combined;
    }

    // Apply tag and date filters
    let filtered = hasActiveModifiers
      ? applySearchFilters(searchResults, parsedQuery)
      : searchResults;

    // Apply type filter tab
    if (activeFilter !== 'all' && activeFilterConfig) {
      filtered = filtered.filter((r) =>
        activeFilterConfig.types.includes(r.type) || r.type === 'external'
      );
    }

    // Add quick create if few results
    if (filtered.length === 0 && parsedQuery.text) {
      const quickCreate = getQuickCreateResult(parsedQuery.text);
      if (quickCreate) return [quickCreate];
    }

    if (filtered.length < 3 && parsedQuery.text) {
      const quickCreate = getQuickCreateResult(parsedQuery.text);
      if (quickCreate) return [...filtered, quickCreate];
    }

    return filtered;
  }, [query, parsedQuery, hasActiveModifiers, isOpen, navigate, preferredSearchEngine, onOpenSupportModal, onOpenModal, mode, activeFilter, activeFilterConfig]);

  // Group results by type
  const groupedResults = useMemo(() => groupResultsByType(results), [results]);

  // Flatten for keyboard navigation
  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    groupedResults.forEach((items) => flat.push(...items));
    return flat;
  }, [groupedResults]);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setShowSettings(false);
      setActiveFilter('all');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep selected item in view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle result selection - track access for recent items
  const handleSelectResult = useCallback(
    (result: SearchResult) => {
      // Track this access for recent items (skip external, action, command types)
      const trackableTypes = ['note', 'task', 'event', 'bookmark', 'diagram', 'form', 'page', 'document', 'habit'];
      if (trackableTypes.includes(result.type)) {
        const pathMap: Record<string, string> = {
          note: '/notes',
          task: '/tasks',
          event: '/schedule',
          bookmark: '/links',
          diagram: '/diagrams',
          form: '/forms',
          page: '',
          document: '/create',
          habit: '/tasks?tab=habits',
        };
        trackAccess({
          id: result.id,
          title: result.title,
          type: result.type,
          icon: typeof result.icon === 'string' ? result.icon : '📄',
          path: pathMap[result.type] || '/',
          subtitle: result.subtitle,
        });
      }
      result.action();
      onClose();
    },
    [onClose, trackAccess]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            handleSelectResult(flatResults[selectedIndex]);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (e.shiftKey) {
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
          } else {
            setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
          }
          break;
      }
    },
    [flatResults, selectedIndex, handleSelectResult]
  );

  if (!isOpen) return null;

  // Render a single result item with preview
  const renderResultItem = (result: SearchResult, index: number) => {
    const isSelected = index === selectedIndex;
    const isExternal = result.type === 'external';
    const trimmedQuery = query.trim();

    // Generate context snippet for selected item
    const contextSnippet = isSelected && trimmedQuery && result.preview
      ? getContextSnippet(result.preview, trimmedQuery)
      : null;

    return (
      <button
        key={result.id}
        ref={isSelected ? selectedItemRef : undefined}
        onClick={() => handleSelectResult(result)}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`
          w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
          ${isSelected
            ? 'bg-accent-blue/20 dark:bg-accent-blue/30'
            : 'hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
          }
        `}
        role="option"
        aria-selected={isSelected}
      >
        <span className="text-xl flex-shrink-0 w-8 text-center">
          {typeof result.icon === 'string'
            ? result.icon
            : result.icon ?? (TYPE_ICONS[result.type] ? React.createElement(TYPE_ICONS[result.type], { className: 'w-5 h-5 inline-block align-middle' }) : null)}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text-light-primary dark:text-text-dark-primary truncate">
              {result.title}
            </span>
            {isExternal && (
              <ExternalLink className="w-3.5 h-3.5 text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0" />
            )}
          </div>
          {result.subtitle && (
            <span className="text-sm text-text-light-secondary dark:text-text-dark-secondary truncate block">
              {result.subtitle}
            </span>
          )}
          {contextSnippet && (
            <span className="text-xs text-text-light-secondary/70 dark:text-text-dark-secondary/70 line-clamp-2 block mt-0.5 italic">
              {contextSnippet}
            </span>
          )}
        </div>

        {isSelected && (
          <ArrowRight className="w-4 h-4 text-accent-blue flex-shrink-0" />
        )}
      </button>
    );
  };

  let currentFlatIndex = 0;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Synapse 搜索"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative w-full max-w-xl mx-4 bg-surface-light dark:bg-surface-dark rounded-xl shadow-2xl border border-border-light dark:border-border-dark overflow-hidden"
        style={{ maxHeight: '70vh' }}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border-light dark:border-border-dark">
          <Search className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === 'command' ? '输入命令…' :
              mode === 'help' ? '搜索帮助主题…' :
              mode === 'navigation' ? '前往页面…' :
              '搜索你的内容…（> 命令，? 帮助）'
            }
            className="flex-1 bg-transparent text-text-light-primary dark:text-text-dark-primary placeholder-text-light-secondary dark:placeholder-text-dark-secondary outline-none text-base"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={flatResults.length > 0}
            aria-controls="command-palette-results"
            aria-activedescendant={
              flatResults[selectedIndex]
                ? `result-${flatResults[selectedIndex].id}`
                : undefined
            }
          />
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors"
            aria-label="关闭 Synapse"
          >
            <X className="w-5 h-5 text-text-light-secondary dark:text-text-dark-secondary" />
          </button>
        </div>

        {/* Type Filter Tabs - Only show in search mode */}
        {mode === 'search' && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border-light dark:border-border-dark overflow-x-auto">
            {SEARCH_FILTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveFilter(tab.id);
                  setSelectedIndex(0);
                }}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors
                  ${activeFilter === tab.id
                    ? 'bg-accent-blue/20 text-accent-blue dark:bg-accent-blue/30'
                    : 'text-text-light-secondary dark:text-text-dark-secondary hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated'
                  }
                `}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
            {/* Active modifier badges */}
            {hasActiveModifiers && (
              <div className="flex items-center gap-1 ml-auto pl-2 border-l border-border-light dark:border-border-dark">
                {parsedQuery.filters.map((filter, idx) => {
                  const label = filter.type === 'tag' ? `tag:${filter.value}`
                    : filter.type === 'module' ? `in:${filter.value}`
                    : filter.type === 'status' ? `status:${filter.value}`
                    : `date:${filter.value}`;
                  const colorClass = filter.type === 'tag' ? 'bg-accent-primary/20 text-accent-primary'
                    : filter.type === 'module' ? 'bg-status-success/15 text-status-success-text dark:text-status-success-text-dark'
                    : filter.type === 'status' ? 'bg-accent-orange/20 text-accent-orange'
                    : 'bg-accent-blue/20 text-accent-blue';
                  return (
                    <button
                      key={`${filter.type}-${filter.value}-${idx}`}
                      onClick={() => {
                        // Remove this filter token from the query
                        const token = label;
                        const newQuery = query.replace(new RegExp(`\\s*${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i'), ' ').trim();
                        setQuery(newQuery);
                        setSelectedIndex(0);
                      }}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs cursor-pointer hover:opacity-70 transition-opacity ${colorClass}`}
                      title="点击移除筛选"
                    >
                      {label}
                      <X className="w-3 h-3" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        <div
          ref={listRef}
          id="command-palette-results"
          className="overflow-y-auto"
          style={{ maxHeight: mode === 'search' ? 'calc(70vh - 110px)' : 'calc(70vh - 60px)' }}
          role="listbox"
        >
          {flatResults.length === 0 && query.trim() === '' && (
            <div className="px-4 py-8 text-center text-text-light-secondary dark:text-text-dark-secondary">
              {mode === 'command' ? (
                <>
                  <p className="text-sm">输入命令名称（例如："dark mode"、"new note"）</p>
                  <p className="text-xs mt-2 opacity-70">
                    可用命令：切换主题、新建笔记/任务、开始/停止计时器、导出
                  </p>
                </>
              ) : mode === 'help' ? (
                <>
                  <p className="text-sm">搜索帮助主题和常见问题</p>
                  <p className="text-xs mt-2 opacity-70">
                    查找功能、快捷键等相关问题的答案
                  </p>
                </>
              ) : mode === 'navigation' ? (
                <>
                  <p className="text-sm">输入页面名称以跳转</p>
                  <p className="text-xs mt-2 opacity-70">
                    首页、笔记、任务、日程、设置…
                  </p>
                </>
              ) : (
                <>
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">输入以搜索笔记、任务、事件、书签…</p>
                  <p className="text-xs mt-2 opacity-70">
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">&gt;</kbd> 命令{' '}
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">?</kbd> 帮助{' '}
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">/</kbd> 导航
                  </p>
                  <p className="text-xs mt-1 opacity-50">
                    提示：<kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">tag:</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">in:</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">status:</kbd>{' '}
                    <kbd className="px-1 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated text-xs">date:</kbd>{' '}
                    用于高级筛选
                  </p>
                </>
              )}
            </div>
          )}

          {flatResults.length === 0 && query.trim() !== '' && (
            <div className="px-4 py-8 text-center text-text-light-secondary dark:text-text-dark-secondary">
              <p className="text-sm">未找到与&ldquo;{query}&rdquo;相关的结果</p>
              <p className="text-xs mt-2 opacity-70">尝试其他搜索词，或直接在网页中搜索</p>
            </div>
          )}

          {/* Grouped Results */}
          {Array.from(groupedResults.entries()).map(([type, items]) => {
            const startIndex = currentFlatIndex;
            currentFlatIndex += items.length;

            return (
              <div key={type} className="py-1">
                <div className="px-4 py-1.5 text-xs font-semibold text-text-light-secondary dark:text-text-dark-secondary uppercase tracking-wider bg-surface-light dark:bg-surface-dark sticky top-0">
                  {getTypeLabel(type)}
                </div>
                {items.map((result, idx) => renderResultItem(result, startIndex + idx))}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-xs text-text-light-secondary dark:text-text-dark-secondary">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated">↑↓</kbd> 导航
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated">Enter</kbd> 选择
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-surface-light-elevated dark:bg-surface-dark-elevated">Esc</kbd> 关闭
            </span>
            {flatResults.length > 0 && (
              <span className="opacity-60">{flatResults.length} 个结果</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-70">网页：</span>
            {(() => {
              const engine = SEARCH_ENGINES.find((e) => e.id === preferredSearchEngine);
              return engine ? (
                <span className="flex items-center gap-1.5 font-medium">
                  <img
                    src={(isDarkMode && engine.faviconUrlDark) ? engine.faviconUrlDark : engine.faviconUrl}
                    alt=""
                    className="w-4 h-4"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  {engine.name}
                </span>
              ) : (
                <span className="font-medium">Google</span>
              );
            })()}
            <button
              onClick={() => setShowSettings(true)}
              className="p-1 rounded hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated transition-colors ml-1"
              aria-label="Synapse 设置"
              title="Synapse 设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        <CommandPaletteSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </div>
    </div>,
    document.body
  );
};

export default CommandPalette;
