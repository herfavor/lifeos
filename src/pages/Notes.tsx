/**
 * Notes Page
 *
 * Notes Page Revolution - Complete Rebuild
 *
 * Phase 5: Updated with TabNavigation for 3 tabs:
 * - Notes (main view with 3-column layout)
 * - Daily Notes (daily notes calendar)
 * - Graph (knowledge graph view)
 *
 * Main notes interface with flexible layout:
 * - Left: Folder tree + Notes list (resizable)
 * - Center: Rich text editor
 * - Right: Note metadata (future feature)
 */

import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FileText, Calendar as CalendarIcon, Network, RotateCcw, Trash2 } from 'lucide-react';
import { useNotesStore } from '../stores/useNotesStore';
import { useFoldersStore } from '../stores/useFoldersStore';
import { useSettingsStore } from '../stores/useSettingsStore';
import { NotesEditor, NotesEditorEmpty } from '../widgets/NotesEditor';
import { PromptDialog } from '../components/PromptDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DailyNotesCalendar } from '../components/DailyNotesCalendar';
import { TagManager } from '../components/TagManager';
import { TemplateLibrary } from '../components/TemplateLibrary';
import { ExportNotesModal } from '../components/ExportNotesModal';
import { PageContent } from '../components/PageContent';
import { TabNavigation, type Tab } from '../components/TabNavigation';
import { NotesLayout } from '../components/notes';
import { substituteTemplateVariables, extractTemplateVariables } from '../utils/templateVariables';
import { logger } from '../services/logger';
import type { NoteTemplate } from '../types/notes';

// Lazy load GraphView for code splitting
const GraphView = lazy(() => import('./GraphView'));

// Phase 5: Tab configuration for Notes page
type NotesTabType = 'notes' | 'daily' | 'graph' | 'trash';

const VALID_TABS: NotesTabType[] = ['notes', 'daily', 'graph', 'trash'];

// Tab configuration for TabNavigation component
const NOTES_TABS: Tab[] = [
  { id: 'notes', label: '笔记', icon: FileText },
  { id: 'daily', label: '每日笔记', icon: CalendarIcon },
  { id: 'graph', label: '图谱', icon: Network },
  { id: 'trash', label: '回收站', icon: Trash2 },
];

// Loading fallback for GraphView
const GraphViewLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="text-center">
      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-accent-primary border-r-transparent" />
      <p className="mt-4 text-sm text-text-light-secondary dark:text-text-dark-secondary">
        图谱加载中…
      </p>
    </div>
  </div>
);

const log = logger.module('Notes');

/**
 * Notes Page Component
 * Phase 5: Updated with TabNavigation for tabs (Notes, Daily Notes, Graph)
 */
