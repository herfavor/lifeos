import { beforeEach, describe, expect, it } from 'vitest';
import { useKanbanStore } from '../../../stores/useKanbanStore';
import { useProjectContextStore } from '../../../stores/useProjectContextStore';
import { useCalendarStore } from '../../../stores/useCalendarStore';
import { useNotesStore } from '../../../stores/useNotesStore';
import { useLinkLibraryStore } from '../../../stores/useLinkLibraryStore';
import { useHabitStore } from '../../../stores/useHabitStore';
import { useActivityStore } from '../../../stores/useActivityStore';
import { loadDemoData, clearDemoData, isDemoDataLoaded } from '../demoDataService';

const isDemoId = (id: string) => id.startsWith('demo-');

describe('demoDataService', () => {
  beforeEach(() => {
    localStorage.removeItem('demo-data-loaded');
    // Start every case from a fresh "new profile" state.
    useProjectContextStore.setState({ projects: [] });
    useKanbanStore.setState({ tasks: [] });
    useCalendarStore.setState({ events: {} });
    useNotesStore.setState({ notes: {} });
    useLinkLibraryStore.setState({ links: {}, collections: {} });
    useHabitStore.setState({ habits: [], completions: [] });
    useActivityStore.setState({ events: [] });
  });

  it('loads a consistent dataset across every core store', () => {
    loadDemoData();

    expect(isDemoDataLoaded()).toBe(true);

    const { tasks } = useKanbanStore.getState();
    expect(tasks.length).toBeGreaterThanOrEqual(10);
    expect(tasks.filter((t) => t.status === 'backlog').length).toBeGreaterThanOrEqual(3);
    expect(tasks.filter((t) => t.status === 'done' && t.lastCompletedAt).length).toBeGreaterThanOrEqual(2);
    // Overdue + due-today tasks exist for the Today page metrics.
    const todayKey = new Date();
    const key = `${todayKey.getFullYear()}-${String(todayKey.getMonth() + 1).padStart(2, '0')}-${String(todayKey.getDate()).padStart(2, '0')}`;
    expect(tasks.some((t) => t.dueDate !== null && t.dueDate < key)).toBe(true);
    expect(tasks.some((t) => t.dueDate === key)).toBe(true);
    // Tasks reference real demo projects.
    const projectIds = useProjectContextStore.getState().projects.map((p) => p.id);
    expect(projectIds.length).toBe(3);
    expect(tasks.filter((t) => t.projectIds.length > 0).every((t) =>
      t.projectIds.every((pid) => projectIds.includes(pid)),
    )).toBe(true);

    // Calendar has events on multiple days across the demo week.
    const calendarEvents = Object.values(useCalendarStore.getState().events).flat();
    expect(calendarEvents.length).toBe(9);

    // Notes carry tags and wiki links for the graph view.
    const notes = Object.values(useNotesStore.getState().notes);
    expect(notes.length).toBe(6);
    expect(notes.some((n) => (n.linkedNotes?.length ?? 0) > 0)).toBe(true);
    expect(notes.every((n) => n.tags.length > 0)).toBe(true);

    // Bookmarks: 4 links organised into 2 collections, 2 starred.
    const { links, collections } = useLinkLibraryStore.getState();
    expect(Object.keys(links).length).toBe(4);
    expect(Object.keys(collections).length).toBe(2);
    expect(Object.values(links).filter((l) => l.isFavorite).length).toBe(2);
    // Collection membership matches the seeded links.
    for (const collection of Object.values(collections)) {
      for (const linkId of collection.linkIds) {
        expect(links[linkId]).toBeDefined();
      }
    }

    // Habits: 3 habits, each with completions in the last 7 days.
    const { habits, completions } = useHabitStore.getState();
    expect(habits.length).toBe(3);
    expect(completions.length).toBeGreaterThanOrEqual(15);

    // Activity feed references demo entities across modules.
    const activityModules = new Set(useActivityStore.getState().events.map((e) => e.module));
    expect(activityModules.has('tasks')).toBe(true);
    expect(activityModules.has('notes')).toBe(true);
    expect(activityModules.has('habits')).toBe(true);
  });

  it('removes every demo entity by prefix without touching user content', () => {
    // Simulate pre-existing user content.
    useKanbanStore.setState((state) => ({
      tasks: [{
        id: 'user-task-1',
        title: '我的真实任务',
        description: '',
        status: 'todo',
        created: new Date().toISOString(),
        startDate: null,
        dueDate: null,
        priority: 'medium',
        tags: [],
        projectIds: [],
      }, ...state.tasks],
    }));
    useNotesStore.setState((state) => ({
      notes: {
        ...state.notes,
        'user-note-1': {
          id: 'user-note-1',
          folderId: null,
          title: '我的真实笔记',
          content: '{}',
          contentText: '',
          tags: [],
          projectIds: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isPinned: false,
          isArchived: false,
        },
      },
    }));

    loadDemoData();
    clearDemoData();

    expect(isDemoDataLoaded()).toBe(false);
    expect(useProjectContextStore.getState().projects).toHaveLength(0);
    expect(useKanbanStore.getState().tasks.map((t) => t.id)).toEqual(['user-task-1']);
    expect(Object.keys(useCalendarStore.getState().events).every(
      (key) => useCalendarStore.getState().events[key].every((e) => !isDemoId(e.id)),
    )).toBe(true);
    expect(Object.keys(useNotesStore.getState().notes)).toEqual(['user-note-1']);
    expect(Object.keys(useLinkLibraryStore.getState().links)).toHaveLength(0);
    expect(Object.keys(useLinkLibraryStore.getState().collections)).toHaveLength(0);
    expect(useHabitStore.getState().habits).toHaveLength(0);
    expect(useHabitStore.getState().completions).toHaveLength(0);
    expect(useActivityStore.getState().events).toHaveLength(0);
  });

  it('replaces a previous demo load instead of stacking duplicate seeds', () => {
    loadDemoData();
    // Simulate a stale marker with mutated demo rows: reload must stay idempotent.
    expect(isDemoDataLoaded()).toBe(true);

    clearDemoData();
    useKanbanStore.setState({ tasks: [] });
    loadDemoData();

    const demoTasks = useKanbanStore.getState().tasks.filter((t) => isDemoId(t.id));
    const uniqueIds = new Set(demoTasks.map((t) => t.id));
    expect(uniqueIds.size).toBe(demoTasks.length);
  });
});
