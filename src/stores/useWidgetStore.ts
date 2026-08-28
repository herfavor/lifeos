/**
 * Dashboard Widget Store
 *
 * Manages widget state: enabled widgets, order, and settings
 * Persists to localStorage for user preferences
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { isWidgetExposed } from '../config/features';

// === Custom Widget Types ===

export type DataSourceType = 'rss' | 'json-api' | 'markdown' | 'store-query';

export interface DataSourceConfig {
  type: DataSourceType;
  url?: string;
  jsonPath?: string;
  markdown?: string;
  storeQuery?: {
    store: 'notes' | 'tasks' | 'events' | 'time-entries';
    filter?: string;
    limit?: number;
  };
}

export type LayoutType = 'number' | 'list' | 'chart' | 'markdown';

export interface LayoutConfig {
  type: LayoutType;
  title?: string;
  maxItems?: number;
  chartType?: 'bar' | 'line' | 'pie';
}

export interface CustomWidgetConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  dataSource: DataSourceConfig;
  layout: LayoutConfig;
  refreshIntervalMinutes: number;
  createdAt: string;
}

/** Per-widget configuration options stored in the widget store */
export interface WidgetSettings {
  refreshRate?: number; // Minutes between auto-refresh (0 = manual only)
  // Widget-specific settings
  username?: string; // GitHub widget
  subreddit?: string; // Reddit widget
  category?: string; // Unsplash widget
  duration?: number; // Pomodoro widget (minutes)
  coins?: string[]; // Crypto widget - tracked coins
  sources?: string[]; // News widget - selected sources
  maxItems?: number; // Feed widgets - number of items to show
  location?: string; // Weather widget
  timezones?: string[]; // World clock widget
  baseCurrency?: string; // Currency widget
  targetCurrencies?: string[]; // Currency widget
  packageNames?: string[]; // NPM stats widget
  gridSize?: number; // Pixel art widget
  accentColor?: string; // Custom accent/border color (hex)
  events?: Array<{ id: string; name: string; date: string }>; // Countdown widget
  repoUrl?: string; // Repo stats widget
  tabs?: Array<{ name: string; url: string }>; // Tab manager widget
  streamers?: string[]; // Twitch widget
  channels?: string[]; // YouTube widget
}

export interface SavedLayout {
  id: string;
  name: string;
  enabledWidgets: string[];
  widgetSizes: Record<string, 1 | 2 | 3>;
  savedAt: string;
}

export interface WidgetState {
  // Enabled widget IDs in display order
  enabledWidgets: string[];

  // Widget-specific settings
  widgetSettings: Record<string, WidgetSettings>;

  // Widget sizes (1x, 2x, or 3x width)
  widgetSizes: Record<string, 1 | 2 | 3>;

  // Custom widgets
  customWidgets: CustomWidgetConfig[];

  // Saved dashboard layouts
  savedLayouts: SavedLayout[];

  // Actions
  enableWidget: (widgetId: string) => void;
  disableWidget: (widgetId: string) => void;
  reorderWidgets: (newOrder: string[]) => void;
  updateWidgetSettings: (widgetId: string, settings: Partial<WidgetSettings>) => void;
  setWidgetSize: (widgetId: string, size: 1 | 2 | 3) => void;
  isWidgetEnabled: (widgetId: string) => boolean;
  getWidgetSettings: (widgetId: string) => WidgetSettings;

  // Custom widget actions
  createCustomWidget: (config: Omit<CustomWidgetConfig, 'id' | 'createdAt'>) => string;
  updateCustomWidget: (id: string, updates: Partial<CustomWidgetConfig>) => void;
  deleteCustomWidget: (id: string) => void;

  // Saved layout actions
  saveLayout: (name: string) => string;
  loadLayout: (id: string) => void;
  deleteLayout: (id: string) => void;
}

const LEGACY_LIFEOS_DEFAULT = [
  'myday',
  'quickadd',
  'upcomingevents',
  'portfolio',
  'recentnotes',
  'aibriefing',
];

const REMOVED_AI_WIDGETS = new Set(['aibriefing', 'ainews']);
const BUILTIN_WIDGET_IDS = new Set([
  'taskssummary',
  'upcomingevents',
  'recentnotes',
  'habitsummary',
  'pomodoro',
  'bookmarks',
  'activityfeed',
  'energytracker',
  'portfolio',
  'weeklyinsights',
  'quickadd',
  'shortcuts',
]);

const isDefaultUiWidget = (id: string): boolean =>
  id.startsWith('custom-') || (BUILTIN_WIDGET_IDS.has(id) && isWidgetExposed(id));
const EMPTY_WIDGET_SETTINGS: WidgetSettings = {};

/**
 * Strip widgets backed by hidden product features (and removed AI surfaces)
 * from a persisted widget state. Used by layout restore and store migrations
 * so old layouts can never re-surface sealed capabilities.
 */
