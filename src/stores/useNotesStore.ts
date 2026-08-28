/**
 * Notes Store
 *
 * Zustand store for managing notes state
 * Persisted to IndexedDB via syncedStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../services/logger';
import type {
  Note,
  NoteUpdate,
  NoteSortConfig,
  NoteFilter,
  NoteTemplate,
  NoteTreeNode,
} from '../types/notes';
import { NOTE_CONSTANTS } from '../types/notes';
import { createSyncedStorage } from '../lib/syncedStorage';
import { useUndoStore } from './useUndoStore';
import { useActivityStore } from './useActivityStore';
import { extractWikiLinks, resolveLinksToIds, getBacklinks as getBacklinksUtil } from '../utils/backlinks';
import { fuzzySearch, type SearchResult } from '../utils/fuzzySearch';
import { getDailyNote as getDailyNoteUtil, createDailyNote as createDailyNoteUtil } from '../services/dailyNotes';
import { useSettingsStore } from './useSettingsStore';
import { findBlockInContent } from '../utils/blockReferences';
import { createNotePreview } from '../utils/notePreview';
import { useProjectContextStore, matchesProjectFilter } from './useProjectContextStore';
import { ensureLexicalContent, isValidLexicalJson, replaceTextInLexical } from '../utils/markdownToLexical';
import {
  decodePersistedValue,
  isUnknownRecord,
  toStringArray,
  toValidDate,
  unwrapPersistedState,
} from '../utils/persistedState';

const log = logger.module('NotesStore');

const RECOVERY_DATE = new Date(0);

function normalizePersistedNote(rawValue: unknown, fallbackId: string): Note | null {
  const decoded = decodePersistedValue(rawValue);
  // A scalar string may be the only surviving copy of a legacy note. Keep it
  // as recovered plain text instead of silently deleting the entry.
  const raw = isUnknownRecord(decoded)
    ? decoded
    : typeof decoded === 'string'
      ? { contentText: decoded }
      : null;
  if (!raw) return null;

  const id = typeof raw.id === 'string' && raw.id.trim() ? raw.id : fallbackId;
  const content = typeof raw.content === 'string' ? raw.content : '';
  const contentIsSerializedLexical = (() => {
    try {
      const parsed = JSON.parse(content) as { root?: unknown };
      return typeof parsed === 'object' && parsed !== null &&
        typeof parsed.root === 'object' && parsed.root !== null;
    } catch {
      return false;
    }
  })();
  const contentText = typeof raw.contentText === 'string'
    ? raw.contentText
    // Legacy Markdown belongs in contentText, but a malformed serialized
    // Lexical document is not user text. `ensureLexicalContent` can repair it
    // to a safe empty paragraph without exposing its JSON to the user.
    : content && !isValidLexicalJson(content) && !contentIsSerializedLexical
      ? content
      : '';
  const createdAt = toValidDate(raw.createdAt, RECOVERY_DATE);
  const updatedAt = toValidDate(raw.updatedAt, createdAt);

  return {
    ...raw,
    id,
    folderId: typeof raw.folderId === 'string' ? raw.folderId : null,
    parentNoteId: typeof raw.parentNoteId === 'string' ? raw.parentNoteId : null,
    title:
      typeof raw.title === 'string' && raw.title.trim()
        ? raw.title
        : NOTE_CONSTANTS.DEFAULT_TITLE,
    content: ensureLexicalContent(content, contentText),
    contentText,
    tags: toStringArray(raw.tags),
    projectIds: toStringArray(raw.projectIds),
    aliases: raw.aliases === undefined ? undefined : toStringArray(raw.aliases),
    linkedNotes: raw.linkedNotes === undefined ? undefined : toStringArray(raw.linkedNotes),
    linkedEventIds:
      raw.linkedEventIds === undefined ? undefined : toStringArray(raw.linkedEventIds),
    createdAt,
    updatedAt,
    deletedAt: raw.deletedAt == null ? undefined : toValidDate(raw.deletedAt, updatedAt),
    isPinned: raw.isPinned === true,
    isArchived: raw.isArchived === true,
    isFavorite: raw.isFavorite === true,
  } as Note;
}

/** Repair notes independently so one malformed entry never wipes the library. */
export function normalizePersistedNotes(value: unknown): Record<string, Note> {
  const decoded = decodePersistedValue(value);
  const entries: Array<[string, unknown]> = Array.isArray(decoded)
    ? decoded.map((note, index) => {
        const id = isUnknownRecord(note) && typeof note.id === 'string'
          ? note.id
          : `recovered-note-${index + 1}`;
        return [id, note];
      })
    : isUnknownRecord(decoded)
      ? Object.entries(decoded)
      : [];

  const normalized: Record<string, Note> = {};
  for (const [key, rawNote] of entries) {
    const note = normalizePersistedNote(rawNote, key);
    if (note) normalized[note.id] = note;
  }
  return normalized;
}

/**
 * Phase 4: Default note templates for quick note creation
 */
