/**
 * Project Context Store
 *
 * Manages hierarchical projects for global content filtering.
 * This store handles:
 * - Project CRUD operations
 * - Global active project filter state
 * - Hierarchical project navigation
 *
 * The active project filter persists across pages and sessions,
 * scoping all entities (tasks, notes, events, links) to the
 * selected project context.
 *
 * Persists to IndexedDB via createSyncedStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createSyncedStorage } from '../lib/syncedStorage';
import type { ProjectContext } from '../types';
import {
  decodePersistedValue,
  isUnknownRecord,
  toIsoDate,
  toStringArray,
  unwrapPersistedState,
} from '../utils/persistedState';

// ============================================================================
// Types
// ============================================================================

interface ProjectContextState {
  // Data
  projects: ProjectContext[];

  // Global filter state (empty = "All" / no filter)
  activeProjectIds: string[];

  // UI state (not persisted)
  isDropdownOpen: boolean;
}

interface ProjectContextActions {
  // Project CRUD
  createProject: (
    project: Omit<ProjectContext, 'id' | 'createdAt' | 'updatedAt'>
  ) => string;
  updateProject: (
    id: string,
    updates: Partial<Omit<ProjectContext, 'id' | 'createdAt'>>
  ) => void;
  archiveProject: (id: string) => void;
  restoreProject: (id: string) => void;
  deleteProject: (id: string) => void;
  moveProject: (id: string, newParentId: string | null) => void;

  // Global filter actions
  setActiveProjects: (ids: string[]) => void;
  toggleActiveProject: (id: string) => void;
  clearActiveProjects: () => void;

  // UI actions
  setDropdownOpen: (open: boolean) => void;
  toggleDropdown: () => void;

  // Queries
  getProject: (id: string) => ProjectContext | undefined;
  getRootProjects: () => ProjectContext[];
  getChildProjects: (parentId: string | null) => ProjectContext[];
  getProjectPath: (id: string) => ProjectContext[];
  getActiveProjects: () => ProjectContext[];
  getAllActiveProjects: () => ProjectContext[]; // Non-archived projects
  getArchivedProjects: () => ProjectContext[];
}

type ProjectContextStore = ProjectContextState & ProjectContextActions;

// ============================================================================
// Utility Functions
// ============================================================================

const generateId = () =>
  `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const RECOVERY_TIMESTAMP = new Date(0).toISOString();

function normalizeProject(value: unknown, index: number): ProjectContext | null {
  const decoded = decodePersistedValue(value);
  if (!isUnknownRecord(decoded)) return null;
  const id =
    typeof decoded.id === 'string' && decoded.id.trim()
      ? decoded.id
      : `recovered-project-${index + 1}`;
  const createdAt = toIsoDate(decoded.createdAt, RECOVERY_TIMESTAMP);
  return {
    ...decoded,
    id,
    name:
      typeof decoded.name === 'string' && decoded.name.trim()
        ? decoded.name
        : `恢复的项目 ${index + 1}`,
    parentId: typeof decoded.parentId === 'string' ? decoded.parentId : null,
    color:
      typeof decoded.color === 'string' && decoded.color.trim()
        ? decoded.color
        : '#3b82f6',
    icon: typeof decoded.icon === 'string' ? decoded.icon : undefined,
    description: typeof decoded.description === 'string' ? decoded.description : undefined,
    archivedAt:
      typeof decoded.archivedAt === 'string' ? decoded.archivedAt : undefined,
    createdAt,
    updatedAt: toIsoDate(decoded.updatedAt, createdAt),
  } as ProjectContext;
}

export function normalizeProjects(value: unknown): ProjectContext[] {
  const decoded = decodePersistedValue(value);
  const values = Array.isArray(decoded)
    ? decoded
    : isUnknownRecord(decoded)
      ? Object.values(decoded)
      : [];
  return values
    .map(normalizeProject)
    .filter((project): project is ProjectContext => project !== null);
}

// Default colors for new projects (cycling through semantic accents)
const PROJECT_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink/magenta
  '#06b6d4', // cyan
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#84cc16', // lime
];

let colorIndex = 0;
const getNextColor = () => {
  const color = PROJECT_COLORS[colorIndex % PROJECT_COLORS.length];
  colorIndex++;
  return color;
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useProjectContextStore = create<ProjectContextStore>()(
  persist(
    (set, get) => ({
      // Initial State
      projects: [],
      activeProjectIds: [],
      isDropdownOpen: false,

      // ========================================================================
      // Project CRUD
      // ========================================================================

      createProject: (projectData) => {
        const id = generateId();
        const now = new Date().toISOString();

        const project: ProjectContext = {
          ...projectData,
          id,
          color: projectData.color || getNextColor(),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          projects: [...state.projects, project],
        }));

        return id;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      archiveProject: (id) => {
        const now = new Date().toISOString();
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, archivedAt: now, updatedAt: now } : p
          ),
          // Remove from active filter if archived
          activeProjectIds: state.activeProjectIds.filter((pid) => pid !== id),
        }));
      },

      restoreProject: (id) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, archivedAt: undefined, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      deleteProject: (id) => {
        set((state) => {
          // Get all descendant project IDs (children, grandchildren, etc.)
          const getDescendantIds = (parentId: string): string[] => {
            const children = state.projects.filter((p) => p.parentId === parentId);
            return children.flatMap((child) => [
              child.id,
              ...getDescendantIds(child.id),
            ]);
          };

          const idsToDelete = new Set([id, ...getDescendantIds(id)]);

          return {
            projects: state.projects.filter((p) => !idsToDelete.has(p.id)),
            activeProjectIds: state.activeProjectIds.filter(
              (pid) => !idsToDelete.has(pid)
            ),
          };
        });
      },

      moveProject: (id, newParentId) => {
        // Prevent circular references
        if (newParentId === id) return;

        const state = get();
        const project = state.projects.find((p) => p.id === id);
        if (!project) return;

        // Check if newParentId is a descendant of id (would create a cycle)
        if (newParentId) {
          let current = state.projects.find((p) => p.id === newParentId);
          while (current) {
            if (current.id === id) return; // Would create cycle
            current = state.projects.find((p) => p.id === current?.parentId);
          }
        }

        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, parentId: newParentId, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },

      // ========================================================================
      // Global Filter Actions
      // ========================================================================

      setActiveProjects: (ids) => {
        set({ activeProjectIds: ids });
      },

      toggleActiveProject: (id) => {
        set((state) => {
          const isActive = state.activeProjectIds.includes(id);
          return {
            activeProjectIds: isActive
              ? state.activeProjectIds.filter((pid) => pid !== id)
              : [...state.activeProjectIds, id],
          };
        });
      },

      clearActiveProjects: () => {
        set({ activeProjectIds: [] });
      },

      // ========================================================================
      // UI Actions
      // ========================================================================

      setDropdownOpen: (open) => {
        set({ isDropdownOpen: open });
      },

      toggleDropdown: () => {
        set((state) => ({ isDropdownOpen: !state.isDropdownOpen }));
      },

      // ========================================================================
      // Queries
      // ========================================================================

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      getRootProjects: () => {
        return get()
          .projects.filter((p) => p.parentId === null && !p.archivedAt)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      getChildProjects: (parentId) => {
        return get()
          .projects.filter((p) => p.parentId === parentId && !p.archivedAt)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      getProjectPath: (id) => {
        const path: ProjectContext[] = [];
        let current = get().projects.find((p) => p.id === id);

        while (current) {
          path.unshift(current);
          current = get().projects.find((p) => p.id === current?.parentId);
        }

        return path;
      },

      getActiveProjects: () => {
        const state = get();
        return state.activeProjectIds
          .map((id) => state.projects.find((p) => p.id === id))
          .filter((p): p is ProjectContext => p !== undefined);
      },

      getAllActiveProjects: () => {
        return get()
          .projects.filter((p) => !p.archivedAt)
          .sort((a, b) => a.name.localeCompare(b.name));
      },

      getArchivedProjects: () => {
        return get()
          .projects.filter((p) => p.archivedAt)
          .sort((a, b) => a.name.localeCompare(b.name));
      },
    }),
    {
      name: 'project-context',
      storage: createJSONStorage(() => createSyncedStorage()),
      version: 2,
      partialize: (state) => ({
        projects: state.projects,
        activeProjectIds: state.activeProjectIds,
      }),
      migrate: (persistedState) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        const projects = normalizeProjects(state.projects);
        const existingIds = new Set(projects.map((project) => project.id));
        return {
          projects,
          activeProjectIds: toStringArray(state.activeProjectIds).filter((id) => existingIds.has(id)),
        };
      },
      merge: (persistedState, currentState) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        const projects = normalizeProjects(state.projects);
        const existingIds = new Set(projects.map((project) => project.id));
        return {
          ...currentState,
          projects,
          activeProjectIds: toStringArray(state.activeProjectIds).filter((id) => existingIds.has(id)),
        };
      },
    }
  )
);

// ============================================================================
// Selectors (for derived state)
// ============================================================================

/**
 * Check if global project filter is active (not showing "All")
 */
export const useIsProjectFilterActive = () =>
  useProjectContextStore((state) => state.activeProjectIds.length > 0);

/**
 * Get the display name for the current filter state
 */
export const useActiveProjectsLabel = () =>
  useProjectContextStore((state) => {
    if (state.activeProjectIds.length === 0) return '全部项目';
    if (state.activeProjectIds.length === 1) {
      const project = state.projects.find(
        (p) => p.id === state.activeProjectIds[0]
      );
      return project?.name ?? '未知项目';
    }
    return `${state.activeProjectIds.length} 个项目`;
  });

/**
 * Check if an item's projectIds match the active filter
 * Returns true if:
 * - No filter is active (activeProjectIds is empty)
 * - Item has at least one projectId that matches the active filter
 */
export const matchesProjectFilter = (
  itemProjectIds: string[],
  activeProjectIds: string[]
): boolean => {
  // No filter active = show all
  if (activeProjectIds.length === 0) return true;

  // Item has no projects = only show if "All" is selected
  if (itemProjectIds.length === 0) return false;

  // Check if any of the item's projects match the active filter
  return itemProjectIds.some((pid) => activeProjectIds.includes(pid));
};
