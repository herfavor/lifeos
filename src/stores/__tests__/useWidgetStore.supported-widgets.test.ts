import { beforeEach, describe, expect, it } from 'vitest';
import { sanitizeHiddenFeatureWidgets, useWidgetStore } from '../useWidgetStore';

describe('useWidgetStore supported dashboard widgets', () => {
  beforeEach(() => {
    useWidgetStore.setState({ enabledWidgets: [], widgetSizes: {} });
  });

  it('allows supported LifeOS widgets and rejects removed portal widgets', () => {
    const store = useWidgetStore.getState();
    store.enableWidget('recentnotes');
    store.enableWidget('pomodoro');
    store.enableWidget('crypto');
    store.enableWidget('reddit');
    store.enableWidget('weathermap');

    expect(useWidgetStore.getState().enabledWidgets).toEqual(['recentnotes', 'pomodoro']);
  });

  it('filters removed and hidden ids from reordered layouts', () => {
    useWidgetStore.getState().reorderWidgets([
      'quickadd',
      'aibriefing',
      'forms',
      'github',
      'dailyquests',
      'recentnotes',
    ]);

    expect(useWidgetStore.getState().enabledWidgets).toEqual(['quickadd', 'recentnotes']);
  });

  it('preserves custom widget ids', () => {
    useWidgetStore.getState().reorderWidgets(['custom-example', 'recentnotes']);
    expect(useWidgetStore.getState().enabledWidgets).toEqual(['custom-example', 'recentnotes']);
  });

  it('sanitizes current and saved layouts', () => {
    const legacyState = {
      ...useWidgetStore.getState(),
      enabledWidgets: ['recentnotes', 'crypto', 'productivitykarma'],
      widgetSizes: { recentnotes: 1, crypto: 2, productivitykarma: 2 },
      savedLayouts: [
        {
          id: 'l1',
          name: '旧布局',
          enabledWidgets: ['reddit', 'recentnotes', 'dailyquests'],
          widgetSizes: { reddit: 2, recentnotes: 1, dailyquests: 1 },
          savedAt: new Date().toISOString(),
        },
      ],
    };

    const migrated = sanitizeHiddenFeatureWidgets(legacyState);
    expect(migrated.enabledWidgets).toEqual(['recentnotes']);
    expect(migrated.widgetSizes).toEqual({ recentnotes: 1 });
    expect(migrated.savedLayouts[0].enabledWidgets).toEqual(['recentnotes']);
    expect(migrated.savedLayouts[0].widgetSizes).toEqual({ recentnotes: 1 });
  });
});