const DEFAULT_NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'meeting-notes',
    name: '会议记录',
    description: '## 会议记录\n\n**日期：** \n**参会人：** \n\n### 议程\n1. \n\n### 讨论要点\n- \n\n### 行动项\n- [ ] \n\n### 后续步骤\n',
    icon: '📋',
    category: 'Work',
    defaultTags: ['meeting'],
    isBuiltIn: true,
  },
  {
    id: 'daily-journal',
    name: '每日日记',
    description: '## 每日日记\n\n**日期：** \n\n### 感恩\n- \n\n### 今日目标\n- [ ] \n\n### 反思\n\n\n### 明日焦点\n',
    icon: '📔',
    category: 'Personal',
    defaultTags: ['journal'],
    isBuiltIn: true,
  },
  {
    id: 'project-plan',
    name: '项目计划',
    description: '## 项目： \n\n### 概述\n\n\n### 目标\n- \n\n### 时间线\n| 阶段 | 开始 | 结束 | 状态 |\n|-------|-------|-----|--------|\n| 规划 | | | |\n| 开发 | | | |\n| 测试 | | | |\n\n### 资源\n- \n\n### 风险\n- \n',
    icon: '📊',
    category: 'Work',
    defaultTags: ['project'],
    isBuiltIn: true,
  },
  {
    id: 'todo-list',
    name: '待办清单',
    description: '## 待办清单\n\n### 高优先级\n- [ ] \n\n### 中优先级\n- [ ] \n\n### 低优先级\n- [ ] \n\n### 已完成\n- [x] \n',
    icon: '✅',
    category: 'Productivity',
    defaultTags: ['todo'],
    isBuiltIn: true,
  },
  {
    id: 'weekly-review',
    name: '每周回顾',
    description: '## 每周回顾\n\n**周次：** \n\n### 成果\n- \n\n### 挑战\n- \n\n### 经验教训\n- \n\n### 下周目标\n- [ ] \n\n### 备注\n',
    icon: '📅',
    category: 'Personal',
    defaultTags: ['review', 'weekly'],
    isBuiltIn: true,
  },
  {
    id: 'decision-record',
    name: '决策记录',
    description: '## 决策：{title}\n\n**日期：** {date}\n**状态：** 提议 | 已接受 | 已弃用 | 已取代\n\n### 背景\n我们需要解决的问题是什么？\n\n\n### 考虑的方案\n1. **方案 A** — \n2. **方案 B** — \n3. **方案 C** — \n\n### 决策\n决定了什么？\n\n\n### 理由\n为什么选择此方案而非其他备选方案？\n\n\n### 影响\n**正面影响：**\n- \n\n**负面影响：**\n- \n\n**风险：**\n- \n\n### 相关\n- \n',
    icon: '⚖️',
    category: 'Work',
    defaultTags: ['decision', 'adr'],
    isBuiltIn: true,
  },
];

/**
 * Notes Store State
 */
interface NotesStore {
  // State
  notes: Record<string, Note>; // Map of note ID -> Note
  activeNoteId: string | null; // Currently open note
  sortConfig: NoteSortConfig;
  filter: NoteFilter;
  customNoteTemplates: NoteTemplate[]; // User-created templates

  // Actions - CRUD
  createNote: (params?: Partial<Note>) => Note;
  getNote: (id: string) => Note | undefined;
  updateNote: (id: string, updates: NoteUpdate) => void;
  deleteNote: (id: string) => void;
  restoreNote: (id: string) => void;
  permanentlyDeleteNote: (id: string) => void;
  duplicateNote: (id: string) => Note | null;

  // Actions - Bulk operations
  deleteNotes: (ids: string[]) => void;
  restoreNotes: (ids: string[]) => void;
  permanentlyDeleteNotes: (ids: string[]) => void;
  moveNote: (noteId: string, targetFolderId: string | null) => void;
  moveNotesToFolder: (noteIds: string[], folderId: string | null) => void;
  archiveNotes: (noteIds: string[]) => void;
  unarchiveNotes: (noteIds: string[]) => void;

  // Actions - Queries
  getAllNotes: () => Note[];
  getFilteredNotes: () => Note[];
  getNotesByFolder: (folderId: string | null) => Note[];
  getNotesBy: (predicate: (note: Note) => boolean) => Note[];
  searchNotes: (query: string) => Note[];
  fuzzySearchNotes: (query: string) => SearchResult<Note>[];

  // Actions - Pin/Archive/Favorite
  togglePin: (id: string) => void;
  toggleArchive: (id: string) => void;
  toggleFavorite: (id: string) => void;

  // Actions - Tags
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;
  getAllTags: () => string[];
  getTagUsageCounts: () => Map<string, number>;
  renameTag: (oldTag: string, newTag: string) => void;
  mergeTags: (sourceTags: string[], targetTag: string) => void;
  deleteTag: (tag: string) => void;
  renameTagGlobally: (oldTag: string, newTag: string) => void;
  deleteTagGlobally: (tag: string) => void;

  // P2: Bulk tag operations
  bulkAddTag: (noteIds: string[], tag: string) => void;
  bulkRemoveTag: (noteIds: string[], tag: string) => void;
  replaceTag: (oldTag: string, newTag: string) => void;

  // Actions - UI state
  setActiveNote: (id: string | null) => void;
  setSortConfig: (config: NoteSortConfig) => void;
  setFilter: (filter: NoteFilter) => void;

  // Actions - Utility
  getNoteCount: () => number;
  getNotesInFolder: (folderId: string | null) => Note[];
  exportNotes: () => Note[];
  importNotes: (notes: Note[], merge: boolean) => void;
  clearAllNotes: () => void;

  // Actions - Backlinks (Phase 4)
  getBacklinks: (noteId: string) => Note[];
  updateLinkedNotes: (noteId: string, content: string) => void;

  // P1: Unlinked mentions - Convert text to wiki link
  convertToWikiLink: (noteId: string, position: number, targetTitle: string) => void;

  // Actions - Templates (Phase 4)
  getNoteTemplates: () => NoteTemplate[];
  createNoteFromTemplate: (templateId: string) => Note | null;
  createNoteTemplate: (params: Partial<NoteTemplate>) => NoteTemplate;
  updateNoteTemplate: (id: string, updates: Partial<NoteTemplate>) => void;
  deleteNoteTemplate: (id: string) => void;
  getNoteTemplate: (id: string) => NoteTemplate | undefined;
  getAllNoteTemplates: () => NoteTemplate[];

  // Actions - Daily Notes
  getDailyNote: (date: Date) => Note | null;
  createDailyNote: (date: Date) => Note;
  getOrCreateDailyNote: (date: Date) => Note;

  // P2: Block-level links & hover preview helpers
  getBlockContent: (noteId: string, blockId: string) => string | null;
  getNotePreview: (noteId: string, blockId?: string) => import('../types/notes').NotePreview | null;

