import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../services/eventReminders', () => ({
  scheduleEventReminders: vi.fn(),
  cancelEventReminders: vi.fn(),
  REMINDER_OPTIONS: [],
}));

import { EventCreateModal } from '../EventCreateModal';
import { useCalendarStore } from '../../stores/useCalendarStore';

describe('EventCreateModal deep-link defaults', () => {
  beforeEach(() => {
    useCalendarStore.setState({ events: {} });
  });

  it('saves a 23:00 deep-link as a timed event ending after midnight', async () => {
    const onClose = vi.fn();
    render(
      <EventCreateModal
        dateKey="2026-8-27"
        initialTimeRange={{ startTime: '23:00', endTime: '00:00', endDate: '2026-08-28' }}
        onClose={onClose}
      />
    );

    expect(screen.getByRole('checkbox', { name: '全天事件' })).not.toBeChecked();
    expect(screen.getByLabelText('开始时间')).toHaveValue('23:00');
    expect(screen.getByLabelText('结束时间')).toHaveValue('00:00');
    expect(screen.getByDisplayValue('2026-08-28')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('事件标题'), { target: { value: '深夜收尾' } });
    fireEvent.click(screen.getByRole('button', { name: '创建事件' }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(useCalendarStore.getState().events['2026-8-27']).toEqual(expect.arrayContaining([
      expect.objectContaining({
        title: '深夜收尾',
        isAllDay: false,
        startTime: '23:00',
        endTime: '00:00',
        endDate: '2026-08-28',
      }),
    ]));
  });
});
