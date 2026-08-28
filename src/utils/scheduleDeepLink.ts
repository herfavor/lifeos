import type { CalendarEvent } from '../types';
import { formatDateKey, getStandardDateKey, parseDateKey } from './dateUtils';

export interface ScheduleDeepLink {
  dateKey?: string;
  hour?: number;
  eventId?: string;
}

export interface InitialEventTimeRange {
  startTime: string;
  endTime: string;
  /** ISO date for events which end after midnight. */
  endDate?: string;
}

export interface LocatedCalendarEvent {
  dateKey: string;
  event: CalendarEvent;
}

/**
 * Parse the schedule deep-link parameters without accepting browser-dependent
 * date parsing. Calendar storage uses non-padded YYYY-M-D keys.
 */
export function parseScheduleDeepLink(search: string): ScheduleDeepLink {
  const params = new URLSearchParams(search);
  const dateKey = parseScheduleDate(params.get('date'));
  const hour = parseScheduleHour(params.get('hour'));
  const eventId = params.get('event')?.trim() || undefined;

  return { dateKey, hour, eventId };
}

/** Build a stable /schedule URL for editing an existing event. */
export function createScheduleEventLink(dateKey: string, eventId: string): string {
  return `/schedule?date=${formatDateKey(parseDateKey(dateKey))}&event=${encodeURIComponent(eventId)}`;
}

/** Build a stable /schedule URL for creating an event at a specific hour. */
export function createScheduleEventLinkForHour(dateKey: string, hour: number): string {
  return `/schedule?date=${formatDateKey(parseDateKey(dateKey))}&hour=${hour}`;
}

/**
 * Return the non-all-day default for a time-slot action. The 23:00 slot ends
 * at midnight on the following date, rather than creating an invalid 23:00–00:00
 * same-day range.
 */
export function getInitialEventTimeRange(dateKey: string, hour: number): InitialEventTimeRange | null {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;

  const startTime = `${String(hour).padStart(2, '0')}:00`;
  if (hour < 23) {
    return { startTime, endTime: `${String(hour + 1).padStart(2, '0')}:00` };
  }

  const nextDate = parseDateKey(dateKey);
  nextDate.setDate(nextDate.getDate() + 1);
  return {
    startTime,
    endTime: '00:00',
    endDate: formatDateKey(nextDate),
  };
}

/** Locate an event in the date-keyed calendar store, preferring the linked date. */
export function findCalendarEvent(
  events: Record<string, CalendarEvent[]>,
  eventId: string,
  preferredDateKey?: string
): LocatedCalendarEvent | undefined {
  if (preferredDateKey) {
    const event = events[preferredDateKey]?.find((candidate) => candidate.id === eventId);
    if (event) return { dateKey: preferredDateKey, event };
  }

  for (const [dateKey, dayEvents] of Object.entries(events)) {
    const event = dayEvents.find((candidate) => candidate.id === eventId);
    if (event) return { dateKey, event };
  }

  return undefined;
}

function parseScheduleDate(value: string | null): string | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) return undefined;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return getStandardDateKey(date);
}

function parseScheduleHour(value: string | null): number | undefined {
  if (!value || !/^\d{1,2}$/.test(value)) return undefined;
  const hour = Number(value);
  return hour >= 0 && hour <= 23 ? hour : undefined;
}