  // Subnotes/nested notes support
  getChildNotes: (noteId: string) => Note[];
  getNoteTree: (folderId: string | null) => NoteTreeNode[];
  setParentNote: (noteId: string, parentNoteId: string | null) => void;
  canSetParentNote: (noteId: string, parentNoteId: string | null) => boolean;
  isDescendantNote: (noteId: string, potentialAncestorId: string) => boolean;

  // Calendar-Notes bidirectional linking (Wave 5D)
  linkEventToNote: (noteId: string, eventId: string) => void;
  unlinkEventFromNote: (noteId: string, eventId: string) => void;

  // Wave 6A: Note aliases
  updateAliases: (noteId: string, aliases: string[]) => void;
}

/**
 * Default note values
 */
const createDefaultNote = (overrides?: Partial<Note>): Note => {
  const now = new Date();
  const note: Note = {
    id: uuidv4(),
    folderId: null,
    title: NOTE_CONSTANTS.DEFAULT_TITLE,
    content: '', // Empty Lexical state
    contentText: '',
    tags: [],
    projectIds: [],
    createdAt: now,
    updatedAt: now,
    isPinned: false,
    isArchived: false,
    ...overrides,
  };
  note.content = ensureLexicalContent(note.content, note.contentText);
  return note;
};

/**
 * Sort notes based on sort config
 */
const sortNotes = (notes: Note[], config: NoteSortConfig): Note[] => {
  const sorted = [...notes];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (config.field) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'createdAt':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'updatedAt':
        comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
        break;
      case 'manual':
        // Manual sort - preserve order (could add sortOrder field in future)
        comparison = 0;
        break;
    }

    return config.order === 'asc' ? comparison : -comparison;
  });

  // Always pin pinned notes to top
  return sorted.sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });
};

/**
 * Filter notes based on filter type
 */
const filterNotes = (notes: Note[], filter: NoteFilter): Note[] => {
  if (filter === 'trash') return notes.filter((note) => note.deletedAt);
  const activeNotes = notes.filter((note) => !note.deletedAt);
  switch (filter) {
    case 'favorites':
      return activeNotes.filter((note) => note.isFavorite);
    case 'pinned':
      return activeNotes.filter((note) => note.isPinned);
    case 'archived':
      return activeNotes.filter((note) => note.isArchived);
    case 'unarchived':
      return activeNotes.filter((note) => !note.isArchived);
    case 'all':
    default:
      return activeNotes;
  }
};

/**
 * Create the Notes store
 */
