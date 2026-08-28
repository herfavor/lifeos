import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../../types';
import {
  createScheduleEventLink,
  createScheduleEventLinkForHour,
  findCalendarEvent,
  getInitialEventTimeRange,
  parseScheduleDeepLink,
} from '../scheduleDeepLink';

describe('schedule deep links', () => {
  it('normalizes a date and accepts only valid hour parameters', () => {
    expect(parseScheduleDeepLink('?date=2026-08-27&hour=9&event=event-1')).toEqual({
      dateKey: '2026-8-27',
      hour: 9,
      eventId: 'event-1',
    });
    expect(parseScheduleDeepLink('?date=2026-02-30&hour=24')).toEqual({
      dateKey: undefined,
      hour: undefined,
      eventId: undefined,
    });
  });

  it('builds stable Today-to-schedule links for events and time slots', () => {
    expect(createScheduleEventLink('2026-8-27', 'event / 1')).toBe(
      '/schedule?date=2026-08-27&event=event%20%2F%201'
    );
    expect(createScheduleEventLinkForHour('2026-8-27', 9)).toBe(
      '/schedule?date=2026-08-27&hour=9'
    );
  });

  it('uses a one-hour range and carries the 23:00 slot across midnight', () => {
    expect(getInitialEventTimeRange('2026-8-27', 9)).toEqual({
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(getInitialEventTimeRange('2026-8-27', 23)).toEqual({
      startTime: '23:00',
      endTime: '00:00',
      endDate: '2026-08-28',
    });
  });

  it('finds an event in the date-keyed store even when the linked date is stale', () => {
    const event: CalendarEvent = { id: 'event-1', title: '午餐', projectIds: [] };
    const events = { '2026-8-27': [event] };

    expect(findCalendarEvent(events, 'event-1', '2026-8-26')).toEqual({
      dateKey: '2026-8-27',
      event,
    });
  });
});
