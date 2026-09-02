import { describe, expect, it } from 'vitest';
import {
  ADVANCED_FEATURES,
  CORE_FEATURES,
  HIDDEN_FEATURES,
  getFeature,
  isFeatureExposed,
  isWidgetExposed,
} from '../features';

describe('feature visibility', () => {
  it('keeps the default navigation focused on the daily action loop', () => {
    expect(CORE_FEATURES.map((feature) => feature.id)).toEqual([
      'today',
      'inbox',
      'tasks',
      'projects',
      'calendar',
      'notes',
      'review',
    ]);
  });

  it('keeps AI reachable without a permanent seat in the core loop', () => {
    expect(CORE_FEATURES.some((feature) => feature.id === 'ai-assistant')).toBe(false);
    expect(ADVANCED_FEATURES.find((feature) => feature.id === 'ai-assistant')).toMatchObject({
      label: 'AI',
      path: '/ai',
      tier: 'advanced',
    });
    expect(isFeatureExposed('ai-assistant')).toBe(true);
  });

  it('keeps the dashboard and bookmarks available outside the core loop', () => {
    expect(getFeature('home')).toMatchObject({ label: '概览', path: '/overview', tier: 'advanced' });
    expect(getFeature('bookmarks')).toMatchObject({ path: '/links', tier: 'advanced' });
  });

  it('gives Inbox one dedicated route instead of nesting it inside Tasks', () => {
    expect(getFeature('inbox')).toMatchObject({ path: '/inbox', tier: 'core' });
    expect(getFeature('tasks')).toMatchObject({ path: '/tasks', tier: 'core' });
  });

  it('keeps time tracking and pomodoro secondary to the schedule', () => {
    expect(getFeature('time-tracking')).toMatchObject({ path: '/time', tier: 'advanced' });
    expect(getFeature('pomodoro')).toMatchObject({ path: '/schedule?tab=pomodoro', tier: 'advanced' });
  });

  it('keeps retired runtime features absent and fail-closed', () => {
    expect(HIDDEN_FEATURES).toEqual([]);
    expect(getFeature('forms')).toBeUndefined();
    expect(getFeature('spreadsheets')).toBeUndefined();
    expect(getFeature('presentations')).toBeUndefined();
    expect(getFeature('diagrams')).toBeUndefined();
    expect(isFeatureExposed('forms')).toBe(false);
    expect(isWidgetExposed('forms')).toBe(false);
    expect(isWidgetExposed('recentnotes')).toBe(true);
  });
});
