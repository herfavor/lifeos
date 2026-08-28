import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_DAILY_NOTES_SETTINGS } from '../../services/dailyNotes';
import { useSettingsStore } from '../useSettingsStore';

describe('useSettingsStore category resets', () => {
  beforeEach(() => {
    useSettingsStore.getState().resetGeneralPreferences();
    useSettingsStore.getState().resetWorkspacePreferences('editor');
    useSettingsStore.getState().resetWorkspacePreferences('tasks');
    useSettingsStore.getState().resetWorkspacePreferences('time');
  });

  it('restores general preferences without touching user-created configuration', () => {
    const existingDefinitions = { tasks: [], notes: [] };
    useSettingsStore.setState({
      displayName: 'Local User',
      timeFormat: '24h',
      temperatureUnit: 'celsius',
      dateFormat: 'YYYY-MM-DD',
      weekStartDay: 1,
      defaultViews: { tasks: 'list', calendar: 'week', notes: 'grid' },
      customFieldDefinitions: existingDefinitions,
    });

    useSettingsStore.getState().resetGeneralPreferences();
    const state = useSettingsStore.getState();

    expect(state.displayName).toBe('');
    expect(state.timeFormat).toBe('12h');
    expect(state.temperatureUnit).toBe('fahrenheit');
    expect(state.dateFormat).toBe('MM/DD/YYYY');
    expect(state.weekStartDay).toBe(0);
    expect(state.defaultViews).toEqual({ tasks: 'board', calendar: 'month', notes: 'list' });
    expect(state.customFieldDefinitions).toBe(existingDefinitions);
  });

  it('restores workspace preferences by subsection without deleting content settings', () => {
    useSettingsStore.setState({
      dailyNotes: { enabled: false, folderId: 'daily-folder', template: 'custom', dateFormat: 'iso' },
      autoShiftDependentTasks: false,
      enforceWipLimits: true,
      enableDateShortcuts: false,
      autoTrackingSettings: { enabled: true, autoStartThreshold: 5, autoStopOnIdle: false },
    });

    useSettingsStore.getState().resetWorkspacePreferences('editor');
    useSettingsStore.getState().resetWorkspacePreferences('tasks');
    useSettingsStore.getState().resetWorkspacePreferences('time');
    const state = useSettingsStore.getState();

    expect(state.dailyNotes).toEqual(DEFAULT_DAILY_NOTES_SETTINGS);
    expect(state.autoShiftDependentTasks).toBe(true);
    expect(state.enforceWipLimits).toBe(false);
    expect(state.enableDateShortcuts).toBe(true);
    expect(state.autoTrackingSettings).toEqual({
      enabled: false,
      autoStartThreshold: 30,
      autoStopOnIdle: true,
    });
  });
});
