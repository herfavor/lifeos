import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../stores/useTimeTrackingStore', () => ({
  useTimeTrackingStore: () => ({
    entries: [],
    projects: [],
    loadEntries: vi.fn().mockResolvedValue(undefined),
    loadProjects: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../stores/useCalendarStore', () => ({
  useCalendarStore: () => ({
    events: {},
    importEvents: vi.fn(),
    calendars: [],
    toggleCalendarVisibility: vi.fn(),
    updateEventTime: vi.fn(),
  }),
}));

vi.mock('../../stores/useKanbanStore', () => ({
  useKanbanStore: () => ({ tasks: [] }),
}));

vi.mock('../shared/CalendarHeader', () => ({
  CalendarHeader: ({ viewMode }: { viewMode?: string }) => <div data-testid="calendar-header">{viewMode}</div>,
}));

vi.mock('../calendar/CalendarLayersSidebar', () => ({
  CalendarLayersSidebar: () => null,
}));

vi.mock('../DayView', () => ({
  DayView: ({ date }: { date: Date }) => (
    <div data-testid="day-view">{`${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`}</div>
  ),
}));

import { TimeEntryCalendar } from '../TimeEntryCalendar';

describe('TimeEntryCalendar date deep link', () => {
  it('switches the real calendar component to the requested day view', async () => {
    render(<TimeEntryCalendar focusDateKey="2026-8-27" />);

    expect(await screen.findByTestId('calendar-header')).toHaveTextContent('daily');
    expect(screen.getByTestId('day-view')).toHaveTextContent('2026-8-27');
  });
});
