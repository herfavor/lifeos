/**
 * LinkedEventsPanel Component
 *
 * Displays calendar events linked to the current note. Relationship panels
 * are secondary to writing, so this surface starts collapsed and expands on
 * demand instead of permanently taking editor height.
 */

import { useMemo, useState } from 'react';
import { Calendar, ChevronRight, ChevronDown, X, Clock } from 'lucide-react';
import { useNotesStore } from '../../stores/useNotesStore';
import { useCalendarStore } from '../../stores/useCalendarStore';
import type { CalendarEvent } from '../../types';

interface LinkedEventsPanelProps {
  noteId: string;
}

interface ResolvedEvent {
  event: CalendarEvent;
  dateKey: string;
}

export function LinkedEventsPanel({ noteId }: LinkedEventsPanelProps) {
  const note = useNotesStore((state) => state.notes[noteId]);
  const { events, setCurrentDate, setViewMode } = useCalendarStore();
  const { unlinkEventFromNote } = useNotesStore();
  const { unlinkNoteFromEvent } = useCalendarStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const resolvedEvents = useMemo((): ResolvedEvent[] => {
    if (!note?.linkedEventIds?.length) return [];

    const result: ResolvedEvent[] = [];
    const linkedIds = new Set(note.linkedEventIds);

    for (const [dateKey, dayEvents] of Object.entries(events)) {
      for (const event of dayEvents) {
        if (linkedIds.has(event.id)) {
          result.push({ event, dateKey });
          linkedIds.delete(event.id);
        }
        if (linkedIds.size === 0) break;
      }
      if (linkedIds.size === 0) break;
    }

    result.sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return result;
  }, [note?.linkedEventIds, events]);

  if (!note?.linkedEventIds?.length || resolvedEvents.length === 0) return null;

  const handleNavigateToEvent = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    setCurrentDate(new Date(year, month - 1, day));
    setViewMode('daily');
  };

  const handleUnlink = (eventId: string) => {
    unlinkEventFromNote(noteId, eventId);
    unlinkNoteFromEvent(eventId, noteId);
  };

  const formatDate = (dateKey: string): string => {
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('zh-CN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="border-t border-border-light bg-surface-light dark:border-border-dark dark:bg-surface-dark">
      <button
        type="button"
        onClick={() => setIsExpanded((open) => !open)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-text-light-secondary transition-colors hover:text-text-light-primary dark:text-text-dark-secondary dark:hover:text-text-dark-primary"
        aria-expanded={isExpanded}
      >
        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Calendar className="h-3.5 w-3.5" />
        <span className="font-medium">关联日程</span>
        <span className="rounded-full bg-surface-light-elevated px-2 py-0.5 text-[11px] text-text-light-tertiary dark:bg-surface-dark-elevated dark:text-text-dark-tertiary">
          {resolvedEvents.length}
        </span>
      </button>

      {isExpanded && (
        <div className="space-y-1 border-t border-border-light/70 px-4 py-2 dark:border-border-dark/70">
          {resolvedEvents.map(({ event, dateKey }) => (
            <div key={event.id} className="group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-surface-light-elevated dark:hover:bg-surface-dark-elevated">
              <button type="button" onClick={() => handleNavigateToEvent(dateKey)} className="min-w-0 flex-1 text-left">
                <p className="truncate text-sm font-medium text-text-light-primary dark:text-text-dark-primary">{event.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                  <span>{formatDate(dateKey)}</span>
                  {event.startTime && (
                    <>
                      <Clock className="h-3 w-3" />
                      <span>{event.startTime}{event.endTime ? `–${event.endTime}` : ''}</span>
                    </>
                  )}
                </p>
              </button>
              <button
                type="button"
                onClick={() => handleUnlink(event.id)}
                className="rounded p-1 text-text-light-tertiary opacity-0 transition-all hover:bg-status-error/10 hover:text-status-error group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100 dark:text-text-dark-tertiary"
                aria-label={`取消关联${event.title}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
