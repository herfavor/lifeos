/**
 * BacklinksPanel
 *
 * Relationship data is useful context, but it should not compete with the
 * note body. The whole panel is therefore collapsed by default and expands
 * only when the user wants to inspect references, mentions or broken links.
 */

import { useMemo } from 'react';
import { AlertTriangle, ChevronRight, Link2, Plus } from 'lucide-react';
import { useNotesStore } from '../stores/useNotesStore';
import { findUnlinkedMentions, findBrokenLinks } from '../utils/backlinks';

function getBacklinkContext(content: string, targetTitle: string): string | null {
  if (!content || !targetTitle) return null;

  const escaped = targetTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wikiLinkPattern = new RegExp('\\[\\[' + escaped + '\\]\\]', 'i');
  let match = wikiLinkPattern.exec(content);

  if (!match) {
    const plainPattern = new RegExp('\\b' + escaped + '\\b', 'i');
    match = plainPattern.exec(content);
  }
  if (!match) return null;

  const position = match.index;
  let start = Math.max(0, position - 90);
  let end = Math.min(content.length, position + match[0].length + 110);

  const previousBreak = content.lastIndexOf('\n', position);
  if (previousBreak >= 0 && previousBreak > start) start = previousBreak + 1;
  const nextBreak = content.indexOf('\n', position + match[0].length);
  if (nextBreak >= 0 && nextBreak < end) end = nextBreak;

  let snippet = content.substring(start, end).trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < content.length) snippet = `${snippet}…`;
  return snippet || null;
}

interface BacklinksPanelProps {
  noteId: string;
  onNoteClick?: (noteId: string) => void;
}

export function BacklinksPanel({ noteId, onNoteClick }: BacklinksPanelProps) {
  const { getBacklinks, setActiveNote, notes, createNote, convertToWikiLink } = useNotesStore();
  const currentNote = notes[noteId];

  const backlinks = useMemo(() => getBacklinks(noteId), [noteId, getBacklinks]);
  const unlinkedMentions = useMemo(
    () => (currentNote ? findUnlinkedMentions(noteId, currentNote.title, notes) : []),
    [noteId, currentNote, notes]
  );
  const brokenLinks = useMemo(
    () => (currentNote ? findBrokenLinks(currentNote.contentText, notes) : []),
    [currentNote, notes]
  );

  const relatedCount = backlinks.length + unlinkedMentions.length + brokenLinks.length;

  const handleNoteClick = (id: string) => {
    if (onNoteClick) onNoteClick(id);
    else setActiveNote(id);
  };

  const handleCreateNote = (title: string) => {
    const note = createNote({
      title,
      content: '',
      folderId: currentNote?.folderId || null,
    });
    handleNoteClick(note.id);
  };

  return (
    <details className="border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm text-text-light-secondary transition-colors hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary [&::-webkit-details-marker]:hidden">
        <Link2 className="h-4 w-4" />
        <span className="font-medium">关联与提及</span>
        <span className="rounded-full bg-surface-light-elevated px-2 py-0.5 text-[11px] text-text-light-tertiary dark:bg-surface-dark-elevated dark:text-text-dark-tertiary">
          {relatedCount}
        </span>
        <span className="ml-auto text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
          展开查看
        </span>
      </summary>

      <div className="space-y-5 border-t border-border-light/70 px-4 py-3 dark:border-border-dark/70">
        {relatedCount === 0 && (
          <p className="py-2 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
            暂无关联。正文中使用 [[笔记标题]] 即可建立链接。
          </p>
        )}

        {backlinks.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              链接到这里
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{backlinks.length}</span>
            </div>
            <div className="space-y-1">
              {backlinks.map((note) => {
                const context = getBacklinkContext(note.contentText, currentNote?.title || '');
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => handleNoteClick(note.id)}
                    className="group w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated"
                  >
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">
                        {note.title}
                      </span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-light-tertiary opacity-0 transition-opacity group-hover:opacity-100 dark:text-text-dark-tertiary" />
                    </div>
                    {context && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                        {context}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {unlinkedMentions.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-text-light-secondary dark:text-text-dark-secondary">
              可建立链接的提及
              <span className="text-text-light-tertiary dark:text-text-dark-tertiary">{unlinkedMentions.length}</span>
            </div>
            <div className="space-y-1">
              {unlinkedMentions.map((mention, index) => (
                <div key={`${mention.noteId}-${index}`} className="flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated">
                  <button type="button" onClick={() => handleNoteClick(mention.noteId)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{mention.noteTitle}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{mention.context}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => convertToWikiLink(mention.noteId, mention.position, currentNote?.title || '')}
                    className="shrink-0 rounded-lg border border-border-light px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/5 dark:border-border-dark"
                  >
                    建立链接
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {brokenLinks.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-status-error">
              <AlertTriangle className="h-3.5 w-3.5" />
              失效链接 {brokenLinks.length}
            </div>
            <div className="space-y-1">
              {brokenLinks.map((link, index) => (
                <div key={`${link.title}-${index}`} className="flex items-start gap-2 rounded-lg border border-status-error/15 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">[[{link.title}]]</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">{link.context}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCreateNote(link.title)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border-light px-2 py-1 text-xs font-medium text-accent-primary hover:bg-accent-primary/5 dark:border-border-dark"
                  >
                    <Plus className="h-3 w-3" /> 创建
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </details>
  );
}
