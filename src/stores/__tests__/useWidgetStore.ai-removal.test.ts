import { beforeEach, describe, expect, it } from 'vitest';
import { sanitizeHiddenFeatureWidgets, useWidgetStore } from '../useWidgetStore';

describe('useWidgetStore removed AI surfaces', () => {
  beforeEach(() => {
    useWidgetStore.setState({ enabledWidgets: [], widgetSizes: {} });
  });

  it('does not allow legacy AI widgets to be re-enabled by templates', () => {
    const store = useWidgetStore.getState();
    store.enableWidget('aibriefing');
    store.enableWidget('ainews');
    store.enableWidget('recentnotes');

    expect(useWidgetStore.getState().enabledWidgets).toEqual(['recentnotes']);
  });

  it('filters legacy AI ids from reordered or imported layouts', () => {
    useWidgetStore.getState().reorderWidgets(['myday', 'aibriefing', 'ainews', 'quickadd']);

    expect(useWidgetStore.getState().enabledWidgets).toEqual(['myday', 'quickadd']);
  });

  it('does not expose widgets backed by hidden product features', () => {
    const store = useWidgetStore.getState();
    store.enableWidget('forms');
    store.enableWidget('flashcard');
    store.enableWidget('dailyquests');
    store.enableWidget('productivitykarma');
    store.enableWidget('recentnotes');

    expect(useWidgetStore.getState().enabledWidgets).toEqual(['recentnotes']);

    store.reorderWidgets(['forms', 'recentnotes', 'dailyquests', 'productivitykarma']);
    expect(useWidgetStore.getState().enabledWidgets).toEqual(['recentnotes']);
  });

  it('migrates away hidden-feature widgets from old layouts (v10 -> v11)', () => {
    // Simulate a persisted v10 state that still contains the gamification widget.
    const legacyState = {
      ...useWidgetStore.getState(),
      enabledWidgets: ['recentnotes', 'productivitykarma'],
      widgetSizes: { recentnotes: 1, productivitykarma: 2 },
      savedLayouts: [
        {
          id: 'l1',
          name: '旧布局',
          enabledWidgets: ['productivitykarma', 'recentnotes'],
          widgetSizes: { productivitykarma: 2, recentnotes: 1 },
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
