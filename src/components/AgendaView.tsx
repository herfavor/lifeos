import React, { useMemo } from 'react';
import type { CalendarEvent } from '../types';
import { format, parse, isAfter, addDays, startOfDay, isSameDay } from 'date-fns';
import { Bell, CalendarDays, MapPin, RefreshCw } from 'lucide-react';
import { getEventDisplayColor } from '../utils/calendarColors';

interface AgendaViewProps {
  events: Record<string, CalendarEvent[]>; // Expanded events (including recurring instances)
  currentDate?: Date; // Optional - not used in current implementation
  daysToShow?: number; // Number of days to display (default: 14)
  onEventClick?: (event: CalendarEvent, dateKey: string) => void;
  /** Compact layout for the schedule side panel: hides the large header. */
  compact?: boolean;
}

/**
 * AgendaView Component
 * Displays upcoming events in a list format, grouped by day
 */
export const AgendaView: React.FC<AgendaViewProps> = ({
  events,
  onEventClick,
  compact = false,
}) => {
  // Calculate all events (sorted by date)
  const upcomingEvents = useMemo(() => {
    const today = startOfDay(new Date());

    // Group all events by date
    const grouped: { date: Date; dateKey: string; events: CalendarEvent[] }[] = [];

    Object.entries(events).forEach(([dateKey, dayEvents]) => {
      const eventDate = parse(dateKey, 'yyyy-MM-dd', new Date());

      // Only include events from today onwards
      if (isAfter(eventDate, today) || isSameDay(eventDate, today)) {
        grouped.push({
          date: eventDate,
          dateKey,
          events: dayEvents,
        });
      }
    });

    // Sort by date (ascending)
    grouped.sort((a, b) => a.date.getTime() - b.date.getTime());

    return grouped;
  }, [events]);

  const formatEventTime = (event: CalendarEvent): string => {
    if (event.isAllDay || !event.startTime) {
      return '全天';
    }

    if (event.endTime) {
      return `${event.startTime} - ${event.endTime}`;
    }

    return event.startTime;
  };

  const getDayLabel = (date: Date): string => {
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    if (isSameDay(date, today)) {
      return '今天';
    }

    if (isSameDay(date, tomorrow)) {
      return '明天';
    }

    return format(date, 'EEEE');
  };

  if (upcomingEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <CalendarDays className="mb-3 h-8 w-8 text-text-light-tertiary dark:text-text-dark-tertiary" aria-hidden />
        <p className="text-sm font-medium text-text-light-primary dark:text-text-dark-primary mb-1">
          暂无即将到来的事件
        </p>
        <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary max-w-md">
          你还没有安排任何事件，添加一个事件开始吧！
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Frozen header */}
      {!compact && (
        <div className="flex-shrink-0 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark p-4">
          <h2 className="text-xl font-bold text-text-light-primary dark:text-text-dark-primary">
            即将到来的事件
          </h2>
          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">
            共 {upcomingEvents.reduce((total, day) => total + day.events.length, 0)} 个事件
          </p>
        </div>
      )}

      {/* Scrollable events list */}
      <div className="flex-1 overflow-y-auto">
        <div className={`agenda-view ${compact ? 'space-y-4' : 'space-y-6'} p-4`}>
          {upcomingEvents.map(({ date, dateKey, events: dayEvents }) => (
            <div key={dateKey} className="agenda-day">
              {/* Day Header */}
              <div className="sticky top-0 z-10 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark pb-2 mb-3">
                <div className="flex items-baseline gap-2">
                  <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-text-light-primary dark:text-text-dark-primary`}>
                    {getDayLabel(date)}
                  </h3>
                  <span className={`text-xs text-text-light-secondary dark:text-text-dark-secondary ${compact ? '' : 'text-sm'}`}>
                    {format(date, 'M月d日')}
                  </span>
                  <span className="ml-auto text-xs text-text-light-tertiary dark:text-text-dark-tertiary">
                    {dayEvents.length} 个事件
                  </span>
                </div>
              </div>

              {/* Events List */}
              <div className="space-y-2">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event, dateKey)}
                    className={`
                      ${compact ? 'p-2.5' : 'p-4'} rounded-button border border-border-light dark:border-border-dark
                      bg-surface-light-elevated dark:bg-surface-dark-elevated
                      ${onEventClick ? 'cursor-pointer hover:shadow-medium hover:border-accent-primary' : ''}
                      transition-all duration-standard ease-smooth
                    `}
                  >
                    <div className="flex items-start gap-3">
                      {/* Color indicator */}
                      <div
                        className="flex-shrink-0 w-1 rounded-full self-stretch"
                        style={{ backgroundColor: getEventDisplayColor(event) }}
                      />
                      {/* Time */}
                      <div className={`flex-shrink-0 ${compact ? 'w-16' : 'w-24'} text-right`}>
                        <div className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-accent-primary`}>
                          {formatEventTime(event)}
                        </div>
                        {event.recurrence && (
                          <div className="flex items-center gap-1 text-xs text-text-light-secondary dark:text-text-dark-secondary mt-1">
                            <RefreshCw className="h-3 w-3" aria-hidden />
                            重复
                          </div>
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className={`${compact ? 'text-sm' : ''} font-medium text-text-light-primary dark:text-text-dark-primary`}>
                          {event.title}
                          {event._isMultiDayPart && (
                            <span className="ml-2 text-xs text-accent-primary">
                              {event._isMultiDayFirst && '→'}
                              {!event._isMultiDayFirst && !event._isMultiDayLast && '↔'}
                              {event._isMultiDayLast && '←'}
                              多日
                            </span>
                          )}
                        </h4>

                        {event.description && (
                          <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}

                        {event.location && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            <span>{event.location}</span>
                          </div>
                        )}

                        {event.reminders && event.reminders.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-text-light-secondary dark:text-text-dark-secondary">
                            <Bell className="h-3 w-3 shrink-0" aria-hidden />
                            <span>{event.reminders.length} 个提醒</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