export const Notes: React.FC = () => {
  const activeNoteId = useNotesStore((state) => state.activeNoteId);
  const notes = useNotesStore((state) => state.notes);
  const setActiveNote = useNotesStore((state) => state.setActiveNote);
  const getOrCreateDailyNote = useNotesStore((state) => state.getOrCreateDailyNote);
  const createNote = useNotesStore((state) => state.createNote);
  const restoreNote = useNotesStore((state) => state.restoreNote);
  const permanentlyDeleteNote = useNotesStore((state) => state.permanentlyDeleteNote);
  const permanentlyDeleteNotes = useNotesStore((state) => state.permanentlyDeleteNotes);
  const activeFolderId = useFoldersStore((state) => state.activeFolderId);
  const dailyNotesEnabled = useSettingsStore((state) => state.dailyNotes.enabled);
  const displayName = useSettingsStore((state) => state.displayName);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [blockId, setBlockId] = useState<string | undefined>();
  const didAutoSelectNote = useRef(false);
  const [noteToPermanentlyDelete, setNoteToPermanentlyDelete] = useState<string | null>(null);
  const [showClearTrashConfirm, setShowClearTrashConfirm] = useState(false);
  const deletedNotes = Object.values(notes)
    .filter((note) => note.deletedAt)
    .sort((a, b) => (b.deletedAt?.getTime() || 0) - (a.deletedAt?.getTime() || 0));

  // Phase 5: Tab state management
  const getTabFromUrl = useCallback((): NotesTabType => {
    const tab = searchParams.get('tab');
    if (tab && VALID_TABS.includes(tab as NotesTabType)) {
      return tab as NotesTabType;
    }
    // Legacy support: ?daily=true maps to daily tab
    if (searchParams.get('daily') === 'true') {
      return 'daily';
    }
    return 'notes'; // Default tab
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<NotesTabType>(getTabFromUrl);

  // Update tab when URL changes
  useEffect(() => {
    const newTab = getTabFromUrl();
    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [activeTab, getTabFromUrl]);

  const requestedNoteId = searchParams.get('note');
  const requestedNoteExists = useNotesStore((state) =>
    requestedNoteId ? Boolean(state.notes[requestedNoteId] && !state.notes[requestedNoteId].deletedAt) : false
  );

  // Deep links from Home, wiki links and the graph must open the requested
  // note instead of merely landing somewhere in the Notes workspace.
  useEffect(() => {
    if (requestedNoteId && requestedNoteExists) {
      setActiveTab('notes');
      setActiveNote(requestedNoteId);
    }
  }, [requestedNoteExists, requestedNoteId, setActiveNote]);

  // On first entry, resume the most recently edited active note. If the user
  // later clears the selection, keep their explicit choice instead of
  // immediately reopening it.
  useEffect(() => {
    if (didAutoSelectNote.current || activeNoteId || requestedNoteId) return;
    const mostRecent = Object.values(notes)
      .filter((note) => !note.isArchived && !note.deletedAt)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0];
    if (mostRecent) {
      didAutoSelectNote.current = true;
      setActiveNote(mostRecent.id);
    }
  }, [activeNoteId, notes, requestedNoteId, setActiveNote]);

  // Update URL when tab changes
  const handleTabChange = (tab: NotesTabType) => {
    setActiveTab(tab);
    navigate(`/notes?tab=${tab}`, { replace: true });
  };

  // Tag filtering state
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);

  // Template Library state
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [showTitlePrompt, setShowTitlePrompt] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<NoteTemplate | null>(null);
  const [titleInput, setTitleInput] = useState('');

  // Export Modal state
  const [showExportModal, setShowExportModal] = useState(false);

  // Tag handlers
  const handleAddTag = (tag: string) => {
    if (!activeTags.includes(tag)) {
      setActiveTags([...activeTags, tag]);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setActiveTags(activeTags.filter((t) => t !== tag));
  };

  const handleClearAllTags = () => {
    setActiveTags([]);
  };

  // Template selection handlers
  const handleSelectTemplate = (template: NoteTemplate) => {
    // Check if template contains {title} variable
    const variables = extractTemplateVariables(template.description);
    if (variables.includes('title')) {
      // Prompt user for title
      setSelectedTemplate(template);
      setTitleInput('');
      setShowTitlePrompt(true);
      setShowTemplateLibrary(false);
    } else {
      // Create note immediately with variable substitution
      createNoteFromTemplate(template);
    }
  };

  const createNoteFromTemplate = (template: NoteTemplate, customTitle?: string) => {
    // Substitute template variables
    const context = {
      title: customTitle,
      userName: displayName.trim() || '我',
    };
    const processedContent = substituteTemplateVariables(template.description, context);

    // Create note with template content and tags
    const newNote = createNote({
      folderId: activeFolderId,
      title: customTitle || template.name,
      contentText: processedContent,
      tags: template.defaultTags || [],
      icon: template.icon,
    });

    log.info('Created note from template', {
      templateId: template.id,
      noteId: newNote.id,
      title: newNote.title,
    });
  };

  const handleConfirmTitle = (title: string) => {
    if (selectedTemplate && title.trim()) {
      createNoteFromTemplate(selectedTemplate, title.trim());
      setShowTitlePrompt(false);
      setSelectedTemplate(null);
      setTitleInput('');
    }
  };

  const handleCancelTitle = () => {
    setShowTitlePrompt(false);
    setSelectedTemplate(null);
    setTitleInput('');
  };

  // Page setup and keyboard shortcuts
  useEffect(() => {
    document.title = '笔记 - LifeOS';
    log.debug('Notes page loaded');

    // Keyboard shortcut for export (Cmd/Ctrl+Shift+E)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setShowExportModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle ?daily=true query parameter to open today's daily note
  useEffect(() => {
    if (searchParams.get('daily') === 'true' && dailyNotesEnabled) {
      const today = new Date();
      getOrCreateDailyNote(today);
      // Remove the query parameter after handling it
      searchParams.delete('daily');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, dailyNotesEnabled, getOrCreateDailyNote, setSearchParams]);

  // Extract block ID from URL hash (#block-id)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#')) {
        const id = hash.substring(1);
        setBlockId(id);
      } else {
        setBlockId(undefined);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const visibleTabs = NOTES_TABS.filter(
    (tab) => tab.id === 'notes' || tab.id === 'daily' || tab.id === activeTab
  );

  return (
    <PageContent page="notes" variant="full-height">
      {/* Keep everyday writing primary; graph/trash only surface when explicitly opened. */}
      <TabNavigation
        tabs={visibleTabs}
        activeTab={activeTab}
        onTabChange={(tabId) => handleTabChange(tabId as NotesTabType)}
        ariaLabel="笔记导航"
      />

      {/* Tab Content */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        {/* Graph Tab - Lazy loaded GraphView */}
        {activeTab === 'graph' && (
          <Suspense fallback={<GraphViewLoader />}>
            <GraphView />
          </Suspense>
        )}

        {/* Daily Notes Tab - Show Daily Notes Calendar */}
        {activeTab === 'daily' && (
          <div className="flex-1 overflow-auto p-6">
            <DailyNotesCalendar />
          </div>
        )}

        {activeTab === 'trash' && (
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="mx-auto max-w-4xl">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-light-primary dark:text-text-dark-primary">笔记回收站</h2>
                  <p className="mt-1 text-sm text-text-light-secondary dark:text-text-dark-secondary">
                    删除的笔记会保留在这里；永久删除才会移除正文和关联图片。
                  </p>
                </div>
                {deletedNotes.length > 0 && (
                  <button type="button" onClick={() => setShowClearTrashConfirm(true)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-status-error/30 px-3 py-2 text-sm text-status-error hover:bg-status-error/10">
                    <Trash2 className="h-4 w-4" />清空回收站
                  </button>
                )}
              </div>
              {deletedNotes.length > 0 ? (
                <div className="space-y-2">
                  {deletedNotes.map((note) => (
                    <div key={note.id} className="bento-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-text-light-primary dark:text-text-dark-primary">{note.title || '未命名笔记'}</p>
                        <p className="mt-1 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                          删除于 {note.deletedAt?.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => restoreNote(note.id)} className="btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm">
                          <RotateCcw className="h-4 w-4" />恢复
                        </button>
                        <button onClick={() => setNoteToPermanentlyDelete(note.id)} className="inline-flex items-center gap-2 rounded-lg border border-status-error/30 px-3 py-2 text-sm text-status-error hover:bg-status-error/10">
                          <Trash2 className="h-4 w-4" />永久删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bento-card py-14 text-center">
                  <Trash2 className="mx-auto h-10 w-10 text-text-light-tertiary dark:text-text-dark-tertiary" />
                  <p className="mt-3 font-medium text-text-light-primary dark:text-text-dark-primary">回收站为空</p>
                  <button onClick={() => handleTabChange('notes')} className="btn-primary mt-5 px-4 py-2">返回笔记</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes Tab - Main Notes View */}
        {activeTab === 'notes' && (
          <NotesLayout
            activeTags={activeTags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onClearAllTags={handleClearAllTags}
            onOpenTagManager={() => setShowTagManager(true)}
            onOpenTemplateLibrary={() => setShowTemplateLibrary(true)}
            onOpenExportModal={() => setShowExportModal(true)}
          >
            {activeNoteId ? (
              <NotesEditor noteId={activeNoteId} blockId={blockId} />
            ) : (
              <NotesEditorEmpty
                hasNotes={Object.values(notes).some((note) => !note.isArchived && !note.deletedAt)}
                onCreate={() => createNote({ folderId: activeFolderId })}
                onCreateFromTemplate={() => setShowTemplateLibrary(true)}
              />
            )}
          </NotesLayout>
        )}
      </div>

      {/* Tag Manager Modal */}
      <TagManager isOpen={showTagManager} onClose={() => setShowTagManager(false)} />

      {/* Template Library Modal */}
      <TemplateLibrary
        isOpen={showTemplateLibrary}
        onClose={() => setShowTemplateLibrary(false)}
        onSelect={handleSelectTemplate}
      />

      {/* Title Prompt Modal */}
      {showTitlePrompt && selectedTemplate && (
        <PromptDialog
          isOpen={true}
          onClose={handleCancelTitle}
          onConfirm={handleConfirmTitle}
          title="输入笔记标题"
          message={`使用模板 "${selectedTemplate.name}" 创建笔记。请输入标题：`}
          defaultValue={titleInput}
          placeholder="笔记标题"
          confirmText="创建笔记"
        />
      )}

      {/* Export Notes Modal */}
      <ExportNotesModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
      <ConfirmDialog
        isOpen={Boolean(noteToPermanentlyDelete)}
        onClose={() => setNoteToPermanentlyDelete(null)}
        onConfirm={() => {
          if (noteToPermanentlyDelete) permanentlyDeleteNote(noteToPermanentlyDelete);
          setNoteToPermanentlyDelete(null);
        }}
        title="永久删除笔记"
        message="此操作会永久删除笔记正文和关联图片，且无法恢复。"
        confirmText="永久删除"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={showClearTrashConfirm}
        onClose={() => setShowClearTrashConfirm(false)}
        onConfirm={() => {
          permanentlyDeleteNotes(deletedNotes.map((note) => note.id));
          setShowClearTrashConfirm(false);
        }}
        title="清空笔记回收站"
        message={`永久删除回收站中的 ${deletedNotes.length} 篇笔记及其关联图片？此操作无法恢复。`}
        confirmText="永久删除全部"
        variant="danger"
      />
    </PageContent>
  );
};
