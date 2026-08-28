import { test, expect } from '../fixtures/test-utils';
import {
  clearAllStores,
  createMockEvent,
  createMockNote,
  createMockTask,
  createMockTimeEntry,
  formatDateKey,
  getStoreData,
  getTodayKey,
  resetTestCounters,
  setStoreData,
  waitForAppLoaded,
  waitForIndexedDB,
} from '../fixtures/test-data';

type PersistedStore<T> = { state: T; version: number };

test.describe('Backup & Restore', () => {
  test.beforeEach(async ({ page }) => {
    resetTestCounters();
    await page.goto('/');
    await waitForAppLoaded(page);
    await clearAllStores(page);
  });

  async function roundTripBrainBackup(page: Parameters<typeof setStoreData>[0]) {
    await page.goto('/settings?tab=backup');
    await waitForAppLoaded(page);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出 Brain' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^LifeOS-Backup-.*\.brain$/);
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    await clearAllStores(page);
    await page.locator('input[type="file"][accept=".brain"]').setInputFiles(downloadPath!);
    await expect(page.getByText(/成功导入/)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2_500);
    await waitForAppLoaded(page);
  }

  test('exports and restores tasks, events, notes, and time entries', async ({ page }) => {
    const today = getTodayKey();
    const note = createMockNote({
      title: 'Backup Test Note',
      content: 'Important note content that must persist',
      tags: ['backup', 'important'],
    });

    await setStoreData(page, 'kanban-store', {
      state: { tasks: [createMockTask({ title: 'Backup Test Task', description: 'Must survive', status: 'inprogress', priority: 'high', tags: ['backup'] })] },
      version: 0,
    });
    await setStoreData(page, 'calendar-store', {
      state: { events: { [today]: [createMockEvent(today, { title: 'Backup Test Event', startTime: '14:00', endTime: '15:00' })] } },
      version: 0,
    });
    await setStoreData(page, 'notes-store', {
      state: { notes: { [note.id]: note }, activeNoteId: null },
      version: 6,
    });
    await setStoreData(page, 'time-tracking-store', {
      state: { entries: [createMockTimeEntry({ description: 'Backup Test Time', duration: 7200 })], activeTimer: null },
      version: 0,
    });
    await waitForIndexedDB(page);

    await roundTripBrainBackup(page);

    const kanban = await getStoreData<PersistedStore<{ tasks: Array<{ title: string; tags: string[] }> }>>(page, 'kanban-store');
    const calendar = await getStoreData<PersistedStore<{ events: Record<string, Array<{ title: string }>> }>>(page, 'calendar-store');
    const notes = await getStoreData<PersistedStore<{ notes: Record<string, { title: string; contentText: string }> }>>(page, 'notes-store');
    const time = await getStoreData<PersistedStore<{ entries: Array<{ description: string }> }>>(page, 'time-tracking-store');

    expect(kanban?.state.tasks[0]).toMatchObject({ title: 'Backup Test Task', tags: ['backup'] });
    expect(calendar?.state.events[today][0].title).toBe('Backup Test Event');
    expect(Object.values(notes?.state.notes ?? {})[0]).toMatchObject({ title: 'Backup Test Note', contentText: 'Important note content that must persist' });
    expect(time?.state.entries[0].description).toBe('Backup Test Time');
  });

  test('round-trips unicode, long text, subtasks, and recurrence', async ({ page }) => {
    const tomorrow = formatDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const tasks = [
      createMockTask({ title: 'Unicode 你好 🎉 émojis', description: '<>&"\'' }),
      createMockTask({ title: `Long ${'a'.repeat(500)}`, description: `Body ${'b'.repeat(5000)}` }),
      createMockTask({ title: 'Subtasks', subtasks: [{ title: 'Nested', completed: true }] }),
      createMockTask({ title: 'Recurring', dueDate: tomorrow, recurrence: { frequency: 'daily', interval: 1, endType: 'after', endCount: 30 } }),
    ];
    await setStoreData(page, 'kanban-store', { state: { tasks }, version: 0 });

    await roundTripBrainBackup(page);

    const restored = await getStoreData<PersistedStore<{ tasks: typeof tasks }>>(page, 'kanban-store');
    expect(restored?.state.tasks).toHaveLength(4);
    expect(restored?.state.tasks[0].title).toContain('你好 🎉');
    expect(restored?.state.tasks[1].description.length).toBeGreaterThan(5000);
    expect(restored?.state.tasks[2].subtasks?.[0].completed).toBe(true);
    expect(restored?.state.tasks[3].recurrence).toMatchObject({ frequency: 'daily', endCount: 30 });
  });

  test('round-trips a large local dataset without dropping records', async ({ page }) => {
    const tasks = Array.from({ length: 500 }, (_, index) => createMockTask({
      title: `Bulk Task ${index + 1}`,
      description: `Description ${index + 1}`,
      status: index % 3 === 0 ? 'done' : index % 2 === 0 ? 'inprogress' : 'todo',
      priority: index % 4 === 0 ? 'high' : 'medium',
    }));
    const notes = Array.from({ length: 100 }, (_, index) => createMockNote({
      title: `Note ${index + 1}`,
      content: `Content ${index + 1} `.repeat(50),
    }));
    await setStoreData(page, 'kanban-store', { state: { tasks }, version: 0 });
    await setStoreData(page, 'notes-store', {
      state: { notes: Object.fromEntries(notes.map((note) => [note.id, note])), activeNoteId: null },
      version: 6,
    });

    await roundTripBrainBackup(page);

    const restoredTasks = await getStoreData<PersistedStore<{ tasks: typeof tasks }>>(page, 'kanban-store');
    const restoredNotes = await getStoreData<PersistedStore<{ notes: Record<string, { title: string }> }>>(page, 'notes-store');
    expect(restoredTasks?.state.tasks).toHaveLength(500);
    expect(restoredTasks?.state.tasks[250].title).toBe('Bulk Task 251');
    expect(Object.values(restoredNotes?.state.notes ?? {})).toHaveLength(100);
    expect(Object.values(restoredNotes?.state.notes ?? {})[50].title).toBe('Note 51');
  });

  test('imports a legacy task schema and lets store migration add defaults', async ({ page }) => {
    const legacyBackup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      appBuild: 'legacy',
      appBuildTimestamp: new Date(0).toISOString(),
      compressed: false,
      data: {
        'kanban-tasks': {
          state: {
            tasks: [{
              id: 'old-task-1',
              title: 'Old Schema Task',
              description: 'From v1.0',
              status: 'todo',
              priority: 'medium',
              created: new Date(0).toISOString(),
              startDate: null,
              dueDate: null,
            }],
          },
          version: 0,
        },
      },
    };

    await page.goto('/settings?tab=backup');
    await page.locator('input[type="file"][accept=".brain"]').setInputFiles({
      name: 'legacy.brain',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(legacyBackup)),
    });
    await expect(page.getByText(/成功导入/)).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(2_500);

    const kanban = await getStoreData<PersistedStore<{ tasks: Array<{ title: string; tags?: string[] }> }>>(page, 'kanban-store');
    expect(kanban?.state.tasks[0].title).toBe('Old Schema Task');

    await page.goto('/tasks');
    await expect(page.getByText('Old Schema Task', { exact: true }).first()).toBeVisible();
    const hydrated = await getStoreData<PersistedStore<{ tasks: Array<{ tags: string[] }> }>>(page, 'kanban-store');
    expect(hydrated?.state.tasks[0].tags).toEqual([]);
  });
});