export function sanitizeHiddenFeatureWidgets(state: WidgetState): WidgetState {
  return {
    ...state,
    enabledWidgets: (state.enabledWidgets ?? []).filter(isDefaultUiWidget),
    widgetSizes: Object.fromEntries(
      Object.entries(state.widgetSizes ?? {}).filter(([id]) => isDefaultUiWidget(id))
    ) as Record<string, 1 | 2 | 3>,
    savedLayouts: (state.savedLayouts ?? []).map((layout) => ({
      ...layout,
      enabledWidgets: layout.enabledWidgets.filter(isDefaultUiWidget),
      widgetSizes: Object.fromEntries(
        Object.entries(layout.widgetSizes).filter(([id]) => isDefaultUiWidget(id))
      ) as Record<string, 1 | 2 | 3>,
    })),
  };
}

export const useWidgetStore = create<WidgetState>()(
  persist(
    (set, get) => ({
      // The fixed Home overview now provides the daily workflow. Widgets are
      // an opt-in advanced layer so a new user never lands on six empty cards.
      enabledWidgets: [],

      widgetSizes: {},

      // Custom widgets
      customWidgets: [],

      // Saved layouts
      savedLayouts: [],

      widgetSettings: {
        pomodoro: { duration: 25 },
      },

      enableWidget: (widgetId) => {
        if (!isDefaultUiWidget(widgetId)) return;
        set((state) => {
          if (!state.enabledWidgets.includes(widgetId)) {
            return {
              enabledWidgets: [...state.enabledWidgets, widgetId],
              widgetSizes: { ...state.widgetSizes, [widgetId]: state.widgetSizes[widgetId] || 1 },
            };
          }
          return state;
        });
      },

      disableWidget: (widgetId) => {
        set((state) => {
          const { [widgetId]: _, ...remainingSizes } = state.widgetSizes;
          return {
            enabledWidgets: state.enabledWidgets.filter((id) => id !== widgetId),
            widgetSizes: remainingSizes,
          };
        });
      },

      reorderWidgets: (newOrder) => {
        set({ enabledWidgets: newOrder.filter(isDefaultUiWidget) });
      },

      updateWidgetSettings: (widgetId, settings) => {
        set((state) => ({
          widgetSettings: {
            ...state.widgetSettings,
            [widgetId]: {
              ...state.widgetSettings[widgetId],
              ...settings,
            },
          },
        }));
      },

      setWidgetSize: (widgetId, size) => {
        set((state) => ({
          widgetSizes: {
            ...state.widgetSizes,
            [widgetId]: size,
          },
        }));
      },

      isWidgetEnabled: (widgetId) => {
        return get().enabledWidgets.includes(widgetId);
      },

      getWidgetSettings: (widgetId) => {
        return get().widgetSettings[widgetId] || EMPTY_WIDGET_SETTINGS;
      },

      createCustomWidget: (config) => {
        const id = `custom-${crypto.randomUUID()}`;
        const widget: CustomWidgetConfig = {
          ...config,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          customWidgets: [...state.customWidgets, widget],
        }));
        // Enable the widget on the dashboard
        get().enableWidget(id);
        return id;
      },

      updateCustomWidget: (id, updates) => {
        set((state) => ({
          customWidgets: state.customWidgets.map((w) =>
            w.id === id ? { ...w, ...updates, id: w.id, createdAt: w.createdAt } : w
          ),
        }));
      },

      deleteCustomWidget: (id) => {
        get().disableWidget(id);
        set((state) => ({
          customWidgets: state.customWidgets.filter((w) => w.id !== id),
        }));
      },

      saveLayout: (name) => {
        const id = `layout-${crypto.randomUUID()}`;
        const { enabledWidgets, widgetSizes } = get();
        const layout: SavedLayout = {
          id,
          name,
          enabledWidgets: [...enabledWidgets],
          widgetSizes: { ...widgetSizes },
          savedAt: new Date().toISOString(),
        };
        set((state) => ({
          savedLayouts: [...state.savedLayouts, layout],
        }));
        return id;
      },

      loadLayout: (id) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find((l) => l.id === id);
        if (layout) {
          const sanitized = sanitizeHiddenFeatureWidgets({
            ...get(),
            enabledWidgets: layout.enabledWidgets,
            widgetSizes: layout.widgetSizes,
          });
          set({
            enabledWidgets: sanitized.enabledWidgets,
            widgetSizes: sanitized.widgetSizes,
          });
        }
      },

      deleteLayout: (id) => {
        set((state) => ({
          savedLayouts: state.savedLayouts.filter((l) => l.id !== id),
        }));
      },
    }),
    {
      name: 'dashboard-widgets',
      version: 12, // Increment this when persisted dashboard state needs migration
      migrate: (persistedState: any, version: number) => {
        const state = persistedState as WidgetState;

        // Migration for version 0 -> 1: Add weathermap to enabled widgets if missing
        if (version === 0) {
          if (!state.enabledWidgets.includes('weathermap')) {
            state.enabledWidgets.push('weathermap');
          }
          if (!state.widgetSettings.weathermap) {
            state.widgetSettings.weathermap = { refreshRate: 60 };
          }
        }

        // Migration for version 1 -> 2: Add widgetSizes if missing, set weathermap to 2x
        if (version < 2) {
          if (!state.widgetSizes) {
            state.widgetSizes = {};
          }
          // Set weathermap to 2x width by default
          if (!state.widgetSizes.weathermap) {
            state.widgetSizes.weathermap = 2;
          }
        }

        // Internal migration v2 -> v3: Update widget defaults (2-column grid)
        if (version < 3) {
          // Update weathermap to 3x (full row in 2-column grid)
          state.widgetSizes.weathermap = 3;

          // Set core widgets to 1x width (50% = half row in 2-column grid)
          const coreWidgets = ['tasksummary', 'upcomingevents', 'recentnotes', 'quickadd'];
          coreWidgets.forEach((widgetId) => {
            if (!state.widgetSizes[widgetId]) {
              state.widgetSizes[widgetId] = 1;
            }
          });

          // Note: API widgets (quote, crypto, hackernews) are now disabled by default
          // but remain available in Widget Manager. This migration doesn't force-remove
          // them if user already has them enabled - existing preferences are preserved.
        }

        // Migration for version 3 -> 4: Merge tasksummary + quickadd into tasksquickadd
        if (version < 4) {
          // Replace tasksummary and quickadd with tasksquickadd
          const hasTaskSummary = state.enabledWidgets.includes('tasksummary');
          const hasQuickAdd = state.enabledWidgets.includes('quickadd');

          if (hasTaskSummary || hasQuickAdd) {
            // Remove old widgets
            state.enabledWidgets = state.enabledWidgets.filter(
              (id) => id !== 'tasksummary' && id !== 'quickadd'
            );

            // Add new combined widget at position 1 (after weathermap at position 0)
            if (!state.enabledWidgets.includes('tasksquickadd')) {
              state.enabledWidgets.splice(1, 0, 'tasksquickadd');
            }

            // Set size to 3x (full row)
            state.widgetSizes.tasksquickadd = 3;

            // Clean up old widget sizes
            delete state.widgetSizes.tasksummary;
            delete state.widgetSizes.quickadd;
          }
        }

        // Migration for version 4 -> 5: Remove the legacy myday widget
        // Users should use the dedicated Today page instead
        if (version < 5) {
          // Remove myday from enabled widgets
          state.enabledWidgets = state.enabledWidgets.filter((id) => id !== 'myday');

          // Clean up myday widget size
          delete state.widgetSizes.myday;
        }

        // Migration for version 5 -> 6: Add customWidgets array
        if (version < 6) {
          if (!state.customWidgets) {
            state.customWidgets = [];
          }
        }

        // Migration for version 6 -> 7: Add savedLayouts array
        if (version < 7) {
          if (!state.savedLayouts) {
            state.savedLayouts = [];
          }
        }

        // LifeOS migration (version 7 -> 8): the large weather map leaves
        // the default dashboard. The widget itself is still registered and
        // can be re-enabled manually in the Widget Manager; this one-time
        // migration only removes it from the current layout.
        if (version < 8) {
          state.enabledWidgets = state.enabledWidgets.filter((id) => id !== 'weathermap');
          delete state.widgetSizes.weathermap;
        }

        // Version 9: move the former six-card default into the integrated
        // Home overview. Preserve genuinely customized widget selections, but
        // remove the two secondary AI surfaces so `/ai` remains the only AI
        // destination.
        if (version < 9) {
          const wasLegacyDefault =
            state.enabledWidgets.length === LEGACY_LIFEOS_DEFAULT.length &&
            state.enabledWidgets.every((id, index) => id === LEGACY_LIFEOS_DEFAULT[index]);

          state.enabledWidgets = wasLegacyDefault
            ? []
            : state.enabledWidgets.filter((id) => !REMOVED_AI_WIDGETS.has(id));

          for (const id of REMOVED_AI_WIDGETS) delete state.widgetSizes[id];

          state.savedLayouts = (state.savedLayouts ?? []).map((layout) => ({
            ...layout,
            enabledWidgets: layout.enabledWidgets.filter((id) => !REMOVED_AI_WIDGETS.has(id)),
            widgetSizes: Object.fromEntries(
              Object.entries(layout.widgetSizes).filter(([id]) => !REMOVED_AI_WIDGETS.has(id))
            ) as Record<string, 1 | 2 | 3>,
          }));
        }

        // Version 10: hidden product capabilities must not leak back into the
        // default dashboard through old layouts or the widget manager.  Their
        // source stores and user content remain untouched.
        if (version < 10) {
          Object.assign(state, sanitizeHiddenFeatureWidgets(state));
        }

        // Version 11: the gamification widget is backed by the hidden
        // 'gamification' feature; re-run the exposure filter so any layout
        // saved between v10 and v11 cannot keep it.
        if (version < 11) {
          Object.assign(state, sanitizeHiddenFeatureWidgets(state));
        }

        // Version 12: keep the built-in dashboard focused on LifeOS domain data.
        // Removed portal/API widget ids are stripped from current and saved layouts.
        if (version < 12) {
          Object.assign(state, sanitizeHiddenFeatureWidgets(state));
          state.widgetSettings = Object.fromEntries(
            Object.entries(state.widgetSettings ?? {}).filter(([id]) => isDefaultUiWidget(id))
          );
        }

        return persistedState;
      },
    }
  )
);
