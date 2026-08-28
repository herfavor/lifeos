import { describe, expect, it } from 'vitest';
import { ADVANCED_FEATURES, CORE_FEATURES, getFeature, isWidgetExposed } from '../features';

describe('feature visibility', () => {
  it('keeps the default navigation focused on the daily action loop', () => {
    expect(CORE_FEATURES.map((feature) => feature.id)).toEqual([
      'home',
      'ai-assistant',
      'today',
      'inbox',
      'projects',
      'tasks',
      'calendar',
      'notes',
      'bookmarks',
      'review',
    ]);
  });

  it('keeps AI visible as a first-class core capability', () => {
    expect(CORE_FEATURES.find((feature) => feature.id === 'ai-assistant')).toMatchObject({
      label: 'AI',
      path: '/ai',
      tier: 'core',
    });
    expect(ADVANCED_FEATURES.some((feature) => feature.id === 'ai-assistant')).toBe(false);
  });

  it('gives Inbox one dedicated route instead of nesting it inside Tasks', () => {
    expect(getFeature('inbox')).toMatchObject({ path: '/inbox', tier: 'core' });
    expect(getFeature('tasks')).toMatchObject({ path: '/tasks', tier: 'core' });
  });

  it('keeps time tracking and pomodoro secondary to the schedule', () => {
    expect(getFeature('time-tracking')).toMatchObject({ path: '/time', tier: 'advanced' });
    expect(getFeature('pomodoro')).toMatchObject({ path: '/schedule?tab=pomodoro', tier: 'advanced' });
  });

  it('applies hidden feature tiers to their dashboard widgets', () => {
    expect(isWidgetExposed('forms')).toBe(false);
    expect(isWidgetExposed('flashcard')).toBe(false);
    expect(isWidgetExposed('dailyquests')).toBe(false);
    expect(isWidgetExposed('productivitykarma')).toBe(false);
    expect(isWidgetExposed('recentnotes')).toBe(true);
  });
});
