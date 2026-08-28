import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarStore } from '../../stores/useCalendarStore';
import type { CalendarEvent } from '../../types';

const calendarProps = vi.hoisted(() => ({
  latest: null as null | { focusDateKey?: string },
}));

vi.mock('../../components/TimeEntryCalendar', () => ({
  TimeEntryCalendar: (props: { focusDateKey?: string }) => {
    calendarProps.latest = props;
    return <div data-testid="time-entry-calendar">日历：{props.focusDateKey}</div>;
  },
}));

vi.mock('../../components/EventCreateModal', () => ({
  EventCreateModal: ({
    dateKey,
    event,
    initialTimeRange,
    onClose,
  }: {
    dateKey: string;
    event?: CalendarEvent;
    initialTimeRange?: { startTime: string; endTime: string; endDate?: string };
    onClose: () => void;
  }) => (
    <div data-testid="event-modal">
      {event?.id || 'new'}|{dateKey}|{initialTimeRange?.startTime}|{initialTimeRange?.endTime}|{initialTimeRange?.endDate}
      <button onClick={onClose}>关闭事件</button>
    </div>
  ),
}));

import { TimeTracking } from '../TimeTracking';

function renderSchedule(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <TimeTracking />
      <LocationSearch />
    </MemoryRouter>
  );
}

function LocationSearch() {
  return <output data-testid="location-search">{useLocation().search}</output>;
}

describe('TimeTracking schedule deep links', () => {
  beforeEach(() => {
    calendarProps.latest = null;
    useCalendarStore.setState({ events: {} });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('opens a non-all-day new event at the requested hour and consumes the one-shot action', async () => {
    renderSchedule('/schedule?tab=timer&section=entries&date=2026-08-27&hour=10');

    expect(await screen.findByTestId('time-entry-calendar')).toHaveTextContent('2026-8-27');
    expect(screen.getByTestId('event-modal')).toHaveTextContent('new|2026-8-27|10:00|11:00');
    expect(screen.getByText('日程安排')).toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent(
      '?tab=timer&section=entries&date=2026-08-27'
    );

    fireEvent.click(screen.getByRole('button', { name: '关闭事件' }));
    await waitFor(() => expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument());
  });

  it('waits for IndexedDB hydration before consuming an event ID deep link', async () => {
    let finishHydration: (() => void) | undefined;
    vi.spyOn(useCalendarStore.persist, 'hasHydrated').mockReturnValue(false);
    vi.spyOn(useCalendarStore.persist, 'onFinishHydration').mockImplementation((callback) => {
      finishHydration = callback;
      return () => undefined;
    });
    const event: CalendarEvent = { id: 'event-1', title: '评审', projectIds: [] };

    renderSchedule('/schedule?date=2026-08-27&event=event-1');
    expect(screen.queryByTestId('event-modal')).not.toBeInTheDocument();
    expect(screen.getByTestId('location-search')).toHaveTextContent('?date=2026-08-27&event=event-1');

    act(() => {
      useCalendarStore.setState({ events: { '2026-8-28': [event] } });
      finishHydration?.();
    });

    await waitFor(() => {
      expect(screen.getByTestId('time-entry-calendar')).toHaveTextContent('2026-8-28');
    });
    expect(screen.getByTestId('event-modal')).toHaveTextContent('event-1|2026-8-28');
    expect(screen.getByTestId('location-search')).toHaveTextContent('?date=2026-08-28');
  });
});
