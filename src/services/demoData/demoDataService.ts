/**
 * Demo data lifecycle — load, detect and remove the bundled sample dataset.
 *
 * Seeding writes complete entities with `demo-` prefixed ids straight into
 * the canonical domain stores (which persist through their own middleware),
 * so every page reads demo content exactly like user content. Clearing
 * filters each store by the prefix and can never touch user rows.
 */

import { useProjectContextStore } from '../../stores/useProjectContextStore';
import { useKanbanStore } from '../../stores/useKanbanStore';
import { useCalendarStore } from '../../stores/useCalendarStore';
import { useNotesStore } from '../../stores/useNotesStore';
import { useLinkLibraryStore } from '../../stores/useLinkLibraryStore';
import { useHabitStore } from '../../stores/useHabitStore';
import { useActivityStore } from '../../stores/useActivityStore';
import { buildDemoDataset, isDemoId } from './demoSeed';

const DEMO_MARKER_KEY = 'demo-data-loaded';

export const isDemoDataLoaded = (): boolean => {
  try {
    return localStorage.getItem(DEMO_MARKER_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * True when the user already has real (non-demo) content, so the entry UI
 * can explain that loading only merges sample data and never touches it.
 */
export const hasExistingUserData = (): boolean =>
  useKanbanStore.getState().tasks.some((t) => !isDemoId(t.id)) ||
  Object.keys(useNotesStore.getState().notes).some((id) => !isDemoId(id));

export function loadDemoData(): void {
  if (isDemoDataLoaded()) return;
  const data = buildDemoDataset();

  useProjectContextStore.setState((state) => ({
    projects: [...state.projects.filter((p) => !isDemoId(p.id)), ...data.projects],
  }));

  useKanbanStore.setState((state) => ({
    tasks: [...state.tasks.filter((t) => !isDemoId(t.id)), ...data.tasks],
  }));

  useCalendarStore.setState((state) => {
    const events = { ...state.events };
    // Remove previously seeded demo events, then merge the fresh week in.
    Object.keys(events).forEach((key) => {
      if (events[key].some((e) => isDemoId(e.id))) delete events[key];
    });
    Object.entries(data.eventsByDate).forEach(([key, list]) => {
      events[key] = [...(events[key] ?? []), ...list];
    });
    return { events };
  });

  useNotesStore.setState((state) => {
    const notes = { ...state.notes };
    Object.keys(notes).forEach((id) => {
      if (isDemoId(id)) delete notes[id];
    });
    data.notes.forEach((n) => {
      notes[n.id] = n;
    });
    return { notes };
  });

  useLinkLibraryStore.setState((state) => {
    const links = { ...state.links };
    const collections = { ...state.collections };
    Object.keys(links).forEach((id) => {
      if (isDemoId(id)) delete links[id];
    });
    Object.keys(collections).forEach((id) => {
      if (isDemoId(id)) delete collections[id];
    });
    Object.assign(links, data.links);
    Object.assign(collections, data.collections);
    return { links, collections };
  });

  useHabitStore.setState((state) => ({
    habits: [...state.habits.filter((h) => !isDemoId(h.id)), ...data.habits],
    completions: [...state.completions.filter((c) => !isDemoId(c.id)), ...data.completions],
  }));

  useActivityStore.setState((state) => ({
    events: [...state.events.filter((e) => !isDemoId(e.id)), ...data.activities],
  }));

  try {
    localStorage.setItem(DEMO_MARKER_KEY, '1');
  } catch {
    // Persistence unavailable — the dataset stays for the current session only.
  }
}

export function clearDemoData(): void {
  useProjectContextStore.setState((state) => ({
    projects: state.projects.filter((p) => !isDemoId(p.id)),
  }));
  useKanbanStore.setState((state) => ({
    tasks: state.tasks.filter((t) => !isDemoId(t.id)),
  }));
  useCalendarStore.setState((state) => ({
    events: Object.fromEntries(
      Object.entries(state.events).map(([key, list]) => [key, list.filter((e) => !isDemoId(e.id))]),
    ),
  }));
  useNotesStore.setState((state) => {
    const notes = { ...state.notes };
    Object.keys(notes).forEach((id) => {
      if (isDemoId(id)) delete notes[id];
    });
    return { notes };
  });
  useLinkLibraryStore.setState((state) => {
    const links = { ...state.links };
    const collections = { ...state.collections };
    Object.keys(links).forEach((id) => {
      if (isDemoId(id)) delete links[id];
    });
    Object.keys(collections).forEach((id) => {
      if (isDemoId(id)) delete collections[id];
    });
    return { links, collections };
  });
  useHabitStore.setState((state) => ({
    habits: state.habits.filter((h) => !isDemoId(h.id)),
    completions: state.completions.filter((c) => !isDemoId(c.id)),
  }));
  useActivityStore.setState((state) => ({
    events: state.events.filter((e) => !isDemoId(e.id)),
  }));

  try {
    localStorage.removeItem(DEMO_MARKER_KEY);
  } catch {
    // Nothing to clean up if storage is unavailable.
  }
}