export const useNotesStore = create<NotesStore>()(
  persist(
    (set, get) => ({
      // Initial state
      notes: {},
      activeNoteId: null,
      sortConfig: {
        field: 'updatedAt',
        order: 'desc',
      },
      filter: 'unarchived',
      customNoteTemplates: [],

      // CRUD Operations
      createNote: (params) => {
        const newNote = createDefaultNote(params);
        set((state) => ({
          notes: {
            ...state.notes,
            [newNote.id]: newNote,
          },
          activeNoteId: newNote.id, // Auto-select new note
        }));
        log.debug('Note created', { id: newNote.id });
        useActivityStore.getState().logActivity({
          type: 'created',
          module: 'notes',
          entityId: newNote.id,
          entityTitle: newNote.title || '未命名笔记',
        });
        return newNote;
      },

      getNote: (id) => {
        return get().notes[id];
      },

      updateNote: (id, updates) => {
        const note = get().notes[id];
        if (!note) {
          log.warn('Note not found', { id });
          return;
        }

        // Only update timestamp if content/title/tags actually changed
        // Skip timestamp update for UI-only changes (like folderId without content change)
        const shouldUpdateTimestamp =
          updates.content !== undefined ||
          updates.title !== undefined ||
          updates.tags !== undefined;
        // `content` is the rich-document boundary. Normalize only when it is
        // explicitly written so legacy plain-text-only updates to contentText
        // retain their existing behavior, while version restores and external
        // callers can never persist an empty Lexical root.
        const normalizedUpdates = updates.content !== undefined
          ? {
              ...updates,
              content: ensureLexicalContent(
                updates.content,
                updates.contentText ?? note.contentText
              ),
            }
          : updates;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              ...normalizedUpdates,
              ...(shouldUpdateTimestamp ? { updatedAt: new Date() } : {}),
            },
          },
        }));
        log.debug('Note updated', { id, timestampUpdated: shouldUpdateTimestamp });
        if (shouldUpdateTimestamp) {
          useActivityStore.getState().logActivity({
            type: 'updated',
            module: 'notes',
            entityId: id,
            entityTitle: note.title || '未命名笔记',
          });
        }
      },

      deleteNote: (id) => {
        // Save note for undo
        const noteToDelete = get().notes[id];
        if (!noteToDelete) {
          log.warn('Note not found', { id });
          return;
        }

        // Store the previous activeNoteId for undo
        const wasActive = get().activeNoteId === id;

        const deletedAt = new Date();
        set((state) => ({
          notes: {
            ...state.notes,
            [id]: { ...noteToDelete, deletedAt },
          },
          activeNoteId: state.activeNoteId === id ? null : state.activeNoteId,
        }));

        log.debug('Note deleted', { id });
        useActivityStore.getState().logActivity({
          type: 'deleted',
          module: 'notes',
          entityId: id,
          entityTitle: noteToDelete.title || '未命名笔记',
        });

        // Add undo action
        useUndoStore.getState().addUndoAction(
          `已删除笔记“${noteToDelete.title}”`,
          () => {
            // Restore the note
            set((state) => ({
              notes: {
                ...state.notes,
                [id]: noteToDelete,
              },
              activeNoteId: wasActive ? id : state.activeNoteId,
            }));
            log.debug('Note restored (undo)', { id });
          }
        );
      },

      restoreNote: (id) => {
        const note = get().notes[id];
        if (!note?.deletedAt) return;
        set((state) => ({
          notes: { ...state.notes, [id]: { ...note, deletedAt: undefined } },
        }));
        log.debug('Note restored from trash', { id });
      },

      permanentlyDeleteNote: (id) => {
        const note = get().notes[id];
        if (!note?.deletedAt) return;
        set((state) => {
          const { [id]: _deleted, ...remainingNotes } = state.notes;
          return { notes: remainingNotes };
        });
        import('../services/indexedDB').then(({ indexedDBService }) => {
          indexedDBService.deleteNoteImages(id).catch((err) => {
            log.error('Failed to delete note images', { id, error: err });
          });
        });
        log.info('Note permanently deleted', { id });
      },

      duplicateNote: (id) => {
        const original = get().notes[id];
        if (!original) {
          log.warn('Note not found', { id });
          return null;
        }

        // Destructure to exclude id, createdAt, updatedAt so duplicate gets fresh values
        const { id: _ignoreId, createdAt: _ignoreCreated, updatedAt: _ignoreUpdated, ...originalWithoutMeta } = original;

        const duplicate = createDefaultNote({
          ...originalWithoutMeta,
          title: `${original.title} 的副本`,
          isPinned: false, // Don't copy pin status
        });

        set((state) => ({
          notes: {
            ...state.notes,
            [duplicate.id]: duplicate,
          },
        }));

        log.debug('Note duplicated', { original: id, duplicate: duplicate.id });
        return duplicate;
      },

      // Bulk operations
      deleteNotes: (ids) => {
        const deletedAt = new Date();
        set((state) => {
          const updatedNotes = { ...state.notes };
          ids.forEach((id) => {
            if (updatedNotes[id]) updatedNotes[id] = { ...updatedNotes[id], deletedAt };
          });
          return {
            notes: updatedNotes,
            activeNoteId: ids.includes(state.activeNoteId || '')
              ? null
              : state.activeNoteId,
          };
        });
        log.debug('Moved notes to trash', { count: ids.length });
      },

      restoreNotes: (ids) => {
        set((state) => ({
          notes: Object.fromEntries(Object.entries(state.notes).map(([id, note]) => [
            id,
            ids.includes(id) ? { ...note, deletedAt: undefined } : note,
          ])),
        }));
      },

      permanentlyDeleteNotes: (ids) => {
        ids.forEach((id) => get().permanentlyDeleteNote(id));
      },

      moveNote: (noteId, targetFolderId) => {
        const note = get().notes[noteId];
        if (!note) {
          log.warn('Note not found', { noteId });
          return;
        }

        const previousFolderId = note.folderId;

        // Don't move if already in target folder
        if (previousFolderId === targetFolderId) {
          log.debug('Note already in target folder', { noteId, folderId: targetFolderId });
          return;
        }

        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: {
              ...note,
              folderId: targetFolderId,
              // Don't update timestamp for folder moves (UI-only change)
            },
          },
        }));

        log.debug('Moved note to folder', { noteId, from: previousFolderId, to: targetFolderId });

        // Add undo action
        useUndoStore.getState().addUndoAction(
          `已移动笔记“${note.title}”`,
          () => {
            set((state) => {
              const currentNote = state.notes[noteId];
              if (!currentNote) return state;
              return {
                notes: {
                  ...state.notes,
                  [noteId]: {
                    ...currentNote,
                    folderId: previousFolderId,
                  },
                },
              };
            });
            log.debug('Moved note restored (undo)', { noteId, to: previousFolderId });
          }
        );
      },

      moveNotesToFolder: (noteIds, folderId) => {
        set((state) => {
          const updatedNotes = { ...state.notes };
          noteIds.forEach((id) => {
            if (updatedNotes[id]) {
              updatedNotes[id] = {
                ...updatedNotes[id],
                folderId,
                updatedAt: new Date(),
              };
            }
          });
          return { notes: updatedNotes };
        });
        log.debug('Moved notes to folder', { count: noteIds.length, folderId });
      },

      archiveNotes: (noteIds) => {
        set((state) => {
          const updatedNotes = { ...state.notes };
          noteIds.forEach((id) => {
            if (updatedNotes[id]) {
              updatedNotes[id] = {
                ...updatedNotes[id],
                isArchived: true,
                updatedAt: new Date(),
              };
            }
          });
          return { notes: updatedNotes };
        });
        log.debug('Archived notes', { count: noteIds.length });
      },

      unarchiveNotes: (noteIds) => {
        set((state) => {
          const updatedNotes = { ...state.notes };
          noteIds.forEach((id) => {
            if (updatedNotes[id]) {
              updatedNotes[id] = {
                ...updatedNotes[id],
                isArchived: false,
                updatedAt: new Date(),
              };
            }
          });
          return { notes: updatedNotes };
        });
        log.debug('Unarchived notes', { count: noteIds.length });
      },

      // Queries
      getAllNotes: () => {
        const state = get();
        const notes = Object.values(state.notes).filter((note) => !note.deletedAt);
        const filtered = filterNotes(notes, state.filter);
        return sortNotes(filtered, state.sortConfig);
      },

      getFilteredNotes: () => {
        const { activeProjectIds } = useProjectContextStore.getState();
        const state = get();
        let notes = Object.values(state.notes).filter((note) => !note.deletedAt);

        // Apply archive filter
        notes = filterNotes(notes, state.filter);

        // Apply project filter using centralized utility
        const projectFiltered = notes.filter((note) =>
          matchesProjectFilter(note.projectIds, activeProjectIds)
        );

        return sortNotes(projectFiltered, state.sortConfig);
      },

      getNotesByFolder: (folderId) => {
        const state = get();
        const notes = Object.values(state.notes).filter(
          (note) => note.folderId === folderId && !note.deletedAt
        );
        const filtered = filterNotes(notes, state.filter);
        return sortNotes(filtered, state.sortConfig);
      },

      getNotesBy: (predicate) => {
        const notes = Object.values(get().notes).filter(
          (note) => !note.deletedAt && predicate(note)
        );
        return sortNotes(notes, get().sortConfig);
      },

      searchNotes: (query) => {
        if (!query.trim()) return [];

        // Use fuzzy search for better results
        const allNotes = Object.values(get().notes).filter((note) => !note.deletedAt);
        const results = fuzzySearch(
          allNotes,
          query,
          [
            { key: 'title', weight: 1.0 },
            { key: 'contentText', weight: 0.7 },
            { key: 'tags' as keyof Note, weight: 0.5 },
          ],
          NOTE_CONSTANTS.MAX_SEARCH_RESULTS
        );

        return results.map((r) => r.item);
      },

      fuzzySearchNotes: (query) => {
        if (!query.trim()) return [];

        const allNotes = Object.values(get().notes).filter((note) => !note.deletedAt);
        return fuzzySearch(
          allNotes,
          query,
          [
            { key: 'title', weight: 1.0 },
            { key: 'contentText', weight: 0.7 },
            { key: 'tags' as keyof Note, weight: 0.5 },
          ],
          NOTE_CONSTANTS.MAX_SEARCH_RESULTS
        );
      },

      // Pin/Archive
      togglePin: (id) => {
        const note = get().notes[id];
        if (!note) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              isPinned: !note.isPinned,
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Toggled pin', { id, isPinned: !note.isPinned });
      },

      toggleArchive: (id) => {
        const note = get().notes[id];
        if (!note) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              isArchived: !note.isArchived,
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Toggled archive', { id, isArchived: !note.isArchived });
      },

      toggleFavorite: (id) => {
        const note = get().notes[id];
        if (!note) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              isFavorite: !note.isFavorite,
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Toggled favorite', { id, isFavorite: !note.isFavorite });
      },

      // Tags
      addTag: (id, tag) => {
        const note = get().notes[id];
        if (!note) return;

        // Don't add duplicate tags
        if (note.tags.includes(tag)) return;

        // Check max tags limit
        if (note.tags.length >= NOTE_CONSTANTS.MAX_TAGS) {
          log.warn('Max tags reached', { max: NOTE_CONSTANTS.MAX_TAGS });
          return;
        }

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              tags: [...note.tags, tag],
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Added tag', { id, tag });
      },

      removeTag: (id, tag) => {
        const note = get().notes[id];
        if (!note) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [id]: {
              ...note,
              tags: note.tags.filter((t) => t !== tag),
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Removed tag', { id, tag });
      },

      getAllTags: () => {
        const notes = Object.values(get().notes).filter((note) => !note.deletedAt);
        const tagSet = new Set<string>();
        notes.forEach((note) => {
          note.tags.forEach((tag) => tagSet.add(tag));
        });
        return Array.from(tagSet).sort();
      },

      getTagUsageCounts: () => {
        const notes = Object.values(get().notes).filter((note) => !note.deletedAt);
        const counts = new Map<string, number>();
        notes.forEach((note) => {
          note.tags.forEach((tag) => {
            counts.set(tag, (counts.get(tag) || 0) + 1);
          });
        });
        return counts;
      },

      renameTag: (oldTag, newTag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          if (note.tags.includes(oldTag)) {
            updatedNotes[id] = {
              ...note,
              tags: note.tags.map((tag) => (tag === oldTag ? newTag : tag)),
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tag renamed', { oldTag, newTag, count: Object.keys(updatedNotes).length });
        }
      },

      mergeTags: (sourceTags, targetTag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          const hasSourceTag = sourceTags.some((tag) => note.tags.includes(tag));
          if (hasSourceTag) {
            // Remove all source tags and add target tag
            const filteredTags = note.tags.filter((tag) => !sourceTags.includes(tag));
            const newTags = filteredTags.includes(targetTag)
              ? filteredTags
              : [...filteredTags, targetTag];

            updatedNotes[id] = {
              ...note,
              tags: newTags,
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tags merged', {
            sourceTags,
            targetTag,
            count: Object.keys(updatedNotes).length,
          });
        }
      },

      deleteTag: (tag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          if (note.tags.includes(tag)) {
            updatedNotes[id] = {
              ...note,
              tags: note.tags.filter((t) => t !== tag),
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tag deleted', { tag, count: Object.keys(updatedNotes).length });
        }
      },

      renameTagGlobally: (oldTag, newTag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          if (note.tags.includes(oldTag)) {
            updatedNotes[id] = {
              ...note,
              tags: note.tags.map((tag) => (tag === oldTag ? newTag : tag)),
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tag renamed globally', { oldTag, newTag, count: Object.keys(updatedNotes).length });
        }
      },

      deleteTagGlobally: (tag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          if (note.tags.includes(tag)) {
            updatedNotes[id] = {
              ...note,
              tags: note.tags.filter((t) => t !== tag),
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tag deleted globally', { tag, count: Object.keys(updatedNotes).length });
        }
      },

      // ==================== BULK TAG OPERATIONS (P2) ====================

      bulkAddTag: (noteIds, tag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        noteIds.forEach((id) => {
          const note = notes[id];
          if (note && !note.tags.includes(tag)) {
            updatedNotes[id] = {
              ...note,
              tags: [...note.tags, tag],
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Bulk added tag', { tag, count: Object.keys(updatedNotes).length });
        }
      },

      bulkRemoveTag: (noteIds, tag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        noteIds.forEach((id) => {
          const note = notes[id];
          if (note && note.tags.includes(tag)) {
            updatedNotes[id] = {
              ...note,
              tags: note.tags.filter((t) => t !== tag),
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Bulk removed tag', { tag, count: Object.keys(updatedNotes).length });
        }
      },

      replaceTag: (oldTag, newTag) => {
        const notes = get().notes;
        const updatedNotes: Record<string, Note> = {};

        Object.entries(notes).forEach(([id, note]) => {
          if (note.tags.includes(oldTag)) {
            const newTags = note.tags.map((t) => (t === oldTag ? newTag : t));
            // Remove duplicates if newTag already exists
            const uniqueTags = Array.from(new Set(newTags));

            updatedNotes[id] = {
              ...note,
              tags: uniqueTags,
              updatedAt: new Date(),
            };
          }
        });

        if (Object.keys(updatedNotes).length > 0) {
          set((state) => ({
            notes: {
              ...state.notes,
              ...updatedNotes,
            },
          }));
          log.info('Tag replaced', { oldTag, newTag, count: Object.keys(updatedNotes).length });
        }
      },

      // UI state
      setActiveNote: (id) => {
        set({ activeNoteId: id });
        log.debug('Active note set', { id });
      },

      setSortConfig: (config) => {
        set({ sortConfig: config });
        log.debug('Sort config updated', { config });
      },

      setFilter: (filter) => {
        set({ filter });
        log.debug('Filter updated', { filter });
      },

      // Utility
      getNoteCount: () => {
        return Object.values(get().notes).filter((note) => !note.deletedAt).length;
      },

      getNotesInFolder: (folderId) => {
        return Object.values(get().notes).filter(
          (note) => note.folderId === folderId && !note.deletedAt
        );
      },

      exportNotes: () => {
        return Object.values(get().notes).filter((note) => !note.deletedAt);
      },

      importNotes: (notes, merge) => {
        const normalizedNotes = notes.map((note) => ({
          ...note,
          content: ensureLexicalContent(note.content, note.contentText),
        }));
        if (!merge) {
          // Replace all notes
          set({
            notes: Object.fromEntries(normalizedNotes.map((note) => [note.id, note])),
            activeNoteId: null,
          });
          log.info('Imported notes', { count: notes.length, mode: 'replace' });
        } else {
          // Merge with existing notes
          set((state) => {
            const updatedNotes = { ...state.notes };
            normalizedNotes.forEach((note) => {
              updatedNotes[note.id] = note;
            });
            return { notes: updatedNotes };
          });
          log.info('Imported notes', { count: notes.length, mode: 'merge' });
        }
      },

      clearAllNotes: () => {
        set({ notes: {}, activeNoteId: null });
        log.info('All notes cleared');
      },

      // ==================== BACKLINKS (Phase 4) ====================

      getBacklinks: (noteId: string) => {
        const state = get();
        const note = state.notes[noteId];
        if (!note || note.deletedAt) return [];

        const activeNotes = Object.fromEntries(
          Object.entries(state.notes).filter(([, candidate]) => !candidate.deletedAt)
        );
        return getBacklinksUtil(noteId, note.title, activeNotes);
      },

      updateLinkedNotes: (noteId: string, content: string) => {
        const state = get();
        const linkTitles = extractWikiLinks(content);
        const activeNotes = Object.fromEntries(
          Object.entries(state.notes).filter(([, note]) => !note.deletedAt)
        );
        const linkedNoteIds = resolveLinksToIds(linkTitles, activeNotes);

        set((currentState) => {
          const note = currentState.notes[noteId];
          if (!note) return currentState;

          return {
            notes: {
              ...currentState.notes,
              [noteId]: {
                ...note,
                linkedNotes: linkedNoteIds,
              },
            },
          };
        });
      },

      // ==================== P1: UNLINKED MENTIONS ====================

      convertToWikiLink: (noteId: string, position: number, targetTitle: string) => {
        const state = get();
        const note = state.notes[noteId];
        if (!note) {
          log.warn('Note not found for converting to wiki link', { noteId });
          return;
        }

        const content = note.contentText;

        // Find the exact text match at the position
        const titleLength = targetTitle.length;
        const endPosition = position + titleLength;

        // Extract the text at the position to verify it matches
        const textAtPosition = content.substring(position, endPosition);

        // Case-insensitive match check
        if (textAtPosition.toLowerCase() !== targetTitle.toLowerCase()) {
          log.warn('Text at position does not match target title', {
            noteId,
            position,
            targetTitle,
            textAtPosition,
          });
          return;
        }

        // Build the new content with wiki link
        const before = content.substring(0, position);
        const after = content.substring(endPosition);
        const wikiLink = `[[${textAtPosition}]]`; // Preserve original case
        const newContentText = before + wikiLink + after;
        const occurrence = before.toLocaleLowerCase().split(targetTitle.toLocaleLowerCase()).length - 1;
        const lexicalContent = ensureLexicalContent(note.content, note.contentText);
        const newContent = replaceTextInLexical(
          lexicalContent,
          textAtPosition,
          wikiLink,
          occurrence
        );

        // Update the note using the updateNote action to ensure proper handling
        get().updateNote(noteId, { content: newContent, contentText: newContentText });

        log.debug('Converted text to wiki link', {
          noteId,
          position,
          targetTitle,
          originalText: textAtPosition,
        });
      },

      // ==================== TEMPLATES (Phase 4) ====================

      getNoteTemplates: () => {
        return DEFAULT_NOTE_TEMPLATES;
      },

      createNoteFromTemplate: (templateId: string) => {
        const allTemplates = get().getAllNoteTemplates();
        const template = allTemplates.find((t) => t.id === templateId);
        if (!template) return null;

        const newNote = createDefaultNote({
          title: template.name,
          contentText: template.description,
          tags: template.defaultTags || [],
          icon: template.icon,
        });

        set((state) => ({
          notes: {
            ...state.notes,
            [newNote.id]: newNote,
          },
          activeNoteId: newNote.id,
        }));

        log.debug('Created note from template', { template: template.name });
        return newNote;
      },

      createNoteTemplate: (params: Partial<NoteTemplate>): NoteTemplate => {
        const newTemplate: NoteTemplate = {
          id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: params.name || '未命名模板',
          description: params.description || '',
          icon: params.icon,
          category: params.category,
          defaultTags: params.defaultTags || [],
          isBuiltIn: false,
        };

        set((state) => ({
          customNoteTemplates: [...state.customNoteTemplates, newTemplate],
        }));

        log.debug('Created note template', { templateId: newTemplate.id, name: newTemplate.name });
        return newTemplate;
      },

      updateNoteTemplate: (id: string, updates: Partial<NoteTemplate>): void => {
        const state = get();
        const template = state.customNoteTemplates.find((t) => t.id === id);

        if (!template) {
          log.warn('Template not found', { id });
          return;
        }

        // Prevent updating built-in templates (safety check)
        if (template.isBuiltIn) {
          log.warn('Cannot update built-in template', { id });
          return;
        }

        set((state) => ({
          customNoteTemplates: state.customNoteTemplates.map((t) =>
            t.id === id ? { ...t, ...updates, isBuiltIn: false } : t
          ),
        }));

        log.debug('Updated note template', { templateId: id });
      },

      deleteNoteTemplate: (id: string): void => {
        const state = get();
        const template = state.customNoteTemplates.find((t) => t.id === id);

        if (!template) {
          log.warn('Template not found', { id });
          return;
        }

        // Prevent deleting built-in templates
        if (template.isBuiltIn) {
          log.warn('Cannot delete built-in template', { id });
          return;
        }

        set((state) => ({
          customNoteTemplates: state.customNoteTemplates.filter((t) => t.id !== id),
        }));

        log.debug('Deleted note template', { templateId: id });
      },

      getNoteTemplate: (id: string): NoteTemplate | undefined => {
        const allTemplates = get().getAllNoteTemplates();
        return allTemplates.find((t) => t.id === id);
      },

      getAllNoteTemplates: (): NoteTemplate[] => {
        const state = get();
        // Return built-in templates + custom templates
        return [...DEFAULT_NOTE_TEMPLATES, ...state.customNoteTemplates];
      },

      // ==================== DAILY NOTES ====================

      getDailyNote: (date: Date) => {
        const state = get();
        const settings = useSettingsStore.getState().dailyNotes;
        return getDailyNoteUtil(date, state.notes, settings);
      },

      createDailyNote: (date: Date) => {
        const settings = useSettingsStore.getState().dailyNotes;
        const newNote = createDailyNoteUtil(date, settings);

        set((state) => ({
          notes: {
            ...state.notes,
            [newNote.id]: newNote,
          },
          activeNoteId: newNote.id,
        }));

        log.info('Created daily note', { date: newNote.title, id: newNote.id });
        return newNote;
      },

      getOrCreateDailyNote: (date: Date) => {
        const state = get();
        const settings = useSettingsStore.getState().dailyNotes;

        // Try to find existing note
        const existingNote = getDailyNoteUtil(date, state.notes, settings);
        if (existingNote) {
          // Set as active note
          set({ activeNoteId: existingNote.id });
          log.debug('Found existing daily note', { date: existingNote.title });
          return existingNote;
        }

        // Create new note
        const newNote = createDailyNoteUtil(date, settings);
        set((currentState) => ({
          notes: {
            ...currentState.notes,
            [newNote.id]: newNote,
          },
          activeNoteId: newNote.id,
        }));

        log.info('Auto-created daily note', { date: newNote.title, id: newNote.id });
        return newNote;
      },

      // ==================== P2: BLOCK-LEVEL LINKS & HOVER PREVIEW ====================

      getBlockContent: (noteId: string, blockId: string) => {
        const note = get().notes[noteId];
        if (!note || note.deletedAt) return null;

        const blockInfo = findBlockInContent(note.contentText, blockId);
        return blockInfo ? blockInfo.content : null;
      },

      getNotePreview: (noteId: string, blockId?: string) => {
        const note = get().notes[noteId];
        if (!note || note.deletedAt) return null;

        return createNotePreview(note, blockId);
      },

      // ==================== SUBNOTES/NESTED NOTES ====================

      getChildNotes: (noteId: string) => {
        const notes = Object.values(get().notes).filter((note) => !note.deletedAt);
        return notes.filter((note) => note.parentNoteId === noteId);
      },

      getNoteTree: (folderId: string | null) => {
        const notes = Object.values(get().notes).filter((note) => !note.deletedAt);

        // Build tree recursively
        const buildTree = (parentId: string | null, depth: number, path: string[]): NoteTreeNode[] => {
          const children = notes.filter((note) => {
            // Filter by folder if provided, or match parentNoteId
            if (parentId === null) {
              // Top-level notes in folder (no parent note)
              return note.folderId === folderId && !note.parentNoteId;
            }
            return note.parentNoteId === parentId;
          });

          // Sort by title or updatedAt
          const sorted = [...children].sort((a, b) => {
            // Pinned notes first
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            // Then by updatedAt descending
            return b.updatedAt.getTime() - a.updatedAt.getTime();
          });

          return sorted.map((note) => ({
            ...note,
            children: buildTree(note.id, depth + 1, [...path, note.title]),
            depth,
            path: [...path, note.title],
          }));
        };

        return buildTree(null, 0, []);
      },

      setParentNote: (noteId: string, parentNoteId: string | null) => {
        const state = get();
        const note = state.notes[noteId];
        if (!note) {
          log.warn('Note not found', { noteId });
          return;
        }

        // Validate: prevent cycles
        if (parentNoteId && !state.canSetParentNote(noteId, parentNoteId)) {
          log.warn('Cannot set parent note - would create cycle', { noteId, parentNoteId });
          return;
        }

        const previousParentId = note.parentNoteId;

        set((currentState) => ({
          notes: {
            ...currentState.notes,
            [noteId]: {
              ...note,
              parentNoteId,
              // When setting a parent note, inherit the parent's folderId
              folderId: parentNoteId ? currentState.notes[parentNoteId]?.folderId ?? note.folderId : note.folderId,
            },
          },
        }));

        log.debug('Set parent note', { noteId, from: previousParentId, to: parentNoteId });

        // Add undo action
        useUndoStore.getState().addUndoAction(
          `已将笔记“${note.title}”${parentNoteId ? '设为子笔记' : '移出子笔记'}`,
          () => {
            set((currentState) => {
              const currentNote = currentState.notes[noteId];
              if (!currentNote) return currentState;
              return {
                notes: {
                  ...currentState.notes,
                  [noteId]: {
                    ...currentNote,
                    parentNoteId: previousParentId,
                    folderId: note.folderId, // Restore original folderId
                  },
                },
              };
            });
            log.debug('Parent note restored (undo)', { noteId, to: previousParentId });
          }
        );
      },

      canSetParentNote: (noteId: string, parentNoteId: string | null) => {
        if (parentNoteId === null) return true; // Always can set to root
        if (noteId === parentNoteId) return false; // Can't be own parent

        // Check if parentNoteId is a descendant of noteId (would create cycle)
        return !get().isDescendantNote(parentNoteId, noteId);
      },

      isDescendantNote: (noteId: string, potentialAncestorId: string) => {
        const note = get().notes[noteId];
        if (!note || !note.parentNoteId) return false;
        if (note.parentNoteId === potentialAncestorId) return true;
        return get().isDescendantNote(note.parentNoteId, potentialAncestorId);
      },

      // ==================== CALENDAR-NOTES LINKING (Wave 5D) ====================

      linkEventToNote: (noteId: string, eventId: string) => {
        const note = get().notes[noteId];
        if (!note) {
          log.warn('Note not found for linking event', { noteId });
          return;
        }
        const existing = note.linkedEventIds ?? [];
        if (existing.includes(eventId)) return;

        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: {
              ...note,
              linkedEventIds: [...existing, eventId],
            },
          },
        }));
        log.debug('Linked event to note', { noteId, eventId });
      },

      unlinkEventFromNote: (noteId: string, eventId: string) => {
        const note = get().notes[noteId];
        if (!note) {
          log.warn('Note not found for unlinking event', { noteId });
          return;
        }
        const filtered = (note.linkedEventIds ?? []).filter((id) => id !== eventId);

        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: {
              ...note,
              linkedEventIds: filtered.length > 0 ? filtered : undefined,
            },
          },
        }));
        log.debug('Unlinked event from note', { noteId, eventId });
      },

      // ==================== WAVE 6A: NOTE ALIASES ====================

      updateAliases: (noteId: string, aliases: string[]) => {
        const note = get().notes[noteId];
        if (!note) {
          log.warn('Note not found for updating aliases', { noteId });
          return;
        }

        set((state) => ({
          notes: {
            ...state.notes,
            [noteId]: {
              ...note,
              aliases: aliases.length > 0 ? aliases : undefined,
              updatedAt: new Date(),
            },
          },
        }));
        log.debug('Updated note aliases', { noteId, aliasCount: aliases.length });
      },
    }),
    {
      name: 'notes', // IndexedDB key
      storage: createJSONStorage(() => createSyncedStorage()),
      version: 6, // v6: add recoverable note deletion
      partialize: (state) => ({
        // Only persist notes and custom templates, not UI state
        notes: state.notes,
        customNoteTemplates: state.customNoteTemplates,
      }),
      migrate: (persistedState: unknown, version: number) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        if (version < 6) log.info('Normalizing legacy note data', { version });
        return {
          ...state,
          notes: normalizePersistedNotes(state.notes),
          customNoteTemplates: Array.isArray(state.customNoteTemplates)
            ? state.customNoteTemplates
            : [],
        };
      },
      // Only merge the two persisted data fields. This prevents a malformed
      // backup from replacing store actions and keeps all runtime defaults.
      merge: (persistedState, currentState) => {
        const decoded = unwrapPersistedState(persistedState);
        const state = isUnknownRecord(decoded) ? decoded : {};
        return {
          ...currentState,
          notes: normalizePersistedNotes(state.notes),
          customNoteTemplates: Array.isArray(state.customNoteTemplates)
            ? (state.customNoteTemplates as NoteTemplate[])
            : [],
        };
      },
      // Handle date serialization
      onRehydrateStorage: () => (state) => {
        log.debug('Notes store rehydrating');
        if (state) {
          try {
            state.notes = normalizePersistedNotes(state.notes);

            // Ensure customNoteTemplates is initialized
            if (!state.customNoteTemplates || !Array.isArray(state.customNoteTemplates)) {
              log.warn('Missing customNoteTemplates, initializing to empty array');
              state.customNoteTemplates = [];
            }
          } catch (err) {
            log.error('Error during notes store rehydration', { error: err });
            // Keep any entries that can still be repaired independently.
            state.notes = normalizePersistedNotes(state.notes);
            state.activeNoteId = null;
            if (!Array.isArray(state.customNoteTemplates)) state.customNoteTemplates = [];
          }
        }
        log.info('Notes store rehydrated');
      },
    }
  )
);

/**
 * Selector hooks for optimized re-renders
 */
export const useActiveNote = () =>
  useNotesStore((state) => {
    const activeId = state.activeNoteId;
    const activeNote = activeId ? state.notes[activeId] : null;
    return activeNote && !activeNote.deletedAt ? activeNote : null;
  });

export const useNotesByFolder = (folderId: string | null) => {
  // getNotesByFolder() builds a fresh array on every call; deriving inside the
  // selector gives React an unstable snapshot ("Maximum update depth exceeded").
  // Memoize over the stable raw state instead.
  const notes = useNotesStore((state) => state.notes);
  const getNotesByFolder = useNotesStore((state) => state.getNotesByFolder);
  return useMemo(() => getNotesByFolder(folderId), [notes, getNotesByFolder, folderId]);
};

export const useAllTags = () => {
  const notes = useNotesStore((state) => state.notes);
  const getAllTags = useNotesStore((state) => state.getAllTags);
  return useMemo(() => getAllTags(), [notes, getAllTags]);
};
